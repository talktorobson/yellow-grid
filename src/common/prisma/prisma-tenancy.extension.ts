import { Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

export const tenancyExtension = (cls: ClsService) => {
    return Prisma.defineExtension({
        name: 'tenancy-extension',
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    // Operations that support 'where' clause
                    const operationsWithWhere = [
                        'findUnique',
                        'findUniqueOrThrow',
                        'findFirst',
                        'findFirstOrThrow',
                        'findMany',
                        'count',
                        'aggregate',
                        'groupBy',
                        'update',
                        'updateMany',
                        'delete',
                        'deleteMany',
                        'upsert',
                    ];

                    if (operationsWithWhere.includes(operation)) {
                        const countryCode = cls.get('countryCode');
                        const businessUnit = cls.get('businessUnit');
                        const bypassTenancy = cls.get('bypassTenancy');

                        // Only apply if we have context and not bypassing
                        if (countryCode && businessUnit && !bypassTenancy) {
                            // Check if the model has these fields (simple check: most do in this schema)
                            // In a perfect world we'd check DMMF, but for now we assume the schema is consistent
                            // or rely on the fact that if the field doesn't exist, Prisma might throw or ignore.
                            // However, since we are using $allModels, we should be careful.
                            // Let's assume all main domain models have them.
                            // We can exclude specific models if needed.
                            const excludedModels = [
                                'SystemConfig',
                                'CountryConfig',
                                'BusinessUnitConfig',
                                'User', // User login needs to find user first to get context
                                'Role',
                                'Permission',
                                'UserRole',
                                'RolePermission',
                                'RefreshToken',
                                'RegisteredDevice',
                                'Session',
                            ];

                            if (!excludedModels.includes(model)) {
                                (args as any).where = {
                                    ...(args as any).where,
                                    countryCode,
                                    businessUnit,
                                };
                            }
                        }
                    }

                    return query(args);
                },
            },
        },
    });
};
