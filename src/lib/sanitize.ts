const SENSITIVE_KEYS = ["password", "senha", "secret", "token", "certificate", "certificado", "clientSecret"];

// Remove campos sensíveis antes de persistir requests/responses de integrações
// (RENAVE, Fiscal) em log — nunca guardamos segredo ou certificado em banco.
export function sanitizeForLog(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(sanitizeForLog);
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = sanitizeForLog(v);
      }
    }
    return result;
  }

  return value;
}
