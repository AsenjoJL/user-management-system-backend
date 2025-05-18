require('rootpath')();
const fs = require('fs');
const express = require('express');
const path = require('path');
const { Sequelize } = require('sequelize');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// Debugging
console.log('Current directory:', __dirname);
console.log('Directory contents:', fs.readdirSync(__dirname));

const app = express();

// PostgreSQL Connection
const sequelize = new Sequelize(process.env.DB_CONNECTION_STRING, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

// Database Sync (Auto-creates tables)
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connection established');
    
    // Sync models with database
    await sequelize.sync({ alter: true }); // Safe schema updates
    console.log('All models synchronized');
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1); // Exit if DB connection fails
  }
}

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL, 
    'http://localhost:4200'
  ],
  credentials: true
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// Routes
app.use('/accounts', require('./accounts/account.controller'));
app.use('/departments', require('./departments/index'));
app.use('/employees', require('./employees/index'));
app.use('/workflows', require('./workflows/index'));
app.use('/requests', require('./requests/index'));

// Swagger docs
app.use('/api-docs', require('./_helpers/swagger'));

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error' 
  });
});

// Start server
const port = process.env.PORT || 3000;
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`
      Server running on port ${port}
      Environment: ${process.env.NODE_ENV}
      Database: ${sequelize.config.database}
      Frontend URL: ${process.env.FRONTEND_URL}
    `);
  });
});