import { Prisma } from '@prisma/sql-client';

export const SQL_SOFT_DELETE_MODELS = new Set<string>(['User', 'University', 'Amenity', 'Report']);

type SoftDeleteRecord = {
  deletedAt: Date | null;
};

type ModelDelegate = {
  update: (args: { where: unknown; data: { deletedAt: Date } }) => Promise<unknown>;
  updateMany: (args: { where?: unknown; data: { deletedAt: Date } }) => Promise<{ count: number }>;
};

const applySqlSoftDeleteFilter = (
  where: Record<string, unknown> | undefined,
): Record<string, unknown> => {
  const currentWhere = where ?? {};
  if (currentWhere.deletedAt !== undefined) {
    return currentWhere;
  }
  return { ...currentWhere, deletedAt: null };
};

export const createSqlSoftDeleteExtension = (clientProvider: () => unknown) => {
  return Prisma.defineExtension({
    name: 'sqlSoftDelete',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (SQL_SOFT_DELETE_MODELS.has(model)) {
            args.where = applySqlSoftDeleteFilter(
              args.where as Record<string, unknown> | undefined,
            );
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (SQL_SOFT_DELETE_MODELS.has(model)) {
            args.where = applySqlSoftDeleteFilter(
              args.where as Record<string, unknown> | undefined,
            );
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (SQL_SOFT_DELETE_MODELS.has(model) && args.where && typeof args.where === 'object') {
            const whereObj = args.where as Record<string, unknown>;
            const { deletedAt: _, ...cleanWhere } = whereObj;
            args.where = cleanWhere as typeof args.where;
          }

          const hasCustomSelect =
            SQL_SOFT_DELETE_MODELS.has(model) &&
            args.select &&
            typeof args.select === 'object' &&
            !('deletedAt' in (args.select as Record<string, unknown>));

          if (hasCustomSelect) {
            (args.select as Record<string, unknown>).deletedAt = true;
          }

          const result = (await query(args)) as (SoftDeleteRecord & Record<string, unknown>) | null;
          if (
            SQL_SOFT_DELETE_MODELS.has(model) &&
            result &&
            'deletedAt' in result &&
            result.deletedAt !== null &&
            result.deletedAt !== undefined
          ) {
            return null;
          }

          if (hasCustomSelect && result && 'deletedAt' in result) {
            const { deletedAt: _, ...cleanResult } = result;
            return cleanResult as SoftDeleteRecord & Record<string, unknown>;
          }

          return result;
        },
        async count({ model, args, query }) {
          if (SQL_SOFT_DELETE_MODELS.has(model)) {
            args.where = applySqlSoftDeleteFilter(
              args.where as Record<string, unknown> | undefined,
            );
          }
          return query(args);
        },
        async groupBy({ model, args, query }) {
          if (SQL_SOFT_DELETE_MODELS.has(model)) {
            args.where = applySqlSoftDeleteFilter(
              args.where as Record<string, unknown> | undefined,
            );
          }
          return query(args);
        },
        async aggregate({ model, args, query }) {
          if (SQL_SOFT_DELETE_MODELS.has(model)) {
            args.where = applySqlSoftDeleteFilter(
              args.where as Record<string, unknown> | undefined,
            );
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          if (SQL_SOFT_DELETE_MODELS.has(model)) {
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
          if (SQL_SOFT_DELETE_MODELS.has(model)) {
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
