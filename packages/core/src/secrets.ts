/**
 * Secret redaction helpers for Stacklane v0.3.0.
 * Never log or expose raw secrets.
 */

export function redactToken(tokenOrPrefix: string): string {
  if (!tokenOrPrefix) return '';
  if (tokenOrPrefix.includes('...')) return tokenOrPrefix;
  if (tokenOrPrefix.length <= 12) return '***';
  return tokenOrPrefix.slice(0, 8) + '...' + tokenOrPrefix.slice(-4);
}

export function redactPassword(password: string): string {
  if (!password) return '';
  return '***';
}

export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    if (parsed.username) parsed.username = '***';
    return parsed.toString();
  } catch {
    return '***';
  }
}

export function safeConnectionSummary(connection: {
  id?: string;
  provider?: string;
  databaseUrl?: string;
  status?: string;
}): Record<string, unknown> {
  return {
    id: connection.id,
    provider: connection.provider,
    status: connection.status,
    host: extractHost(connection.databaseUrl),
    database: extractDatabase(connection.databaseUrl),
  };
}

export function extractHost(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname || '';
  } catch {
    return '';
  }
}

export function extractDatabase(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace('/', '') || '';
  } catch {
    return '';
  }
}

export function assertNoRawSecretInObject(obj: Record<string, unknown>, label: string): void {
  const dangerousKeys = ['password', 'secret', 'token', 'apiKey', 'api_key', 'accessToken', 'databasePassword'];
  for (const key of Object.keys(obj)) {
    if (dangerousKeys.includes(key) && typeof obj[key] === 'string' && obj[key].length > 4) {
      console.warn(`[SECURITY] Potential raw secret in ${label}.${key} — ensure this is not logged or exposed.`);
    }
  }
}
