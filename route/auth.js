const express = require('express');
const authController = require('../controllers/auth');
const authControllerProfile = require('../controllers/profileData');
const transactionController = require('../controllers/mainTransaction'); // Import mainTransaction controller
const sendMessage = require('../controllers/sendMessageDev'); // Import sendMessage controller
const jwt = require('jsonwebtoken');


const router = express.Router();

// Signup and login routes
router.post('/signup', authController.signup);
router.post('/login', authController.login); // Login route to handle both users and admins
router.post('/profile', authControllerProfile.profile);
router.get('/Transaction', transactionController.Transaction);
router.post('/addMoney', transactionController.addMoney);
router.post('/sendMoney', transactionController.sendMoney);
router.post('/MessageAdmin', sendMessage.MessageAdmin);

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Error during logout.' });
    } else {
      res.redirect('/'); // Redirect to the homepage after logout
    }
  });
});

// Middleware to check if the user is logged in via session
function isLoggedIn(req, res, next) {
  if (req.session.user || req.session.admin) {
    return next(); // Allow access if either user or admin is logged in
  }
  res.redirect('/login'); // Redirect to the login page if not logged in
}

// Middleware to validate JWT token
function isTokenValid(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }

  // Verify the token (using JWT, for example)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded; // Attach decoded user info to request object
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
  }
}

// Transaction routes
router.post('/addMoney', isLoggedIn, transactionController.addMoney); // Add money to user's account
router.post('/sendMoney', isLoggedIn, transactionController.sendMoney); 
router.get('/Transactions', isLoggedIn, transactionController.Transaction); // Get transaction history
router.post('/MessageAdmin', isLoggedIn, sendMessage.MessageAdmin);
router.get(
  '/transactions/history/download/:accountNo',
  isLoggedIn,
  transactionController.downloadTransactionHistory
); // Download transaction history

// Dashboard route - requires login via session (handles both user and admin dashboards)
router.get('/dashboard', isLoggedIn, (req, res) => {
  if (req.session.admin) {
    // Render admin dashboard if logged in as admin
    return res.render('AdminDash', { admin: req.session.admin });
  }
  
  if (req.session.user) {
    // Render user dashboard if logged in as user
    return res.render('dashboard', { user: req.session.user });
  }

  // If no session is available, redirect to login
  res.redirect('/login');
});

// Admin Panel Routes (Admin-specific routes)
router.get('/admin/dashboard', isLoggedIn, (req, res) => {
  // Check if the session belongs to an admin
  if (req.session.admin) {
    return res.render('AdminDash', { admin: req.session.admin });
  } else {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
});

// Additional admin functionality
router.get('/admin/manage-users', isLoggedIn, (req, res) => {
  // Only admins can access this page
  if (req.session.admin) {
    return res.render('adminManageUsers'); // This is an example, create this view
  } else {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
});

module.exports = router;
