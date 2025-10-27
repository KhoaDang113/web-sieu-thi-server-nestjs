import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
