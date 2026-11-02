import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import {
  ApiEnvelopeResponse,
  ApiStandardErrors,
} from '../common/decorators/api-envelope-response.decorator.js';
import {
  FavoriteAddedResponseDto,
  FavoriteItemResponseDto,
  FavoriteRemovedResponseDto,
} from './dto/favorite-response.dto.js';
import { FavoritesService } from './favorites.service.js';

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List all favorite pensions for the current user' })
  @ApiEnvelopeResponse(FavoriteItemResponseDto, {
    status: 200,
    isArray: true,
    description: 'List of user favorites',
  })
  @ApiStandardErrors([401, 500])
  async findAll(@CurrentUser() user: SanitizedUser): Promise<unknown[]> {
    return this.favoritesService.findAllByUser(user.id);
  }

  @Post(':pensionId')
  @ApiOperation({ summary: 'Add a pension to favorites' })
  @ApiParam({ name: 'pensionId', type: String, description: 'ID de la pensión' })
  @ApiEnvelopeResponse(FavoriteAddedResponseDto, {
    status: 201,
    description: 'Favorite added successfully',
  })
  @ApiStandardErrors([401, 404, 409, 500])
  async add(
    @Param('pensionId') pensionId: string,
    @CurrentUser() user: SanitizedUser,
  ): Promise<{ added: boolean }> {
    return this.favoritesService.addFavorite(user.id, pensionId);
  }

  @Delete(':pensionId')
  @ApiOperation({ summary: 'Remove a pension from favorites' })
  @ApiParam({ name: 'pensionId', type: String, description: 'ID de la pensión' })
  @ApiEnvelopeResponse(FavoriteRemovedResponseDto, {
    status: 200,
    description: 'Favorite removed successfully',
  })
  @ApiStandardErrors([401, 404, 500])
  async remove(
    @Param('pensionId') pensionId: string,
    @CurrentUser() user: SanitizedUser,
  ): Promise<{ removed: boolean }> {
    return this.favoritesService.removeFavorite(user.id, pensionId);
  }
}
