import { getSecret } from 'astro:env/server';

// Read at request time so deployment secrets never enter the client build.
export function secret(name: string): string {
  return getSecret(name) ?? '';
}
