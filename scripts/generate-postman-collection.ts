import * as fs from 'node:fs/promises';
import * as path from 'node:path';

type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  $ref?: string;
  example?: unknown;
  default?: unknown;
  enum?: Array<string | number>;
  required?: string[];
};

type OpenApiDoc = {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  components?: {
    schemas?: Record<string, JsonSchema>;
  };
  paths: Record<
    string,
    Record<
      string,
      {
        operationId?: string;
        summary?: string;
        description?: string;
        tags?: string[];
        security?: Array<Record<string, unknown>>;
        parameters?: Array<{
          name: string;
          in: 'query' | 'path' | 'header';
          required?: boolean;
          description?: string;
          schema?: JsonSchema;
        }>;
        requestBody?: {
          required?: boolean;
          content?: {
            [mediaType: string]: {
              schema?: JsonSchema;
            };
          };
        };
      }
    >
  >;
};

type PostmanUrl = {
  raw: string;
  host: string[];
  path: string[];
  query?: Array<{
    key: string;
    value: string;
    description?: string;
    disabled?: boolean;
  }>;
  variable?: Array<{
    key: string;
    value: string;
    description?: string;
  }>;
};

type PostmanItem = {
  name: string;
  event?: Array<{
    listen: 'test' | 'prerequest';
    script: {
      exec: string[];
      type: 'text/javascript';
    };
  }>;
  request: {
    method: string;
    header: Array<{
      key: string;
      value: string;
      type: 'text';
    }>;
    body?: {
      mode: 'raw' | 'formdata';
      raw?: string;
      options?: {
        raw: {
          language: 'json';
        };
      };
      formdata?: Array<{
        key: string;
        type: 'file' | 'text';
        src?: string;
        value?: string;
        description?: string;
      }>;
    };
    url: PostmanUrl;
    description?: string;
    auth?:
      | {
          type: 'bearer';
          bearer: Array<{ key: 'token'; value: string; type: 'string' }>;
        }
      | {
          type: 'noauth';
        };
  };
};

type PostmanFolder = {
  name: string;
  item: PostmanItem[];
};

type PostmanCollection = {
  info: {
    _postman_id: string;
    name: string;
    description: string;
    schema: string;
  };
  variable: Array<{
    key: string;
    value: string;
    type: 'string';
  }>;
  auth: {
    type: 'bearer';
    bearer: Array<{
      key: 'token';
      value: string;
      type: 'string';
    }>;
  };
  item: Array<PostmanFolder | PostmanItem>;
};

const resolveSchemaRef = (
  schema: JsonSchema | undefined,
  schemas: Record<string, JsonSchema> | undefined,
): JsonSchema | undefined => {
  if (!schema) return undefined;
  if (schema.$ref) {
    const refKey = schema.$ref.replace('#/components/schemas/', '');
    return schemas?.[refKey];
  }
  return schema;
};

const generateExampleFromSchema = (
  rawSchema: JsonSchema | undefined,
  schemas: Record<string, JsonSchema> | undefined,
  depth = 0,
): unknown => {
  if (!rawSchema || depth > 5) return null;
  const schema = resolveSchemaRef(rawSchema, schemas);
  if (!schema) return null;

  if (schema.example !== undefined) {
    return schema.example;
  }

  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }

  if (schema.type === 'string') {
    return 'ejemplo';
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    return 1;
  }

  if (schema.type === 'boolean') {
    return true;
  }

  if (schema.type === 'array') {
    const itemExample = generateExampleFromSchema(schema.items, schemas, depth + 1);
    return itemExample !== null ? [itemExample] : [];
  }

  if (schema.type === 'object' || schema.properties) {
    const result: Record<string, unknown> = {};
    const props = schema.properties || {};
    const requiredKeys = new Set(schema.required || []);
    for (const [key, propSchema] of Object.entries(props)) {
      const resolved = resolveSchemaRef(propSchema, schemas);
      if (!requiredKeys.has(key) && resolved?.example === '00000000-0000-0000-0000-000000000000') {
        continue;
      }
      result[key] = generateExampleFromSchema(propSchema, schemas, depth + 1);
    }
    return result;
  }

  return null;
};

