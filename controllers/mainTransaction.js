
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const mysql = require("mysql2");
const nodemailer = require('nodemailer');


const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD || null,
  database: process.env.DATABASE
});

const dbPromise = db.promise();



const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
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

    // Use promise-based query for fetching user data
    const [result] = await dbPromise.query("SELECT * FROM usersignup WHERE accountNo = ?", [accountNo]);

    if (result.length === 0) {
      console.error("User not found.");
      return res.status(404).json({ error: "User not found." });
    }

    const userProfile = result[0];
    console.log("User profile fetched successfully:", userProfile);

    // Pagination variables
    const page = req.query.page || 1;
    const itemsPerPage = 5;
    const offset = (page - 1) * itemsPerPage;

    // Use promise-based query to fetch paginated transactions
    const [transactions] = await dbPromise.query(
      "SELECT transactionId, transactionType, amount, balanceAfter, transactionDate, description FROM transactions WHERE accountNo = ? ORDER BY transactionDate DESC LIMIT ? OFFSET ?",
      [accountNo, itemsPerPage, offset]
    );

    if (transactions.length === 0) {
      console.warn("No transactions found for user:", accountNo);
    }

    // Get total number of transactions for pagination
    const [countResult] = await dbPromise.query(
      "SELECT COUNT(*) AS total FROM transactions WHERE accountNo = ?",
      [accountNo]
    );
    const totalTransactions = countResult[0].total;
    const totalPages = Math.ceil(totalTransactions / itemsPerPage);

    console.log("Transaction history fetched successfully:", transactions);

    // Return response with user profile and transaction details
    res.json({
      username: userProfile.firstName && userProfile.lastName
        ? `${userProfile.firstName} ${userProfile.lastName}`
        : "User",
      profilePicture: userProfile.profilePicture || "/default.png",
      transactions,
      totalPages,
      currentPage: parseInt(page),
    });

  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    res.status(500).json({ error: "An error occurred. Please try again later." });
  }
};


// Add Money

