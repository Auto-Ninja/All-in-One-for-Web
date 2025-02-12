const express = require('express');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const OAuth2Strategy = require('passport-oauth2').Strategy;
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Dummy user store
const users = [];

// Passport local strategy for user authentication
passport.use(new LocalStrategy(
  { usernameField: 'username', passwordField: 'password' },
  (username, password, done) => {
    const user = users.find(u => u.username === username);
    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return done(err);
      if (!isMatch) return done(null, false, { message: 'Incorrect password.' });
      return done(null, user);
    });
  }
));

// Passport OAuth2 strategy for token generation
passport.use(new OAuth2Strategy({
    authorizationURL: 'http://localhost:3000/oauth2/authorize',
    tokenURL: 'http://localhost:3000/oauth2/token',
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/callback'
  },
  (accessToken, refreshToken, profile, cb) => {
    const user = jwt.decode(accessToken);
    return cb(null, user);
  }
));

app.use(passport.initialize());

// Route for user registration
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return res.status(500).send('Error hashing password.');
    const newUser = { username, password: hashedPassword };
    users.push(newUser);
    res.status(201).send('User registered successfully.');
  });
});

// Route for user login
app.post('/login', passport.authenticate('local', { session: false }), (req, res) => {
  const token = jwt.sign({ username: req.user.username }, 'your-secret-key', { expiresIn: '1h' });
  res.json({ token });
});

// OAuth2 endpoints
app.get('/auth', passport.authenticate('oauth2'));

app.get('/auth/callback', 
  passport.authenticate('oauth2', { failureRedirect: '/' }),
  (req, res) => {
    res.json({ message: 'Successfully authenticated', user: req.user });
  }
);

app.post('/oauth2/authorize', (req, res) => {
  // Here you would normally prompt the user for authorization
  res.json({ authorization_code: 'dummy-auth-code' });
});

app.post('/oauth2/token', (req, res) => {
  // Validate authorization code and issue access token
  const token = jwt.sign({ id: 'user-id' }, 'your-secret-key', { expiresIn: '1h' });
  res.json({ access_token: token, token_type: 'bearer' });
});

// Serve the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Generate config.js on server start
const generateConfig = () => {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  const scriptContent = `
<script>
  window.CLIENT_ID = '${clientId}';
  window.CLIENT_SECRET = '${clientSecret}';
</script>
`;

  fs.writeFileSync(path.join(__dirname, 'public', 'config.js'), scriptContent);
  console.log('config.js generated successfully.');
};

generateConfig();

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
