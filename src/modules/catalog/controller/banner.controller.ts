import { Public } from 'src/modules/auth/decorators/public.decorator';
import { BannerService } from '../service/banner.service';
import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CreateBannerDto } from '../dto/create-banner.dto';
import { UpdateBannerDto } from '../dto/update-banner.dto';
import { AdminGuard } from 'src/common/guards/admin.guard';

@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Public()
  @Get()
  async getBanners(@Query('category') categorySlug?: string) {
    return this.bannerService.getBannersByCategorySlugOrAll(categorySlug);
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() createBannerDto: CreateBannerDto) {
    return this.bannerService.create(createBannerDto);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
  ) {
    return this.bannerService.update(id, updateBannerDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async delete(@Param('id') id: string) {
    return this.bannerService.delete(id);
  }
}
