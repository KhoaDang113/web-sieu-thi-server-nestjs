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
} from '@nestjs/common';
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
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteProduct(@Param('id') id: string) {
    return this.productService.delete(id);
  }
}
