const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("[ADMIN] JWT_SECRET is not set");
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, suspended: true },
    });

    if (!user || user.role !== "admin" || user.suspended) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    req.user = { userId: user.id, role: "admin" };
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
};
