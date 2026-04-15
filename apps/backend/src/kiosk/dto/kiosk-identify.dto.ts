import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ClockMethod } from '@prisma/client';

export class KioskIdentifyDto {
  @ApiProperty({ enum: [ClockMethod.PIN, ClockMethod.EMPLOYEE_CODE, ClockMethod.QR_CODE] })
  @IsEnum([ClockMethod.PIN, ClockMethod.EMPLOYEE_CODE, ClockMethod.QR_CODE])
  method: ClockMethod;

  @ApiProperty({ required: false, example: 'EMP-001' })
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @ApiProperty({ required: false, example: '1234' })
  @IsOptional()
  @IsString()
  @Length(4, 8)
  pin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  qrToken?: string;
}
