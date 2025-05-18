const jwt = require('express-jwt');
const { secret } = require('config.json');
const db = require('_helpers/db');

module.exports = authorize;

function authorize(roles = []) {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return [
        // authenticate JWT token and attach user to request object (req.user)
        jwt({ 
            secret, 
            algorithms: ['HS256'],
            credentialsRequired: true,
            getToken: function fromHeaderOrQuerystring(req) {
                if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
                    return req.headers.authorization.split(' ')[1];
                } else if (req.query && req.query.token) {
                    return req.query.token;
                }
                return null;
            }
        }),

        // authorize based on user role
        async (req, res, next) => {
            try {
                console.log('Authorization check for user:', req.user.id);
                console.log('Required roles:', roles);

                const account = await db.Account.findByPk(req.user.id);
                
                if (!account) {
                    console.log('Account not found for user:', req.user.id);
                    return res.status(401).json({ 
                        message: 'Unauthorized - Account not found',
                        code: 'ACCOUNT_NOT_FOUND'
                    });
                }

                if (roles.length && !roles.includes(account.role)) {
                    console.log('Role not authorized. User role:', account.role, 'Required roles:', roles);
                    return res.status(403).json({ 
                        message: 'Forbidden - Insufficient permissions',
                        code: 'INSUFFICIENT_PERMISSIONS',
                        requiredRoles: roles,
                        userRole: account.role
                    });
                }

                // authentication and authorization successful
                req.user.role = account.role;
                const refreshTokens = await account.getRefreshTokens();
                req.user.ownsToken = token => !!refreshTokens.find(x => x.token === token);
                
                console.log('Authorization successful for user:', req.user.id, 'with role:', account.role);
                next();
            } catch (error) {
                console.error('Authorization error:', error);
                return res.status(500).json({ 
                    message: 'Internal server error during authorization',
                    code: 'AUTH_ERROR',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        }
    ];
}
