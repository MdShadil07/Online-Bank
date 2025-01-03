
const mysql = require('mysql2');


// Database connection
const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD || null,
  database: process.env.DATABASE,
});

// Admin Login Function
exports.AdminLogin = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).render('admin', {
      message: 'Please provide an email and password',
    });
  }

  const adminQuery = 'SELECT * FROM admins WHERE email = ?';
  db.query(adminQuery, [email], async (err, result) => {
    if (err) {
      console.error('Error during admin login:', err.message);
      return res.status(500).render('admin', {
        message: 'Internal Server Error',
      });
    }

    if (result.length === 0) {
      return res.status(401).render('admin', {
        message: 'Invalid email or password.',
      });
    }

    const admin = result[0];

    // Verify password using bcrypt
    try {
      const isPasswordValid =(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).render('admin', {
          message: 'Invalid email or password.',
        });
      }
    } catch (bcryptError) {
      console.error('Error during password verification:', bcryptError.message);
      return res.status(500).render('admin', {
        message: 'Internal Server Error',
      });
    }

    // Store admin details in session
    req.session.admin = {
      adminId: admin.AdminId,
      email: admin.email,
    };

    console.log('Admin logged in successfully:', req.session.admin);

    try {
      // Fetch users and transactions data
      const [users] = await db.promise().query('SELECT * FROM usersignup');
      const [transactions] = await db.promise().query('SELECT * FROM transactions');

      // Process data for admin dashboard
      const totalUsers = users.length;
      const totalBalance = users.reduce((sum, user) => sum + user.accountBalance, 0);
      const totalTransactions = transactions.length;

      // Process transactions data for charts
      const [transactionData] = await db.promise().query(`
        SELECT 
          MONTHNAME(transactionDate) AS month,
          SUM(CASE WHEN type = 'Credit' THEN amount ELSE 0 END) AS credits,
          SUM(CASE WHEN type = 'Debit' THEN amount ELSE 0 END) AS debits
        FROM transactions
        GROUP BY MONTH(transactionDate)
      `);

      // Structure dashboard data for rendering
      req.session.adminDashboard = {
        totalUsers,
        totalBalance,
        totalTransactions,
        users,
        transactions,
        transactionData,
      };

      // Redirect to admin dashboard
      res.status(200).redirect('/admin/dashboard');
    } catch (dataError) {
      console.error('Error fetching dashboard data:', dataError.message);
      return res.status(500).render('admin', {
        message: 'Error fetching dashboard data.',
      });
    }
  });
};
