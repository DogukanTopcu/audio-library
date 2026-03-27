import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { config } from "dotenv";
import { resolve } from "path";
import * as bcrypt from "bcryptjs";
import * as schema from "./schema/index.js";
import { syncCanonicalCategoryHierarchy } from "./category-hierarchy.js";

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

interface ContentData {
  title: string;
  type: "TEXTBOOK" | "NOVEL" | "PRACTICE_TEST" | "QUESTION_BANK" | "OTHER";
  description: string;
  author: string;
  publisher: string;
  chapters: ChapterData[];
}

interface ChapterData {
  title: string;
  description: string;
  audioRecords: AudioRecordData[];
  subChapters?: ChapterData[];
}

interface AudioRecordData {
  title: string;
  type: "TOPIC_INTRO" | "QUESTION" | "EXPLANATION" | "STORY_PASSAGE" | "OTHER";
  bucketKey: string;
  durationSeconds: number;
  transcript: string;
}

const SAMPLE_CONTENT: ContentData[] = [
  {
    title: "Matematik 9 - Cebir Temelleri",
    type: "TEXTBOOK",
    description: "9. sınıf matematik dersi - Cebir ve denklemler konularını kapsar",
    author: "Öğretmen Ayşe Yılmaz",
    publisher: "Eğitim Yayınları",
    chapters: [
      {
        title: "Bölüm 1: Temel Sayı Kavramları",
        description: "Doğal sayılar, tam sayılar ve rasyonel sayılar",
        audioRecords: [
          {
            title: "Doğal Sayılara Giriş",
            type: "TOPIC_INTRO",
            bucketKey: "audio/math9/chapter1/natural-numbers-intro.mp3",
            durationSeconds: 480,
            transcript: "Doğal sayılar 1, 2, 3, 4... şeklinde başlayan ve sonsuza kadar devam eden sayılardır. Günlük hayatımızda nesneleri saymak için kullanırız.",
          },
          {
            title: "Tam Sayılar",
            type: "TOPIC_INTRO",
            bucketKey: "audio/math9/chapter1/integers.mp3",
            durationSeconds: 420,
            transcript: "Tam sayılar negatif sayıları, sıfırı ve pozitif sayıları içerir. ...-3, -2, -1, 0, 1, 2, 3...",
          },
        ],
        subChapters: [
          {
            title: "1.1 İşlemler ve Özellikleri",
            description: "Toplama, çıkarma, çarpma ve bölme işlemleri",
            audioRecords: [
              {
                title: "Toplama İşlemi",
                type: "TOPIC_INTRO",
                bucketKey: "audio/math9/chapter1.1/addition.mp3",
                durationSeconds: 360,
                transcript: "Toplama işlemi iki ya da daha fazla sayıyı bir araya getirmedir. 2 + 3 = 5",
              },
            ],
          },
        ],
      },
      {
        title: "Bölüm 2: Denklemler",
        description: "Birinci dereceden denklemler ve çözümler",
        audioRecords: [
          {
            title: "Denklem Kavramı",
            type: "TOPIC_INTRO",
            bucketKey: "audio/math9/chapter2/equations-intro.mp3",
            durationSeconds: 500,
            transcript: "Denklem, eşitlik işareti içeren ve bilinmeyen değer taşıyan matematiksel ifadedir. x + 5 = 12",
          },
        ],
      },
    ],
  },
  {
    title: "Fizik 10 - Hareket ve Kuvvet",
    type: "TEXTBOOK",
    description: "10. sınıf fizik dersi - Klasik mekanik ve hareket kanunları",
    author: "Prof. Mehmet Demir",
    publisher: "Bilim Yayınları",
    chapters: [
      {
        title: "Bölüm 1: Newton Kanunları",
        description: "Newton'un hareket ve kuvvet kanunları",
        audioRecords: [
          {
            title: "Newton'un Birinci Kanunu",
            type: "TOPIC_INTRO",
            bucketKey: "audio/physics10/chapter1/newton-first-law.mp3",
            durationSeconds: 540,
            transcript: "Bir cisim dış kuvvet etkisi altında değilse, hareketsizse hareketsiz kalır, hareketseyse düzgün hızlı hareket eder.",
          },
          {
            title: "Newton'un İkinci Kanunu",
            type: "TOPIC_INTRO",
            bucketKey: "audio/physics10/chapter1/newton-second-law.mp3",
            durationSeconds: 600,
            transcript: "Kuvvet eşittir kütle çarpı ivme. F = m × a. Bu kanun hareketin temel denklemidir.",
          },
        ],
      },
      {
        title: "Bölüm 2: Enerji",
        description: "Potansiyel ve kinetik enerji",
        audioRecords: [
          {
            title: "Kinetik Enerji",
            type: "TOPIC_INTRO",
            bucketKey: "audio/physics10/chapter2/kinetic-energy.mp3",
            durationSeconds: 480,
            transcript: "Kinetik enerji hareket eden cisimlerin sahip olduğu enerjidir. Ek = 1/2 × m × v²",
          },
        ],
      },
    ],
  },
  {
    title: "İngilizce 11 - İşletme Dili",
    type: "TEXTBOOK",
    description: "11. sınıf İngilizce - İşletme ve ticari kontekstler",
    author: "İngilizce Bölümü",
    publisher: "Dil Yayınları",
    chapters: [
      {
        title: "Bölüm 1: Mesleki Sohbet",
        description: "Profesyonel ortamlarda konuşma",
        audioRecords: [
          {
            title: "Merhabalaşma",
            type: "STORY_PASSAGE",
            bucketKey: "audio/english11/chapter1/greetings.mp3",
            durationSeconds: 300,
            transcript: "Good morning. How are you today? I'm fine, thank you. And you? Everything is good.",
          },
          {
            title: "İş Görüşmesi Örneği",
            type: "STORY_PASSAGE",
            bucketKey: "audio/english11/chapter1/business-interview.mp3",
            durationSeconds: 720,
            transcript: "Tell me about your background. I have 5 years of experience in marketing. I led several successful campaigns.",
          },
        ],
      },
    ],
  },
];

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

  let userId: string;
  if (existingUser) {
    console.log(`⚠️  User already exists: ${SEED_CREDENTIALS.user.email}`);
    userId = existingUser.id;
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

    userId = user.id;

    // Create agent profile
    await db.insert(schema.userAgentProfiles).values({ userId: user.id });

    console.log(`✅ App user created: ${SEED_CREDENTIALS.user.email}`);
  }

  // ── Content, Chapters, Audio Records & Questions ──────────────────────
  console.log("\n📚 Seeding content, chapters, and audio records...");

  for (const contentData of SAMPLE_CONTENT) {
    // Check if content already exists
    const existingContent = await db.query.content.findFirst({
      where: (c, { eq }) => eq(c.title, contentData.title),
    });

    if (existingContent) {
      console.log(`⚠️  Content already exists: ${contentData.title}`);
      continue;
    }

    // Create content
    const [createdContent] = await db.insert(schema.content).values({
      title: contentData.title,
      type: contentData.type,
      description: contentData.description,
      author: contentData.author,
      publisher: contentData.publisher,
      coverImageKey: `images/content/${contentData.title.replace(/\s+/g, "-").toLowerCase()}/cover.jpg`,
      isActive: true,
      metadata: { subject: contentData.title.split(" -")[0] },
    }).returning({ id: schema.content.id });

    console.log(`✅ Content created: ${contentData.title}`);

    // Recursively create chapters and audio records
    const createChapters = async (chapters: ChapterData[], parentId: string | null, contentId: string) => {
      for (let i = 0; i < chapters.length; i++) {
        const chapterData = chapters[i];
        const [createdChapter] = await db.insert(schema.chapters).values({
          contentId,
          parentId,
          title: chapterData.title,
          description: chapterData.description,
          orderIndex: i,
        }).returning({ id: schema.chapters.id });

        console.log(`  ✓ Chapter created: ${chapterData.title}`);

        // Create audio records for this chapter
        for (let j = 0; j < chapterData.audioRecords.length; j++) {
          const audioData = chapterData.audioRecords[j];
          const [audioRecord] = await db.insert(schema.audioRecords).values({
            chapterId: createdChapter.id,
            title: audioData.title,
            type: audioData.type,
            bucketKey: audioData.bucketKey,
            durationSeconds: audioData.durationSeconds,
            transcript: audioData.transcript,
            orderIndex: j,
            metadata: { format: "mp3" },
          }).returning({ id: schema.audioRecords.id });

          console.log(`    ✓ Audio record created: ${audioData.title}`);

          // Create sample questions for this audio record if it's a question type
          if (audioData.type === "QUESTION") {
            const correctChoiceIndex = Math.floor(Math.random() * 4);
            const choices = [
              { text: "Seçenek A", index: 0 },
              { text: "Seçenek B", index: 1 },
              { text: "Seçenek C", index: 2 },
              { text: "Seçenek D", index: 3 },
            ];

            const [question] = await db.insert(schema.questions).values({
              audioRecordId: audioRecord.id,
              chapterId: createdChapter.id,
              correctChoiceIndex,
              orderIndex: j,
              difficultyLevel: ["EASY", "MEDIUM", "HARD"][j % 3] as any,
              topicTags: [chapterData.title.toLowerCase()],
            }).returning({ id: schema.questions.id });

            // Create question choices
            for (const choice of choices) {
              const [choiceAudio] = await db.insert(schema.audioRecords).values({
                chapterId: createdChapter.id,
                title: `${audioData.title} - ${choice.text}`,
                type: "OTHER",
                bucketKey: `audio/questions/choices/${audioRecord.id}-${choice.index}.mp3`,
                durationSeconds: 300,
                orderIndex: choice.index,
              }).returning({ id: schema.audioRecords.id });

              await db.insert(schema.questionChoices).values({
                questionId: question.id,
                choiceIndex: choice.index,
                audioRecordId: choiceAudio.id,
                choiceText: choice.text,
              });
            }
          }
        }

        // Create subchapters recursively
        if (chapterData.subChapters && chapterData.subChapters.length > 0) {
          await createChapters(chapterData.subChapters, createdChapter.id, contentId);
        }
      }
    }

    await createChapters(contentData.chapters, null, createdContent.id);
  }

  // ── Categories (Lessons + Class roots) ────────────────────────────────
  console.log("\n📂 Seeding categories...");
  const { classIdMap, lessonIdMap, remappedLegacyLinks } = await syncCanonicalCategoryHierarchy(db);
  console.log(`✅ Canonical category roots ready: Lessons + Class`);
  if (remappedLegacyLinks > 0) {
    console.log(`  ✓ Remapped ${remappedLegacyLinks} legacy category link(s)`);
  }

  // Assign content to categories
  console.log("\n🏷️  Assigning content to categories...");

  const contentCategoryAssignments: { title: string; className: string; lessonNames: string[] }[] = [
    { title: "Matematik 9 - Cebir Temelleri", className: "9", lessonNames: ["Matematik"] },
    { title: "Fizik 10 - Hareket ve Kuvvet", className: "10", lessonNames: ["Fizik"] },
    { title: "İngilizce 11 - İşletme Dili", className: "11", lessonNames: ["İngilizce"] },
  ];

  for (const assignment of contentCategoryAssignments) {
    const existingContent = await db.query.content.findFirst({
      where: (c, { eq }) => eq(c.title, assignment.title),
    });
    if (!existingContent) continue;

    const classId = classIdMap.get(assignment.className);
    const lessonIds = assignment.lessonNames
      .map((lessonName) => lessonIdMap.get(lessonName))
      .filter((lessonId): lessonId is string => Boolean(lessonId));
    if (!classId || lessonIds.length === 0) continue;

    // Clear existing assignments and assign class + lesson(s)
    await db.delete(schema.contentCategories).where(
      eq(schema.contentCategories.contentId, existingContent.id)
    );
    await db.insert(schema.contentCategories).values([
      { contentId: existingContent.id, categoryId: classId },
      ...lessonIds.map((lessonId) => ({
        contentId: existingContent.id,
        categoryId: lessonId,
      })),
    ]).onConflictDoNothing();
    console.log(`  ✓ ${assignment.title} → Class/${assignment.className} + Lessons/${assignment.lessonNames.join(", ")}`);
  }

  // Create sample questions for testing
  console.log("\n❓ Seeding practice questions...");
  
  const allAudioRecords = await db.query.audioRecords.findMany({
    limit: 10,
  });

  for (let i = 0; i < Math.min(5, allAudioRecords.length); i++) {
    const audioRecord = allAudioRecords[i];
    
    // Get the chapter for this audio record
    const chapter = await db.query.chapters.findFirst({
      where: (c, { eq }) => eq(c.id, audioRecord.chapterId),
    });

    if (!chapter) continue;

    // Check if question already exists
    const existingQuestion = await db.query.questions.findFirst({
      where: (q, { eq }) => eq(q.audioRecordId, audioRecord.id),
    });

    if (existingQuestion) continue;

    const correctChoiceIndex = Math.floor(Math.random() * 4);
    const difficulties: ("EASY" | "MEDIUM" | "HARD")[] = ["EASY", "MEDIUM", "HARD"];
    
    const [question] = await db.insert(schema.questions).values({
      audioRecordId: audioRecord.id,
      chapterId: chapter.id,
      correctChoiceIndex,
      orderIndex: i,
      difficultyLevel: difficulties[i % 3],
      topicTags: [chapter.title.toLowerCase()],
    }).returning({ id: schema.questions.id });

    // Create choice audio records
    for (let choiceIdx = 0; choiceIdx < 4; choiceIdx++) {
      const [choiceAudio] = await db.insert(schema.audioRecords).values({
        chapterId: chapter.id,
        title: `Question Choice ${choiceIdx + 1}`,
        type: "OTHER",
        bucketKey: `audio/questions/${question.id}/choice-${choiceIdx}.mp3`,
        durationSeconds: Math.floor(Math.random() * 60) + 180,
        orderIndex: choiceIdx,
      }).returning({ id: schema.audioRecords.id });

      const choiceTexts = [
        "Doğru cevap budur",
        "Yanılış seçenek 1",
        "Yanılış seçenek 2",
        "Yanılış seçenek 3",
      ];

      await db.insert(schema.questionChoices).values({
        questionId: question.id,
        choiceIndex: choiceIdx,
        audioRecordId: choiceAudio.id,
        choiceText: choiceTexts[choiceIdx],
      });
    }

    console.log(`  ✓ Question created for: ${audioRecord.title}`);
  }

  // Add user progress data for testing
  console.log("\n📊 Seeding user progress data...");

  const userAudioRecords = await db.query.audioRecords.findMany({
    limit: 8,
  });

  for (let i = 0; i < userAudioRecords.length; i++) {
    const audioRecord = userAudioRecords[i];
    
    // Create progress records
    await db.insert(schema.userProgress).values({
      userId,
      audioRecordId: audioRecord.id,
      positionSeconds: Math.floor(Math.random() * audioRecord.durationSeconds!),
      isCompleted: i < 4, // Mark first 4 as completed
    }).catch(() => {}); // Ignore duplicate key errors

    console.log(`  ✓ Progress tracked for: ${audioRecord.title}`);
  }

  // Add user question answers for testing
  console.log("\n❓ Seeding user question answers...");

  const userQuestions = await db.query.questions.findMany({
    limit: 6,
  });

  for (let i = 0; i < userQuestions.length; i++) {
    const question = userQuestions[i];
    const selectedChoiceIndex = Math.floor(Math.random() * 4);
    const isCorrect = selectedChoiceIndex === question.correctChoiceIndex;

    await db.insert(schema.userQuestionAnswers).values({
      userId,
      questionId: question.id,
      selectedChoiceIndex,
      isCorrect,
      attemptCount: isCorrect ? 1 : Math.floor(Math.random() * 3) + 1,
      timeSpentSeconds: Math.floor(Math.random() * 120) + 30,
      metadata: {
        difficulty: question.difficultyLevel,
        topicTags: question.topicTags,
      },
    }).catch(() => {}); // Ignore duplicate key errors

    console.log(`  ✓ Question answer recorded: ${isCorrect ? '✅ Correct' : '❌ Wrong'}`);
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
