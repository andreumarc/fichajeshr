import { Controller, Post, Body, Headers, UnauthorizedException, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { SyncService } from './sync.service'
import { Public } from '../auth/decorators/public.decorator'

class SyncUserDto {
  email!: string
  name?: string
  role?: string
  company_slug?: string
}

@ApiTags('Sync')
@Controller('sync')
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly config: ConfigService,
  ) {}

  @Post('user')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hub → App user sync' })
  async syncUser(
    @Headers('authorization') auth: string,
    @Body() dto: SyncUserDto,
  ) {
    const secret = this.config.get<string>('JWT_SECRET') ?? ''
    if (!secret || auth !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Unauthorized')
    }
    if (!dto.email) throw new BadRequestException('email is required')
    return this.syncService.upsertUser(dto.email, dto.name, dto.role, dto.company_slug)
  }
}
