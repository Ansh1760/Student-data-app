// index.js
require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./lib/db');  // using cached DB connector
const userModel = require('./models/user');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------
// ✅ CONNECT TO MONGO USING lib/db.js (Atlas / Local)
// -----------------------------------------------
connectDB()
  .then(() => console.log("✅ MongoDB Connected using connectDB"))
  .catch(err => console.error("❌ Mongo Error:", err));


// -----------------------------------------------
// ✅ SESSION STORE (PERSISTENT ON RENDER)
// -----------------------------------------------
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_123',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studentDB'
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Make user available in templates
app.use((req, res, next) => {
  res.locals.currentUser = req.session?.user || null;
  next();
});

// -----------------------------------------------
// SIMPLE STATIC LOGIN USER
// -----------------------------------------------
const LOCAL_USER = { username: "admin", password: "12345" };

// Protect routes middleware
function ensureAuth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/login');
}

// -----------------------------------------------
// LOGIN ROUTES
// -----------------------------------------------
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect("/read");
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === LOCAL_USER.username && password === LOCAL_USER.password) {
    req.session.user = username;
    console.log("Logged in:", req.session.user);
    return res.redirect('/read');
  }

  return res.render('login', { error: "Invalid username or password" });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// -----------------------------------------------
// STUDENT ROUTES (PROTECTED)
// -----------------------------------------------
app.get('/input', ensureAuth, (req, res) => res.render('input'));

app.post('/students', ensureAuth, async (req, res) => {
  try {
    await userModel.create({
      name: req.body.name,
      roll: req.body.rollNo,
      email: req.body.email,
      mobile: req.body.phone
    });
    res.redirect('/read');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating student");
  }
});

// temporary debug /read route (paste into index.js replacing existing /read)
app.get('/read', async (req, res) => {
  console.log('--- DEBUG /read called ---');
  console.log('session:', req.session ? req.session : '(no session)');

  try {
    // try DB fetch
    const students = await userModel.find().lean();
    console.log('DEBUG: students found =', Array.isArray(students) ? students.length : typeof students);
    return res.render('read', { students: students || [] });
  } catch (err) {
    console.error('DEBUG: error in /read ->', err && err.stack ? err.stack : err);
    // friendly message in browser while debugging
    return res.status(500).send('Server error while loading students — check server logs.');
  }
});

app.get('/students/search', ensureAuth, async (req, res) => {
  try {
    const student = await userModel.findOne({ roll: req.query.rollNo }).lean();
    res.render('read', { students: student ? [student] : [] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error searching student");
  }
});

app.post('/students/:id/delete', ensureAuth, async (req, res) => {
  try {
    await userModel.findByIdAndDelete(req.params.id);
    res.redirect('/read');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting student");
  }
});

// -----------------------------------------------
app.get('/', (req, res) => {
  return req.session.user ? res.redirect('/read') : res.redirect('/login');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
