import { spawnSync } from 'node:child_process';
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('Lancez ce contrôle avec npm run verify:production.');
  process.exit(1);
}
for (const name of ['test', 'typecheck', 'lint', 'build']) {
  console.log(`\nContrôle : npm run ${name}`);
  const result = spawnSync(process.execPath, [npmCli, 'run', name], { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('\nContrôles locaux réussis. Validez aussi la configuration et les parcours connectés.');
