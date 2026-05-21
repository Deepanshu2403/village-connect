// middleware/errorMiddleware.js

const errorHandler = (err, req, res, next) => {
  console.error(err.message);

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || "Internal Server Error"
  });
};

module.exports = errorHandler;
