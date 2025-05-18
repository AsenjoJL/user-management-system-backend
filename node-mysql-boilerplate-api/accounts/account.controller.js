const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const accountService = require('./account.service');

// Validation Schemas (using validateRequest factory)
const authenticateSchema = validateRequest(
  Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required()
  })
);

const revokeTokenSchema = validateRequest(
  Joi.object({
    token: Joi.string().empty('')
  })
);

const registerSchema = validateRequest(
  Joi.object({
    title: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    acceptTerms: Joi.boolean().valid(true).required()
  })
);

const verifyEmailSchema = validateRequest(
  Joi.object({
    token: Joi.string().required()
  })
);

const forgotPasswordSchema = validateRequest(
  Joi.object({
    email: Joi.string().email().required()
  })
);

const validateResetTokenSchema = validateRequest(
  Joi.object({
    token: Joi.string().required()
  })
);

const resetPasswordSchema = validateRequest(
  Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
  })
);

const createSchema = validateRequest(
  Joi.object({
    title: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    role: Joi.string().valid(Role.Admin, Role.User).required()
  })
);

const updateStatusSchema = validateRequest(
  Joi.object({
    isActive: Joi.boolean().required()
  })
);

// Dynamic update schema because role validation depends on user role
function updateSchema(req, res, next) {
  const schemaRules = {
    title: Joi.string().allow(''),
    firstName: Joi.string().allow(''),
    lastName: Joi.string().allow(''),
    email: Joi.string().email().allow(''),
    password: Joi.string().min(6).allow(''),
    confirmPassword: Joi.string().valid(Joi.ref('password')).allow('')
  };

  if (req.user.role === Role.Admin) {
    schemaRules.role = Joi.string().valid(Role.Admin, Role.User).allow('');
  }

  const schema = Joi.object(schemaRules).with('password', 'confirmPassword');
  return validateRequest(schema)(req, res, next);
}

// Routes
router.post('/authenticate', authenticateSchema, authenticate);
router.post('/refresh-token', refreshToken);
router.post('/revoke-token', authorize(), revokeTokenSchema, revokeToken);
router.post('/register', registerSchema, register);
router.post('/verify-email', verifyEmailSchema, verifyEmail);
router.post('/forgot-password', forgotPasswordSchema, forgotPassword);
router.post('/validate-reset-token', validateResetTokenSchema, validateResetToken);
router.post('/reset-password', resetPasswordSchema, resetPassword);
router.get('/', authorize(Role.Admin), getAll);
router.get('/:id', authorize(), getById);
router.post('/', authorize(Role.Admin), createSchema, create);
router.put('/:id', authorize(), updateSchema, update);
router.delete('/:id', authorize(), _delete);
router.put('/:id/status', authorize(Role.Admin), updateStatusSchema, updateStatus);

module.exports = router;

// Controller functions

function authenticate(req, res, next) {
  const { email, password } = req.body;
  const ipAddress = req.ip;
  accountService.authenticate({ email, password, ipAddress })
    .then(({ refreshToken, ...account }) => {
      setTokenCookie(res, refreshToken);
      res.json(account);
    })
    .catch(next);
}

function refreshToken(req, res, next) {
  const token = req.cookies.refreshToken;
  const ipAddress = req.ip;

  if (!token) {
      return res.status(400).json({ message: 'Refresh token is required' });
  }
  accountService.refreshToken({ token, ipAddress })
    .then(({ refreshToken, ...account }) => {
      setTokenCookie(res, refreshToken);
      res.json(account);
    })
    .catch(next);
}

function revokeToken(req, res, next) {
  const token = req.body.token || req.cookies.refreshToken;
  const ipAddress = req.ip;

  if (!token) return res.status(400).json({ message: 'Token is required' });

  if (!req.user.ownsToken(token) && req.user.role !== Role.Admin) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  accountService.revokeToken({ token, ipAddress })
    .then(() => res.json({ message: 'Token revoked' }))
    .catch(next);
}

function register(req, res, next) {
  accountService.register(req.body, req.get('origin'))
    .then(() => res.json({ message: 'Registration successful, please check your email for verification instructions' }))
    .catch(next);
}

function verifyEmail(req, res, next) {
  accountService.verifyEmail(req.body)
    .then(() => res.json({ message: 'Verification successful, you can now login' }))
    .catch(next);
}

function forgotPassword(req, res, next) {
  accountService.forgotPassword(req.body, req.get('origin'))
    .then(() => res.json({ message: 'Please check your email for password reset instructions' }))
    .catch(next);
}

function validateResetToken(req, res, next) {
  accountService.validateResetToken(req.body)
    .then(() => res.json({ message: 'Token is valid' }))
    .catch(next);
}

function resetPassword(req, res, next) {
  accountService.resetPassword(req.body)
    .then(() => res.json({ message: 'Password reset successful, you can now login' }))
    .catch(next);
}

function getAll(req, res, next) {
  accountService.getAll()
    .then(accounts => res.json(accounts))
    .catch(next);
}

function getById(req, res, next) {
  if (Number(req.params.id) !== req.user.id && req.user.role !== Role.Admin) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  accountService.getById(req.params.id)
    .then(account => account ? res.json(account) : res.sendStatus(404))
    .catch(next);
}

function create(req, res, next) {
  accountService.create(req.body)
    .then(account => res.json(account))
    .catch(next);
}

function update(req, res, next) {
  if (Number(req.params.id) !== req.user.id && req.user.role !== Role.Admin) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  accountService.update(req.params.id, req.body)
    .then(account => res.json(account))
    .catch(next);
}

function _delete(req, res, next) {
  if (Number(req.params.id) !== req.user.id && req.user.role !== Role.Admin) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  accountService.delete(req.params.id)
    .then(() => res.json({ message: 'Account deleted successfully' }))
    .catch(next);
}

function updateStatus(req, res, next) {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ message: 'You cannot change your own account status' });
  }
  accountService.updateStatus(req.params.id, req.body.isActive)
    .then(account => res.json(account))
    .catch(next);
}

// Helper function to set refresh token cookie securely
function setTokenCookie(res, token) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict',
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    path: '/'
  };
  res.cookie('refreshToken', token, cookieOptions);
}
