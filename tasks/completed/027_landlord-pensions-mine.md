# Task: Landlord Owned Pensions Listing (`GET /pensions/mine`)

## Execution Profile

- **Wave / Batch**: Wave 2 (Backend Landlord Scope)
- **Execution Mode**: `SEQUENTIAL`
- **Assigned Role**: `Worker Agent (API Pensions Module)`
- **Dependencies (`depends_on`)**: `[api/tasks/pension-filters-histogram-backend.md]`
- **Collision Risk**: `LOW`

## Target Files

- **Exclusive**:
  - `src/pensions/pensions.controller.ts`
  - `src/pensions/pensions.service.ts`

## Objective

Provide the dedicated authenticated endpoint `GET /pensions/mine` allowing landlords to retrieve all pensions they own:

1. Register `GET /pensions/mine` with `JwtAuthGuard` and `Roles(UserRole.LANDLORD, UserRole.ADMIN)`.
2. Implement `PensionsService.findMine(userId: string)` fetching all active pensions where `ownerId === userId`.
3. Include associated counts: total rooms, available rooms, pending community edit proposals, and average rating.

## Technical Specifications

1. **`PensionsController` (`src/pensions/pensions.controller.ts`)**:
   - Register route `@Get('mine')` placed strictly before `@Get(':idOrSlug')` to prevent route collision.
   - Decorate with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(UserRole.LANDLORD, UserRole.ADMIN)`.
   - Pass `@CurrentUser('id') userId: string` to service method:
     ```ts
     @Get('mine')
     @UseGuards(JwtAuthGuard, RolesGuard)
     @Roles(UserRole.LANDLORD, UserRole.ADMIN)
     async getMine(@CurrentUser('id') userId: string) {
       return this.pensionsService.findMine(userId);
     }
     ```

2. **`PensionsService` (`src/pensions/pensions.service.ts`)**:
   - Implement `findMine(userId: string)`:
     ```ts
     async findMine(userId: string) {
       return this.prisma.pension.findMany({
         where: {
           ownerId: userId,
           deletedAt: null,
         },
         include: {
           rooms: {
             where: { deletedAt: null },
             select: {
               id: true,
               name: true,
               type: true,
               priceMonthlyClp: true,
               isAvailable: true,
               hasPrivateBathroom: true,
               availableBeds: true,
             },
           },
           _count: {
             select: {
               reviews: { where: { deletedAt: null } },
               communityProposals: { where: { status: 'PENDING' } },
             },
           },
         },
         orderBy: { createdAt: 'desc' },
       });
     }
     ```

## Checklist

- [ ] Add `@Get('mine')` route before `@Get(':idOrSlug')` in `src/pensions/pensions.controller.ts`.
- [ ] Implement `findMine(userId: string)` with room summaries and proposal counts in `src/pensions/pensions.service.ts`.
- [ ] Verify route security requiring `LANDLORD` or `ADMIN` role.
- [ ] Stage target files and commit with `feat(pensions): add GET /pensions/mine endpoint for landlord property management`.
