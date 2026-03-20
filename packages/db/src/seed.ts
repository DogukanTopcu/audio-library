import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "dotenv";
import { resolve } from "path";
import * as bcrypt from "bcryptjs";
import * as schema from "./schema/index.js";

config({ path: resolve(process.cwd(), "../../.env") });

const SEED_CREDENTIALS = {
  superadmin: {
    name: "Super Admin",
    email: "admin@ozanbayir.com",
    password: "Admin123!",
    role: "SUPERADMIN" as const,
  },
  user: {
    name: "Test Kullanıcı",
    email: "kullanici@ozanbayir.com",
    password: "Kullanici123!",
    tcId: "12345678901",
    disabilityDocumentKey: "documents/seed/placeholder.pdf",
  },
};

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const db = drizzle(pool, { schema });

  console.log("🌱 Seeding database...\n");

  // ── Superadmin ───────────────────────────────────────────────────────
  const existingAdmin = await db.query.admins.findFirst({
    where: (a, { eq }) => eq(a.email, SEED_CREDENTIALS.superadmin.email),
  });

  if (existingAdmin) {
    console.log(`⚠️  Admin already exists: ${SEED_CREDENTIALS.superadmin.email}`);
  } else {
    const passwordHash = await bcrypt.hash(SEED_CREDENTIALS.superadmin.password, 12);
    await db.insert(schema.admins).values({
      name: SEED_CREDENTIALS.superadmin.name,
      email: SEED_CREDENTIALS.superadmin.email,
      passwordHash,
      role: "SUPERADMIN",
    });
    console.log(`✅ Superadmin created: ${SEED_CREDENTIALS.superadmin.email}`);
  }

  // ── App User (ACTIVE) ────────────────────────────────────────────────
  const existingUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, SEED_CREDENTIALS.user.email),
  });

  if (existingUser) {
    console.log(`⚠️  User already exists: ${SEED_CREDENTIALS.user.email}`);
  } else {
    const passwordHash = await bcrypt.hash(SEED_CREDENTIALS.user.password, 12);
    const [user] = await db.insert(schema.users).values({
      name: SEED_CREDENTIALS.user.name,
      email: SEED_CREDENTIALS.user.email,
      passwordHash,
      tcId: SEED_CREDENTIALS.user.tcId,
      disabilityDocumentKey: SEED_CREDENTIALS.user.disabilityDocumentKey,
      status: "ACTIVE",          // pre-verified for testing
      legalConsentAcceptedAt: new Date(),
    }).returning({ id: schema.users.id });

    // Create agent profile
    await db.insert(schema.userAgentProfiles).values({ userId: user.id });

    console.log(`✅ App user created: ${SEED_CREDENTIALS.user.email}`);
  }

  console.log("\n📋 Credentials:");
  console.log("─────────────────────────────────────────");
  console.log("  SUPERADMIN (admin panel → /login)");
  console.log(`  Email    : ${SEED_CREDENTIALS.superadmin.email}`);
  console.log(`  Password : ${SEED_CREDENTIALS.superadmin.password}`);
  console.log("");
  console.log("  APP USER (web app → /giris)");
  console.log(`  Email    : ${SEED_CREDENTIALS.user.email}`);
  console.log(`  Password : ${SEED_CREDENTIALS.user.password}`);
  console.log("─────────────────────────────────────────\n");

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
