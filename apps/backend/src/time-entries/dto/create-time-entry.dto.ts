import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TimeEntryType, DeviceType, ClockMethod } from '@prisma/client';

export class CreateTimeEntryDto {
  @ApiProperty({ enum: TimeEntryType, required: false })
  @IsOptional()
  @IsEnum(TimeEntryType)
  type?: TimeEntryType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

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
  @Min(0)
  accuracy?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workCenterId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ enum: DeviceType, required: false })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiProperty({ enum: ClockMethod, required: false })
  @IsOptional()
  @IsEnum(ClockMethod)
  clockMethod?: ClockMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isOffline?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  syncedAt?: string;
}
