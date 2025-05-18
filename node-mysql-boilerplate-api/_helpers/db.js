const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config.json');

// Use DATABASE_URL env var or fallback to config file connection string
const dbUrl = process.env.DATABASE_URL || config.connectionString;
console.log('Database URL:', dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'undefined');

if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        },
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Initialize models with proper PascalCase names and DataTypes
db.Account = require('../accounts/account.model')(sequelize, DataTypes);
db.RefreshToken = require('../accounts/refresh-token.model')(sequelize, DataTypes);
db.Employee = require('../employees/employee.model')(sequelize, DataTypes);
db.Department = require('../departments/department.model')(sequelize, DataTypes);
db.Request = require('../requests/request.model')(sequelize, DataTypes);
db.RequestItem = require('../requests/request-item.model')(sequelize, DataTypes);
db.Workflow = require('../workflows/workflow.model')(sequelize, DataTypes);

// Define relationships
db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
db.RefreshToken.belongsTo(db.Account);

db.Account.hasOne(db.Employee, { onDelete: 'CASCADE' });
db.Employee.belongsTo(db.Account);

db.Department.hasMany(db.Employee);
db.Employee.belongsTo(db.Department);

db.Employee.hasMany(db.Request);
db.Request.belongsTo(db.Employee);

db.Request.hasMany(db.RequestItem, { onDelete: 'CASCADE' });
db.RequestItem.belongsTo(db.Request);

db.Account.hasMany(db.Request, { as: 'Approver', foreignKey: 'approverId' });
db.Request.belongsTo(db.Account, { as: 'Approver', foreignKey: 'approverId' });

db.Request.hasMany(db.Workflow, { onDelete: 'CASCADE' });
db.Workflow.belongsTo(db.Request);

// Test DB connection
sequelize.authenticate()
  .then(() => console.log('Database connection established.'))
  .catch(err => {
    console.error('Unable to connect to the database:', err);
    process.exit(1); // Exit if no DB connection
  });

// Sync DB only in development to prevent accidental schema changes in production
if (process.env.NODE_ENV === 'development') {
  sequelize.sync({ alter: true })
    .then(() => console.log('Database synced successfully'))
    .catch(err => console.error('Error syncing database:', err));
}

module.exports = db;
