// Seeds one admin account and one sample doctor so you can log in and
// explore immediately after setup. Run with: npm run prisma:seed
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("Admin@12345", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@clinic.com" },
    update: {},
    create: {
      name: "Clinic Admin",
      email: "admin@clinic.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const doctorPassword = await bcrypt.hash("Doctor@12345", 10);
  const doctorUser = await prisma.user.upsert({
    where: { email: "dr.smith@clinic.com" },
    update: {},
    create: {
      name: "Sarah Smith",
      email: "dr.smith@clinic.com",
      passwordHash: doctorPassword,
      role: "DOCTOR",
    },
  });

  const existingDoctor = await prisma.doctor.findUnique({ where: { userId: doctorUser.id } });
  if (!existingDoctor) {
    await prisma.doctor.create({
      data: {
        userId: doctorUser.id,
        specialisation: "General Medicine",
        slotDurationMinutes: 30,
        workingHours: {
          create: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
            dayOfWeek,
            startTime: "09:00",
            endTime: "17:00",
          })),
        },
      },
    });
  }

  console.log("Seed complete.");
  console.log("Admin login:  admin@clinic.com / Admin@12345");
  console.log("Doctor login: dr.smith@clinic.com / Doctor@12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
