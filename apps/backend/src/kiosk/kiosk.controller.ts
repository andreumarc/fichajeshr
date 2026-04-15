import {
  Controller, Post, Get, Body, Query, Req, HttpCode, HttpStatus, Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { KioskService } from './kiosk.service';
import { KioskIdentifyDto } from './dto/kiosk-identify.dto';
import { KioskClockDto } from './dto/kiosk-clock.dto';
import { Public } from '../auth/decorators/public.decorator';

// Kiosk endpoints use a shared company API key instead of user JWT
// The API key is tied to a company's kiosk configuration
@ApiTags('Kiosk')
@Controller('kiosk')
export class KioskController {
  constructor(private readonly kioskService: KioskService) {}

  /**
   * Identify employee - called before showing clock buttons
   * Requires X-Company-Id header (set in kiosk device configuration)
   */
  @Post('identify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Identify employee by PIN, code, or QR' })
  @ApiHeader({ name: 'X-Company-Id', required: true })
  identify(
    @Body() dto: KioskIdentifyDto,
    @Headers('x-company-id') companyId: string,
    @Req() req: Request,
  ) {
    if (!companyId) {
      throw new Error('X-Company-Id header required');
    }
    return this.kioskService.identifyEmployee(dto, companyId);
  }

  /**
   * Perform clock action (check-in, check-out, break)
   * Called after employee identification
   */
  @Post('clock')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Perform clock action for identified employee' })
  @ApiHeader({ name: 'X-Company-Id', required: true })
  clock(
    @Body() dto: KioskClockDto,
    @Headers('x-company-id') companyId: string,
    @Req() req: Request,
  ) {
    if (!companyId) {
      throw new Error('X-Company-Id header required');
    }
    return this.kioskService.performClock(dto, companyId, {
      ip: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    });
  }

  /**
   * Get employee list for the kiosk selector screen
   */
  @Get('employees')
  @Public()
  @ApiOperation({ summary: 'Get employee list for kiosk selector' })
  @ApiHeader({ name: 'X-Company-Id', required: true })
  getEmployees(
    @Headers('x-company-id') companyId: string,
    @Query('workCenterId') workCenterId?: string,
  ) {
    if (!companyId) {
      throw new Error('X-Company-Id header required');
    }
    return this.kioskService.getEmployeeList(companyId, workCenterId);
  }
}
