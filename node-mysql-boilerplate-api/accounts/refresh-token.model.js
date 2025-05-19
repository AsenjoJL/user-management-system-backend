const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        token: { type: DataTypes.STRING, allowNull: false },
        expires: { type: DataTypes.DATE, allowNull: false },
        created: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        createdByIp: { type: DataTypes.STRING, allowNull: false },
        revoked: { type: DataTypes.DATE },
        revokedByIp: { type: DataTypes.STRING },
        replacedByToken: { type: DataTypes.STRING },
        isExpired: {
            type: DataTypes.VIRTUAL,
            get() {
                return Date.now() >= new Date(this.expires).getTime();
            }
        },
        isActive: {
            type: DataTypes.VIRTUAL,
            get() {
                return !this.revoked && !this.isExpired;
            }
        }
    };

    const options = {
        timestamps: false,
        defaultScope: {
            attributes: { exclude: ['createdByIp', 'revokedByIp', 'replacedByToken'] }
        }
    };

    const RefreshToken = sequelize.define('refreshToken', attributes, options);

    // Make sure RefreshToken is associated with the User model (usually via foreign key)
    RefreshToken.associate = function(models) {
        RefreshToken.belongsTo(models.Account, {
            foreignKey: 'accountId',
            onDelete: 'CASCADE'
        });
    };

    return RefreshToken;
}
