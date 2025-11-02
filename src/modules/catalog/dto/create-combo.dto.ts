import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateComboDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