const resolvePathVariableDefault = (
  routePath: string,
  paramName: string,
  example?: unknown,
): string => {
  if (paramName === 'pensionId') return '{{pensionId}}';
  if (paramName === 'roomId') return '{{roomId}}';
  if (paramName === 'universityId') return '{{universityId}}';
  if (paramName === 'reviewId') return '{{reviewId}}';
  if (paramName === 'reportId') return '{{reportId}}';
  if (paramName === 'proposalId') return '{{proposalId}}';
  if (paramName === 'idOrSlug') return '{{pensionId}}';

  if (paramName === 'id') {
    if (
      routePath.startsWith('/pensions') &&
      !routePath.includes('/rooms') &&
      !routePath.includes('/reviews') &&
      !routePath.includes('/proposals')
    ) {
      return '{{pensionId}}';
    }
    if (routePath.startsWith('/pensions') && routePath.includes('/proposals')) {
      return '{{pensionId}}';
    }
    if (routePath.startsWith('/rooms') || routePath.includes('/rooms/')) {
      return '{{roomId}}';
    }
    if (routePath.startsWith('/universities')) {
      return '{{universityId}}';
    }
    if (routePath.startsWith('/reviews')) {
      return '{{reviewId}}';
    }
    if (routePath.startsWith('/reports')) {
      return '{{reportId}}';
    }
    if (routePath.startsWith('/moderation/proposals')) {
      return '{{proposalId}}';
    }
    if (routePath.startsWith('/moderation/reviews')) {
      return '{{reviewId}}';
    }
    if (routePath.startsWith('/moderation/pensions')) {
      return '{{pensionId}}';
    }
  }

  if (example !== undefined && example !== null && String(example).trim() !== '') {
    return String(example);
  }

  return `test-${paramName}`;
};

const generateTestScript = (extractions: Record<string, string>): string[] => {
  const lines: string[] = [
    'try {',
    '  const res = pm.response.json();',
    '  const data = res && res.data !== undefined ? res.data : res;',
    '  const setVar = (key, val) => {',
    '    if (val === undefined || val === null || val === "") return;',
    '    const str = String(val);',
    '    if (typeof pm !== "undefined") {',
    '      if (pm.collectionVariables) pm.collectionVariables.set(key, str);',
    '      if (pm.environment) pm.environment.set(key, str);',
    '      if (pm.globals) pm.globals.set(key, str);',
    '    }',
    '    if (typeof postman !== "undefined" && postman.setEnvironmentVariable) {',
    '      postman.setEnvironmentVariable(key, str);',
    '    }',
    '    console.log(`[BuscaTuNido] Variable asignada {{${key}}}: ${str}`);',
    '  };',
    '  const first = (arrOrObj) => {',
    '    if (!arrOrObj) return null;',
    '    if (Array.isArray(arrOrObj)) return arrOrObj.length > 0 ? arrOrObj[0] : null;',
    '    if (arrOrObj.items && Array.isArray(arrOrObj.items)) return arrOrObj.items.length > 0 ? arrOrObj.items[0] : null;',
    '    if (typeof arrOrObj === "object") return arrOrObj;',
    '    return null;',
    '  };',
    '  const reqEmail = (() => {',
    '    try {',
    '      if (typeof pm !== "undefined" && pm.request && pm.request.body && pm.request.body.raw) {',
    '        return JSON.parse(pm.request.body.raw).email || null;',
    '      }',
    '    } catch (e) {}',
    '    return null;',
    '  })();',
  ];

  for (const [varName, expr] of Object.entries(extractions)) {
    lines.push(`  setVar("${varName}", ${expr});`);
  }

  lines.push('} catch (e) {');
  lines.push('  console.warn("[BuscaTuNido] Error al extraer variables de respuesta:", e.message);');
  lines.push('}');

  return lines;
};

