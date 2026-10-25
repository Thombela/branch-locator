import { setupServer } from 'msw/node';
import { createHandlers } from '@/mocks/handlers';

/** The same handlers the browser uses, with latency removed. */
export const server = setupServer(...createHandlers({ latency: [0, 0] }));
