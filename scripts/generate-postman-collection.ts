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

const main = async (): Promise<void> => {
  const openApiPath = path.resolve(process.cwd(), '../web/src/lib/openapi.json');
  const openApiRaw = await fs.readFile(openApiPath, 'utf-8');
  const openApi: OpenApiDoc = JSON.parse(openApiRaw);

  const schemas = openApi.components?.schemas;

  const collection: PostmanCollection = {
    info: {
      _postman_id: 'buscatunido-echoapi-collection',
      name: 'BuscaTuNido API',
      description:
        'Colección oficial de endpoints para BuscaTuNido API. Configurada con variables y scripts de extracción automática de JWT para EchoAPI y Postman.',
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
            return `:${segment.slice(1, -1)}`;
          }
          return segment;
        });

      const urlVariables: Array<{ key: string; value: string; description?: string }> = [];
      for (const param of operation.parameters || []) {
        if (param.in === 'path') {
          urlVariables.push({
            key: param.name,
            value:
              param.schema?.example !== undefined ? String(param.schema.example) : `test-${param.name}`,
            description: param.description,
          });
        }
      }

      const queryParams: Array<{
        key: string;
        value: string;
        description?: string;
        disabled?: boolean;
      }> = [];
      for (const param of operation.parameters || []) {
        if (param.in === 'query') {
          queryParams.push({
            key: param.name,
            value:
              param.schema?.example !== undefined
                ? String(param.schema.example)
                : param.schema?.enum?.[0] !== undefined
                  ? String(param.schema.enum[0])
                  : '',
            description: param.description,
            disabled: !param.required,
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

      const testScriptLines = [
        'const res = pm.response.json();',
        'const token = res && res.data ? res.data.accessToken : (res ? res.accessToken : null);',
        'if (token) {',
        '    if (typeof pm !== "undefined") {',
        '        if (pm.globals) pm.globals.set("token", token);',
        '        if (pm.environment) pm.environment.set("token", token);',
        '        if (pm.collectionVariables) pm.collectionVariables.set("token", token);',
        '    }',
        '    if (typeof postman !== "undefined") {',
        '        if (postman.setGlobalVariable) postman.setGlobalVariable("token", token);',
        '        if (postman.setEnvironmentVariable) postman.setEnvironmentVariable("token", token);',
        '    }',
        '    console.log("Token guardado exitosamente en la variable {{token}}");',
        '}',
      ];

      if (routePath === '/auth/login' && method === 'POST') {
        const seedLogins = [
          {
            role: 'Estudiante (STUDENT)',
            email: 'estudiante.demo@uchile.cl',
          },
          {
            role: 'Propietario (LANDLORD)',
            email: 'propietario.demo@buscatunido.cl',
          },
          {
            role: 'Moderador (MODERATOR)',
            email: 'moderador@buscatunido.cl',
          },
          {
            role: 'Administrador (ADMIN)',
            email: 'admin@buscatunido.cl',
          },
        ];

        for (const account of seedLogins) {
          const roleLoginItem: PostmanItem = {
            name: `Login - ${account.role}`,
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
              description: `Iniciar sesión como ${account.role} (${account.email}). Guarda automáticamente el JWT en {{token}}.`,
              auth: { type: 'noauth' },
            },
            event: [
              {
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: testScriptLines,
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

      if (routePath === '/auth/register' && method === 'POST') {
        postmanItem.event = [
          {
            listen: 'test',
            script: {
              type: 'text/javascript',
              exec: testScriptLines,
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

  const outputApiPath = path.resolve(process.cwd(), 'buscatunido.postman_collection.json');
  const outputRootPath = path.resolve(process.cwd(), '../buscatunido.postman_collection.json');

  const jsonContent = JSON.stringify(collection, null, 2);
  await fs.writeFile(outputApiPath, jsonContent, 'utf-8');
  await fs.writeFile(outputRootPath, jsonContent, 'utf-8');

  console.log(`Postman collection generated successfully:`);
  console.log(`- ${outputApiPath}`);
  console.log(`- ${outputRootPath}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
