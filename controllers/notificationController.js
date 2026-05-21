const prisma = require("../config/db");
const createNotification = require("../utils/createNotification");

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      notifications,
    });
  } catch (err) {
    next(err);
  }
};

const markOneRead = async (req, res, next) => {
  try {
    const { id } = req.body;
    await prisma.notification.updateMany({
      where: { id: Number(id), userId: req.user.userId },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user.userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      success: true,
      count: result.count,
    });
  } catch (err) {
    next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.userId !== req.user.userId) {
      return res.status(403).json({ error: "Not your notification" });
    }

    await prisma.notification.delete({ where: { id } });

    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    next(err);
  }
};

const clearAllNotifications = async (req, res, next) => {
  try {
    const result = await prisma.notification.deleteMany({
      where: { userId: req.user.userId },
    });

    res.json({ success: true, deleted: result.count });
  } catch (err) {
    next(err);
  }
};

const clearReadNotifications = async (req, res, next) => {
  try {
    const result = await prisma.notification.deleteMany({
      where: { userId: req.user.userId, isRead: true },
    });

    res.json({ success: true, deleted: result.count });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markOneRead,
  markAllRead,
  deleteNotification,
  clearAllNotifications,
  clearReadNotifications,
};
