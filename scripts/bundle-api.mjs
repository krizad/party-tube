#!/usr/bin/env node
/**
 * Bundle PartyTube Backend into a self-contained flat distribution (for Plesk shared host).
 *
 * Flow:
 *   1. Switch Prisma schema provider to mysql (target DB is MySQL/MariaDB) + full build
 *   2. Build a self-contained flat bundle (npm layout, no symlinks, no .pnpm):
 *      - apps/backend/dist + package.json with exact pinned versions
 *      - @partytube/database + @partytube/shared-types vendored into vendor/
 *      - npm install --omit=dev (flattened node_modules, safe for Plesk)
 *      - copy generated Prisma client (.prisma) into node_modules
 *      - dereference @partytube/* symlinks
 *   3. Smoke test: boot API and check responsiveness
 *   4. Restore local schema provider
 */

import { execSync, spawn } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEPLOY_DIR = join(ROOT, 'deploy-api');

const flag = (name) => process.argv.includes(`--${name}`);
const SKIP_BUILD = flag('skip-build');
const SKIP_TEST = flag('skip-test');

function run(cmd, cwd = ROOT) {
  console.log(`\n==> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function detectProvider() {
  const schemaPath = join(ROOT, 'packages', 'database', 'prisma', 'schema.prisma');
  if (existsSync(schemaPath)) {
    const text = readFileSync(schemaPath, 'utf-8');
    const match = /provider\s*=\s*"(sqlite|mysql|postgresql)"/.exec(text);
    if (match) return match[1];
  }
  return 'sqlite';
}

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf-8'));
}

function exactVersion(nodeModulesRoot, name) {
  const candidates = [
    join(nodeModulesRoot, 'node_modules', name, 'package.json'),
    join(ROOT, 'node_modules', name, 'package.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return readJson(p).version;
  }
  return null;
}

function findPrismaSource() {
  // Check standard location
  const std = join(ROOT, 'node_modules', '.prisma');
  if (existsSync(join(std, 'client', 'default.js'))) return std;

  // Check .pnpm store
  const store = join(ROOT, 'node_modules', '.pnpm');
  if (existsSync(store)) {
    for (const d of readdirSync(store)) {
      if (!d.startsWith('@prisma+client@')) continue;
      const candidate = join(store, d, 'node_modules', '.prisma');
      if (existsSync(join(candidate, 'client', 'default.js'))) return candidate;
    }
  }

  // Check database package
  const dbStore = join(ROOT, 'packages', 'database', 'node_modules', '.prisma');
  if (existsSync(join(dbStore, 'client', 'default.js'))) return dbStore;

  return null;
}

function vendorWorkspacePackage(name, pkgDir, deployVendorDir) {
  const shortName = name.replace(/^@partytube\//, '');
  const target = join(deployVendorDir, shortName);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });

  if (existsSync(join(pkgDir, 'dist'))) {
    cpSync(join(pkgDir, 'dist'), join(target, 'dist'), { recursive: true });
  }

  const pkgJson = readJson(join(pkgDir, 'package.json'));
  const pinned = {};
  for (const [dep, range] of Object.entries(pkgJson.dependencies || {})) {
    const exact = exactVersion(pkgDir, dep);
    pinned[dep] = exact || range;
  }
  pkgJson.dependencies = pinned;
  delete pkgJson.devDependencies;
  delete pkgJson.scripts;
  delete pkgJson.files;
  writeFileSync(join(target, 'package.json'), JSON.stringify(pkgJson, null, 2));
  return target;
}

function buildFlatBundle() {
  const backendPkgDir = join(ROOT, 'apps', 'backend');
  const dbPkgDir = join(ROOT, 'packages', 'database');
  const sharedPkgDir = join(ROOT, 'packages', 'shared-types');

  console.log('Cleaning and preparing deploy-api directory...');
  rmSync(DEPLOY_DIR, { recursive: true, force: true });
  mkdirSync(DEPLOY_DIR, { recursive: true });

  cpSync(join(backendPkgDir, 'dist'), join(DEPLOY_DIR, 'dist'), { recursive: true });
  cpSync(join(ROOT, 'scripts', 'diag-server.js'), join(DEPLOY_DIR, 'diag.js'));

  const vendorDir = join(DEPLOY_DIR, 'vendor');
  mkdirSync(vendorDir, { recursive: true });
  vendorWorkspacePackage('@partytube/database', dbPkgDir, vendorDir);
  vendorWorkspacePackage('@partytube/shared-types', sharedPkgDir, vendorDir);

  const backendJson = readJson(join(backendPkgDir, 'package.json'));
  const deps = {};
  for (const [dep, range] of Object.entries(backendJson.dependencies || {})) {
    if (dep.startsWith('@partytube/')) continue;
    if (dep.startsWith('@types/')) continue;
    const exact = exactVersion(backendPkgDir, dep);
    deps[dep] = exact || range;
  }
  deps['@partytube/database'] = 'file:./vendor/database';
  deps['@partytube/shared-types'] = 'file:./vendor/shared-types';

  const deployJson = {
    name: 'partytube-api',
    version: '1.0.0',
    private: true,
    scripts: {
      diag: 'node diag.js',
      'start:prod': 'node dist/main',
    },
    engines: { node: '>=20.19' },
    dependencies: deps,
  };
  writeFileSync(join(DEPLOY_DIR, 'package.json'), JSON.stringify(deployJson, null, 2));
  console.log(`Flat bundle manifest staged with ${Object.keys(deps).length} dependencies`);

  run('npm install --omit=dev --no-audit --no-fund --loglevel=error', DEPLOY_DIR);

  const prismaSource = findPrismaSource();
  if (!prismaSource) throw new Error('Cannot find generated Prisma client (.prisma) in workspace node_modules');
  rmSync(join(DEPLOY_DIR, 'node_modules', '.prisma'), { recursive: true, force: true });
  cpSync(prismaSource, join(DEPLOY_DIR, 'node_modules', '.prisma'), { recursive: true });
  console.log('Copied generated Prisma client into node_modules/.prisma');

  // Replace symlinks for @partytube with real directories
  for (const name of ['database', 'shared-types']) {
    const linkPath = join(DEPLOY_DIR, 'node_modules', '@partytube', name);
    rmSync(linkPath, { recursive: true, force: true });
    cpSync(join(DEPLOY_DIR, 'vendor', name), linkPath, { recursive: true });
  }
  console.log('Dereferenced @partytube/* symlinks to physical directories');

  rmSync(join(DEPLOY_DIR, 'vendor'), { recursive: true, force: true });
  console.log('Removed temporary vendor/ directory');
}

function smokeTest() {
  return new Promise((resolveSmoke) => {
    console.log('Running smoke test on bundled application...');
    const child = spawn('node', ['dist/main.js'], {
      cwd: DEPLOY_DIR,
      env: { ...process.env, PORT: '3998', NODE_ENV: 'production' },
      stdio: 'ignore',
    });

    let settled = false;
    const finish = (ok, detail) => {
      if (settled) return;
      settled = true;
      try { child.kill('SIGTERM'); } catch {}
      resolveSmoke({ ok, detail });
    };

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('http://localhost:3998/api/rooms');
        finish(res.status < 500, `HTTP status ${res.status}`);
      } catch (e) {
        finish(false, e.message);
      }
    }, 6000);

    child.on('exit', () => {
      clearTimeout(timer);
      finish(false, 'process exited early');
    });
  });
}

async function main() {
  const origProvider = detectProvider();
  try {
    if (!SKIP_BUILD) {
      console.log('Switching database provider to MySQL for production build...');
      run('pnpm --filter @partytube/database db:use:mysql');
      run('pnpm --filter @partytube/shared-types build');
      run('pnpm --filter @partytube/database build');
      run('pnpm --filter @partytube/backend build');
    }

    buildFlatBundle();

    if (!SKIP_TEST) {
      const smoke = await smokeTest();
      console.log(smoke.ok ? 'Smoke test: OK' : `Smoke test: WARNING — ${smoke.detail}`);
    }

    console.log('\n================================================================');
    console.log(' 🎉 Flat bundle built successfully in: deploy-api/');
    console.log('================================================================\n');
  } finally {
    if (!SKIP_BUILD && origProvider !== 'mysql') {
      console.log(`Restoring schema provider back to ${origProvider}...`);
      run(`node packages/database/scripts/sync-schema.mjs ${origProvider}`);
      run('pnpm --filter @partytube/database db:generate');
    }
  }
}

main().catch((e) => {
  console.error(`\nBUNDLE FAILED: ${e.message}`);
  process.exit(1);
});
