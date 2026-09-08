import type { MultipartFile } from '@fastify/multipart';
import { BadRequestException, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { type ProcessedImageResult, UploadsService } from './uploads.service.js';

interface FastifyMultipartRequest extends FastifyRequest {
  file: () => Promise<MultipartFile | undefined>;
}

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('images')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and process image to WebP with responsive variants' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WebP, AVIF, HEIF, GIF - max 8MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image processed and converted to WebP successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: '/uploads/abcd-1234.webp' },
        thumbnailUrl: { type: 'string', example: '/uploads/abcd-1234-thumb.webp' },
        width: { type: 'number', example: 1200 },
        height: { type: 'number', example: 800 },
        format: { type: 'string', example: 'webp' },
        size: { type: 'number', example: 124500 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid image or unsupported format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadImage(@Req() req: FastifyRequest): Promise<ProcessedImageResult> {
    const multipartReq = req as FastifyMultipartRequest;
    const file = await multipartReq.file();
    if (!file) {
      throw new BadRequestException('No image file provided in multipart request');
    }

    const buffer = await file.toBuffer();
    return this.uploadsService.processImage(buffer, file.filename);
  }
}
