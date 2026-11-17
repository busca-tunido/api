import { describe, expect, it } from 'vitest';
import { assignCityToUniversity, type ValidatedCity } from './seed-utils.js';

describe('assignCityToUniversity', () => {
  const cities: ValidatedCity[] = [
    { city: 'Santiago', latitude: -33.4489, longitude: -70.6693, isPrimary: true },
    { city: 'Valparaíso', latitude: -33.0472, longitude: -71.6127, isPrimary: true },
    { city: 'Viña del Mar', latitude: -33.0245, longitude: -71.5518, isPrimary: true },
    { city: 'Concepción', latitude: -36.827, longitude: -73.0498, isPrimary: true },
    { city: 'Arica', latitude: -18.4783, longitude: -70.3126, isPrimary: false },
    { city: 'Iquique', latitude: -20.2133, longitude: -70.1503, isPrimary: false },
    { city: 'Copiapó', latitude: -27.3665, longitude: -70.3323, isPrimary: false },
    { city: 'Chillán', latitude: -36.6063, longitude: -72.1034, isPrimary: false },
    { city: 'Osorno', latitude: -40.5739, longitude: -73.1335, isPrimary: false },
    { city: 'Punta Arenas', latitude: -53.1638, longitude: -70.9171, isPrimary: false },
    { city: 'Coyhaique', latitude: -45.5715, longitude: -72.0685, isPrimary: false },
  ];

  it('assigns regional universities to their actual regional cities', () => {
    expect(assignCityToUniversity('Universidad de Tarapacá', cities).city).toBe('Arica');
    expect(assignCityToUniversity('Universidad "Arturo Prat"', cities).city).toBe('Iquique');
    expect(assignCityToUniversity('Universidad de Atacama', cities).city).toBe('Copiapó');
    expect(assignCityToUniversity('Universidad Adventista de Chile', cities).city).toBe('Chillán');
    expect(assignCityToUniversity('Universidad de Los Lagos', cities).city).toBe('Osorno');
    expect(assignCityToUniversity('Universidad de Magallanes', cities).city).toBe('Punta Arenas');
    expect(assignCityToUniversity('Universidad de Aysen', cities).city).toBe('Coyhaique');
    expect(assignCityToUniversity('Universidad Maritima de Chile', cities).city).toBe(
      'Viña del Mar',
    );
    expect(assignCityToUniversity('Universidad Técnica Federico Santa María', cities).city).toBe(
      'Valparaíso',
    );
  });

  it('falls back to Santiago for unmapped universities', () => {
    expect(assignCityToUniversity('Universidad Desconocida', cities).city).toBe('Santiago');
  });
});
