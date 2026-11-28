import { describe, expect, it } from 'vitest';
import {
  envNames,
  scanText,
  unsafePublicNames,
} from '../scripts/check-client-secrets.mjs';

describe('F299 no secrets in client bundles', () => {
  it('refuses secret-looking EXPO_PUBLIC_* names only', () => {
    expect(
      unsafePublicNames([
        'EXPO_PUBLIC_API_URL',
        'EXPO_PUBLIC_OPENAI_KEY',
        'EXPO_PUBLIC_VNPAY_HASH_SECRET',
        'OPENAI_API_KEY',
        'EXPO_PUBLIC_OPENAI_KEY',
      ]),
    ).toEqual(['EXPO_PUBLIC_OPENAI_KEY', 'EXPO_PUBLIC_VNPAY_HASH_SECRET']);
  });

  it('detects vendor credential formats', () => {
    const fake = (prefix: string, length: number) =>
      prefix + 'A1b2C3d4'.repeat(8).slice(0, length);
    expect(scanText(`const k="${fake('sk-proj-', 40)}"`)).toEqual([
      'OpenAI API key',
    ]);
    expect(scanText('id: AKIAABCDEFGHIJKLMNOP')).toEqual(['AWS access key']);
    expect(scanText(`t=${fake('ghp_', 36)}`)).toEqual(['GitHub token']);
    expect(scanText('-----BEGIN PRIVATE KEY-----')).toEqual(['Private key']);
  });

  it('ignores ordinary bundle text', () => {
    expect(
      scanText('function sk(){return "task-list"} const ask = "sk-short";'),
    ).toEqual([]);
  });

  it('finds literal server secret values of 8+ characters', () => {
    const secrets = [
      { name: 'VNPAY_HASH_SECRET', value: 'hunter2hunter2' },
      { name: 'VNPAY_TMN_CODE', value: 'short' },
      { name: 'OPENAI_API_KEY', value: undefined },
    ];
    expect(scanText('x="hunter2hunter2"; y="short"', secrets)).toEqual([
      'value of VNPAY_HASH_SECRET',
    ]);
  });

  it('reads dotenv names, skipping comments', () => {
    expect(
      envNames(
        '# EXPO_PUBLIC_X=1\nEXPO_PUBLIC_API_URL=http://x\nexport FOO_KEY = bar\n\n',
      ),
    ).toEqual(['EXPO_PUBLIC_API_URL', 'FOO_KEY']);
  });
});
