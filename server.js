const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { Server } = require("socket.io");
require("dotenv").config();

const { connectPrisma, disconnectPrisma } = require("./config/db");
const { startCronJobs, stopCronJobs } = require("./jobs");
const authRoutes = require("./routes/authRoutes");
const travelRoutes = require("./routes/travelRoutes");
const requestRoutes = require("./routes/requestRoutes");
const goodsRoutes = require("./routes/goodsRoutes");
const driverRoutes = require("./routes/driverRoutes");
const passengerRoutes = require("./routes/passengerRoutes");
const goodsMatchRoutes = require("./routes/goodsMatchRoutes");
const chatRoutes = require("./routes/chatRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const otpRoutes = require("./routes/otpRoutes");
const locationRoutes = require("./routes/locationRoutes");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();
const httpServer = http.createServer(app);
let server;
let shuttingDown = false;

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.startsWith("http://localhost")) return callback(null, true);
    if (origin.startsWith("http://127.0.0.1")) return callback(null, true);
    if (origin.endsWith(".vercel.app")) return callback(null, true);
    console.warn("[CORS] Blocked origin", { origin });
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const io = new Server(httpServer, {
  cors: {
    origin: corsOptions.origin,
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.set("io", io);
global.io = io;

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userId;
  console.log(`[SOCKET] User ${userId} connected`);

  socket.join(`user:${userId}`);

  socket.on("join:ride", (rideId) => {
    socket.join(`ride:${rideId}`);
    console.log(`[SOCKET] User ${userId} joined ride room ${rideId}`);
  });

  socket.on("leave:ride", (rideId) => {
    socket.leave(`ride:${rideId}`);
  });

  socket.on("chat:send", async (data) => {
    const { receiverId, text } = data || {};
    if (!text?.trim() || !receiverId) return;

    try {
      const prisma = require("./config/db");
      const message = await prisma.message.create({
        data: {
          senderId: userId,
          receiverId: Number(receiverId),
          text: text.trim(),
        },
        include: {
          sender: { select: { id: true, name: true } },
        },
      });

      const createNotification = require("./utils/createNotification");
      await createNotification(
        Number(receiverId),
        `${message.sender?.name || "Someone"} sent you a message`,
        `/chat/${userId}`,
        "MESSAGE"
      );

      io.to(`user:${receiverId}`).emit("chat:message", message);
      socket.emit("chat:message", message);
    } catch (err) {
      console.error("[SOCKET] Chat send failed:", err.message);
      socket.emit("chat:error", { error: "Failed to send message" });
    }
  });

  socket.on("location:update", async (data) => {
    const { lat, lng, travelPostId } = data || {};
    if (!lat || !lng || socket.userRole !== "driver") return;

    try {
      const prisma = require("./config/db");
      const cleanTravelPostId = travelPostId ? Number(travelPostId) : null;
      await prisma.driverLocation.upsert({
        where: { driverId: userId },
        update: { lat: Number(lat), lng: Number(lng), travelPostId: cleanTravelPostId },
        create: {
          driverId: userId,
          lat: Number(lat),
          lng: Number(lng),
          travelPostId: cleanTravelPostId,
        },
      });

      if (travelPostId) {
        io.to(`ride:${travelPostId}`).emit("location:update", {
          driverId: userId,
          lat: Number(lat),
          lng: Number(lng),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("[SOCKET] Location update failed:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[SOCKET] User ${userId} disconnected`);
  });
});

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Village Connect API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/ready", async (req, res, next) => {
  try {
    await connectPrisma();
    res.json({ status: "ok", database: "ready" });
  } catch (err) {
    next(err);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/travel", travelRoutes);
app.use("/api/request", requestRoutes);
app.use("/api/goods", goodsRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/passenger", passengerRoutes);
app.use("/api/goods-match", goodsMatchRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/*", (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

const closeHttpServer = () =>
  new Promise((resolve) => {
    if (!server || !server.listening) return resolve();

    server.close((err) => {
      if (err) {
        console.error("[SERVER] HTTP close failed:", err.message);
      } else {
        console.log("[SERVER] HTTP server closed");
      }
      resolve();
    });
  });

const shutdown = async (reason, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log("[SERVER] Shutting down", { reason });

  const forceExit = setTimeout(() => {
    console.error("[SERVER] Forced shutdown after timeout");
    process.exit(exitCode || 1);
  }, 10000);
  forceExit.unref?.();

  try {
    stopCronJobs();
    await closeHttpServer();
    await disconnectPrisma();
    clearTimeout(forceExit);
    if (exitCode) process.exit(exitCode);
  } catch (err) {
    console.error("[SERVER] Shutdown failed:", err.message);
    clearTimeout(forceExit);
    process.exit(exitCode || 1);
  }
};

process.on("uncaughtException", (err) => {
  console.error("[PROCESS] Uncaught exception:", err);
  shutdown("uncaughtException", 1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[PROCESS] Unhandled rejection:", reason);
  shutdown("unhandledRejection", 1);
});

process.on("SIGINT", () => {
  shutdown("SIGINT", 0);
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM", 0);
});

const startServer = async () => {
  const PORT = process.env.PORT || 5000;

  await connectPrisma();

  await new Promise((resolve, reject) => {
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    const onError = (err) => {
      server.off("listening", onListening);
      reject(err);
    };

    server = httpServer.listen(PORT, "0.0.0.0");
    server.once("listening", onListening);
    server.once("error", onError);
  });

  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[SERVER] NODE_ENV: ${process.env.NODE_ENV || "development"}`);
  console.log(`[SERVER] DB: ${process.env.DATABASE_URL ? "configured" : "MISSING DATABASE_URL"}`);
  console.log(`[SERVER] JWT: ${process.env.JWT_SECRET ? "set" : "MISSING JWT_SECRET"}`);

  server.on("error", (err) => {
    console.error("[SERVER] HTTP server error:", err);
    shutdown("serverError", 1);
  });

  startCronJobs();
};

if (require.main === module) {
  startServer().catch((err) => {
    console.error("[SERVER] Startup failed:", err);
    shutdown("startupFailure", 1);
  });
}

module.exports = {
  app,
  httpServer,
  startServer,
  shutdown,
};
