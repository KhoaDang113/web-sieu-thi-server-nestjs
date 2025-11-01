import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from '../schema/comment.schema';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { GetCommentsDto } from '../dto/get-comments.dto';
import { CloudinaryService } from '../../../shared/cloudinary/cloudinary.service';

interface RatingStats {
  _id: null;
  avgRating: number;
  totalRatings: number;
  rating5: number;
  rating4: number;
  rating3: number;
  rating2: number;
  rating1: number;
}

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async getCommentsByProduct(dto: GetCommentsDto) {
    const { product_id, page = 1, limit = 10 } = dto;

    if (!product_id) {
      throw new BadRequestException('product_id is required');
    }

    if (!Types.ObjectId.isValid(product_id)) {
      throw new BadRequestException('product_id is invalid');
    }

    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.commentModel
        .find({
          product_id: new Types.ObjectId(product_id),
          is_deleted: false,
        })
        .populate('user_id', 'name avatar email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id product_id user_id content rating images created_at')
        .lean(),
      this.commentModel.countDocuments({
        product_id: new Types.ObjectId(product_id),
        is_deleted: false,
      }),
    ]);

    const ratingStats = await this.commentModel.aggregate<RatingStats>([
      {
        $match: {
          product_id: new Types.ObjectId(product_id),
          is_deleted: false,
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          rating5: {
            $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] },
          },
          rating4: {
            $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] },
          },
          rating3: {
            $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] },
          },
          rating2: {
            $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] },
          },
          rating1: {
            $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] },
          },
        },
      },
    ]);

    const stats: RatingStats = ratingStats[0] || {
      _id: null,
      avgRating: 0,
      totalRatings: 0,
      rating5: 0,
      rating4: 0,
      rating3: 0,
      rating2: 0,
      rating1: 0,
    };

    return {
      comments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        avgRating: Math.round(stats.avgRating * 10) / 10,
        totalRatings: stats.totalRatings,
        distribution: {
          5: stats.rating5,
          4: stats.rating4,
          3: stats.rating3,
          2: stats.rating2,
          1: stats.rating1,
        },
      },
    };
  }

  async getCommentsByUser(userId: string, page = 1, limit = 10) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('userId is invalid');
    }

    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.commentModel
        .find({
          user_id: new Types.ObjectId(userId),
          is_deleted: false,
        })
        .populate('product_id', 'name slug image_primary')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id product_id user_id content rating images created_at')
        .lean(),
      this.commentModel.countDocuments({
        user_id: new Types.ObjectId(userId),
        is_deleted: false,
      }),
    ]);

    return {
      comments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createComment(
    userId: string,
    dto: CreateCommentDto,
    files?: Express.Multer.File[],
  ) {
    if (!Types.ObjectId.isValid(dto.product_id)) {
      throw new BadRequestException('product_id is invalid');
    }

    let imageUrls: string[] = [];
    if (files && files.length > 0) {
      try {
        imageUrls = await this.cloudinaryService.uploadMultipleImages(
          files,
          'WebSieuThi/comments',
        );
      } catch {
        throw new BadRequestException('Error uploading images');
      }
    }

    const comment = new this.commentModel({
      product_id: new Types.ObjectId(dto.product_id),
      user_id: new Types.ObjectId(userId),
      content: dto.content,
      rating: dto.rating,
      images: imageUrls,
    });

    await comment.save();

    return await this.commentModel
      .findById(comment._id)
      .populate('user_id', 'name avatar email')
      .select('_id product_id user_id content rating images created_at')
      .lean();
  }

  async updateComment(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
    files?: Express.Multer.File[],
  ) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('commentId is invalid');
    }

    const comment = await this.commentModel.findOne({
      _id: new Types.ObjectId(commentId),
      is_deleted: false,
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.user_id.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to edit this comment',
      );
    }
    if (files && files.length > 0) {
      try {
        dto.images = await this.cloudinaryService.uploadMultipleImages(
          files,
          'WebSieuThi/comments',
        );
      } catch {
        throw new BadRequestException('Error uploading images');
      }
    }

    const { images, ...rest } = dto;
    Object.assign(comment, rest);
    if (Array.isArray(images) && images.length > 0) {
      comment.images = images;
    }
    await comment.save();

    return await this.commentModel
      .findById(comment._id)
      .populate('user_id', 'name avatar email')
      .select('_id product_id user_id content rating images created_at')
      .lean();
  }

  async deleteComment(commentId: string, userId: string, isAdmin = false) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('commentId is invalid');
    }

    const comment = await this.commentModel.findOne({
      _id: new Types.ObjectId(commentId),
      is_deleted: false,
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (!isAdmin && comment.user_id.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this comment',
      );
    }

    comment.is_deleted = true;
    await comment.save();

    return {
      message: 'Comment deleted successfully',
    };
  }

  async getCommentById(commentId: string) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('commentId is invalid');
    }

    const comment = await this.commentModel
      .findOne({
        _id: new Types.ObjectId(commentId),
        is_deleted: false,
      })
      .populate('user_id', 'name avatar email')
      .populate('product_id', 'name slug image_primary')
      .select('_id product_id user_id content rating images created_at')
      .lean();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }
}
