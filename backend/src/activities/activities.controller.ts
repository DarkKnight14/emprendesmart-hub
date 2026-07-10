import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';

interface AuthRequest extends Request {
  user: { sub: string; email: string };
}

@UseGuards(JwtGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private activitiesService: ActivitiesService) {}

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateActivityDto) {
    return this.activitiesService.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Req() req: AuthRequest, @Query('businessId') businessId?: string) {
    return this.activitiesService.findAll(req.user.sub, businessId);
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.activitiesService.findOne(id, req.user.sub);
  }

  @Put(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.activitiesService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.activitiesService.remove(id, req.user.sub);
  }
}