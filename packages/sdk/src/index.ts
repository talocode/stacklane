export interface StacklaneClientOptions {
  baseUrl: string;
  accessToken?: string;
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function createStacklaneClient(options: StacklaneClientOptions) {
  const { baseUrl, accessToken } = options;

  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error?.message || `HTTP ${res.status}` };
      }
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }

  return {
    async health() {
      return request<{ status: string; service: string }>('/health');
    },

    projects: {
      async create(data: { name: string; organizationId: string }) {
        return request<{ project: any }>('/v1/projects', 'POST', data);
      },
      async list() {
        return request<{ projects: any[] }>('/v1/projects');
      },
      async get(projectId: string) {
        return request<{ project: any }>(`/v1/projects/${projectId}`);
      },
    },

    database: {
      async set(projectId: string, data: { databaseUrl: string; password: string; provider?: string }) {
        return request<{ database: any }>(`/v1/projects/${projectId}/database`, 'POST', data);
      },
      async get(projectId: string) {
        return request<{ database: any }>(`/v1/projects/${projectId}/database`);
      },
      async test(projectId: string) {
        return request<{ result: { ok: boolean; status: string; message: string; latencyMs?: number } }>(
          `/v1/projects/${projectId}/database/test`, 'POST'
        );
      },
    },

    tokens: {
      async create(projectId: string, data: { name: string; scopes?: string[] }) {
        return request<{ token: any; rawToken: string }>(`/v1/projects/${projectId}/tokens`, 'POST', data);
      },
      async verify(token: string) {
        return request<{ valid: boolean; projectId: string; scopes: string[] }>('/v1/tokens/verify', 'POST', { token });
      },
      async revoke(projectId: string, tokenId: string) {
        return request<{ message: string }>(`/v1/projects/${projectId}/tokens/${tokenId}/revoke`, 'POST');
      },
    },

    audit: {
      async list(projectId: string, limit = 50) {
        return request<{ events: any[] }>(`/v1/projects/${projectId}/audit?limit=${limit}`);
      },
    },
  };
}

export type StacklaneClient = ReturnType<typeof createStacklaneClient>;
