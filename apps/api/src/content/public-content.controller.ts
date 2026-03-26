import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContentService } from './content.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

type DB = NodePgDatabase<typeof schema>;

@Controller('content')
export class PublicContentController {
  constructor(
    private readonly contentService: ContentService,
    @Inject(DRIZZLE) private readonly db: DB,
  ) {}

  @Public()
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
@Public()
      {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
  constructor(private readonly contentService: ContentService) {}
  @Get(':id')
  findOne(@Param('id') id: string) {
  }

  /**
   * Get all chapters and subchapters for a content (kesfet details page)
   * Includes user progress if authenticated
   */
  @Get(':id/chapters')
  @UseGuards(JwtAuthGuard)
  async getChaptersWithProgress(
    @Param('id') contentId: string,
    @CurrentUser('id') userId: string,
  ) {
    const content = await this.contentService.findOne(contentId);
    return content;

    // Get all chapters
    const allChapters = await this.db.query.chapters.findMany({
      where: eq(schema.chapters.contentId, contentId),

    // Build hierarchical structure
          subChapters: buildTree(chapters, chapter.id),
        }));
    };

    const chaptersTree = buildTree(allChapters);

    // Enrich with user progress
    const enrichProgress = async (
  async getChapters(@Param('id') contentId: string) {
    // Import ChaptersService would add coupling; reuse ContentService findOne
          const audioRecords = await this.db.query.audioRecords.findMany({
            where: eq(schema.audioRecords.chapterId, chapter.id),
          });

          // Get user progress for these audio records
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
          const totalAudio = audioRecords.length;

          return {
            ...chapter,
            audioRecordCount: totalAudio,
            completedAudioCount: completedAudio,
            progressPercent: totalAudio > 0 ? Math.round((completedAudio / totalAudio) * 100) : 0,
            subChapters: chapter.subChapters ? await enrichProgress(chapter.subChapters) : [],
          };
        }),
      );
    };

    const chaptersWithProgress = await enrichProgress(chaptersTree);

    return {
      content,
      chapters: chaptersWithProgress,
    };
  }

  /**
   * Alternative endpoint - public access to chapters hierarchy
   */
  @Public()
  @Get(':id/chapters-public')
  async getChaptersPublic(@Param('id') contentId: string) {
    const content = await this.contentService.findOne(contentId);

    // Get all chapters
    const allChapters = await this.db.query.chapters.findMany({
      where: eq(schema.chapters.contentId, contentId),
    });

    // Build hierarchical structure
    const buildTree = (chapters: typeof allChapters, parentId: string | null = null) => {
      return chapters
        .filter((c) => c.parentId === parentId)
        .map((chapter) => ({
          ...chapter,
          subChapters: buildTree(chapters, chapter.id),
        }));
    };

    const chaptersTree = buildTree(allChapters);

    return {
      content,
      chapters: chaptersTree,
    };
  }
}
