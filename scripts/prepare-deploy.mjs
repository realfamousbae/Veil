// Turns a dev build into the deployable site: swaps in the production runtime config,
// drops the dev map samples and regenerates _headers for the new config.
//   node scripts/prepare-deploy.mjs [path/to/config.json]
import { copyFile, readFile, rm, writeFile } from 'node:fs/promises';
import { buildHeaders } from './build-headers.mjs';

const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
const configPath = process.argv[2]
  ? new URL(process.argv[2], `file://${process.cwd()}/`)
  : new URL('deploy/config.json', root);

await copyFile(configPath, new URL('config.json', dist));
await rm(new URL('dev/', dist), { recursive: true, force: true });
const config = JSON.parse(await readFile(new URL('config.json', dist), 'utf8'));
await writeFile(new URL('_headers', dist), buildHeaders(config));
console.log('dist/ ready to deploy with', configPath.pathname);
