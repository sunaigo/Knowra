import { useRouter } from 'next/navigation'
import { useRef } from 'react'

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

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

function isPlainObject(obj: unknown): obj is Record<string, unknown> {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

// 新增：全局401处理hook
export function useAuthRedirect() {
  const router = useRouter();
  const hasRedirected = useRef(false);
  // 只在401时跳转一次，防止多次重定向
  return () => {
    if (!hasRedirected.current) {
      hasRedirected.current = true;
      localStorage.removeItem('token');
      localStorage.removeItem('activeTeamId');
      router.replace('/login');
    }
  };
}

// 修改request函数，支持传入401处理回调
export async function request(
  url: string,
  options: RequestInit & { form?: boolean; responseType?: 'json' | 'blob', on401?: () => void } = {}
) {
  const { responseType = 'json', ...restOptions } = options;
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`
  const isFormData = restOptions.body instanceof FormData;
  const headers: Record<string, string> = buildHeaders(isFormData);
  
  if (restOptions.headers) {
    for (const [key, value] of Object.entries(restOptions.headers)) {
        if (typeof value === 'string') {
            headers[key] = value;
        }
    }
  }

  let body = restOptions.body as BodyInit | null | undefined;
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
    // 401时直接跳转登录页，并返回一个永不 resolve 的 Promise，防止后续代码执行
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('activeTeamId');
      window.location.replace('/login');
      return new Promise(() => {}); // 永不 resolve，阻断后续处理
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

export function get(url: string, options?: (RequestInit & { responseType?: 'json' | 'blob'; on401?: () => void })) {
  return request(url, { ...options, method: "GET" })
}

export function post<T = unknown>(url: string, body: unknown, options?: Omit<RequestInit, 'body'> & { form?: boolean, on401?: () => void }): Promise<T> {
  const { on401, ...restOptions } = options || {};
  return request(url, { ...restOptions, method: "POST", body: body as BodyInit | null | undefined });
}

export const put = async <T = unknown>(
  url: string,
  data?: unknown,
  options?: RequestInit & { form?: boolean; responseType?: 'json' | 'blob' },
): Promise<T> => {
  return request(url, {
    method: 'PUT',
    body: data as BodyInit | null | undefined,
    ...options,
  });
};

export function del(url: string, options?: RequestInit) {
  return request(url, { ...options, method: 'DELETE' });
} 