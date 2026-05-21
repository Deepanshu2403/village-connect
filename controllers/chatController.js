const prisma = require("../config/db");
const createNotification = require("../utils/createNotification");

const sendMessage = async (req, res, next) => {
  try {
    const receiverId = Number(req.body.receiverId);
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message text is required",
      });
    }

    const sender = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true },
    });

    const message = await prisma.message.create({
      data: {
        senderId: req.user.userId,
        receiverId,
        text,
      },
    });

    await createNotification(
      receiverId,
      `${sender?.name || "Someone"} sent you a message`,
      `/chat/${req.user.userId}`,
      "MESSAGE"
    );

    res.json({ success: true, message });
  } catch (err) {
    next(err);
  }
};

const getChat = async (req, res, next) => {
  try {
    const otherUserId = Number(req.params.userId);

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: req.user.userId,
            receiverId: otherUserId,
          },
          {
            senderId: otherUserId,
            receiverId: req.user.userId,
          },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, name: true, phone: true },
    });

    res.json({
      success: true,
      contact: otherUser,
      messages,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendMessage,
  getChat,
};
