const fs = require('fs');
console.log('Current directory:', __dirname);
console.log('Directory contents:', fs.readdirSync(__dirname));
console.log('Trying to start server from:', path.join(__dirname, 'server.js'));




require('rootpath')();
const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const errorHandler = require('./_middleware/error-handler');

app.use(cors({
  origin: ['https://your-frontend.onrender.com', 'http://localhost:4200'],
  credentials: true
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// Debugging middleware
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

app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log(`[${req.method}] ${req.url} - Request body:`, JSON.stringify(req.body));
    }
    next();
});

// API Routes
app.use('/accounts', require('./accounts/account.controller'));
app.use('/departments', require('./departments/index'));
app.use('/employees', require('./employees/index'));
app.use('/workflows', require('./workflows/index'));
app.use('/requests', require('./requests/index'));

// Swagger docs
app.use('/api-docs', require('./_helpers/swagger'));

// Error Handler
app.use((err, req, res, next) => {
    console.error('Global error handler caught:', err);

    if (err.stack) {
        console.error('Error stack:', err.stack);
    }

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
        default:
            console.error('Unhandled error:', err);
            return res.status(500).json({ 
                message: 'Internal Server Error',
                error: process.env.NODE_ENV === 'development' ? (err.message || err) : undefined
            });
    }
});


// ===============================================
// 🔽 Serve Angular Frontend 🔽
// ===============================================
app.use(express.static(path.join(__dirname, 'public')));

// Handle all other routes by sending Angular's index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ===============================================

// Start server
const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 80) : 4000;
app.listen(port, () => console.log('Server listening on port ' + port));
