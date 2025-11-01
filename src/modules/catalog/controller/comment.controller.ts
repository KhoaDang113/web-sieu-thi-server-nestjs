import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CommentService } from '../service/comment.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { GetCommentsDto } from '../dto/get-comments.dto';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Public()
  @Get('product')
  async getCommentsByProduct(@Query() dto: GetCommentsDto) {
    return this.commentService.getCommentsByProduct(dto);
  }

  @Get('my-comments')
  async getMyComments(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.commentService.getCommentsByUser(userId, page, limit);
  }

  @Public()
  @Get(':id')
  async getCommentById(@Param('id') id: string) {
    return this.commentService.getCommentById(id);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images', 5))
  async createComment(
    @Req() req: Request,
    @Body() dto: CreateCommentDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.commentService.createComment(userId, dto, files);
  }

  @Put(':id')
  @UseInterceptors(FilesInterceptor('images', 5))
  async updateComment(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: UpdateCommentDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.commentService.updateComment(id, userId, dto, files);
  }

  @Delete(':id')
  async deleteComment(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.commentService.deleteComment(id, userId, false);
  }

  @UseGuards(AdminGuard)
  @Delete('admin/:id')
  async adminDeleteComment(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.commentService.deleteComment(id, userId, true);
  }
}
