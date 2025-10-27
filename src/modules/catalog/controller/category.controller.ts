import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from '../service/category.service';
import { Public } from '../../auth/decorators/public.decorator';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Public()
  @Get()
  async getAllCategories() {
    return this.categoryService.findAll();
  }

  @Public()
  @Get('root')
  async getRootCategories() {
    return this.categoryService.findRootCategories();
  }

  @Public()
  @Get(':id')
  async getCategoryById(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  @Public()
  @Get(':id/children')
  async getCategoryChildren(@Param('id') id: string) {
    return this.categoryService.findChildren(id);
  }

  @Public()
  @Get('slug/:slug')
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.categoryService.findBySlug(slug);
  }

  @Post()
  @UseGuards(AdminGuard)
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }
}
