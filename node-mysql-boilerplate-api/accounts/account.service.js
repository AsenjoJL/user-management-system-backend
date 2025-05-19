const config = require('../config.json');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const sendEmail = require('../_helpers/send-email');
const db = require('../_helpers/db');
const Role = require('../_helpers/role');

module.exports = {
  authenticate,
  refreshToken,
  revokeToken,
  register,
  verifyEmail,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getAll,
  getById,
  create,
  update,
  delete: _delete,
  updateStatus
};

async function updateStatus(id, isActive) {
  const account = await getAccount(id);
  if (account.role === Role.Admin) {
    throw 'Cannot change status of administrator accounts';
  }
  account.isActive = isActive;
  account.updated = new Date();
  await account.save();
  return basicDetails(account);
}

async function authenticate({ email, password, ipAddress }) {
  const account = await db.accounts.scope('withHash').findOne({ where: { email } });
  
  if (!account || !bcrypt.compareSync(password, account.passwordHash)) {
    throw 'Email or password is incorrect';
  }

  if (!account.isVerified) {
    throw 'Account not verified. Please check your email for verification instructions.';
  }

  if (account.role !== Role.Admin && !account.isActive) {
    throw 'Your account has been deactivated. Please contact an administrator.';
  }

  const jwtToken = generateJwtToken(account);
  const refreshToken = generateRefreshToken(account, ipAddress);
  await refreshToken.save();

  return {
    ...basicDetails(account),
    jwtToken,
    refreshToken: refreshToken.token,
  };
}

async function refreshToken({ token, ipAddress }) {
  if (!token) throw 'Refresh token is required';

  const refreshTokenRecord = await db.refreshTokens.findOne({ 
    where: { token },
    include: [{ model: db.accounts }]
  });

  if (!refreshTokenRecord || !refreshTokenRecord.isActive) {
    throw 'Invalid refresh token';
  }

  const { account } = refreshTokenRecord;

  // Revoke current refresh token
  refreshTokenRecord.revoked = new Date();
  refreshTokenRecord.revokedByIp = ipAddress;

  // Generate new refresh token
  const newRefreshToken = generateRefreshToken(account, ipAddress);
  refreshTokenRecord.replacedByToken = newRefreshToken.token;

  await Promise.all([refreshTokenRecord.save(), newRefreshToken.save()]);

  // Generate new JWT token
  const jwtToken = generateJwtToken(account);

  return {
    ...basicDetails(account),
    jwtToken,
    refreshToken: newRefreshToken.token,
  };
}

async function revokeToken({ token, ipAddress }) {
  const refreshToken = await getRefreshToken(token);
  refreshToken.revoked = new Date();
  refreshToken.revokedByIp = ipAddress;
  await refreshToken.save();
}

async function register(params, origin) {
  // Check if email already exists
  const existingAccount = await db.accounts.findOne({ where: { email: params.email } });
  if (existingAccount) {
    if (existingAccount.isVerified) {
      throw 'Email is already registered';
    }
    // Remove unverified account with same email
    await existingAccount.destroy();
  }

  // Create new account
  const account = new db.accounts(params);
  account.role = (await db.accounts.count()) === 0 ? Role.Admin : Role.User;
  account.verificationToken = randomTokenString();
  account.passwordHash = hash(params.password);
  await account.save();

  // Send verification email
  await sendVerificationEmail(account, origin);

  return basicDetails(account);
}

async function verifyEmail({ token }) {
  const account = await db.accounts.findOne({ where: { verificationToken: token } });
  if (!account) throw 'Verification failed';

  account.verified = new Date();
  account.verificationToken = null;
  await account.save();
}

async function forgotPassword({ email }, origin) {
  const account = await db.accounts.findOne({ where: { email } });
  if (!account) return;

  account.resetToken = randomTokenString();
  account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await account.save();

  await sendPasswordResetEmail(account, origin);
}

async function validateResetToken({ token }) {
  const account = await db.accounts.findOne({
    where: {
      resetToken: token,
      resetTokenExpires: { [Op.gt]: new Date() }
    }
  });
  if (!account) throw 'Invalid or expired token';
  return account;
}

async function resetPassword({ token, password }) {
  const account = await validateResetToken({ token });
  account.passwordHash = hash(password);
  account.passwordReset = new Date();
  account.resetToken = null;
  account.resetTokenExpires = null;
  await account.save();
}

async function getAll() {
  const accounts = await db.accounts.findAll();
  return accounts.map(x => basicDetails(x));
}

async function getById(id) {
  const account = await getAccount(id);
  return basicDetails(account);
}

async function create(params) {
  if (await db.accounts.findOne({ where: { email: params.email } })) {
    throw `Email "${params.email}" is already registered`;
  }
  const account = new db.accounts(params);
  account.verified = new Date();
  account.passwordHash = hash(params.password);
  await account.save();
  return basicDetails(account);
}

async function update(id, params) {
  const account = await getAccount(id);

  if (params.email && account.email !== params.email && 
      (await db.accounts.findOne({ where: { email: params.email } }))) {
    throw `Email "${params.email}" is already registered`;
  }

  if (params.password) {
    params.passwordHash = hash(params.password);
  }

  Object.assign(account, params);
  account.updated = new Date();
  await account.save();

  return basicDetails(account);
}

async function _delete(id) {
  const account = await getAccount(id);
  await account.destroy();
}

// Helper functions
async function getAccount(id) {
  const account = await db.accounts.findByPk(id);
  if (!account) throw 'Account not found';
  return account;
}

async function getRefreshToken(token) {
  const refreshToken = await db.refreshTokens.findOne({ 
    where: { token },
    include: [{ model: db.accounts }]
  });
  if (!refreshToken || !refreshToken.isActive) throw 'Invalid token';
  return refreshToken;
}

function hash(password) {
  return bcrypt.hashSync(password, 10);
}

function generateJwtToken(account) {
  return jwt.sign(
    { 
      sub: account.id, 
      id: account.id,
      role: account.role 
    }, 
    config.secret, 
    { expiresIn: '15m' }
  );
}

function generateRefreshToken(account, ipAddress) {
  return new db.refreshTokens({
    accountId: account.id,
    token: randomTokenString(),
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdByIp: ipAddress,
  });
}

function randomTokenString() {
  return crypto.randomBytes(40).toString('hex');
}

function basicDetails(account) {
  const { id, title, firstName, lastName, email, role, created, updated, isVerified, isActive } = account;
  return { id, title, firstName, lastName, email, role, created, updated, isVerified, isActive };
}

async function sendVerificationEmail(account, origin) {
  const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;
  const message = `<p>Please click the below link to verify your email address:</p>
                 <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;

  await sendEmail({
    to: account.email,
    subject: 'Verify Your Email',
    html: `<h4>Verify Email</h4><p>Thanks for registering!</p>${message}`
  });
}

async function sendPasswordResetEmail(account, origin) {
  const resetUrl = `${origin}/account/reset-password?token=${account.resetToken}`;
  const message = `<p>Please click the below link to reset your password:</p>
                  <p><a href="${resetUrl}">${resetUrl}</a></p>`;

  await sendEmail({
    to: account.email,
    subject: 'Reset Password',
    html: `<h4>Reset Password</h4>${message}`
  });
}