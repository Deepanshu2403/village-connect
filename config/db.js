require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prismaStateKey = Symbol.for("village-connect.prisma");

function withConnectionOptions(rawUrl, { pooled = true } = {}) {
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);

    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
      return rawUrl;
    }

    url.searchParams.set("sslmode", "require");
    url.searchParams.set("connect_timeout", "15");

    if (pooled) {
      url.searchParams.set("pgbouncer", "true");
    } else {
      url.searchParams.delete("pgbouncer");
    }

    return url.toString();
  } catch (err) {
    console.error("[PRISMA] Invalid DATABASE_URL:", err.message);
    return rawUrl;
  }
}

const databaseUrl = withConnectionOptions(process.env.DATABASE_URL, { pooled: true });
const directUrl = withConnectionOptions(process.env.DIRECT_URL || process.env.DATABASE_URL, {
  pooled: false,
});

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

if (directUrl) {
  process.env.DIRECT_URL = directUrl;
}

const prismaLog = [
  { emit: "event", level: "error" },
  { emit: process.env.NODE_ENV === "production" ? "event" : "stdout", level: "warn" },
];

const globalForPrisma = globalThis;

if (!globalForPrisma[prismaStateKey]) {
  globalForPrisma[prismaStateKey] = {
    prisma: new PrismaClient({
      log: prismaLog,
      datasources: databaseUrl
        ? {
            db: {
              url: databaseUrl,
            },
          }
        : undefined,
    }),
    connected: false,
    connecting: null,
  };
}

const state = globalForPrisma[prismaStateKey];
const prisma = state.prisma;

prisma.$on?.("error", (event) => {
  const message = event?.message || "";
  if (message.includes("kind: Closed")) {
    console.warn("[PRISMA] Database connection was closed by the server; Prisma will reconnect on demand.");
    return;
  }
  console.error("[PRISMA] Client error:", message);
});

async function connectPrisma() {
  if (state.connected) return prisma;
  if (state.connecting) return state.connecting;

  state.connecting = prisma
    .$connect()
    .then(() => {
      state.connected = true;
      console.log("[PRISMA] Connected to Neon database");
      return prisma;
    })
    .catch((err) => {
      state.connected = false;
      console.error("[PRISMA] Connection failed:", err.message);
      throw err;
    })
    .finally(() => {
      state.connecting = null;
    });

  return state.connecting;
}

async function disconnectPrisma() {
  if (!state.connected && !state.connecting) return;

  try {
    await prisma.$disconnect();
    state.connected = false;
    console.log("[PRISMA] Disconnected");
  } catch (err) {
    console.error("[PRISMA] Disconnect failed:", err.message);
  }
}

module.exports = prisma;
module.exports.prisma = prisma;
module.exports.connectPrisma = connectPrisma;
module.exports.disconnectPrisma = disconnectPrisma;
module.exports.withConnectionOptions = withConnectionOptions;
