# Centros de ciudades

`src/pensions/constants/city-centers.ts` contiene referencias geográficas verificadas para el centro de exploración del mapa, independientes de las coordenadas de las publicaciones y universidades.

Valparaíso usa el centro de Plaza de la Victoria: latitud `-33.0462524`, longitud `-71.6198042` (WGS84). Fuente: [OpenStreetMap, objeto way/313292626](https://www.openstreetmap.org/way/313292626), contrastado mediante Nominatim con búsqueda acotada al casco urbano el 13 de noviembre de 2026.

El catálogo se aplica al responder `/cities` y `/pensions/cities`, sin alterar las coordenadas de ninguna pensión ni ejecutar seeds. Las ciudades que aún no tienen una referencia catalogada conservan el comportamiento anterior. Los nuevos centros requieren una fuente geográfica verificable.
