# Task: Enrich Seed-Test with Varied Reviews Distribution, Granular Amenities, and Realistic Market Data

## Execution Profile

- **Wave / Batch**: Wave 3 (Data Seeding & Multi-Tier Fixtures)
- **Execution Mode**: `SEQUENTIAL`
- **Assigned Role**: `Worker Agent (Seed & Fixtures)`
- **Dependencies (`depends_on`)**:
  - `01-mongodb-prisma-engine-and-schema-migration.md`
  - `02b-sync-curated-assets-to-s3-bucket.md`
- **Collision Risk**: `LOW (Isolated seed scripts and helpers)`

## Target Files

- **Exclusive**:
  - `prisma/seed-test.ts`
  - `prisma/seed-utils.ts`
- **Shared / Integration Points**:
  - `prisma/data/assets-manifest.json`
  - `prisma.config.ts`

## Objective

Refactor `prisma/seed-test.ts` (the canonical database seeding script for both development and deployment environments) to generate realistic, production-grade test data adapted to MongoDB Atlas:
1. Implement a realistic stochastic distribution of reviews per pension (0 to 7 reviews max) across 4 volume tiers, with controlled rating variance (varied vs. non-varied).
2. Randomize and diversify amenities distribution per publication based on housing quality tier.
3. Generate granular Chilean student rental pricing with city-specific benchmarks and room modifiers.
4. Integrate the 996 curated WebP assets catalog (`dev/` and `prod/`) with gender-aligned avatars, tier-matched housing/room images, and pension-consistent review photos.
5. Compute and store atomic Bayesian reputation aggregates (`ratingAverage`, `ratingCount`, `communityScore`) directly on `Pension` documents.

---

## Technical Specifications

### 1. Stochastic Review Volume and Rating Variance Distribution

Every pension listing must be assigned a review profile based on the following probability matrix:

| Segment | Frecuencia | Rango de Reviews | Perfil de Variabilidad | Lógica de Calificaciones |
| :--- | :--- | :--- | :--- | :--- |
| **Sin Reseñas** | ~15% | **0 reviews** | N/A | Permite validar estados vacíos y la categoría *"Sin calificar / Otras alternativas"*. `ratingAverage: 0`, `ratingCount: 0`. |
| **Pocas Reviews** | ~30% | **1 - 2 reviews** | **50% No Variadas**<br>**50% Variadas** | - *No variadas*: Ratings homogéneos (ej. `[5, 5]` o `[2, 2]`).<br>- *Variadas*: Ratings divergentes (ej. `[5, 2]` o `[4, 1]`). |
| **Reviews Medias**| ~35% | **3 - 4 reviews** | **50% No Variadas**<br>**50% Variadas** | - *No variadas*: Ratings consistentes (ej. `[4, 4, 5, 4]` o `[2, 2, 3, 2]`).<br>- *Variadas*: Opiniones polarizadas (ej. `[5, 4, 2, 1]`). |
| **Muchas Reviews**| ~20% | **5 - 7 reviews** | **50% No Variadas**<br>**50% Variadas** | - *No variadas*: Alta consistencia (ej. `[5, 5, 5, 4, 5, 5]` -> *"Favoritas de la comunidad"*).<br>- *Variadas*: Experiencia mixta (ej. `[5, 2, 4, 1, 5, 3]`). |

#### Implementación del Algoritmo de Reseñas:
```ts
type ReviewProfile = 'ZERO' | 'FEW_CONSISTENT' | 'FEW_VARIED' | 'MID_CONSISTENT' | 'MID_VARIED' | 'MANY_CONSISTENT' | 'MANY_VARIED';

function determineReviewProfile(tier: 'alta' | 'media' | 'baja'): ReviewProfile {
  const rand = Math.random();
  if (rand < 0.15) return 'ZERO';
  if (rand < 0.45) return Math.random() < 0.5 ? 'FEW_CONSISTENT' : 'FEW_VARIED';
  if (rand < 0.80) return Math.random() < 0.5 ? 'MID_CONSISTENT' : 'MID_VARIED';
  return Math.random() < 0.5 ? 'MANY_CONSISTENT' : 'MANY_VARIED';
}
```

- **Reseñas y Fotos**:
  - Para publicaciones con reviews que incluyan fotos (30-40% de probabilidad), las URLs de las fotos **se seleccionan obligatoriamente del conjunto de fotos de esa pensión o de sus habitaciones**, simulando fotos legítimas tomadas por los estudiantes residentes.

---

### 2. Amenities Diversificadas por Nivel

Actualmente el seed asigna un número uniforme de comodidades. La nueva asignación se basa en el catálogo de 16 comodidades categorizadas en `AMENITY_DEFINITIONS`:

