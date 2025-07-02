import type { City } from '../types/game';

export const cities: City[] = [
  // Easy cities (well-known, large populations)
  {
    id: 'nyc',
    name: 'New York City',
    country: 'United States',
    lat: 40.7128,
    lng: -74.0060,
    population: 8336817,
    difficulty: 'easy'
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    lat: 51.5074,
    lng: -0.1278,
    population: 8982000,
    difficulty: 'easy'
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    lat: 35.6762,
    lng: 139.6503,
    population: 13960000,
    difficulty: 'easy'
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    lat: 48.8566,
    lng: 2.3522,
    population: 2161000,
    difficulty: 'easy'
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    lat: -33.8688,
    lng: 151.2093,
    population: 5312000,
    difficulty: 'easy'
  },
  
  // Medium cities
  {
    id: 'prague',
    name: 'Prague',
    country: 'Czech Republic',
    lat: 50.0755,
    lng: 14.4378,
    population: 1309000,
    difficulty: 'medium'
  },
  {
    id: 'santiago',
    name: 'Santiago',
    country: 'Chile',
    lat: -33.4489,
    lng: -70.6693,
    population: 6680000,
    difficulty: 'medium'
  },
  {
    id: 'stockholm',
    name: 'Stockholm',
    country: 'Sweden',
    lat: 59.3293,
    lng: 18.0686,
    population: 975000,
    difficulty: 'medium'
  },
  {
    id: 'budapest',
    name: 'Budapest',
    country: 'Hungary',
    lat: 47.4979,
    lng: 19.0402,
    population: 1752000,
    difficulty: 'medium'
  },
  {
    id: 'oslo',
    name: 'Oslo',
    country: 'Norway',
    lat: 59.9139,
    lng: 10.7522,
    population: 697000,
    difficulty: 'medium'
  },
  
  // Hard cities (lesser-known or smaller)
  {
    id: 'tallinn',
    name: 'Tallinn',
    country: 'Estonia',
    lat: 59.4370,
    lng: 24.7536,
    population: 437000,
    difficulty: 'hard'
  },
  {
    id: 'vilnius',
    name: 'Vilnius',
    country: 'Lithuania',
    lat: 54.6872,
    lng: 25.2797,
    population: 588000,
    difficulty: 'hard'
  },
  {
    id: 'montevideo',
    name: 'Montevideo',
    country: 'Uruguay',
    lat: -34.9011,
    lng: -56.1645,
    population: 1319000,
    difficulty: 'hard'
  },
  {
    id: 'reykjavik',
    name: 'Reykjavik',
    country: 'Iceland',
    lat: 64.1466,
    lng: -21.9426,
    population: 131000,
    difficulty: 'hard'
  },
  {
    id: 'astana',
    name: 'Nur-Sultan',
    country: 'Kazakhstan',
    lat: 51.1694,
    lng: 71.4491,
    population: 1184000,
    difficulty: 'hard'
  }
];

export function getRandomCity(): City {
  return cities[Math.floor(Math.random() * cities.length)];
}

export function getCityById(id: string): City | undefined {
  return cities.find(city => city.id === id);
}