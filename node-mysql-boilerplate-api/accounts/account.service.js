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
    updateStatus // Add this new service method
};

// Add this function to your service
async function updateStatus(id, isActive) {
    const account = await getAccount(id);
    
    // Don't allow changing status of admin accounts
    if (account.role === Role.Admin) {
        throw 'Cannot change status of administrator accounts';
    }
    
    // Update account status
    account.isActive = isActive;
    account.updated = new Date();
    await account.save();

    return basicDetails(account);
}

// Modify the authenticate method to check if the account is active
async function authenticate({ email, password, ipAddress }) {
    console.log('Authenticating user:', email);
    console.log('IP Address:', ipAddress);

    const account = await db.accounts.scope('withHash').findOne({ where: { email } });
    console.log('Account found:', account ? 'Yes' : 'No');

    if (!account || !account.isVerified || !bcrypt.compareSync(password, account.passwordHash)) {
        console.log('Authentication failed:', !account ? 'Account not found' : !account.isVerified ? 'Account not verified' : 'Invalid password');
        throw 'Email or password is incorrect';
    }
    
    // Check if non-admin account is active before allowing login
    if (account.role !== Role.Admin && !account.isActive) {
        throw 'Your account has been deactivated. Please contact an administrator.';
    }

    // authentication successful so generate jwt and refresh tokens
    const jwtToken = generateJwtToken(account);
    const refreshToken = generateRefreshToken(account, ipAddress);

    // save refresh token
    await refreshToken.save();
    console.log('Refresh token saved successfully');

    // return basic details and tokens
    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: refreshToken.token
    };
}

async function refreshToken({ token, ipAddress }) {
    console.log('Refreshing token for IP:', ipAddress);
    
    const refreshToken = await getRefreshToken(token);
    console.log('Refresh token found:', refreshToken ? 'Yes' : 'No');

    if (!refreshToken) {
        console.log('Refresh token not found');
        throw 'Invalid token';
    }

    const { account } = refreshToken;
    console.log('Account found:', account ? 'Yes' : 'No');

    // replace old refresh token with a new one and save
    const newRefreshToken = generateRefreshToken(account, ipAddress);
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    refreshToken.replacedByToken = newRefreshToken.token;
    await refreshToken.save();
    await newRefreshToken.save();
    console.log('New refresh token saved successfully');

    // generate new jwt
    const jwtToken = generateJwtToken(account);

    // return basic details and tokens
    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: newRefreshToken.token
    };
}

async function revokeToken({ token, ipAddress }) {
    console.log('Revoking token for IP:', ipAddress);
    
    const refreshToken = await getRefreshToken(token);
    console.log('Refresh token found:', refreshToken ? 'Yes' : 'No');

    if (!refreshToken) {
        console.log('Refresh token not found');
        throw 'Invalid token';
    }

    // revoke token and save
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    await refreshToken.save();
    console.log('Token revoked successfully');
}

async function register(params, origin) {
    try {
        console.log('Starting registration process...');
        console.log('Registration params:', JSON.stringify(params, null, 2));
        console.log('Origin:', origin);

        // validate
        const existingAccount = await db.accounts.findOne({ where: { email: params.email } });
        if (existingAccount) {
            console.log('Account already exists:', params.email);
            // send already registered error in email to prevent account enumeration
            return await sendAlreadyRegisteredEmail(params.email, origin);
        }

        console.log('Creating new account...');
        // create account object
        const account = new db.accounts(params);

        // first registered account is an admin
        const isFirstAccount = (await db.accounts.count()) === 0;
        account.role = isFirstAccount ? Role.Admin : Role.User;
        account.verificationToken = randomTokenString();
        console.log('Account role set to:', account.role);
        console.log('Verification token generated');

        // hash password
        account.passwordHash = hash(params.password);
        console.log('Password hashed');

        console.log('Saving account to database...');
        // save account
        try {
            await account.save();
            console.log('Account saved successfully');
        } catch (saveError) {
            console.error('Error saving account:', saveError);
            if (saveError.name === 'SequelizeValidationError') {
                throw new Error(`Validation error: ${saveError.errors.map(e => e.message).join(', ')}`);
            }
            if (saveError.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Email already registered');
            }
            throw saveError;
        }

        console.log('Sending verification email...');
        // send email
        try {
            await sendVerificationEmail(account, origin);
            console.log('Verification email sent');
        } catch (emailError) {
            console.error('Error sending verification email:', emailError);
            // Don't throw the error, just log it
            // The account is still created and can be verified later
        }

        return basicDetails(account);
    } catch (error) {
        console.error('Registration process error:', error);
        console.error('Error stack:', error.stack);
        throw error;
    }
}

async function verifyEmail({ token }) {
    console.log('Verifying email with token');
    
    const account = await db.accounts.findOne({ where: { verificationToken: token } });
    console.log('Account found:', account ? 'Yes' : 'No');

    if (!account) {
        console.log('Invalid verification token');
        throw 'Verification failed';
    }

    account.verified = Date.now();
    account.verificationToken = null;
    await account.save();
    console.log('Account verified successfully');
}

async function forgotPassword({ email }, origin) {
    console.log('Processing forgot password request for:', email);
    
    const account = await db.accounts.findOne({ where: { email } });
    console.log('Account found:', account ? 'Yes' : 'No');
    
    // always return ok response to prevent email enumeration
    if (!account) return;
    
    // create reset token that expires after 24 hours
    account.resetToken = randomTokenString();
    account.resetTokenExpires = new Date(Date.now() + 24*60*60*1000);
    await account.save();
    console.log('Reset token generated and saved');
    
    // send email
    await sendPasswordResetEmail(account, origin);
    console.log('Password reset email sent');
}

