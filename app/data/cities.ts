import type { City } from '../types/game';

export const cities: City[] = [
  // Easy cities (well-known, large populations, major world cities)
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
  {
    id: 'losangeles',
    name: 'Los Angeles',
    country: 'United States',
    lat: 34.0522,
    lng: -118.2437,
    population: 3971883,
    difficulty: 'easy'
  },
  {
    id: 'chicago',
    name: 'Chicago',
    country: 'United States',
    lat: 41.8781,
    lng: -87.6298,
    population: 2693976,
    difficulty: 'easy'
  },
  {
    id: 'miami',
    name: 'Miami',
    country: 'United States',
    lat: 25.7617,
    lng: -80.1918,
    population: 467963,
    difficulty: 'easy'
  },
  {
    id: 'rome',
    name: 'Rome',
    country: 'Italy',
    lat: 41.9028,
    lng: 12.4964,
    population: 2872800,
    difficulty: 'easy'
  },
  {
    id: 'berlin',
    name: 'Berlin',
    country: 'Germany',
    lat: 52.5200,
    lng: 13.4050,
    population: 3669491,
    difficulty: 'easy'
  },
  {
    id: 'moscow',
    name: 'Moscow',
    country: 'Russia',
    lat: 55.7558,
    lng: 37.6176,
    population: 12506468,
    difficulty: 'easy'
  },
  {
    id: 'beijing',
    name: 'Beijing',
    country: 'China',
    lat: 39.9042,
    lng: 116.4074,
    population: 21540000,
    difficulty: 'easy'
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    country: 'India',
    lat: 19.0760,
    lng: 72.8777,
    population: 20411274,
    difficulty: 'easy'
  },
  {
    id: 'cairo',
    name: 'Cairo',
    country: 'Egypt',
    lat: 30.0444,
    lng: 31.2357,
    population: 10230350,
    difficulty: 'easy'
  },
  {
    id: 'madrid',
    name: 'Madrid',
    country: 'Spain',
    lat: 40.4168,
    lng: -3.7038,
    population: 3223334,
    difficulty: 'easy'
  },
  {
    id: 'toronto',
    name: 'Toronto',
    country: 'Canada',
    lat: 43.6532,
    lng: -79.3832,
    population: 2794356,
    difficulty: 'easy'
  },
  {
    id: 'mexico-city',
    name: 'Mexico City',
    country: 'Mexico',
    lat: 19.4326,
    lng: -99.1332,
    population: 9209944,
    difficulty: 'easy'
  },
  {
    id: 'buenos-aires',
    name: 'Buenos Aires',
    country: 'Argentina',
    lat: -34.6118,
    lng: -58.3960,
    population: 2890151,
    difficulty: 'easy'
  },
  {
    id: 'rio-de-janeiro',
    name: 'Rio de Janeiro',
    country: 'Brazil',
    lat: -22.9068,
    lng: -43.1729,
    population: 6748000,
    difficulty: 'easy'
  },
  {
    id: 'barcelona',
    name: 'Barcelona',
    country: 'Spain',
    lat: 41.3851,
    lng: 2.1734,
    population: 1620343,
    difficulty: 'easy'
  },
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    country: 'Netherlands',
    lat: 52.3676,
    lng: 4.9041,
    population: 872680,
    difficulty: 'easy'
  },
  {
    id: 'las-vegas',
    name: 'Las Vegas',
    country: 'United States',
    lat: 36.1699,
    lng: -115.1398,
    population: 651319,
    difficulty: 'easy'
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    country: 'Turkey',
    lat: 41.0082,
    lng: 28.9784,
    population: 15840900,
    difficulty: 'easy'
  },
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    lat: 25.2048,
    lng: 55.2708,
    population: 3411200,
    difficulty: 'easy'
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    lat: 1.3521,
    lng: 103.8198,
    population: 5850342,
    difficulty: 'easy'
  },
  
  // Medium cities (regional capitals, well-known European/Asian cities)
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
  {
    id: 'vienna',
    name: 'Vienna',
    country: 'Austria',
    lat: 48.2082,
    lng: 16.3738,
    population: 1911191,
    difficulty: 'medium'
  },
  {
    id: 'copenhagen',
    name: 'Copenhagen',
    country: 'Denmark',
    lat: 55.6761,
    lng: 12.5683,
    population: 660193,
    difficulty: 'medium'
  },
  {
    id: 'helsinki',
    name: 'Helsinki',
    country: 'Finland',
    lat: 60.1699,
    lng: 24.9384,
    population: 658864,
    difficulty: 'medium'
  },
  {
    id: 'brussels',
    name: 'Brussels',
    country: 'Belgium',
    lat: 50.8505,
    lng: 4.3488,
    population: 1218255,
    difficulty: 'medium'
  },
  {
    id: 'zurich',
    name: 'Zurich',
    country: 'Switzerland',
    lat: 47.3769,
    lng: 8.5417,
    population: 415367,
    difficulty: 'medium'
  },
  {
    id: 'warsaw',
    name: 'Warsaw',
    country: 'Poland',
    lat: 52.2297,
    lng: 21.0122,
    population: 1793579,
    difficulty: 'medium'
  },
  {
    id: 'athens',
    name: 'Athens',
    country: 'Greece',
    lat: 37.9755,
    lng: 23.7348,
    population: 3154152,
    difficulty: 'medium'
  },
  {
    id: 'lisbon',
    name: 'Lisbon',
    country: 'Portugal',
    lat: 38.7223,
    lng: -9.1393,
    population: 547733,
    difficulty: 'medium'
  },
  {
    id: 'dublin',
    name: 'Dublin',
    country: 'Ireland',
    lat: 53.3498,
    lng: -6.2603,
    population: 1387964,
    difficulty: 'medium'
  },
  {
    id: 'edinburgh',
    name: 'Edinburgh',
    country: 'United Kingdom',
    lat: 55.9533,
    lng: -3.1883,
    population: 518500,
    difficulty: 'medium'
  },
  {
    id: 'montreal',
    name: 'Montreal',
    country: 'Canada',
    lat: 45.5017,
    lng: -73.5673,
    population: 1762949,
    difficulty: 'medium'
  },
  {
    id: 'vancouver',
    name: 'Vancouver',
    country: 'Canada',
    lat: 49.2827,
    lng: -123.1207,
    population: 695263,
    difficulty: 'medium'
  },
  {
    id: 'seoul',
    name: 'Seoul',
    country: 'South Korea',
    lat: 37.5665,
    lng: 126.9780,
    population: 9776000,
    difficulty: 'medium'
  },
  {
    id: 'hong-kong',
    name: 'Hong Kong',
    country: 'Hong Kong',
    lat: 22.3193,
    lng: 114.1694,
    population: 7500700,
    difficulty: 'medium'
  },
  {
    id: 'bangkok',
    name: 'Bangkok',
    country: 'Thailand',
    lat: 14.5995,
    lng: 100.5200,
    population: 10156000,
    difficulty: 'medium'
  },
  {
    id: 'jakarta',
    name: 'Jakarta',
    country: 'Indonesia',
    lat: -6.2088,
    lng: 106.8456,
    population: 10770487,
    difficulty: 'medium'
  },
  {
    id: 'manila',
    name: 'Manila',
    country: 'Philippines',
    lat: 14.5995,
    lng: 120.9842,
    population: 13484462,
    difficulty: 'medium'
  },
  {
    id: 'denver',
    name: 'Denver',
    country: 'United States',
    lat: 39.7392,
    lng: -104.9903,
    population: 715522,
    difficulty: 'medium'
  },
  {
    id: 'seattle',
    name: 'Seattle',
    country: 'United States',
    lat: 47.6062,
    lng: -122.3321,
    population: 749256,
    difficulty: 'medium'
  },
  {
    id: 'boston',
    name: 'Boston',
    country: 'United States',
    lat: 42.3601,
    lng: -71.0589,
    population: 695506,
    difficulty: 'medium'
  },
  
  // Hard cities (lesser-known capitals, smaller international cities)
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
  },
  {
    id: 'riga',
    name: 'Riga',
    country: 'Latvia',
    lat: 56.9496,
    lng: 24.1052,
    population: 605802,
    difficulty: 'hard'
  },
  {
    id: 'ljubljana',
    name: 'Ljubljana',
    country: 'Slovenia',
    lat: 46.0569,
    lng: 14.5058,
    population: 295504,
    difficulty: 'hard'
  },
  {
    id: 'bratislava',
    name: 'Bratislava',
    country: 'Slovakia',
    lat: 48.1486,
    lng: 17.1077,
    population: 475503,
    difficulty: 'hard'
  },
  {
    id: 'zagreb',
    name: 'Zagreb',
    country: 'Croatia',
    lat: 45.8150,
    lng: 15.9819,
    population: 767131,
    difficulty: 'hard'
  },
  {
    id: 'sarajevo',
    name: 'Sarajevo',
    country: 'Bosnia and Herzegovina',
    lat: 43.8486,
    lng: 18.3564,
    population: 395133,
    difficulty: 'hard'
  },
  {
    id: 'skopje',
    name: 'Skopje',
    country: 'North Macedonia',
    lat: 41.9973,
    lng: 21.4280,
    population: 544086,
    difficulty: 'hard'
  },
  {
    id: 'tirana',
    name: 'Tirana',
    country: 'Albania',
    lat: 41.3275,
    lng: 19.8187,
    population: 557422,
    difficulty: 'hard'
  },
  {
    id: 'chisinau',
    name: 'Chisinau',
    country: 'Moldova',
    lat: 47.0105,
    lng: 28.8638,
    population: 635994,
    difficulty: 'hard'
  },
  {
    id: 'tbilisi',
    name: 'Tbilisi',
    country: 'Georgia',
    lat: 41.7151,
    lng: 44.8271,
    population: 1108717,
    difficulty: 'hard'
  },
  {
    id: 'yerevan',
    name: 'Yerevan',
    country: 'Armenia',
    lat: 40.1792,
    lng: 44.4991,
    population: 1091235,
    difficulty: 'hard'
  },
  {
    id: 'baku',
    name: 'Baku',
    country: 'Azerbaijan',
    lat: 40.4093,
    lng: 49.8671,
    population: 2303100,
    difficulty: 'hard'
  },
  {
    id: 'almaty',
    name: 'Almaty',
    country: 'Kazakhstan',
    lat: 43.2220,
    lng: 76.8512,
    population: 1916779,
    difficulty: 'hard'
  },
  {
    id: 'tashkent',
    name: 'Tashkent',
    country: 'Uzbekistan',
    lat: 41.2995,
    lng: 69.2401,
    population: 2571668,
    difficulty: 'hard'
  },
  {
    id: 'bishkek',
    name: 'Bishkek',
    country: 'Kyrgyzstan',
    lat: 42.8746,
    lng: 74.5698,
    population: 1012500,
    difficulty: 'hard'
  },
  {
    id: 'dushanbe',
    name: 'Dushanbe',
    country: 'Tajikistan',
    lat: 38.5598,
    lng: 68.7870,
    population: 863400,
    difficulty: 'hard'
  },
  {
    id: 'ulaanbaatar',
    name: 'Ulaanbaatar',
    country: 'Mongolia',
    lat: 47.8864,
    lng: 106.9057,
    population: 1645919,
    difficulty: 'hard'
  },
  {
    id: 'kathmandu',
    name: 'Kathmandu',
    country: 'Nepal',
    lat: 27.7172,
    lng: 85.3240,
    population: 1003285,
    difficulty: 'hard'
  },
  {
    id: 'colombo',
    name: 'Colombo',
    country: 'Sri Lanka',
    lat: 6.9271,
    lng: 79.8612,
    population: 752993,
    difficulty: 'hard'
  },
  {
    id: 'dhaka',
    name: 'Dhaka',
    country: 'Bangladesh',
    lat: 23.8103,
    lng: 90.4125,
    population: 9540000,
    difficulty: 'hard'
  },
  {
    id: 'vientiane',
    name: 'Vientiane',
    country: 'Laos',
    lat: 17.9757,
    lng: 102.6331,
    population: 948477,
    difficulty: 'hard'
  }
];

export function getRandomCity(): City {
  return cities[Math.floor(Math.random() * cities.length)];
}

export function getCitiesByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): City[] {
  return cities.filter(city => city.difficulty === difficulty);
}

export function getRandomCityByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): City {
  const filteredCities = getCitiesByDifficulty(difficulty);
  return filteredCities[Math.floor(Math.random() * filteredCities.length)];
}

export function getCityById(id: string): City | undefined {
  return cities.find(city => city.id === id);
}