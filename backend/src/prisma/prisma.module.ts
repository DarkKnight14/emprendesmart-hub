import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()   // ← esta línea es la clave
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}