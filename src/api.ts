const API_URL = import.meta.env.VITE_API_URL ?? "";

export type User = {
  name: string;
  email: string;
  tenantName?: string;
  role?: string;
  canManageSettings?: boolean;
  canManageProtectedRegistry?: boolean;
  canOperateCondominium?: boolean;
  canViewPoolCards?: boolean;
  canManagePoolCards?: boolean;
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
  residentAcknowledgedAt?: string | null;
  handedOverAt?: string | null;
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
  | "VEHICLE"
  | "SERVICE_PROVIDER";

export type RegistryEntry = {
  id: string;
  personId?: string | null;
  occupancyId?: string | null;
  entryType: RegistryEntryType;
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  unitOwner?: boolean | null;
  birthDate?: string | null;
  profession?: string | null;
  pne?: boolean | null;
  block?: string | null;
  apartment?: string | null;
  company?: string | null;
  serviceCompanyId?: string | null;
  serviceCompanyName?: string | null;
  ownerName?: string | null;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  identifier?: string | null;
  species?: string | null;
  breed?: string | null;
  petSize?: string | null;
  parkingSpace?: string | null;
  parkingSpaceRented?: boolean | null;
  parkingSpaceRentalNotes?: string | null;
  notes?: string | null;
  residentAccessEnabled?: boolean | null;
  residentUsername?: string | null;
  residentMustChangePassword?: boolean | null;
  residentCredentialEmailEnabled?: boolean | null;
  photoAvailable: boolean;
  photoOwnedByCurrentUser: boolean;
  photoFileName?: string | null;
  documentPhotoAvailable?: boolean;
  documentPhotoOwnedByCurrentUser?: boolean;
  documentPhotoFileName?: string | null;
  poolCardAvailable?: boolean;
  poolCardValid?: boolean;
  poolCardValidUntil?: string | null;
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
  | "serviceCompanyName"
  | "documentPhotoAvailable"
  | "documentPhotoOwnedByCurrentUser"
  | "documentPhotoFileName"
> & {
  residentPassword?: string | null;
};

export type RegistryEntryPage = {
  content: RegistryEntry[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

export async function fetchRegistryEntriesPage(options: {
  type: RegistryEntryType;
  search?: string;
  includeInactive?: boolean;
  ownersOnly?: boolean;
  page?: number;
  size?: number;
  sort?: "name" | "unit" | "owner";
  direction?: "asc" | "desc";
}): Promise<RegistryEntryPage> {
  const params = new URLSearchParams({
    type: options.type,
    page: String(options.page ?? 0),
    size: String(options.size ?? 10),
    includeInactive: String(Boolean(options.includeInactive)),
    ownersOnly: String(Boolean(options.ownersOnly)),
    sort: options.sort ?? "unit",
    direction: options.direction ?? "asc",
  });
  if (options.search?.trim()) params.set("search", options.search.trim());

  const resp = await fetch(`${API_URL}/api/registry/page?${params.toString()}`, {
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
  serviceRecords: ServiceRecord[];
  packIds: PackIdRecentItem[];
  spaceAccesses: SpaceAccess[];
  poolCards: PoolCard[];
  poolCardSettings: PoolCardSettings;
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

export async function fetchUnitVehicles(
  block: string,
  apartment: string,
  occupancyId?: string | null,
): Promise<RegistryEntry[]> {
  const params = new URLSearchParams({ block, apartment });
  if (occupancyId) params.set("occupancyId", occupancyId);
  const resp = await fetch(`${API_URL}/api/registry/unit-vehicles?${params.toString()}`, {
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




export type RegistryDocumentKind = "document";

export async function uploadRegistryDocumentPhoto(id: string, kind: RegistryDocumentKind, file: File): Promise<RegistryEntry> {
  const form = new FormData();
  form.append("file", file);
  const resp = await fetch(`${API_URL}/api/registry/${id}/documents/${kind}`, {
    method: "PUT", credentials: "include", body: form,
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function deleteRegistryDocumentPhoto(id: string, kind: RegistryDocumentKind): Promise<RegistryEntry> {
  const resp = await fetch(`${API_URL}/api/registry/${id}/documents/${kind}`, {
    method: "DELETE", credentials: "include",
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export function registryDocumentPhotoUrl(id: string, kind: RegistryDocumentKind, version?: string | null): string {
  const suffix = version ? `?v=${encodeURIComponent(version)}` : "";
  return `${API_URL}/api/registry/${id}/documents/${kind}${suffix}`;
}

export type ServiceCompany = {
  id: string;
  name: string;
  tradeName?: string | null;
  documentNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  contactName?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  notes?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type ServiceCompanyPayload = Omit<ServiceCompany, "id" | "createdAt" | "updatedAt">;

export async function fetchServiceCompanies(): Promise<ServiceCompany[]> {
  const resp = await fetch(`${API_URL}/api/service-companies`, { credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function createServiceCompany(payload: ServiceCompanyPayload): Promise<ServiceCompany> {
  const resp = await fetch(`${API_URL}/api/service-companies`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function updateServiceCompany(id: string, payload: ServiceCompanyPayload): Promise<ServiceCompany> {
  const resp = await fetch(`${API_URL}/api/service-companies/${id}`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function deleteServiceCompany(id: string): Promise<void> {
  const resp = await fetch(`${API_URL}/api/service-companies/${id}`, { method: "DELETE", credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
}

export type ServiceRecord = {
  id: string;
  serviceProviderRegistryEntryId: string;
  serviceProviderName?: string | null;
  serviceCompanyId?: string | null;
  serviceCompanyName?: string | null;
  serviceScope: "UNIT" | "CONDOMINIUM";
  block?: string | null;
  apartment?: string | null;
  performedAt: string;
  serviceDescription: string;
  notes?: string | null;
  createdBy?: string | null;
};

export type ServiceRecordPayload = {
  serviceProviderRegistryEntryId: string;
  serviceScope: "UNIT" | "CONDOMINIUM";
  block?: string | null;
  apartment?: string | null;
  performedAt?: string | null;
  serviceDescription: string;
  notes?: string | null;
};

export async function createServiceRecord(payload: ServiceRecordPayload): Promise<ServiceRecord> {
  const resp = await fetch(`${API_URL}/api/service-records`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function fetchServiceRecords(providerId?: string, scope?: "UNIT" | "CONDOMINIUM"): Promise<ServiceRecord[]> {
  const params = new URLSearchParams();
  if (providerId) params.set("providerId", providerId);
  if (scope) params.set("scope", scope);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const resp = await fetch(`${API_URL}/api/service-records${suffix}`, { credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}


export type SpaceType = "PLAYROOM" | "GAMES_ROOM" | "GYM" | "SAUNA";
export type SpaceAccessStatus =
  | "REQUESTED_PICKUP"
  | "IN_USE"
  | "REQUESTED_RETURN"
  | "COMPLETED"
  | "CANCELLED";

export type SpaceAccess = {
  id: string;
  residentRegistryEntryId: string;
  residentName: string;
  occupancyId?: string | null;
  block: string;
  apartment: string;
  spaceType: SpaceType;
  status: SpaceAccessStatus;
  requestedAt: string;
  releasedAt?: string | null;
  returnRequestedAt?: string | null;
  completedAt?: string | null;
  releasedBy?: string | null;
  completedBy?: string | null;
  notes?: string | null;
};

export async function fetchPendingSpaceAccess(): Promise<SpaceAccess[]> {
  const resp = await fetch(`${API_URL}/api/space-access/pending`, { credentials: "include", cache: "no-store" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function fetchSpaceAccess(options: {
  spaceType?: SpaceType | "";
  from?: string;
  to?: string;
} = {}): Promise<SpaceAccess[]> {
  const params = new URLSearchParams();
  if (options.spaceType) params.set("spaceType", options.spaceType);
  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const resp = await fetch(`${API_URL}/api/space-access${suffix}`, { credentials: "include", cache: "no-store" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function releaseSpaceAccess(id: string): Promise<SpaceAccess> {
  const resp = await fetch(`${API_URL}/api/space-access/${id}/release`, {
    method: "POST", credentials: "include",
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function completeSpaceAccess(id: string): Promise<SpaceAccess> {
  const resp = await fetch(`${API_URL}/api/space-access/${id}/complete`, {
    method: "POST", credentials: "include",
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export type AppUserRole = "ADMIN" | "SECRETARY" | "PORTER" | "POOL_ATTENDANT";
export type AppUserManagement = {
  id: string;
  tenantId: string;
  personId?: string | null;
  email: string;
  fullName?: string | null;
  provider?: "GOOGLE" | string;
  providerSubject?: string | null;
  role: AppUserRole;
  enabled: boolean;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AppUserManagementPayload = {
  email: string;
  fullName?: string | null;
  provider?: "GOOGLE";
  providerSubject?: string | null;
  role: AppUserRole;
  enabled?: boolean;
};

export async function fetchAppUsers(): Promise<AppUserManagement[]> {
  const resp = await fetch(`${API_URL}/api/app-users`, { credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function createAppUser(payload: AppUserManagementPayload): Promise<AppUserManagement> {
  const resp = await fetch(`${API_URL}/api/app-users`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function updateAppUser(id: string, payload: Partial<AppUserManagementPayload>): Promise<AppUserManagement> {
  const resp = await fetch(`${API_URL}/api/app-users/${id}`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function deleteAppUser(id: string): Promise<void> {
  const resp = await fetch(`${API_URL}/api/app-users/${id}`, { method: "DELETE", credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
}

export type PublicTenant = {
  name: string;
  slug: string;
};

export async function fetchPublicTenants(): Promise<PublicTenant[]> {
  const resp = await fetch(`${API_URL}/public/tenants`, { credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export type ResidentSession = {
  occupancyId: string;
  tenantName: string;
  tenantSlug: string;
  block: string;
  apartment: string;
  username: string;
  mustChangePassword: boolean;
};

export type ResidentLoginPayload = {
  tenantSlug: string;
  username: string;
  password: string;
  block: string;
  apartment: string;
};

export type ResidentPortalData = {
  session: ResidentSession;
  resident: RegistryEntry;
  residents: RegistryEntry[];
  bicycles: RegistryEntry[];
  vehicles: RegistryEntry[];
  pets: RegistryEntry[];
  visits: VisitorVisit[];
  deliveries: DeliveryRecord[];
  serviceRecords: ServiceRecord[];
  packIds: PackIdRecentItem[];
  spaceAccesses: SpaceAccess[];
  poolCards: PoolCard[];
  poolCardSettings: PoolCardSettings;
};

export async function residentLogin(payload: ResidentLoginPayload): Promise<ResidentSession> {
  const resp = await fetch(`${API_URL}/api/resident-auth/login`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function fetchResidentSession(): Promise<ResidentSession | null> {
  const resp = await fetch(`${API_URL}/api/resident-auth/me`, { credentials: "include" });
  if (resp.status === 401) return null;
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function updateResidentCredentials(payload: { username?: string; newPassword?: string }): Promise<ResidentSession> {
  const resp = await fetch(`${API_URL}/api/resident-auth/credentials`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function residentLogout(): Promise<void> {
  const resp = await fetch(`${API_URL}/api/resident-auth/logout`, { method: "POST", credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
}

export async function fetchResidentPortal(): Promise<ResidentPortalData> {
  const resp = await fetch(`${API_URL}/api/resident/portal`, { credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function fetchResidentSpaces(): Promise<SpaceAccess[]> {
  const resp = await fetch(`${API_URL}/api/resident/spaces`, { credentials: "include", cache: "no-store" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function updateResidentProfile(id: string, payload: { phone?: string; email?: string; profession?: string }): Promise<RegistryEntry> {
  const resp = await fetch(`${API_URL}/api/resident/profile/${id}`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function uploadResidentProfilePhoto(id: string, file: File): Promise<RegistryEntry> {
  const body = new FormData();
  body.append("file", file);
  const resp = await fetch(`${API_URL}/api/resident/profile/${id}/photo`, {
    method: "PUT", credentials: "include", body,
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export type SpaceKeyAvailability = {
  available: boolean;
  currentRequestId?: string | null;
  holderResidentName?: string | null;
  holderBlock?: string | null;
  holderApartment?: string | null;
};

export async function fetchResidentSpaceAvailability(spaceType: SpaceType): Promise<SpaceKeyAvailability> {
  const resp = await fetch(`${API_URL}/api/resident/spaces/${spaceType}/availability`, { credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function requestResidentSpace(spaceType: SpaceType, assumeResponsibility = false): Promise<SpaceAccess> {
  const params = new URLSearchParams();
  if (assumeResponsibility) params.set("assumeResponsibility", "true");
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const resp = await fetch(`${API_URL}/api/resident/spaces/${spaceType}/request${suffix}`, {
    method: "POST", credentials: "include",
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export function residentRegistryPhotoUrl(id: string, version?: string | null): string {
  const suffix = version ? `?v=${encodeURIComponent(version)}` : "";
  return `${API_URL}/api/resident/photos/${id}${suffix}`;
}

async function downloadExcel(resp: Response, fallbackName: string): Promise<void> {
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  const blob = await resp.blob();
  const disposition = resp.headers.get("content-disposition") ?? "";
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  let fileName = fallbackName;
  try {
    fileName = utf8Name ? decodeURIComponent(utf8Name) : (plainName || fallbackName);
  } catch {
    fileName = plainName || fallbackName;
  }
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportRegistryExcel(type: RegistryEntryType): Promise<void> {
  const resp = await fetch(`${API_URL}/api/exports/registry?type=${encodeURIComponent(type)}`, { credentials: "include" });
  await downloadExcel(resp, `${type.toLowerCase()}.xlsx`);
}

export async function exportServiceCompaniesExcel(): Promise<void> {
  const resp = await fetch(`${API_URL}/api/exports/service-companies`, { credentials: "include" });
  await downloadExcel(resp, "empresas.xlsx");
}

export async function exportSpaceAccessExcel(): Promise<void> {
  const resp = await fetch(`${API_URL}/api/exports/space-access`, { credentials: "include" });
  await downloadExcel(resp, "area-lazer.xlsx");
}

export async function exportPoolCardsExcel(): Promise<void> {
  const resp = await fetch(`${API_URL}/api/exports/pool-cards`, { credentials: "include" });
  await downloadExcel(resp, "carteirinhas-piscina.xlsx");
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
  emailNotificationsEnabled: boolean;
  residentCredentialEmailsEnabled: boolean;
  packIdPrintTwoLabels: boolean;
  logoAvailable: boolean;
  logoFileName?: string | null;
  poolCardTitle: string;
  poolCardSubtitle: string;
  poolOpeningHours?: string | null;
  poolShowOpeningHours: boolean;
  poolClosedDaysMessage?: string | null;
  poolShowClosedDays: boolean;
  poolValidityMonths: number;
  poolValidityMessage?: string | null;
  poolShowValidityMessage: boolean;
  poolGeneralInfo?: string | null;
  poolShowGeneralInfo: boolean;
  poolAdditionalInfo?: string | null;
  poolCardColor: string;
  googleAccount: GoogleAccountSettings;
};

export type CondominiumSettingsPayload = Omit<
  CondominiumSettings,
  "tenantId" | "tenantSlug" | "condominiumId" | "googleAccount" | "logoAvailable" | "logoFileName"
>;

export async function fetchCondominiumSettings(): Promise<CondominiumSettings> {
  const resp = await fetch(`${API_URL}/api/settings/condominium`, {
    credentials: "include",
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export type PackIdLabelPrintSettings = {
  copies: 1 | 2;
};

export async function fetchPackIdLabelPrintSettings(): Promise<PackIdLabelPrintSettings> {
  const resp = await fetch(`${API_URL}/api/settings/label-print`, {
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

export async function testOfficialGoogleGmail(): Promise<CondominiumSettings> {
  const resp = await fetch(`${API_URL}/api/settings/google-account/test-gmail`, {
    method: "POST",
    credentials: "include",
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

export type ResidentialUnit = {
  id: string;
  tenantId: string;
  condominiumId: string;
  code: string;
  name: string;
  block: string;
  apartment: string;
  active: boolean;
};

export type ResidentialUnitPayload = {
  tenantId?: string | null;
  condominiumId?: string | null;
  code?: string | null;
  name?: string | null;
  block: string;
  apartment: string;
  active?: boolean;
};

export async function fetchResidentialUnits(): Promise<ResidentialUnit[]> {
  const resp = await fetch(`${API_URL}/api/residential-units`, { credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));

  // Existem unidades antigas no banco, anteriores ao cadastro mestre de
  // bloco/apartamento, que podem chegar com block/apartment nulos. O restante
  // da interface trabalha apenas com unidades que possuem os dois campos.
  // Normalizar aqui evita erro de renderização (ex.: localeCompare em null)
  // e impede que um registro legado derrube toda a tela em produção.
  const items = (await resp.json()) as Array<
    Omit<ResidentialUnit, "block" | "apartment"> & {
      block?: string | null;
      apartment?: string | null;
    }
  >;

  return items
    .map((unit) => ({
      ...unit,
      block: (unit.block ?? "").trim(),
      apartment: (unit.apartment ?? "").trim(),
    }))
    .filter((unit): unit is ResidentialUnit => Boolean(unit.block && unit.apartment));
}

export async function createResidentialUnit(payload: ResidentialUnitPayload): Promise<ResidentialUnit> {
  const resp = await fetch(`${API_URL}/api/residential-units`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function updateResidentialUnit(id: string, payload: ResidentialUnitPayload): Promise<ResidentialUnit> {
  const resp = await fetch(`${API_URL}/api/residential-units/${id}`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function deleteResidentialUnit(id: string): Promise<void> {
  const resp = await fetch(`${API_URL}/api/residential-units/${id}`, { method: "DELETE", credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
}

export type PoolCardSettings = {
  condominiumName: string;
  logoAvailable: boolean;
  title: string;
  subtitle: string;
  openingHours?: string | null;
  showOpeningHours: boolean;
  closedDaysMessage?: string | null;
  showClosedDays: boolean;
  validityMonths: number;
  validityMessage?: string | null;
  showValidityMessage: boolean;
  generalInfo?: string | null;
  showGeneralInfo: boolean;
  additionalInfo?: string | null;
  color: string;
};

export type PoolCard = {
  id: string;
  residentRegistryEntryId: string;
  residentName: string;
  block?: string | null;
  apartment?: string | null;
  issueDate: string;
  validityMonths: number;
  validUntil: string;
  underTen: boolean;
  valid: boolean;
  medicalReportAvailable: boolean;
  medicalReportFileName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type PoolCardPayload = {
  residentRegistryEntryId: string;
  issueDate: string;
  underTen: boolean;
};

export type PoolCardPage = {
  content: PoolCard[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

export type PoolCardResidentOption = {
  id: string;
  name: string;
  block?: string | null;
  apartment?: string | null;
};

export async function fetchPoolCards(options?: {
  search?: string;
  page?: number;
  size?: number;
}): Promise<PoolCardPage> {
  const params = new URLSearchParams({
    page: String(options?.page ?? 0),
    size: String(options?.size ?? 10),
  });
  if (options?.search?.trim()) params.set("search", options.search.trim());
  const resp = await fetch(`${API_URL}/api/pool-cards/page?${params.toString()}`, { credentials: "include", cache: "no-store" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function fetchPoolCardResidentOptions(search?: string, limit = 20): Promise<PoolCardResidentOption[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (search?.trim()) params.set("search", search.trim());
  const resp = await fetch(`${API_URL}/api/pool-cards/residents?${params.toString()}`, { credentials: "include", cache: "no-store" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function fetchPoolCardSettings(): Promise<PoolCardSettings> {
  const resp = await fetch(`${API_URL}/api/pool-cards/settings`, { credentials: "include", cache: "no-store" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function createPoolCard(payload: PoolCardPayload): Promise<PoolCard> {
  const resp = await fetch(`${API_URL}/api/pool-cards`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function updatePoolCard(id: string, payload: PoolCardPayload): Promise<PoolCard> {
  const resp = await fetch(`${API_URL}/api/pool-cards/${id}`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export async function deletePoolCard(id: string): Promise<void> {
  const resp = await fetch(`${API_URL}/api/pool-cards/${id}`, { method: "DELETE", credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
}

export async function uploadPoolCardMedicalReport(id: string, file: File): Promise<PoolCard> {
  const body = new FormData();
  body.append("file", file);
  const resp = await fetch(`${API_URL}/api/pool-cards/${id}/medical-report`, { method: "PUT", credentials: "include", body });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export function poolCardMedicalReportUrl(id: string): string { return `${API_URL}/api/pool-cards/${id}/medical-report`; }
export function poolCardMedicalReportDriveUrl(id: string): string { return `${API_URL}/api/pool-cards/${id}/medical-report/drive`; }
export function poolCardPdfUrl(id: string): string { return `${API_URL}/api/pool-cards/${id}/pdf`; }
export function residentPoolCardPdfUrl(id: string): string { return `${API_URL}/api/resident/pool-cards/${id}/pdf`; }
export function condominiumLogoUrl(version?: string | number): string {
  return `${API_URL}/api/branding/logo${version !== undefined ? `?v=${encodeURIComponent(String(version))}` : ""}`;
}
export function residentCondominiumLogoUrl(version?: string | number): string {
  return `${API_URL}/api/resident/branding/logo${version !== undefined ? `?v=${encodeURIComponent(String(version))}` : ""}`;
}

export async function uploadCondominiumLogo(file: File): Promise<CondominiumSettings> {
  const body = new FormData(); body.append("file", file);
  const resp = await fetch(`${API_URL}/api/branding/logo`, { method: "PUT", credentials: "include", body });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}
export async function deleteCondominiumLogo(): Promise<CondominiumSettings> {
  const resp = await fetch(`${API_URL}/api/branding/logo`, { method: "DELETE", credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}

export type PackIdPickupRequest = {
  id: string;
  block?: string | null;
  apartment?: string | null;
  residentFullName?: string | null;
  packageCode?: string | null;
  arrivedAt: string;
  requestedAt: string;
};

export async function fetchPendingPackagePickups(): Promise<PackIdPickupRequest[]> {
  const resp = await fetch(`${API_URL}/api/pack-ids/pickup-requests`, { credentials: "include", cache: "no-store" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}
export async function handOverPackage(id: string): Promise<PackIdRecentItem> {
  const resp = await fetch(`${API_URL}/api/pack-ids/${id}/hand-over`, { method: "POST", credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}
export async function requestResidentPackagePickup(id: string): Promise<PackIdRecentItem> {
  const resp = await fetch(`${API_URL}/api/resident/packages/${id}/request-pickup`, { method: "POST", credentials: "include" });
  if (!resp.ok) throw new Error(await readErrorMessage(resp));
  return resp.json();
}
