import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  private async verifyOwnership(businessId: string, userId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (business.ownerId !== userId) throw new ForbiddenException('Sin acceso');
    return business;
  }

  async create(userId: string, dto: CreateActivityDto) {
    await this.verifyOwnership(dto.businessId, userId);
    return this.prisma.activity.create({
      data: {
        title:       dto.title,
        description: dto.description,
        type:        dto.type,
        amount:      dto.amount,
        activityDate: new Date(dto.activityDate),
        businessId:  dto.businessId,
      },
    });
  }

  async findAll(userId: string, businessId?: string) {
    // Obtener negocios del usuario
    const businesses = await this.prisma.business.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const ids = businesses.map((b) => b.id);

    return this.prisma.activity.findMany({
      where: {
        businessId: businessId ? businessId : { in: ids },
      },
      include: { business: { select: { name: true } } },
      orderBy: { activityDate: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: { business: true },
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    await this.verifyOwnership(activity.businessId, userId);
    return activity;
  }

  async update(id: string, userId: string, dto: UpdateActivityDto) {
    const activity = await this.findOne(id, userId);
    return this.prisma.activity.update({
      where: { id: activity.id },
      data: {
        ...dto,
        activityDate: dto.activityDate ? new Date(dto.activityDate) : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.activity.delete({ where: { id } });
    return { message: 'Actividad eliminada' };
  }
}
