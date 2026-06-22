/**
 * Database connection testing for Stacklane v0.3.0.
 * Tests connectivity without exposing credentials.
 */

import { extractHost, extractDatabase } from './secrets';

export interface DatabaseTestResult {
  ok: boolean;
  status: 'connected' | 'failed' | 'not_configured' | 'unsupported';
  provider: 'postgres' | 'sqlite' | 'external' | 'stacklane_hosted';
  latencyMs?: number;
  message: string;
  safeHost?: string;
  errorCode?: string;
}

export async function testDatabaseConnection(
  databaseUrl: string,
  provider: string
): Promise<DatabaseTestResult> {
  const safeHost = extractHost(databaseUrl);
  const safeDb = extractDatabase(databaseUrl);

  if (!databaseUrl) {
    return {
      ok: false,
      status: 'not_configured',
      provider: provider as any,
      message: 'No database URL configured.',
      safeHost,
    };
  }

  if (provider === 'sqlite') {
    return testSqliteConnection(databaseUrl, safeHost);
  }

  if (provider === 'postgres' || provider === 'external' || provider === 'stacklane_hosted') {
    return testPostgresConnection(databaseUrl, safeHost, safeDb);
  }

  return {
    ok: false,
    status: 'unsupported',
    provider: provider as any,
    message: `Provider "${provider}" connection testing is not yet supported.`,
    safeHost,
  };
}

async function testPostgresConnection(
  url: string,
  safeHost: string,
  safeDb: string
): Promise<DatabaseTestResult> {
  const startTime = Date.now();

  try {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });

    await client.connect();
    await client.query('SELECT 1');
    await client.end();

    const latencyMs = Date.now() - startTime;

    return {
      ok: true,
      status: 'connected',
      provider: 'postgres',
      latencyMs,
      message: `Connected to ${safeHost}/${safeDb} in ${latencyMs}ms.`,
      safeHost,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorCode = err instanceof Error ? err.code || 'UNKNOWN' : 'UNKNOWN';
    const message = err instanceof Error ? err.message : 'Connection failed';

    if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') {
      return {
        ok: false,
        status: 'failed',
        provider: 'postgres',
        latencyMs,
        message: `Cannot reach ${safeHost}. Connection refused or host not found.`,
        safeHost,
        errorCode,
      };
    }

    if (errorCode === '28P01' || message.includes('password authentication')) {
      return {
        ok: false,
        status: 'failed',
        provider: 'postgres',
        latencyMs,
        message: `Authentication failed for ${safeHost}/${safeDb}. Check credentials.`,
        safeHost,
        errorCode,
      };
    }

    return {
      ok: false,
      status: 'failed',
      provider: 'postgres',
      latencyMs,
      message: `Connection to ${safeHost} failed: ${message.slice(0, 100)}`,
      safeHost,
      errorCode,
    };
  }
}

async function testSqliteConnection(
  url: string,
  safeHost: string
): Promise<DatabaseTestResult> {
  const startTime = Date.now();

  try {
    const sqlitePath = url.replace('sqlite://', '').replace('sqlite:', '');
    const fs = await import('fs');

    if (!fs.existsSync(sqlitePath)) {
      return {
        ok: false,
        status: 'failed',
        provider: 'sqlite',
        latencyMs: Date.now() - startTime,
        message: `SQLite file not found: ${safeHost}`,
        safeHost,
        errorCode: 'ENOENT',
      };
    }

    const stat = fs.statSync(sqlitePath);
    if (!stat.isFile()) {
      return {
        ok: false,
        status: 'failed',
        provider: 'sqlite',
        latencyMs: Date.now() - startTime,
        message: `Path exists but is not a file: ${safeHost}`,
        safeHost,
      };
    }

    return {
      ok: true,
      status: 'connected',
      provider: 'sqlite',
      latencyMs: Date.now() - startTime,
      message: `SQLite file accessible: ${safeHost}`,
      safeHost,
    };
  } catch (err) {
    return {
      ok: false,
      status: 'failed',
      provider: 'sqlite',
      latencyMs: Date.now() - startTime,
      message: `SQLite test failed: ${err instanceof Error ? err.message : 'unknown'}`,
      safeHost,
    };
  }
}
