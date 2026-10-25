# Branch Locator API Specification

The brief for this project came without an API, so I wrote this contract first, in the same style as the other two briefs, and built the frontend against it. The mock in `src/mocks` implements it, and `src/api/schemas.ts` validates every response at runtime.

Conventions:

- Coordinates are WGS84 decimal degrees. Distances are kilometres, rounded to one decimal.
- Times are local South African time (`Africa/Johannesburg`, UTC+2, no DST). Wall-clock hours use `HH:mm`; instants use ISO 8601 with an offset.
- Errors use `{ "error": { "code": "…", "message": "…" } }` with `400` for bad parameters and `404` for unknown IDs.
- The customer's location is sent only as query parameters on search requests. It is never stored or returned in URLs the app generates.

---

## 1. Branches near a location

```
GET /api/branches?lat={lat}&lng={lng}&radiusKm={radiusKm}&services={services}&openNow={openNow}&limit={limit}
```

**Query parameters:**

- `lat`, `lng`: search origin (required). `lat` must be in −90…90 and `lng` in −180…180.
- `radiusKm`: search radius, `1`–`100` (default: `10`)
- `services`: comma-separated service IDs; a branch must offer **all** of them (optional)
- `openNow`: `true` to return only branches open at request time (optional)
- `limit`: maximum results, `1`–`50` (default: `20`)

Results are sorted by distance, nearest first.

**Response:**

```json
{
  "origin": { "lat": -33.9249, "lng": 18.4241 },
  "radiusKm": 10,
  "total": 70,
  "branches": [
    {
      "id": "br_cape_town_golden_acre",
      "name": "Capitec Bank Cape Town Golden Acre",
      "address": {
        "street": "Shop S41, Golden Acre Shopping Centre, Strand Street",
        "suburb": "Foreshore",
        "city": "Cape Town",
        "province": "Western Cape",
        "postalCode": "8001"
      },
      "location": { "lat": -33.9236, "lng": 18.42457 },
      "distanceKm": 0.2,
      "openStatus": {
        "isOpen": true,
        "closesAt": "2024-09-16T17:00:00+02:00",
        "opensAt": null
      },
      "services": ["branch"]
    }
  ]
}
```

`openStatus.closesAt` is set while the branch is open, and `opensAt` (the next opening) while it is closed. A location that never closes, such as a 24-hour ATM, is open with both `null`.

`address.suburb` may be an empty string when the store feed doesn’t give one.

## 2. Branch detail

```
GET /api/branches/{branchId}
```

**Response:** the summary fields above (without `distanceKm`), plus:

```json
{
  "id": "br_cape_town_golden_acre",
  "name": "Capitec Bank Cape Town Golden Acre",
  "address": {
    "street": "Shop S41, Golden Acre Shopping Centre, Strand Street",
    "suburb": "Foreshore",
    "city": "Cape Town",
    "province": "Western Cape",
    "postalCode": "8001"
  },
  "location": { "lat": -33.9236, "lng": 18.42457 },
  "openStatus": { "isOpen": true, "closesAt": "2024-09-16T17:00:00+02:00", "opensAt": null },
  "services": ["branch"],
  "phone": "+27 86 010 2043",
  "hours": [
    { "day": "monday", "open": "08:00", "close": "17:00" },
    { "day": "tuesday", "open": "08:00", "close": "17:00" },
    { "day": "wednesday", "open": "08:00", "close": "17:00" },
    { "day": "thursday", "open": "08:00", "close": "17:00" },
    { "day": "friday", "open": "08:00", "close": "17:00" },
    { "day": "saturday", "open": "08:00", "close": "13:00" },
    { "day": "sunday", "open": null, "close": null }
  ],
  "facilities": [],
  "queue": { "estimatedWaitMinutes": 12, "updatedAt": "2024-09-16T10:00:00+02:00" }
}
```

`queue` is `null` when the branch is closed, and always for ATMs. A `close` of `24:00` means midnight; `00:00`–`24:00` is open all day.

## 3. Filter options

```
GET /api/branches/filters
```

**Response:**

```json
{
  "services": [
    { "id": "branch", "label": "Branch" },
    { "id": "atm", "label": "ATM" },
    { "id": "cash_deposit", "label": "Cash deposits" },
    { "id": "smart_id", "label": "Smart ID" },
    { "id": "business_banking", "label": "Business banking" }
  ],
  "facilities": [],
  "radiusOptionsKm": [5, 10, 25, 50]
}
```

## 4. Place search

For customers who don't share their location, or who are planning a visit somewhere else.

```
GET /api/places?query={query}&limit={limit}
```

**Query parameters:**

- `query`: at least 2 characters; matches suburb, city or province (required)
- `limit`: `1`–`10` (default: `6`)

**Response:**

```json
{
  "places": [
    {
      "id": "pl_sandton",
      "name": "Sandton",
      "description": "Johannesburg, Gauteng",
      "location": { "lat": -26.1076, "lng": 28.0567 }
    }
  ]
}
```

## 5. Place by ID

Used to restore a shared link.

```
GET /api/places/{placeId}
```

**Response:** a single place, in the same shape as an item in `places` above.
