import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards, Req,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';

interface AuthRequest extends Request {
  user: { sub: string; email: string };
}

@UseGuards(JwtGuard)
@Controller('business')
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateBusinessDto) {
    return this.businessService.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.businessService.findAll(req.user.sub);
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.businessService.findOne(id, req.user.sub);
  }

  @Get(':id/dashboard')
  dashboard(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.businessService.getDashboard(id, req.user.sub);
  }

  @Put(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateBusinessDto) {
    return this.businessService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.businessService.remove(id, req.user.sub);
  }
}