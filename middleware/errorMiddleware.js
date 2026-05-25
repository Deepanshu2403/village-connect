const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
  console.error(`[ERROR] Message: ${err.message}`);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  if (err.code === "P2002") {
    return res.status(409).json({
      error: "This record already exists",
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  if (err.code === "P2003") {
    return res.status(400).json({ error: "Invalid reference - related record not found" });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token. Please login again." });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Session expired. Please login again." });
  }

  if (err.message?.includes("CORS")) {
    return res.status(403).json({ error: "Request blocked by CORS policy" });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? status === 500
        ? "Internal server error"
        : err.message
      : err.message || "Internal server error";

  res.status(status).json({ error: message });
};

module.exports = errorHandler;
