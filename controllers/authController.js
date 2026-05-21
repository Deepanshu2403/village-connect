const prisma = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ================= REGISTER =================
const register = async (req, res, next) => {
  try {
    const { name, phone, password, role } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const cleanName = String(name).trim();
    const cleanPhone = String(phone).trim();
    const selectedRole = role || "passenger";
    const phoneRegex = /^[6-9]\d{9}$/;

    if (cleanName.length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters" });
    }

    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    if (!["driver", "passenger"].includes(selectedRole)) {
      return res.status(400).json({ error: "Role must be driver or passenger" });
    }

    const existingUser = await prisma.user.findUnique({ where: { phone: cleanPhone } });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists with this phone number" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: cleanName,
        phone: cleanPhone,
        password: hashedPassword,
        role: selectedRole,
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

// ================= LOGIN =================
const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET is missing");
    }

    if (!phone || !password) {
      return res.status(400).json({ error: "Phone and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { phone: String(phone).trim() } });

    if (!user) {
      return res.status(400).json({ error: "Invalid phone number or password" });
    }

    if (user.suspended) {
      return res.status(403).json({ error: "Your account has been suspended" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid phone number or password" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
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
        suspended: user.suspended,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ================= GET ME =================
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

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
