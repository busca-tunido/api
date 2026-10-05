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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';
import { AuthRateLimitService } from './auth-rate-limit.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { CheckEmailDto } from './dto/check-email.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { AuthResponse, CheckEmailResponse, SanitizedUser } from './types/auth.types.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rateLimitService: AuthRateLimitService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User successfully created and token issued' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests / verification required' })
  async login(@Body() dto: LoginDto, @Req() req: FastifyRequest): Promise<AuthResponse> {
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
  @ApiOperation({ summary: 'Check if an email address is already registered' })
  @ApiResponse({ status: 200, description: 'Check email status returned' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async checkEmail(
    @Query() query: CheckEmailDto,
    @Req() req: FastifyRequest,
  ): Promise<CheckEmailResponse> {
    const ip = req.ip || '127.0.0.1';
    this.rateLimitService.assertCheckEmailRateLimit(ip);
    return this.authService.checkEmail(query.email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: SanitizedUser): Promise<SanitizedUser> {
    return user;
  }
}
