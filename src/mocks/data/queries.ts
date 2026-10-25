import type { BranchDetail, BranchSearch, LatLng, Place } from '@/api/schemas';
import { distanceKm } from '@/domain/geo';
import { openStatus, queueEstimate, type MockBranch } from './branches';
import { PLACES } from './places';

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface SearchParams {
  origin: LatLng;
  radiusKm: number;
  services: readonly string[];
  openNow: boolean;
  limit: number;
}

export function searchBranches(
  branches: readonly MockBranch[],
  params: SearchParams,
  now: Date,
): BranchSearch {
  // Narrow by distance before working out hours: the network has thousands of locations.
  const matches = branches
    .map((branch) => ({ branch, distance: distanceKm(params.origin, branch.location) }))
    .filter(({ distance }) => distance <= params.radiusKm)
    .filter(({ branch }) => params.services.every((service) => branch.services.includes(service)))
    .map((match) => ({ ...match, status: openStatus(match.branch.hours, now) }))
    .filter(({ status }) => !params.openNow || status.isOpen)
    .sort((a, b) => a.distance - b.distance);

  return {
    origin: params.origin,
    radiusKm: params.radiusKm,
    total: matches.length,
    branches: matches.slice(0, params.limit).map(({ branch, distance, status }) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      location: branch.location,
      distanceKm: round1(distance),
      openStatus: status,
      services: branch.services,
    })),
  };
}

export function branchDetail(branch: MockBranch, now: Date): BranchDetail {
  const status = openStatus(branch.hours, now);
  const { busyness, ...rest } = branch;
  const wait = status.isOpen ? queueEstimate(branch, now) : null;
  return {
    ...rest,
    openStatus: status,
    queue:
      wait === null
        ? null
        : { estimatedWaitMinutes: wait, updatedAt: now.toISOString().replace(/\.\d+Z$/, 'Z') },
  };
}

const normalise = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Prefix matches on the place name rank first, then matches on city or province. */
export function searchPlaces(query: string, limit: number): Place[] {
  const q = normalise(query);
  const scored = PLACES.map((place) => {
    const name = normalise(place.name);
    const score = name.startsWith(q)
      ? 0
      : name.split(/\s+/).some((word) => word.startsWith(q))
        ? 1
        : normalise(place.city).startsWith(q)
          ? 2
          : normalise(place.province).startsWith(q)
            ? 3
            : -1;
    return { place, score };
  })
    .filter(({ score }) => score >= 0)
    .sort((a, b) => a.score - b.score || a.place.name.localeCompare(b.place.name));

  return scored.slice(0, limit).map(({ place }) => toPlace(place));
}

export function toPlace(place: (typeof PLACES)[number]): Place {
  return {
    id: place.id,
    name: place.name,
    description: place.city === place.name ? place.province : `${place.city}, ${place.province}`,
    location: { lat: place.lat, lng: place.lng },
  };
}
