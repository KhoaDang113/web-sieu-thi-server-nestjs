import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { Types } from 'mongoose';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  user_id: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  actor_id: Types.ObjectId;

  @IsEnum(['comment_reply', 'order_update', 'product_review', 'system'])
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsString()
  @IsOptional()
  reference_id?: string;

  @IsString()
  @IsOptional()
  reference_type?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
