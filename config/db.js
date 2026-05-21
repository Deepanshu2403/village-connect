require("dotenv").config(); // load .env

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL, // ✅ IMPORTANT
});

module.exports = prisma;