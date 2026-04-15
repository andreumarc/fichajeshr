import { IsEnum, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TimeEntryType, ClockMethod } from '@prisma/client';

export class KioskClockDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({ enum: [TimeEntryType.CHECK_IN, TimeEntryType.CHECK_OUT, TimeEntryType.BREAK_START, TimeEntryType.BREAK_END] })
  @IsEnum([TimeEntryType.CHECK_IN, TimeEntryType.CHECK_OUT, TimeEntryType.BREAK_START, TimeEntryType.BREAK_END])
  type: TimeEntryType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workCenterId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(ClockMethod)
  identificationMethod?: ClockMethod;
}
