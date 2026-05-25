const prisma = require("../config/db");

async function createNotification(userId, message, link = null, type = "info") {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: Number(userId),
        message,
        link,
        type,
      },
    });
    if (global.io) {
      global.io.to(`user:${Number(userId)}`).emit("notification:new", notification);
      global.io.to(`user:${Number(userId)}`).emit("dashboard:refresh", {
        reason: "notification",
      });
    }
    return notification;
  } catch (err) {
    console.error("[NOTIFICATION] Failed to create:", err.message);
    return null;
  }
}

module.exports = createNotification;
module.exports.createNotification = createNotification;
