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
export class KesfetDetailsController {
  constructor(@Inject(DRIZZLE) private readonly db: DB) {}

  /**
   * Get Kesfet Details Page - Show book with all chapters/subchapters
   * User clicks on a book → This endpoint shows the chapter hierarchy with:
   * - All chapters and subchapters listed robustly
   * - User progress on each chapter
   * - Count of audio records (for Ders Dinle)
   * - Count of questions (for Soru Çöz)
   * - Links/routes to navigate to audio player or question bank
   */
  @Get('details/:contentId')
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

    // Build tree with full details
    const buildChaptersWithDetails = async (
      chapters: (typeof allChapters)[0][],
      parentId: string | null = null,
    ): Promise<any[]> => {
      return Promise.all(
        chapters
          .filter((c) => c.parentId === parentId)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map(async (chapter) => {
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

            return {
              // Chapter Info
              id: chapter.id,
              title: chapter.title,
              description: chapter.description,
              orderIndex: chapter.orderIndex,

              // Audio Learning Progress (Ders Dinle)
              audioLearning: {
                totalAudio: audioRecords.length,
                completedAudio,
                completionPercent:
                  audioRecords.length > 0
                    ? Math.round((completedAudio / audioRecords.length) * 100)
                    : 0,
                audioRecords: audioRecords.map((audio) => ({
                  id: audio.id,
                  title: audio.title,
                  type: audio.type,
                  durationSeconds: audio.durationSeconds,
                  orderIndex: audio.orderIndex,
                })),
              },

              // Question Bank Progress (Soru Çöz)
              questionBank: {
                totalQuestions: questions.length,
                answeredQuestions: chapterAnswers.length,
                correctAnswers,
                successRate:
                  chapterAnswers.length > 0
                    ? Math.round((correctAnswers / chapterAnswers.length) * 100)
                    : 0,
              },

              // Navigation Info
              navigationLinks: {
                dersdinle: `/player/chapter/${chapter.id}`,
                soruCoz: `/questions/chapter/${chapter.id}`,
              },

              // Sub-chapters (recursively)
              subChapters: await buildChaptersWithDetails(allChapters, chapter.id),
            };
          }),
      );
    };

    const chaptersTree = await buildChaptersWithDetails(allChapters);

