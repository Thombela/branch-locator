/** Real South African places with approximate coordinates, for the place search. */
export interface PlaceSeed {
  id: string;
  name: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
}

const p = (
  name: string,
  city: string,
  province: string,
  postalCode: string,
  lat: number,
  lng: number,
): PlaceSeed => ({
  id: `pl_${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')}`,
  name,
  city,
  province,
  postalCode,
  lat,
  lng,
});

export const PLACES: PlaceSeed[] = [
  // Gauteng
  p('Johannesburg CBD', 'Johannesburg', 'Gauteng', '2001', -26.2041, 28.0473),
  p('Braamfontein', 'Johannesburg', 'Gauteng', '2001', -26.1929, 28.0305),
  p('Rosebank', 'Johannesburg', 'Gauteng', '2196', -26.1452, 28.0436),
  p('Sandton', 'Johannesburg', 'Gauteng', '2196', -26.1076, 28.0567),
  p('Randburg', 'Johannesburg', 'Gauteng', '2194', -26.0936, 28.0064),
  p('Fourways', 'Johannesburg', 'Gauteng', '2191', -26.0157, 28.0105),
  p('Midrand', 'Johannesburg', 'Gauteng', '1685', -25.9992, 28.1263),
  p('Soweto', 'Johannesburg', 'Gauteng', '1804', -26.2485, 27.854),
  p('Roodepoort', 'Johannesburg', 'Gauteng', '1724', -26.1625, 27.8725),
  p('Alberton', 'Ekurhuleni', 'Gauteng', '1449', -26.2672, 28.1222),
  p('Germiston', 'Ekurhuleni', 'Gauteng', '1401', -26.2309, 28.1677),
  p('Boksburg', 'Ekurhuleni', 'Gauteng', '1459', -26.2125, 28.2625),
  p('Benoni', 'Ekurhuleni', 'Gauteng', '1501', -26.1885, 28.3208),
  p('Kempton Park', 'Ekurhuleni', 'Gauteng', '1619', -26.1, 28.2333),
  p('Tembisa', 'Ekurhuleni', 'Gauteng', '1632', -25.9964, 28.2268),
  p('Pretoria CBD', 'Pretoria', 'Gauteng', '0002', -25.7461, 28.1881),
  p('Hatfield', 'Pretoria', 'Gauteng', '0083', -25.7487, 28.238),
  p('Menlyn', 'Pretoria', 'Gauteng', '0181', -25.7825, 28.2756),
  p('Centurion', 'Pretoria', 'Gauteng', '0157', -25.8603, 28.1894),
  p('Soshanguve', 'Pretoria', 'Gauteng', '0152', -25.5236, 28.1),
  p('Mamelodi', 'Pretoria', 'Gauteng', '0122', -25.7167, 28.3833),
  p('Vereeniging', 'Vereeniging', 'Gauteng', '1930', -26.6731, 27.9261),
  p('Krugersdorp', 'Mogale City', 'Gauteng', '1739', -26.0858, 27.7756),
  // Western Cape
  p('Cape Town CBD', 'Cape Town', 'Western Cape', '8001', -33.9249, 18.4241),
  p('Sea Point', 'Cape Town', 'Western Cape', '8005', -33.915, 18.387),
  p('Claremont', 'Cape Town', 'Western Cape', '7708', -33.9846, 18.4651),
  p('Bellville', 'Cape Town', 'Western Cape', '7530', -33.9022, 18.6292),
  p('Khayelitsha', 'Cape Town', 'Western Cape', '7784', -34.0403, 18.6778),
  p('Mitchells Plain', 'Cape Town', 'Western Cape', '7785', -34.048, 18.618),
  p('Durbanville', 'Cape Town', 'Western Cape', '7550', -33.832, 18.647),
  p('Somerset West', 'Cape Town', 'Western Cape', '7130', -34.075, 18.8433),
  p('Stellenbosch', 'Stellenbosch', 'Western Cape', '7600', -33.9321, 18.8602),
  p('Paarl', 'Drakenstein', 'Western Cape', '7646', -33.7342, 18.9621),
  p('George', 'George', 'Western Cape', '6530', -33.963, 22.4617),
  p('Mossel Bay', 'Mossel Bay', 'Western Cape', '6500', -34.1831, 22.146),
  // KwaZulu-Natal
  p('Durban CBD', 'Durban', 'KwaZulu-Natal', '4001', -29.8587, 31.0218),
  p('Umhlanga', 'Durban', 'KwaZulu-Natal', '4319', -29.7277, 31.0849),
  p('Pinetown', 'Durban', 'KwaZulu-Natal', '3610', -29.816, 30.857),
  p('Umlazi', 'Durban', 'KwaZulu-Natal', '4031', -29.97, 30.8833),
  p('Chatsworth', 'Durban', 'KwaZulu-Natal', '4092', -29.91, 30.88),
  p('Pietermaritzburg', 'Pietermaritzburg', 'KwaZulu-Natal', '3201', -29.6006, 30.3794),
  p('Richards Bay', 'Richards Bay', 'KwaZulu-Natal', '3900', -28.7807, 32.0383),
  p('Newcastle', 'Newcastle', 'KwaZulu-Natal', '2940', -27.7569, 29.9318),
  // Eastern Cape
  p('Gqeberha', 'Nelson Mandela Bay', 'Eastern Cape', '6001', -33.9608, 25.6022),
  p('East London', 'Buffalo City', 'Eastern Cape', '5201', -33.0153, 27.9116),
  p('Mthatha', 'King Sabata Dalindyebo', 'Eastern Cape', '5099', -31.5889, 28.7844),
  // Free State & Northern Cape
  p('Bloemfontein', 'Mangaung', 'Free State', '9301', -29.0852, 26.1596),
  p('Welkom', 'Matjhabeng', 'Free State', '9460', -27.9774, 26.7351),
  p('Kimberley', 'Sol Plaatje', 'Northern Cape', '8301', -28.7323, 24.7623),
  p('Upington', 'Dawid Kruiper', 'Northern Cape', '8801', -28.4478, 21.2561),
  // Limpopo, Mpumalanga, North West
  p('Polokwane', 'Polokwane', 'Limpopo', '0700', -23.9045, 29.4689),
  p('Thohoyandou', 'Thulamela', 'Limpopo', '0950', -22.9456, 30.485),
  p('Mbombela', 'Mbombela', 'Mpumalanga', '1200', -25.4658, 30.9853),
  p('Emalahleni', 'Emalahleni', 'Mpumalanga', '1035', -25.8713, 29.2332),
  p('Rustenburg', 'Rustenburg', 'North West', '0300', -25.6676, 27.2421),
  p('Mahikeng', 'Mahikeng', 'North West', '2745', -25.856, 25.6403),
  p('Potchefstroom', 'JB Marks', 'North West', '2531', -26.7145, 27.097),
];
