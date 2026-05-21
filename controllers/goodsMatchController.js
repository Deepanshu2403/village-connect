const prisma = require("../config/db");
const createNotification = require("../utils/createNotification");

const createGoodsMatch = async (req, res, next) => {
  try {
    const goodsRequestId = Number(req.body.goodsRequestId);
    const travelPostId = Number(req.body.travelPostId);

    const goodsRequest = await prisma.goodsRequest.findUnique({
      where: { id: goodsRequestId },
    });

    if (!goodsRequest) {
      return res.status(404).json({
        success: false,
        error: "Goods request not found",
      });
    }

    const travelPost = await prisma.travelPost.findUnique({
      where: { id: travelPostId },
    });

    if (!travelPost || travelPost.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: "You can only offer delivery from your own travel post",
      });
    }

    const match = await prisma.goodsMatch.create({
      data: {
        goodsRequestId,
        travelPostId,
        driverId: req.user.userId,
        status: "accepted",
      },
    });

    await prisma.goodsRequest.update({
      where: { id: goodsRequestId },
      data: {
        status: "accepted",
        driverId: req.user.userId,
        travelPostId,
      },
    });

    await createNotification(
      goodsRequest.requesterId,
      `Your goods delivery request for ${goodsRequest.item} (${goodsRequest.from} → ${goodsRequest.to}) has been accepted`,
      "/passenger",
      "GOODS_MATCH"
    );

    res.json({ success: true, match });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createGoodsMatch,
};
