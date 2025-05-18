const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const accountService = require('./account.service');

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

// Validation Schemas
function authenticateSchema(req, res, next) {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });
  validateRequest(req, next, schema);
}

function registerSchema(req, res, next) {
  const schema = Joi.object({
    title: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    acceptTerms: Joi.boolean().valid(true).required()
  });
  validateRequest(req, next, schema);
}

function verifyEmailSchema(req, res, next) {
  const schema = Joi.object({
    token: Joi.string().required()
  });
  validateRequest(req, next, schema);
}

function forgotPasswordSchema(req, res, next) {
  const schema = Joi.object({
    email: Joi.string().email().required()
  });
  validateRequest(req, next, schema);
}

function validateResetTokenSchema(req, res, next) {
  const schema = Joi.object({
    token: Joi.string().required()
  });
  validateRequest(req, next, schema);
}

function resetPasswordSchema(req, res, next) {
  const schema = Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
  });
  validateRequest(req, next, schema);
}

function revokeTokenSchema(req, res, next) {
  const schema = Joi.object({
    token: Joi.string().empty('')
  });
  validateRequest(req, next, schema);
}

function createSchema(req, res, next) {
  const schema = Joi.object({
    title: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
    role: Joi.string().valid(Role.Admin, Role.User).required()
  });
  validateRequest(req, next, schema);
}

function updateSchema(req, res, next) {
  const schemaRules = {
    title: Joi.string().empty(''),
    firstName: Joi.string().empty(''),
    lastName: Joi.string().empty(''),
    email: Joi.string().email().empty(''),
    password: Joi.string().min(6).empty(''),
    confirmPassword: Joi.string().valid(Joi.ref('password')).empty('')
  };

  if (req.user.role === Role.Admin) {
    schemaRules.role = Joi.string().valid(Role.Admin, Role.User).empty('');
  }

  const schema = Joi.object(schemaRules).with('password', 'confirmPassword');
  validateRequest(req, next, schema);
}

function updateStatusSchema(req, res, next) {
  const schema = Joi.object({
    isActive: Joi.boolean().required()
  });
  validateRequest(req, next, schema);
}

// Route Handlers
async function authenticate(req, res, next) {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const account = await accountService.authenticate({ email, password, ipAddress });
    setTokenCookie(res, account.refreshToken);
    res.json(account);
  } catch (error) {
    next(error);
  }
}

async function refreshToken(req, res, next) {
  try {
    const token = req.cookies.refreshToken;
    const ipAddress = req.ip;
    const account = await accountService.refreshToken({ token, ipAddress });
    setTokenCookie(res, account.refreshToken);
    res.json(account);
  } catch (error) {
    next(error);
  }
}

async function revokeToken(req, res, next) {
  try {
    const token = req.body.token || req.cookies.refreshToken;
    const ipAddress = req.ip;

    if (!token) return res.status(400).json({ message: 'Token is required' });

    if (!req.user.ownsToken(token) && req.user.role !== Role.Admin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await accountService.revokeToken({ token, ipAddress });
    res.json({ message: 'Token revoked' });
  } catch (error) {
    next(error);
  }
}

async function register(req, res, next) {
  try {
    await accountService.register(req.body, req.get('origin'));
    res.json({ message: 'Registration successful, please check your email for verification instructions' });
  } catch (error) {
    next(error);
  }
}

async function verifyEmail(req, res, next) {
  try {
    await accountService.verifyEmail(req.body);
    res.json({ message: 'Verification successful, you can now login' });
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    await accountService.forgotPassword(req.body, req.get('origin'));
    res.json({ message: 'Please check your email for password reset instructions' });
  } catch (error) {
    next(error);
  }
}

async function validateResetToken(req, res, next) {
  try {
    await accountService.validateResetToken(req.body);
    res.json({ message: 'Token is valid' });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    await accountService.resetPassword(req.body);
    res.json({ message: 'Password reset successful, you can now login' });
  } catch (error) {
    next(error);
  }
}

async function getAll(req, res, next) {
  try {
    const accounts = await accountService.getAll();
    res.json(accounts);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    if (req.params.id !== req.user.id && req.user.role !== Role.Admin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const account = await accountService.getById(req.params.id);
    account ? res.json(account) : res.sendStatus(404);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const account = await accountService.create(req.body);
    res.json(account);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    if (req.params.id !== req.user.id && req.user.role !== Role.Admin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const account = await accountService.update(req.params.id, req.body);
    res.json(account);
  } catch (error) {
    next(error);
  }
}

async function _delete(req, res, next) {
  try {
    if (req.params.id !== req.user.id && req.user.role !== Role.Admin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    await accountService.delete(req.params.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot change your own account status' });
    }
    const account = await accountService.updateStatus(req.params.id, req.body.isActive);
    res.json(account);
  } catch (error) {
    next(error);
  }
}

function setTokenCookie(res, token) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(Date.now() + 7*24*60*60*1000),
    path: '/'
  };
  res.cookie('refreshToken', token, cookieOptions);
}
