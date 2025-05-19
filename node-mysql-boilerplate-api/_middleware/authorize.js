const jwt = require('express-jwt');
const { secret } = require('config.json');
const db = require('_helpers/db');

module.exports = authorize;

function authorize(roles = []) {
    // Convert string role to array
    if (typeof roles === 'string') {
        roles = [roles];
    }

    // JWT authentication middleware
    const jwtMiddleware = jwt({
        secret,
        algorithms: ['HS256'],
        credentialsRequired: roles.length > 0, // Require token only if roles are enforced
        getToken: function fromHeader(req) {
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
                return req.headers.authorization.split(' ')[1];
            }
            return null;
        }
    });

    return [
        ...(roles.length > 0 ? [jwtMiddleware] : []),

        // Authorization and user enrichment middleware
        async (req, res, next) => {
            try {
                // If roles are not required, continue without checks
                if (roles.length === 0) return next();

                // Ensure token was decoded by jwt middleware
                if (!req.user?.id) {
                    return res.status(401).json({
                        message: 'Unauthorized - Invalid or missing token',
                        code: 'INVALID_TOKEN'
                    });
                }

                // Load account from DB
                const account = await db.Account.findByPk(req.user.id);
                if (!account) {
                    return res.status(401).json({
                        message: 'Unauthorized - Account not found',
                        code: 'ACCOUNT_NOT_FOUND'
                    });
                }

                // Check role authorization
                if (!roles.includes(account.role)) {
                    return res.status(403).json({
                        message: 'Forbidden - Insufficient permissions',
                        code: 'INSUFFICIENT_PERMISSIONS',
                        requiredRoles: roles,
                        userRole: account.role
                    });
                }

                // Extend req.user with full role and helper
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
        }
    ];
}
