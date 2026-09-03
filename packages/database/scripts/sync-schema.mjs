#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const SCHEMA_PATH = resolve(__dirname, '../prisma/schema.prisma');
const ENV_PATH = resolve(ROOT, '.env');

function detectProviderFromUrl(url) {
  const match = /^([a-zA-Z0-9]+):\/\//.exec(url);
  if (!match) return null;
  const protocol = match[1].toLowerCase();
  if (protocol === 'mysql' || protocol === 'mariadb') return 'mysql';
  if (protocol === 'file' || protocol === 'sqlite') return 'sqlite';
  return null;
}

function resolveProvider() {
  const arg = process.argv[2];
  if (arg === 'mysql' || arg === 'sqlite') return arg;

  if (existsSync(ENV_PATH)) {
    const envContent = readFileSync(ENV_PATH, 'utf-8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
    if (match && match[1]) {
      const detected = detectProviderFromUrl(match[1]);
      if (detected) return detected;
    }
  }

  const envUrl = process.env.DATABASE_URL || '';
  const detected = detectProviderFromUrl(envUrl);
  if (detected) return detected;

  return 'sqlite'; // default to sqlite
}

const PROVIDER_RE = /(datasource db \{[^}]*provider\s*=\s*)"(sqlite|mysql|postgresql)"/;

function main() {
  const provider = resolveProvider();
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');

  const match = PROVIDER_RE.exec(schema);
  if (!match) {
    console.warn('Could not find datasource db block in schema.prisma. No changes made.');
    return;
  }

  if (match[2] === provider) {
    console.log(`schema.prisma provider is already "${provider}"`);
    return;
  }

  const updated = schema.replace(PROVIDER_RE, `$1"${provider}"`);
  writeFileSync(SCHEMA_PATH, updated);
  console.log(`schema.prisma provider switched to "${provider}"`);
}

main();
