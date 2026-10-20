import { create } from "zustand";

const API_BASE =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
    : process.env.API_BASE_URL || "http://localhost:8000";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText}`);
  }
  return (await res.json()) as T;
}

export function getApiBaseUrl(): string {
  return API_BASE;
}

interface AtlasUIStore {
  activeSectorId: string;
  dateRange: string;
  lightMode: boolean;
  setActiveSectorId: (sectorId: string) => void;
  setDateRange: (range: string) => void;
  toggleLightMode: () => void;
}

export const useAtlasStore = create<AtlasUIStore>((set) => ({
  activeSectorId: "all",
  dateRange: "2021-2026",
  lightMode: false,
  setActiveSectorId: (sectorId: string) => set({ activeSectorId: sectorId }),
  setDateRange: (range: string) => set({ dateRange: range }),
  toggleLightMode: () => set((s) => ({ lightMode: !s.lightMode })),
}));
