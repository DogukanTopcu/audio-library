import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../../packages/db/src/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';

type DB = NodePgDatabase<typeof schema>;

@UseGuards(JwtAuthGuard)
@Controller('ilerleme')
export class ProgressController {
  constructor(@Inject(DRIZZLE) private readonly db: DB) {}

  /**
   * Get overall progress statistics
   */
  @Get()
  async getOverallProgress(@CurrentUser('id') userId: string) {
    // Get all user progress
    const userProgress = await this.db.query.userProgress.findMany({
      where: eq(schema.userProgress.userId, userId),
    });

    // Get all user question answers
    const questionAnswers = await this.db.query.userQuestionAnswers.findMany({
      where: eq(schema.userQuestionAnswers.userId, userId),
    });

    const completedAudio = userProgress.filter((p) => p.isCompleted).length;
    const totalAudio = userProgress.length;
    const correctAnswers = questionAnswers.filter((a) => a.isCorrect).length;
    const totalQuestions = questionAnswers.length;

    return {
      audioLearning: {
        totalListened: totalAudio,
        completedAudio,
        completionPercent:
          totalAudio > 0 ? Math.round((completedAudio / totalAudio) * 100) : 0,
      },
      questionBank: {
        totalAttempts: totalQuestions,
        correctAnswers,
        successRate:
          totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
      },
      recentActivity: {
        lastAudioUpdated:
          userProgress.length > 0
            ? userProgress.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]
                .updatedAt
            : null,
        lastQuestionAnswered:
          questionAnswers.length > 0
            ? questionAnswers.sort(
                (a, b) => b.answeredAt.getTime() - a.answeredAt.getTime(),
              )[0].answeredAt
            : null,
      },
    };
  }

  /**
   * Get all content with per-content progress statistics
   */
  @Get('contents')
  async getContentProgress(@CurrentUser('id') userId: string) {
    // Get all content
    const allContent = await this.db.query.content.findMany({
      where: eq(schema.content.isActive, true),
    });

    const contentProgress = await Promise.all(
      allContent.map(async (content) => {
        // Get all chapters for this content
        const chapters = await this.db.query.chapters.findMany({
          where: eq(schema.chapters.contentId, content.id),
        });

        // Get all audio records in these chapters
        const audioRecords = await Promise.all(
          chapters.map((ch) =>
            this.db.query.audioRecords.findMany({
              where: eq(schema.audioRecords.chapterId, ch.id),
            }),
          ),
        );

        const allAudioIds = audioRecords.flat().map((a) => a.id);

        // Get user progress for these audios
        const userProgressList = await this.db.query.userProgress.findMany({
          where: and(
            eq(schema.userProgress.userId, userId),
            // In clause would be needed, but we'll filter in JS
          ),
        });

        const contentProgress = userProgressList.filter((p) =>
          allAudioIds.includes(p.audioRecordId),
        );
        const completedAudio = contentProgress.filter((p) => p.isCompleted).length;
        const totalAudio = allAudioIds.length;

        // Get all questions in these chapters
        const allQuestions = await Promise.all(
          chapters.map((ch) =>
            this.db.query.questions.findMany({
              where: eq(schema.questions.chapterId, ch.id),
            }),
          ),
        );

        const questionIds = allQuestions.flat().map((q) => q.id);

        // Get user question answers
        const userAnswers = await this.db.query.userQuestionAnswers.findMany({
          where: eq(schema.userQuestionAnswers.userId, userId),
        });

        const contentAnswers = userAnswers.filter((a) => questionIds.includes(a.questionId));
        const correctAnswers = contentAnswers.filter((a) => a.isCorrect).length;
        const totalQuestions = questionIds.length;

        return {
          content: {
            id: content.id,
            title: content.title,
            type: content.type,
            description: content.description,
          },
          audioLearning: {
            totalAudio,
            completedAudio,
            completionPercent: totalAudio > 0 ? Math.round((completedAudio / totalAudio) * 100) : 0,
          },
          questionBank: {
            totalQuestions,
            answeredQuestions: contentAnswers.length,
            correctAnswers,
            successRate:
              contentAnswers.length > 0
                ? Math.round((correctAnswers / contentAnswers.length) * 100)
                : 0,
          },
        };
      }),
    );

    return contentProgress;
  }

  /**
   * Get content with chapter-level progress breakdown
   */
  @Get('contents/:contentId/chapters')
  async getContentChaptersProgress(
    @Query('contentId') contentId: string,
    @CurrentUser('id') userId: string,
  ) {
    const content = await this.db.query.content.findFirst({
      where: eq(schema.content.id, contentId),
    });

    if (!content) {
      throw new Error('Content not found');
    }

    // Get all chapters
    const allChapters = await this.db.query.chapters.findMany({
      where: eq(schema.chapters.contentId, contentId),
    });

    // Build tree and add progress
    const buildTreeWithProgress = async (
      chapters: (typeof allChapters)[0][],
      parentId: string | null = null,
    ): Promise<any[]> => {
      return Promise.all(
        chapters
          .filter((c) => c.parentId === parentId)
          .map(async (chapter) => {
            // Get all audio records for this chapter
            const audioRecords = await this.db.query.audioRecords.findMany({
              where: eq(schema.audioRecords.chapterId, chapter.id),
            });

            // Get user progress
            const userProgressList = await Promise.all(
              audioRecords.map((audio) =>
                this.db.query.userProgress.findFirst({
                  where: and(
                    eq(schema.userProgress.userId, userId),
                    eq(schema.userProgress.audioRecordId, audio.id),
                  ),
                }),
              ),
            );

            const completedAudio = userProgressList.filter((p) => p?.isCompleted).length;

            // Get questions for this chapter
            const questions = await this.db.query.questions.findMany({
              where: eq(schema.questions.chapterId, chapter.id),
            });

            // Get user answers
            const userAnswers = await this.db.query.userQuestionAnswers.findMany({
              where: eq(schema.userQuestionAnswers.userId, userId),
            });

            const chapterAnswers = userAnswers.filter((a) =>
              questions.some((q) => q.id === a.questionId),
            );
            const correctAnswers = chapterAnswers.filter((a) => a.isCorrect).length;

            return {
              chapter,
              audioLearning: {
                totalAudio: audioRecords.length,
                completedAudio,
                completionPercent:
                  audioRecords.length > 0
                    ? Math.round((completedAudio / audioRecords.length) * 100)
                    : 0,
              },
              questionBank: {
                totalQuestions: questions.length,
                answeredQuestions: chapterAnswers.length,
                correctAnswers,
                successRate:
                  chapterAnswers.length > 0
                    ? Math.round((correctAnswers / chapterAnswers.length) * 100)
                    : 0,
              },
              subChapters: await buildTreeWithProgress(allChapters, chapter.id),
            };
          }),
      );
    };

    const chaptersTree = await buildTreeWithProgress(allChapters);

    return {
      content,
      chapters: chaptersTree,
    };
  }

  /**
   * Get retry panel - incorrectly answered questions
   */
  @Get('retry-questions')
  async getRetryQuestions(
    @CurrentUser('id') userId: string,
    @Query('limit') limit: string = '10',
    @Query('offset') offset: string = '0',
  ) {
    const incorrectAnswers = await this.db.query.userQuestionAnswers.findMany({
      where: and(
        eq(schema.userQuestionAnswers.userId, userId),
        eq(schema.userQuestionAnswers.isCorrect, false),
      ),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const questionsWithDetails = await Promise.all(
      incorrectAnswers.map(async (answer) => {
        const question = await this.db.query.questions.findFirst({
          where: eq(schema.questions.id, answer.questionId),
        });

        const chapter = question
          ? await this.db.query.chapters.findFirst({
              where: eq(schema.chapters.id, question.chapterId),
            })
          : null;

        const content = chapter
          ? await this.db.query.content.findFirst({
              where: eq(schema.content.id, chapter.contentId),
            })
          : null;

        const audioRecord = question
          ? await this.db.query.audioRecords.findFirst({
              where: eq(schema.audioRecords.id, question.audioRecordId),
            })
          : null;

        const choices = question
          ? await this.db.query.questionChoices.findMany({
              where: eq(schema.questionChoices.questionId, question.id),
            })
          : [];

        const explanationAudio = question && question.explanationAudioRecordId
          ? await this.db.query.audioRecords.findFirst({
              where: eq(schema.audioRecords.id, question.explanationAudioRecordId),
            })
          : null;

        return {
          answer,
          question: {
            ...question,
            audioRecord,
            choices,
            explanationAudio,
          },
          chapter,
          content,
        };
      }),
    );

    return {
      total: incorrectAnswers.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      questions: questionsWithDetails,
    };
  }

  /**
   * Get statistics for ilerleme page dashboard
   */
  @Get('statistics')
  async getStatistics(@CurrentUser('id') userId: string) {
    // Total time spent
    const allProgress = await this.db.query.userProgress.findMany({
      where: eq(schema.userProgress.userId, userId),
    });

    // Total questions attempted
    const allAnswers = await this.db.query.userQuestionAnswers.findMany({
      where: eq(schema.userQuestionAnswers.userId, userId),
    });

    // Activity logs for streaks
    const recentLogs = await this.db.query.userActivityLogs.findMany({
      where: eq(schema.userActivityLogs.userId, userId),
      orderBy: [desc(schema.userActivityLogs.createdAt)],
      limit: 100,
    });

    // Calculate total listening time
    const totalListeningTime = allProgress.reduce(
      (sum, p) => sum + (p.positionSeconds || 0),
      0,
    );

    // Calculate average question time
    const avgQuestionTime =
      allAnswers.length > 0
        ? Math.round(
            allAnswers.reduce((sum, a) => sum + a.timeSpentSeconds, 0) / allAnswers.length,
          )
        : 0;

    // Calculate daily streak (simplified)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = recentLogs.filter((log) => {
      const logDate = new Date(log.createdAt);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });

    return {
      totalAudioListened: allProgress.filter((p) => p.isCompleted).length,
      totalListeningSeconds: totalListeningTime,
      totalQuestionsAttempted: allAnswers.length,
      correctAnswers: allAnswers.filter((a) => a.isCorrect).length,
      successRate:
        allAnswers.length > 0
          ? Math.round(
              (allAnswers.filter((a) => a.isCorrect).length / allAnswers.length) * 100,
            )
          : 0,
      averageQuestionTime: avgQuestionTime,
      todayActivity: {
        hasActivity: todayLogs.length > 0,
        activityCount: todayLogs.length,
      },
    };
  }
}


