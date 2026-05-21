// middleware/roleMiddleware.js

const allowRoles = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          success: false,
          error: "Unauthorized"
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: "Access denied"
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = allowRoles;