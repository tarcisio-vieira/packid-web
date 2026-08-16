const API_URL = import.meta.env.VITE_API_URL ?? "";

export type User = {
  name: string;
  email: string;
  role?: string;
};

export function userFriendlyError(error: unknown, fallback: string): string {
  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão e confirme se a API está em execução.";
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return fallback;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const resp = await fetch(`${API_URL}/api/app-users/me`, {
    credentials: "include",
  });

  if (resp.status === 401) {
    return null;
  }

  if (!resp.ok) {
    throw new Error(await readErrorMessage(resp));
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

  if (!resp.ok) {
    throw new Error(await readErrorMessage(resp));
  }
}

export type PackIdLabelCreateRequest = {
  packageCode: string;
  apartment: string;
  block: string;
  bookPage: string;
};

async function readErrorMessage(resp: Response): Promise<string> {
  let serverMessage = "";

  try {
    const contentType = resp.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await resp.json();
      serverMessage = String(data?.message || data?.error || data?.detail || "").trim();
    } else {
      serverMessage = (await resp.text()).trim();
    }
  } catch {
    // Usa a mensagem amigável baseada no status HTTP abaixo.
  }

  if (serverMessage && !/^HTTP\s+\d+$/i.test(serverMessage)) {
    return serverMessage;
  }

  switch (resp.status) {
    case 400:
      return "Os dados informados não puderam ser processados. Confira os campos e tente novamente.";
    case 401:
      return "Sua sessão expirou ou você não está autenticado. Entre novamente no sistema.";
    case 403:
      return "Você não tem permissão para realizar esta ação.";
    case 404:
      return "O registro solicitado não foi encontrado. Atualize a tela e tente novamente.";
    case 409:
      return "A ação não pôde ser concluída porque existe um conflito com outro registro.";
    case 413:
      return "O arquivo enviado é maior que o tamanho permitido.";
    case 500:
      return "Ocorreu um erro interno no servidor. Tente novamente; se persistir, informe o administrador.";
    case 502:
    case 503:
    case 504:
      return "O serviço está temporariamente indisponível. Aguarde alguns instantes e tente novamente.";
    default:
      return `Não foi possível concluir a operação (erro ${resp.status}).`;
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

  if (!resp.ok) throw new Error(await readErrorMessage(resp));
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
  personId?: string | null;
  occupancyId?: string | null;
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
  | "personId"
  | "occupancyId"
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

export type ApartmentOccupancy = {
  id: string;
  block: string;
  apartment: string;
  startDate: string;
  endDate?: string | null;
  status: "ACTIVE" | "SCHEDULED" | "ENDED";
  notes?: string | null;
};

export type UnitRegistrySummary = {
  block: string;
  apartment: string;
  selectedOccupancy?: ApartmentOccupancy | null;
  occupancies: ApartmentOccupancy[];
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
  occupancyId?: string | null,
): Promise<UnitRegistrySummary> {
  const params = new URLSearchParams({ block, apartment });
  if (occupancyId) params.set("occupancyId", occupancyId);
  const resp = await fetch(`${API_URL}/api/registry/unit-summary?${params.toString()}`, {
    credentials: "include",
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function startApartmentOccupancy(payload: {
  block: string;
  apartment: string;
  startDate?: string | null;
  notes?: string | null;
}): Promise<ApartmentOccupancy> {
  const resp = await fetch(`${API_URL}/api/occupancies/start`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function endApartmentOccupancy(payload: {
  block: string;
  apartment: string;
  endDate?: string | null;
}): Promise<ApartmentOccupancy> {
  const resp = await fetch(`${API_URL}/api/occupancies/end`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}



export type GoogleAccountSettings = {
  connected: boolean;
  email?: string | null;
  driveEnabled: boolean;
  gmailEnabled: boolean;
  connectedAt?: string | null;
  lastRefreshAt?: string | null;
  lastError?: string | null;
};

export type CondominiumSettings = {
  tenantId: string;
  tenantSlug: string;
  condominiumId?: string | null;
  name: string;
  documentNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  email?: string | null;
  managerName?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  googleAccount: GoogleAccountSettings;
};

export type CondominiumSettingsPayload = Omit<
  CondominiumSettings,
  "tenantId" | "tenantSlug" | "condominiumId" | "googleAccount"
>;

export async function fetchCondominiumSettings(): Promise<CondominiumSettings> {
  const resp = await fetch(`${API_URL}/api/settings/condominium`, {
    credentials: "include",
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function updateCondominiumSettings(
  payload: CondominiumSettingsPayload,
): Promise<CondominiumSettings> {
  const resp = await fetch(`${API_URL}/api/settings/condominium`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function disconnectOfficialGoogleAccount(): Promise<CondominiumSettings> {
  const resp = await fetch(`${API_URL}/api/settings/google-account`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export function getGoogleAccountAuthorizeUrl(): string {
  return `${API_URL}/api/settings/google-account/authorize`;
}
