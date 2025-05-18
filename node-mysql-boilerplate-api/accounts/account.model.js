const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Account extends Model {
        static associate(models) {
            // define associations here
        }
    }

    Account.init({
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        passwordHash: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'User'
        },
        verificationToken: {
            type: DataTypes.STRING
        },
        verified: {
            type: DataTypes.DATE
        },
        resetToken: {
            type: DataTypes.STRING
        },
        resetTokenExpires: {
            type: DataTypes.DATE
        },
        passwordReset: {
            type: DataTypes.DATE
        },
        isVerified: {
            type: DataTypes.VIRTUAL,
            get() {
                return !!(this.verified || this.passwordReset);
            }
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        created: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updated: {
            type: DataTypes.DATE
        }
    }, {
        sequelize,
        modelName: 'Account',
        tableName: 'accounts',
        timestamps: true,
        createdAt: 'created',
        updatedAt: 'updated',
        defaultScope: {
            // exclude password hash by default
            attributes: { exclude: ['passwordHash'] }
        },
        scopes: {
            // include password hash with this scope
            withHash: {
                attributes: { include: ['passwordHash'] }
            }
        }
    });

    return Account;
};