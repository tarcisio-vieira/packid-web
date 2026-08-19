import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import PedalBikeOutlinedIcon from "@mui/icons-material/PedalBikeOutlined";
import PetsOutlinedIcon from "@mui/icons-material/PetsOutlined";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import DeckOutlinedIcon from "@mui/icons-material/DeckOutlined";
import PoolOutlinedIcon from "@mui/icons-material/PoolOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import {
  createDeliveryRecord,
  createRegistryEntry,
  createServiceCompany,
  createServiceRecord,
  createVisitorVisit,
  deleteRegistryEntry,
  deleteRegistryEntryPhoto,
  fetchDeliveryRecords,
  fetchRegistryEntriesPage,
  fetchServiceCompanies,
  fetchServiceRecords,
  fetchUnitRegistrySummary,
  fetchResidentialUnits,
  fetchVisitorVisits,
  startApartmentOccupancy,
  endApartmentOccupancy,
  exportRegistryExcel,
  exportServiceCompaniesExcel,
  registryEntryPhotoUrl,
  registryDocumentPhotoUrl,
  updateRegistryEntry,
  uploadRegistryEntryPhoto,
  uploadRegistryDocumentPhoto,
  deleteRegistryDocumentPhoto,
  userFriendlyError,
} from "../api";
import ServiceCompanyPanel from "./ServiceCompanyPanel";
import SpacesScreen from "./SpacesScreen";
import PoolCardsScreen from "./PoolCardsScreen";
import { confirmDialog } from "../utils/confirmDialog";
import type {
  ApartmentOccupancy,
  DeliveryRecord,
  PackIdRecentItem,
  RegistryEntry,
  RegistryEntryPayload,
  RegistryEntryType,
  ServiceCompany,
  ServiceCompanyPayload,
  ServiceRecord,
  UnitRegistrySummary,
  VisitorVisit,
  SpaceAccess,
  User,
  ResidentialUnit,
} from "../api";

const TYPES: Array<{ type: RegistryEntryType; label: string }> = [
  { type: "RESIDENT", label: "Condôminos" },
  { type: "SERVICE_PROVIDER", label: "Prestadores de serviço" },
  { type: "DELIVERY_PERSON", label: "Entregadores" },
  { type: "VISITOR", label: "Visitantes" },
  { type: "BICYCLE", label: "Bicicletas" },
  { type: "PET", label: "Pets" },
  { type: "VEHICLE", label: "Veículos" },
];

type RegistryNavigationValue = RegistryEntryType | "SERVICE_COMPANY" | "LEISURE_AREA" | "POOL_CARDS";

const NAVIGATION_ITEMS: Array<{ value: RegistryNavigationValue; label: string; color: string }> = [
  { value: "RESIDENT", label: "Condôminos", color: "#1976d2" },
  { value: "SERVICE_PROVIDER", label: "Prestadores de serviço", color: "#ed6c02" },
  { value: "DELIVERY_PERSON", label: "Entregadores", color: "#2e7d32" },
  { value: "VISITOR", label: "Visitantes", color: "#7b1fa2" },
  { value: "SERVICE_COMPANY", label: "Empresas", color: "#795548" },
  { value: "BICYCLE", label: "Bicicletas", color: "#0288d1" },
  { value: "PET", label: "Pets", color: "#d81b60" },
  { value: "VEHICLE", label: "Veículos", color: "#3949ab" },
  { value: "LEISURE_AREA", label: "Área de lazer", color: "#00897b" },
  { value: "POOL_CARDS", label: "Carteirinhas de piscina", color: "#00796b" },
];

const REGISTRY_SECTION_DESCRIPTIONS: Record<RegistryEntryType, string> = {
  RESIDENT: "Cadastre condôminos, identifique proprietários e consulte os moradores vinculados a cada unidade.",
  SERVICE_PROVIDER: "Cadastre prestadores de serviço, vincule-os às empresas e registre os serviços realizados no condomínio.",
  DELIVERY_PERSON: "Cadastre entregadores e transportadoras para agilizar o registro de entregas e autorizações de entrada.",
  VISITOR: "Cadastre visitantes e registre as visitas realizadas às unidades do condomínio.",
  BICYCLE: "Cadastre as bicicletas dos moradores e mantenha cada uma vinculada à sua unidade.",
  PET: "Cadastre os pets dos moradores e mantenha as informações vinculadas às respectivas unidades.",
  VEHICLE: "Cadastre os veículos dos moradores, placas e informações de vagas vinculadas às unidades.",
};

function navigationIcon(value: RegistryNavigationValue) {
  switch (value) {
    case "RESIDENT":
      return <PeopleAltOutlinedIcon />;
    case "SERVICE_PROVIDER":
      return <EngineeringOutlinedIcon />;
    case "DELIVERY_PERSON":
      return <LocalShippingOutlinedIcon />;
    case "VISITOR":
      return <MeetingRoomOutlinedIcon />;
    case "SERVICE_COMPANY":
      return <BusinessOutlinedIcon />;
    case "BICYCLE":
      return <PedalBikeOutlinedIcon />;
    case "PET":
      return <PetsOutlinedIcon />;
    case "VEHICLE":
      return <DirectionsCarOutlinedIcon />;
    case "LEISURE_AREA":
      return <DeckOutlinedIcon />;
    case "POOL_CARDS":
      return <PoolOutlinedIcon />;
  }
}

const emptyPayload = (entryType: RegistryEntryType): RegistryEntryPayload => ({
  entryType,
  name: "",
  document: "",
  phone: "",
  email: "",
  unitOwner: false,
  birthDate: "",
  profession: "",
  pne: false,
  block: "",
  apartment: "",
  company: "",
  serviceCompanyId: null,
  ownerName: "",
  brand: "",
  model: "",
  color: "",
  identifier: "",
  species: "",
  breed: "",
  petSize: "",
  parkingSpace: "",
  parkingSpaceRented: false,
  parkingSpaceRentalNotes: "",
  notes: "",
  residentAccessEnabled: false,
  residentUsername: "",
  residentPassword: "",
  residentCredentialEmailEnabled: false,
  active: true,
});

const emptyServiceCompanyPayload = (name = ""): ServiceCompanyPayload => ({
  name,
  tradeName: "",
  documentNumber: "",
  phone: "",
  email: "",
  contactName: "",
  addressLine: "",
  city: "",
  state: "",
  zipCode: "",
  notes: "",
  active: true,
});

function defaultUnitUsername(block?: string | null, apartment?: string | null): string {
  return `${block ?? ""}${apartment ?? ""}`.replace(/[^A-Za-z0-9._-]/g, "").toLowerCase();
}

function generateTemporaryPassword(length = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, value => alphabet[value % alphabet.length]).join("");
}

type AccessForm = {
  block: string;
  apartment: string;
  dateTime: string;
  notes: string;
  authorizedToEnter: boolean;
};

type ServiceForm = {
  scope: "UNIT" | "CONDOMINIUM";
  block: string;
  apartment: string;
  dateTime: string;
  serviceDescription: string;
  notes: string;
};

function emptyServiceForm(): ServiceForm {
  return { scope: "UNIT", block: "", apartment: "", dateTime: localDateTimeNow(), serviceDescription: "", notes: "" };
}

function localDateTimeNow(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date()).replace(" ", "T");
}

function localDateToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function occupancyStatusLabel(status: ApartmentOccupancy["status"], compact = false): string {
  if (status === "ACTIVE") return compact ? "Atual" : "Ocupação atual";
  if (status === "SCHEDULED") return compact ? "Agendada" : "Ocupação agendada";
  return compact ? "Encerrada" : "Ocupação encerrada";
}

function occupancyStatusColor(status: ApartmentOccupancy["status"]): "success" | "info" | "default" {
  if (status === "ACTIVE") return "success";
  if (status === "SCHEDULED") return "info";
  return "default";
}

function emptyAccessForm(): AccessForm {
  return {
    block: "",
    apartment: "",
    dateTime: localDateTimeNow(),
    notes: "",
    authorizedToEnter: true,
  };
}

function formatUnit(block?: string | null, apartment?: string | null): string {
  const parts = [];
  if (block) parts.push(`Bloco ${block}`);
  if (apartment) parts.push(`Apto ${apartment}`);
  return parts.join(" ") || "-";
}

function unitLabel(entry: RegistryEntry): string {
  return formatUnit(entry.block, entry.apartment);
}

type RegistrySortField = "unit" | "name" | "owner";
type RegistrySortDirection = "asc" | "desc";

function defaultRegistrySortField(entryType: RegistryEntryType): RegistrySortField {
  return entryType === "DELIVERY_PERSON" || entryType === "SERVICE_PROVIDER" ? "name" : "unit";
}

function identifierLabel(entry: RegistryEntry): string {
  if (entry.entryType === "VEHICLE" || entry.entryType === "BICYCLE") {
    return entry.identifier || "-";
  }
  if (entry.entryType === "PET") return entry.species || "-";
  return entry.document || "-";
}

