import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  ApiEnvelopeResponse,
  ApiStandardErrors,
} from '../common/decorators/api-envelope-response.decorator.js';
import { AuthService } from './auth.service.js';
import { AuthRateLimitService } from './auth-rate-limit.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import {
  AuthResponseDto,
  CheckEmailResponseDto,
  SanitizedUserResponseDto,
} from './dto/auth-response.dto.js';
import { CheckEmailDto } from './dto/check-email.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rateLimitService: AuthRateLimitService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiEnvelopeResponse(AuthResponseDto, {
    status: 201,
    description: 'User successfully created and token issued',
  })
  @ApiStandardErrors([400, 409, 500])
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiEnvelopeResponse(AuthResponseDto, {
    status: 200,
    description: 'Authentication successful',
  })
  @ApiStandardErrors([400, 401, 429, 500])
  async login(@Body() dto: LoginDto, @Req() req: FastifyRequest): Promise<AuthResponseDto> {
    const ip = req.ip || '127.0.0.1';
    await this.rateLimitService.assertLoginAllowed(ip, dto.email, dto.turnstileToken);

    try {
      const response = await this.authService.login(dto);
      this.rateLimitService.resetLoginAttempts(ip, dto.email);
      return response;
    } catch (error) {
      this.rateLimitService.recordFailedLogin(ip, dto.email);
      throw error;
    }
  }

  @Get('check-email')
  @ApiOperation({
    summary: 'Check if an email address is already registered and auto-detect university',
  })
  @ApiQuery({ name: 'email', type: String, required: true, example: 'estudiante.demo@uchile.cl' })
  @ApiEnvelopeResponse(CheckEmailResponseDto, {
    status: 200,
    description: 'Check email status and detected university returned',
  })
  @ApiStandardErrors([400, 429, 500])
  async checkEmail(
    @Query() query: CheckEmailDto,
    @Req() req: FastifyRequest,
  ): Promise<CheckEmailResponseDto> {
    const ip = req.ip || '127.0.0.1';
    this.rateLimitService.assertCheckEmailRateLimit(ip);
    return this.authService.checkEmail(query.email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiEnvelopeResponse(SanitizedUserResponseDto, {
    status: 200,
    description: 'Profile returned',
  })
  @ApiStandardErrors([401, 500])
  async getProfile(
    @CurrentUser() user: SanitizedUserResponseDto,
  ): Promise<SanitizedUserResponseDto> {
    return user;
  }
}
