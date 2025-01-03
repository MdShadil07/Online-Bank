const express = require('express');
const db = require('../LoginSignup'); // Ensure database connection is correct
const authMiddleware = require('../middleware/authMiddleware'); // Adjust path if needed

const router = express.Router();

// Function to fetch and update session user data
async function fetchAndUpdateUserSession(userId, session) {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM usersignup WHERE userId = ?';
    db.query(query, [userId], (err, result) => {
      if (err) {
        console.error('Error fetching user data:', err.message);
        return reject('Error fetching user data.');
      }
      if (result.length === 0) {
        return reject('User not found.');
      }
      const user = result[0];
      session.user = {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        accountStatus: user.accountStatus,
        gender: user.gender,
        DOB: user.DOB ? new Date(user.DOB).toISOString().slice(0, 10) : 'Not specified',
        accountNo: user.accountNo,
        ifscCode: user.ifscCode,
        accountBalance: parseFloat(user.accountBalance) || 0,
        initialDeposit: parseFloat(user.initialDeposit) || 0,
        branchName: user.branchName,
        profilePicture: user.profilePicture || 'assets/default-profile.PNG',
      };
      resolve(session.user);
    });
  });
}

// Route to render dashboard
router.get('/', (req, res) => {
  res.render('dashboard');
});


router.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

// Route to render signup page
router.get('/signup', (req, res) => {
  res.render('signup');
});

// Route to render login page
router.get('/login', (req, res) => {
  res.render('login');
});

router.get('/privacyTerms', (req, res) => {
  res.render('privacyTerms');
});

router.get('/Terms', (req, res)=> {
  res.render('Terms');
});

router.get('/About', authMiddleware, async (req, res) => {
  const userId = req.session.user?.userId;
  if (!userId) {
    return res.redirect('/login');
  }
  res.render('About');
});

router.get('/AdminDash', (req, res) => {
  res.render('AdminDash');
})

router.get('/viewBalance', (req, res) => {
  res.render('viewBalance');
});

// Protected profile route
router.get('/profile', authMiddleware, async (req, res) => {
  const userId = req.session.user?.userId;
  if (!userId) {
    return res.redirect('/login');
  }

  try {
    const user = await fetchAndUpdateUserSession(userId, req.session);
    res.render('profile', {
      username: `${user.firstName} ${user.lastName}`.trim() || 'User',
      email: user.email || 'Not provided',
      phoneNumber: user.phoneNumber || 'Not provided',
      DOB: user.DOB,
      address: user.address || 'Not specified',
      gender: user.gender || 'Not specified',
      accountStatus: user.accountStatus,
      accountNo: user.accountNo,
      ifscCode: user.ifscCode,
      initialDeposit: user.initialDeposit,
      finalBalance: (user.accountBalance + user.initialDeposit).toFixed(2),
      branchName: user.branchName || 'Not specified',
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching profile data.');
  }
});

// Protected Transaction route
router.get('/Transaction', authMiddleware, async (req, res) => {
  const userId = req.session.user?.userId;
  if (!userId) {
    return res.redirect('/login');
  }

  try {
    const user = await fetchAndUpdateUserSession(userId, req.session);
    res.render('Transaction', {
      username: `${user.firstName} ${user.lastName}`.trim() || 'User',
      email: user.email || 'Not provided',
      phoneNumber: user.phoneNumber || 'Not provided',
      DOB: user.DOB,
      address: user.address ,
      gender: user.gender,
      accountNo: user.accountNo,
      accountStatus: user.accountStatus,
      ifscCode: user.ifscCode,
      initialDeposit: user.initialDeposit,
      finalBalance: (user.accountBalance + user.initialDeposit).toFixed(2),
      branchName: user.branchName ,
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching transaction data.');
  }
});


//vieaw balance rendeing


// Route to render viewBalance page with the user data
router.get('/viewBalance', authMiddleware, async (req, res) => {
  const userId = req.session.user?.userId;
  if (!userId) {
    return res.redirect('/login');
  }

  try {
    // Fetch and update the session user data
    const user = await fetchAndUpdateUserSession(userId, req.session);

    // Render the viewBalance page with the required user data
    res.render('viewBalance', {
      balance: user.accountBalance.toFixed(2),  // User's account balance
      username: `${user.firstName} ${user.lastName}`.trim() || 'User',
      accountNumber: user.accountNo,
      ifscCode: user.ifscCode,
      DOB: user.DOB,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching balance data.');
  }
});


module.exports = router;
