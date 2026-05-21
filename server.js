const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();
require("./jobs/cleanupRequests");
require("./jobs/cleanupRides");

const authRoutes = require("./routes/authRoutes");
const travelRoutes = require("./routes/travelRoutes");
const requestRoutes = require("./routes/requestRoutes");
const goodsRoutes = require("./routes/goodsRoutes");
const errorHandler = require("./middleware/errorMiddleware");
const driverRoutes = require("./routes/driverRoutes");
const passengerRoutes = require("./routes/passengerRoutes");
const goodsMatchRoutes = require("./routes/goodsMatchRoutes");
const chatRoutes = require("./routes/chatRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Middleware
app.use(helmet());
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://village-connect-frontend.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow Postman / server-to-server requests
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS blocked"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(express.json());

// Routes (ONLY NEW ARCHITECTURE)
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

// Health check
app.get("/", (req, res) => {
  res.send("API running...");
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
