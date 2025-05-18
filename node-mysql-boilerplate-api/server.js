require('dotenv').config();
require('rootpath')();

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./_middleware/error-handler');

// Enable trust proxy for rate limiter when deployed behind a proxy (e.g., Railway, Render)
app.set('trust proxy', 1);

// Rate limiting
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

// CORS configuration
const allowedOrigins = [
    'http://localhost:4200',
    'https://user-management-system-frontend-x52j.onrender.com'
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug logging
app.use((req, res, next) => {
    const requestInfo = {
        method: req.method,
        path: req.path,
        ip: req.ip
    };
    if (req.method === 'POST' || req.method === 'PUT') {
        requestInfo.body = req.body;
    }
    console.log('API Request:', JSON.stringify(requestInfo, null, 2));
    next();
});

// Request body logging
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log(`[${req.method}] ${req.url} - Request body:`, JSON.stringify(req.body));
    }
    next();
});

// API routes
app.use('/accounts', require('./accounts/account.controller'));
app.use('/departments', require('./departments/index'));
app.use('/employees', require('./employees/index'));
app.use('/workflows', require('./workflows/index'));
app.use('/requests', require('./requests/index'));

// Swagger docs
app.use('/api-docs', require('./_helpers/swagger'));

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler caught:', err);
    if (err.stack) console.error('Error stack:', err.stack);

    if (err.name?.includes('Sequelize')) {
        return res.status(400).json({ 
            message: 'Database operation failed',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    switch (true) {
        case typeof err === 'string':
            const statusCode = err.toLowerCase().endsWith('not found') ? 404 : 400;
            return res.status(statusCode).json({ message: err });
        case err.name === 'UnauthorizedError':
            return res.status(401).json({ message: 'Unauthorized' });
        case err.name === 'SequelizeValidationError':
            return res.status(400).json({ message: err.errors.map(e => e.message).join(', ') });
        case err.name === 'SequelizeUniqueConstraintError':
            return res.status(400).json({ message: 'A record with this name already exists' });
        case err.name === 'RateLimitExceeded':
            return res.status(429).json({ 
                message: 'Too many requests, please try again later',
                retryAfter: Math.ceil(err.resetTime / 1000)
            });
        default:
            return res.status(500).json({ 
                message: 'Internal Server Error',
                error: process.env.NODE_ENV === 'development' ? (err.message || err) : undefined
            });
    }
});

// Start server
const port = process.env.PORT || 4000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
    console.log('Allowed CORS origins:', allowedOrigins);
});
