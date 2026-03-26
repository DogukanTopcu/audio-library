import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { QuestionsService } from './questions.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AnswerQuestionDto } from './dto/answer-question.dto.js';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../../packages/db/src/schema/index.js';
import { eq, and } from 'drizzle-orm';

type DB = NodePgDatabase<typeof schema>;

@UseGuards(JwtAuthGuard)
@Controller('questions')
export class PublicQuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    @Inject(DRIZZLE) private readonly db: DB,
  ) {}

  /**
   * Get questions for a chapter (for question bank)
   */
  @Get('chapter/:chapterId')
  async getChapterQuestions(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
  ) {
    const questions = await this.questionsService.findByChapter(chapterId);

    // Enhance with user progress
    const questionsWithProgress = await Promise.all(
      questions.map(async (q) => {
        const answer = await this.db.query.userQuestionAnswers.findFirst({
          where: and(
            eq(schema.userQuestionAnswers.userId, userId),
            eq(schema.userQuestionAnswers.questionId, q.id),
          ),
        });

        return {
          ...q,
          userAnswer: answer
            ? {
                selectedChoiceIndex: answer.selectedChoiceIndex,
                isCorrect: answer.isCorrect,
                attemptCount: answer.attemptCount,
                answeredAt: answer.answeredAt,
              }
            : null,
        };
      }),
    );

    return questionsWithProgress;
  }

  /**
   * Get a single question with choices
   */
  @Get(':id')
  async getQuestion(
    @Param('id') questionId: string,
    @CurrentUser('id') userId: string,
  ) {
    const question = await this.questionsService.findOne(questionId);

    // Get user's previous answer if exists
    const userAnswer = await this.db.query.userQuestionAnswers.findFirst({
      where: and(
        eq(schema.userQuestionAnswers.userId, userId),
        eq(schema.userQuestionAnswers.questionId, questionId),
      ),
    });

    return {
      ...question,
      userAnswer: userAnswer
        ? {
            selectedChoiceIndex: userAnswer.selectedChoiceIndex,
            isCorrect: userAnswer.isCorrect,
            attemptCount: userAnswer.attemptCount,
            answeredAt: userAnswer.answeredAt,
          }
        : null,
    };
  }

  /**
   * Submit an answer to a question
   */
  @Post(':id/answer')
  @HttpCode(200)
  async answerQuestion(
    @Param('id') questionId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AnswerQuestionDto,
  ) {
    if (dto.questionId !== questionId) {
      throw new BadRequestException('Question ID mismatch');
    }

    // Get the question
    const question = await this.questionsService.findOne(questionId);

    // Validate choice index
    if (dto.selectedChoiceIndex < 0 || dto.selectedChoiceIndex >= question.choices.length) {
      throw new BadRequestException('Invalid choice index');
    }

    const isCorrect = dto.selectedChoiceIndex === question.correctChoiceIndex;

    // Check if user already answered this question
    const existingAnswer = await this.db.query.userQuestionAnswers.findFirst({
      where: and(
        eq(schema.userQuestionAnswers.userId, userId),
        eq(schema.userQuestionAnswers.questionId, questionId),
      ),
    });

    if (existingAnswer) {
      // Update the existing answer
      const [updated] = await this.db
        .update(schema.userQuestionAnswers)
        .set({
          selectedChoiceIndex: dto.selectedChoiceIndex,
          isCorrect,
          attemptCount: existingAnswer.attemptCount + 1,
          timeSpentSeconds: dto.timeSpentSeconds ?? existingAnswer.timeSpentSeconds,
          answeredAt: new Date(),
        })
        .where(eq(schema.userQuestionAnswers.id, existingAnswer.id))
        .returning();

      return {
        success: true,
        isCorrect,
        answer: updated,
      };
    } else {
      // Create new answer record
      const [created] = await this.db
        .insert(schema.userQuestionAnswers)
        .values({
          userId,
          questionId,
          selectedChoiceIndex: dto.selectedChoiceIndex,
          isCorrect,
          timeSpentSeconds: dto.timeSpentSeconds ?? 0,
        })
        .returning();

      // Log activity
      await this.db.insert(schema.userActivityLogs).values({
        userId,
        eventType: isCorrect ? 'QUESTION_CORRECT' : 'QUESTION_WRONG',
        metadata: {
          questionId,
          choiceIndex: dto.selectedChoiceIndex,
        },
      });

      return {
        success: true,
        isCorrect,
        answer: created,
      };
    }
  }

  /**
   * Get user's progress on questions (for ilerleme page)
   */
  @Get('progress/chapter/:chapterId')
  async getChapterProgress(
    @Param('chapterId') chapterId: string,
    @CurrentUser('id') userId: string,
  ) {
    // Get all questions in the chapter
    const questions = await this.questionsService.findByChapter(chapterId);

    // Get user answers for all questions
    const answers = await this.db.query.userQuestionAnswers.findMany({
      where: and(
        eq(schema.userQuestionAnswers.userId, userId),
        // Filter by chapter questions - need to join
      ),
    });

    const questionIds = new Set(questions.map((q) => q.id));
    const userAnswers = answers.filter((a) => questionIds.has(a.questionId));

    const stats = {
      totalQuestions: questions.length,
      answeredQuestions: userAnswers.length,
      correctAnswers: userAnswers.filter((a) => a.isCorrect).length,
      incorrectAnswers: userAnswers.filter((a) => !a.isCorrect).length,
      successRate:
        userAnswers.length > 0
          ? Math.round(
              (userAnswers.filter((a) => a.isCorrect).length / userAnswers.length) * 100,
            )
          : 0,
      questions: questions.map((q) => {
        const userAnswer = userAnswers.find((a) => a.questionId === q.id);
        return {
          id: q.id,
          title: `Soru ${questions.indexOf(q) + 1}`,
          difficulty: q.difficultyLevel,
          answered: !!userAnswer,
          isCorrect: userAnswer?.isCorrect ?? null,
          attemptCount: userAnswer?.attemptCount ?? 0,
          userAnswer: userAnswer
            ? {
                selectedChoiceIndex: userAnswer.selectedChoiceIndex,
                answeredAt: userAnswer.answeredAt,
              }
            : null,
        };
      }),
    };

    return stats;
  }

  /**
   * Get all incorrect answers for user (for ilerleme page - retry panel)
   */
  @Get('progress/incorrect')
  async getIncorrectAnswers(
    @CurrentUser('id') userId: string,
    @Query('limit') limit: string = '10',
  ) {
    const incorrectAnswers = await this.db.query.userQuestionAnswers.findMany({
      where: and(
        eq(schema.userQuestionAnswers.userId, userId),
        eq(schema.userQuestionAnswers.isCorrect, false),
      ),
      limit: parseInt(limit),
    });

    // Fetch full question details
    const questions = await Promise.all(
      incorrectAnswers.map(async (answer) => {
        const question = await this.questionsService.findOne(answer.questionId);
        const chapter = await this.db.query.chapters.findFirst({
          where: eq(schema.chapters.id, question.chapterId),
        });

        return {
          ...question,
          chapter,
          userAnswer: {
            selectedChoiceIndex: answer.selectedChoiceIndex,
            attemptCount: answer.attemptCount,
            answeredAt: answer.answeredAt,
          },
        };
      }),
    );

    return {
      total: incorrectAnswers.length,
      questions,
    };
  }
}

