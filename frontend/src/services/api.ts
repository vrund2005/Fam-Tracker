const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export const authStorage = {
  getAccessToken: () => localStorage.getItem('access_token'),
  setAccessToken: (token: string) => localStorage.setItem('access_token', token),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  setRefreshToken: (token: string) => localStorage.setItem('refresh_token', token),
  clear: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  setUser: (user: any) => localStorage.setItem('user', JSON.stringify(user)),
};

async function handleRefresh(): Promise<string | null> {
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh?refresh_token=${refreshToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      authStorage.setAccessToken(data.access_token);
      authStorage.setRefreshToken(data.refresh_token);
      return data.access_token;
    }
  } catch (error) {
    console.error('Failed to refresh token', error);
  }
  authStorage.clear();
  return null;
}

async function request(path: string, options: RequestOptions = {}): Promise<any> {
  const headers = new Headers(options.headers || {});
  
  if (!options.skipAuth) {
    const token = authStorage.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const config = { ...options, headers };

  let response = await fetch(url, config);

  if (response.status === 401 && !options.skipAuth) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await handleRefresh();
      isRefreshing = false;
      if (newToken) {
        onRefreshed(newToken);
      } else {
        window.dispatchEvent(new Event('auth-logout'));
        throw new Error('Unauthorized');
      }
    }

    return new Promise((resolve, reject) => {
      subscribeTokenRefresh((newToken) => {
        headers.set('Authorization', `Bearer ${newToken}`);
        fetch(url, config)
          .then((res) => {
            if (!res.ok) throw res;
            return res.json();
          })
          .then(resolve)
          .catch(reject);
      });
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Something went wrong' }));
    throw new Error(errorData.detail || 'Request failed');
  }

  // Handle empty responses or delete requests that return no content
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  get: (path: string, options?: RequestOptions) => 
    request(path, { ...options, method: 'GET' }),
    
  post: (path: string, body?: any, options?: RequestOptions) => {
    const isFormData = body instanceof FormData;
    const headers = new Headers(options?.headers || {});
    if (!isFormData) {
      headers.set('Content-Type', 'application/json');
    }
    return request(path, {
      ...options,
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  put: (path: string, body?: any, options?: RequestOptions) => {
    const isFormData = body instanceof FormData;
    const headers = new Headers(options?.headers || {});
    if (!isFormData) {
      headers.set('Content-Type', 'application/json');
    }
    return request(path, {
      ...options,
      method: 'PUT',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });
  },

  delete: (path: string, options?: RequestOptions) => 
    request(path, { ...options, method: 'DELETE' }),
};
