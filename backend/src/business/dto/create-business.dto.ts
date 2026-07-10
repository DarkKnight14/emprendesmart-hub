import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;
}
