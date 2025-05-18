require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const db = require('./config/db'); // Your Sequelize DB config

const app = express();
const PORT = process.env.PORT || 4000;

// Rate limiter config
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000,
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS whitelist and options
const allowedOrigins = [
  'http://localhost:4200',
  'https://user-management-system-final-1s71.onrender.com',
  'https://user-management-system-backend-x52j.onrender.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow REST tools or server-to-server requests without origin
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Middleware to parse body and cookies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// JWT authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expect Bearer TOKEN

  if (!token) return res.status(401).json({ message: 'Access token missing' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Request logging
app.use((req, res, next) => {
  const info = { method: req.method, path: req.path, ip: req.ip };
  if (['POST', 'PUT'].includes(req.method)) info.body = req.body;
  console.log('API Request:', JSON.stringify(info, null, 2));
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import routes
const authRoutes = require('./routes/auth.routes'); // login, register, etc
const accountRoutesModule = require('./routes/account.routes'); // exports router and refreshTokenHandler

// Public routes (no auth)
app.use('/auth', authRoutes);

// Refresh token route should be public (no JWT required)
app.post('/accounts/refresh-token', accountRoutesModule.refreshTokenHandler);

// Protect all other /accounts routes with JWT
app.use('/accounts', authenticateToken, accountRoutesModule.router);

// Other API routes (example)
app.use('/departments', require('./departments/index'));
app.use('/employees', require('./employees/index'));
app.use('/workflows', require('./workflows/index'));
app.use('/requests', require('./requests/index'));
app.use('/api-docs', require('./_helpers/swagger'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error caught:', err);
  if (err.stack) console.error(err.stack);

  if (err.name?.includes('Sequelize')) {
    const devMsg = process.env.NODE_ENV === 'development'
      ? `SQL: ${err.sql || 'N/A'}, Message: ${err.message}` 
      : undefined;
    return res.status(400).json({ message: 'Database operation failed', error: devMsg });
  }

  if (typeof err === 'string') {
    const status = err.toLowerCase().endsWith('not found') ? 404 : 400;
    return res.status(status).json({ message: err });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ message: err.errors.map(e => e.message).join(', ') });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ message: 'A record with this name already exists' });
  }

  if (err.name === 'RateLimitExceeded') {
    return res.status(429).json({
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil(err.resetTime / 1000)
    });
  }

  return res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server after syncing database
db.sequelize.sync().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`Listening on port ${PORT}`);
    console.log('CORS allowed origins:', allowedOrigins);
  });
});
