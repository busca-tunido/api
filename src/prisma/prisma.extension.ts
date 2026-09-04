import { Prisma } from '@prisma/client';

export const SOFT_DELETE_MODELS = new Set<string>([
  'User',
  'University',
  'Pension',
  'Room',
  'PensionImage',
  'Amenity',
  'Review',
  'Report',
]);

type SoftDeleteRecord = {
  deletedAt: Date | null;
};

type ModelDelegate = {
  update: (args: { where: unknown; data: { deletedAt: Date } }) => Promise<unknown>;
  updateMany: (args: { where?: unknown; data: { deletedAt: Date } }) => Promise<{ count: number }>;
};

export const createSoftDeleteExtension = (clientProvider: () => unknown) => {
  return Prisma.defineExtension({
    name: 'softDelete',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            const currentWhere = (args.where as Record<string, unknown> | undefined) ?? {};
            if (currentWhere.deletedAt === undefined) {
              args.where = { ...currentWhere, deletedAt: null };
            }
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            const currentWhere = (args.where as Record<string, unknown> | undefined) ?? {};
            if (currentWhere.deletedAt === undefined) {
              args.where = { ...currentWhere, deletedAt: null };
            }
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          const result = (await query(args)) as SoftDeleteRecord | null;
          if (SOFT_DELETE_MODELS.has(model) && result && result.deletedAt !== null) {
            return null;
          }
          return result;
        },
        async count({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            const currentWhere = (args.where as Record<string, unknown> | undefined) ?? {};
            if (currentWhere.deletedAt === undefined) {
              args.where = { ...currentWhere, deletedAt: null };
            }
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            const client = clientProvider() as Record<string, unknown>;
            const delegateKey = model.charAt(0).toLowerCase() + model.slice(1);
            const delegate = client[delegateKey] as ModelDelegate | undefined;
            if (delegate) {
              return delegate.update({
                where: args.where,
                data: { deletedAt: new Date() },
              });
            }
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            const client = clientProvider() as Record<string, unknown>;
            const delegateKey = model.charAt(0).toLowerCase() + model.slice(1);
            const delegate = client[delegateKey] as ModelDelegate | undefined;
            if (delegate) {
              return delegate.updateMany({
                where: args.where,
                data: { deletedAt: new Date() },
              });
            }
          }
          return query(args);
        },
      },
    },
  });
};
