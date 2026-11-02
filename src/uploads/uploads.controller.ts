import type { MultipartFile } from '@fastify/multipart';
import {
  BadRequestException,
  Controller,
  PayloadTooLargeException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  ApiEnvelopeResponse,
  ApiStandardErrors,
} from '../common/decorators/api-envelope-response.decorator.js';
import { UploadImageResponseDto } from './dto/upload-image-response.dto.js';
import { type ProcessedImageResult, UploadsService } from './uploads.service.js';

type FastifyMultipartRequest = FastifyRequest & {
  file: () => Promise<MultipartFile | undefined>;
};

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
  @ApiEnvelopeResponse(UploadImageResponseDto, {
    status: 201,
    description: 'Image processed and converted to WebP successfully',
  })
  @ApiStandardErrors([400, 401, 500])
  async uploadImage(@Req() req: FastifyRequest): Promise<ProcessedImageResult> {
    const multipartReq = req as FastifyMultipartRequest;
    let file: MultipartFile | undefined;

    try {
      file = await multipartReq.file();
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error?.code === 'FST_REQ_FILE_TOO_LARGE' || error?.code === 'FST_FILES_LIMIT') {
        throw new PayloadTooLargeException('El archivo supera el tamaño máximo permitido de 8MB');
      }
      if (
        error?.code === 'ERR_STREAM_PREMATURE_CLOSE' ||
        error?.code === 'FST_MP_PREMATURE_CLOSE' ||
        error?.message?.toLowerCase().includes('premature close')
      ) {
        throw new BadRequestException('La conexión se interrumpió durante la subida de la imagen');
      }
      throw new BadRequestException(error?.message || 'Error al procesar el archivo');
    }

    if (!file) {
      throw new BadRequestException('No image file provided in multipart request');
    }

    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error?.code === 'FST_REQ_FILE_TOO_LARGE' || error?.code === 'FST_FILES_LIMIT') {
        throw new PayloadTooLargeException('El archivo supera el tamaño máximo permitido de 8MB');
      }
      if (
        error?.code === 'ERR_STREAM_PREMATURE_CLOSE' ||
        error?.code === 'FST_MP_PREMATURE_CLOSE' ||
        error?.message?.toLowerCase().includes('premature close')
      ) {
        throw new BadRequestException('La conexión se interrumpió durante la subida de la imagen');
      }
      throw new BadRequestException(error?.message || 'Error al leer el archivo de imagen');
    }

    return this.uploadsService.processImage(buffer, file.filename);
  }
}
