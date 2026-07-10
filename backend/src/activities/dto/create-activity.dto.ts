import { IsString, IsOptional, IsNumber, IsDateString, IsIn } from 'class-validator';

export class CreateActivityDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsIn(['ingreso', 'gasto', 'tarea', 'cliente'])
  type: string;

  @IsNumber()
  amount: number;

  @IsDateString()
  activityDate: string;

  @IsString()
  businessId: string;
}
