; // Ensure db is correctly exported from the LoginSignup file
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD || null,
  database: process.env.DATABASE
});

// Check if database connection is successful
db.connect((err) => {
  if (err) {
    console.log('Error connecting to the database:', err);
  } else {
    console.log('Database connected successfully');
  }
});




// Transaction Controller
exports.Transaction = async (req, res) => {
  try {
    const accountNo = req.session?.user?.accountNo;

    if (!accountNo) {
      console.error("User session or account number missing.");
      return res.status(401).json({ error: "User not logged in." });
    }

    const [result] = await db.query("SELECT * FROM usersignup WHERE accountNo = ?", [accountNo]);

    if (result.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }
 
    const userProfile = result[0];
    console.log("Transaction data fetched successfully:", userProfile);


    const [transactions] = await db.query(
      "SELECT transactionId, transactionType, amount, balanceAfter, transactionDate, description FROM transactions WHERE accountNo = ? ORDER BY transactionDate DESC",
      [accountNo]
    );

    console.log("Transaction history fetched successfully:", transactions);


    res.render("Transaction", {
      username: userProfile.firstName && userProfile.lastName
        ? `${userProfile.firstName} ${userProfile.lastName}`
        : "User",
      profilePicture: userProfile.profilePicture || "/default.png",
      firstName: userProfile.firstName || "Not specified",
      lastName: userProfile.lastName || "Not specified",
      email: userProfile.email || "Not provided",
      phoneNumber: userProfile.phoneNumber || "Not provided",
      address: userProfile.address || "Not provided",
      gender: userProfile.gender || "Not specified",
      DOB: userProfile.DOB ? userProfile.DOB.slice(0, 10) : "Not specified",
      initialDeposit: userProfile.initialDeposit || 120,
      accountNo: userProfile.accountNo,
      ifscCode: userProfile.ifscCode,
      accountStatus: userProfile.accountStatus,
      accountBalance: userProfile.accountBalance,
      branchName: userProfile.branchName || "Not specified",
      transactions, 
    });
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    res.status(500).json({ error: "An error occurred. Please try again later." });
  }
};

// Add Money
exports.addMoney = (req, res) => {
  const accountNo = req.session.user ? req.session.user.accountNo : null;

  if (!accountNo) {
    console.error('Account number not found in session.');
    return res.status(401).json({ message: 'User not logged in. Please log in first.' });
  }

  const { amount } = req.body;

  if (isNaN(amount) || amount <= 0) {
    console.error('Invalid amount:', amount);
    return res.status(400).json({ message: 'Invalid amount. Amount must be greater than zero.' });
  }

  db.beginTransaction((err) => {
    if (err) {
      console.error('Error starting transaction:', err.message);
      return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }

    // Fetch current balance
    db.query('SELECT accountBalance FROM usersignup WHERE accountNo = ?', [accountNo], (err, result) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error fetching balance:', err.message);
          res.status(500).json({ message: 'Error fetching balance. Please try again later.' });
        });
      }

      if (result.length === 0) {
        return db.rollback(() => {
          console.error('Account not found for accountNo:', accountNo);
          res.status(404).json({ message: 'Account not found. Please check and try again.' });
        });
      }

      const currentBalance = parseFloat(result[0].accountBalance); // Ensure it's a valid number
      const newBalance = currentBalance + parseFloat(amount);

      console.log(`Current Balance: ${currentBalance}, New Balance: ${newBalance}`);

      // Update account balance in the usersignup table
      db.query(
        'UPDATE usersignup SET accountBalance = ? WHERE accountNo = ?',
        [newBalance, accountNo],
        (updateErr) => {
          if (updateErr) {
            return db.rollback(() => {
              console.error('Error updating balance in usersignup:', updateErr.message);
              res.status(500).json({ message: 'Error updating balance. Please try again later.' });
            });
          }

          console.log('Balance updated in usersignup successfully.');

          // Record the transaction in the transactions table
          db.query(
            'INSERT INTO transactions (accountNo, transactionType, amount, balanceAfter, description, transactionDate) VALUES (?, ?, ?, ?, ?, NOW())',
            [accountNo, 'credit', amount, newBalance, 'Money added to account'],
            (transactionErr) => {
              if (transactionErr) {
                return db.rollback(() => {
                  console.error('Error recording transaction:', transactionErr.message);
                  res.status(500).json({ message: 'Error recording transaction. Please try again later.' });
                });
              }

              console.log('Transaction recorded successfully in transactions table.');

              // Commit the transaction
              db.commit((commitErr) => {
                if (commitErr) {
                  return db.rollback(() => {
                    console.error('Error committing transaction:', commitErr.message);
                    res.status(500).json({ message: 'Error committing transaction. Please try again later.' });
                  });
                }

                console.log('Transaction committed successfully.');
                res.status(200).json({
                  message: `You have added ${amount} in your account `,
                  newBalance,
                });
              });
            }
          );
        }
      );
    });
  });
};

