import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  category_id: string;

  @IsOptional()
  @IsString()
  brand_id?: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  unit_price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount_percent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  final_price?: number;

  @IsNotEmpty()
  @IsString()
  image_primary: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsEnum(['in_stock', 'out_of_stock', 'preorder'])
  stock_status?: 'in_stock' | 'out_of_stock' | 'preorder';

  @IsOptional()
  is_active?: boolean;
}
