export interface DatabaseConnection {
  id: string;
  projectId: string;
  provider: 'stacklane_hosted' | 'postgres' | 'sqlite' | 'external';
  databaseUrl: string;
  passwordSecretRef: string;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface CreateDatabaseConnectionInput {
  projectId: string;
  provider: DatabaseConnection['provider'];
  databaseUrl: string;
  password: string;
}

export function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return '***';
  }
}

export function validateDatabaseUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'databaseUrl is required' };
  }
  try {
    const parsed = new URL(url);
    if (!['postgres:', 'postgresql:', 'sqlite:'].includes(parsed.protocol)) {
      return { valid: false, error: 'databaseUrl must use postgres://, postgresql://, or sqlite:// protocol' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'databaseUrl is not a valid URL' };
  }
}
