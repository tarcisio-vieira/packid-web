const API_URL = import.meta.env.VITE_API_URL ?? "";

export type User = {
  name: string;
  email: string;
};

export async function fetchCurrentUser(): Promise<User | null> {
  const resp = await fetch(`${API_URL}/api/app-users/me`, {
    credentials: "include",
  });

  if (resp.status === 401) {
    return null;
  }

  if (!resp.ok) {
    throw new Error("Failed to fetch current user.");
  }

  return resp.json();
}

export function getLoginUrl(): string {
  return `${API_URL}/oauth2/authorization/google`;
}

export function getLogoutUrl(): string {
  return `${API_URL}/logout`;
}

export type PackIdFromLabelRequest = {
  packageCode: string;
  apartment: string;
};

export async function registerPackIdFromLabel(
  payload: PackIdFromLabelRequest
): Promise<void> {
  const resp = await fetch(`${API_URL}/api/pack-ids/from-label`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (resp.status === 401) {
    throw new Error("Não autenticado. Faça login novamente.");
  }

  if (!resp.ok) {
    const msg = await resp.text().catch(() => "");
    throw new Error(msg || "Falha ao registrar o pacote.");
  }
}

export type PackIdLabelCreateRequest = {
  packageCode: string;
  apartment: string;
};

async function readErrorMessage(resp: Response): Promise<string> {
  try {
    const data = await resp.json();
    return data?.message || data?.error || `HTTP ${resp.status}`;
  } catch {
    try {
      const text = await resp.text();
      return text || `HTTP ${resp.status}`;
    } catch {
      return `HTTP ${resp.status}`;
    }
  }
}

export async function createPackIdFromLabel(
  req: PackIdLabelCreateRequest
): Promise<unknown> {
  const resp = await fetch(`${API_URL}/api/pack-ids/from-label`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!resp.ok) {
    throw new Error(await readErrorMessage(resp));
  }

  return resp.json();
}


export type PackIdRecentItem = {
  id: string;
  apartment: string;
  packageCode: string; // pode continuar vindo (interno)
  labelPackageCode?: string; // NOVO: o que foi digitado no front
  arrivedAt: string; // ISO
  createdBy: string;
};

export async function fetchRecentPackIds(
  limit = 50,
  from?: string,
  to?: string
): Promise<PackIdRecentItem[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const resp = await fetch(
    `${API_URL}/api/pack-ids/recent?${params.toString()}`,
    {
      credentials: "include",
    }
  );

  if (resp.status === 401) return [];
  if (!resp.ok) throw new Error("Falha ao buscar histórico do PackID.");
  return resp.json();
}

