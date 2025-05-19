const jwt = require('express-jwt');
const { secret } = require('config.json');
const db = require('_helpers/db');

module.exports = authorize;

function authorize(roles = []) {
  // Convert single role string to array
  if (typeof roles === 'string') {
    roles = [roles];
  }

  // Middleware to extract and verify JWT
  const jwtMiddleware = jwt({
    secret,
    algorithms: ['HS256'],
    getToken: function fromHeader(req) {
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return req.headers.authorization.split(' ')[1];
      }
      return null;
    }
  });

  // Middleware to check role and attach user
  const roleMiddleware = async (req, res, next) => {
    try {
      // Check for decoded token
      if (!req.user?.id) {
        return res.status(401).json({
          message: 'Unauthorized - Invalid or missing token',
          code: 'INVALID_TOKEN'
        });
      }

      // Fetch account from DB
      const account = await db.Account.findByPk(req.user.id);
      if (!account) {
        return res.status(401).json({
          message: 'Unauthorized - Account not found',
          code: 'ACCOUNT_NOT_FOUND'
        });
      }

      // Check if user has required role(s)
      if (roles.length && !roles.includes(account.role)) {
        return res.status(403).json({
          message: 'Forbidden - Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredRoles: roles,
          userRole: account.role
        });
      }

      // Attach role and helper to req.user
      req.user.role = account.role;
      const refreshTokens = await account.getRefreshTokens();
      req.user.ownsToken = token => refreshTokens.some(rt => rt.token === token);

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({
        message: 'Internal server error during authorization',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };

  return [jwtMiddleware, roleMiddleware];
}
