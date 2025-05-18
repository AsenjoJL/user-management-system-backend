require('rootpath')();
const fs = require('fs');
const express = require('express');
const path = require('path');
const { Sequelize } = require('sequelize');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// Log environment info
console.log('📂 Current directory:', __dirname);
console.log('📁 Directory contents:', fs.readdirSync(__dirname));

const app = express();

// PostgreSQL Connection
const sequelize = new Sequelize(process.env.DB_CONNECTION_STRING, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false,
    } : false,
  },
});

// Initialize Database
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established');
    await sequelize.sync({ alter: true });
    console.log('✅ All models synchronized with database');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:4200',
  ],
  credentials: true,
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

// Swagger documentation
app.use('/api-docs', require('./_helpers/swagger'));

// Static frontend (if building Angular into backend later)
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

// Start server
const port = process.env.PORT || 3000;
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`
🚀 Server running on port ${port}
🌱 Environment: ${process.env.NODE_ENV}
🔗 Frontend URL: ${process.env.FRONTEND_URL}
📦 Connected DB: ${sequelize.config.database || 'N/A'}
    `);
  });
});
