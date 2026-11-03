import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { NearbyCityCountDto } from '../../pensions/dto/pension-response.dto.js';
import { PaginationMetaDto } from '../dto/pagination.dto.js';
import { ErrorEnvelopeDto } from '../types/error-codes.js';

export type EnvelopeOptions = {
  status?: number;
  description?: string;
  isArray?: boolean;
};

export const ApiEnvelopeResponse = <TModel extends Type<unknown>>(
  model?: TModel,
  options: EnvelopeOptions = {},
): MethodDecorator => {
  const status = options.status ?? 200;
  const description = options.description ?? 'Operación exitosa';
  const isArray = options.isArray ?? false;

  const dataSchema = model
    ? isArray
      ? {
          type: 'array',
          items: { $ref: getSchemaPath(model) },
        }
      : {
          $ref: getSchemaPath(model),
        }
    : {
        type: 'object',
        nullable: true,
      };

  const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [];

  if (model) {
    decorators.push(ApiExtraModels(model));
  }

  decorators.push(
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: status },
          timestamp: { type: 'string', example: '2026-11-02T01:00:00.000Z' },
          data: dataSchema,
        },
        required: ['success', 'statusCode', 'timestamp', 'data'],
      },
    }),
  );

  return applyDecorators(...decorators);
};

export const ApiPaginatedEnvelopeResponse = <TItemModel extends Type<unknown>>(
  itemModel: TItemModel,
  options: EnvelopeOptions = {},
): MethodDecorator => {
  const status = options.status ?? 200;
  const description = options.description ?? 'Listado paginado exitoso';

  return applyDecorators(
    ApiExtraModels(itemModel, PaginationMetaDto, NearbyCityCountDto),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: status },
          timestamp: { type: 'string', example: '2026-11-02T01:00:00.000Z' },
          data: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(itemModel) },
              },
              pagination: {
                $ref: getSchemaPath(PaginationMetaDto),
              },
              total: { type: 'number', example: 45 },
              page: { type: 'number', example: 1 },
              limit: { type: 'number', example: 20 },
              totalPages: { type: 'number', example: 3 },
              hasMore: { type: 'boolean', example: true },
              nearbyCityCounts: {
                type: 'array',
                items: { $ref: getSchemaPath(NearbyCityCountDto) },
              },
            },
            required: ['items', 'pagination', 'total', 'page', 'limit', 'totalPages'],
          },
        },
        required: ['success', 'statusCode', 'timestamp', 'data'],
      },
    }),
  );
};

export const ApiStandardErrors = (
  errors: Array<400 | 401 | 403 | 404 | 409 | 429 | 500> = [400, 401, 500],
): MethodDecorator => {
  const descriptions: Record<number, string> = {
    400: 'Solicitud inválida o error de validación de datos',
    401: 'No autorizado / credenciales ausentes o incorrectas',
    403: 'Acceso prohibido / permisos insuficientes',
    404: 'Recurso no encontrado',
    409: 'Conflicto con el estado actual del recurso',
    429: 'Demasiadas solicitudes / límite de tasa excedido',
    500: 'Error interno del servidor',
  };

  const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [
    ApiExtraModels(ErrorEnvelopeDto),
  ];

  for (const status of errors) {
    decorators.push(
      ApiResponse({
        status,
        description: descriptions[status] || 'Error en la solicitud',
        type: ErrorEnvelopeDto,
      }),
    );
  }

  return applyDecorators(...decorators);
};
