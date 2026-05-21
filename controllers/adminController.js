const prisma = require("../config/db");

const getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        rating: true,
        createdAt: true,
        suspended: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

const suspendUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.userId) {
      return res.status(400).json({ error: "You cannot suspend your own account" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { suspended: true },
      select: { id: true, name: true, phone: true, role: true, rating: true, createdAt: true, suspended: true },
    });

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

const getAllTrips = async (req, res, next) => {
  try {
    const trips = await prisma.travelPost.findMany({
      include: {
        user: { select: { id: true, name: true, phone: true, rating: true } },
        _count: { select: { rideRequests: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ success: true, trips });
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalDrivers,
      totalPassengers,
      totalTrips,
      activeTrips,
      completedTrips,
      totalGoodsRequests,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "driver" } }),
      prisma.user.count({ where: { role: "passenger" } }),
      prisma.travelPost.count(),
      prisma.travelPost.count({ where: { status: { in: ["scheduled", "active", "pickup_done"] } } }),
      prisma.travelPost.count({ where: { status: "completed" } }),
      prisma.goodsRequest.count(),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalDrivers,
        totalPassengers,
        totalTrips,
        activeTrips,
        completedTrips,
        totalGoodsRequests,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  suspendUser,
  getAllTrips,
  getStats,
};
