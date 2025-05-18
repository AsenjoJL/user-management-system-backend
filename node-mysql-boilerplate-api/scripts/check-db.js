const config = require('../config.json');
const mysql = require('mysql2/promise');
const { Sequelize, QueryTypes } = require('sequelize');

async function checkDatabase() {
    try {
        const { host, port, user, password, database } = config.database;
        console.log(`Connecting to MySQL at ${host}:${port}`);
        
        // Connect to MySQL
        const connection = await mysql.createConnection({ host, port, user, password });
        console.log('Connected to MySQL server');
        
        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
        console.log(`Database ${database} exists or was created`);
        
        // Connect to the specific database
        const sequelize = new Sequelize(database, user, password, { 
            host, 
            port, 
            dialect: 'mysql',
            logging: false
        });
        
        await sequelize.authenticate();
        console.log('Database connection authenticated successfully');
        
        // Check which tables exist
        const [tables] = await sequelize.query('SHOW TABLES');
        console.log('Tables in database:');
        console.table(tables.map(t => ({ tableName: Object.values(t)[0] })));
        
        // Check employees table structure
        try {
            const [columns] = await sequelize.query('DESCRIBE employees');
            console.log('Employees table structure:');
            console.table(columns);
            
            // Check if table has any data
            const employees = await sequelize.query('SELECT * FROM employees', { type: QueryTypes.SELECT });
            console.log(`Found ${employees.length} employees in database`);
        } catch (error) {
            console.error('Error checking employees table:', error.message);
        }
        
        // Close connection
        await sequelize.close();
        await connection.end();
        console.log('Database check complete');
    } catch (error) {
        console.error('Database check failed:', error);
    }
}

// Run the check
checkDatabase();
