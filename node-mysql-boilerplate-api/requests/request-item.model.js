const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        requestId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true
        }
        // Removed createdDate as it's not in the database
    };

    const options = {
        timestamps: false,
        tableName: 'request_items',
        freezeTableName: true
    };

    return sequelize.define('RequestItem', attributes, options);
}
