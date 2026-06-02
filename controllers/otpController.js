const prisma = require("../config/db");
const bcrypt = require("bcryptjs");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPViaSMS(phone, otp, purpose) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const hasPlaceholderConfig =
    accountSid === "your_twilio_account_sid" ||
    authToken === "your_twilio_auth_token" ||
    fromNumber === "your_twilio_phone_number";
  const isDevMode = process.env.NODE_ENV !== "production";

  console.log("[OTP] Attempting to send OTP");
  console.log("[OTP] Phone:", phone);
  console.log("[OTP] Purpose:", purpose);
  console.log("[OTP] Twilio Account SID:", accountSid ? `${accountSid.slice(0, 6)}...` : "NOT SET");
  console.log("[OTP] Twilio Auth Token:", authToken ? "SET" : "NOT SET");
  console.log("[OTP] Twilio Phone:", fromNumber || "NOT SET");

  if (isDevMode || !accountSid || !authToken || !fromNumber || hasPlaceholderConfig) {
    console.log("[OTP DEV] =============================");
    console.log(`[OTP DEV] Phone: ${phone}`);
    console.log(`[OTP DEV] OTP: ${otp}`);
    console.log(`[OTP DEV] Purpose: ${purpose}`);
    console.log("[OTP DEV] =============================");
    return { success: true, dev: true };
  }

  try {
    const twilio = require("twilio")(accountSid, authToken);

    const message = await twilio.messages.create({
      body: `Your VillageConnect OTP is: ${otp}. Valid for 10 minutes. Do not share.`,
      from: fromNumber,
      to: `+91${phone}`,
    });

    console.log("[OTP] SMS sent successfully. SID:", message.sid);
    return { success: true, dev: false };
  } catch (err) {
    console.error("[OTP] Twilio SMS error:", err.message);
    console.error("[OTP] Twilio error code:", err.code);
    console.error("[OTP] Twilio error details:", err.moreInfo);
    console.log(`[OTP FALLBACK] OTP for ${phone}: ${otp}`);
    return { success: true, dev: true, twilioError: err.message };
  }
}

const sendOTP = async (req, res, next) => {
  try {
    const { phone, purpose } = req.body;
    const cleanPhone = phone?.toString().trim();

    if (!cleanPhone || !purpose) {
      return res.status(400).json({ error: "Phone and purpose required" });
    }

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
        return res.status(400).json({
          error: "No account found with this phone number.",
        });
      }
    }

    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentOtps = await prisma.otpVerification.count({
      where: {
        phone: cleanPhone,
        purpose,
        createdAt: { gt: tenMinsAgo },
      },
    });

    if (recentOtps >= 3) {
      return res.status(429).json({
        error: "Too many OTP requests. Please wait 10 minutes before trying again.",
      });
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

    const result = await sendOTPViaSMS(cleanPhone, otp, purpose);

    res.json({
      success: true,
      message: result.dev
        ? `OTP sent (DEV MODE - check server logs): ${otp}`
        : "OTP sent to your mobile number",
      dev: result.dev || false,
      ...(result.dev && process.env.NODE_ENV !== "production" ? { otp } : {}),
    });
  } catch (err) {
    next(err);
  }
};

const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp, purpose } = req.body;
    const cleanPhone = phone?.toString().trim();
    const cleanOtp = otp?.toString().trim();

    if (!cleanPhone || !cleanOtp || !purpose) {
      return res.status(400).json({ error: "Phone, OTP, and purpose required" });
    }

    if (!["signup", "forgot_password"].includes(purpose)) {
      return res.status(400).json({ error: "Invalid purpose" });
    }

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

    const isMatch = await bcrypt.compare(cleanOtp, record.otp);
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