const sendTransactionEmail = (recipientEmail, subject, transactionDetails) => {
  const emailBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        /* Body styles */
        body {
          font-family: 'Poppins', sans-serif;
          background-color: #121212;
          color: #ffffff;
          margin: 0;
          padding: 0;
        }

        /* Container style */
        .container {
          background-color: #1e1e1e;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          width: 100%;
          max-width: 600px;
          margin: 20px auto;
        }

        /* Header style */
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 2px solid #444;
        }

        .header h1 {
          color: #f39c12;
          font-size: 24px;
          margin: 0;
          font-weight: 600;
        }

        /* Transaction details */
        .transaction-details {
          padding-top: 20px;
          border-top: 2px solid #444;
        }

        .transaction-details p {
          font-size: 16px;
          color: #ffffff;
        }

        .transaction-details p strong {
          color: #f39c12;
        }

        .transaction-details i {
          margin-right: 10px;
        }

        /* Buttons */
        .btn {
          background-color: #f39c12;
          border: none;
          color: white;
          padding: 12px 25px;
          font-size: 16px;
          border-radius: 5px;
          text-decoration: none;
          display: inline-block;
          margin-top: 20px;
          margin-left: 100px;
          transition: background-color 0.3s ease-in-out;
        }

        .btn:hover {
          background-color: #e67e22;
        }

        /* Footer */
        .footer {
          text-align: center;
          font-size: 0.9rem;
          padding: 20px;
          border-top: 2px solid #444;
          color: #888;
        }

        .footer a {
          color: #f39c12;
          text-decoration: none;
        }

        /* Responsive design */
        @media (max-width: 600px) {
          .container {
            padding: 15px;
          }

          .header h1 {
            font-size: 22px;
          }

          .transaction-details p {
            font-size: 14px;
          }

          .btn {
            padding: 10px 20px;
            font-size: 14px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->

         <div class="header">
      <h1>Coin2Flow</h1>
      <h2 class="text-warning">Transaction Update from Your Bank</h2>
    </div>
        <div class="header">
          <h1>${subject}</h1>
        </div>

        <!-- Transaction Details -->
        <div class="transaction-details">
          <p><i class="fas fa-arrow-up text-success"></i><strong>Amount Added:</strong> ₹${transactionDetails.amount}</p>
          <p><i class="fas fa-wallet text-info"></i><strong>Account Number:</strong> ${transactionDetails.accountNo}</p>
          <p><i class="fas fa-exchange-alt text-warning"></i><strong>Transaction Type:</strong> ${transactionDetails.transactionType}</p>
          <p><i class="fas fa-check-circle text-success"></i><strong>New Balance:</strong> ₹${transactionDetails.newBalance}</p>
        </div>

        <!-- Call to Action Button -->
        <div class="text-center">
          <a href="${transactionDetails.transactionLink}" class="btn">View Full Transaction History</a>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Thank you for banking with us!</p>
          <p>Follow us on: 
            <a href="https://www.instagram.com/Md_shadil7" target="_blank"><i class="fab fa-instagram"></i></a> 
            <a href="https://twitter.com/Mdshadil07" target="_blank"><i class="fab fa-twitter"></i></a> 
            <a href="https://facebook.com/mdshadil" target="_blank"><i class="fab fa-facebook"></i></a>
          </p>
          <p><small>&copy; ${new Date().getFullYear()} Your Bank. All rights reserved.</small></p>
        </div>
      </div>

      <!-- FontAwesome Icons -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/js/all.min.js"></script>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: subject,
    html: emailBody,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};


exports.addMoney = (req, res) => {
  const accountNo = req.session.user ? req.session.user.accountNo : null;

  if (!accountNo) {
    return res.status(401).json({ message: 'User not logged in. Please log in first.' });
  }

  const { amount } = req.body;

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount. Amount must be greater than zero.' });
  }

  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }

    db.query('SELECT accountBalance, email FROM usersignup WHERE accountNo = ?', [accountNo], (err, result) => {
      if (err) {
        return db.rollback(() => {
          res.status(500).json({ message: 'Error fetching balance.' });
        });
      }

      const currentBalance = parseFloat(result[0].accountBalance);
      const newBalance = currentBalance + parseFloat(amount);
      const email = result[0].email;

      db.query('UPDATE usersignup SET accountBalance = ? WHERE accountNo = ?', [newBalance, accountNo], (updateErr) => {
        if (updateErr) {
          return db.rollback(() => {
            res.status(500).json({ message: 'Error updating balance.' });
          });
        }

        db.query(
          'INSERT INTO transactions (accountNo, transactionType, amount, balanceAfter, description, transactionDate) VALUES (?, ?, ?, ?, ?, NOW())',
          [accountNo, 'credit', amount, newBalance, 'Money added to account'],
          (transactionErr) => {
            if (transactionErr) {
              return db.rollback(() => {
                res.status(500).json({ message: 'Error recording transaction.' });
              });
            }

            db.commit((commitErr) => {
              if (commitErr) {
                return db.rollback(() => {
                  res.status(500).json({ message: 'Error committing transaction.' });
                });
              }

              const transactionDetails = {
                amount: amount,
                accountNo: accountNo,
                transactionType: 'credit',
                newBalance: newBalance,
              };

              sendTransactionEmail(email, 'Money Added to Your Account', transactionDetails);

              res.status(200).json({
                message: `You have added ₹${amount} in your account.`,
                newBalance,
              });
            });
          }
        );
      });
    });
  });
};