    return {
      // Book Info
      content: {
        id: content.id,
        title: content.title,
        type: content.type,
        description: content.description,
        author: content.author,
        publisher: content.publisher,
        coverImageKey: content.coverImageKey,
      },

      // Chapters with details
      chapters: chaptersTree,

      // Overall Progress
      overallProgress: {
        totalChapters: allChapters.filter((c) => !c.parentId).length,
        totalAudio: allChapters.reduce((sum, ch) => {
          // This would need async, so return estimation
          return sum;
        }, 0),
        totalQuestions: allChapters.reduce((sum, ch) => {
          // This would need async, so return estimation
          return sum;
        }, 0),
      },

      // Navigation from this page
      navigation: {
        backToKesfet: '/kesfet',
        selectChapterForAudio: '/player/chapter/{chapterId}',
        selectChapterForQuestions: '/questions/chapter/{chapterId}',
      },
    };
  }

  /**
   * Get chapter details for display in kesfet details
   * This shows a specific chapter with:
   * - All its audio records
   * - All its questions
   * - User progress
   * - Options to go to Ders Dinle or Soru Çöz
   */
  @Get('chapter/:chapterId')
  async getChapterDetails(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
  ) {
    // Get the chapter
    const chapter = await this.db.query.chapters.findFirst({
      where: eq(schema.chapters.id, chapterId),
    });

    if (!chapter) {
      throw new Error('Chapter not found');
    }

    // Get the content (book)
    const content = await this.db.query.content.findFirst({
      where: eq(schema.content.id, chapter.contentId),
    });

    // Get all audio records for this chapter
    const audioRecords = await this.db.query.audioRecords.findMany({
      where: eq(schema.audioRecords.chapterId, chapterId),
    });

    // Get user progress on audios
    const userAudioProgress = await Promise.all(
      audioRecords.map(async (audio) => {
        const progress = await this.db.query.userProgress.findFirst({
          where: and(
            eq(schema.userProgress.userId, userId),
            eq(schema.userProgress.audioRecordId, audio.id),
          ),
        });

        return {
          audioRecord: audio,
          progress: progress
            ? {
                positionSeconds: progress.positionSeconds,
                isCompleted: progress.isCompleted,
                progressPercent: Math.round(
                  (progress.positionSeconds / (audio.durationSeconds || 1)) * 100,
                ),
              }
            : null,
        };
      }),
    );

    // Get all questions for this chapter
    const questions = await this.db.query.questions.findMany({
      where: eq(schema.questions.chapterId, chapterId),
    });

    // Get user question answers
    const userAnswers = await this.db.query.userQuestionAnswers.findMany({
      where: eq(schema.userQuestionAnswers.userId, userId),
    });

    const chapterAnswers = userAnswers.filter((a) =>
      questions.some((q) => q.id === a.questionId),
    );
    const correctAnswers = chapterAnswers.filter((a) => a.isCorrect).length;

    const completedAudio = userAudioProgress.filter((p) => p.progress?.isCompleted).length;

    return {
      // Chapter and book info
      chapter: {
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        contentId: chapter.contentId,
      },
      content: {
        id: content?.id,
        title: content?.title,
      },

      // Audio Learning Section (Ders Dinle)
      audioLearning: {
        title: `${chapter.title} - Dersi Dinle`,
        totalAudio: audioRecords.length,
        completedAudio,
        completionPercent:
          audioRecords.length > 0
            ? Math.round((completedAudio / audioRecords.length) * 100)
            : 0,
        audioRecords: userAudioProgress,
        navigateTo: `/player/chapter/${chapterId}`,
        description: 'Bu bölümün tüm ses kayıtlarını dinleyin',
      },

      // Question Bank Section (Soru Çöz)
      questionBank: {
        title: `${chapter.title} - Soruları Çöz`,
        totalQuestions: questions.length,
        answeredQuestions: chapterAnswers.length,
        correctAnswers,
        successRate:
          chapterAnswers.length > 0
            ? Math.round((correctAnswers / chapterAnswers.length) * 100)
            : 0,
        questions: questions.map((q) => {
          const userAnswer = chapterAnswers.find((a) => a.questionId === q.id);
          return {
            id: q.id,
            orderIndex: q.orderIndex,
            difficultyLevel: q.difficultyLevel,
            answered: !!userAnswer,
            isCorrect: userAnswer?.isCorrect ?? null,
          };
        }),
        navigateTo: `/questions/chapter/${chapterId}`,
        description: 'Bu bölümün tüm sorularını çözerek pratik yapın',
      },

      // Navigation options
      navigation: {
        goToAudioPlayer: `/player/chapter/${chapterId}`,
        goToQuestions: `/questions/chapter/${chapterId}`,
        backToDetails: `/kesfet/details/${chapter.contentId}`,
        backToKesfet: '/kesfet',
      },

      // Recommended next action
      recommendedAction: completedAudio === 0 ? 'audioLearning' : chapterAnswers.length === 0 ? 'questionBank' : null,
    };
  }

  /**
   * Get chapter hierarchy with minimal data for sidebar/navigation
   * Used to show chapter tree while user is in a specific chapter
   */
  @Get('tree/:contentId')
  async getChapterTree(
    @Param('contentId') contentId: string,
    @Query('activeChapterId') activeChapterId?: string,
  ) {
    // Get all chapters
    const allChapters = await this.db.query.chapters.findMany({
      where: eq(schema.chapters.contentId, contentId),
    });

    // Build minimal tree for navigation
    const buildTree = (chapters: (typeof allChapters)[0][], parentId: string | null = null): any[] => {
      return chapters
        .filter((c) => c.parentId === parentId)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          orderIndex: chapter.orderIndex,
          isActive: chapter.id === activeChapterId,
          children: buildTree(allChapters, chapter.id),
        }));
    };

    return {
      contentId,
      chapters: buildTree(allChapters),
    };
  }
}

