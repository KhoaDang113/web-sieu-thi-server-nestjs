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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ProductService } from '../service/product.service';
import { Public } from '../../auth/decorators/public.decorator';
import { GetProductDetailDto } from '../dto/get-product-detail.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { AdminGuard } from '../../../common/guards/admin.guard';
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Public()
  @Get()
  async getProducts(@Query('category') categorySlug?: string) {
    return this.productService.getProductsByCategorySlugOrAll(categorySlug);
  }

  @Public()
  @Get('promotions')
  async getProductPromotion(@Query('category') categorySlug?: string) {
    return this.productService.getProductPromotionByCategorySlugOrAll(
      categorySlug,
    );
  }

  @Public()
  @Get(':id')
  async getProductDetail(@Param('id') param: GetProductDetailDto) {
    return this.productService.getProductDetail(param.id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image_primary', maxCount: 1 },
      { name: 'images', maxCount: 10 },
    ]),
  )
  async createProduct(
    @Body() dto: CreateProductDto,
    @UploadedFiles()
    files: {
      image_primary?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ) {
    return this.productService.create(dto, files);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image_primary', maxCount: 1 },
      { name: 'images', maxCount: 10 },
    ]),
  )
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles()
    files?: {
      image_primary?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ) {
    return this.productService.update(id, dto, files);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteProduct(@Param('id') id: string) {
    return this.productService.delete(id);
  }
}
