require('dotenv').config();
require('rootpath')();

const express = require('express');
const app = express();

// Trust proxy headers (needed for express-rate-limit behind a proxy)
app.set('trust proxy', 1);

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./_middleware/error-handler');

// Rate limiter
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000,
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});
app.use(limiter);

// CORS whitelist
const allowedOrigins = [
  'http://localhost:3000',
  'https://user-management-system-final-1s71.onrender.com',
  'https://user-management-system-backend-x52j.onrender.com'  // <-- Your Render front-end
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept','Origin']
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Request logging
app.use((req, res, next) => {
  const info = { method: req.method, path: req.path, ip: req.ip };
  if (['POST','PUT'].includes(req.method)) info.body = req.body;
  console.log('API Request:', JSON.stringify(info, null, 2));
  next();
});

// Routes
app.use('/accounts', require('./accounts/account.controller'));
app.use('/departments', require('./departments/index'));
app.use('/employees', require('./employees/index'));
app.use('/workflows', require('./workflows/index'));
app.use('/requests', require('./requests/index'));
app.use('/api-docs', require('./_helpers/swagger'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error caught:', err);
  if (err.stack) console.error(err.stack);

  // Sequelize errors
  if (err.name?.includes('Sequelize')) {
    const devMsg = process.env.NODE_ENV === 'development'
      ? `SQL: ${err.sql || 'N/A'}, Message: ${err.message}` 
      : undefined;
    return res.status(400).json({ message: 'Database operation failed', error: devMsg });
  }

  // Custom string errors
  if (typeof err === 'string') {
    const status = err.toLowerCase().endsWith('not found') ? 404 : 400;
    return res.status(status).json({ message: err });
  }

  // JWT auth errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ message: err.errors.map(e => e.message).join(', ') });
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ message: 'A record with this name already exists' });
  }

  // Rate limit errors
  if (err.name === 'RateLimitExceeded') {
    return res.status(429).json({
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil(err.resetTime / 1000)
    });
  }

  // Fallback
  return res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const port = process.env.PORT || 4000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Listening on port ${port}`);
  console.log('CORS allowed origins:', allowedOrigins);
});
