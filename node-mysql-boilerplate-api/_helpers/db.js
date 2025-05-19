const { Sequelize } = require('sequelize');
const config = require('../config.json');

// Use DATABASE_URL env var or fallback to config file connection string
const dbUrl = process.env.DATABASE_URL || config.connectionString;
console.log('Database URL:', dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'undefined');
console.log('Database host:', config.database.host);
console.log('Database port:', config.database.port);
console.log('Database name:', config.database.database);

if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
            require: true,
            rejectUnauthorized: false,
        } : false,
    },
    logging: (msg) => console.log('Database query:', msg),
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Initialize models
db.accounts = require('../accounts/account.model')(sequelize, Sequelize);
db.refreshTokens = require('../accounts/refresh-token.model')(sequelize, Sequelize);
db.employees = require('../employees/employee.model')(sequelize, Sequelize);
db.departments = require('../departments/department.model')(sequelize, Sequelize);
db.requests = require('../requests/request.model')(sequelize, Sequelize);
db.requestItems = require('../requests/request-item.model')(sequelize, Sequelize);
db.workflows = require('../workflows/workflow.model')(sequelize, Sequelize);

// Define relationships
db.accounts.hasMany(db.refreshTokens, { onDelete: 'CASCADE' });
db.refreshTokens.belongsTo(db.accounts);

db.accounts.hasOne(db.employees, { onDelete: 'CASCADE' });
db.employees.belongsTo(db.accounts);

db.departments.hasMany(db.employees);
db.employees.belongsTo(db.departments);

db.employees.hasMany(db.requests);
db.requests.belongsTo(db.employees);

db.requests.hasMany(db.requestItems, { onDelete: 'CASCADE' });
db.requestItems.belongsTo(db.requests);

db.accounts.hasMany(db.requests, { as: 'Approver', foreignKey: 'approverId' });
db.requests.belongsTo(db.accounts, { as: 'Approver', foreignKey: 'approverId' });

db.requests.hasMany(db.workflows, { onDelete: 'CASCADE' });
db.workflows.belongsTo(db.requests);

async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        console.log('Syncing database models (force: true) to create tables...');
        await sequelize.sync({ force: true }); // Drops & recreates all tables — run only once!
        console.log('Database models synced successfully');

    } catch (err) {
        console.error('Database initialization error:', err);
        process.exit(1); // Exit if DB connection fails
    }
}

// Initialize the database
initializeDatabase();

module.exports = db;