const getEndpointExtractions = (
  routePath: string,
  method: string,
): Record<string, string> | undefined => {
  if (routePath === '/auth/login' && method === 'POST') {
    return {
      token: 'data.accessToken || (res && res.accessToken)',
      userId: 'data.user?.id || data.userId',
    };
  }
  if (routePath === '/auth/register' && method === 'POST') {
    return {
      token: 'data.accessToken || (res && res.accessToken)',
      userId: 'data.user?.id || data.userId',
      email: 'data.user?.email || reqEmail',
    };
  }
  if (routePath === '/auth/me' && method === 'GET') {
    return {
      userId: 'data.id || data.user?.id',
    };
  }
  if (routePath === '/pensions' && method === 'POST') {
    return {
      pensionId: 'data.id',
      pensionSlug: 'data.slug',
    };
  }
  if (routePath === '/pensions' && method === 'GET') {
    return {
      pensionId: 'first(data)?.id',
      pensionSlug: 'first(data)?.slug',
    };
  }
  if (routePath === '/pensions/{idOrSlug}' && method === 'GET') {
    return {
      pensionId: 'data.id',
      pensionSlug: 'data.slug',
    };
  }
  if (routePath === '/pensions/{pensionId}/rooms' && method === 'POST') {
    return {
      roomId: 'data.id',
    };
  }
  if (routePath === '/pensions/{pensionId}/rooms' && method === 'GET') {
    return {
      roomId: 'first(data)?.id',
    };
  }
  if (routePath === '/rooms/{id}' && method === 'GET') {
    return {
      roomId: 'data.id',
    };
  }
  if (routePath === '/universities' && method === 'POST') {
    return {
      universityId: 'data.id',
    };
  }
  if (routePath === '/universities' && method === 'GET') {
    return {
      universityId: 'first(data)?.id',
    };
  }
  if (routePath === '/universities/{id}' && method === 'GET') {
    return {
      universityId: 'data.id',
    };
  }
  if (routePath === '/pensions/{pensionId}/reviews' && method === 'POST') {
    return {
      reviewId: 'data.id',
    };
  }
  if (routePath === '/pensions/{pensionId}/reviews' && method === 'GET') {
    return {
      reviewId: 'first(data)?.id',
    };
  }
  if (routePath === '/reports' && method === 'POST') {
    return {
      reportId: 'data.id',
    };
  }
  if (routePath === '/reports' && method === 'GET') {
    return {
      reportId: 'first(data)?.id',
    };
  }
  if (routePath === '/pensions/{id}/proposals' && method === 'POST') {
    return {
      proposalId: 'data.id',
    };
  }
  if (routePath === '/moderation/proposals' && method === 'GET') {
    return {
      proposalId: 'first(data)?.id',
    };
  }
  if (routePath === '/moderation/proposals/{id}' && method === 'GET') {
    return {
      proposalId: 'data.id',
    };
  }
  if (routePath === '/uploads/images' && method === 'POST') {
    return {
      uploadedImageUrl: 'data.url || data.variants?.medium || data.variants?.full',
    };
  }
  return undefined;
};

