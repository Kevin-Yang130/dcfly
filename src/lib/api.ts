import type { Stock } from "../app/components/stock-search";

const TOKEN_STORAGE_KEY = "dcfly_access_token";

export interface SearchResult {
  symbol: string;
  name: string;
  price: number;
}

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface SavedStock {
  symbol: string;
  name: string;
  saved_at: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readError(res: Response, fallback: string): Promise<string> {
  const err = await res.json().catch(() => ({}));
  const detail = (err as any).detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || String(item)).join(", ");
  }
  return typeof detail === "string" ? detail : fallback;
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const detail = await readError(res, "Search failed");
    throw new Error(res.status === 429 ? `429: ${detail}` : detail);
  }
  return res.json();
}

export async function fetchStock(symbol: string): Promise<Stock> {
  const res = await fetch(`/api/stocks/${encodeURIComponent(symbol)}`);
  if (!res.ok) {
    const detail = await readError(res, `Could not load ${symbol}`);
    throw new Error(res.status === 429 ? `429: ${detail}` : detail);
  }
  return res.json();
}

export async function register(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not create account"));
  const data = await res.json();
  setAuthToken(data.access_token);
  return data;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not sign in"));
  const data = await res.json();
  setAuthToken(data.access_token);
  return data;
}

export async function fetchMe(): Promise<User> {
  const res = await fetch("/api/auth/me", { headers: authHeaders() });
  if (!res.ok) throw new Error(await readError(res, "Session expired"));
  return res.json();
}

export async function fetchSavedStocks(): Promise<SavedStock[]> {
  const res = await fetch("/api/users/me/saved", { headers: authHeaders() });
  if (!res.ok) throw new Error(await readError(res, "Could not load saved stocks"));
  return res.json();
}

export async function saveStock(stock: Stock): Promise<void> {
  const res = await fetch(`/api/users/me/saved/${encodeURIComponent(stock.symbol)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
    }),
  });
  if (!res.ok) throw new Error(await readError(res, `Could not save ${stock.symbol}`));
}

export async function unsaveStock(symbol: string): Promise<void> {
  const res = await fetch(`/api/users/me/saved/${encodeURIComponent(symbol)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res, `Could not remove ${symbol}`));
}

export async function recordRecentlySeen(stock: Stock): Promise<void> {
  const res = await fetch("/api/users/me/recently-seen", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
    }),
  });
  if (!res.ok) throw new Error(await readError(res, "Could not update recently seen"));
}

export interface DCFResult {
  enterpriseValue: number;
  intrinsicValuePerShare: number;
  terminalValue: number;
  terminalValuePV: number;
  yearsData: { year: string; projectedFCF: number; presentValue: number }[];
}

export async function calculateDCFRemote(params: {
  currentFCF: number;
  growthRate: number;
  discountRate: number;
  terminalGrowthRate: number;
  projectionYears: number;
  sharesOutstanding: number;
}): Promise<DCFResult> {
  const res = await fetch("/api/dcf/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(await readError(res, "DCF calculation failed"));
  }
  return res.json();
}
