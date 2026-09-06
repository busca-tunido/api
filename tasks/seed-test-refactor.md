# Task: Refactor Test Seed Script (`prisma/seed-test.ts`)

## Objective

Refactor the existing database seed into `prisma/seed-test.ts` for active staging, testing, and development environments. The script must strictly fetch real universities and Chilean city coordinates from live external APIs with runtime assertion tests, populate hundreds of simulated landlords with variable property portfolios heavily concentrated in Chile's top 4 university cities (Santiago, Valparaíso, Concepción, and Valdivia), generate rooms and university proximity links, create thousands of student profiles with reviews (including fixed-URL images for select reviews in primary cities), seed moderation reports, and guarantee that the `favorites` table remains strictly empty.

---

## Detailed Data Specifications

### 1. Universities (`universities` table)
- **Source**: Live HTTP query to external API (`http://universities.hipolabs.com/search?country=Chile` or official Chilean registry).
- **Mandatory Runtime Assertions**:
  - Script must halt execution (`throw new Error(...)`) if the API is unreachable, empty, or returns malformed data.
  - Every university record must strictly validate:
    - `name`: string, length > 3 characters, valid university naming.
    - `shortName`: computed acronym or short name (<= 50 chars).
    - `domains`: non-empty array of valid domain strings (e.g., `uchile.cl`, `puc.cl`, `udec.cl`).
    - `web_pages`: array containing at least one valid `http://` or `https://` URL.
    - `country`: must strictly match `'Chile'`.
    - `city`: assigned to a recognized Chilean city.
    - `address`: street and location string.
    - `latitude` / `longitude`: valid coordinate within Chilean territorial limits.

### 2. Chilean City Coordinates (`city_coords`)
- **Source**: Live HTTP query to external geographic API (e.g., OpenStreetMap Nominatim or Chilean Open Data) limited to top 100 Chilean cities/comunas.
- **Mandatory Runtime Assertions**:
  - Script must halt execution if fewer than 20 cities are resolved or if required keys are missing.
  - Field assertions on every city:
    - `city`: non-empty string.
    - `latitude`: numeric value strictly bounded between `-56.0` and `-17.0` (Chilean latitude range).
    - `longitude`: numeric value strictly bounded between `-76.0` and `-66.0` (Chilean longitude range).
  - Explicit presence assertion: The dataset **must** contain the 4 primary university cities:
    1. `Santiago`
    2. `Valparaíso`
    3. `Concepción`
    4. `Valdivia`

### 3. Administrative Accounts (`users` table)
- Fixed accounts for testing privileged features:
  - `admin@buscatunido.cl` (Role: `ADMIN`, password hash for `Password123!`, verified).
  - `moderador@buscatunido.cl` (Role: `MODERATOR`, password hash for `Password123!`, verified).

### 4. Landlord Users (`users` table with `role: LANDLORD`)
- **Quantity**: Hundreds of simulated landlord accounts (e.g., 100–150 owners).
- **Credentials**: Unified password hash for `Password123!` across all generated landlords for friction-free developer testing.
- **Fields**:
  - `email`: unique Chilean owner email format (`arrendador{index}@buscatunido.cl` or `faker.internet.email()`).
  - `firstName` & `lastName`: realistic Spanish/Chilean names from Faker (`es_MX`).
  - `phone`: realistic Chilean mobile number (`+569` + 8 digits).
  - `role`: `Role.LANDLORD`.
  - `isEmailVerified`: `true`.
  - `avatarUrl`: realistic Unsplash portrait URL.
- **Portfolio Distribution**: Each landlord must own a variable quantity of pensions (1 to 5 properties). The vast majority of properties must reside in the 4 primary cities, with only a small residual fraction in other cities.

### 5. Pensions (`pensions` table)
- **Quantity**: ~250–350 total properties.
- **Geographic Distribution**:
  - ~85% heavily concentrated across **Santiago**, **Valparaíso**, **Concepción**, and **Valdivia**.
  - ~15% sparsely distributed across secondary cities.
- **Fields**:
  - `id`: unique UUID.
  - `slug`: unique URL slug (`slugify(title) + index`).
  - `title`: combination of student residence prefixes ("Residencia Universitaria", "Pensión Estudiantil", "Casona Universitaria") + neighborhood + street.
  - `description`: descriptive text detailing study environment, common spaces, rules, and transit connectivity.
  - `address`, `city`, `neighborhood`: realistic street name, house number, and neighborhood.
  - `latitude` / `longitude`: coordinates situated near universities or city center with realistic jitter.
  - `contactName`: landlord full name.
  - `contactPhone`, `contactWhatsapp`, `contactEmail`: matching landlord contact channels.
  - `baseMonthlyPrice`: realistic student price points (180.000 CLP to 420.000 CLP).
  - `deposit`: equal to one month's rent or null (variable).
  - `currency`: `'CLP'`.
  - `waterIncluded`, `electricityIncluded`, `internetIncluded`: `true`.
  - `gasIncluded`: boolean (predominantly true).
  - `curfewTime`: nullable string (`null`, `'23:00'`, `'00:00'`, `'01:00'`).
  - `guestsAllowed`, `smokingAllowed`, `petsAllowed`: realistic boolean distribution.
  - `genderPreference`: `ANY`, `FEMALE_ONLY`, or `MALE_ONLY`.
  - `quietHoursStart` (`'23:00'`) / `quietHoursEnd` (`'07:00'`).
  - `verificationStatus`: `COMMUNITY_VERIFIED`, `OFFICIALLY_VERIFIED`, or `UNVERIFIED`.
  - `ratingAverage` & `ratingCount`: dynamically computed from associated reviews.
  - `isActive`: `true`.
  - `landlordId` & `submittedById`: foreign key to landlord user.
  - `amenities`: connected to 4–10 amenities from the core catalog.

