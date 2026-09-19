# Task: Advanced Filters & Price Histogram Backend

## Execution Profile

- **Wave / Batch**: Wave 1 (Filters & Aggregations Backend)
- **Execution Mode**: `ISOLATED`
- **Assigned Role**: `Worker Agent (API Pensions Module)`
- **Dependencies (`depends_on`)**: `[]`
- **Collision Risk**: `LOW`

## Target Files

- **Exclusive**:
  - `src/pensions/dto/filter-pensions.dto.ts`
  - `src/pensions/pensions.service.ts`
  - `src/pensions/pensions.controller.ts`

## Objective

Equip the backend with advanced accommodation filters and a dynamic price histogram endpoint inspired by Airbnb:
1. Extend `FilterPensionsDto` to accept room-level criteria (`roomType`, `hasPrivateBathroom`, `minBeds`) and meal options (`includesMeals`).
2. Implement Prisma relational filtering inside `PensionsService.findAll` to filter pensions matching room and meal conditions.
3. Build `PensionsService.getPriceHistogram` and route `@Get('price-histogram')` computing minimum price, maximum price, and a 28-bin distribution of active listings in the requested city or coordinate radius.

## Technical Specifications

1. **`FilterPensionsDto` (`src/pensions/dto/filter-pensions.dto.ts`)**:
   - Add `roomType?: RoomType` (`@IsOptional() @IsEnum(RoomType)`).
   - Add `hasPrivateBathroom?: boolean` (`@IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()`).
   - Add `includesMeals?: boolean` (`@IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()`).
   - Add `minBeds?: number` (`@IsOptional() @Type(() => Number) @IsInt() @Min(1)`).

2. **`PensionsService.findAll` Update**:
   - Add room criteria to Prisma query:
     ```ts
     rooms: (roomType || hasPrivateBathroom !== undefined || minBeds) ? {
       some: {
         deletedAt: null,
         isAvailable: true,
         ...(roomType ? { type: roomType } : {}),
         ...(hasPrivateBathroom !== undefined ? { hasPrivateBathroom } : {}),
         ...(minBeds ? { availableBeds: { gte: minBeds } } : {}),
       }
     } : undefined
     ```
   - Filter `amenities` for meal inclusions if `includesMeals` is true.

3. **`PensionsService.getPriceHistogram`**:
   - Query `this.prisma.pension.aggregate`: `_min: { baseMonthlyPrice: true }`, `_max: { baseMonthlyPrice: true }`, `_count: { id: true }` filtered by city/coordinates and active listings.
   - If no listings found, return default bounds (`minPrice: 100000, maxPrice: 600000, totalListings: 0, bins: []`).
   - Divide range `[minPrice, maxPrice]` into 28 equidistant buckets (`bins`).
   - Fetch prices and group counts into buckets.
   - Return `{ minPrice, maxPrice, currency: "CLP", totalListings, bins: [{ min, max, count }] }`.

4. **`PensionsController` Route**:
   - Register `@Get('price-histogram')` placed strictly before `@Get(':idOrSlug')`.
   - Call `this.pensionsService.getPriceHistogram(query)`.

## Checklist

- [ ] Add `roomType`, `hasPrivateBathroom`, `includesMeals`, and `minBeds` to `FilterPensionsDto`.
- [ ] Implement Prisma relational filtering on `rooms` in `PensionsService.findAll`.
- [ ] Implement `getPriceHistogram(query)` with 28 bins in `PensionsService`.
- [ ] Add `@Get('price-histogram')` route in `PensionsController`.
- [ ] Stage target files and commit with `feat(pensions): add advanced room filters and dynamic price histogram endpoint`.
