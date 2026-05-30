const prisma = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async (req, res, next) => {
  try {
    const { name, phone, password, role } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: "Name, phone and password are required" });
    }

    const cleanPhone = phone.toString().trim();
    const cleanName = name.toString().trim();

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number" });
    }

    if (cleanName.length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const validRoles = ["driver", "passenger"];
    const userRole = validRoles.includes(role) ? role : "passenger";

    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        phone: cleanPhone,
        purpose: "signup",
        verified: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return res.status(400).json({
        error: "Phone number not verified. Please verify OTP before registering.",
      });
    }

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

    await prisma.otpVerification.deleteMany({
      where: { phone: cleanPhone, purpose: "signup" },
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

const resetPassword = async (req, res, next) => {
  try {
    const { phone, newPassword } = req.body;
    const cleanPhone = phone?.toString().trim();

    if (!cleanPhone || !newPassword) {
      return res.status(400).json({ error: "Phone and new password required" });
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        phone: cleanPhone,
        purpose: "forgot_password",
        verified: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return res.status(400).json({
        error: "OTP not verified. Please verify your phone number first.",
      });
    }

    const user = await prisma.user.findUnique({ where: { phone: cleanPhone } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { phone: cleanPhone },
      data: { password: hashedPassword },
    });

    await prisma.otpVerification.deleteMany({
      where: { phone: cleanPhone, purpose: "forgot_password" },
    });

    res.json({ success: true, message: "Password reset successfully. Please login." });
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

const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { userId } });

      await tx.message.deleteMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      });

      await tx.rating.deleteMany({
        where: { OR: [{ raterId: userId }, { ratedUserId: userId }] },
      });

      await tx.otpVerification
        .deleteMany({
          where: { phone: user.phone },
        })
        .catch(() => {});

      await tx.itemRequest
        .updateMany({
          where: {
            acceptedByDriver: userId,
            status: { in: ["pending", "accepted", "in_transit"] },
          },
          data: {
            status: "cancelled",
            acceptedByDriver: null,
            travelPostId: null,
          },
        })
        .catch(() => {});

      await tx.itemRequest
        .deleteMany({
          where: { requesterId: userId },
        })
        .catch(() => {});

      await tx.itemRequest
        .updateMany({
          where: { travelPost: { userId } },
          data: {
            status: "cancelled",
            acceptedByDriver: null,
            travelPostId: null,
          },
        })
        .catch(() => {});

      await tx.goodsMatch.deleteMany({
        where: {
          OR: [
            { driverId: userId },
            { goodsRequest: { requesterId: userId } },
            { travelPost: { userId } },
          ],
        },
      });

      await tx.rideRequest.deleteMany({
        where: {
          OR: [{ passengerId: userId }, { travelPost: { userId } }],
        },
      });

      await tx.goodsRequest.updateMany({
        where: { driverId: userId },
        data: { status: "cancelled", driverId: null },
      });

      await tx.goodsRequest.deleteMany({
        where: { requesterId: userId },
      });

      await tx.travelPost.deleteMany({
        where: { userId },
      });

      await tx.driverLocation
        .deleteMany({
          where: { driverId: userId },
        })
        .catch(() => {});

      await tx.user.delete({ where: { id: userId } });
    });

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, resetPassword, deleteAccount };
