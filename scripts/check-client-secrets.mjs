#!/usr/bin/env node
// F299: fail when a provider or AI credential could ship to the browser.
// Run after `npm run build:web`; scans dist/ and the EXPO_PUBLIC_* variable names.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Recognisable credential formats. Each is anchored on a vendor prefix to avoid false alarms. */
export const SECRET_PATTERNS = [
  {
    name: 'OpenAI API key',
    pattern: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/,
  },
  { name: 'AWS access key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Stripe live secret', pattern: /\b[rs]k_live_[0-9A-Za-z]{24,}\b/ },
  { name: 'Slack token', pattern: /\bxox[abprs]-[0-9A-Za-z-]{10,}/ },
  {
    name: 'Private key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  },
];

/** Server-only variables whose values must never appear in a client bundle. */
export const SERVER_SECRET_VARS = [
  'OPENAI_API_KEY',
  'VNPAY_HASH_SECRET',
  'VNPAY_TMN_CODE',
  'PAYOS_API_KEY',
  'PAYOS_CHECKSUM_KEY',
  'DATABASE_URL',
];

const SECRET_NAME =
  /(KEY|SECRET|TOKEN|PASSWORD|PASSWD|HASH|PRIVATE|CREDENTIAL)/i;

/** EXPO_PUBLIC_* names are inlined into the bundle, so a secret-looking name is refused. */
export function unsafePublicNames(names) {
  return [...new Set(names)]
    .filter(
      (name) =>
        name.startsWith('EXPO_PUBLIC_') && SECRET_NAME.test(name.slice(12)),
    )
    .sort();
}

/** Findings for one text: vendor-format matches plus literal server secret values (8+ chars). */
export function scanText(text, serverSecrets = []) {
  const findings = SECRET_PATTERNS.filter(({ pattern }) =>
    pattern.test(text),
  ).map(({ name }) => name);
  for (const { name, value } of serverSecrets) {
    if (typeof value === 'string' && value.length >= 8 && text.includes(value))
      findings.push(`value of ${name}`);
  }
  return findings;
}

/** Variable names declared in dotenv-style text, commented lines ignored. */
export function envNames(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) =>
      line
        .replace(/^export\s+/, '')
        .split('=')[0]
        .trim(),
    )
    .filter(Boolean);
}

function* files(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(m?js|html|json|map|css|txt)$/.test(entry)) yield path;
  }
}

function main() {
  const root = join(fileURLToPath(import.meta.url), '..', '..');
  const problems = [];
  const names = [...Object.keys(process.env)];
  for (const file of [
    '.env',
    '.env.local',
    '.env.production',
    '.env.production.local',
  ]) {
    const path = join(root, file);
    if (existsSync(path)) names.push(...envNames(readFileSync(path, 'utf8')));
  }
  for (const name of unsafePublicNames(names))
    problems.push(
      `${name}: EXPO_PUBLIC_* values are bundled into the client; keep secrets on the server.`,
    );

  const dist = join(root, 'dist');
  if (!existsSync(dist)) {
    console.error('dist/ not found. Run `npm run build:web` first.');
    process.exit(1);
  }
  const serverSecrets = SERVER_SECRET_VARS.map((name) => ({
    name,
    value: process.env[name],
  }));
  let scanned = 0;
  for (const file of files(dist)) {
    scanned++;
    for (const finding of scanText(readFileSync(file, 'utf8'), serverSecrets))
      problems.push(`${relative(root, file)}: ${finding}`);
  }
  if (problems.length) {
    console.error(`Client secret check failed:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(
    `No secrets found in ${scanned} client files or EXPO_PUBLIC_* names.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main();
