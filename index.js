const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session'); // added
const userModel = require('./models/user'); // your Mongoose model

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ MongoDB connection (update with your URI)
mongoose.connect('mongodb://127.0.0.1:27017/studentDB')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error(err));

// -------------------- SESSION SETUP --------------------
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_replace_in_prod',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2 } // 2 hours
}));

// expose user to views (optional)
app.use((req, res, next) => {
  res.locals.currentUser = req.session && req.session.user ? req.session.user : null;
  next();
});

// Simple local user (no DB) - change as needed
const LOCAL_USER = { username: 'admin', password: '12345' };

// Middleware to protect routes
function ensureAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  // if AJAX request, send 401; else redirect to login
  if (req.xhr || req.headers.accept.indexOf('json') > -1) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/login');
}

// -------------------- AUTH ROUTES --------------------

// Show login page (render views/login.ejs — tailwind styled)
app.get('/login', (req, res) => {
  // if already logged in, go to home/read
  if (req.session && req.session.user) return res.redirect('/read');
  res.render('login', { error: null });
});

// Handle login post
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === LOCAL_USER.username && password === LOCAL_USER.password) {
    req.session.user = username;
    return res.redirect('/read'); // logged in -> students list
  }
  res.render('login', { error: 'Invalid username or password' });
});

// Protected home (optional)
app.get('/home', ensureAuth, (req, res) => {
  res.render('home', { user: req.session.user });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// -------------------- Your existing routes (now protected) --------------------

// Home form page (protected)
app.get('/input', ensureAuth, (req, res) => {
  res.render('input');
});

// ✅ Handle form submit & redirect to /read (protected)
app.post('/students', ensureAuth, async (req, res) => {
  try {
    await userModel.create({
      name: req.body.name,
      roll: req.body.rollNo,
      email: req.body.email,
      mobile: req.body.phone
    });
    res.redirect('/read'); // redirect to All Students after create
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating student');
  }
});

// ✅ Read all students (protected)
app.get('/read', ensureAuth, async (req, res) => {
  try {
    const students = await userModel.find();
    res.render('read', { students });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching students');
  }
});

// ✅ Search student by roll number (protected)
app.get('/students/search', ensureAuth, async (req, res) => {
  try {
    const rollNo = req.query.rollNo;
    const student = await userModel.findOne({ roll: rollNo });
    if (!student) {
      return res.render('read', { students: [] }); // No student found
    }
    res.render('read', { students: [student] }); // show single student
  } catch (err) {
    console.error(err);
    res.status(500).send('Error searching student');
  }
});

// ✅ Delete student (protected)
app.post('/students/:id/delete', ensureAuth, async (req, res) => {
  try {
    await userModel.findByIdAndDelete(req.params.id);
    res.redirect('/read');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting student');
  }
});

// Root - redirect to read or login
app.get('/', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/read');
  res.redirect('/login');
});

app.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'));