function detailsLabel(entry: RegistryEntry): string {
  switch (entry.entryType) {
    case "DELIVERY_PERSON":
    case "SERVICE_PROVIDER":
      return entry.email || "-";
    case "VISITOR":
      return entry.phone || entry.document || "-";
    case "BICYCLE":
      return [entry.brand, entry.model, entry.color].filter(Boolean).join(" • ") || "-";
    case "VEHICLE":
      return [
        entry.brand,
        entry.model,
        entry.color,
        entry.parkingSpaceRented ? "Vaga alugada/cedida" : null,
        entry.parkingSpaceRentalNotes,
      ].filter(Boolean).join(" • ") || "-";
    case "PET":
      return [entry.ownerName, entry.petSize ? `Porte ${entry.petSize}` : null, entry.breed, entry.color].filter(Boolean).join(" • ") || "-";
    case "RESIDENT":
      return [
        entry.unitOwner ? "Proprietário da unidade" : "Morador",
        entry.birthDate ? `Nasc. ${formatDateOnly(entry.birthDate)}` : null,
        entry.profession,
        entry.pne ? "PNE" : null,
        entry.email,
      ].filter(Boolean).join(" • ") || "-";
    default:
      return entry.email || "-";
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatDateOnly(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function FieldCard({ label, value }: Readonly<{ label: string; value?: string | null }>) {
  return (
    <Box>
      <Typography variant="caption" sx={{ opacity: 0.65 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
        {value || "-"}
      </Typography>
    </Box>
  );
}

function RegistryGroup({
  title,
  rows,
  icon,
  iconColor,
}: Readonly<{ title: string; rows: RegistryEntry[]; icon: ReactNode; iconColor: string }>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Box sx={{ color: iconColor, display: "flex", alignItems: "center" }}>{icon}</Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {title} ({rows.length})
          </Typography>
        </Stack>
        {rows.length === 0 ? (
          <Typography variant="body2" sx={{ opacity: 0.65 }}>
            Nenhum registro.
          </Typography>
        ) : (
          <Stack spacing={1} divider={<Divider flexItem />}>
            {rows.map((row) => (
              <Stack key={row.id} direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  src={
                    row.photoAvailable && row.photoOwnedByCurrentUser
                      ? registryEntryPhotoUrl(row.id, row.updatedAt ?? row.createdAt)
                      : undefined
                  }
                  sx={{ width: 36, height: 36 }}
                >
                  {row.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {row.name}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    {[identifierLabel(row), detailsLabel(row)].filter((v) => v !== "-").join(" • ") || "Sem detalhes"}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function PaginationFooter({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: Readonly<{
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}>) {
  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      onPageChange={(_, nextPage) => onPageChange(nextPage)}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={(event) => onRowsPerPageChange(Number(event.target.value))}
      rowsPerPageOptions={[5, 10, 50]}
      labelRowsPerPage="Linhas por página:"
      labelDisplayedRows={({ from, to, count: total }) => `${from}-${to} de ${total}`}
    />
  );
}

function VisitHistory({ rows }: Readonly<{ rows: VisitorVisit[] }>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => setPage(0), [rows]);
  const pagedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <MeetingRoomOutlinedIcon sx={{ color: "#7b1fa2" }} />
          <Typography variant="subtitle1" fontWeight={700}>Visitas ({rows.length})</Typography>
        </Stack>
        <TableContainer sx={{ maxHeight: 360 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Data / hora</TableCell>
                <TableCell>Visitante</TableCell>
                <TableCell>Documento</TableCell>
                <TableCell>Unidade</TableCell>
                <TableCell>Observação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">Nenhuma visita registrada.</TableCell>
                </TableRow>
              )}
              {pagedRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDateTime(row.visitedAt)}</TableCell>
                  <TableCell>{row.visitorName || "-"}</TableCell>
                  <TableCell>{row.visitorDocument || "-"}</TableCell>
                  <TableCell>{formatUnit(row.block, row.apartment)}</TableCell>
                  <TableCell>{row.notes || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {rows.length > 0 && (
          <PaginationFooter
            count={rows.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(0); }}
          />
        )}
      </CardContent>
    </Card>
  );
}

function PackIdHistory({ rows }: Readonly<{ rows: PackIdRecentItem[] }>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => setPage(0), [rows]);
  const pagedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Inventory2OutlinedIcon sx={{ color: "#00897b" }} />
          <Typography variant="subtitle1" fontWeight={700}>Encomendas ({rows.length})</Typography>
        </Stack>
        <TableContainer sx={{ maxHeight: 390 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Data / hora</TableCell>
                <TableCell>Página</TableCell>
                <TableCell>Código da encomenda</TableCell>
                <TableCell>Registrado por</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">Nenhuma encomenda registrada para esta unidade.</TableCell>
                </TableRow>
              )}
              {pagedRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDateTime(row.arrivedAt)}</TableCell>
                  <TableCell>{row.bookPage || "-"}</TableCell>
                  <TableCell>{row.labelPackageCode || row.packageCode || "-"}</TableCell>
                  <TableCell>{row.createdBy || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {rows.length > 0 && (
          <PaginationFooter
            count={rows.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(0); }}
          />
        )}
      </CardContent>
    </Card>
  );
}

function DeliveryHistory({ rows }: Readonly<{ rows: DeliveryRecord[] }>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => setPage(0), [rows]);
  const pagedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <LocalShippingOutlinedIcon sx={{ color: "#2e7d32" }} />
          <Typography variant="subtitle1" fontWeight={700}>Entregas ({rows.length})</Typography>
        </Stack>
        <TableContainer sx={{ maxHeight: 360 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Data / hora</TableCell>
                <TableCell>Entregador</TableCell>
                <TableCell>Empresa</TableCell>
                <TableCell>Unidade</TableCell>
                <TableCell>Entrada</TableCell>
                <TableCell>Observação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">Nenhuma entrega registrada.</TableCell>
                </TableRow>
              )}
              {pagedRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDateTime(row.deliveredAt)}</TableCell>
                  <TableCell>{row.deliveryPersonName || "-"}</TableCell>
                  <TableCell>{row.company || "-"}</TableCell>
                  <TableCell>{formatUnit(row.block, row.apartment)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.authorizedToEnter ? "Autorizada" : "Portaria"}
                      variant={row.authorizedToEnter ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell>{row.notes || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {rows.length > 0 && (
          <PaginationFooter
            count={rows.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(0); }}
          />
        )}
      </CardContent>
    </Card>
  );
}


function ServiceHistory({ rows, title = "Serviços realizados" }: Readonly<{ rows: ServiceRecord[]; title?: string }>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  useEffect(() => setPage(0), [rows]);
  const pagedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <EngineeringOutlinedIcon sx={{ color: "#ed6c02" }} />
          <Typography variant="subtitle1" fontWeight={700}>{title} ({rows.length})</Typography>
        </Stack>
        <TableContainer sx={{ maxHeight: 380 }}>
          <Table size="small" stickyHeader>
            <TableHead><TableRow>
              <TableCell>Data / hora</TableCell><TableCell>Prestador</TableCell><TableCell>Empresa</TableCell>
              <TableCell>Unidade</TableCell><TableCell>Serviço</TableCell><TableCell>Observação</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center">Nenhum serviço registrado.</TableCell></TableRow>}
              {pagedRows.map(row => <TableRow key={row.id}>
                <TableCell>{formatDateTime(row.performedAt)}</TableCell>
                <TableCell>{row.serviceProviderName || "-"}</TableCell>
                <TableCell>{row.serviceCompanyName || "-"}</TableCell>
                <TableCell>{row.serviceScope === "CONDOMINIUM" ? "Condomínio" : formatUnit(row.block, row.apartment)}</TableCell>
                <TableCell>{row.serviceDescription || "-"}</TableCell>
                <TableCell>{row.notes || "-"}</TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </TableContainer>
        {rows.length > 0 && <PaginationFooter count={rows.length} page={page} rowsPerPage={rowsPerPage}
          onPageChange={setPage} onRowsPerPageChange={value => { setRowsPerPage(value); setPage(0); }} />}
      </CardContent>
    </Card>
  );
}


function spaceName(type: SpaceAccess["spaceType"]): string {
  if (type === "GYM") return "Academia";
  if (type === "GAMES_ROOM") return "Sala de Jogos";
  if (type === "SAUNA") return "Sauna";
  return "Brinquedoteca";
}

function spaceStatusLabel(status: SpaceAccess["status"]): string {
  if (status === "REQUESTED_PICKUP") return "Aguardando liberação";
  if (status === "IN_USE") return "Chave em uso";
  if (status === "REQUESTED_RETURN") return "Aguardando devolução";
  if (status === "COMPLETED") return "Finalizado";
  return "Cancelado";
}

function SpaceAccessHistory({ rows }: Readonly<{ rows: SpaceAccess[] }>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  useEffect(() => setPage(0), [rows]);
  const pagedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <MeetingRoomOutlinedIcon sx={{ color: "#00897b" }} />
          <Typography variant="subtitle1" fontWeight={700}>Histórico da área de lazer ({rows.length})</Typography>
        </Stack>
        <TableContainer sx={{ maxHeight: 380 }}>
          <Table size="small" stickyHeader>
            <TableHead><TableRow>
              <TableCell>Área</TableCell><TableCell>Solicitado</TableCell>
              <TableCell>Liberado</TableCell><TableCell>Solicitou devolução</TableCell><TableCell>Encerrado</TableCell><TableCell>Status</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center">Nenhuma solicitação de área de lazer nesta ocupação.</TableCell></TableRow>}
              {pagedRows.map((row) => <TableRow key={row.id}>
                <TableCell>{spaceName(row.spaceType)}</TableCell>
                <TableCell>{formatDateTime(row.requestedAt)}</TableCell>
                <TableCell>{row.releasedAt ? formatDateTime(row.releasedAt) : "-"}</TableCell>
                <TableCell>{row.returnRequestedAt ? formatDateTime(row.returnRequestedAt) : "-"}</TableCell>
                <TableCell>{row.completedAt ? formatDateTime(row.completedAt) : "-"}</TableCell>
                <TableCell><Chip size="small" label={spaceStatusLabel(row.status)} /></TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </TableContainer>
        {rows.length > 0 && <PaginationFooter count={rows.length} page={page} rowsPerPage={rowsPerPage}
          onPageChange={setPage} onRowsPerPageChange={value => { setRowsPerPage(value); setPage(0); }} />}
      </CardContent>
    </Card>
  );
}

export default function RegistryScreen({ embedded = false, currentUser, initialNavigation }: Readonly<{ embedded?: boolean; currentUser?: User | null; initialNavigation?: RegistryNavigationValue }>) {
  const initialRegistryType: RegistryEntryType = initialNavigation && !["SERVICE_COMPANY", "LEISURE_AREA", "POOL_CARDS"].includes(initialNavigation)
    ? initialNavigation as RegistryEntryType
    : "RESIDENT";
  const [type, setType] = useState<RegistryEntryType>(initialRegistryType);
  const [companyMode, setCompanyMode] = useState(initialNavigation === "SERVICE_COMPANY");
  const [leisureMode, setLeisureMode] = useState(initialNavigation === "LEISURE_AREA");
  const [poolMode, setPoolMode] = useState(initialNavigation === "POOL_CARDS" || (currentUser?.role || "").toUpperCase() === "POOL_ATTENDANT");
  const [companyNewRequestSeq, setCompanyNewRequestSeq] = useState(0);
  const [rows, setRows] = useState<RegistryEntry[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showOwnersOnly, setShowOwnersOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<RegistrySortField>("unit");
  const [sortDirection, setSortDirection] = useState<RegistrySortDirection>("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RegistryEntryPayload>(emptyPayload(type));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const registrySearchInputRef = useRef<HTMLInputElement | null>(null);
  const registryRequestSeq = useRef(0);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [selectedRow, setSelectedRow] = useState<RegistryEntry | null>(null);
  const [selectedResidentVehicles, setSelectedResidentVehicles] = useState<RegistryEntry[]>([]);
  const [selectedResidentVehiclesLoading, setSelectedResidentVehiclesLoading] = useState(false);
  const [selectedResidentPackages, setSelectedResidentPackages] = useState<PackIdRecentItem[]>([]);
  const [residentialUnits, setResidentialUnits] = useState<ResidentialUnit[]>([]);
  const [registerNow, setRegisterNow] = useState(false);
  const [quickAccess, setQuickAccess] = useState<AccessForm>(emptyAccessForm());
  const [quickService, setQuickService] = useState<ServiceForm>(emptyServiceForm());

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventRow, setEventRow] = useState<RegistryEntry | null>(null);
  const [eventForm, setEventForm] = useState<AccessForm>(emptyAccessForm());

  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [unitLoading, setUnitLoading] = useState(false);
  const [unitSummary, setUnitSummary] = useState<UnitRegistrySummary | null>(null);
  const [occupancyDialogOpen, setOccupancyDialogOpen] = useState(false);
  const [occupancyAction, setOccupancyAction] = useState<"start" | "end">("start");
  const [occupancyDate, setOccupancyDate] = useState(localDateToday());
  const [occupancyNotes, setOccupancyNotes] = useState("");

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRow, setHistoryRow] = useState<RegistryEntry | null>(null);
  const [visitorHistory, setVisitorHistory] = useState<VisitorVisit[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryRecord[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceRecord[]>([]);
  const [serviceCompanies, setServiceCompanies] = useState<ServiceCompany[]>([]);
  const [serviceCompanySearch, setServiceCompanySearch] = useState("");
  const [newCompanyDialogOpen, setNewCompanyDialogOpen] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState<ServiceCompanyPayload>(emptyServiceCompanyPayload());
  const [newCompanySaving, setNewCompanySaving] = useState(false);
  const [newCompanyError, setNewCompanyError] = useState<string | null>(null);
  const [documentPhotoFile, setDocumentPhotoFile] = useState<File | null>(null);
  const [documentPhotoPreview, setDocumentPhotoPreview] = useState<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<"profile" | "document">("profile");
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceRow, setServiceRow] = useState<RegistryEntry | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm());
  const [condominiumServiceDialogOpen, setCondominiumServiceDialogOpen] = useState(false);
  const [condominiumServiceHistory, setCondominiumServiceHistory] = useState<ServiceRecord[]>([]);

  const loadServiceCompanies = async () => {
    try {
      const data = await fetchServiceCompanies();
      data.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      setServiceCompanies(data);
    } catch (e) {
      setError(userFriendlyError(e, "Falha ao carregar empresas prestadoras."));
    }
  };

  const openNewServiceCompany = () => {
    setNewCompanyForm(emptyServiceCompanyPayload(serviceCompanySearch.trim()));
    setNewCompanyError(null);
    setNewCompanyDialogOpen(true);
  };

  const setNewCompanyField = <K extends keyof ServiceCompanyPayload>(
    field: K,
    value: ServiceCompanyPayload[K],
  ) => setNewCompanyForm((current) => ({ ...current, [field]: value }));

  const saveNewServiceCompany = async () => {
    if (!newCompanyForm.name.trim()) {
      setNewCompanyError("Informe o nome da empresa.");
      return;
    }

    setNewCompanySaving(true);
    setNewCompanyError(null);
    try {
      const saved = await createServiceCompany(newCompanyForm);
      setServiceCompanies((current) =>
        [...current.filter((company) => company.id !== saved.id), saved]
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      );
      setForm((current) => ({ ...current, serviceCompanyId: saved.id }));
      setServiceCompanySearch([saved.name, saved.tradeName].filter(Boolean).join(" — "));
      setNewCompanyDialogOpen(false);
      setSuccessMessage("Empresa cadastrada e selecionada no prestador.");
    } catch (e) {
      setNewCompanyError(userFriendlyError(e, "Falha ao cadastrar empresa."));
    } finally {
      setNewCompanySaving(false);
    }
  };

  const loadRows = async (selectedType: RegistryEntryType) => {
    const requestId = ++registryRequestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRegistryEntriesPage({
        type: selectedType,
        search: debouncedSearch,
        includeInactive: showInactive,
        ownersOnly: selectedType === "RESIDENT" && showOwnersOnly,
        page,
        size: rowsPerPage,
        sort: sortField,
        direction: sortDirection,
      });
      if (requestId !== registryRequestSeq.current) return;

      setRows(data.content);
      setTotalRows(data.totalElements);
      if (data.totalPages > 0 && page >= data.totalPages) {
        setPage(data.totalPages - 1);
      }
      setSelectedRow((current) => {
        // Na pesquisa de condôminos, já abre o primeiro resultado encontrado.
        // Sem pesquisa, a tela volta a exibir somente o grid.
        if (selectedType === "RESIDENT" && debouncedSearch.trim()) {
          return data.content[0] ?? null;
        }
        return current ? data.content.find((item) => item.id === current.id) ?? null : null;
      });
    } catch (e) {
      if (requestId === registryRequestSeq.current) {
        setError(userFriendlyError(e, "Falha ao carregar cadastros."));
      }
    } finally {
      if (requestId === registryRequestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setSelectedRow(null);
  }, [type, companyMode, leisureMode, poolMode]);

  useEffect(() => {
    if (!companyMode && !leisureMode && !poolMode) void loadRows(type);
  }, [type, companyMode, leisureMode, poolMode, page, rowsPerPage, debouncedSearch, showInactive, showOwnersOnly, sortField, sortDirection]);

  useEffect(() => {
    if (!leisureMode && !poolMode && (type === "SERVICE_PROVIDER" || type === "DELIVERY_PERSON" || companyMode)) void loadServiceCompanies();
  }, [type, companyMode, leisureMode, poolMode]);

  useEffect(() => {
    const handleRegistryTabShortcut = (event: globalThis.KeyboardEvent) => {
      if ((currentUser?.role || "").toUpperCase() === "POOL_ATTENDANT") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

      // Enquanto houver um modal aberto, as setas pertencem ao próprio modal.
      if (document.querySelector('[role="dialog"]')) return;

      // Não interfere com campos de edição. A pesquisa da Gestão e o campo principal
      // do PackID continuam aceitando os atalhos globais.
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditable =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        Boolean(target?.isContentEditable);
      const isHomeShortcutField =
        target?.id === "registry-search-input" || target?.id === "package-code-input";
      if (isEditable && !isHomeShortcutField) return;

      event.preventDefault();
      event.stopPropagation();

      const nextType: RegistryEntryType = event.key === "ArrowUp" ? "RESIDENT" : "SERVICE_PROVIDER";
      setCompanyMode(false);
      setLeisureMode(false);
      setPoolMode(false);
      setType(nextType);
      setSearch("");
      setDebouncedSearch("");
      setSortField(defaultRegistrySortField(nextType));
      setSortDirection("asc");
      setPage(0);
      setSelectedRow(null);

      // Aguarda a troca da aba e posiciona o cursor diretamente na pesquisa.
      window.setTimeout(() => {
        registrySearchInputRef.current?.focus();
      }, 0);
    };

    // Captura o evento antes do componente Tabs/MUI para que ↑ e ↓ funcionem
    // mesmo quando o foco estiver em elementos navegáveis da tela.
    window.addEventListener("keydown", handleRegistryTabShortcut, true);
    return () => window.removeEventListener("keydown", handleRegistryTabShortcut, true);
  }, [currentUser?.role]);

  useEffect(() => {
    if (poolMode) return;
    void fetchResidentialUnits().then((items) => setResidentialUnits(items.filter((u) => u.active !== false)))
      .catch((e) => setError(userFriendlyError(e, "Falha ao carregar blocos e apartamentos cadastrados.")));
  }, [poolMode]);

  const visibleRows = rows;
  const paginatedRows = rows;

  useEffect(() => {
    if (!showInactive && selectedRow && !selectedRow.active) {
      setSelectedRow(null);
    }
  }, [showInactive, selectedRow]);

  useEffect(() => {
    let cancelled = false;

    const loadExtras = async () => {
      if (!selectedRow || selectedRow.entryType !== "RESIDENT" || !selectedRow.block || !selectedRow.apartment) {
        setSelectedResidentVehicles([]);
        setSelectedResidentPackages([]);
        setSelectedResidentVehiclesLoading(false);
        return;
      }

      setSelectedResidentVehiclesLoading(true);
      try {
        const summary = await fetchUnitRegistrySummary(
          selectedRow.block,
          selectedRow.apartment,
          selectedRow.occupancyId,
        );
        if (!cancelled) {
          setSelectedResidentVehicles(summary.vehicles || []);
          setSelectedResidentPackages(summary.packIds || []);
        }
      } catch (e) {
        if (!cancelled) setError(userFriendlyError(e, "Falha ao carregar os dados da unidade."));
      } finally {
        if (!cancelled) setSelectedResidentVehiclesLoading(false);
      }
    };

    // Carrega ao selecionar/trocar a unidade. Depois disso, o resumo só é
    // recarregado quando houver mudança de PackID: nova encomenda registrada
    // ou entrega concluída pela portaria. Não há mais polling a cada 5 segundos.
    void loadExtras();
    const onPackIdChanged = () => void loadExtras();
    window.addEventListener("packid:registered", onPackIdChanged);

    return () => {
      cancelled = true;
      window.removeEventListener("packid:registered", onPackIdChanged);
    };
  }, [selectedRow]);

  const editingRow = editingId ? rows.find((row) => row.id === editingId) ?? null : null;
  const photoLockedByAnotherAccount = Boolean(
    editingRow?.photoAvailable && !editingRow.photoOwnedByCurrentUser,
  );
  const storedPhotoUrl =
    editingRow?.photoAvailable && editingRow.photoOwnedByCurrentUser
      ? registryEntryPhotoUrl(editingRow.id, editingRow.updatedAt ?? editingRow.createdAt)
      : null;
  const documentStoredUrl = editingRow?.documentPhotoAvailable && editingRow.documentPhotoOwnedByCurrentUser
    ? registryDocumentPhotoUrl(editingRow.id, "document", editingRow.updatedAt ?? editingRow.createdAt) : null;

  const selectedLabel = TYPES.find((item) => item.type === type)?.label ?? "Gestão";
  const canManageProtectedRegistry = Boolean(
    currentUser?.canManageProtectedRegistry ?? ["ADMIN", "SECRETARY"].includes((currentUser?.role ?? "").toUpperCase()),
  );
  const canExportExcel = ["ADMIN", "SECRETARY"].includes((currentUser?.role ?? "").toUpperCase());
  const isProtectedRegistryType = (value: RegistryEntryType) =>
    value === "RESIDENT" || value === "BICYCLE" || value === "PET" || value === "VEHICLE";
  const protectedReadOnly = isProtectedRegistryType(type) && !canManageProtectedRegistry;
  const isAccessPerson = type === "VISITOR" || type === "DELIVERY_PERSON";
  const isServiceProvider = type === "SERVICE_PROVIDER";
  const isDeliveryPerson = type === "DELIVERY_PERSON";
  const isCompanyLinkedPerson = isServiceProvider || isDeliveryPerson;
  const canRegisterEvent = isAccessPerson || isServiceProvider;
  const showDetailsColumn = type !== "RESIDENT";

  const tableColumnCount =
    5 +
    (canRegisterEvent ? 1 : 0) +
    (type === "RESIDENT" ? 1 : 0) +
    (type === "VEHICLE" ? 1 : 0) +
    (showDetailsColumn ? 1 : 0);

  const toggleSort = (field: RegistrySortField) => {
    if (sortField === field) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      // Para proprietário, o primeiro clique mostra "Sim" antes de "Não".
      setSortDirection(field === "owner" ? "desc" : "asc");
    }
    setPage(0);
  };

  const resetPhotoSelection = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setDocumentPhotoFile(null);
    setDocumentPhotoPreview(null);
  };

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
    setCameraLoading(false);
    setCameraError(null);
  };

  const openCamera = (target: "profile" | "document" = "profile") => {
    setCameraTarget(target);
    setCameraError(null);
    setCameraOpen(true);
  };

  useEffect(() => {
    if (!cameraOpen) return;

    let cancelled = false;

    const startCamera = async () => {
      setCameraLoading(true);
      setCameraError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("A câmera não está disponível neste navegador. Use a opção Escolher arquivo.");
        setCameraLoading(false);
        return;
      }

      try {
        stopCamera();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraTarget === "profile" ? "user" : { ideal: "environment" } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        const errorName = e instanceof DOMException ? e.name : "";
        if (errorName === "NotAllowedError" || errorName === "SecurityError") {
          setCameraError("Permissão da câmera negada. Autorize a câmera no navegador e tente novamente.");
        } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
          setCameraError("Nenhuma câmera foi encontrada neste equipamento.");
        } else if (errorName === "NotReadableError" || errorName === "TrackStartError") {
          setCameraError("A câmera está sendo usada por outro aplicativo ou não pôde ser iniciada.");
        } else {
          setCameraError("Não foi possível abrir a câmera. Verifique a permissão do navegador e tente novamente.");
        }
      } finally {
        if (!cancelled) setCameraLoading(false);
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [cameraOpen, cameraTarget]);

  const captureCameraPhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
      setCameraError("A imagem da câmera ainda não está pronta. Aguarde um instante e tente novamente.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Não foi possível processar a foto capturada.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("Não foi possível gerar a foto capturada.");
        return;
      }

      const file = new File([blob], `vsgi-${cameraTarget}-${Date.now()}.jpg`, { type: "image/jpeg" });
      if (cameraTarget === "profile") handlePhotoSelected(file);
      else handleDocumentPhotoSelected(file);
      closeCamera();
    }, "image/jpeg", 0.9);
  };

  const openNew = () => {
    if (isProtectedRegistryType(type) && !canManageProtectedRegistry) {
      setError("O perfil de portaria possui somente visualização para este cadastro.");
      return;
    }
    closeCamera();
    setEditingId(null);
    setForm(emptyPayload(type));
    setServiceCompanySearch("");
    setRegisterNow(false);
    setQuickAccess(emptyAccessForm());
    setQuickService(emptyServiceForm());
    resetPhotoSelection();
    setDialogOpen(true);
  };

  const openEdit = (row: RegistryEntry) => {
    if (isProtectedRegistryType(row.entryType) && !canManageProtectedRegistry) {
      setError("O perfil de portaria possui somente visualização para este cadastro.");
      return;
    }
    closeCamera();
    setEditingId(row.id);
    setSelectedRow(row);
    setRegisterNow(false);
    setQuickAccess(emptyAccessForm());
    setQuickService(emptyServiceForm());
    resetPhotoSelection();
    setForm({
      entryType: row.entryType,
      name: row.name ?? "",
      document: row.document ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      unitOwner: row.unitOwner ?? false,
      birthDate: row.birthDate ?? "",
      profession: row.profession ?? "",
      pne: row.pne ?? false,
      block: row.block ?? "",
      apartment: row.apartment ?? "",
      company: row.company ?? "",
      serviceCompanyId: row.serviceCompanyId ?? null,
      ownerName: row.ownerName ?? "",
      brand: row.brand ?? "",
      model: row.model ?? "",
      color: row.color ?? "",
      identifier: row.identifier ?? "",
      species: row.species ?? "",
      breed: row.breed ?? "",
      petSize: row.petSize ?? "",
      parkingSpace: row.parkingSpace ?? "",
      parkingSpaceRented: row.parkingSpaceRented ?? false,
      parkingSpaceRentalNotes: row.parkingSpaceRentalNotes ?? "",
      notes: row.notes ?? "",
      residentAccessEnabled: row.residentAccessEnabled ?? false,
      residentUsername: row.residentUsername ?? "",
      residentPassword: "",
      residentCredentialEmailEnabled: row.residentCredentialEmailEnabled ?? false,
      active: row.active,
    });
    setDialogOpen(true);
  };

  const setField = <K extends keyof RegistryEntryPayload>(
    field: K,
    value: RegistryEntryPayload[K],
  ) => setForm((current) => ({ ...current, [field]: value }));

  const handlePhotoSelected = (file?: File) => {
    if (!file) return;
    if (!(file.type === "image/jpeg" || file.type === "image/png")) {
      setError("Use uma foto JPG ou PNG.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("A foto deve ter no máximo 12 MB antes da compactação.");
      return;
    }
    setError(null);
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const handleDocumentPhotoSelected = (file?: File) => {
    if (!file) return;
    if (!(file.type === "image/jpeg" || file.type === "image/png")) {
      setError("Use uma foto JPG ou PNG.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 12 MB antes da compactação.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setDocumentPhotoFile(file);
      setDocumentPhotoPreview(String(reader.result ?? ""));
    };
    reader.readAsDataURL(file);
  };

  const removeDocumentPhoto = async () => {
    if (!editingId) return;
    const confirmed = await confirmDialog({
      title: "Remover foto do documento?",
      text: "A foto do documento será removida do Google Drive.",
      confirmButtonText: "Remover",
    });
    if (!confirmed) return;
    setLoading(true); setError(null);
    try {
      await deleteRegistryDocumentPhoto(editingId, "document");
      setDocumentPhotoFile(null);
      setDocumentPhotoPreview(null);
      await loadRows(type);
      setSuccessMessage("Foto do documento removida com sucesso.");
    } catch (e) { setError(userFriendlyError(e, "Falha ao remover foto do documento.")); }
    finally { setLoading(false); }
  };

  const removePhoto = async () => {
    if (!editingId || !editingRow?.photoAvailable) return;
    const confirmed = await confirmDialog({
      title: "Remover foto?",
      text: "A foto deste cadastro será removida do Google Drive.",
      confirmButtonText: "Remover",
    });
    if (!confirmed) return;
    setLoading(true);
    setError(null);
    try {
      await deleteRegistryEntryPhoto(editingId);
      resetPhotoSelection();
      await loadRows(type);
      setSuccessMessage("Foto removida com sucesso.");
    } catch (e) {
      setError(userFriendlyError(e, "Falha ao remover a foto."));
    } finally {
      setLoading(false);
    }
  };

  const registerAccessEvent = async (row: RegistryEntry, access: AccessForm) => {
    if (!access.block.trim() || !access.apartment.trim()) {
      throw new Error("Informe o bloco e o apartamento de destino.");
    }

    if (row.entryType === "VISITOR") {
      await createVisitorVisit({
        visitorRegistryEntryId: row.id,
        block: access.block.trim(),
        apartment: access.apartment.trim(),
        visitedAt: access.dateTime || null,
        notes: access.notes.trim() || null,
      });
      return;
    }

    if (row.entryType === "DELIVERY_PERSON") {
      await createDeliveryRecord({
        deliveryPersonRegistryEntryId: row.id,
        block: access.block.trim(),
        apartment: access.apartment.trim(),
        deliveredAt: access.dateTime || null,
        authorizedToEnter: access.authorizedToEnter,
        notes: access.notes.trim() || null,
      });
    }
  };

  const registerServiceEvent = async (row: RegistryEntry, service: ServiceForm) => {
    if (!service.serviceDescription.trim()) throw new Error("Informe a descrição do serviço realizado.");
    if (service.scope === "UNIT" && (!service.block.trim() || !service.apartment.trim())) {
      throw new Error("Informe bloco e apartamento para o serviço realizado em uma unidade.");
    }
    await createServiceRecord({
      serviceProviderRegistryEntryId: row.id,
      serviceScope: service.scope,
      block: service.scope === "UNIT" ? service.block.trim() : null,
      apartment: service.scope === "UNIT" ? service.apartment.trim() : null,
      performedAt: service.dateTime || null,
      serviceDescription: service.serviceDescription.trim(),
      notes: service.notes.trim() || null,
    });
  };

  const save = async () => {
    if (isProtectedRegistryType(type) && !canManageProtectedRegistry) {
      setError("O perfil de portaria não pode cadastrar ou editar este tipo de registro.");
      return;
    }
    if (!form.name.trim()) {
      setError("Informe o nome ou a identificação principal do cadastro.");
      return;
    }
    if (
      (type === "RESIDENT" || type === "BICYCLE" || type === "PET" || type === "VEHICLE")
      && form.active
      && (!form.block?.trim() || !form.apartment?.trim())
    ) {
      setError("Informe bloco e apartamento para vincular este cadastro à ocupação.");
      return;
    }
    if (type === "RESIDENT" && form.residentAccessEnabled) {
      if (!(form.residentUsername ?? "").trim() || (form.residentUsername ?? "").trim().length < 4) {
        setError("Para liberar o acesso da unidade, informe um usuário com pelo menos 4 caracteres.");
        return;
      }
      if (!editingId && (form.residentPassword ?? "").length < 8) {
        setError("Para liberar o primeiro acesso da unidade, informe ou gere uma senha com pelo menos 8 caracteres.");
        return;
      }
      if (editingId && (form.residentPassword ?? "").length > 0 && (form.residentPassword ?? "").length < 8) {
        setError("A nova senha deve ter pelo menos 8 caracteres. Deixe em branco para manter a senha atual.");
        return;
      }
    }
    if (registerNow && isAccessPerson && (!quickAccess.block.trim() || !quickAccess.apartment.trim())) {
      setError("Para registrar a entrada agora, informe bloco e apartamento de destino.");
      return;
    }
    if (isCompanyLinkedPerson && !form.serviceCompanyId) {
      setError(isDeliveryPerson
        ? "Selecione a empresa/transportadora ou cadastre uma nova empresa neste formulário."
        : "Selecione a empresa prestadora ou cadastre uma nova empresa neste formulário.");
      return;
    }
    if (registerNow && isServiceProvider) {
      if (!quickService.serviceDescription.trim()) {
        setError("Informe a descrição do serviço para registrar o atendimento agora.");
        return;
      }
      if (quickService.scope === "UNIT" && (!quickService.block.trim() || !quickService.apartment.trim())) {
        setError("Informe bloco e apartamento do serviço.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    let newlyCreatedId: string | null = null;

    try {
      let saved: RegistryEntry;
      if (editingId) {
        saved = await updateRegistryEntry(editingId, form);
      } else {
        saved = await createRegistryEntry(form);
        newlyCreatedId = saved.id;
      }

      if (photoFile) saved = await uploadRegistryEntryPhoto(saved.id, photoFile);
      if ((saved.entryType === "SERVICE_PROVIDER" || saved.entryType === "DELIVERY_PERSON") && documentPhotoFile) {
        saved = await uploadRegistryDocumentPhoto(saved.id, "document", documentPhotoFile);
      }
      if (!editingId && registerNow && isAccessPerson) await registerAccessEvent(saved, quickAccess);
      if (!editingId && registerNow && isServiceProvider) await registerServiceEvent(saved, quickService);

      resetPhotoSelection();
      setDialogOpen(false);
      setEditingId(null);
      setRegisterNow(false);
      await loadRows(type);
      setSelectedRow(saved);
      setSuccessMessage(editingId ? "Cadastro atualizado com sucesso." : "Cadastro criado com sucesso.");
    } catch (e) {
      if (newlyCreatedId) await loadRows(type);
      setError(userFriendlyError(e, "Falha ao salvar cadastro."));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (row: RegistryEntry) => {
    if (isProtectedRegistryType(row.entryType) && !canManageProtectedRegistry) {
      setError("O perfil de portaria não pode excluir este tipo de cadastro.");
      return;
    }
    const confirmed = await confirmDialog({
      title: "Excluir cadastro?",
      text: `Tem certeza que deseja excluir "${row.name}"?`,
      confirmButtonText: "Excluir",
    });
    if (!confirmed) return;
    setLoading(true);
    setError(null);
    try {
      await deleteRegistryEntry(row.id);
      if (selectedRow?.id === row.id) setSelectedRow(null);
      await loadRows(type);
      setSuccessMessage("Cadastro excluído com sucesso.");
    } catch (e) {
      setError(userFriendlyError(e, "Falha ao excluir cadastro."));
    } finally {
      setLoading(false);
    }
  };

  const openEvent = (row: RegistryEntry) => {
    setEventRow(row);
    setEventForm(emptyAccessForm());
    setEventDialogOpen(true);
  };

  const saveEvent = async () => {
    if (!eventRow) return;
    setLoading(true);
    setError(null);
    try {
      await registerAccessEvent(eventRow, eventForm);
      setEventDialogOpen(false);
      setEventRow(null);
      setSuccessMessage(eventRow.entryType === "VISITOR" ? "Visita registrada com sucesso." : "Entrega registrada com sucesso.");
    } catch (e) {
      setError(userFriendlyError(e, "Falha ao registrar movimentação."));
    } finally {
      setLoading(false);
    }
  };

  const openServiceEvent = (row: RegistryEntry) => {
    setServiceRow(row);
    setServiceForm(emptyServiceForm());
    setServiceDialogOpen(true);
  };

  const saveServiceEvent = async () => {
    if (!serviceRow) return;
    setLoading(true); setError(null);
    try {
      await registerServiceEvent(serviceRow, serviceForm);
      setServiceDialogOpen(false); setServiceRow(null);
      setSuccessMessage("Serviço registrado com sucesso.");
    } catch (e) { setError(userFriendlyError(e, "Falha ao registrar serviço.")); }
    finally { setLoading(false); }
  };

  const openCondominiumServiceHistory = async () => {
    setHistoryLoading(true); setError(null);
    try {
      setCondominiumServiceHistory(await fetchServiceRecords(undefined, "CONDOMINIUM"));
      setCondominiumServiceDialogOpen(true);
    } catch (e) { setError(userFriendlyError(e, "Falha ao carregar histórico de serviços do condomínio.")); }
    finally { setHistoryLoading(false); }
  };

  const loadUnitSummary = async (
    block: string,
    apartment: string,
    occupancyId?: string | null,
  ) => {
    setUnitLoading(true);
    setError(null);
    try {
      setUnitSummary(await fetchUnitRegistrySummary(block, apartment, occupancyId));
    } catch (e) {
      setError(userFriendlyError(e, "Falha ao carregar dados do apartamento."));
      throw e;
    } finally {
      setUnitLoading(false);
    }
  };

  const openUnitSummary = async (row: RegistryEntry) => {
    if (!row.block || !row.apartment) {
      setError("O condômino precisa ter bloco e apartamento para abrir a visão da unidade.");
      return;
    }
    setSelectedRow(row);
    setUnitDialogOpen(true);
    setUnitSummary(null);
    try {
      await loadUnitSummary(row.block, row.apartment, row.occupancyId);
    } catch {
      setUnitDialogOpen(false);
    }
  };

  const selectOccupancy = async (occupancy: ApartmentOccupancy) => {
    if (!unitSummary) return;
    try {
      await loadUnitSummary(unitSummary.block, unitSummary.apartment, occupancy.id);
    } catch {
      // erro já exibido pelo loader
    }
  };

  const openOccupancyAction = (action: "start" | "end") => {
    setOccupancyAction(action);
    setOccupancyDate(localDateToday());
    setOccupancyNotes("");
    setOccupancyDialogOpen(true);
  };

  const saveOccupancyAction = async () => {
    if (!unitSummary) return;
    setLoading(true);
    setError(null);
    try {
      if (occupancyAction === "start") {
        const created = await startApartmentOccupancy({
          block: unitSummary.block,
          apartment: unitSummary.apartment,
          startDate: occupancyDate || null,
          notes: occupancyNotes.trim() || null,
        });
        setOccupancyDialogOpen(false);
        await loadUnitSummary(unitSummary.block, unitSummary.apartment, created.id);
        setSuccessMessage(created.status === "SCHEDULED" ? "Ocupação agendada com sucesso." : "Nova ocupação iniciada com sucesso.");
      } else {
        const ended = await endApartmentOccupancy({
          block: unitSummary.block,
          apartment: unitSummary.apartment,
          endDate: occupancyDate || null,
        });
        setOccupancyDialogOpen(false);
        await loadRows(type);
        await loadUnitSummary(unitSummary.block, unitSummary.apartment, ended.id);
        setSuccessMessage("Ocupação encerrada com sucesso. Os cadastros vinculados foram inativados.");
      }
    } catch (e) {
      setError(userFriendlyError(e, "Falha ao atualizar ocupação do apartamento."));
    } finally {
      setLoading(false);
    }
  };

  const exportCurrentTab = async () => {
    if (!canExportExcel || leisureMode) return;
    setExporting(true);
    setError(null);
    try {
      if (companyMode) await exportServiceCompaniesExcel();
      else await exportRegistryExcel(type);
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível exportar os dados para Excel."));
    } finally {
      setExporting(false);
    }
  };

  const openHistory = async (row: RegistryEntry) => {
    if (row.entryType !== "VISITOR" && row.entryType !== "DELIVERY_PERSON" && row.entryType !== "SERVICE_PROVIDER") return;
    setHistoryRow(row);
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    setVisitorHistory([]);
    setDeliveryHistory([]);
    setServiceHistory([]);
    setError(null);
    try {
      if (row.entryType === "VISITOR") setVisitorHistory(await fetchVisitorVisits(row.id));
      else if (row.entryType === "DELIVERY_PERSON") setDeliveryHistory(await fetchDeliveryRecords(row.id));
      else setServiceHistory(await fetchServiceRecords(row.id));
    } catch (e) {
      setError(userFriendlyError(e, "Falha ao carregar histórico."));
      setHistoryDialogOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: embedded ? "none" : 1500, mx: embedded ? 0 : "auto", mt: embedded ? 0 : 2, mb: embedded ? 0 : 3, minWidth: 0 }}>
      <Paper elevation={2} sx={{ p: embedded ? { xs: 1.25, sm: 1.75 } : { xs: 1.5, sm: 2.5 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 0.5, sm: 1 },
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tooltip title="Atalhos: ← pesquisa da gestão · ↑ condôminos · ↓ prestadores de serviço" arrow placement="top">
            <Tabs
          value={poolMode ? "POOL_CARDS" : leisureMode ? "LEISURE_AREA" : companyMode ? "SERVICE_COMPANY" : type}
          onChange={(_, value: RegistryNavigationValue) => {
            setSearch("");
            setDebouncedSearch("");
            setPage(0);
            setSelectedRow(null);

            if (value === "SERVICE_COMPANY") {
              setCompanyMode(true);
              setLeisureMode(false);
              setPoolMode(false);
              return;
            }

            if (value === "LEISURE_AREA") {
              setCompanyMode(false);
              setLeisureMode(true);
              setPoolMode(false);
              return;
            }

            if (value === "POOL_CARDS") {
              setCompanyMode(false);
              setLeisureMode(false);
              setPoolMode(true);
              return;
            }

            setCompanyMode(false);
            setLeisureMode(false);
            setPoolMode(false);
            setType(value as RegistryEntryType);
            setSortField(defaultRegistrySortField(value));
            setSortDirection("asc");
          }}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Navegação da gestão do condomínio"
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 56,
            "& .MuiTabs-indicator": {
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
          }}
        >
          {NAVIGATION_ITEMS.filter((item) => (currentUser?.role || "").toUpperCase() !== "POOL_ATTENDANT" || item.value === "POOL_CARDS").map((item) => (
            <Tab
              key={item.value}
              value={item.value}
              aria-label={item.label}
              icon={
                <Tooltip title={item.label} arrow placement="top">
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: item.color,
                      "& svg": { fontSize: 29 },
                    }}
                  >
                    {navigationIcon(item.value)}
                  </Box>
                </Tooltip>
              }
              sx={{
                minWidth: 68,
                minHeight: 56,
                px: 1.5,
                opacity: 0.78,
                "&.Mui-selected": {
                  opacity: 1,
                  bgcolor: "action.hover",
                },
              }}
            />
          ))}
            </Tabs>
          </Tooltip>

        </Box>

        {poolMode ? (
          <PoolCardsScreen currentUser={currentUser || { name: "", email: "", role: "PORTER" }} />
        ) : leisureMode ? (
          <SpacesScreen embedded canExport={canExportExcel} />
        ) : companyMode ? (
          <>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={1.5}
              sx={{ mt: 2 }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Empresas</Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Cadastre empresas prestadoras de serviço e transportadoras para selecioná-las nos cadastros de prestadores e entregadores.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexShrink={0}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCompanyNewRequestSeq((current) => current + 1)}
                >
                  Novo cadastro
                </Button>
                {canExportExcel && (
                  <Button
                    variant="outlined"
                    startIcon={<FileDownloadOutlinedIcon />}
                    onClick={() => void exportCurrentTab()}
                    disabled={exporting}
                  >
                    {exporting ? "Exportando..." : "Exportar Excel"}
                  </Button>
                )}
              </Stack>
            </Stack>
            {error && (
              <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <ServiceCompanyPanel newRequestSeq={companyNewRequestSeq} hideHeader />
          </>
        ) : <>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          spacing={1.5}
          sx={{ mt: 2 }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>{selectedLabel}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {REGISTRY_SECTION_DESCRIPTIONS[type]}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexShrink={0}>
            {!protectedReadOnly && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
                Novo cadastro
              </Button>
            )}
            {canExportExcel && (
              <Button
                variant="outlined"
                startIcon={<FileDownloadOutlinedIcon />}
                onClick={() => void exportCurrentTab()}
                disabled={exporting}
              >
                {exporting ? "Exportando..." : "Exportar Excel"}
              </Button>
            )}
          </Stack>
        </Stack>
        {protectedReadOnly && (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            Perfil de portaria: consulta liberada. Inclusão, edição e exclusão de {selectedLabel.toLowerCase()} são restritas à secretaria/administrador.
          </Alert>
        )}
        <Box
          sx={{
            mt: 2,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: { xs: 0.5, sm: 2 },
          }}
        >
          <TextField
            value={search}
            onChange={(e) => {
              const nextSearch = e.target.value;
              const normalizedSearch = nextSearch.trim();
              const queryChanged = normalizedSearch !== debouncedSearch;

              // Invalida eventual resposta de uma pesquisa anterior e remove a
              // visualização atual somente quando o filtro efetivamente mudou.
              if (queryChanged) {
                registryRequestSeq.current += 1;
                setSelectedRow(null);
              }
              setSearch(nextSearch);
              setPage(0);

              // Ao apagar a pesquisa, recarrega imediatamente a lista completa
              // e mantém somente o grid na tela.
              if (!normalizedSearch) setDebouncedSearch("");
            }}
            inputRef={registrySearchInputRef}
            placeholder={`Pesquisar em ${selectedLabel.toLowerCase()}...`}
            size="small"
            fullWidth
            sx={{ maxWidth: 620 }}
            inputProps={{ id: "registry-search-input", "aria-keyshortcuts": "ArrowLeft ArrowUp ArrowDown" }}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.55 }} /> }}
          />
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
            {type === "RESIDENT" && (
              <Tooltip title="Somente proprietários" arrow>
                <IconButton
                  size="small"
                  aria-label="Somente proprietários"
                  aria-pressed={showOwnersOnly}
                  onClick={() => { setShowOwnersOnly((current) => !current); setPage(0); }}
                  sx={{
                    color: showOwnersOnly ? "text.primary" : "text.secondary",
                    bgcolor: showOwnersOnly ? "action.selected" : "transparent",
                    border: "1px solid",
                    borderColor: showOwnersOnly ? "text.disabled" : "divider",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <HomeOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Mostrar inativos" arrow>
              <IconButton
                size="small"
                aria-label="Mostrar inativos"
                aria-pressed={showInactive}
                onClick={() => { setShowInactive((current) => !current); setPage(0); }}
                sx={{
                  color: showInactive ? "text.primary" : "text.secondary",
                  bgcolor: showInactive ? "action.selected" : "transparent",
                  border: "1px solid",
                  borderColor: showInactive ? "text.disabled" : "divider",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <PersonOffOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          {isServiceProvider && (
            <Button variant="outlined" startIcon={<VisibilityOutlinedIcon />} onClick={() => void openCondominiumServiceHistory()}>
              Serviços do condomínio
            </Button>
          )}
        </Box>

        {loading && <LinearProgress sx={{ mt: 1.5 }} />}

        {error && (
          <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {selectedRow && (
          <Card variant="outlined" sx={{ mt: 2, bgcolor: "action.hover" }}>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                <Avatar
                  src={
                    selectedRow.photoAvailable && selectedRow.photoOwnedByCurrentUser
                      ? registryEntryPhotoUrl(selectedRow.id, selectedRow.updatedAt ?? selectedRow.createdAt)
                      : undefined
                  }
                  sx={{ width: 72, height: 72 }}
                >
                  {selectedRow.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Visualização do registro selecionado
                  </Typography>
                  <Box
                    sx={{
                      mt: 1,
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
                      gap: 1.5,
                    }}
                  >
                    <FieldCard label={selectedRow.entryType === "RESIDENT" ? "Nome" : "Nome / descrição"} value={selectedRow.name} />
                    <FieldCard
                      label={(selectedRow.entryType === "SERVICE_PROVIDER" || selectedRow.entryType === "DELIVERY_PERSON") ? "Empresa" : "Unidade"}
                      value={(selectedRow.entryType === "SERVICE_PROVIDER" || selectedRow.entryType === "DELIVERY_PERSON")
                        ? (selectedRow.serviceCompanyName || selectedRow.company)
                        : unitLabel(selectedRow)}
                    />
                    {selectedRow.entryType === "RESIDENT" ? (
                      <>
                        <FieldCard label="Proprietário" value={selectedRow.unitOwner ? "Sim" : "Não"} />
                        <FieldCard label="Telefone" value={selectedRow.phone} />
                        <FieldCard label="Carteirinha piscina" value={selectedRow.poolCardAvailable ? (selectedRow.poolCardValid ? "✓ Válida" : "○ Fora da validade") : "Não cadastrada"} />
                        <FieldCard label="Validade piscina" value={selectedRow.poolCardValidUntil ? new Date(`${selectedRow.poolCardValidUntil}T12:00:00`).toLocaleDateString("pt-BR") : "—"} />
                      </>
                    ) : (
                      <>
                        <FieldCard label="Documento / identificação" value={identifierLabel(selectedRow)} />
                        <FieldCard label="Telefone" value={selectedRow.phone} />
                        {selectedRow.entryType === "PET" && (
                          <FieldCard label="Porte" value={selectedRow.petSize} />
                        )}
                        {selectedRow.entryType === "VEHICLE" && (
                          <>
                            <FieldCard label="Vaga alugada/cedida" value={selectedRow.parkingSpaceRented ? "Sim" : "Não"} />
                            <FieldCard label="Detalhes da vaga" value={selectedRow.parkingSpaceRentalNotes} />
                          </>
                        )}
                        <FieldCard label="Detalhes" value={detailsLabel(selectedRow)} />
                        <FieldCard label="Responsável" value={selectedRow.ownerName} />
                        <FieldCard label="Observações" value={selectedRow.notes} />
                        <FieldCard label="Status" value={selectedRow.active ? "Ativo" : "Inativo"} />
                      </>
                    )}
                  </Box>
                </Box>
                {selectedRow.entryType === "RESIDENT" && (
                  <Button
                    variant="outlined"
                    startIcon={<VisibilityOutlinedIcon />}
                    onClick={() => void openUnitSummary(selectedRow)}
                  >
                    Ver apartamento
                  </Button>
                )}
                {(selectedRow.entryType === "VISITOR" || selectedRow.entryType === "DELIVERY_PERSON") && (
                  <Stack spacing={1}>
                    <Button variant="outlined" startIcon={selectedRow.entryType === "VISITOR" ? <MeetingRoomOutlinedIcon /> : <LocalShippingOutlinedIcon />} onClick={() => openEvent(selectedRow)}>
                      {selectedRow.entryType === "VISITOR" ? "Registrar visita" : "Registrar entrega"}
                    </Button>
                    <Button variant="text" startIcon={<VisibilityOutlinedIcon />} onClick={() => void openHistory(selectedRow)}>Ver histórico</Button>
                  </Stack>
                )}
                {selectedRow.entryType === "SERVICE_PROVIDER" && (
                  <Stack spacing={1}>
                    <Button variant="contained" color="success" startIcon={<EngineeringOutlinedIcon />} onClick={() => openServiceEvent(selectedRow)}>Registrar serviço</Button>
                    <Button variant="text" startIcon={<VisibilityOutlinedIcon />} onClick={() => void openHistory(selectedRow)}>Ver histórico</Button>
                  </Stack>
                )}
              </Stack>

              {selectedRow.entryType === "RESIDENT" && (
                <Box
                  sx={{
                    mt: 2,
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" },
                    gap: 2,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Veículos da unidade ({selectedResidentVehicles.length})
                    </Typography>
                    {selectedResidentVehiclesLoading ? (
                      <Typography variant="body2" sx={{ opacity: 0.7 }}>Carregando veículos...</Typography>
                    ) : selectedResidentVehicles.length === 0 ? (
                      <Typography variant="body2" sx={{ opacity: 0.7 }}>Nenhum veículo cadastrado nesta ocupação.</Typography>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Veículo</TableCell>
                              <TableCell>Placa</TableCell>
                              <TableCell align="center">Vaga alugada/cedida</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedResidentVehicles.map((vehicle) => (
                              <TableRow key={vehicle.id}>
                                <TableCell>{[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || vehicle.name || "-"}</TableCell>
                                <TableCell>{vehicle.identifier || "-"}</TableCell>
                                <TableCell align="center">
                                  <Chip
                                    size="small"
                                    label={vehicle.parkingSpaceRented ? "Sim" : "Não"}
                                    color={vehicle.parkingSpaceRented ? "warning" : "default"}
                                    variant={vehicle.parkingSpaceRented ? "filled" : "outlined"}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Encomendas da unidade (Últimas 3)
                    </Typography>
                    {selectedResidentPackages.length === 0 ? (
                      <Typography variant="body2" sx={{ opacity: .7 }}>Nenhuma encomenda registrada nesta ocupação.</Typography>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ width: 190, maxWidth: 190 }}>Código</TableCell>
                              <TableCell sx={{ width: 72 }}>Página</TableCell>
                              <TableCell sx={{ whiteSpace: "nowrap" }}>Registrada em</TableCell>
                              <TableCell align="center">App</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedResidentPackages.slice(0, 3).map((pack) => {
                              const code = pack.labelPackageCode || pack.packageCode || "-";
                              return (
                              <TableRow key={pack.id}>
                                <TableCell sx={{ width: 190, maxWidth: 190 }}>
                                  <Tooltip title={code === "-" ? "" : code} arrow>
                                    <Box component="span" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 190 }}>
                                      {code}
                                    </Box>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>{pack.bookPage || "—"}</TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(pack.arrivedAt)}</TableCell>
                                <TableCell align="center">
                                  {pack.residentAcknowledgedAt ? (
                                    <Tooltip title="Retirada solicitada pelo aplicativo — o registro eletrônico dispensa assinatura no caderno.">
                                      <CheckCircleOutlineIcon sx={{ color: "text.disabled", fontSize: 19 }} />
                                    </Tooltip>
                                  ) : "—"}
                                </TableCell>
                              </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        <TableContainer sx={{ mt: 2 }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                {canRegisterEvent && (
                  <TableCell width={92} align="center">Registrar</TableCell>
                )}
                <TableCell width={72}>Foto</TableCell>
                <TableCell sortDirection={sortField === "name" ? sortDirection : false}>
                  <TableSortLabel
                    active={sortField === "name"}
                    direction={sortField === "name" ? sortDirection : "asc"}
                    onClick={() => toggleSort("name")}
                  >
                    {type === "RESIDENT" ? "Nome" : "Nome / descrição"}
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={!isCompanyLinkedPerson && sortField === "unit" ? sortDirection : false}>
                  {isCompanyLinkedPerson ? "Empresa" : (
                    <TableSortLabel
                      active={sortField === "unit"}
                      direction={sortField === "unit" ? sortDirection : "asc"}
                      onClick={() => toggleSort("unit")}
                    >
                      Unidade
                    </TableSortLabel>
                  )}
                </TableCell>
                {type === "RESIDENT" && (
                  <TableCell align="center" sortDirection={sortField === "owner" ? sortDirection : false}>
                    <TableSortLabel
                      active={sortField === "owner"}
                      direction={sortField === "owner" ? sortDirection : "desc"}
                      onClick={() => toggleSort("owner")}
                    >
                      Proprietário
                    </TableSortLabel>
                  </TableCell>
                )}
                {type === "VEHICLE" && <TableCell align="center">Vaga alugada</TableCell>}
                {showDetailsColumn && <TableCell>Detalhes</TableCell>}
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && visibleRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={tableColumnCount} align="center" sx={{ py: 4, opacity: 0.7 }}>
                    {showOwnersOnly && type === "RESIDENT"
                      ? (showInactive ? "Nenhum proprietário encontrado." : "Nenhum proprietário ativo encontrado.")
                      : showInactive
                        ? "Nenhum cadastro encontrado."
                        : "Nenhum cadastro ativo encontrado. Marque “Mostrar inativos” para consultar registros inativos."}
                  </TableCell>
                </TableRow>
              )}
              {paginatedRows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  selected={selectedRow?.id === row.id}
                  onClick={() => setSelectedRow(row)}
                  sx={{ cursor: "pointer" }}
                >
                  {canRegisterEvent && (
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title={row.entryType === "VISITOR" ? "Registrar nova visita" : row.entryType === "DELIVERY_PERSON" ? "Registrar nova entrega" : "Registrar serviço realizado"}>
                        <IconButton
                          size="small"
                          aria-label="Registrar movimentação"
                          onClick={() => row.entryType === "SERVICE_PROVIDER" ? openServiceEvent(row) : openEvent(row)}
                          sx={{ bgcolor: "success.main", color: "success.contrastText", width: 38, height: 38, "&:hover": { bgcolor: "success.dark" } }}
                        >
                          {row.entryType === "VISITOR" ? <MeetingRoomOutlinedIcon fontSize="small" /> : row.entryType === "DELIVERY_PERSON" ? <LocalShippingOutlinedIcon fontSize="small" /> : <EngineeringOutlinedIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                  <TableCell>
                    <Avatar
                      variant={isCompanyLinkedPerson ? "rounded" : "circular"}
                      src={
                        isCompanyLinkedPerson
                          ? (row.documentPhotoAvailable && row.documentPhotoOwnedByCurrentUser
                              ? registryDocumentPhotoUrl(row.id, "document", row.updatedAt ?? row.createdAt)
                              : undefined)
                          : (row.photoAvailable && row.photoOwnedByCurrentUser
                              ? registryEntryPhotoUrl(row.id, row.updatedAt ?? row.createdAt)
                              : undefined)
                      }
                      alt={isCompanyLinkedPerson ? `Documento de ${row.name}` : row.name}
                      sx={{ width: isCompanyLinkedPerson ? 56 : 40, height: 40 }}
                    >
                      {isCompanyLinkedPerson ? <BadgeOutlinedIcon fontSize="small" /> : row.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.6} alignItems="center">
                      <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                      {row.entryType === "RESIDENT" && row.poolCardAvailable && (
                        <Tooltip title={row.poolCardValid ? `Carteirinha de piscina válida${row.poolCardValidUntil ? ` até ${new Date(`${row.poolCardValidUntil}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}` : "Carteirinha de piscina fora da validade"}>
                          {row.poolCardValid ? <CheckCircleOutlineIcon sx={{ color: "text.disabled", fontSize: 17 }} /> : <ErrorOutlineIcon sx={{ color: "text.disabled", fontSize: 17 }} />}
                        </Tooltip>
                      )}
                    </Stack>
                    {row.ownerName && row.entryType !== "PET" && (
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        Responsável: {row.ownerName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{isCompanyLinkedPerson ? (row.serviceCompanyName || row.company || "-") : unitLabel(row)}</TableCell>
                  {type === "RESIDENT" && (
                    <TableCell align="center">
                      <Chip size="small" label={row.unitOwner ? "Sim" : "Não"} color={row.unitOwner ? "primary" : "default"} variant={row.unitOwner ? "filled" : "outlined"} />
                    </TableCell>
                  )}
                  {type === "VEHICLE" && (
                    <TableCell align="center">
                      <Chip size="small" label={row.parkingSpaceRented ? "Sim" : "Não"} color={row.parkingSpaceRented ? "warning" : "default"} variant={row.parkingSpaceRented ? "filled" : "outlined"} />
                    </TableCell>
                  )}
                  {showDetailsColumn && <TableCell>{detailsLabel(row)}</TableCell>}
                  <TableCell align="center">
                    <Chip size="small" label={row.active ? "Ativo" : "Inativo"} variant={row.active ? "filled" : "outlined"} />
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    {(!isProtectedRegistryType(row.entryType) || canManageProtectedRegistry) && (
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(row)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {row.entryType === "RESIDENT" && (
                      <Tooltip title="Visualizar apartamento e histórico">
                        <IconButton size="small" onClick={() => void openUnitSummary(row)}>
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {(row.entryType === "VISITOR" || row.entryType === "DELIVERY_PERSON" || row.entryType === "SERVICE_PROVIDER") && (
                      <Tooltip title="Ver histórico">
                        <IconButton size="small" onClick={() => void openHistory(row)}>
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {(!isProtectedRegistryType(row.entryType) || canManageProtectedRegistry) && (
                      <Tooltip title="Excluir">
                        <IconButton size="small" onClick={() => void remove(row)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalRows}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 50]}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
        </>}
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          closeCamera();
          setDialogOpen(false);
          setEditingId(null);
          setRegisterNow(false);
          resetPhotoSelection();
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{editingId ? "Editar cadastro" : "Novo cadastro"} — {selectedLabel}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Box
              sx={{
                gridColumn: { sm: "1 / -1" },
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                gap: 2,
                p: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Avatar src={photoPreview ?? storedPhotoUrl ?? undefined} sx={{ width: 96, height: 96 }}>
                {form.name?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Stack spacing={1} alignItems="flex-start">
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button component="label" variant="outlined" disabled={loading || photoLockedByAnotherAccount}>
                    {photoFile ? "Trocar arquivo" : "Escolher arquivo"}
                    <input hidden type="file" accept="image/jpeg,image/png" onChange={(event) => handlePhotoSelected(event.target.files?.[0])} />
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<PhotoCameraIcon />}
                    onClick={() => openCamera("profile")}
                    disabled={loading || photoLockedByAnotherAccount}
                  >
                    Tirar foto
                  </Button>
                  {editingRow?.photoAvailable && editingRow.photoOwnedByCurrentUser && (
                    <Button color="error" variant="text" startIcon={<DeleteForeverIcon />} onClick={() => void removePhoto()} disabled={loading}>
                      Remover foto
                    </Button>
                  )}
                </Stack>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  Escolha uma imagem do computador/celular ou capture pela câmera. JPG ou PNG, até 12 MB. O VSGI redimensiona e compacta automaticamente antes de enviar ao Google Drive.
                </Typography>
                {photoLockedByAnotherAccount && (
                  <Typography variant="caption" color="warning.main">
                    A foto atual pertence ao Drive de outra conta Google.
                  </Typography>
                )}
              </Stack>
            </Box>

            {isCompanyLinkedPerson && (
              <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
                      <Avatar variant="rounded" src={documentPhotoPreview ?? documentStoredUrl ?? undefined} sx={{ width: 120, height: 82, mt: { sm: 0.5 } }}><BadgeOutlinedIcon /></Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={700}>Foto do documento</Typography>
                        <Typography variant="caption" sx={{ opacity: .75, display: "block" }}>
                          Pode ser CPF, CNH, RG/Identidade ou outro documento com número de identificação.
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                          <Button component="label" size="small" variant="outlined">
                            Escolher arquivo
                            <input hidden type="file" accept="image/jpeg,image/png" onChange={(event) => handleDocumentPhotoSelected(event.target.files?.[0])} />
                          </Button>
                          <Button size="small" variant="outlined" startIcon={<PhotoCameraIcon />} onClick={() => openCamera("document")}>Tirar foto</Button>
                          {editingId && editingRow?.documentPhotoAvailable && editingRow.documentPhotoOwnedByCurrentUser && (
                            <Button size="small" color="error" onClick={() => void removeDocumentPhoto()}>Remover</Button>
                          )}
                        </Stack>
                        <Typography variant="caption" sx={{ opacity: .7, display: "block", mt: 0.5 }}>
                          A foto será armazenada como comprovante. Digite o número manualmente no campo Documento abaixo.
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            )}

            <TextField
              label={
                type === "PET" ? "Nome do pet" :
                type === "VEHICLE" ? "Descrição do veículo" :
                type === "BICYCLE" ? "Descrição da bicicleta" :
                type === "SERVICE_PROVIDER" ? "Nome do prestador" :
                type === "DELIVERY_PERSON" ? "Nome do entregador" :
                "Nome completo"
              }
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              required
              fullWidth
              sx={type === "VISITOR" ? { gridColumn: { sm: "1 / -1" } } : undefined}
            />

            {(type === "RESIDENT" || type === "DELIVERY_PERSON" || type === "VISITOR" || type === "SERVICE_PROVIDER") && (
              <TextField label="Documento" value={form.document ?? ""} onChange={(e) => setField("document", e.target.value)} fullWidth />
            )}
            {(type === "RESIDENT" || type === "DELIVERY_PERSON" || type === "VISITOR" || type === "SERVICE_PROVIDER") && (
              <TextField label="Telefone" value={form.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} fullWidth />
            )}
            {(type === "RESIDENT" || type === "SERVICE_PROVIDER" || type === "DELIVERY_PERSON") && (
              <TextField label="E-mail" type="email" value={form.email ?? ""} onChange={(e) => setField("email", e.target.value)} fullWidth />
            )}
            {type === "RESIDENT" && (
              <>
                <FormControlLabel
                  control={<Switch checked={Boolean(form.unitOwner)} onChange={(e) => setField("unitOwner", e.target.checked)} />}
                  label="Proprietário da unidade"
                />
                <TextField
                  label="Data de nascimento"
                  type="date"
                  value={form.birthDate ?? ""}
                  onChange={(e) => setField("birthDate", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField label="Profissão" value={form.profession ?? ""} onChange={(e) => setField("profession", e.target.value)} fullWidth />
                <FormControlLabel
                  control={<Switch checked={Boolean(form.pne)} onChange={(e) => setField("pne", e.target.checked)} />}
                  label="PNE"
                />
                <Box sx={{ gridColumn: { sm: "1 / -1" }, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(form.residentAccessEnabled)}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setForm(current => ({
                            ...current,
                            residentAccessEnabled: enabled,
                            residentUsername: enabled && !(current.residentUsername ?? "").trim()
                              ? defaultUnitUsername(current.block, current.apartment)
                              : current.residentUsername,
                            residentPassword: enabled && !Boolean(current.residentAccessEnabled) && !(current.residentPassword ?? "")
                              ? generateTemporaryPassword()
                              : current.residentPassword,
                          }));
                        }}
                      />
                    }
                    label="Liberar acesso de visualização da unidade"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: form.residentAccessEnabled ? 1.5 : 0 }}>
                    O acesso pertence ao bloco/apartamento e é compartilhado pelos moradores da ocupação atual. Ao encerrar a ocupação, ele é revogado.
                  </Typography>
                  {form.residentAccessEnabled && (
                    <Stack spacing={1.5}>
                      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                        <TextField
                          label="Usuário da unidade"
                          value={form.residentUsername ?? ""}
                          onChange={(e) => setField("residentUsername", e.target.value)}
                          required
                          helperText="Sugestão: bloco + apartamento (ex.: 2608). O morador poderá alterar depois."
                        />
                        <TextField
                          label={editingId ? "Nova senha (opcional)" : "Senha temporária"}
                          type="text"
                          value={form.residentPassword ?? ""}
                          onChange={(e) => setField("residentPassword", e.target.value)}
                          required={!editingId}
                          helperText={editingId ? "A senha atual não é exibida. Digite ou gere uma nova senha para redefinir." : "Senha temporária visível para ser repassada ao morador. Mínimo de 8 caracteres."}
                          InputProps={{
                            endAdornment: (
                              <Button
                                size="small"
                                startIcon={<AutorenewRoundedIcon />}
                                onClick={() => setField("residentPassword", generateTemporaryPassword())}
                                sx={{ whiteSpace: "nowrap" }}
                              >
                                Gerar
                              </Button>
                            ),
                          }}
                        />
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(form.residentCredentialEmailEnabled)}
                            onChange={(e) => setField("residentCredentialEmailEnabled", e.target.checked)}
                          />
                        }
                        label="Enviar novas credenciais por e-mail para os condôminos desta unidade"
                      />
                      <Typography variant="caption" color="text.secondary">
                        Inicia desabilitado. O envio só ocorrerá se a opção geral de e-mails de credenciais também estiver habilitada em Configurações. Uma senha criada ou redefinida pela administração será marcada para troca obrigatória no primeiro acesso.
                      </Typography>
                    </Stack>
                  )}
                </Box>
              </>
            )}
            {isCompanyLinkedPerson && (
              <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                <Autocomplete
                  options={serviceCompanies.filter((company) => company.active || company.id === form.serviceCompanyId)}
                  value={serviceCompanies.find((company) => company.id === form.serviceCompanyId) ?? null}
                  onChange={(_, company) => setField("serviceCompanyId", company?.id ?? null)}
                  onInputChange={(_, value) => setServiceCompanySearch(value)}
                  getOptionLabel={(company) => [company.name, company.tradeName].filter(Boolean).join(" — ")}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={isDeliveryPerson ? "Empresa / Transportadora" : "Empresa prestadora"}
                      placeholder="Digite para pesquisar a empresa"
                      required
                    />
                  )}
                  noOptionsText="Nenhuma empresa encontrada. Cadastre uma nova empresa abaixo."
                />
                <Button
                  size="small"
                  variant="text"
                  startIcon={<AddIcon />}
                  onClick={openNewServiceCompany}
                  sx={{ mt: 0.5, px: 0.5, textTransform: "none" }}
                >
                  Cadastrar nova empresa
                </Button>
              </Box>
            )}
            {(type === "BICYCLE" || type === "PET" || type === "VEHICLE") && (
              <TextField label="Proprietário / Responsável" value={form.ownerName ?? ""} onChange={(e) => setField("ownerName", e.target.value)} fullWidth />
            )}
            {(type === "BICYCLE" || type === "VEHICLE") && (
              <>
                <TextField label="Marca" value={form.brand ?? ""} onChange={(e) => setField("brand", e.target.value)} fullWidth />
                <TextField label="Modelo" value={form.model ?? ""} onChange={(e) => setField("model", e.target.value)} fullWidth />
                <TextField label="Cor" value={form.color ?? ""} onChange={(e) => setField("color", e.target.value)} fullWidth />
                <TextField label={type === "VEHICLE" ? "Placa" : "Tag / Nº de série"} value={form.identifier ?? ""} onChange={(e) => setField("identifier", e.target.value.toUpperCase())} fullWidth />
              </>
            )}
            {type === "PET" && (
              <>
                <TextField label="Porte" value={form.petSize ?? ""} onChange={(e) => setField("petSize", e.target.value)} fullWidth />
                <TextField label="Espécie" value={form.species ?? ""} onChange={(e) => setField("species", e.target.value)} fullWidth />
                <TextField label="Raça" value={form.breed ?? ""} onChange={(e) => setField("breed", e.target.value)} fullWidth />
                <TextField label="Cor" value={form.color ?? ""} onChange={(e) => setField("color", e.target.value)} fullWidth />
              </>
            )}
            <>
              <Autocomplete
                options={Array.from(new Set(residentialUnits.map((u) => u.block))).sort((a,b) => a.localeCompare(b, "pt-BR", { numeric: true }))}
                value={form.block || null}
                onChange={(_, value) => setForm((current) => ({ ...current, block: value || "", apartment: residentialUnits.some(u => u.block === value && u.apartment === current.apartment) ? current.apartment : "" }))}
                renderInput={(params) => <TextField {...params} label="Bloco" placeholder="Digite para pesquisar" required={form.active} />}
                noOptionsText="Nenhum bloco cadastrado"
              />
              <Autocomplete
                options={residentialUnits.filter((u) => !form.block || u.block === form.block).map((u) => u.apartment).filter((v,i,a) => a.indexOf(v) === i).sort((a,b) => a.localeCompare(b, "pt-BR", { numeric: true }))}
                value={form.apartment || null}
                onChange={(_, value) => setField("apartment", value || "")}
                renderInput={(params) => <TextField {...params} label="Apartamento" placeholder="Digite para pesquisar" required={form.active} />}
                noOptionsText={form.block ? "Nenhum apartamento cadastrado neste bloco" : "Selecione o bloco primeiro"}
                disabled={!form.block}
              />
            </>
            {type === "VEHICLE" && (
              <>
                <TextField label="Vaga" value={form.parkingSpace ?? ""} onChange={(e) => setField("parkingSpace", e.target.value)} fullWidth />
                <FormControlLabel
                  control={<Switch checked={Boolean(form.parkingSpaceRented)} onChange={(e) => setField("parkingSpaceRented", e.target.checked)} />}
                  label="Vaga alugada/cedida"
                />
                {form.parkingSpaceRented && (
                  <TextField
                    label="Detalhes da vaga alugada/cedida"
                    placeholder="Ex.: Vaga alugada do Bloco 4 Apto 706"
                    value={form.parkingSpaceRentalNotes ?? ""}
                    onChange={(e) => setField("parkingSpaceRentalNotes", e.target.value)}
                    fullWidth
                    sx={{ gridColumn: { sm: "1 / -1" } }}
                  />
                )}
              </>
            )}

            <TextField label="Observações" value={form.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} multiline minRows={2} fullWidth sx={{ gridColumn: { sm: "1 / -1" } }} />
            <FormControlLabel control={<Switch checked={form.active} onChange={(e) => setField("active", e.target.checked)} />} label="Cadastro ativo" />

            {!editingId && isAccessPerson && (
              <Box sx={{ gridColumn: { sm: "1 / -1" }, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
                <FormControlLabel
                  control={<Switch checked={registerNow} onChange={(e) => setRegisterNow(e.target.checked)} />}
                  label={type === "VISITOR" ? "Cadastrar e registrar esta visita agora" : "Cadastrar e registrar esta entrega agora"}
                />
                {registerNow && (
                  <Box sx={{ mt: 1.5, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <Autocomplete options={Array.from(new Set(residentialUnits.map((u) => u.block))).sort((a,b) => a.localeCompare(b, "pt-BR", { numeric: true }))} value={quickAccess.block || null} onChange={(_, value) => setQuickAccess((v) => ({ ...v, block: value || "", apartment: residentialUnits.some(u => u.block === value && u.apartment === v.apartment) ? v.apartment : "" }))} renderInput={(params) => <TextField {...params} label="Bloco de destino" placeholder="Digite para pesquisar" required />} noOptionsText="Nenhum bloco cadastrado" />
                    <Autocomplete options={residentialUnits.filter((u) => !quickAccess.block || u.block === quickAccess.block).map((u) => u.apartment).filter((v,i,a) => a.indexOf(v) === i).sort((a,b) => a.localeCompare(b, "pt-BR", { numeric: true }))} value={quickAccess.apartment || null} onChange={(_, value) => setQuickAccess((v) => ({ ...v, apartment: value || "" }))} renderInput={(params) => <TextField {...params} label="Apartamento de destino" placeholder="Digite para pesquisar" required />} disabled={!quickAccess.block} noOptionsText={quickAccess.block ? "Nenhum apartamento cadastrado neste bloco" : "Selecione o bloco primeiro"} />
                    <TextField label="Data e hora" type="datetime-local" value={quickAccess.dateTime} onChange={(e) => setQuickAccess((v) => ({ ...v, dateTime: e.target.value }))} InputLabelProps={{ shrink: true }} />
                    {type === "DELIVERY_PERSON" && (
                      <FormControlLabel control={<Switch checked={quickAccess.authorizedToEnter} onChange={(e) => setQuickAccess((v) => ({ ...v, authorizedToEnter: e.target.checked }))} />} label="Entregador autorizado a entrar" />
                    )}
                    <TextField label="Observação da movimentação" value={quickAccess.notes} onChange={(e) => setQuickAccess((v) => ({ ...v, notes: e.target.value }))} fullWidth sx={{ gridColumn: { sm: "1 / -1" } }} />
                  </Box>
                )}
              </Box>
            )}
            {!editingId && isServiceProvider && (
              <Box sx={{ gridColumn: { sm: "1 / -1" }, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
                <FormControlLabel control={<Switch checked={registerNow} onChange={(e) => setRegisterNow(e.target.checked)} />} label="Cadastrar e registrar o serviço de hoje agora" />
                {registerNow && (
                  <Box sx={{ mt: 1.5, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <FormControlLabel control={<Switch checked={quickService.scope === "CONDOMINIUM"} onChange={(e) => setQuickService(v => ({ ...v, scope: e.target.checked ? "CONDOMINIUM" : "UNIT" }))} />} label="Serviço para o condomínio como um todo" />
                    <TextField label="Data e hora" type="datetime-local" value={quickService.dateTime} onChange={(e) => setQuickService(v => ({ ...v, dateTime: e.target.value }))} InputLabelProps={{ shrink: true }} />
                    {quickService.scope === "UNIT" && <>
                      <Autocomplete options={Array.from(new Set(residentialUnits.map((u) => u.block))).sort((a,b) => a.localeCompare(b, "pt-BR", { numeric: true }))} value={quickService.block || null} onChange={(_, value) => setQuickService((v) => ({ ...v, block: value || "", apartment: residentialUnits.some(u => u.block === value && u.apartment === v.apartment) ? v.apartment : "" }))} renderInput={(params) => <TextField {...params} label="Bloco" placeholder="Digite para pesquisar" required />} noOptionsText="Nenhum bloco cadastrado" />
                      <Autocomplete options={residentialUnits.filter((u) => !quickService.block || u.block === quickService.block).map((u) => u.apartment).filter((v,i,a) => a.indexOf(v) === i).sort((a,b) => a.localeCompare(b, "pt-BR", { numeric: true }))} value={quickService.apartment || null} onChange={(_, value) => setQuickService((v) => ({ ...v, apartment: value || "" }))} renderInput={(params) => <TextField {...params} label="Apartamento" placeholder="Digite para pesquisar" required />} disabled={!quickService.block} noOptionsText={quickService.block ? "Nenhum apartamento cadastrado neste bloco" : "Selecione o bloco primeiro"} />
                    </>}
                    <TextField label="Serviço realizado" value={quickService.serviceDescription} onChange={(e) => setQuickService(v => ({ ...v, serviceDescription: e.target.value }))} required sx={{ gridColumn: { sm: "1 / -1" } }} />
                    <TextField label="Observações" value={quickService.notes} onChange={(e) => setQuickService(v => ({ ...v, notes: e.target.value }))} multiline minRows={2} sx={{ gridColumn: { sm: "1 / -1" } }} />
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { closeCamera(); setDialogOpen(false); setEditingId(null); setRegisterNow(false); resetPhotoSelection(); }}>Cancelar</Button>
          <Button onClick={() => void save()} variant="contained" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={newCompanyDialogOpen}
        onClose={() => !newCompanySaving && setNewCompanyDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Nova empresa prestadora</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            A empresa será cadastrada sem fechar o prestador atual. Depois de salvar, ela ficará selecionada automaticamente.
          </Typography>
          {newCompanyError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setNewCompanyError(null)}>
              {newCompanyError}
            </Alert>
          )}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField
              label="Razão social / Nome *"
              value={newCompanyForm.name}
              onChange={(e) => setNewCompanyField("name", e.target.value)}
              required
              autoFocus
            />
            <TextField
              label="Nome fantasia"
              value={newCompanyForm.tradeName ?? ""}
              onChange={(e) => setNewCompanyField("tradeName", e.target.value)}
            />
            <TextField
              label="CNPJ / Documento"
              value={newCompanyForm.documentNumber ?? ""}
              onChange={(e) => setNewCompanyField("documentNumber", e.target.value)}
            />
            <TextField
              label="Responsável / Contato"
              value={newCompanyForm.contactName ?? ""}
              onChange={(e) => setNewCompanyField("contactName", e.target.value)}
            />
            <TextField
              label="Telefone"
              value={newCompanyForm.phone ?? ""}
              onChange={(e) => setNewCompanyField("phone", e.target.value)}
            />
            <TextField
              label="E-mail"
              type="email"
              value={newCompanyForm.email ?? ""}
              onChange={(e) => setNewCompanyField("email", e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCompanyDialogOpen(false)} disabled={newCompanySaving}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveNewServiceCompany()} disabled={newCompanySaving}>
            {newCompanySaving ? "Salvando..." : "Salvar e selecionar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cameraOpen} onClose={closeCamera} fullWidth maxWidth="sm">
        <DialogTitle>
          {cameraTarget === "profile"
            ? `Capturar foto do ${isDeliveryPerson ? "entregador" : isServiceProvider ? "prestador" : "cadastro"}`
            : "Capturar foto do documento"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {cameraError && <Alert severity="warning">{cameraError}</Alert>}
            {cameraLoading && <LinearProgress />}
            <Box
              sx={{
                width: "100%",
                minHeight: 260,
                bgcolor: "black",
                borderRadius: 1,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", maxHeight: 420, objectFit: "cover" }}
              />
            </Box>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              {cameraTarget === "profile"
                ? "Centralize o rosto e clique em Capturar foto. No primeiro uso, o navegador solicitará permissão para acessar a câmera."
                : "Enquadre o documento inteiro, com boa iluminação e texto legível, e clique em Capturar foto."}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCamera}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<PhotoCameraIcon />}
            onClick={captureCameraPhoto}
            disabled={cameraLoading || Boolean(cameraError)}
          >
            Capturar foto
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={eventDialogOpen} onClose={() => setEventDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {eventRow?.entryType === "VISITOR" ? "Registrar visita" : "Registrar entrega"}
          {eventRow ? ` — ${eventRow.name}` : ""}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Autocomplete options={Array.from(new Set(residentialUnits.map((u) => u.block))).sort((a,b) => a.localeCompare(b, "pt-BR", { numeric: true }))} value={eventForm.block || null} onChange={(_, value) => setEventForm((v) => ({ ...v, block: value || "", apartment: residentialUnits.some(u => u.block === value && u.apartment === v.apartment) ? v.apartment : "" }))} renderInput={(params) => <TextField {...params} label="Bloco de destino" placeholder="Digite para pesquisar" required autoFocus />} noOptionsText="Nenhum bloco cadastrado" />
            <Autocomplete options={residentialUnits.filter((u) => !eventForm.block || u.block === eventForm.block).map((u) => u.apartment).filter((v,i,a) => a.indexOf(v) === i).sort((a,b) => a.localeCompare(b, "pt-BR", { numeric: true }))} value={eventForm.apartment || null} onChange={(_, value) => setEventForm((v) => ({ ...v, apartment: value || "" }))} renderInput={(params) => <TextField {...params} label="Apartamento de destino" placeholder="Digite para pesquisar" required />} disabled={!eventForm.block} noOptionsText={eventForm.block ? "Nenhum apartamento cadastrado neste bloco" : "Selecione o bloco primeiro"} />
            <TextField label="Data e hora" type="datetime-local" value={eventForm.dateTime} onChange={(e) => setEventForm((v) => ({ ...v, dateTime: e.target.value }))} InputLabelProps={{ shrink: true }} />
            {eventRow?.entryType === "DELIVERY_PERSON" && (
              <FormControlLabel control={<Switch checked={eventForm.authorizedToEnter} onChange={(e) => setEventForm((v) => ({ ...v, authorizedToEnter: e.target.checked }))} />} label="Autorizado a entrar" />
            )}
            <TextField label="Observações" value={eventForm.notes} onChange={(e) => setEventForm((v) => ({ ...v, notes: e.target.value }))} multiline minRows={2} sx={{ gridColumn: { sm: "1 / -1" } }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveEvent()} disabled={loading}>{loading ? "Registrando..." : "Registrar"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={serviceDialogOpen} onClose={() => setServiceDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Registrar serviço{serviceRow ? ` — ${serviceRow.name}` : ""}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControlLabel
              control={<Switch checked={serviceForm.scope === "CONDOMINIUM"} onChange={(e) => setServiceForm(v => ({ ...v, scope: e.target.checked ? "CONDOMINIUM" : "UNIT" }))} />}
              label="Serviço para o condomínio como um todo"
            />
            {serviceForm.scope === "UNIT" && (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <Autocomplete options={Array.from(new Set(residentialUnits.map((u) => u.block))).sort((a,b) => a.localeCompare(b, "pt-BR", { numeric: true }))} value={serviceForm.block || null} onChange={(_, value) => setServiceForm((v) => ({ ...v, block: value || "", apartment: residentialUnits.some(u => u.block === value && u.apartment === v.apartment) ? v.apartment : "" }))} renderInput={(params) => <TextField {...params} label="Bloco" placeholder="Digite para pesquisar" required autoFocus />} noOptionsText="Nenhum bloco cadastrado" />
                <Autocomplete options={residentialUnits.filter((u) => !serviceForm.block || u.block === serviceForm.block).map((u) => u.apartment).filter((v,i,a) => a.indexOf(v) === i).sort((a,b) => a.localeCompare(b, "pt-BR", { numeric: true }))} value={serviceForm.apartment || null} onChange={(_, value) => setServiceForm((v) => ({ ...v, apartment: value || "" }))} renderInput={(params) => <TextField {...params} label="Apartamento" placeholder="Digite para pesquisar" required />} disabled={!serviceForm.block} noOptionsText={serviceForm.block ? "Nenhum apartamento cadastrado neste bloco" : "Selecione o bloco primeiro"} />
              </Box>
            )}
            <TextField label="Data e hora" type="datetime-local" value={serviceForm.dateTime} onChange={(e) => setServiceForm(v => ({ ...v, dateTime: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField label="Serviço realizado" value={serviceForm.serviceDescription} onChange={(e) => setServiceForm(v => ({ ...v, serviceDescription: e.target.value }))} required />
            <TextField label="Observações" value={serviceForm.notes} onChange={(e) => setServiceForm(v => ({ ...v, notes: e.target.value }))} multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServiceDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={() => void saveServiceEvent()} disabled={loading}>{loading ? "Registrando..." : "Registrar serviço"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          Histórico — {historyRow?.name || "Cadastro"}
        </DialogTitle>
        <DialogContent>
          {historyLoading && <Typography sx={{ py: 3 }}>Carregando histórico...</Typography>}
          {!historyLoading && historyRow?.entryType === "VISITOR" && <VisitHistory rows={visitorHistory} />}
          {!historyLoading && historyRow?.entryType === "DELIVERY_PERSON" && <DeliveryHistory rows={deliveryHistory} />}
          {!historyLoading && historyRow?.entryType === "SERVICE_PROVIDER" && <ServiceHistory rows={serviceHistory} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={condominiumServiceDialogOpen} onClose={() => setCondominiumServiceDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Histórico de serviços para o condomínio</DialogTitle>
        <DialogContent>
          {historyLoading ? <Typography sx={{ py: 3 }}>Carregando histórico...</Typography> : <ServiceHistory rows={condominiumServiceHistory} title="Serviços gerais do condomínio" />}
        </DialogContent>
        <DialogActions><Button onClick={() => setCondominiumServiceDialogOpen(false)}>Fechar</Button></DialogActions>
      </Dialog>

      <Dialog open={unitDialogOpen} onClose={() => setUnitDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>
          {unitSummary ? `Apartamento — Bloco ${unitSummary.block} Apto ${unitSummary.apartment}` : "Carregando apartamento..."}
        </DialogTitle>
        <DialogContent>
          {unitLoading && <Typography sx={{ py: 3 }}>Carregando dados da unidade...</Typography>}
          {unitSummary && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Card variant="outlined" sx={{ bgcolor: "action.hover" }}>
                <CardContent>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", md: "center" }}
                    spacing={2}
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {unitSummary.selectedOccupancy ? "Ocupação selecionada" : "Sem ocupação cadastrada"}
                      </Typography>
                      {unitSummary.selectedOccupancy ? (
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                          <Chip
                            size="small"
                            color={occupancyStatusColor(unitSummary.selectedOccupancy.status)}
                            label={occupancyStatusLabel(unitSummary.selectedOccupancy.status)}
                          />
                          <Typography variant="body2">
                            Entrada: <strong>{formatDateOnly(unitSummary.selectedOccupancy.startDate)}</strong>
                          </Typography>
                          <Typography variant="body2">
                            Saída: <strong>{unitSummary.selectedOccupancy.endDate
                              ? formatDateOnly(unitSummary.selectedOccupancy.endDate)
                              : unitSummary.selectedOccupancy.status === "SCHEDULED"
                                ? "Ainda não iniciada"
                                : "Atual"}</strong>
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
                          Crie uma nova ocupação para vincular os próximos condôminos, veículos, pets e bicicletas.
                        </Typography>
                      )}
                    </Box>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      {canManageProtectedRegistry && unitSummary.selectedOccupancy?.status === "ACTIVE" && (
                        <Button color="warning" variant="outlined" onClick={() => openOccupancyAction("end")}>
                          Encerrar ocupação
                        </Button>
                      )}
                      {canManageProtectedRegistry && !unitSummary.occupancies.some((item) => item.status === "ACTIVE" || item.status === "SCHEDULED") && (
                        <Button color="success" variant="contained" startIcon={<AddIcon />} onClick={() => openOccupancyAction("start")}>
                          Nova ocupação
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              {unitSummary.occupancies.length > 0 && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      Histórico de ocupações ({unitSummary.occupancies.length})
                    </Typography>
                    <Stack spacing={1} divider={<Divider flexItem />}>
                      {unitSummary.occupancies.map((occupancy) => (
                        <Stack
                          key={occupancy.id}
                          direction={{ xs: "column", sm: "row" }}
                          alignItems={{ xs: "stretch", sm: "center" }}
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Chip
                                size="small"
                                color={occupancyStatusColor(occupancy.status)}
                                label={occupancyStatusLabel(occupancy.status, true)}
                              />
                              <Typography variant="body2" fontWeight={600}>
                                {formatDateOnly(occupancy.startDate)} até {occupancy.endDate
                                  ? formatDateOnly(occupancy.endDate)
                                  : occupancy.status === "SCHEDULED"
                                    ? "agendada"
                                    : "hoje"}
                              </Typography>
                            </Stack>
                            {occupancy.notes && (
                              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                {occupancy.notes}
                              </Typography>
                            )}
                          </Box>
                          <Button
                            size="small"
                            variant={unitSummary.selectedOccupancy?.id === occupancy.id ? "contained" : "text"}
                            startIcon={<VisibilityOutlinedIcon />}
                            onClick={() => void selectOccupancy(occupancy)}
                            disabled={unitLoading}
                          >
                            {unitSummary.selectedOccupancy?.id === occupancy.id ? "Visualizando" : "Visualizar"}
                          </Button>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Os cadastros abaixo pertencem à ocupação selecionada. Encomendas, visitas, entregas e serviços realizados são preservados e exibidos pelo período dessa ocupação.
              </Typography>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
                <RegistryGroup title="Condôminos" rows={unitSummary.residents} icon={<PeopleAltOutlinedIcon />} iconColor="#1976d2" />
                <RegistryGroup title="Veículos" rows={unitSummary.vehicles} icon={<DirectionsCarOutlinedIcon />} iconColor="#3949ab" />
                <RegistryGroup title="Pets" rows={unitSummary.pets} icon={<PetsOutlinedIcon />} iconColor="#d81b60" />
                <RegistryGroup title="Bicicletas" rows={unitSummary.bicycles} icon={<PedalBikeOutlinedIcon />} iconColor="#0288d1" />
              </Box>
              <SpaceAccessHistory rows={unitSummary.spaceAccesses ?? []} />
              <PackIdHistory rows={unitSummary.packIds ?? []} />
              <VisitHistory rows={unitSummary.visits} />
              <DeliveryHistory rows={unitSummary.deliveries} />
              <ServiceHistory rows={unitSummary.serviceRecords ?? []} title="Serviços realizados na unidade" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnitDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={occupancyDialogOpen} onClose={() => setOccupancyDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {occupancyAction === "start" ? "Nova ocupação" : "Encerrar ocupação"}
          {unitSummary ? ` — Bloco ${unitSummary.block} Apto ${unitSummary.apartment}` : ""}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {occupancyAction === "end" && unitSummary && (
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: "action.hover" }}>
                <Typography variant="body2" fontWeight={600}>
                  Serão inativados os cadastros desta ocupação:
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {unitSummary.residents.length} condômino(s), {unitSummary.vehicles.length} veículo(s), {unitSummary.pets.length} pet(s) e {unitSummary.bicycles.length} bicicleta(s).
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  Encomendas, visitas e entregas não serão apagadas nem inativadas.
                </Typography>
              </Box>
            )}
            <TextField
              label={occupancyAction === "start" ? "Data de entrada" : "Data de saída"}
              type="date"
              value={occupancyDate}
              onChange={(e) => setOccupancyDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={occupancyAction === "end" ? { max: localDateToday() } : undefined}
              helperText={occupancyAction === "start" ? "Pode ser hoje ou uma data futura. Datas futuras ficam como ocupação agendada." : undefined}
              required
              fullWidth
            />
            {occupancyAction === "start" && (
              <TextField
                label="Observação da ocupação"
                value={occupancyNotes}
                onChange={(e) => setOccupancyNotes(e.target.value)}
                multiline
                minRows={2}
                fullWidth
                placeholder="Ex.: novo inquilino, proprietário retornou ao imóvel..."
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOccupancyDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color={occupancyAction === "start" ? "success" : "warning"}
            onClick={() => void saveOccupancyAction()}
            disabled={loading || !occupancyDate}
          >
            {loading ? "Processando..." : occupancyAction === "start" ? "Criar ocupação" : "Encerrar ocupação"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={9000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" variant="filled" onClose={() => setError(null)} sx={{ width: "100%" }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={4500}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSuccessMessage(null)} sx={{ width: "100%" }}>
          {successMessage}
        </Alert>
      </Snackbar>

    </Box>
  );
}
