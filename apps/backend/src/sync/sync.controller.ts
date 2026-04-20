import { Controller, Get, Post, Body, Headers, UnauthorizedException, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { SyncService } from './sync.service'
import { Public } from '../auth/decorators/public.decorator'

class SyncUserDto {
  email!: string
  name?: string
  role?: string
  company_slug?: string
  clinic_ids?: string[] | 'ALL'
}

class SyncClinicsDto {
  app_id?: string
  company_slug!: string
  clinics!: { id: string; name: string; active?: boolean }[]
}

@ApiTags('Sync')
@Controller('sync')
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly config: ConfigService,
  ) {}

  private assertAuth(auth: string): void {
    const secret = this.config.get<string>('JWT_SECRET') ?? ''
    if (!secret || auth !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Unauthorized')
    }
  }

  @Post('user')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hub → App user sync' })
  async syncUser(
    @Headers('authorization') auth: string,
    @Body() dto: SyncUserDto,
  ) {
    this.assertAuth(auth)
    if (!dto.email) throw new BadRequestException('email is required')
    return this.syncService.upsertUser(
      dto.email, dto.name, dto.role, dto.company_slug, dto.clinic_ids,
    )
  }

  @Get('clinics')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'App → Hub clinic list (work centers)' })
  async listClinics(@Headers('authorization') auth: string) {
    this.assertAuth(auth)
    return this.syncService.listWorkCenters()
  }

  @Post('clinics')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hub → App clinic upsert (work centers)' })
  async upsertClinics(
    @Headers('authorization') auth: string,
    @Body() dto: SyncClinicsDto,
  ) {
    this.assertAuth(auth)
    if (!dto.company_slug || !Array.isArray(dto.clinics)) {
      throw new BadRequestException('company_slug and clinics[] required')
    }
    return this.syncService.upsertWorkCenters(dto.company_slug, dto.clinics)
  }
}
