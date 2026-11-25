
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

let csrfToken: string | null = null;

export async function initializeCsrf(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/csrf/`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to initialize CSRF protection.");
  }

  const data = await response.json();
  csrfToken = data.csrfToken;
}

type ApiOptions = RequestInit;

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("API URL is not configured.");
  }

  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
    if (!csrfToken) {
      await initializeCsrf();
    }

    headers.set("X-CSRFToken", csrfToken!);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let message = "Something went wrong.";

if (typeof data === "string") {
  message = data;
} else if (data && typeof data === "object") {
  const errors = Object.entries(data as Record<string, unknown>);

  if (errors.length > 0) {
    const [field, value] = errors[0];

    if (typeof value === "string") {
      message = value;
    } else if (Array.isArray(value)) {
      message = `${field}: ${value.join(", ")}`;
    } else if (field === "detail" || field === "message") {
      message = String(value);
    } else {
      message = `${field}: ${JSON.stringify(value)}`;
    }
  }
}

throw new Error(message);
  }

  return data as T;
}
