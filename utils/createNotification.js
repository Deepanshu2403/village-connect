const prisma = require("../config/db");

async function createNotification(userId, message, link = null, type = "GENERAL") {
  return prisma.notification.create({
    data: {
      userId,
      message,
      link,
      type,
    },
  });
}

module.exports = createNotification;