async function validateResetToken({ token }) {
    console.log('Validating reset token');
    
    const account = await db.accounts.findOne({ 
        where: { 
            resetToken: token,
            resetTokenExpires: { [Op.gt]: Date.now() }
        }
    });
    console.log('Account found:', account ? 'Yes' : 'No');
    
    if (!account) throw 'Invalid token';
    
    return account;
}

async function resetPassword({ token, password }) {
    console.log('Resetting password');
    
    const account = await validateResetToken({ token });
    
    // update password and remove reset token
    account.passwordHash = hash(password);
    account.passwordReset = Date.now();
    account.resetToken = null;
    account.resetTokenExpires = null;
    await account.save();
    console.log('Password reset successfully');
}

async function getAll() {
    console.log('Getting all accounts');
    const accounts = await db.accounts.findAll();
    console.log('Found', accounts.length, 'accounts');
    return accounts.map(x => basicDetails(x));
}

async function getById(id) {
    console.log('Getting account by ID:', id);
    const account = await getAccount(id);
    console.log('Account found:', account ? 'Yes' : 'No');
    return basicDetails(account);
}

async function create(params) {
    console.log('Creating new account');
    console.log('Params:', JSON.stringify(params, null, 2));

    // validate
    if (await db.accounts.findOne({ where: { email: params.email } })) {
        throw 'Email "' + params.email + '" is already registered';
    }
    
    const account = new db.accounts(params);
    account.verified = Date.now();
    
    // hash password
    account.passwordHash = hash(params.password);
    
    // save account
    await account.save();
    
    return basicDetails(account);
}

async function update(id, params) {
    console.log('Updating account:', id);
    console.log('Update params:', JSON.stringify(params, null, 2));
    
    const account = await getAccount(id);
    console.log('Account found:', account ? 'Yes' : 'No');

    // validate (if email was changed)
    if (params.email && account.email !== params.email && await db.accounts.findOne({ where: { email: params.email } })) {
        throw 'Email "' + params.email + '" is already registered';
    }
    
    // hash password if it was entered
    if (params.password) {
        params.passwordHash = hash(params.password);
        console.log('Password hashed');
    }
    
    // copy params to account and save
    Object.assign(account, params);
    account.updated = Date.now();
    await account.save();
    
    return basicDetails(account);
}

async function _delete(id) {
    console.log('Deleting account:', id);
    const account = await getAccount(id);
    console.log('Account found:', account ? 'Yes' : 'No');
    await account.destroy();
    console.log('Account deleted successfully');
}

// helper functions

async function getAccount(id) {
    const account = await db.accounts.findByPk(id);
    if (!account) throw 'Account not found';
    return account;
}

async function getRefreshToken(token) {
    // Add a check for undefined or empty token
    if (!token) {
        throw 'Invalid token';
    }
    
    const refreshToken = await db.refreshTokens.findOne({ 
        where: { token } 
    });
    
    if (!refreshToken || !refreshToken.isActive) throw 'Invalid token';
    return refreshToken;
}

function hash(password) {
    return bcrypt.hashSync(password, 10);
}

function generateJwtToken(account) {
    // create a jwt token containing the account id that expires in 15 minutes
    return jwt.sign({ sub: account.id, id: account.id }, config.secret, { expiresIn: '15m' });
}

function generateRefreshToken(account, ipAddress) {
    // create a refresh token that expires in 7 days
    return new db.refreshTokens({
        accountId: account.id,
        token: randomTokenString(),
        expires: new Date(Date.now() + 7*24*60*60*1000),
        createdByIp: ipAddress
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
    console.log('Sending verification email to:', account.email);
    let message;
    if (origin) {
        const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;
        message = `<p>Please click the below link to verify your email address:</p>
                   <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
    } else {
        message = `<p>Please use the below token to verify your email address with the <code>/account/verify-email</code> api route:</p>
                   <p><code>${account.verificationToken}</code></p>`;
    }

    await sendEmail({
        to: account.email,
        subject: 'Sign-up Verification API - Verify Email',
        html: `<h4>Verify Email</h4>
               <p>Thanks for registering!</p>
               ${message}`
    });
    console.log('Verification email sent successfully');
}

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
        html: `<h4>Email Already Registered</h4>
               <p>Your email <strong>${email}</strong> is already registered.</p>
               ${message}`
    });
}

async function sendPasswordResetEmail(account, origin) {
    console.log('Sending password reset email to:', account.email);
    let message;
    if (origin) {
        const resetUrl = `${origin}/account/reset-password?token=${account.resetToken}`;
        message = `<p>Please click the below link to reset your password, the link will be valid for 1 day:</p>
                   <p><a href="${resetUrl}">${resetUrl}</a></p>`;
    } else {
        message = `<p>Please use the below token to reset your password with the <code>/account/reset-password</code> api route:</p>
                   <p><code>${account.resetToken}</code></p>`;
    }

    await sendEmail({
        to: account.email,
        subject: 'Sign-up Verification API - Reset Password',
        html: `<h4>Reset Password Email</h4>
               ${message}`
    });
    console.log('Password reset email sent successfully');
}