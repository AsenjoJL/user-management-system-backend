const jwt = require('express-jwt');
const { secret } = require('config.json');
const db = require('_helpers/db');

module.exports = authorize;

function authorize(roles = []) {
    // Convert string role to array
    if (typeof roles === 'string') {
        roles = [roles];
    }

    const jwtMiddleware = jwt({
        secret,
        algorithms: ['HS256'],
        credentialsRequired: roles.length > 0, // Require JWT only when roles are specified
        getToken: function fromHeaderOrCookie(req) {
            // Check authorization header first
            if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
                return req.headers.authorization.split(' ')[1];
            }
            return null; // Don't try to use refresh token cookie for JWT
        }
    });

    return [
        // Only apply JWT middleware if roles are required
        ...(roles.length > 0 ? [jwtMiddleware] : []),

        // Role authorization middleware
        async (req, res, next) => {
            // Skip role check if no roles are specified
            if (roles.length === 0) return next();

            try {
                // Ensure user is decoded from JWT
                if (!req.user?.id) {
                    return res.status(401).json({
                        message: 'Unauthorized - Invalid token',
                        code: 'INVALID_TOKEN'
                    });
                }

                // Get user account from DB
                const account = await db.Account.findByPk(req.user.id);
                if (!account) {
                    return res.status(401).json({
                        message: 'Unauthorized - Account not found',
                        code: 'ACCOUNT_NOT_FOUND'
                    });
                }

                // Check required roles
                if (!roles.includes(account.role)) {
                    return res.status(403).json({
                        message: 'Forbidden - Insufficient permissions',
                        code: 'INSUFFICIENT_PERMISSIONS',
                        requiredRoles: roles,
                        userRole: account.role
                    });
                }

                // Attach extra info to request
                req.user.role = account.role;
                const refreshTokens = await account.getRefreshTokens();
                req.user.ownsToken = token => !!refreshTokens.find(x => x.token === token);

                next();
            } catch (error) {
                console.error('Authorization error:', error);
                next(error);
            }
        }
    ];
}
