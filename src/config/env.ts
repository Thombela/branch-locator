import { z } from 'zod';

// Strict CSP forbids eval, so stop Zod probing for its JIT compiler before anything is parsed.
z.config({ jitless: true });

const envSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .optional()
    .transform((value) => (value ?? '').replace(/\/+$/, '')),
  VITE_ENABLE_MOCKS: z
    .string()
    .optional()
    .transform((value) => value !== 'false'),
  VITE_MAP_STYLE_LIGHT: z.string().optional(),
  VITE_MAP_STYLE_DARK: z.string().optional(),
});

const parsed = envSchema.parse(import.meta.env);

export const env = {
  apiBaseUrl: parsed.VITE_API_BASE_URL,
  enableMocks: parsed.VITE_ENABLE_MOCKS,
  requestTimeoutMs: 15_000,
  /** MapLibre style URLs. OpenFreeMap needs no API key; attribution comes from the style. */
  mapStyles: {
    light: parsed.VITE_MAP_STYLE_LIGHT || 'https://tiles.openfreemap.org/styles/liberty',
    dark: parsed.VITE_MAP_STYLE_DARK || 'https://tiles.openfreemap.org/styles/dark',
  },
} as const;
