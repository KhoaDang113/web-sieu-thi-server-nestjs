import {
  Controller,
  Req,
  UnauthorizedException,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { UserService } from './user.service';
import type { Request } from 'express';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getUserProfile(@Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.userService.getUserProfile(userId);
  }

  @Put('profile')
  async updateUserProfile(
    @Req() req: Request,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.userService.updateUserProfile(userId, updateUserProfileDto);
  }

  @UseGuards(AdminGuard)
  @Get('admin/all')
  async getAllUsers(@Query() dto: GetUsersDto) {
    return this.userService.getAllUsers(dto);
  }

  @UseGuards(AdminGuard)
  @Get('admin/:id')
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @UseGuards(AdminGuard)
  @Put('admin/:id')
  async updateUserByAdmin(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserByAdminDto,
  ) {
    return this.userService.updateUserByAdmin(id, updateDto);
  }

  @UseGuards(AdminGuard)
  @Patch('admin/:id/lock')
  async lockUser(@Param('id') id: string) {
    return this.userService.lockUser(id);
  }

  @UseGuards(AdminGuard)
  @Patch('admin/:id/unlock')
  async unlockUser(@Param('id') id: string) {
    return this.userService.unlockUser(id);
  }
}
