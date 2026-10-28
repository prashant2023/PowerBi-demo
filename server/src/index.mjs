import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.mjs';

// npm workspaces execute this script from server/, while .env lives at repo root.
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const port = Number(process.env.PORT) || 4000;
createApp().listen(port, '127.0.0.1', () => {
  console.log(`KPI API listening on http://localhost:${port}`);
  console.log(`Data source: ${(process.env.DATA_SOURCE || 'mock').toLowerCase()}`);
});
