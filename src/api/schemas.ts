/** Runtime contracts for the Branch Locator API (see docs/API.md). */
import { z } from 'zod';

export const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const addressSchema = z.object({
  street: z.string(),
  suburb: z.string(),
  city: z.string(),
  province: z.string(),
  postalCode: z.string(),
});

export const openStatusSchema = z.object({
  isOpen: z.boolean(),
  closesAt: z.iso.datetime({ offset: true }).nullable(),
  opensAt: z.iso.datetime({ offset: true }).nullable(),
});

const branchCore = {
  id: z.string(),
  name: z.string(),
  address: addressSchema,
  location: latLngSchema,
  openStatus: openStatusSchema,
  services: z.array(z.string()),
};

export const branchSummarySchema = z.object({
  ...branchCore,
  distanceKm: z.number().nonnegative(),
});

export const branchSearchSchema = z.object({
  origin: latLngSchema,
  radiusKm: z.number().positive(),
  total: z.number().int().nonnegative(),
  branches: z.array(branchSummarySchema),
});

export const dayHoursSchema = z.object({
  day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  open: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  close: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
});

export const branchDetailSchema = z.object({
  ...branchCore,
  phone: z.string(),
  hours: z.array(dayHoursSchema).length(7),
  facilities: z.array(z.string()),
  queue: z
    .object({
      estimatedWaitMinutes: z.number().int().nonnegative(),
      updatedAt: z.iso.datetime({ offset: true }),
    })
    .nullable(),
});

const optionSchema = z.object({ id: z.string(), label: z.string() });

export const filterOptionsSchema = z.object({
  services: z.array(optionSchema),
  facilities: z.array(optionSchema),
  radiusOptionsKm: z.array(z.number().positive()).min(1),
});

export const placeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  location: latLngSchema,
});

export const placeSearchSchema = z.object({ places: z.array(placeSchema) });

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});

export type LatLng = z.infer<typeof latLngSchema>;
export type Address = z.infer<typeof addressSchema>;
export type OpenStatus = z.infer<typeof openStatusSchema>;
export type BranchSummary = z.infer<typeof branchSummarySchema>;
export type BranchSearch = z.infer<typeof branchSearchSchema>;
export type DayHours = z.infer<typeof dayHoursSchema>;
export type BranchDetail = z.infer<typeof branchDetailSchema>;
export type FilterOptions = z.infer<typeof filterOptionsSchema>;
export type Place = z.infer<typeof placeSchema>;
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
