require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./config/db'); // Adjust path if needed
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());

// Simple JWT middleware to protect routes
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // Add user payload to req object
    next();
  });
}

// Public route - Test API is running
app.get('/', (req, res) => {
  res.json({ message: 'API is running!' });
});

// Import routes
const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/account.routes');

// Use routes
app.use('/auth', authRoutes);
app.use('/accounts', authenticateToken, accountRoutes); // Protect accounts with JWT

// Start server
db.sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
});
