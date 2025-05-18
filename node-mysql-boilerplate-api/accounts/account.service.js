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

// Update account active status
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

// Authenticate user and generate tokens
async function authenticate({ email, password, ipAddress }) {
  const account = await db.accounts.scope('withHash').findOne({ where: { email } });
  if (
    !account ||
    !account.isVerified ||
    !bcrypt.compareSync(password, account.passwordHash)
  ) {
    throw 'Email or password is incorrect';
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

// Refresh JWT token using refresh token
async function refreshToken({ token, ipAddress }) {
  const refreshToken = await getRefreshToken(token);
  const { account } = refreshToken;

  // Revoke old refresh token and issue new one
  const newRefreshToken = generateRefreshToken(account, ipAddress);
  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;
  refreshToken.replacedByToken = newRefreshToken.token;

  await refreshToken.save();
  await newRefreshToken.save();

  const jwtToken = generateJwtToken(account);
  return {
    ...basicDetails(account),
    jwtToken,
    refreshToken: newRefreshToken.token,
  };
}

// Revoke refresh token (logout)
async function revokeToken({ token, ipAddress }) {
  const refreshToken = await getRefreshToken(token);
  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;
  await refreshToken.save();
}

// Register new account and send verification email
async function register(params, origin) {
  const existingAccount = await db.accounts.findOne({ where: { email: params.email } });
  if (existingAccount) {
    return await sendAlreadyRegisteredEmail(params.email, origin);
  }

  const account = new db.accounts(params);
  const isFirstAccount = (await db.accounts.count()) === 0;
  account.role = isFirstAccount ? Role.Admin : Role.User;
  account.verificationToken = randomTokenString();
  account.passwordHash = hash(params.password);
  await account.save();

  try {
    await sendVerificationEmail(account, origin);
  } catch (err) {
    console.error('Email error:', err);
  }

  return basicDetails(account);
}

// Verify email via token
async function verifyEmail({ token }) {
  const account = await db.accounts.findOne({ where: { verificationToken: token } });
  if (!account) throw 'Verification failed';

  account.verified = Date.now();
  account.verificationToken = null;
  await account.save();
}

// Initiate forgot password process
async function forgotPassword({ email }, origin) {
  const account = await db.accounts.findOne({ where: { email } });
  if (!account) return;

  account.resetToken = randomTokenString();
  account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day expiry
  await account.save();

  await sendPasswordResetEmail(account, origin);
}

// Validate password reset token
async function validateResetToken({ token }) {
  const account = await db.accounts.findOne({
    where: {
      resetToken: token,
      resetTokenExpires: { [Op.gt]: Date.now() },
    },
  });
  if (!account) throw 'Invalid token';
  return account;
}

// Reset password with valid token
async function resetPassword({ token, password }) {
  const account = await validateResetToken({ token });
  account.passwordHash = hash(password);
  account.passwordReset = Date.now();
  account.resetToken = null;
  account.resetTokenExpires = null;
  await account.save();
}

// Get all accounts (admin)
async function getAll() {
  const accounts = await db.accounts.findAll();
  return accounts.map(x => basicDetails(x));
}

// Get account by ID
async function getById(id) {
  const account = await getAccount(id);
  return basicDetails(account);
}

// Create new account (admin)
async function create(params) {
  if (await db.accounts.findOne({ where: { email: params.email } })) {
    throw 'Email "' + params.email + '" is already registered';
  }
  const account = new db.accounts(params);
  account.verified = Date.now();
  account.passwordHash = hash(params.password);
  await account.save();
  return basicDetails(account);
}

// Update account details
async function update(id, params) {
  const account = await getAccount(id);

  if (
    params.email &&
    account.email !== params.email &&
    (await db.accounts.findOne({ where: { email: params.email } }))
  ) {
    throw 'Email "' + params.email + '" is already registered';
  }

  if (params.password) {
    params.passwordHash = hash(params.password);
  }

  Object.assign(account, params);
  account.updated = Date.now();
  await account.save();

  return basicDetails(account);
}

// Delete account
async function _delete(id) {
  const account = await getAccount(id);
  await account.destroy();
}

// Helper: Get account by ID or throw
async function getAccount(id) {
  const account = await db.accounts.findByPk(id);
  if (!account) throw 'Account not found';
  return account;
}

// Helper: Get refresh token record or throw
async function getRefreshToken(token) {
  if (!token) throw 'Invalid token';
  const refreshToken = await db.refreshTokens.findOne({ where: { token } });
  if (!refreshToken || !refreshToken.isActive) throw 'Invalid token';
  return refreshToken;
}

// Helper: Hash password
function hash(password) {
  return bcrypt.hashSync(password, 10);
}

// Helper: Generate JWT token (expires in 15m)
function generateJwtToken(account) {
  return jwt.sign({ sub: account.id, id: account.id }, config.secret, { expiresIn: '15m' });
}

// Helper: Generate new refresh token (7 days expiry)
function generateRefreshToken(account, ipAddress) {
  return new db.refreshTokens({
    accountId: account.id,
    token: randomTokenString(),
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdByIp: ipAddress,
  });
}

// Helper: Generate random token string
function randomTokenString() {
  return crypto.randomBytes(40).toString('hex');
}

// Helper: Pick basic account details to return
function basicDetails(account) {
  const {
    id,
    title,
    firstName,
    lastName,
    email,
    role,
    created,
    updated,
    isVerified,
    isActive,
  } = account;
  return { id, title, firstName, lastName, email, role, created, updated, isVerified, isActive };
}

// Send verification email
async function sendVerificationEmail(account, origin) {
  let message;
  if (origin) {
    const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;
    message = `<p>Please click the below link to verify your email address:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
  } else {
    message = `<p>Please use the below token to verify your email address with the <code>/account/verify-email</code> api route:</p><p><code>${account.verificationToken}</code></p>`;
  }
  await sendEmail({
    to: account.email,
    subject: 'Sign-up Verification API - Verify Email',
    html: `<h4>Verify Email</h4><p>Thanks for registering!</p>${message}`,
  });
}

// Send email if already registered
async function sendAlreadyRegisteredEmail(email, origin) {
  let message;
  if (origin) {
    message = `<p>If you don't know your password please visit the <a href="${origin}/account/forgot-password">forgot password</a> page.</p>`;
  } else {
    message = `<p>If you don't know your password you can reset it via the <code>/account/forgot-password</code> api route.</p>`;
  }
  await sendEmail({
    to: email,
    subject: 'Sign-up Verification API - Email Already Registered',
    html: `<h4>Email Already Registered</h4><p>Your email <strong>${email}</strong> is already registered.</p>${message}`,
  });
}

// Send password reset email
async function sendPasswordResetEmail(account, origin) {
  let message;
  if (origin) {
    const resetUrl = `${origin}/account/reset-password?token=${account.resetToken}`;
    message = `<p>Please click the below link to reset your password, the link will be valid for 1 day:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`;
  } else {
    message = `<p>Please use the below token to reset your password with the <code>/account/reset-password</code> api route:</p><p><code>${account.resetToken}</code></p>`;
  }
  await sendEmail({
    to: account.email,
    subject: 'Sign-up Verification API - Reset Password',
    html: `<h4>Reset Password Email</h4>${message}`,
  });
}
