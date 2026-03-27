import { and, eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index.js";

export const LESSON_ROOT = {
  name: "Dersler",
  slug: "lessons",
} as const;

export const CLASS_ROOT = {
  name: "Sınıflar",
  slug: "class",
} as const;

export const LESSON_CATEGORIES = [
  { name: "Matematik", slug: "lessons-matematik", orderIndex: 0 },
  { name: "Fizik", slug: "lessons-fizik", orderIndex: 1 },
  { name: "İngilizce", slug: "lessons-ingilizce", orderIndex: 2 },
  { name: "Kimya", slug: "lessons-kimya", orderIndex: 3 },
  { name: "Biyoloji", slug: "lessons-biyoloji", orderIndex: 4 },
  { name: "Türkçe", slug: "lessons-turkce", orderIndex: 5 },
  { name: "Tarih", slug: "lessons-tarih", orderIndex: 6 },
  { name: "Coğrafya", slug: "lessons-cografya", orderIndex: 7 },
] as const;

export const CLASS_CATEGORIES = [
  { name: "9", slug: "class-9", orderIndex: 0 },
  { name: "10", slug: "class-10", orderIndex: 1 },
  { name: "11", slug: "class-11", orderIndex: 2 },
  { name: "12", slug: "class-12", orderIndex: 3 },
] as const;

type DB = NodePgDatabase<typeof schema>;

type CategoryRecord = typeof schema.categories.$inferSelect;

type UpsertCategoryInput = {
  name: string;
  slug: string;
  parentId?: string | null;
  orderIndex?: number;
  description?: string | null;
};

function normalizeCategoryKey(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

const classKeyAliases = new Map<string, string>([
  ["9", "9"],
  ["9sinif", "9"],
  ["10", "10"],
  ["10sinif", "10"],
  ["11", "11"],
  ["11sinif", "11"],
  ["12", "12"],
  ["12sinif", "12"],
]);

const lessonKeyByName = new Map<string, string>(
  LESSON_CATEGORIES.map((lesson) => [normalizeCategoryKey(lesson.name), lesson.name]),
);

async function upsertCategory(db: DB, input: UpsertCategoryInput) {
  const existing = await db.query.categories.findFirst({
    where: (category, { eq }) => eq(category.slug, input.slug),
  });

  if (existing) {
    const needsUpdate =
      existing.name !== input.name ||
      existing.parentId !== (input.parentId ?? null) ||
      existing.orderIndex !== (input.orderIndex ?? 0) ||
      existing.description !== (input.description ?? null);

    if (!needsUpdate) {
      return existing;
    }

    const [updated] = await db
      .update(schema.categories)
      .set({
        name: input.name,
        parentId: input.parentId ?? null,
        orderIndex: input.orderIndex ?? 0,
        description: input.description ?? null,
      })
      .where(eq(schema.categories.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(schema.categories)
    .values({
      name: input.name,
      slug: input.slug,
      parentId: input.parentId ?? null,
      orderIndex: input.orderIndex ?? 0,
      description: input.description ?? null,
    })
    .returning();

  return created;
}

function resolveLegacyClassName(category: CategoryRecord) {
  if (category.parentId) {
    return null;
  }

  const candidates = [normalizeCategoryKey(category.name), normalizeCategoryKey(category.slug)];
  for (const candidate of candidates) {
    const matched = classKeyAliases.get(candidate);
    if (matched) {
      return matched;
    }
  }

  return null;
}

function resolveLegacyLessonName(category: CategoryRecord, categoriesById: Map<string, CategoryRecord>) {
  if (!category.parentId) {
    return null;
  }

  const parent = categoriesById.get(category.parentId);
  if (!parent || !resolveLegacyClassName(parent)) {
    return null;
  }

  const candidates = [
    normalizeCategoryKey(category.name),
    normalizeCategoryKey(category.slug),
    ...LESSON_CATEGORIES.map((lesson) => {
      const lessonKey = normalizeCategoryKey(lesson.name);
      return normalizeCategoryKey(category.slug).endsWith(lessonKey) ? lessonKey : "";
    }).filter(Boolean),
  ];

  for (const candidate of candidates) {
    const matched = lessonKeyByName.get(candidate);
    if (matched) {
      return matched;
    }
  }

  return null;
}

async function remapLegacyCategoryLinks(
  db: DB,
  classIdMap: Map<string, string>,
  lessonIdMap: Map<string, string>,
  canonicalIds: Set<string>,
) {
  const allCategories = await db.select().from(schema.categories);
  const categoriesById = new Map(allCategories.map((category) => [category.id, category]));
  const legacyToCanonical = new Map<string, string>();

  for (const category of allCategories) {
    if (canonicalIds.has(category.id)) {
      continue;
    }

    const className = resolveLegacyClassName(category);
    if (className && classIdMap.has(className)) {
      legacyToCanonical.set(category.id, classIdMap.get(className)!);
      continue;
    }

    const lessonName = resolveLegacyLessonName(category, categoriesById);
    if (lessonName && lessonIdMap.has(lessonName)) {
      legacyToCanonical.set(category.id, lessonIdMap.get(lessonName)!);
    }
  }

  if (legacyToCanonical.size === 0) {
    return 0;
  }

  const categoryLinks = await db.select().from(schema.contentCategories);
  let remappedLinks = 0;

  for (const link of categoryLinks) {
    const canonicalCategoryId = legacyToCanonical.get(link.categoryId);
    if (!canonicalCategoryId || canonicalCategoryId === link.categoryId) {
      continue;
    }

    await db
      .insert(schema.contentCategories)
      .values({
        contentId: link.contentId,
        categoryId: canonicalCategoryId,
      })
      .onConflictDoNothing();

    await db
      .delete(schema.contentCategories)
      .where(
        and(
          eq(schema.contentCategories.contentId, link.contentId),
          eq(schema.contentCategories.categoryId, link.categoryId),
        ),
      );

    remappedLinks += 1;
  }

  const legacyCategories = allCategories
    .filter((category) => legacyToCanonical.has(category.id))
    .sort((a, b) => {
      const aDepth = a.parentId && legacyToCanonical.has(a.parentId) ? 1 : 0;
      const bDepth = b.parentId && legacyToCanonical.has(b.parentId) ? 1 : 0;
      return bDepth - aDepth;
    });

  for (const legacyCategory of legacyCategories) {
    await db.delete(schema.categories).where(eq(schema.categories.id, legacyCategory.id));
  }

  return remappedLinks;
}

export async function syncCanonicalCategoryHierarchy(db: DB) {
  const lessonRoot = await upsertCategory(db, {
    name: LESSON_ROOT.name,
    slug: LESSON_ROOT.slug,
    orderIndex: 0,
  });

  const classRoot = await upsertCategory(db, {
    name: CLASS_ROOT.name,
    slug: CLASS_ROOT.slug,
    orderIndex: 1,
  });

  const classIdMap = new Map<string, string>();
  for (const classCategory of CLASS_CATEGORIES) {
    const record = await upsertCategory(db, {
      ...classCategory,
      parentId: classRoot.id,
    });
    classIdMap.set(classCategory.name, record.id);
  }

  const lessonIdMap = new Map<string, string>();
  for (const lessonCategory of LESSON_CATEGORIES) {
    const record = await upsertCategory(db, {
      ...lessonCategory,
      parentId: lessonRoot.id,
    });
    lessonIdMap.set(lessonCategory.name, record.id);
  }

  const canonicalIds = new Set<string>([
    lessonRoot.id,
    classRoot.id,
    ...Array.from(classIdMap.values()),
    ...Array.from(lessonIdMap.values()),
  ]);

  const remappedLegacyLinks = await remapLegacyCategoryLinks(
    db,
    classIdMap,
    lessonIdMap,
    canonicalIds,
  );

  return {
    lessonRootId: lessonRoot.id,
    classRootId: classRoot.id,
    classIdMap,
    lessonIdMap,
    remappedLegacyLinks,
  };
}