// Send Money
exports.sendMoney = async (req, res) => {
  const senderAccountNo = req.session?.user?.accountNo;

  if (!senderAccountNo) {
    return res.status(401).json({ message: "User not logged in. Please log in first." });
  }

  const { receiverAccountNo, amount, receiverIfsc } = req.body;

  if (!receiverAccountNo || isNaN(amount) || amount <= 0 || !receiverIfsc) {
    return res.status(400).json({
      message: "Invalid input. Receiver account, valid amount, and IFSC Code are required.",
    });
  }

  try {
    const [senderResult] = await db.promise().query(
      "SELECT accountBalance, email FROM usersignup WHERE accountNo = ?",
      [senderAccountNo]
    );

    if (senderResult.length === 0) {
      return res.status(404).json({ message: "Sender account not found." });
    }

    const senderBalance = parseFloat(senderResult[0].accountBalance);
    if (senderBalance < amount) {
      return res.status(400).json({ message: "Insufficient balance." });
    }

    const [receiverResult] = await db.promise().query(
      "SELECT accountBalance, ifscCode, email FROM usersignup WHERE accountNo = ?",
      [receiverAccountNo]
    );

    if (receiverResult.length === 0) {
      return res.status(404).json({ message: "Receiver account not found." });
    }

    const receiverBalance = parseFloat(receiverResult[0].accountBalance);
    const receiverIfscCode = receiverResult[0].ifscCode;
    const receiverEmail = receiverResult[0].email;

    if (receiverIfscCode.trim().toUpperCase() !== receiverIfsc.trim().toUpperCase()) {
      return res.status(400).json({
        message: `Incorrect IFSC Code for the receiver's account. Please provide the correct IFSC Code.`,
      });
    }

    await db.promise().beginTransaction();

    const newSenderBalance = senderBalance - amount;
    const newReceiverBalance = receiverBalance + amount;

    await db.promise().query(
      "UPDATE usersignup SET accountBalance = ? WHERE accountNo = ?",
      [newSenderBalance, senderAccountNo]
    );

    await db.promise().query(
      "UPDATE usersignup SET accountBalance = ? WHERE accountNo = ?",
      [newReceiverBalance, receiverAccountNo]
    );

    await db.promise().query(
      `INSERT INTO transactions (accountNo, transactionType, amount, balanceAfter, receiverAccountNo, description, transactionDate) 
      VALUES (?, 'debit', ?, ?, ?, ?, NOW())`,
      [senderAccountNo, amount, newSenderBalance, receiverAccountNo, `Transfer to ${receiverAccountNo}`]
    );

    await db.promise().query(
      `INSERT INTO transactions (accountNo, transactionType, amount, balanceAfter, receiverAccountNo, description, transactionDate) 
      VALUES (?, 'credit', ?, ?, ?, ?, NOW())`,
      [receiverAccountNo, amount, newReceiverBalance, senderAccountNo, `Received from ${senderAccountNo}`]
    );

    await db.promise().commit();

    // Send emails
    const senderEmail = senderResult[0].email;
    const senderTransactionDetails = {
      amount: amount,
      accountNo: senderAccountNo,
      transactionType: 'debit',
      newBalance: newSenderBalance,
    };

    sendTransactionEmail(senderEmail, `Money Sent to Account ${receiverAccountNo}`, senderTransactionDetails, 'sender');

    const receiverTransactionDetails = {
      amount: amount,
      accountNo: receiverAccountNo,
      transactionType: 'credit',
      newBalance: newReceiverBalance,
    };

    sendTransactionEmail(receiverEmail, `Money Received from Account ${senderAccountNo}`, receiverTransactionDetails, 'receiver');

    res.status(200).json({
      message: `Money sent to Account: ${receiverAccountNo}. You have ₹${newSenderBalance} remaining in your account.`,
      newSenderBalance,
      newReceiverBalance,
    });
  } catch (error) {
    console.error("Error during sendMoney:", error.message);
    await db.promise().rollback();
    res.status(500).json({ message: "An error occurred. Please try again later." });
  }
};


// Download Transaction History as PDF



/// Helper function to format dates
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

    // Fetch transaction history with receiver name by joining usersignup table
    const [transactions] = await db.promise().query(`
      SELECT t.*, u.firstName, u.lastName
      FROM transactions t
      LEFT JOIN usersignup u ON t.receiverAccountNo = u.accountNo
      WHERE t.accountNo = ? 
      ORDER BY t.transactionDate DESC`, [accountNo]);

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
    const headers = ['TRANSACTION TYPE', 'DATE', 'TIME', 'AMOUNT', 'DESCRIPTION', 'RECEIVER NAME', 'SENDER NAME'];
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
        formatAmount(parseFloat(transaction.amount)), // Ensure amount is parsed as a float
        safeToUpperCase(transaction.description),
        (transaction.firstName && transaction.lastName) ? `${transaction.firstName} ${transaction.lastName}` : 'N/A', // Display receiver name
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
