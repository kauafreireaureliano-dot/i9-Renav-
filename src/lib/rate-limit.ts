// Rate limiting simples em memória para proteger o login contra força bruta.
// Suficiente para uma instância única (o caso de uso desta revenda); se o app
// vier a rodar em múltiplas instâncias, trocar por um store compartilhado (Redis).

const attempts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function isRateLimited(key: string): boolean {
  const entry = attempts.get(key);
  const now = Date.now();

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}
