const express = require("express");
const path = require("path");
const mysql = require("mysql");
const dotenv = require("dotenv");
const session = require("express-session");

dotenv.config();  

const app = express();

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD || null,
  database: process.env.DATABASE
});

// Serve static files from both frontend and assets directories
const publicDirectory = path.join(__dirname, './frontend');
const assetsDirectory = path.join(__dirname, './assets');
app.use(express.static(publicDirectory));
app.use('/assets', express.static(assetsDirectory));




app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.set('view engine', 'hbs');

// Use the session middleware with the session secret from .env
app.use(session({
  secret: process.env.SESSION_SECRET,  // Using your secret here
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // Set to true if using HTTPS
}));

db.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("MySQL connected...");
  }
});

// Define routes
app.use('/', require('./route/pages')); // Serves pages like login, signup, etc.
app.use('/auth', require('./route/auth')); // Handles signup, login POST requests, etc.

app.use((req, res, next) => {
  res.locals.user = req.session.user || nill;
  next();
});

app.listen(5004, () => {
  console.log("Server started on http://localhost:5004");
});


