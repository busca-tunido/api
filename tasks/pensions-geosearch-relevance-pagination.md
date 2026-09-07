# Task: API Geospatial Search, Relevance Ranking & Async Pagination (`api/tasks/pensions-geosearch-relevance-pagination.md`)

## Objective

Enhance `GET /pensions` with geospatial radius filtering (Haversine formula), a multi-factor student housing relevance ranking algorithm, cursor/page-based async pagination, and a nearby city/commune aggregate count to power lazy infinite scrolling and high-performance housing discovery without network saturation.

---

## Technical Specifications

### 1. Geospatial & Relevance Parameters (`FilterPensionsDto`)
Add the following optional query parameters:
- `latitude`: Float coordinate of user's current location (`-56.0` to `-17.0`).
- `longitude`: Float coordinate of user's current location (`-110.0` to `-66.0`).
- `radiusKm`: Search radius in kilometers.
  - Default: `30` (covers complete metropolitan conurbations: Gran Santiago, Gran Valparaíso, Gran Concepción).
  - Min: `1`, Max: `100`.
- `sortBy`: Sorting mode:
  - `'relevance'` (default when `latitude` and `longitude` are provided).
  - `'distance'` (pure ascending distance).
  - `'rating'` (descending average rating).
  - `'price_asc'` / `'price_desc'`.

### 2. Relevance Scoring Formula (100 Points Scale)

When `latitude` and `longitude` are provided with `sortBy=relevance`, pensions within the radius are scored dynamically:

$$\text{Score} = (0.40 \times S_{\text{dist}}) + (0.25 \times S_{\text{rating}}) + (0.20 \times S_{\text{verif}}) + (0.15 \times S_{\text{avail}})$$

1. **Proximity Score ($S_{\text{dist}}$, 40%)**:
   - $S_{\text{dist}} = \max(0, 100 \times (1 - \frac{\text{distanceKm}}{\text{radiusKm}}))$
   - Housing 1 km away receives ~97 pts; housing at 25 km receives ~17 pts.
2. **Community Reputation ($S_{\text{rating}}$, 25%)**:
   - $S_{\text{rating}} = (\frac{\text{ratingAverage}}{5.0} \times 70) + \min(30, \text{ratingCount} \times 3)$
   - Rewards high satisfaction combined with multi-student resident validation.
3. **Institutional Verification ($S_{\text{verif}}$, 20%)**:
   - `OFFICIALLY_VERIFIED`: 100 pts
   - `COMMUNITY_VERIFIED`: 75 pts
   - `UNVERIFIED`: 30 pts
4. **Availability & Listing Quality ($S_{\text{avail}}$, 15%)**:
   - Available beds (`availableBeds > 0`): 50 pts
   - Essential utilities included (Wi-Fi + electricity + water): 50 pts

### 3. Response Envelope & Pagination Metadata
Return pagination envelopes with infinite scroll indicators:
```typescript
export type PaginatedPensionsResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  nearbyCityCounts: Array<{
    city: string;
    count: number;
    distanceKm?: number;
  }>;
};
```

### 4. Distance Calculation
Implement Haversine distance in SQL/Prisma:
$$d = 2R \times \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta\text{lng}}{2}\right)}\right)$$
- Attach `distanceKm` and `relevanceScore` to each returned pension item.

---

## Checklist

- [ ] Extend `FilterPensionsDto` in `src/pensions/dto/filter-pensions.dto.ts` with `latitude`, `longitude`, `radiusKm`, and `sortBy`.
- [ ] Implement Haversine distance calculation and radius filtering in `PensionsService.findAll()`.
- [ ] Implement multi-factor Relevance Scoring calculation in `PensionsService`.
- [ ] Implement aggregation query for `nearbyCityCounts` grouped by city for pensions within/around the geographic scope.
- [ ] Update pagination return type to include `hasMore: boolean` and `nearbyCityCounts`.
- [ ] Ensure backward compatibility when `latitude`/`longitude` are omitted (fallback to standard pagination and city/text search).
- [ ] Add unit tests in `src/pensions/pensions.service.spec.ts` testing radius filtering, relevance sorting, and pagination boundaries.
- [ ] Validate code quality with Biome (`pnpm run check && pnpm run review`).
- [ ] Verify build with `pnpm exec nest build`.

---

## Target Files

- `src/pensions/dto/filter-pensions.dto.ts`
- `src/pensions/pensions.service.ts`
- `src/pensions/pensions.controller.ts`
- `src/pensions/pensions.service.spec.ts`

---

## Verification

- Automated Tests: `pnpm run test`
- Code Quality (Biome): `pnpm run check && pnpm run review`
- Production Build: `pnpm exec nest build`
