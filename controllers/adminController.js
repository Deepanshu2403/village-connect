const prisma = require("../config/db");

const getStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const [
      totalUsers,
      totalDrivers,
      totalPassengers,
      totalRides,
      activeRides,
      scheduledRides,
      completedRides,
      cancelledRides,
      todayRides,
      weekRides,
      totalGoods,
      pendingGoods,
      acceptedGoods,
      deliveredGoods,
      totalBookings,
      totalMessages,
      totalNotifications,
      newUsersToday,
      suspendedUsers,
    ] = await Promise.all([
      prisma.user.count({ where: { role: { not: "admin" } } }),
      prisma.user.count({ where: { role: "driver" } }),
      prisma.user.count({ where: { role: "passenger" } }),
      prisma.travelPost.count(),
      prisma.travelPost.count({ where: { status: { in: ["active", "pickup_done"] } } }),
      prisma.travelPost.count({ where: { status: "scheduled" } }),
      prisma.travelPost.count({ where: { status: "completed" } }),
      prisma.travelPost.count({ where: { status: "cancelled" } }),
      prisma.travelPost.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.travelPost.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.goodsRequest.count(),
      prisma.goodsRequest.count({ where: { status: "pending" } }),
      prisma.goodsRequest.count({ where: { status: "accepted" } }),
      prisma.goodsRequest.count({ where: { status: "delivered" } }),
      prisma.rideRequest.count(),
      prisma.message.count(),
      prisma.notification.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.user.count({ where: { suspended: true } }),
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          drivers: totalDrivers,
          passengers: totalPassengers,
          newToday: newUsersToday,
          suspended: suspendedUsers,
        },
        rides: {
          total: totalRides,
          active: activeRides,
          scheduled: scheduledRides,
          completed: completedRides,
          cancelled: cancelledRides,
          today: todayRides,
          thisWeek: weekRides,
        },
        goods: {
          total: totalGoods,
          pending: pendingGoods,
          accepted: acceptedGoods,
          delivered: deliveredGoods,
        },
        system: {
          bookings: totalBookings,
          messages: totalMessages,
          notifications: totalNotifications,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1 } = req.query;
    const limit = 20;
    const skip = (Number(page) - 1) * limit;

    const where = {
      role: { not: "admin" },
      ...(role && role !== "all" ? { role } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          rating: true,
          totalRatings: true,
          suspended: true,
          createdAt: true,
          _count: { select: { travelPosts: true, rideRequests: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

const toggleSuspend = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.userId) {
      return res.status(400).json({ error: "You cannot suspend your own account" });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role === "admin") {
      return res.status(404).json({ error: "User not found" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { suspended: !user.suspended },
      select: { id: true, suspended: true },
    });

    res.json({ success: true, suspended: updated.suspended });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.userId) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role === "admin") {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.message.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } });
      await tx.rating.deleteMany({ where: { OR: [{ raterId: id }, { ratedUserId: id }] } });
      await tx.otpVerification.deleteMany({ where: { phone: user.phone } }).catch(() => {});
      await tx.driverLocation.deleteMany({ where: { driverId: id } }).catch(() => {});

      await tx.itemRequest.updateMany({
        where: { acceptedByDriver: id },
        data: { status: "cancelled", acceptedByDriver: null, travelPostId: null },
      });
      await tx.itemRequest.updateMany({
        where: { travelPost: { userId: id } },
        data: { status: "cancelled", travelPostId: null },
      });
      await tx.itemRequest.deleteMany({ where: { requesterId: id } });

      await tx.goodsMatch.deleteMany({
        where: {
          OR: [{ driverId: id }, { goodsRequest: { requesterId: id } }, { travelPost: { userId: id } }],
        },
      });
      await tx.rideRequest.deleteMany({
        where: { OR: [{ passengerId: id }, { travelPost: { userId: id } }] },
      });
      await tx.goodsRequest.updateMany({
        where: { driverId: id },
        data: { status: "cancelled", driverId: null, travelPostId: null },
      });
      await tx.goodsRequest.deleteMany({ where: { requesterId: id } });
      await tx.travelPost.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    next(err);
  }
};

const getRides = async (req, res, next) => {
  try {
    const { status, page = 1, search } = req.query;
    const limit = 20;
    const skip = (Number(page) - 1) * limit;
    const where = {
      ...(status && status !== "all" ? { status } : {}),
      ...(search
        ? {
            OR: [
              { from: { contains: search, mode: "insensitive" } },
              { to: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rides, total] = await Promise.all([
      prisma.travelPost.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, phone: true } },
          _count: { select: { rideRequests: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.travelPost.count({ where }),
    ]);

    res.json({ success: true, rides, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

const cancelRide = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.$transaction(async (tx) => {
      await tx.travelPost.update({ where: { id }, data: { status: "cancelled" } });
      await tx.rideRequest.updateMany({
        where: { travelPostId: id, status: { in: ["pending", "requested", "accepted", "ongoing"] } },
        data: { status: "cancelled" },
      });
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const deleteRide = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.$transaction(async (tx) => {
      await tx.rideRequest.deleteMany({ where: { travelPostId: id } });
      await tx.goodsMatch.updateMany({ where: { travelPostId: id }, data: { travelPostId: null } });
      await tx.itemRequest.updateMany({ where: { travelPostId: id }, data: { travelPostId: null } });
      await tx.travelPost.delete({ where: { id } });
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const getGoods = async (req, res, next) => {
  try {
    const { status, page = 1 } = req.query;
    const limit = 20;
    const skip = (Number(page) - 1) * limit;
    const where = status && status !== "all" ? { status } : {};

    const [goods, total] = await Promise.all([
      prisma.goodsRequest.findMany({
        where,
        include: {
          requester: { select: { id: true, name: true, phone: true } },
          matches: {
            include: {
              driver: { select: { id: true, name: true, phone: true } },
              travelPost: { select: { id: true, from: true, to: true, time: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.goodsRequest.count({ where }),
    ]);

    res.json({ success: true, goods, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

const deleteGoods = async (req, res, next) => {
  try {
    await prisma.goodsRequest.update({
      where: { id: Number(req.params.id) },
      data: { status: "cancelled" },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const getBookings = async (req, res, next) => {
  try {
    const { status, page = 1 } = req.query;
    const limit = 20;
    const skip = (Number(page) - 1) * limit;
    const where = status && status !== "all" ? { status } : {};

    const [bookings, total] = await Promise.all([
      prisma.rideRequest.findMany({
        where,
        include: {
          passenger: { select: { id: true, name: true, phone: true } },
          travelPost: {
            select: {
              from: true,
              to: true,
              time: true,
              user: { select: { id: true, name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.rideRequest.count({ where }),
    ]);

    res.json({ success: true, bookings, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getUsers,
  toggleSuspend,
  deleteUser,
  getRides,
  cancelRide,
  deleteRide,
  getGoods,
  deleteGoods,
  getBookings,
};
