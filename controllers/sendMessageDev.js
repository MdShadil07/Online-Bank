
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
    console.log('Database connected successfully for messages route');
  }
});

exports.MessageAdmin = (req, res) => {
  const userId = req.session.user?.userId;  // Ensure session data exists

  if (!userId) {
      console.log('User not logged in for messages route');
      return res.redirect('/login');  // Redirect to login if not authenticated
  }

  console.log('User ID for message:', userId); // Log the userId

  const query = 'SELECT * FROM usersignup WHERE userId = ?';
  db.query(query, [userId], (err, result) => {
      if (err) {
          console.error('Error fetching user profile:', err.message);
          return res.status(500).send('Error fetching profile data. Please try again later.');
      }

      if (result.length === 0) {
          console.log('User not found');
          return res.status(404).send('User not found.');
      }

      const userProfile = result[0];
      const { name, message } = req.body;

      if (!name || !message) {
          return res.status(400).send('All fields are required.');
      }

      const userEmail = userProfile.email;

      // Insert message into the database
      const insertQuery = 'INSERT INTO messages (userId, name, email, message, created_at) VALUES (?, ?, ?, ?, NOW())';
      db.query(insertQuery, [userId, name, userEmail, message], (insertErr) => {
          if (insertErr) {
              console.error('Error saving the message:', insertErr.message);
              return res.status(500).send('Error saving your message. Please try again later.');
          }

          // Send an email using Nodemailer
          const mailOptions = {
              from: userEmail,
              to: process.env.ADMIN_EMAIL || 'mdshadil62@gmail.com',
              subject: `New Message from ${name} (${userEmail})`,
              text: `Name: ${name}\nEmail: ${userEmail}\nMessage: ${message}`,
          };

          transporter.sendMail(mailOptions, (emailErr) => {
              if (emailErr) {
                  console.error('Error sending email:', emailErr.message);
                  return res.status(500).send('Error sending email. Please try again later.');
              }

              res.status(200).json({
                  success: true,
                  message: 'Message sent successfully!',
              });
          });
      });
  });
};
