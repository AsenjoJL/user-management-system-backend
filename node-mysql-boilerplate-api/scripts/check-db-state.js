const config = require('../config.json');
const mysql = require('mysql2/promise');

async function checkDatabaseState() {
    try {
        const { host, port, user, password, database } = config.database;
        console.log(`Connecting to database: ${database} on ${host}:${port}`);
        
        // Connect to the database
        const connection = await mysql.createConnection({
            host,
            port,
            user, 
            password,
            database
        });
        
        console.log('Connected to database');
        
        // Check tables
        console.log('Checking tables...');
        const [tables] = await connection.query('SHOW TABLES');
        console.log('Tables in database:');
        console.table(tables.map(t => Object.values(t)[0]));
        
        // Check employees table structure
        try {
            console.log('Checking employees table structure...');
            const [columns] = await connection.query('DESCRIBE employees');
            console.log('Employees table structure:');
            console.table(columns);
            
            // Check departmentId column specifically
            const departmentIdColumn = columns.find(c => c.Field === 'departmentId');
            if (departmentIdColumn) {
                console.log('departmentId column:', departmentIdColumn);
                
                if (departmentIdColumn.Null === 'YES') {
                    console.log('✅ departmentId is correctly set to allow NULL values');
                } else {
                    console.log('❌ departmentId does NOT allow NULL values - this will cause errors');
                }
            } else {
                console.log('❌ departmentId column not found!');
            }
        } catch (err) {
            console.error('Error checking employees table:', err.message);
        }
        
        // Check foreign keys
        try {
            console.log('Checking foreign keys...');
            const [fks] = await connection.query(`
                SELECT 
                    TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, 
                    REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME,
                    DELETE_RULE, UPDATE_RULE
                FROM 
                    information_schema.KEY_COLUMN_USAGE
                JOIN 
                    information_schema.REFERENTIAL_CONSTRAINTS USING (CONSTRAINT_NAME)
                WHERE 
                    TABLE_SCHEMA = ? 
                    AND REFERENCED_TABLE_NAME IS NOT NULL
            `, [database]);
            
            console.log('Foreign keys in database:');
            console.table(fks);
            
            // Check departmentId foreign key specifically
            const departmentFK = fks.find(fk => 
                fk.TABLE_NAME === 'employees' && 
                fk.COLUMN_NAME === 'departmentId'
            );
            
            if (departmentFK) {
                console.log('✅ departmentId foreign key exists:', departmentFK);
                
                if (departmentFK.DELETE_RULE === 'SET NULL') {
                    console.log('✅ ON DELETE SET NULL is correctly configured');
                } else {
                    console.log(`❌ DELETE_RULE is ${departmentFK.DELETE_RULE} instead of SET NULL`);
                }
            } else {
                console.log('❌ departmentId foreign key not found!');
            }
        } catch (err) {
            console.error('Error checking foreign keys:', err.message);
        }
        
        console.log('Database check completed');
        await connection.end();
    } catch (err) {
        console.error('Database check failed:', err);
    }
}

checkDatabaseState();
