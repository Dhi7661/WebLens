const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let memoryAccessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  memoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (memoryAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${memoryAccessToken}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Ensures HttpOnly refresh cookies are sent/received
  };

  try {
    let response = await fetch(`${API_BASE}${endpoint}`, config);

    // If 401 Unauthorized, attempt a silent token refresh once
    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json();
        if (refreshJson.success && refreshJson.data?.accessToken) {
          setAccessToken(refreshJson.data.accessToken);
          headers.set('Authorization', `Bearer ${refreshJson.data.accessToken}`);
          // Retry original request with new token
          response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include',
          });
        }
      } else {
        setAccessToken(null);
      }
    }

    const data = await response.json().catch(() => ({}));
    return data;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
    };
  }
}

export interface ScanRecord {
  id: string;
  websiteId: string;
  ownerId: string;
  requestedUrl: string;
  finalUrl: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  overallScore: number;
  categoryScores: {
    performance: number;
    seo: number;
    accessibility: number;
    security: number;
    technology: number;
  };
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  shareToken?: string;
  isPublic?: boolean;
  trigger?: 'manual' | 'scheduled';
  analyzerVersion: string;
  createdAt: string;
}

export interface FindingRecord {
  id: string;
  scanId: string;
  ruleId: string;
  category: 'SEO' | 'Accessibility' | 'Performance' | 'Security' | 'Technology';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  summary: string;
  explanation: string;
  remediation: string;
  evidence: Array<{ selector?: string; value?: string; detail?: string }>;
  location?: string;
  docsUrl?: string;
  fingerprint: string;
  createdAt: string;
}

export interface CompareResult {
  baseScan: ScanRecord;
  targetScan: ScanRecord;
  deltas: {
    overall: number;
    categories: {
      performance: number;
      seo: number;
      accessibility: number;
      security: number;
      technology: number;
    };
  };
  counts: {
    regressions: number;
    resolved: number;
    persistent: number;
  };
  regressions: FindingRecord[];
  resolved: FindingRecord[];
  persistent: FindingRecord[];
}

export const scanApi = {
  create: (url: string) => apiClient<{ scan: ScanRecord }>('/scans', {
    method: 'POST',
    body: JSON.stringify({ url }),
  }),
  getStatus: (id: string) => apiClient<{ scan: ScanRecord }>(`/scans/${id}`),
  getReport: (id: string) => apiClient<{ scan: ScanRecord; findings: FindingRecord[] }>(`/scans/${id}/report`),
  list: () => apiClient<{ scans: ScanRecord[] }>('/scans'),
  retry: (id: string) => apiClient<{ scan: ScanRecord }>(`/scans/${id}/retry`, {
    method: 'POST',
  }),
  compare: (baseScanId: string, targetScanId: string) =>
    apiClient<CompareResult>(`/scans/compare?baseScanId=${baseScanId}&targetScanId=${targetScanId}`),
  share: (id: string) =>
    apiClient<{ shareToken: string; isPublic: boolean }>(`/scans/${id}/share`, {
      method: 'POST',
    }),
  revokeShare: (id: string) =>
    apiClient<{ isPublic: boolean }>(`/scans/${id}/share`, {
      method: 'DELETE',
    }),
  getShared: (token: string) =>
    apiClient<{ scan: ScanRecord; findings: FindingRecord[] }>(`/scans/shared/${token}`),
  getExportJsonUrl: (id: string, token?: string) =>
    `${API_BASE}/scans/${id}/export/json${token ? `?token=${encodeURIComponent(token)}` : ''}`,
  chatWithCopilot: (
    id: string,
    message: string,
    history?: Array<{ sender: 'user' | 'ai'; text: string }>,
    token?: string
  ) =>
    apiClient<{ reply: string; citations: string[] }>(
      `/scans/${id}/chat${token ? `?token=${encodeURIComponent(token)}` : ''}`,
      {
        method: 'POST',
        body: JSON.stringify({ message, history }),
      }
    ),
};

export interface WebsiteRecord {
  id: string;
  ownerId: string;
  url: string;
  normalizedUrl: string;
  hostname: string;
  displayName: string;
  monitoringEnabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
  lastScheduledAt?: string;
  nextScheduledAt?: string;
  scanCount?: number;
  latestScan?: ScanRecord | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteHistoryData {
  website: WebsiteRecord;
  stats: {
    totalScans: number;
    completedScans: number;
    averageScore: number;
    scoreDelta: number;
  };
  timeSeries: Array<{
    id: string;
    date: string;
    overallScore: number;
    categoryScores: {
      performance: number;
      seo: number;
      accessibility: number;
      security: number;
      technology: number;
    };
    durationMs: number;
  }>;
  scans: ScanRecord[];
}

export const websiteApi = {
  list: () => apiClient<{ websites: WebsiteRecord[] }>('/websites'),
  updateMonitoring: (
    id: string,
    monitoringEnabled: boolean,
    frequency?: 'hourly' | 'daily' | 'weekly'
  ) =>
    apiClient<{ website: WebsiteRecord }>(`/websites/${id}/monitoring`, {
      method: 'PATCH',
      body: JSON.stringify({ monitoringEnabled, frequency }),
    }),
  getHistory: (id: string) => apiClient<WebsiteHistoryData>(`/websites/${id}/history`),
  triggerScan: (id: string) =>
    apiClient<{ scan: ScanRecord }>(`/websites/${id}/scan`, {
      method: 'POST',
    }),
};

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt?: string;
  secretKey?: string; // Only present upon creation
}

export interface UserPreferences {
  theme: 'system' | 'dark' | 'light';
  emailAlerts: boolean;
  defaultFrequency: 'hourly' | 'daily' | 'weekly';
}

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  avatarUrl?: string;
  preferences: UserPreferences;
  createdAt: string;
}

export const userApi = {
  getProfile: () => apiClient<{ user: UserProfileData }>('/users/profile'),
  updateProfile: (data: {
    name?: string;
    avatarUrl?: string;
    preferences?: Partial<UserPreferences>;
  }) =>
    apiClient<{ user: UserProfileData }>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient<{ message: string }>('/users/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listApiKeys: () => apiClient<{ apiKeys: ApiKeyRecord[] }>('/users/api-keys'),
  createApiKey: (name: string) =>
    apiClient<{ apiKey: ApiKeyRecord }>('/users/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  revokeApiKey: (id: string) =>
    apiClient<{ message: string }>(`/users/api-keys/${id}`, {
      method: 'DELETE',
    }),
};




