const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"

function getToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token") || ""
  }
  return ""
}

function buildHeaders(isFormData: boolean = false): Record<string, string> {
  const token = getToken()
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function isPlainObject(obj: any) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

export async function request(
  url: string,
  options: RequestInit & { form?: boolean; responseType?: 'json' | 'blob' } = {}
) {
  const { responseType = 'json', ...restOptions } = options;
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`
  const isFormData = restOptions.body instanceof FormData;
  let headers: Record<string, string> = buildHeaders(isFormData);
  
  if (restOptions.headers) {
    for (const [key, value] of Object.entries(restOptions.headers)) {
        if (typeof value === 'string') {
            headers[key] = value;
        }
    }
  }

  let body = restOptions.body
  if (
    restOptions.form &&
    body &&
    isPlainObject(body) &&
    !(body instanceof URLSearchParams)
  ) {
    body = new URLSearchParams(body as unknown as Record<string, string>).toString()
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (!isFormData && !restOptions.form && body && isPlainObject(body)) {
    body = JSON.stringify(body)
  }
  const res = await fetch(fullUrl, {
    ...restOptions,
    headers,
    body,
  })

  if (!res.ok) {
    let errorDetail = res.statusText
    try {
      const errorData = await res.json()
      if (errorData.detail) {
        errorDetail = errorData.detail
      }
    } catch (e) {
      // Not a JSON response, do nothing
    }
    const err = new Error(errorDetail)
    // @ts-ignore
    err.status = res.status
    throw err
  }

  if (responseType === 'blob') {
    return res.blob();
  }

  // Default to json
  const data = await res.json().catch(() => ({}))
  // For our backend's standard response format, check code and message
  // 统一返回响应对象，不抛异常，由前端判断 code
  return data
}

export const fetcher = (url: string) => get(url).then(data => data.data);

export function get(url: string, options?: RequestInit & { responseType?: 'json' | 'blob' }) {
  return request(url, { ...options, method: "GET" })
}

export const post = async <T = any>(
  url: string,
  data?: any,
  options?: RequestInit & { form?: boolean; responseType?: 'json' | 'blob' },
): Promise<T> => {
  return request(url, {
    method: 'POST',
    body: data,
    ...options,
  });
};

export const put = async <T = any>(
  url: string,
  data?: any,
  options?: RequestInit & { form?: boolean; responseType?: 'json' | 'blob' },
): Promise<T> => {
  return request(url, {
    method: 'PUT',
    body: data,
    ...options,
  });
};

export function del(url: string, options?: RequestInit) {
  return request(url, { ...options, method: 'DELETE' });
} 