import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { FavoritesService } from './favorites.service.js';

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List all favorite pensions for the current user' })
  @ApiResponse({ status: 200, description: 'List of user favorites' })
  async findAll(@CurrentUser() user: SanitizedUser): Promise<unknown[]> {
    return this.favoritesService.findAllByUser(user.id);
  }

  @Post(':pensionId')
  @ApiOperation({ summary: 'Add a pension to favorites' })
  @ApiResponse({ status: 201, description: 'Favorite added successfully' })
  @ApiResponse({ status: 409, description: 'Already favorited' })
  async add(
    @Param('pensionId') pensionId: string,
    @CurrentUser() user: SanitizedUser,
  ): Promise<{ added: boolean }> {
    return this.favoritesService.addFavorite(user.id, pensionId);
  }

  @Delete(':pensionId')
  @ApiOperation({ summary: 'Remove a pension from favorites' })
  @ApiResponse({ status: 200, description: 'Favorite removed successfully' })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  async remove(
    @Param('pensionId') pensionId: string,
    @CurrentUser() user: SanitizedUser,
  ): Promise<{ removed: boolean }> {
    return this.favoritesService.removeFavorite(user.id, pensionId);
  }
}