### 6. Rooms (`rooms` table)
- 2 to 5 rooms per pension.
- **Fields**:
  - `roomNumber`: e.g., `Hab 101`, `Hab 102`.
  - `title`: e.g., "Habitación Individual Luminosa", "Habitación Compartida".
  - `type`: `RoomType.SINGLE`, `RoomType.SHARED`, or `RoomType.STUDIO`.
  - `monthlyPrice` & `deposit`: aligned with pension base price and room type modifier.
  - `hasPrivateBathroom`: boolean (true for studio, variable for single/shared).
  - `totalBeds` & `availableBeds`: numeric values reflecting room type.
  - `isAvailable`: boolean (predominantly true).
  - `images`: array of room photo URLs.

### 7. Pension-University Proximity (`pension_universities` table)
- Seeded **only in the 4 primary cities** (Santiago, Valparaíso, Concepción, Valdivia).
- **Fields**:
  - `pensionId` & `universityId`: composite PK.
  - `distanceMeters`: realistic distance between 200m and 2.500m.
  - `walkingMinutes`: calculated commute (`distanceMeters / 80`).
  - `transitMinutes`: calculated public transit commute (`distanceMeters / 250 + 4`).

### 8. Student Users (`users` table with `role: STUDENT`)
- **Quantity**: Thousands of simulated student profiles (e.g., 1.000–1.500 students).
- **Credentials**: Password hash for `Password123!` across all student accounts.
- **Fields**:
  - `email`: formatted using real university domain (`first.last{id}@{targetUniDomain}`).
  - `firstName` & `lastName`: realistic Spanish/Chilean names.
  - `phone`: realistic Chilean mobile number (`+569` + 8 digits).
  - `role`: `Role.STUDENT`.
  - `isEmailVerified`: boolean (80% verified).
  - `universityId`: foreign key to the student's assigned university.
  - `avatarUrl`: portrait photo URL.

### 9. Reviews (`reviews` table)
- **Distribution**: Each student submits a variable number of reviews (1 to 3 reviews), concentrated primarily in the 4 primary cities.
- **Enforce Unique Constraint**: Strict `(pensionId, userId)` uniqueness per review.
- **Fields**:
  - `overallRating`: integer 1–5 (weighted towards 4 and 5).
  - `cleanlinessRating`, `landlordRating`, `quietnessRating`, `wifiRating`: integers 1–5.
  - `comment`: realistic Chilean student feedback regarding location, internet speed, noise, and host friendliness.
  - `stayDurationCategory`: `ONE_SEMESTER`, `ONE_YEAR`, `FEW_MONTHS`, or `MORE_THAN_A_YEAR`.
  - `stayStartDate` & `stayEndDate`: dates representing academic terms.
  - `exactStayDays`: integer calculated from dates.
  - `isResidentVerified`: matches student's `isEmailVerified`.
  - `images`:
    - Only select reviews in the 4 primary cities include photos.
    - When photos are attached, **all reviews must share the exact same fixed image URL** (pragmatic CDN link for efficient caching).
    - Reviews outside primary cities or unselected reviews have an empty `images: []` array.

### 10. Reports (`reports` table)
- Seed sample moderation reports only for primary cities to test moderator workflows.
- **Fields**:
  - `pensionId` & `userId`: linked to reported pension and reporting student.
  - `reason`: `ReportReason.INACCURATE_PRICE`, `MISLEADING_PHOTOS`, or `HOUSE_RULES_VIOLATION`.
  - `description`: descriptive complaint text.
  - `status`: `ReportStatus.PENDING`.

### 11. Favorites (`favorites` table)
- **Strict Requirement**: Must remain **completely empty** (0 records inserted). A test assertion at the end of the script must verify `prisma.favorite.count() === 0`.

---

## Checklist

- [ ] Rename `prisma/seed.ts` to `prisma/seed-test.ts` and update `prisma.config.ts` and `package.json` (`db:seed` and `build:local`) to run `seed-test.ts`.
- [ ] Implement external HTTP fetch for Chilean universities with runtime assertion tests (validating `name`, `domains`, `web_pages`, `country === 'Chile'`).
- [ ] Implement external HTTP fetch for top 100 Chilean city coordinates with runtime assertion tests (validating coordinate bounds `-56 <= lat <= -17`, `-76 <= lng <= -66`, and verifying presence of Santiago, Valparaíso, Concepción, and Valdivia).
- [ ] Seed static platform amenity definitions (19 items).
- [ ] Seed fixed `ADMIN` and `MODERATOR` accounts with known password hash.
- [ ] Seed hundreds of landlord accounts with variable pension portfolios heavily weighted to primary cities.
- [ ] Seed pension listings with comprehensive metadata, realistic pricing, and connected amenities.
- [ ] Seed `rooms` for every pension with room types, private/shared bath flags, and price modifiers.
- [ ] Seed `pension_universities` commute records strictly in the 4 primary cities.
- [ ] Seed thousands of student accounts with university-domain emails and matching foreign keys.
- [ ] Seed reviews with dynamic rating calculations, attaching the fixed review image URL only to select reviews in primary cities.
- [ ] Seed sample `reports` in primary cities for moderation testing.
- [ ] Assert that the `favorites` table remains strictly empty (`count === 0`).
- [ ] Execute `seed-test.ts` against local PostgreSQL, verifying that all runtime tests pass and database integrity is maintained.
- [ ] Validate code quality using Biome (`pnpm run check && pnpm run review`).

---

## Target Files

- `prisma/seed-test.ts`
- `prisma.config.ts`
- `package.json`

## Verification

- Code Quality (Biome): `pnpm run check && pnpm run review`
- Build & Tests: `pnpm run build:local`