const DEFAULT_ENDPOINT_BODIES: Record<string, Record<string, unknown>> = {
  'POST /pensions': {
    title: 'Residencia San Joaquín',
    description:
      'Excelente pensión cerca de campus San Joaquín, habitaciones amobladas con WiFi y áreas comunes.',
    address: 'Av. Vicuña Mackenna 4860',
    city: 'Santiago',
    neighborhood: 'San Joaquín',
    latitude: -33.4996,
    longitude: -70.6145,
    baseMonthlyPrice: 250000,
    deposit: 250000,
    currency: 'CLP',
    waterIncluded: true,
    electricityIncluded: true,
    gasIncluded: true,
    internetIncluded: true,
    curfewTime: '23:00',
    guestsAllowed: true,
    smokingAllowed: false,
    petsAllowed: false,
    genderPreference: 'ANY',
    quietHoursStart: '23:00',
    quietHoursEnd: '07:00',
    amenitySlugs: ['wifi-alta-velocidad', 'bano-privado'],
    nearbyUniversityId: '{{universityId}}',
    distanceMeters: 500,
  },
  'PATCH /pensions/{id}': {
    title: 'Residencia San Joaquín - Actualizada',
    description:
      'Pensión universitaria renovada con nuevas habitaciones disponibles y ambiente tranquilo.',
    baseMonthlyPrice: 260000,
    deposit: 260000,
    curfewTime: '23:30',
  },
  'POST /pensions/{pensionId}/rooms': {
    roomNumber: 'Hab 101',
    title: 'Habitación Individual Luminosa',
    description: 'Pieza amoblada con clóset, escritorio y buena iluminación para estudio.',
    type: 'SINGLE',
    monthlyPrice: 250000,
    deposit: 250000,
    hasPrivateBathroom: true,
    totalBeds: 1,
    availableBeds: 1,
    isAvailable: true,
    images: ['{{uploadedImageUrl}}'],
  },
  'PATCH /rooms/{id}': {
    title: 'Habitación Individual - Precio Promocional',
    monthlyPrice: 240000,
    isAvailable: true,
  },
  'POST /universities': {
    name: 'Universidad de Chile',
    shortName: 'UCH',
    emailDomains: ['uchile.cl', 'alumnos.uchile.cl'],
    city: 'Santiago',
    address: "Av. Libertador Bernardo O'Higgins 1058",
    latitude: -33.4442,
    longitude: -70.6517,
  },
  'PATCH /universities/{id}': {
    name: 'Universidad de Chile - Campus Central',
    shortName: 'UCH',
    emailDomains: ['uchile.cl', 'alumnos.uchile.cl', 'ingenieria.uchile.cl'],
  },
  'POST /pensions/{pensionId}/reviews': {
    overallRating: 5,
    cleanlinessRating: 5,
    landlordRating: 4,
    quietnessRating: 4,
    wifiRating: 5,
    comment:
      'Excelente pensión y ambiente de estudio. La dueña es muy amable y atenta a cualquier necesidad.',
    images: ['{{uploadedImageUrl}}'],
    stayDurationCategory: 'ONE_SEMESTER',
  },
  'PATCH /reviews/{id}': {
    overallRating: 5,
    cleanlinessRating: 5,
    comment: 'Actualización: completé mi segundo semestre aquí y sigo recomendando este lugar 100%.',
    wifiRating: 5,
  },
  'POST /reports': {
    pensionId: '{{pensionId}}',
    reason: 'INACCURATE_PRICE',
    description:
      'El precio cobrado en la visita no coincide con el valor mensual publicado en la ficha de la pensión.',
  },
  'PATCH /reports/{id}': {
    status: 'RESOLVED',
    resolutionNotes: 'Se contactó al arrendador y se corrigió el precio publicado en el perfil.',
  },
  'POST /pensions/{id}/proposals': {
    type: 'BASIC_INFO',
    proposedChanges: {
      curfewTime: '23:30',
      quietHoursStart: '22:00',
      amenitiesToAdd: ['sala-estudio'],
      amenitiesToRemove: [],
    },
    submissionNotes: 'Actualización tras consulta presencial con el arrendador.',
  },
  'PATCH /moderation/proposals/{id}/review': {
    action: 'APPROVE',
    reviewNotes: 'Cambios validados telefónicamente con el propietario de la pensión.',
  },
  'PATCH /moderation/reviews/{id}/visibility': {
    isHidden: true,
    reason:
      'Comentario con lenguaje inapropiado o difamatorio que infringe las normas de la comunidad.',
  },
  'PATCH /moderation/pensions/{id}/status': {
    verificationStatus: 'COMMUNITY_VERIFIED',
    isActive: true,
    reason: 'Pensión validada presencialmente por la comunidad estudiantil.',
  },
};

