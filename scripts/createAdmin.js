const prisma = require("../config/db");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function main() {
  const phone = process.argv[2] || "9000000000";
  const password = process.argv[3] || "Admin@123";
  const name = "Admin";

  const existing = await prisma.user.findUnique({ where: { phone } });

  if (existing) {
    if (existing.role === "admin") {
      console.log("Admin already exists. ID:", existing.id);
    } else {
      await prisma.user.update({ where: { phone }, data: { role: "admin", suspended: false } });
      console.log("User promoted to admin. Phone:", phone);
    }
    await prisma.$disconnect();
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: { name, phone, password: hash, role: "admin" },
  });

  console.log("Admin created successfully");
  console.log("Phone:", phone);
  console.log("Password:", password);
  console.log("ID:", admin.id);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Failed:", err.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
