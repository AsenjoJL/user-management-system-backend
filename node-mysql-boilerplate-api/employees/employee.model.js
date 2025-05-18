const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        // Add employeeId as a unique identifier
        employeeId: { 
            type: DataTypes.STRING, 
            allowNull: false,
            unique: true
        },
        // Add userId for account relationship
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true // One account can only be linked to one employee
        },
        position: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },
        departmentId: { 
            type: DataTypes.INTEGER,
            allowNull: true, // CRITICAL: Must be true because of ON DELETE SET NULL
            field: 'departmentId'
        },
        hireDate: { 
            type: DataTypes.DATEONLY, 
            allowNull: false 
        },
        status: { 
            type: DataTypes.STRING, 
            allowNull: false,
            defaultValue: 'Active'
        },
        created: { 
            type: DataTypes.DATE, 
            allowNull: false, 
            defaultValue: DataTypes.NOW 
        },
        updated: { 
            type: DataTypes.DATE 
        }
    };

    const options = {
        timestamps: false,
        tableName: 'employees',
        freezeTableName: true
    };

    return sequelize.define('Employee', attributes, options);
}
