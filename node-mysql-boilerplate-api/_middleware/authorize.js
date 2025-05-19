const jwt = require('express-jwt');
const { secret } = require('config.json');
const db = require('_helpers/db');

module.exports = authorize;

function authorize(roles = []) {
    // Convert string role to array
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return [
        // JWT authentication middleware
        jwt({
            secret,
            algorithms: ['HS256'],
            credentialsRequired: roles.length > 0, // Only require credentials if roles specified
            getToken: function fromHeaderOrCookie(req) {
                // Check authorization header first
                if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
                    return req.headers.authorization.split(' ')[1];
                }
                // Fall back to cookie
                if (req.cookies && req.cookies.refreshToken) {
                    return req.cookies.refreshToken;
                }
                return null;
            }
        }),

        // Role authorization middleware
        async (req, res, next) => {
            // Skip role check if no roles required
            if (roles.length === 0) return next();

            try {
                // Verify user exists
                if (!req.user?.id) {
                    return res.status(401).json({
                        message: 'Unauthorized - Invalid token',
                        code: 'INVALID_TOKEN'
                    });
                }

                // Get account from database
                const account = await db.Account.findByPk(req.user.id);
                if (!account) {
                    return res.status(401).json({
                        message: 'Unauthorized - Account not found',
                        code: 'ACCOUNT_NOT_FOUND'
                    });
                }

                // Check role permissions
                if (roles.length && !roles.includes(account.role)) {
                    return res.status(403).json({
                        message: 'Forbidden - Insufficient permissions',
                        code: 'INSUFFICIENT_PERMISSIONS',
                        requiredRoles: roles,
                        userRole: account.role
                    });
                }

                // Attach additional user info to request
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