// Send Money
// Send Money
exports.sendMoney = async (req, res) => {
  const senderAccountNo = req.session?.user?.accountNo; // Get sender's account from session

  if (!senderAccountNo) {
    console.error("Sender account not found in session.");
    return res.status(401).json({ message: "User not logged in. Please log in first." });
  }

  const { receiverAccountNo, amount, receiverIfsc } = req.body;

  console.log("Request body:", req.body);

  // Input Validation
  if (!receiverAccountNo || isNaN(amount) || amount <= 0 || !receiverIfsc) {
    return res.status(400).json({
      message: "Invalid input. Receiver account, valid amount, and IFSC Code are required.",
    });
  }

  try {
    // Fetch sender's balance
    const [senderResult] = await db.promise().query(
      "SELECT accountBalance FROM usersignup WHERE accountNo = ?",
      [senderAccountNo]
    );

    if (senderResult.length === 0) {
      return res.status(404).json({ message: "Sender account not found." });
    }

    const senderBalance = parseFloat(senderResult[0].accountBalance);
    if (senderBalance < amount) {
      return res.status(400).json({ message: "Insufficient balance." });
    }

    // Fetch receiver's balance and IFSC code
    const [receiverResult] = await db.promise().query(
      "SELECT accountBalance, ifscCode FROM usersignup WHERE accountNo = ?",
      [receiverAccountNo]
    );

    if (receiverResult.length === 0) {
      return res.status(404).json({ message: "Receiver account not found." });
    }

    const receiverBalance = parseFloat(receiverResult[0].accountBalance);
    const receiverIfscCode = receiverResult[0].ifscCode; 
    
    console.log("Receuver Ifsc code:", receiverIfscCode)// Get receiver's IFSC code

    // Normalize and validate receiver's IFSC code
    if (receiverIfscCode.trim().toUpperCase() !== receiverIfsc.trim().toUpperCase()) {
      console.log("Receiver IFSC Code:", receiverIfscCode);
      console.log("IFSC Code from Request:", receiverIfsc);
      return res.status(400).json({
        message: `Incorrect IFSC Code for the receiver's account (${receiverAccountNo}). Please provide the correct IFSC Code.`,
      });
    }

    // Log receiver data and IFSC codes for debugging
    console.log("Receiver Account Data:", receiverResult);
    console.log("Normalized IFSC Codes for Comparison:", {
      receiverIfscCode: receiverIfscCode.trim().toUpperCase(),
      
      receiverIfscCode: receiverIfscCode.trim().toUpperCase()
    });

    // Start transaction
    await db.promise().beginTransaction();

    // Update sender's balance
    const newSenderBalance = senderBalance - amount;
    await db.promise().query(
      "UPDATE usersignup SET accountBalance = ? WHERE accountNo = ?",
      [newSenderBalance, senderAccountNo]
    );

    // Update receiver's balance
    const newReceiverBalance = receiverBalance + amount;
    await db.promise().query(
      "UPDATE usersignup SET accountBalance = ? WHERE accountNo = ?",
      [newReceiverBalance, receiverAccountNo]
    );

    // Record transaction for sender
    await db.promise().query(
      `INSERT INTO transactions 
        (accountNo, transactionType, amount, balanceAfter, receiverAccountNo, description, transactionDate) 
        VALUES (?, 'debit', ?, ?, ?, ?, NOW())`,
      [senderAccountNo, amount, newSenderBalance, receiverAccountNo, `Transfer to ${receiverAccountNo}`]
    );

    // Record transaction for receiver
    await db.promise().query(
      `INSERT INTO transactions 
        (accountNo, transactionType, amount, balanceAfter, receiverAccountNo, description, transactionDate) 
        VALUES (?, 'credit', ?, ?, ?, ?, NOW())`,
      [receiverAccountNo, amount, newReceiverBalance, senderAccountNo, `Received from ${senderAccountNo}`]
    );

    // Commit transaction
    await db.promise().commit();

    console.log("Transaction successful.");
    res.status(200).json({
      message: `Money sent to Account: ${receiverAccountNo}. You have ₹${newReceiverBalance} remaining in your account.`,
      newSenderBalance,
      newReceiverBalance,
    });
  } catch (error) {
    console.error("Error during sendMoney:", error.message);
    await db.promise().rollback(); // Rollback on error
    res.status(500).json({ message: "An error occurred. Please try again later." });
  }
};


