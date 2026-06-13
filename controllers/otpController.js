const prisma = require("../config/db");
const bcrypt = require("bcryptjs");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const sendOTP = async (req, res, next) => {
  try {
    const { phone, purpose } = req.body;

    if (!phone || !purpose) {
      return res.status(400).json({ error: "Phone and purpose required" });
    }

    const cleanPhone = phone.toString().trim();

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Enter a valid 10-digit mobile number" });
    }

    if (!["signup", "forgot_password"].includes(purpose)) {
      return res.status(400).json({ error: "Invalid purpose" });
    }

    if (purpose === "signup") {
      const existing = await prisma.user.findUnique({ where: { phone: cleanPhone } });
      if (existing) {
        return res.status(400).json({
          error: "This phone number is already registered. Please login.",
        });
      }
    }

    if (purpose === "forgot_password") {
      const user = await prisma.user.findUnique({ where: { phone: cleanPhone } });
      if (!user) {
        return res.status(400).json({ error: "No account found with this phone number." });
      }
    }

    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await prisma.otpVerification.count({
      where: { phone: cleanPhone, purpose, createdAt: { gt: tenMinsAgo } },
    });

    if (recentCount >= 5) {
      return res.status(429).json({ error: "Too many OTP requests. Wait 10 minutes." });
    }

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpVerification.deleteMany({
      where: { phone: cleanPhone, purpose },
    });

    await prisma.otpVerification.create({
      data: {
        phone: cleanPhone,
        otp: hashedOtp,
        purpose,
        expiresAt,
      },
    });

    console.log(`[OTP] Phone: ${cleanPhone} | OTP: ${otp} | Purpose: ${purpose}`);

    res.json({
      success: true,
      dev: true,
      otp,
      message: "OTP generated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp, purpose } = req.body;

    if (!phone || !otp || !purpose) {
      return res.status(400).json({ error: "Phone, OTP and purpose are required" });
    }

    const cleanPhone = phone.toString().trim();

    const record = await prisma.otpVerification.findFirst({
      where: {
        phone: cleanPhone,
        purpose,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return res.status(400).json({
        error: "OTP expired or not found. Please request a new OTP.",
      });
    }

    const isMatch = await bcrypt.compare(otp.toString(), record.otp);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect OTP. Please try again." });
    }

    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { verified: true },
    });

    res.json({
      success: true,
      message: "OTP verified successfully",
      verified: true,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendOTP, verifyOTP };
