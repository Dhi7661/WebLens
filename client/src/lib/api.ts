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
};


