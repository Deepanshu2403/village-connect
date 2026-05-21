// middleware/validateMiddleware.js

const validate = (schema) => (req, res, next) => {
  try {
    const errors = [];

    for (const key in schema) {
      const rule = schema[key];
      const value = req.body[key];

      if (rule.required && (value === undefined || value === null || value === "")) {
        errors.push(`${key} is required`);
      }

      if (value !== undefined && rule.type) {
        if (rule.type === "number" && isNaN(value)) {
          errors.push(`${key} must be a number`);
        }

        if (rule.type === "string" && typeof value !== "string") {
          errors.push(`${key} must be a string`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors.join(", ")
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = validate;