import {
  IsString, IsEmail, IsOptional, IsBoolean, IsNumber, IsArray,
  IsEnum, IsDateString, MinLength, MaxLength, Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ClockMethod, UserRole } from '@prisma/client';

export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dni?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'EMP-001' })
  @IsString()
  @MaxLength(50)
  employeeCode: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workCenterId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contractType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiProperty({ required: false, example: '1234' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(8)
  pin?: string;

  @ApiProperty({ required: false, enum: ClockMethod, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ClockMethod, { each: true })
  allowedMethods?: ClockMethod[];

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  allowMobile?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  allowWeb?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  allowKiosk?: boolean;

  @ApiProperty({ required: false, default: 40 })
  @IsOptional()
  @IsNumber()
  weeklyHours?: number;

  @ApiProperty({ required: false, enum: UserRole, default: UserRole.EMPLOYEE })
  @IsOptional()
  @IsEnum(UserRole)
  portalRole?: UserRole;
}
