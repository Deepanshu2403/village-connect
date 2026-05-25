const prisma = require("../config/db");

async function createNotification(userId, message, link = null, type = "info") {
  try {
    await prisma.notification.create({
      data: {
        userId: Number(userId),
        message,
        link,
        type,
      },
    });
  } catch (err) {
    console.error("[NOTIFICATION] Failed to create:", err.message);
  }
}

module.exports = createNotification;
module.exports.createNotification = createNotification;
