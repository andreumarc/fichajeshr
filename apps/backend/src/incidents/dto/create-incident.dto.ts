import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { IncidentType } from '@prisma/client';

export class CreateIncidentDto {
  @IsEnum(IncidentType)
  type!: IncidentType;

  @IsString()
  description!: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  employeeId?: string; // HR/Admin can create for another employee

  @IsOptional()
  @IsString()
  timeEntryId?: string;
}

export class ResolveIncidentDto {
  @IsString()
  resolution!: string;
}

export class UpdateIncidentStatusDto {
  @IsEnum(['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'])
  status!: string;

  @IsOptional()
  @IsString()
  resolution?: string;
}
