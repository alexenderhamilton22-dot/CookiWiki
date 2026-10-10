// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

describe('Démarrage de la fonction IA sous Node ESM', () => {
  it('charge tous les modules compilés séparément et répond sans appeler les services', async () => {
    // Unlike Vite and bundled builds, native ESM requires explicit file extensions.
    // Preserve the deployed directory layout and all local import specifiers.
    const directory = await mkdtemp(resolve('.api-runtime-'));
    try {
      await build({
        entryPoints: ['api/analyze-recipe.ts', 'server/analyze.ts', 'server/source.ts', 'src/lib/recipeAnalysis.ts'],
        outdir: directory, outbase: '.', bundle: false, platform: 'node', format: 'esm',
      });
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
        globalThis.fetch = () => { throw new Error('Unexpected network request'); };
        const { default: handler } = await import(${JSON.stringify(pathToFileURL(join(directory, 'api/analyze-recipe.js')).href)});
        const replies = [];
        for (const method of ['GET', 'POST']) {
          const reply = { headers: {} };
          const res = {
            set statusCode(value) { reply.status = value; },
            setHeader(name, value) { reply.headers[name] = value; },
            end(body) { reply.body = JSON.parse(body); },
          };
          await handler({ method, headers: { 'content-type': 'application/json' } }, res);
          replies.push(reply);
        }
        console.log(JSON.stringify(replies));
      `], { encoding: 'utf8', timeout: 10000 });
      expect(result.status, result.stderr).toBe(0);
      const replies = JSON.parse(result.stdout);
      expect(replies.map((reply: { status: number }) => reply.status)).toEqual([405, 401]);
      expect(replies[1].body).toEqual({ error: { code: 'SESSION_EXPIRED' } });
      expect(replies[1].headers['Content-Type']).toBe('application/json; charset=utf-8');
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
