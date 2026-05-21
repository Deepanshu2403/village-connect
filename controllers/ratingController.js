const prisma = require("../config/db");
const createNotification = require("../utils/createNotification");

const giveRating = async (req, res, next) => {
  try {
    const ratedUserId = Number(req.body.ratedUserId || req.body.toUserId);
    const travelPostId = Number(req.body.travelPostId);
    const score = Number(req.body.score || req.body.rating);
    const { comment } = req.body;

    if (!ratedUserId || !travelPostId) {
      return res.status(400).json({ error: "Rated user and trip are required" });
    }

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const existing = await prisma.rating.findUnique({
      where: {
        raterId_travelPostId: {
          raterId: req.user.userId,
          travelPostId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: "You have already rated this trip" });
    }

    const trip = await prisma.travelPost.findUnique({
      where: { id: travelPostId },
      include: { rideRequests: true },
    });

    if (!trip) return res.status(404).json({ error: "Trip not found" });
    if (trip.status !== "completed") {
      return res.status(400).json({ error: "You can rate only after trip completion" });
    }

    const participated =
      trip.userId === req.user.userId ||
      trip.rideRequests.some(
        (request) => request.passengerId === req.user.userId && request.status === "completed"
      );

    if (!participated) {
      return res.status(403).json({ error: "You can rate only trips you completed" });
    }

    const [rater, ratedUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.userId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: ratedUserId }, select: { id: true, role: true } }),
    ]);

    if (!ratedUser) return res.status(404).json({ error: "Rated user not found" });

    await prisma.rating.create({
      data: {
        raterId: req.user.userId,
        ratedUserId,
        travelPostId,
        score,
        comment: comment ? String(comment).trim() : null,
      },
    });

    const allRatings = await prisma.rating.findMany({
      where: { ratedUserId },
      select: { score: true },
    });

    const avg = allRatings.reduce((sum, item) => sum + item.score, 0) / allRatings.length;

    await prisma.user.update({
      where: { id: ratedUserId },
      data: {
        rating: Math.round(avg * 10) / 10,
        totalRatings: allRatings.length,
      },
    });

    await createNotification(
      ratedUserId,
      `${rater?.name || "Someone"} gave you a ${score} star rating`,
      ratedUser.role === "driver" ? "/driver" : "/passenger",
      "RATING"
    );

    res.json({ success: true, message: "Rating submitted" });
  } catch (err) {
    next(err);
  }
};

module.exports = { giveRating };
