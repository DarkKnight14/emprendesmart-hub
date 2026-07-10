import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBusinessDto) {
    return this.prisma.business.create({
      data: {
        name: dto.name,
        category: dto.category,
        description: dto.description,
        ownerId: userId,
      },
      include: { activities: true },
    });
  }

  async findAll(userId: string) {
    return this.prisma.business.findMany({
      where: { ownerId: userId },
      include: { activities: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: { activities: true },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    if (business.ownerId !== userId) throw new ForbiddenException('Sin acceso');
    return business;
  }

  async update(id: string, userId: string, dto: UpdateBusinessDto) {
    await this.findOne(id, userId);
    return this.prisma.business.update({
      where: { id },
      data: dto,
      include: { activities: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.business.delete({ where: { id } });
    return { message: 'Negocio eliminado' };
  }

  async getDashboard(id: string, userId: string) {
    const business = await this.findOne(id, userId);

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonth, lastMonth] = await Promise.all([
      this.prisma.activity.findMany({
        where: { businessId: id, activityDate: { gte: firstOfMonth } },
      }),
      this.prisma.activity.findMany({
        where: {
          businessId: id,
          activityDate: { gte: firstOfLastMonth, lte: lastOfLastMonth },
        },
      }),
    ]);

    const sum = (arr: { type: string; amount: number }[], type: string) =>
      arr.filter((a) => a.type === type).reduce((s, a) => s + a.amount, 0);

    const ingresos = sum(thisMonth, 'ingreso');
    const gastos = sum(thisMonth, 'gasto');
    const ingresosL = sum(lastMonth, 'ingreso');
    const gastosL = sum(lastMonth, 'gasto');
    const pct = (a: number, b: number) =>
      b === 0 ? 0 : Math.round(((a - b) / b) * 100);

    // Distribución por categoría (últimos 30 días)
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    const gastosArr = await this.prisma.activity.groupBy({
      by: ['type'],
      where: { businessId: id, type: 'gasto', activityDate: { gte: last30 } },
      _sum: { amount: true },
    });

    return {
      negocio: { id: business.id, name: business.name, category: business.category },
      kpis: {
        ingresos:    { valor: ingresos,            pct: pct(ingresos, ingresosL) },
        gastos:      { valor: gastos,              pct: pct(gastos, gastosL) },
        ganancia:    { valor: ingresos - gastos,   pct: pct(ingresos - gastos, ingresosL - gastosL) },
        actividades: { valor: thisMonth.length,    pct: thisMonth.length - lastMonth.length },
      },
      distribucion: gastosArr,
    };
  }
}
