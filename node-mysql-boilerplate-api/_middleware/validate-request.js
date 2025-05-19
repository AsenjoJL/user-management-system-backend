module.exports = function validateRequest(schema) {
    return (req, res, next) => {
        const options = {
            abortEarly: false,  // include all validation errors
            allowUnknown: true,  // allow unknown props (ignore)
            stripUnknown: true   // remove unknown props from validated data
        };

        const { error, value } = schema.validate(req.body, options);

        if (error) {
            // Aggregate all error messages into one string and pass to error handler
            return next(`Validation error: ${error.details.map(x => x.message).join(', ')}`);
        } else {
            req.body = value;  // sanitized data
            next();
        }
    };
};
