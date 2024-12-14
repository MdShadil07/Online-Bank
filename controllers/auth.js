const mysql = require("mysql2");
const bcrypt = require('bcryptjs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const isAuthenticated = require("../middleware/authMiddleware");
const nodemailer = require('nodemailer');

// Database connection setup
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

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Middleware to verify JWT token
function isTokenValid(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }

  // Verify the token using JWT secret
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      console.log('jwt error',err);
      return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
    }

    req.user = decoded; // Attach decoded user info to the request object
    next(); // Proceed to the next middleware or route handler
  });
}



const transporter = nodemailer.createTransport({
  service: 'gmail', // You can use other email services like Outlook, etc.
  auth: {
    user: process.env.EMAIL_USER, // Your email address (e.g., 'youremail@gmail.com')
    pass: process.env.EMAIL_PASS, // Your email password (use app-specific passwords if using Gmail with 2FA)
  },
});


// Sign up function
exports.signup = (req, res) => {
  const {
    firstName, lastName, DOB, email, phoneNumber, address, branchName, accountStatus,
    accountType, gender, password, passwordConfirm, securityQuestion, securityAnswer,
    twoFAEnabled, initialDeposit
  } = req.body;

  if (!firstName || !lastName || !DOB || !email || !phoneNumber || !address ||
      !accountType || !branchName || !gender || !password || !passwordConfirm || !initialDeposit) {
    return res.render('signup', {
      message: 'All fields are required.'
    });
  }

  const maleProfile = `https://avatar.iran.liara.run/public/boy?username=${firstName}`;
  const femaleProfile = `https://avatar.iran.liara.run/public/girl?username=${firstName}`;
  const profilePicture = gender.toLowerCase() === 'male' ? maleProfile : femaleProfile;

  db.query('SELECT email FROM usersignup WHERE email = ?', [email], (err, result) => {
    if (err) {
      console.error('Database error during email check:', err);
      return res.render('signup', {
        message: 'Database error. Please try again later.'
      });
    }

    if (result.length > 0) {
      return res.render('signup', {
        message: 'That email is already in use.'
      });
    }

    if (password !== passwordConfirm) {
      return res.render('signup', {
        message: 'Passwords do not match.'
      });
    }

    bcrypt.hash(password, 8, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.render('signup', {
          message: 'Error during password encryption. Please try again later.'
        });
      }

      const generateUniqueAccountNumber = (callback) => {
        const attemptAccountNumber = () => {
          const accountNo = Math.floor(1000000000 + Math.random() * 9000000000); // Generate a 10-digit number
          db.query('SELECT COUNT(*) AS count FROM usersignup WHERE accountNo = ?', [accountNo], (err, result) => {
            if (err) return callback(err);
            if (result[0].count === 0) {
              callback(null, accountNo);
            } else {
              attemptAccountNumber();
            }
          });
        };
        attemptAccountNumber();
      };

      generateUniqueAccountNumber((err, accountNo) => {
        if (err) {
          console.error('Error generating account number:', err);
          return res.render('signup', {
            message: 'Error generating account number. Please try again later.'
          });
        }

        const ifscCode = `SHA${accountNo.toString().slice(-4)}`;

        const userData = {
          firstName,
          lastName,
          DOB,
          email,
          address,
          phoneNumber,
          branchName,
          gender,
          accountType,
          accountStatus,
          password: hashedPassword,
          initialDeposit,
          securityQuestion,
          securityAnswer,
          twoFAEnabled,
          accountNo,
          ifscCode,
          profilePicture, // Automatically assigned profile picture
        };

        db.query('INSERT INTO usersignup SET ?', userData, (err, result) => {
          if (err) {
            console.error('Error during registration:', err);
            return res.render('signup', {
              message: 'Registration failed. Please try again later.'
            });
          }

          console.log('User registered successfully:', result);
          
          // HTML email template with Font Awesome icons and transitions
          const emailBody = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome to Coin to Flow</title>
              <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
              <style>
                body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f9;
                  margin: 0;
                  padding: 0;
                }
                .email-container {
                  width: 100%;
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  border: 1px solid #ddd;
                  border-radius: 8px;
                  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }
                .email-header {
                  background-color: #003366;
                  color: #ffffff;
                  padding: 20px;
                  text-align: center;
                  border-top-left-radius: 8px;
                  border-top-right-radius: 8px;
                }
                .email-header img {
                  max-width: 120px;
                }
                .email-body {
                  padding: 20px;
                }
                .email-body h2 {
                  color: #003366;
                }
                .email-body p {
                  color: #333;
                  line-height: 1.6;
                }
                .account-details {
                  background-color: #f1f1f1;
                  padding: 15px;
                  border-radius: 6px;
                  margin: 20px 0;
                }
                .account-details p {
                  margin: 5px 0;
                }
                .footer {
                  text-align: center;
                  background-color: #003366;
                  color: #ffffff;
                  padding: 15px;
                  border-bottom-left-radius: 8px;
                  border-bottom-right-radius: 8px;
                }
                .footer a {
                  color: #ffffff;
                  text-decoration: none;
                }
                .footer .social-icons img {
                  width: 30px;
                  margin: 5px;
                  transition: transform 0.3s ease-in-out;
                }
                .footer .social-icons img:hover {
                  transform: scale(1.2);
                }
                .footer .fa {
                  font-size: 20px;
                  margin: 0 10px;
                  transition: color 0.3s ease-in-out;
                }
                .footer .fa:hover {
                  color: #1e90ff;
                }
              </style>
            </head>
            <body>
              <div class="email-container">
                <div class="email-header">
                  <img src="https://your-domain.com/logo.png" alt="Coin to Flow Logo">
                  <h1>Welcome to Coin to Flow</h1>
                </div>

                <div class="email-body">
                  <h2>Hello ${firstName} ${lastName},</h2>
                  <p>Thank you for signing up for Coin to Flow! Your account has been successfully created. Below are your account details and login credentials.</p>

                  <div class="account-details">
                    <h3>Your Account Details:</h3>
                    <p><strong>Account Number:</strong> ${accountNo}</p>
                    <p><strong>IFSC Code:</strong> ${ifscCode}</p>
                    <p><strong>Branch Name:</strong> ${branchName}</p>
                    <p><strong>Account Type:</strong> ${accountType}</p>
                    <p><strong>Account Status:</strong> ${accountStatus}</p>
                  </div>

                  <div class="account-details">
                    <h3>Your Login Credentials:</h3>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Password:</strong> ${password} (Please change this after your first login)</p>
                  </div>

                  <p>If you have any questions or need further assistance, feel free to contact us at <strong>support@cointoflow.com</strong>.</p>

                  <p>Welcome aboard, and we hope you enjoy your experience with Coin to Flow!</p>
                </div>

                <div class="footer">
                  <p>&copy; 2024 Coin to Flow. All rights reserved.</p>
                  <p>Follow us:</p>
                  <div class="social-icons">
                    <a href="https://facebook.com/cointoflow" target="_blank"><i class="fab fa-facebook"></i></a>
                    <a href="https://twitter.com/cointoflow" target="_blank"><i class="fab fa-twitter"></i></a>
                    <a href="https://linkedin.com/company/cointoflow" target="_blank"><i class="fab fa-linkedin"></i></a>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          // Send email with HTML content
          const mailOptions = {
            from: process.env.EMAIL_USER, // Your email address
            to: email,
            subject: 'Welcome to Coin to Flow!',
            html: emailBody,
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('Error sending email:', error);
            } else {
              console.log('Email sent:', info.response);
            }
          });

          return res.render('login', {
            message: 'You are registered, please log in.'
          });
        });
      });
    });
  });
};


