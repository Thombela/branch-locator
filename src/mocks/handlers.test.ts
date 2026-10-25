import {
  branchDetailSchema,
  branchSearchSchema,
  filterOptionsSchema,
  placeSchema,
  placeSearchSchema,
} from '@/api/schemas';

const get = (path: string) => fetch(`http://localhost${path}`);

/** The mock has to follow docs/API.md, or the UI is tested against the wrong contract. */
describe('mock Branch Locator API contract', () => {
  it.each([
    ['/api/branches?lat=-33.9249&lng=18.4241', branchSearchSchema],
    [
      '/api/branches?lat=-33.9249&lng=18.4241&radiusKm=50&services=atm&openNow=true&limit=5',
      branchSearchSchema,
    ],
    ['/api/branches/filters', filterOptionsSchema],
    ['/api/branches/br_cape_town_grand_central', branchDetailSchema],
    ['/api/branches/br_atm_cape_town_station', branchDetailSchema],
    ['/api/places?query=san', placeSearchSchema],
    ['/api/places/pl_sandton', placeSchema],
  ])('GET %s matches the schema', async (path, schema) => {
    const response = await get(path);
    expect(response.status).toBe(200);
    expect(schema.safeParse(await response.json()).success).toBe(true);
  });

  it.each([
    ['/api/branches?lng=28', 'MISSING_LAT'],
    ['/api/branches?lat=-95&lng=28', 'INVALID_LAT'],
    ['/api/branches?lat=-26&lng=28&radiusKm=500', 'INVALID_RADIUSKM'],
    ['/api/branches?lat=-26&lng=28&services=teleport', 'INVALID_SERVICE'],
    ['/api/places?query=a', 'QUERY_TOO_SHORT'],
  ])('GET %s → 400 %s', async (path, code) => {
    const response = await get(path);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code } });
  });

  it.each(['/api/branches/br_nowhere_9', '/api/places/pl_atlantis'])(
    'GET %s → 404',
    async (path) => {
      expect((await get(path)).status).toBe(404);
    },
  );
});
