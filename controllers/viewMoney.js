const db = require('../LoginSignup'); 

exports.viewBalance = (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.redirect('/login'); // Redirect to login if not authenticated
  }

  const query = 'SELECT * FROM usersignup WHERE userId = ?';
  db.query(query, [userId], (err, result) => {
    if (err) {
      console.error('Error fetching user profile:', err.message);
      return res.status(500).send('Error fetching profile data. Please try again later.');
    }

    if (result.length === 0) {
      return res.status(404).send('User not found.');
    }

    const userProfile = result[0];

    // Render the Handlebars template with user data
    res.render('viewBalance', {
      fullName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim(),
      username: userProfile.firstName || 'User',
      email: userProfile.email || 'Not provided',
      phone: userProfile.phoneNumber || 'Not provided',
      DOB: userProfile.DOB?.slice(0, 10) || 'Not specified',
      gender: userProfile.gender || 'Not specified',
      address: userProfile.address || 'No address',
      accountNumber: userProfile.accountNo,
      ifscCode: userProfile.ifscCode,
      finalBalance: (userProfile.accountBalance + (userProfile.initialDeposit || 0)).toFixed(2),
      balance: userProfile.accountBalance || 0,
      profileImage: userProfile.profilePicture || 'assets/default-profile.PNG',
    });
  });
};