const userSessionIntervals = new Map(); // Store refresh intervals outside session

// Login function


exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const query = 'SELECT * FROM usersignup WHERE email = ?';
  db.query(query, [email], async (err, result) => {
    if (err) {
      console.error('Error during login:', err.message);
      return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }

    if (result.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = result[0];

    // Password validation using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Store user data in session upon successful login
    req.session.user = {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      gender: user.gender,
      accountStatus: user.accountStatus,
      DOB: user.DOB,
      accountNo: user.accountNo,
      ifscCode: user.ifscCode,
      accountBalance: user.accountBalance,
      initialDeposit: user.initialDeposit,
      branchName: user.branchName,
      profilePicture: user.profilePicture,
    };

    console.log('User logged in successfully:', req.session.user);

    // Clear any previous interval for this user (if applicable)
    if (userSessionIntervals.has(user.userId)) {
      clearInterval(userSessionIntervals.get(user.userId));
    }

    // Periodic refresh of user session (you can adjust the interval as needed)
    const intervalId = setInterval(() => {
      const refreshQuery = 'SELECT * FROM usersignup WHERE userId = ?';
      db.query(refreshQuery, [user.userId], (refreshErr, refreshResult) => {
        if (refreshErr) {
          console.error('Error refreshing session:', refreshErr.message);
          return;
        }

        if (refreshResult.length > 0) {
          const updatedUser = refreshResult[0];
          req.session.user = {
            userId: updatedUser.userId,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            phoneNumber: updatedUser.phoneNumber,
            address: updatedUser.address,
            gender: updatedUser.gender,
            DOB: updatedUser.DOB,
            accountStatus: updatedUser.accountStatus,
            accountNo: updatedUser.accountNo,
            ifscCode: updatedUser.ifscCode,
            accountBalance: updatedUser.accountBalance,
            initialDeposit: updatedUser.initialDeposit,
            branchName: updatedUser.branchName,
            profilePicture: updatedUser.profilePicture,
          };
          // console.log('Session updated with latest user data.', req.session.user);
        }
      });
    }, 2000); // Refresh interval, you can adjust the time based on your needs

    // Save the interval in the map
    userSessionIntervals.set(user.userId, intervalId);

    // Instead of returning a token, just return success message
    res.status(200).json({
      message: 'Login successful.',
    });
  });
};

// Logout function

exports.logout = (req, res) => {
  const userId = req.session.user?.userId;

  if (userId && userSessionIntervals.has(userId)) {
    // Clear the interval for the user session
    clearInterval(userSessionIntervals.get(userId));
    userSessionIntervals.delete(userId);
  }

  // Destroy the session, effectively logging out the user
  req.session.destroy((err) => {
    if (err) {
      console.error('Error during logout:', err.message);
      return res.status(500).json({ message: 'Logout failed. Please try again later.' });
    }

    // Respond with a success message after the session is destroyed
    res.status(200).json({ message: 'Logged out successfully.' });
  });
};
