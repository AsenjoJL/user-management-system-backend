require('dotenv').config();
require('rootpath')();

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const errorHandler = require('./_middleware/error-handler');
const rateLimit = require('express-rate-limit');

// Increase rate limit and window
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // limit each IP to 1000 requests per windowMs
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

// Apply rate limiting to all routes
app.use(limiter);

// CORS configuration
const allowedOrigins = [
    'http://localhost:4200',
    'https://user-management-system-final-1s71.onrender.com'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
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

// Add debugging middleware before routes
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

// Add logging middleware to show request bodies
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log(`[${req.method}] ${req.url} - Request body:`, JSON.stringify(req.body));
    }
    next();
});

// api routes
app.use('/accounts', require('./accounts/account.controller'));
app.use('/departments', require('./departments/index'));
app.use('/employees', require('./employees/index'));
app.use('/workflows', require('./workflows/index'));
app.use('/requests', require('./requests/index'));

// swagger docs route
app.use('/api-docs', require('./_helpers/swagger'));

// global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler caught:', err);
    
    if (err.stack) {
        console.error('Error stack:', err.stack);
    }
    
    // Add specific handling for Sequelize errors
    if (err.name?.includes('Sequelize')) {
        console.error('Sequelize error details:', {
            name: err.name,
            message: err.message,
            sql: err.sql,
            params: err.parameters
        });
        
        const devMessage = process.env.NODE_ENV === 'development' 
            ? `SQL: ${err.sql || 'N/A'}, Message: ${err.message}` 
            : undefined;
            
        return res.status(400).json({ 
            message: 'Database operation failed',
            error: devMessage
        });
    }
    
    switch (true) {
        case typeof err === 'string':
            const is404 = err.toLowerCase().endsWith('not found');
            const statusCode = is404 ? 404 : 400;
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
            console.error('Unhandled error:', err);
            return res.status(500).json({ 
                message: 'Internal Server Error',
                error: process.env.NODE_ENV === 'development' ? (err.message || err) : undefined
            });
    }
});

// start server
const port = process.env.PORT || 4000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`Server listening on port ${port}`);
    console.log('Allowed CORS origins:', allowedOrigins);
});