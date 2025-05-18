const config = require('../config.json');
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

async function checkDepartmentsTable() {
    try {
        console.log('Running departments diagnostics...');
        
        // Create connection
        const { host, port, user, password, database } = config.database;
        console.log(`Connecting to MySQL at ${host}:${port} with user ${user}`);
        
        const connection = await mysql.createConnection({ 
            host, port, user, password
        });
        
        // Check if database exists
        console.log(`Checking if database '${database}' exists...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
        await connection.query(`USE \`${database}\`;`);
        
        // Check if Departments table exists
        console.log('Checking if Departments table exists...');
        const [tables] = await connection.query('SHOW TABLES');
        console.log('Tables in database:', tables.map(t => Object.values(t)[0]));
        
        // Check Departments table schema
        try {
            const [columns] = await connection.query('DESCRIBE Departments');
            console.log('Departments table structure:', columns);
        } catch (error) {
            console.error('Error describing Departments table:', error.message);
            
            // Try with different case
            try {
                const [columns] = await connection.query('DESCRIBE departments');
                console.log('departments table structure (lowercase):', columns);
            } catch (lowerError) {
                console.error('Error describing departments table (lowercase):', lowerError.message);
            }
        }
        
        // Try creating a test department directly with SQL
        console.log('Attempting to create a test department with raw SQL...');
        try {
            const testDeptName = `Test Department ${Date.now()}`;
            await connection.query(
                'INSERT INTO Departments (name, description, created) VALUES (?, ?, ?)',
                [testDeptName, 'Test description', new Date()]
            );
            console.log('Raw SQL insert successful');
            
            // Check if it was inserted
            const [rows] = await connection.query('SELECT * FROM Departments WHERE name = ?', [testDeptName]);
            console.log('Test department:', rows);
        } catch (insertError) {
            console.error('SQL insert error:', insertError.message);
            
            // Try with lowercase table name
            try {
                const testDeptName = `Test Department ${Date.now()}`;
                await connection.query(
                    'INSERT INTO departments (name, description, created) VALUES (?, ?, ?)',
                    [testDeptName, 'Test description', new Date()]
                );
                console.log('Raw SQL insert successful (lowercase table)');
                
                // Check if it was inserted
                const [rows] = await connection.query('SELECT * FROM departments WHERE name = ?', [testDeptName]);
                console.log('Test department (lowercase table):', rows);
            } catch (lowerInsertError) {
                console.error('SQL insert error (lowercase table):', lowerInsertError.message);
            }
        }
        
        // Close connection
        await connection.end();
        console.log('Diagnostics completed');
    } catch (error) {
        console.error('Database diagnostics failed:', error);
    }
}

// Run the check
checkDepartmentsTable();
