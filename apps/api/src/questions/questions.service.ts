import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, asc } from 'drizzle-orm';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import * as schema from '../../../../packages/db/src/schema/index.js';
import { questions, questionChoices } from '../../../../packages/db/src/schema/index.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';

type DB = NodePgDatabase<typeof schema>;

@Injectable()
export class QuestionsService {
  constructor(@Inject(DRIZZLE) private readonly db: DB) {}

  async findByChapter(chapterId: string) {
    const allQuestions = await this.db.query.questions.findMany({
      where: eq(questions.chapterId, chapterId),
      orderBy: [asc(questions.orderIndex)],
    });

    // Fetch choices for each question
    const result = await Promise.all(
      allQuestions.map(async (q) => {
        const choices = await this.db
          .select()
          .from(questionChoices)
          .where(eq(questionChoices.questionId, q.id))
          .orderBy(asc(questionChoices.choiceIndex));
        return { ...q, choices };
      }),
    );

    return result;
  }

  async findOne(id: string) {
    const question = await this.db.query.questions.findFirst({
      where: eq(questions.id, id),
    });

    if (!question) {
      throw new NotFoundException(`Question with id ${id} not found`);
    }

    const choices = await this.db
      .select()
      .from(questionChoices)
      .where(eq(questionChoices.questionId, id))
      .orderBy(asc(questionChoices.choiceIndex));

    return { ...question, choices };
  }

  async create(dto: CreateQuestionDto) {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(questions).values({
        audioRecordId: dto.audioRecordId,
        explanationAudioRecordId: dto.explanationAudioRecordId,
        chapterId: dto.chapterId,
        correctChoiceIndex: dto.correctChoiceIndex,
        orderIndex: dto.orderIndex ?? 0,
        difficultyLevel: dto.difficultyLevel,
        topicTags: dto.topicTags,
      }).returning();

      if (dto.choices && dto.choices.length > 0) {
        await tx.insert(questionChoices).values(
          dto.choices.map((choice) => ({
            questionId: created.id,
            choiceIndex: choice.choiceIndex,
            audioRecordId: choice.audioRecordId,
            choiceText: choice.choiceText,
          })),
        );
      }

      const choices = await tx
        .select()
        .from(questionChoices)
        .where(eq(questionChoices.questionId, created.id))
        .orderBy(asc(questionChoices.choiceIndex));

      return { ...created, choices };
    });
  }

  async update(id: string, dto: UpdateQuestionDto) {
    await this.findOne(id);

    const [updated] = await this.db
      .update(questions)
      .set({
        ...(dto.audioRecordId !== undefined && { audioRecordId: dto.audioRecordId }),
        ...(dto.explanationAudioRecordId !== undefined && {
          explanationAudioRecordId: dto.explanationAudioRecordId,
        }),
        ...(dto.chapterId !== undefined && { chapterId: dto.chapterId }),
        ...(dto.correctChoiceIndex !== undefined && { correctChoiceIndex: dto.correctChoiceIndex }),
        ...(dto.orderIndex !== undefined && { orderIndex: dto.orderIndex }),
        ...(dto.difficultyLevel !== undefined && { difficultyLevel: dto.difficultyLevel }),
        ...(dto.topicTags !== undefined && { topicTags: dto.topicTags }),
      })
      .where(eq(questions.id, id))
      .returning();

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);

    // Choices are cascade-deleted
    await this.db.delete(questions).where(eq(questions.id, id));

    return { deleted: true };
  }
}
