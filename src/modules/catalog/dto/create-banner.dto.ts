import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateBannerDto {
  @IsOptional()
  @IsString()
  image?: string;

  @IsString()
  link: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
