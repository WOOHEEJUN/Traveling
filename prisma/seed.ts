import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { APP_USERS } from "../src/lib/users";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const u of APP_USERS) {
    await prisma.user.upsert({
      where: { role: u.role },
      update: { name: u.name },
      create: { role: u.role, name: u.name },
    });
  }
  console.log(
    "사용자 시드 완료:",
    APP_USERS.map((u) => u.name).join(", "),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