const main = async (): Promise<void> => {
  const openApiPath = path.resolve(import.meta.dirname, '../../web/src/lib/openapi.json');
  const openApiRaw = await fs.readFile(openApiPath, 'utf-8');
  const openApi: OpenApiDoc = JSON.parse(openApiRaw);

  const schemas = openApi.components?.schemas;

  const collection: PostmanCollection = {
    info: {
      _postman_id: 'buscatunido-echoapi-collection',
      name: 'BuscaTuNido API',
      description:
        'Colección oficial de endpoints para BuscaTuNido API. Configurada con variables dinámicas y scripts de extracción automática para flujos de prueba continuos.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:4000',
        type: 'string',
      },
      {
        key: 'token',
        value: '',
        type: 'string',
      },
      {
        key: 'userId',
        value: '',
        type: 'string',
      },
      {
        key: 'pensionId',
        value: '',
        type: 'string',
      },
      {
        key: 'pensionSlug',
        value: '',
        type: 'string',
      },
      {
        key: 'roomId',
        value: '',
        type: 'string',
      },
      {
        key: 'universityId',
        value: '',
        type: 'string',
      },
      {
        key: 'reviewId',
        value: '',
        type: 'string',
      },
      {
        key: 'reportId',
        value: '',
        type: 'string',
      },
      {
        key: 'proposalId',
        value: '',
        type: 'string',
      },
      {
        key: 'uploadedImageUrl',
        value: '',
        type: 'string',
      },
      {
        key: 'duenoToken',
        value: '',
        type: 'string',
      },
      {
        key: 'studentToken',
        value: '',
        type: 'string',
      },
      {
        key: 'studentEmail',
        value: 'nuevo.estudiante@alumnos.uchile.cl',
        type: 'string',
      },
      {
        key: 'duenoEmail',
        value: 'nuevo.dueno@gmail.com',
        type: 'string',
      },
      {
        key: 'email',
        value: 'nuevo.estudiante@alumnos.uchile.cl',
        type: 'string',
      },
    ],
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{token}}',
          type: 'string',
        },
      ],
    },
    item: [],
  };

  const tagGroups = new Map<string, PostmanItem[]>();

  for (const [routePath, operations] of Object.entries(openApi.paths)) {
    for (const [methodUpper, operation] of Object.entries(operations)) {
      const method = methodUpper.toUpperCase();
      if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
        continue;
      }

      const tagName = operation.tags?.[0] || 'General';
      const pathSegments = routePath
        .split('/')
        .filter(Boolean)
        .map((segment) => {
          if (segment.startsWith('{') && segment.endsWith('}')) {
            const paramName = segment.slice(1, -1);
            return resolvePathVariableDefault(routePath, paramName);
          }
          return segment;
        });

      const urlVariables: Array<{ key: string; value: string; description?: string }> = [];

      const queryParams: Array<{
        key: string;
        value: string;
        description?: string;
        disabled?: boolean;
      }> = [];
      for (const param of operation.parameters || []) {
        if (param.in === 'query') {
          let paramValue =
            param.schema?.example !== undefined
              ? String(param.schema.example)
              : param.schema?.enum?.[0] !== undefined
                ? String(param.schema.enum[0])
                : '';
          if (param.name === 'universityId') {
            paramValue = '{{universityId}}';
          }
          if (param.name === 'email') {
            paramValue = '{{email}}';
          }
          queryParams.push({
            key: param.name,
            value: paramValue,
            description: param.description,
            disabled: !param.required,
          });
        }
      }

      if (routePath === '/auth/check-email' && method === 'GET') {
        const hasEmailParam = queryParams.some((q) => q.key === 'email');
        if (!hasEmailParam) {
          queryParams.push({
            key: 'email',
            value: '{{email}}',
            description: 'Correo electrónico a verificar',
          });
        }
      }

      const headers: Array<{ key: string; value: string; type: 'text' }> = [];
      let requestBody: PostmanItem['request']['body'] = undefined;

      if (operation.requestBody?.content) {
        const jsonContent = operation.requestBody.content['application/json'];
        const multipartContent = operation.requestBody.content['multipart/form-data'];

        if (jsonContent?.schema) {
          headers.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
          const exampleObj = generateExampleFromSchema(jsonContent.schema, schemas);
          requestBody = {
            mode: 'raw',
            raw: JSON.stringify(exampleObj, null, 2),
            options: {
              raw: {
                language: 'json',
              },
            },
          };
        } else if (multipartContent) {
          requestBody = {
            mode: 'formdata',
            formdata: [
              {
                key: 'file',
                type: 'file',
                description: 'Imagen JPEG, PNG o WebP de pensión/habitación (hasta 8MB)',
              },
            ],
          };
        }
      }

      const fallbackBody = DEFAULT_ENDPOINT_BODIES[`${method} ${routePath}`];
      if (!requestBody && fallbackBody) {
        headers.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
        requestBody = {
          mode: 'raw',
          raw: JSON.stringify(fallbackBody, null, 2),
          options: {
            raw: {
              language: 'json',
            },
          },
        };
      }

      const isPublic = !operation.security || operation.security.length === 0;

      if (!isPublic) {
        headers.push({
          key: 'Authorization',
          value: 'Bearer {{token}}',
          type: 'text',
        });
      }

      const postmanItem: PostmanItem = {
        name: operation.summary || `${method} ${routePath}`,
        request: {
          method,
          header: headers,
          body: requestBody,
          url: {
            raw: `{{baseUrl}}${pathSegments.length > 0 ? `/${pathSegments.join('/')}` : ''}${
              queryParams.length > 0 ? `?${queryParams.map((q) => `${q.key}=${q.value}`).join('&')}` : ''
            }`,
            host: ['{{baseUrl}}'],
            path: pathSegments,
            query: queryParams.length > 0 ? queryParams : undefined,
            variable: urlVariables.length > 0 ? urlVariables : undefined,
          },
          description: operation.description,
          auth: isPublic
            ? { type: 'noauth' }
            : {
                type: 'bearer',
                bearer: [
                  {
                    key: 'token',
                    value: '{{token}}',
                    type: 'string',
                  },
                ],
              },
        },
      };

      const authExtractions = {
        token: 'data.accessToken || (res && res.accessToken)',
        userId: 'data.user?.id || data.userId',
      };
      const authTestScript = generateTestScript(authExtractions);

      if (routePath === '/auth/register' && method === 'POST') {
        const registerPresets = [
          {
            name: 'Registro - Estudiante (STUDENT)',
            description:
              'Crear una nueva cuenta de estudiante con dominio institucional. Guarda automáticamente el JWT en {{token}}, {{studentToken}}, el ID en {{userId}}, y el correo registrado en {{studentEmail}} y {{email}} para ser usado en el login.',
            body: {
              email: 'nuevo.estudiante@alumnos.uchile.cl',
              password: 'Password123!',
              firstName: 'Estudiante',
              lastName: 'Demo',
              phone: '+56912345678',
              role: 'STUDENT',
            },
            extractions: {
              token: 'data.accessToken || (res && res.accessToken)',
              userId: 'data.user?.id || data.userId',
              studentToken: 'data.accessToken || (res && res.accessToken)',
              studentEmail: 'data.user?.email || reqEmail',
              email: 'data.user?.email || reqEmail',
            },
          },
          {
            name: 'Registro - Dueño / Propietario (LANDLORD)',
            description:
              'Crear una nueva cuenta de dueño / propietario de pensión. Guarda automáticamente el JWT en {{token}}, {{duenoToken}}, el ID en {{userId}}, y el correo registrado en {{duenoEmail}} y {{email}} para ser usado en el login.',
            body: {
              email: 'nuevo.dueno@gmail.com',
              password: 'Password123!',
              firstName: 'Dueño',
              lastName: 'Pensión',
              phone: '+56987654321',
              role: 'LANDLORD',
            },
            extractions: {
              token: 'data.accessToken || (res && res.accessToken)',
              userId: 'data.user?.id || data.userId',
              duenoToken: 'data.accessToken || (res && res.accessToken)',
              duenoEmail: 'data.user?.email || reqEmail',
              email: 'data.user?.email || reqEmail',
            },
          },
        ];

        for (const preset of registerPresets) {
          const registerItem: PostmanItem = {
            name: preset.name,
            request: {
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json', type: 'text' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify(preset.body, null, 2),
                options: {
                  raw: {
                    language: 'json',
                  },
                },
              },
              url: {
                raw: '{{baseUrl}}/auth/register',
                host: ['{{baseUrl}}'],
                path: ['auth', 'register'],
              },
              description: preset.description,
              auth: { type: 'noauth' },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: generateTestScript(preset.extractions),
                },
              },
            ],
          };

          if (!tagGroups.has(tagName)) {
            tagGroups.set(tagName, []);
          }
          tagGroups.get(tagName)?.push(registerItem);
        }
        continue;
      }

      if (routePath === '/auth/login' && method === 'POST') {
        const seedLogins = [
          {
            name: 'Login - Estudiante (STUDENT)',
            role: 'Estudiante (STUDENT)',
            email: '{{studentEmail}}',
            extractions: {
              token: 'data.accessToken || (res && res.accessToken)',
              userId: 'data.user?.id || data.userId',
              studentToken: 'data.accessToken || (res && res.accessToken)',
            },
          },
          {
            name: 'Login - Dueño / Propietario (LANDLORD)',
            role: 'Dueño / Propietario (LANDLORD)',
            email: '{{duenoEmail}}',
            extractions: {
              token: 'data.accessToken || (res && res.accessToken)',
              userId: 'data.user?.id || data.userId',
              duenoToken: 'data.accessToken || (res && res.accessToken)',
            },
          },
          {
            name: 'Login - Moderador (MODERATOR)',
            role: 'Moderador (MODERATOR)',
            email: 'moderador@buscatunido.cl',
            extractions: {
              token: 'data.accessToken || (res && res.accessToken)',
              userId: 'data.user?.id || data.userId',
            },
          },
          {
            name: 'Login - Administrador (ADMIN)',
            role: 'Administrador (ADMIN)',
            email: 'admin@buscatunido.cl',
            extractions: {
              token: 'data.accessToken || (res && res.accessToken)',
              userId: 'data.user?.id || data.userId',
            },
          },
        ];

        for (const account of seedLogins) {
          const roleLoginItem: PostmanItem = {
            name: account.name,
            request: {
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json', type: 'text' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify(
                  {
                    email: account.email,
                    password: 'Password123!',
                  },
                  null,
                  2,
                ),
                options: {
                  raw: {
                    language: 'json',
                  },
                },
              },
              url: {
                raw: '{{baseUrl}}/auth/login',
                host: ['{{baseUrl}}'],
                path: ['auth', 'login'],
              },
              description: `Iniciar sesión como ${account.role} (${account.email}). Guarda automáticamente el JWT en {{token}} y el ID en {{userId}}.`,
              auth: { type: 'noauth' },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: generateTestScript(account.extractions),
                },
              },
            ],
          };

          if (!tagGroups.has(tagName)) {
            tagGroups.set(tagName, []);
          }
          tagGroups.get(tagName)?.push(roleLoginItem);
        }
        continue;
      }

      const extractions = getEndpointExtractions(routePath, method);
      if (extractions) {
        postmanItem.event = [
          {
            listen: 'test',
            script: {
              type: 'text/javascript',
              exec: generateTestScript(extractions),
            },
          },
        ];
      }

      if (!tagGroups.has(tagName)) {
        tagGroups.set(tagName, []);
      }
      tagGroups.get(tagName)?.push(postmanItem);
    }
  }

  for (const [folderName, items] of tagGroups.entries()) {
    collection.item.push({
      name: folderName,
      item: items,
    });
  }

  const outputApiPath = path.resolve(import.meta.dirname, '../buscatunido.postman_collection.json');

  const jsonContent = JSON.stringify(collection, null, 2);
  await fs.writeFile(outputApiPath, jsonContent, 'utf-8');

  console.log(`Postman collection generated successfully:`);
  console.log(`- ${outputApiPath}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