// Download Transaction History as PDF

// Helper function to format dates
function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
}

// Helper function to safely format the amount
function formatAmount(amount) {
  return typeof amount === 'number' && !isNaN(amount) ? amount.toFixed(2) : '0.00';
}

// Helper function to safely convert string to uppercase if it's a valid string
function safeToUpperCase(str) {
  return typeof str === 'string' ? str.toUpperCase() : str;
}

exports.downloadTransactionHistory = async (req, res) => {
  const { accountNo } = req.params;

  try {
    // Fetch user info
    const [userResult] = await db.promise().query('SELECT * FROM usersignup WHERE accountNo = ?', [accountNo]);

    if (userResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult[0];

    // Fetch transaction history
    const [transactions] = await db.promise().query('SELECT * FROM transactions WHERE accountNo = ? ORDER BY transactionDate DESC', [accountNo]);

    if (transactions.length === 0) {
      return res.status(404).json({ message: 'No transaction history found' });
    }

    // Create a PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Set response to download the PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=transaction-history.pdf');

    // Pipe the PDF output to the response
    doc.pipe(res);

    // Add logo (text-based logo)
    doc.fontSize(24).font('Helvetica-Bold').fillColor('black').text('Coin', { align: 'center' });
    doc.fontSize(24).font('Helvetica-Bold').fillColor('green').text('2Flow', { align: 'center' });
    doc.moveDown(1);

    // Add title and developer names at the bottom
    doc.fontSize(10).fillColor('#008000').text('Shadil, Ritik, Abdul - Developers', { align: 'center' });
    doc.fontSize(12).fillColor('black').text('Transaction History', { align: 'center' });
    doc.moveDown(1);

    // Add user info section with spacing and bold capitalized "Account Holder Name"
    doc.font('Helvetica-Bold').fillColor('Green').text(`Account Holder Information: ${safeToUpperCase()}`, { align: 'left' });
    doc.font('Times-Roman').fontSize(12).text(`ACCOUNT HOLDER NAME: ${safeToUpperCase(user.firstName)} ${safeToUpperCase(user.lastName)}`);
    doc.font('Times-Roman').fontSize(10)
      .text(`Account No: ${user.accountNo}`)
      .text(`Branch: ${user.branchName}`)
      .text(`Address: ${user.address}`)
      .text(`IFSC Code: ${user.ifscCode}`)
      .text(`Phone Number: ${user.phoneNumber}`);
    doc.moveDown(1.5);

    // Add transaction history title
    doc.fontSize(14).fillColor('black').text('Transaction History:', { underline: true });
    doc.moveDown(1);

    // Table headers with bold, uppercase, and green color for the headers
    const headers = ['TRANSACTION TYPE', 'DATE', 'TIME', 'AMOUNT', 'DESCRIPTION', 'RECEIVER ACCOUNT NO', 'NAME'];
    const headerWidths = [120, 60, 80, 60, 100, 140, 140];

    // Header styling
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#008000');
    headers.forEach((header, idx) => {
      doc.text(header, 50 + (headerWidths.slice(0, idx).reduce((a, b) => a + b, 0)), doc.y, { width: headerWidths[idx], align: 'center' });
    });
    doc.moveDown(0);

    // Draw a line to separate the header
    doc.lineWidth(0.5).moveTo(50, doc.y).lineTo(580, doc.y).stroke();
    doc.moveDown(0.5);

    // Add transaction data rows with proper alignment and vertical/horizontal lines
    doc.fontSize(8).font('Times-Roman').fillColor('black');
    transactions.forEach((transaction, index) => {
      const row = [
        safeToUpperCase(transaction.transactionType),
        formatDate(transaction.transactionDate),
        new Date(transaction.transactionDate).toLocaleTimeString(),
        formatAmount(transaction.amount),
        safeToUpperCase(transaction.description),
        (transaction.receiverAccountNo || 'N/A'),
        (user.username || 'N/A')
      ];

      row.forEach((item, idx) => {
        doc.text(item, 50 + headerWidths.slice(0, idx).reduce((a, b) => a + b, 0), doc.y, { width: headerWidths[idx], align: 'center' });
      });

      doc.moveDown(1);

      // Draw a line after each row except the last one
      if (index < transactions.length - 1) {
        doc.lineWidth(0.5).moveTo(50, doc.y).lineTo(580, doc.y).stroke();
        doc.moveDown(1);
      }
    });

    // Draw vertical lines after each column
    const xPositions = [50, 170, 230, 310, 430, 570, 690];
    xPositions.forEach(x => doc.lineWidth(0.5).moveTo(x, doc.y - (transactions.length + 1) * 10).lineTo(x, doc.y).stroke());

    // Bank rules and instructions
    doc.addPage();  // Start a new page after the transaction history section
    doc.fontSize(20).fillColor('green').font('Helvetica-Bold').text('Important Instructions and Rules for Coin2Flow Users:', { underline: true });
    doc.moveDown(1);

    doc.fontSize(14).fillColor('black')
      .text('1. Keep your account details and PIN secure. Do not share your credentials with anyone.')
      .moveDown(0.8)
      .text('2. For any unauthorized transaction, immediately contact Coin2Flow support.')
      .moveDown(0.8)
      .text('3. Transaction history is available for up to 6 months. Please download your history periodically for record-keeping.')
      .moveDown(0.8)
      .text('4. In case of incorrect transaction details or discrepancies, please submit a ticket within 48 hours.')
      .moveDown(0.8)
      .text('5. Coin2Flow will never ask for your full account number or PIN through emails or phone calls.')
      .moveDown(0.8)
      .text('6. For any disputes regarding transaction charges or fees, please refer to the Coin2Flow Terms and Conditions.')
      .moveDown(0.8)
      .text('7. Coin2Flow will not be responsible for any transactions made due to sharing of account credentials.')
      .moveDown(0.8)
      .text('8. Always verify the details before making any payments or transfers.')
      .moveDown(0.8)
      .text('9. Please keep your contact details updated to receive important notifications and updates.')
      .moveDown(0.8)
      .text('10. Coin2Flow reserves the right to make changes to the rules and policies at any time.')
      .moveDown(2);

    // Final note
    doc.fontSize(12).fillColor('green').text('Thank you for banking with Coin2Flow!', { align: 'center' });
  
    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error.message);
    res.status(500).json({ message: 'Error generating PDF. Please try again later.' });
  }
};


// Transaction History Endpoint
exports.getTransactionHistory = async (req, res) => {
  try {
    const accountNo = req.session?.user?.accountNo;

    if (!accountNo) {
      console.error("User session or account number missing.");
      return res.status(401).json({ error: "User not logged in." });
    }

    // Fetch transaction history for the user
    const [transactions] = await db.promise().query(
      "SELECT * FROM transactions WHERE accountNo = ? ORDER BY transactionDate DESC",
      [accountNo]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ message: "No transaction history found." });
    }

    // Return transaction data
    res.status(200).json({ transactions });
  } catch (error) {
    console.error("Error fetching transaction history:", error.message);
    res.status(500).json({ error: "An error occurred while fetching transaction history." });
  }
};
