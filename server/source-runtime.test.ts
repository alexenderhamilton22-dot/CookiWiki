// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

describe('Chargement réel du serveur sous Node ESM', () => {
  it('reconnaît les adresses publiques avec le module CommonJS ipaddr.js', async () => {
    // Vitest normalizes CommonJS namespaces; a native Node import does not.
    // Keep packages external, as in a server deployment, to catch this difference.
    const directory = await mkdtemp(resolve('.source-runtime-'));
    try {
      const outfile = join(directory, 'source.mjs');
      await build({ entryPoints: ['server/source.ts'], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external' });
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
        const source = await import(${JSON.stringify(pathToFileURL(outfile).href)});
        console.log(JSON.stringify({
          publicV4: source.isPublicAddress('8.8.8.8'),
          publicV6: source.isPublicAddress('2606:4700:4700::1111'),
          privateV4: source.isPublicAddress('127.0.0.1'),
          privateMapped: source.isPublicAddress('::ffff:127.0.0.1'),
          hostname: source.validateSourceUrl('https://lacuisinedannie.20minutes.fr/recette-gratin-d-aubergines-rapide-225.html').hostname,
        }));
      `], { encoding: 'utf8', timeout: 10000 });
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ publicV4: true, publicV6: true, privateV4: false, privateMapped: false, hostname: 'lacuisinedannie.20minutes.fr' });
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
