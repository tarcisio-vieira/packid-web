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
  block: string;
  bookPage: string;
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
  block: string;
  bookPage: string;
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
  bookPage?: string;
  block?: string;
  apartment: string;
  residentFullName?: string;
  packageCode: string; // pode continuar vindo (interno)
  labelPackageCode?: string; // NOVO: o que foi digitado no front
  observations?: string;
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
  if (!resp.ok) throw new Error("Falha ao buscar histórico de encomendas.");
  return resp.json();
}


export type RegistryEntryType =
  | "RESIDENT"
  | "DELIVERY_PERSON"
  | "VISITOR"
  | "BICYCLE"
  | "PET"
  | "VEHICLE";

export type RegistryEntry = {
  id: string;
  entryType: RegistryEntryType;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  block?: string | null;
  apartment?: string | null;
  company?: string | null;
  ownerName?: string | null;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  identifier?: string | null;
  species?: string | null;
  breed?: string | null;
  parkingSpace?: string | null;
  notes?: string | null;
  photoAvailable: boolean;
  photoOwnedByCurrentUser: boolean;
  photoFileName?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type RegistryEntryPayload = Omit<
  RegistryEntry,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "photoAvailable"
  | "photoOwnedByCurrentUser"
  | "photoFileName"
>;

export async function fetchRegistryEntries(
  type?: RegistryEntryType,
): Promise<RegistryEntry[]> {
  const params = new URLSearchParams();
  if (type) params.set("type", type);

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const resp = await fetch(`${API_URL}/api/registry${suffix}`, {
    credentials: "include",
  });

  if (resp.status === 401) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (!resp.ok) {
    throw new Error(await readErrorMessage(resp));
  }
  return resp.json();
}

export async function createRegistryEntry(
  payload: RegistryEntryPayload,
): Promise<RegistryEntry> {
  const resp = await fetch(`${API_URL}/api/registry`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function updateRegistryEntry(
  id: string,
  payload: RegistryEntryPayload,
): Promise<RegistryEntry> {
  const resp = await fetch(`${API_URL}/api/registry/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function deleteRegistryEntry(id: string): Promise<void> {
  const resp = await fetch(`${API_URL}/api/registry/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!resp.ok) throw new Error(await readErrorMessage(resp));
}

export async function uploadRegistryEntryPhoto(
  id: string,
  file: File,
): Promise<RegistryEntry> {
  const form = new FormData();
  form.append("file", file);

  const resp = await fetch(`${API_URL}/api/registry/${id}/photo`, {
    method: "PUT",
    credentials: "include",
    body: form,
  });

  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function deleteRegistryEntryPhoto(id: string): Promise<RegistryEntry> {
  const resp = await fetch(`${API_URL}/api/registry/${id}/photo`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export function registryEntryPhotoUrl(id: string, version?: string | null): string {
  const suffix = version ? `?v=${encodeURIComponent(version)}` : "";
  return `${API_URL}/api/registry/${id}/photo${suffix}`;
}

export type VisitorVisit = {
  id: string;
  visitorRegistryEntryId: string;
  visitorName?: string | null;
  visitorDocument?: string | null;
  visitorPhone?: string | null;
  block: string;
  apartment: string;
  visitedAt: string;
  notes?: string | null;
};

export type VisitorVisitPayload = {
  visitorRegistryEntryId: string;
  block: string;
  apartment: string;
  visitedAt?: string | null;
  notes?: string | null;
};

export type DeliveryRecord = {
  id: string;
  deliveryPersonRegistryEntryId: string;
  deliveryPersonName?: string | null;
  company?: string | null;
  document?: string | null;
  phone?: string | null;
  block: string;
  apartment: string;
  deliveredAt: string;
  authorizedToEnter: boolean;
  notes?: string | null;
};

export type DeliveryRecordPayload = {
  deliveryPersonRegistryEntryId: string;
  block: string;
  apartment: string;
  deliveredAt?: string | null;
  authorizedToEnter?: boolean;
  notes?: string | null;
};

export type UnitRegistrySummary = {
  block: string;
  apartment: string;
  residents: RegistryEntry[];
  bicycles: RegistryEntry[];
  vehicles: RegistryEntry[];
  pets: RegistryEntry[];
  visits: VisitorVisit[];
  deliveries: DeliveryRecord[];
  packIds: PackIdRecentItem[];
};

export async function createVisitorVisit(
  payload: VisitorVisitPayload,
): Promise<VisitorVisit> {
  const resp = await fetch(`${API_URL}/api/visits`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function fetchVisitorVisits(visitorId: string): Promise<VisitorVisit[]> {
  const params = new URLSearchParams({ visitorId });
  const resp = await fetch(`${API_URL}/api/visits?${params.toString()}`, {
    credentials: "include",
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function createDeliveryRecord(
  payload: DeliveryRecordPayload,
): Promise<DeliveryRecord> {
  const resp = await fetch(`${API_URL}/api/deliveries`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function fetchDeliveryRecords(
  deliveryPersonId: string,
): Promise<DeliveryRecord[]> {
  const params = new URLSearchParams({ deliveryPersonId });
  const resp = await fetch(`${API_URL}/api/deliveries?${params.toString()}`, {
    credentials: "include",
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function fetchUnitRegistrySummary(
  block: string,
  apartment: string,
): Promise<UnitRegistrySummary> {
  const params = new URLSearchParams({ block, apartment });
  const resp = await fetch(`${API_URL}/api/registry/unit-summary?${params.toString()}`, {
    credentials: "include",
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

