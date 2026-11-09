/**
 * Genererar pusselbanken i src/data/<nivå>.txt.
 *
 *   npx tsx scripts/generate-bank.ts [--count 300] [--jobs 4] [--seed 1] [--levels easy,medium]
 *
 * Varje rad är ett pussel: 81 tecken där 0 är en tom cell. Resultatet är
 * deterministiskt för samma seed, antal jobb och antal pussel.
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serializeGrid } from '../src/engine/board';
import { DIFFICULTIES, isDifficulty, type Difficulty } from '../src/engine/difficulty';
import { generate } from '../src/engine/generator';
import { mulberry32 } from '../src/engine/rng';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1]! : fallback;
};

const scriptPath = fileURLToPath(import.meta.url);

if (args[0] === '--worker') {
  // Barnprocess: generera `count` pussel och skriv dem till stdout.
  const [, level, seed, count] = args;
  if (!isDifficulty(level)) throw new Error(`Okänd nivå: ${level}`);
  const rng = mulberry32(Number(seed));
  for (let i = 0; i < Number(count); i++) {
    process.stdout.write(serializeGrid(generate(level, rng).puzzle) + '\n');
  }
} else {
  await main();
}

function runWorker(level: Difficulty, seed: number, count: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [...process.execArgv, scriptPath, '--worker', level, String(seed), String(count)],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    );
    let out = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve(out.trim().split('\n').filter(Boolean))
        : reject(new Error(`exit ${code}`)),
    );
  });
}

async function main(): Promise<void> {
  const count = Number(opt('count', '300'));
  const jobs = Number(opt('jobs', '4'));
  const seed = Number(opt('seed', '1'));
  const levels = opt('levels', DIFFICULTIES.join(',')).split(',');

  for (const [li, level] of levels.entries()) {
    if (!isDifficulty(level)) throw new Error(`Okänd nivå: ${level}`);
    const t0 = Date.now();
    const perJob = Math.ceil(count / jobs);
    const results = await Promise.all(
      Array.from({ length: jobs }, (_, j) =>
        runWorker(level, seed * 1_000_000 + li * 1000 + j, perJob),
      ),
    );
    const unique = [...new Set(results.flat())].slice(0, count);
    if (unique.length < count) throw new Error(`${level}: bara ${unique.length} unika pussel`);
    writeFileSync(new URL(`../src/data/${level}.txt`, import.meta.url), unique.join('\n') + '\n');
    console.log(`${level}: ${unique.length} pussel på ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
}
