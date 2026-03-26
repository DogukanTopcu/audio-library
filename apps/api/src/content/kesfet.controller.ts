import {
  Controller,
  Get,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../../packages/db/src/schema/index.js';
import { eq, and } from 'drizzle-orm';

type DB = NodePgDatabase<typeof schema>;

@UseGuards(JwtAuthGuard)
@Controller('kesfet')
export class KesfetController {
  constructor(@Inject(DRIZZLE) private readonly db: DB) {}

  /**
   * GET /kesfet/:contentId
   * 
   * THE KESFET DETAILS PAGE
   * When user clicks on a book in kesfet, this page shows:
   * 
   * 1. All chapters and subchapters robustly (hierarchical tree)
   * 2. Audio Player section (Ders Dinle)
   *    - Track user progress on listened subjects
   *    - Display progress on each chapter
   *    - Navigate to audio player
   * 3. Question Bank section (Soru Çöz)
   *    - Track user progress on solved questions
   *    - Display progress on each chapter
   *    - Navigate to question bank
   * 4. İlerleme section
   *    - Incorrectly answered questions for retry
   */
  @Get(':contentId')
  async getKesfetDetails(
    @Param('contentId') contentId: string,
    @CurrentUser('id') userId: string,
  ) {
    // Get the book/content
    const content = await this.db.query.content.findFirst({
      where: eq(schema.content.id, contentId),
    });

    if (!content) {
      throw new Error('Content not found');
    }

    // Get all chapters (hierarchical)
    const allChapters = await this.db.query.chapters.findMany({
      where: eq(schema.chapters.contentId, contentId),
    });

    // Build tree with full details including both audio and questions
    const buildChaptersWithDetails = async (
      chapters: (typeof allChapters)[0][],
      parentId: string | null = null,
    ): Promise<any[]> => {
      return Promise.all(
        chapters
          .filter((c) => c.parentId === parentId)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map(async (chapter) => {
            // ===== AUDIO PLAYER SECTION (Ders Dinle) =====
            // Get all audio records for this chapter
            const audioRecords = await this.db.query.audioRecords.findMany({
              where: eq(schema.audioRecords.chapterId, chapter.id),
            });

            // Get user progress on these audios
            const userAudioProgress = await Promise.all(
              audioRecords.map((audio) =>
                this.db.query.userProgress.findFirst({
                  where: and(
                    eq(schema.userProgress.userId, userId),
                    eq(schema.userProgress.audioRecordId, audio.id),
                  ),
                }),
              ),
            );

            const completedAudio = userAudioProgress.filter((p) => p?.isCompleted).length;
            const lastListenedAudio = userAudioProgress
              .filter((p) => p)
              .sort((a, b) => b!.updatedAt.getTime() - a!.updatedAt.getTime())[0];

            // ===== QUESTION BANK SECTION (Soru Çöz) =====
            // Get all questions for this chapter
            const questions = await this.db.query.questions.findMany({
              where: eq(schema.questions.chapterId, chapter.id),
            });

            // Get user question answers
            const userAnswers = await this.db.query.userQuestionAnswers.findMany({
              where: eq(schema.userQuestionAnswers.userId, userId),
            });

            const chapterAnswers = userAnswers.filter((a) =>
              questions.some((q) => q.id === a.questionId),
            );
            const correctAnswers = chapterAnswers.filter((a) => a.isCorrect).length;
            const incorrectAnswers = chapterAnswers.filter((a) => !a.isCorrect);
            const lastSolvedQuestion = chapterAnswers.sort(
              (a, b) => b.answeredAt.getTime() - a.answeredAt.getTime(),
            )[0];

            return {
              // ===== CHAPTER INFO =====
              id: chapter.id,
              title: chapter.title,
              description: chapter.description,
              orderIndex: chapter.orderIndex,

              // ===== DERS DINLE (Audio Player) SECTION =====
              dersDinle: {
                section: 'Ders Dinle',
                description: `${chapter.title} - Dersi Dinle`,
                audioRecords: audioRecords.map((audio, idx) => ({
                  id: audio.id,
                  title: audio.title,
                  type: audio.type,
                  durationSeconds: audio.durationSeconds,
                  orderIndex: audio.orderIndex,
                  progress: userAudioProgress[idx]
                    ? {
                        positionSeconds: userAudioProgress[idx]!.positionSeconds,
                        isCompleted: userAudioProgress[idx]!.isCompleted,
                        progressPercent: Math.round(
                          (userAudioProgress[idx]!.positionSeconds /
                            (audio.durationSeconds || 1)) *
                            100,
                        ),
                      }
                    : null,
                })),
                stats: {
                  totalAudio: audioRecords.length,
                  completedAudio,
                  completionPercent:
                    audioRecords.length > 0
                      ? Math.round((completedAudio / audioRecords.length) * 100)
                      : 0,
                  lastListened: lastListenedAudio
                    ? {
                        audioId: lastListenedAudio.audioRecordId,
                        position: lastListenedAudio.positionSeconds,
                        isCompleted: lastListenedAudio.isCompleted,
                      }
                    : null,
                },
                navigation: {
                  clickToNavigate: `/player/chapter/${chapter.id}`,
                  description: `Click to listen audios for ${chapter.title}`,
                },
              },

              // ===== SORU ÇÖZ (Question Bank) SECTION =====
              soruCoz: {
                section: 'Soru Çöz',
                description: `${chapter.title} - Soruları Çöz`,
                questions: questions.map((q) => {
                  const userAnswer = chapterAnswers.find((a) => a.questionId === q.id);
                  return {
                    id: q.id,
                    orderIndex: q.orderIndex,
                    difficultyLevel: q.difficultyLevel,
                    topicTags: q.topicTags,
                    answered: !!userAnswer,
                    progress: userAnswer
                      ? {
                          selectedChoiceIndex: userAnswer.selectedChoiceIndex,
                          isCorrect: userAnswer.isCorrect,
                          attemptCount: userAnswer.attemptCount,
                          timeSpentSeconds: userAnswer.timeSpentSeconds,
                          answeredAt: userAnswer.answeredAt,
                        }
                      : null,
                    // Include explanation audio for wrong answers
                    hasExplanation: q.explanationAudioRecordId ? true : false,
                  };
                }),
                stats: {
                  totalQuestions: questions.length,
                  answeredQuestions: chapterAnswers.length,
                  correctAnswers,
                  incorrectAnswers: incorrectAnswers.length,
                  successRate:
                    chapterAnswers.length > 0
                      ? Math.round((correctAnswers / chapterAnswers.length) * 100)
                      : 0,
                  lastSolved: lastSolvedQuestion
                    ? {
                        questionId: lastSolvedQuestion.questionId,
                        isCorrect: lastSolvedQuestion.isCorrect,
                        answeredAt: lastSolvedQuestion.answeredAt,
                      }
                    : null,
                  incorrectList: incorrectAnswers.map((a) => ({
                    questionId: a.questionId,
                    userAnswer: a.selectedChoiceIndex,
                    attemptCount: a.attemptCount,
                  })),
                },
                navigation: {
                  clickToNavigate: `/questions/chapter/${chapter.id}`,
                  description: `Click to solve questions for ${chapter.title}`,
                  nextPrevButtons: 'Supported in question page',
                  explanationOnWrong: 'Popup will show explanation audio if available',
                },
              },

              // ===== İLERLEME SECTION (Progress / Retry) =====
              ilerleme: {
                section: 'İlerleme',
                description: `${chapter.title} - İlerleme ve Tekrar`,
                progress: {
                  audioCompletion: {
                    completed: completedAudio,
                    total: audioRecords.length,
                    percent:
                      audioRecords.length > 0
                        ? Math.round((completedAudio / audioRecords.length) * 100)
                        : 0,
                  },
                  questionProgress: {
                    correct: correctAnswers,
                    incorrect: incorrectAnswers.length,
                    total: chapterAnswers.length,
                    percent:
                      chapterAnswers.length > 0
                        ? Math.round((correctAnswers / chapterAnswers.length) * 100)
                        : 0,
                  },
                },
                retryPanel: {
                  description: 'Retry incorrectly answered questions',
                  incorrectCount: incorrectAnswers.length,
                  incorrectQuestions: incorrectAnswers.map((a) => ({
                    questionId: a.questionId,
                    attemptCount: a.attemptCount,
                    timeSpentSeconds: a.timeSpentSeconds,
                  })),
                  navigation: {
                    clickToRetry: `/ilerleme/retry-questions`,
                  },
                },
              },

              // ===== SUB-CHAPTERS =====
              subChapters: await buildChaptersWithDetails(allChapters, chapter.id),
            };
          }),
      );
    };

    const chaptersTree = await buildChaptersWithDetails(allChapters);

    // ===== GET ALL INCORRECT ANSWERS FOR THIS CONTENT =====
    const allContentChapters = await this.db.query.chapters.findMany({
      where: eq(schema.chapters.contentId, contentId),
    });

    const allContentQuestions = (
      await Promise.all(
        allContentChapters.map((ch) =>
          this.db.query.questions.findMany({
            where: eq(schema.questions.chapterId, ch.id),
          }),
        ),
      )
    ).flat();

    const contentIncorrectAnswers = (
      await this.db.query.userQuestionAnswers.findMany({
        where: eq(schema.userQuestionAnswers.userId, userId),
      })
    ).filter(
      (a) =>
        !a.isCorrect &&
        allContentQuestions.some((q) => q.id === a.questionId),
    );

    return {
      // ===== CONTENT INFO =====
      content: {
        id: content.id,
        title: content.title,
        type: content.type,
        description: content.description,
        author: content.author,
        publisher: content.publisher,
        coverImageKey: content.coverImageKey,
      },

      // ===== ALL CHAPTERS HIERARCHY =====
      chapters: chaptersTree,

      // ===== OVERALL STATISTICS =====
      overallStats: {
        totalChapters: allChapters.filter((c) => !c.parentId).length,
        totalAudio: (
          await Promise.all(
            allChapters.map((ch) =>
              this.db.query.audioRecords.findMany({
                where: eq(schema.audioRecords.chapterId, ch.id),
              }),
            ),
          )
        ).flat().length,
        totalQuestions: allContentQuestions.length,
      },

      // ===== GLOBAL RETRY PANEL FOR THIS BOOK =====
      globalRetryPanel: {
        title: `${content.title} - Yanlış Cevaplar`,
        description: 'All incorrectly answered questions in this book',
        totalIncorrect: contentIncorrectAnswers.length,
        retryLink: `/ilerleme/retry-questions?contentId=${contentId}`,
      },

      // ===== NAVIGATION GUIDE =====
      navigationGuide: {
        steps: [
          '1. Choose a chapter from above',
          '2. Click "Ders Dinle" to listen to audio records for that chapter',
          '3. Click "Soru Çöz" to solve questions for that chapter',
          '4. Track your progress in each section',
          '5. Use retry panel to solve incorrectly answered questions again',
        ],
      },
    };
  }
}

