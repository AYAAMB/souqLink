import { Platform } from "react-native";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

function getBaseUrl(): string {
  // ✅ Web: même domaine => pas de CORS
  if (Platform.OS === "web") return "";

  // ✅ Mobile: on doit fournir un domaine explicite
  const host = process.env.EXPO_PUBLIC_API_URL;
  if (!host) throw new Error("EXPO_PUBLIC_API_URL is not set");

  // normalise: pas de slash final
  return host.replace(/\/+$/, "");
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    try {
      const json = JSON.parse(text);
      throw new Error(json.error ?? text);
    } catch {
      throw new Error(text);
    }
  }
}

export async function apiRequest(method: string, route: string, data?: unknown): Promise<Response> {
  const base = getBaseUrl();
  const url = base ? `${base}${route}` : route; // ✅ web => "/api/.."

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401 }) =>
  async ({ queryKey }) => {
    const base = getBaseUrl();

    let path = "";
    if (queryKey[0] === "/api/orders" && queryKey[1] === "customer" && queryKey[2]) {
      path = `/api/orders/customer/${queryKey[2]}`;
    } else if (queryKey[0] === "/api/orders" && queryKey[1] === "courier" && queryKey[2]) {
      path = `/api/orders/courier/${queryKey[2]}`;
    } else {
      path = queryKey.join("/");
    }

    const url = base ? `${base}${path}` : path;

    const res = await fetch(url, { credentials: "include" });

    if (on401 === "returnNull" && res.status === 401) return null;

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
      staleTime: 2000,
      retry: false,
    },
    mutations: { retry: false },
  },
});
