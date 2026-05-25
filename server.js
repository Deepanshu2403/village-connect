const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
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
const errorHandler = require("./middleware/errorMiddleware");

const app = express();
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
app.use("/api/travel", travelRoutes);
app.use("/api/request", requestRoutes);
app.use("/api/goods", goodsRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/passenger", passengerRoutes);
app.use("/api/goods-match", goodsMatchRoutes);
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

    server = app.listen(PORT, "0.0.0.0");
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
  startServer,
  shutdown,
};
