const DataTypes = require("sequelize");

module.exports = model;

function model(sequelize) {
  const attributes = {
<<<<<<< HEAD
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
=======
    email: { type: DataTypes.STRING, allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    acceptTerms: { type: DataTypes.BOOLEAN },
>>>>>>> 93c970d9f64a2aa1ab841bd67b13c4c0417f867c
    role: { type: DataTypes.STRING, allowNull: false },
    verificationToken: { type: DataTypes.STRING },
    verified: { type: DataTypes.DATE },
    resetToken: { type: DataTypes.STRING },
    resetTokenExpires: { type: DataTypes.DATE },
<<<<<<< HEAD
=======
    passwordReset: { type: DataTypes.DATE },
>>>>>>> 93c970d9f64a2aa1ab841bd67b13c4c0417f867c
    created: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated: { type: DataTypes.DATE },
    isVerified: {
      type: DataTypes.VIRTUAL,
      get() {
<<<<<<< HEAD
        return !!this.verified;
=======
        return !!(this.verified || this.passwordReset);
>>>>>>> 93c970d9f64a2aa1ab841bd67b13c4c0417f867c
      },
    },
  };

  const options = {
<<<<<<< HEAD
    timestamps: false,
    defaultScope: {
      attributes: { exclude: ["passwordHash"] },
    },
    scopes: {
=======
    // disable default timestamp fields (createdAt and updatedAt)
    timestamps: false,
    defaultScope: {
      // exclude password hash by default
      attributes: { exclude: ["passwordHash"] },
    },
    scopes: {
      // include hash with this scope
>>>>>>> 93c970d9f64a2aa1ab841bd67b13c4c0417f867c
      withHash: { attributes: {} },
    },
  };

  return sequelize.define("account", attributes, options);
}
