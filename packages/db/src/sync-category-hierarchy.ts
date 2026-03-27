import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "dotenv";
import { resolve } from "path";
import * as schema from "./schema/index.js";
import { syncCanonicalCategoryHierarchy } from "./category-hierarchy.js";

config({ path: resolve(process.cwd(), "../../.env") });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const db = drizzle(pool, { schema });

  console.log("🔄 Syncing canonical category hierarchy...");
  const result = await syncCanonicalCategoryHierarchy(db);

  console.log("✅ Category hierarchy ready");
  console.log(`   Roots   : Lessons (${result.lessonRootId}), Class (${result.classRootId})`);
  console.log(`   Classes : ${Array.from(result.classIdMap.keys()).join(", ")}`);
  console.log(`   Lessons : ${Array.from(result.lessonIdMap.keys()).join(", ")}`);
  console.log(`   Remapped legacy links: ${result.remappedLegacyLinks}`);

  await pool.end();
}

main().catch((error) => {
  console.error("Category sync failed:", error);
  process.exit(1);
});

