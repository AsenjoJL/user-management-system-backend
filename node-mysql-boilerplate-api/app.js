const express = require('express');
const cors = require('cors');
const db = require('./_helpers/db');

const app = express();

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.CORS_ORIGIN]
        : ['http://localhost:4200'],
    credentials: true
}));

// Health check endpoint for Render
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        await db.sequelize.authenticate();
        
        // Get basic system info
        const healthInfo = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                status: 'connected',
                dialect: db.sequelize.getDialect()
            },
            environment: process.env.NODE_ENV || 'development'
        };

        res.status(200).json(healthInfo);
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message,
            database: {
                status: 'disconnected'
            }
        });
    }
});

// ... rest of the existing code ... 