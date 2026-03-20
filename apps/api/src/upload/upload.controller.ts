import {
  Controller,
  Post,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Public()
  @Post('document')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadDocument(file);
  }

  @UseGuards(AdminAuthGuard)
  @Post('audio')
  @UseInterceptors(FileInterceptor('file'))
  uploadAudio(
    @UploadedFile() file: Express.Multer.File,
    @Query('contentId') contentId: string,
    @Query('chapterId') chapterId: string,
  ) {
    return this.uploadService.uploadAudio(file, contentId, chapterId);
  }

  @UseGuards(AdminAuthGuard)
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadImage(file);
  }

  @UseGuards(JwtAuthGuard)
  @Get('signed-url')
  getSignedUrl(
    @Query('key') key: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.uploadService.getSignedUrl(key, userId);
  }
}