- **Nivel `baja` (Económicas / Básicas)**: 3 a 5 comodidades seleccionadas de `BASIC_UTILITY` (Wi-Fi, agua caliente, luz, gas).
- **Nivel `media` (Estándar / Confort)**: 6 a 9 comodidades, combinando básicas con `ROOM_FEATURE` (escritorio, clóset amplio, cama 1.5 plazas) y `COMMON_AREA` (cocina compartida, comedor).
- **Nivel `alta` (Residencias Premium)**: 10 a 15 comodidades, agregando `STUDY_WORK` (sala de estudio silenciosa, coworking, impresora) y `SAFETY_SECURITY` (conserjería 24/7, cámaras, cerradura digital).

---

### 3. Modelo de Precios Realista del Mercado Universitario Chileno

El precio base mensual (`baseMonthlyPrice`) debe reflejar la realidad del mercado de arriendos estudiantiles en Chile:

```ts
const CITY_BASE_MEDIAN: Record<string, number> = {
  Santiago: 290000,
  Valparaíso: 260000,
  Concepción: 240000,
  Valdivia: 250000,
};

const TIER_MULTIPLIER: Record<'alta' | 'media' | 'baja', number> = {
  alta: 1.25,
  media: 1.0,
  baja: 0.82,
};
```

- **Cálculo con Dispersión Aleatoria**:
  $$Price_{base} = \text{roundToNearest5000}\left(Median_{city} \times Multiplier_{tier} + \mathcal{U}(-25000, 35000)\right)$$
  Rango resultante: **$165.000 CLP a $430.000 CLP**.
- **Modificadores por Habitación (`EmbeddedRoom`)**:
  - `SHARED` (Pieza compartida): Descuento de $-20\%$ a $-35\%$ sobre el precio base.
  - `SINGLE` (Pieza individual): Precio base $\pm 5\%$.
  - `STUDIO` (Estudio privado con baño): Incremento de $+25\%$ a $+45\%$ sobre el precio base.
  - Si `hasPrivateBathroom === true` en pieza individual: $+15\%$ adicional.

---

### 4. Propuestas Adicionales de Enriquecimiento de Datos

Para elevar el realismo y robustez de los fixtures de prueba:

1. **Cálculo Geodésico Real a Campus (Haversine)**:
   - Calcular la distancia real en metros entre la coordenada de la pensión y la universidad vinculada (`assignCityToUniversity`).
   - `walkingMinutes`: $\approx \text{distanceMeters} / 80$.
   - `transitMinutes`: $\approx \text{distanceMeters} / 250 + 4$.
2. **Votos Útiles en Reseñas (`helpfulUserIds`)**:
   - Cada reseña recibe entre $0$ y $12$ votos útiles de otros usuarios estudiantes seeded para posibilitar el testing de ordenamientos por *"Más útiles"*.
3. **Avatares de Usuarios con Reconocimiento de Género**:
   - Estudiantes y dueños con nombres masculinos reciben avatares de `perfiles/.../hombres/`.
   - Estudiantes y dueñas con nombres femeninos reciben avatares de `perfiles/.../mujeres/`.
4. **Fechas y Duraciones de Estadía Académica**:
   - Semestre 1: `2025-03-01` a `2025-07-15` (136 días).
   - Semestre 2: `2025-08-01` a `2025-12-20` (141 días).
   - Año Completo: `2025-03-01` a `2025-12-20` (294 días).
5. **Cálculo Atómico de Métricas de Reputación**:
   - Pre-calcular y almacenar en cada pensión:
     - `ratingAverage`: Promedio aritmético redondeado a 2 decimales (o 0 si `ratingCount === 0`).
     - `ratingCount`: Total de reseñas.
     - `communityScore`: Puntaje bayesiano normalizado de 0 a 100 ponderado por volumen.

---

## Step-by-Step Implementation Plan

1. Leer el catálogo `prisma/data/assets-manifest.json` al inicializar el script.
2. Adaptar la limpieza inicial a MongoDB (`prisma.review.deleteMany()`, etc.).
3. Actualizar la generación de usuarios asignando avatares según género reconocido del nombre.
4. Generar las pensiones distribuyendo niveles (`alta`, `media`, `baja`) y aplicando las fórmulas de precio y comodidades.
5. Asignar habitaciones con fotos del mismo nivel de la pensión.
6. Aplicar el algoritmo estocástico de reseñas (0 a 7 reviews, variadas vs no variadas) y asociar fotos exclusivas de la pensión/habitaciones.
7. Computar las métricas de reputación atómicas en cada pensión.
8. Ejecutar `pnpm dlx prisma db seed` para verificar la inserción en `buscatunido_dev`.

---

## Verification & Quality Gate

- `pnpm dlx prisma db seed` finaliza con código de salida 0.
- Verificación de consultas post-seed confirma:
  - Al menos 10% de pensiones con exactamente 0 reviews.
  - Al menos 15% de pensiones con reseñas variadas (desviación estándar $\ge 1.2$).
  - 100% de habitaciones con imágenes del mismo nivel que su pensión.
  - 100% de avatares masculinos y femeninos asociados correctamente al género del nombre.
  - Precios de arriendo en rangos coherentes entre $165.000 y $430.000 CLP.
