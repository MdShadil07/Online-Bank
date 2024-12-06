const mysql = require("mysql2");
const bcrypt = require('bcryptjs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const isAuthenticated = require("../middleware/authMiddleware");

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
