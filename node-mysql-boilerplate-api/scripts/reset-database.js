const config = require('../config.json');
const mysql = require('mysql2/promise');

async function resetDatabase() {
    try {
        const { host, port, user, password, database } = config.database;
        console.log(`Connecting to MySQL at ${host}:${port}`);
        
        // Connect without database selected
        const connection = await mysql.createConnection({
            host,
            port,
            user,
            password
        });
        
        console.log(`Connected to MySQL. Dropping database ${database} if exists...`);
        await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
        console.log(`Database ${database} dropped successfully.`);
        
        console.log(`Creating new database ${database}...`);
        await connection.query(`CREATE DATABASE \`${database}\``);
        console.log(`Database ${database} created successfully.`);
        
        console.log('Database reset complete. Please restart your application.');
        
        // Close the connection
        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('Error resetting database:', error);
        process.exit(1);
    }
}

// Run the reset
resetDatabase();
