const prisma = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async (req, res, next) => {
  try {
    const { name, phone, password, role } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: "Name, phone, and password are required" });
    }

    const cleanPhone = phone.toString().trim();
    const cleanName = name.toString().trim();

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number" });
    }

    if (cleanName.length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const validRoles = ["driver", "passenger"];
    const userRole = validRoles.includes(role) ? role : "passenger";

    const existing = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (existing) {
      return res.status(400).json({ error: "An account with this phone number already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: cleanName,
        phone: cleanPhone,
        password: hashedPassword,
        role: userRole,
      },
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: "Phone and password are required" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("[AUTH] CRITICAL: JWT_SECRET environment variable is not set");
      return res.status(500).json({ error: "Server configuration error. Contact support." });
    }

    const cleanPhone = phone.toString().trim();

    const user = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid phone number or password" });
    }

    if (user.suspended) {
      return res.status(403).json({ error: "Your account has been suspended. Contact support." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid phone number or password" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        rating: user.rating,
        totalRatings: user.totalRatings,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        rating: true,
        totalRatings: true,
        suspended: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.suspended) {
      return res.status(403).json({ error: "Account suspended" });
    }

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
