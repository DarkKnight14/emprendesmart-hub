import { IsString, IsOptional, IsNumber, IsDateString, IsIn } from 'class-validator';

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ingreso', 'gasto', 'tarea', 'cliente'])
  type?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsDateString()
  activityDate?: string;
}
