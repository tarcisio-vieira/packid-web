import { useEffect, useMemo, useState } from "react";
import {
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
  Paper,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
import {
  createDeliveryRecord,
  createRegistryEntry,
  createVisitorVisit,
  deleteRegistryEntry,
  deleteRegistryEntryPhoto,
  fetchDeliveryRecords,
  fetchRegistryEntries,
  fetchUnitRegistrySummary,
  fetchVisitorVisits,
  registryEntryPhotoUrl,
  updateRegistryEntry,
  uploadRegistryEntryPhoto,
} from "../api";
import type {
  DeliveryRecord,
  PackIdRecentItem,
  RegistryEntry,
  RegistryEntryPayload,
  RegistryEntryType,
  UnitRegistrySummary,
  VisitorVisit,
} from "../api";

const TYPES: Array<{ type: RegistryEntryType; label: string }> = [
  { type: "RESIDENT", label: "Condôminos" },
  { type: "DELIVERY_PERSON", label: "Entregadores" },
  { type: "VISITOR", label: "Visitantes" },
  { type: "BICYCLE", label: "Bicicletas" },
  { type: "PET", label: "Pets" },
  { type: "VEHICLE", label: "Veículos" },
];

const emptyPayload = (entryType: RegistryEntryType): RegistryEntryPayload => ({
  entryType,
  name: "",
  document: "",
  phone: "",
  email: "",
  block: "",
  apartment: "",
  company: "",
  ownerName: "",
  brand: "",
  model: "",
  color: "",
  identifier: "",
  species: "",
  breed: "",
  parkingSpace: "",
  notes: "",
  active: true,
});

type AccessForm = {
  block: string;
  apartment: string;
  dateTime: string;
  notes: string;
  authorizedToEnter: boolean;
};

function localDateTimeNow(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
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

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function unitLabel(entry: RegistryEntry): string {
  const parts = [];
  if (entry.block) parts.push(`Bloco ${entry.block}`);
  if (entry.apartment) parts.push(`Apto ${entry.apartment}`);
  return parts.join(" / ") || "-";
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
      return entry.company || "-";
    case "VISITOR":
      return entry.phone || entry.document || "-";
    case "BICYCLE":
    case "VEHICLE":
      return [entry.brand, entry.model, entry.color].filter(Boolean).join(" • ") || "-";
    case "PET":
      return [entry.ownerName, entry.breed, entry.color].filter(Boolean).join(" • ") || "-";
    case "RESIDENT":
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
  }).format(date);
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
}: Readonly<{ title: string; rows: RegistryEntry[] }>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {title} ({rows.length})
        </Typography>
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

function VisitHistory({ rows }: Readonly<{ rows: VisitorVisit[] }>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Visitas ({rows.length})
        </Typography>
        <TableContainer sx={{ maxHeight: 260 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Data / hora</TableCell>
                <TableCell>Visitante</TableCell>
                <TableCell>Documento</TableCell>
                <TableCell>Observação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">Nenhuma visita registrada.</TableCell>
                </TableRow>
              )}
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDateTime(row.visitedAt)}</TableCell>
                  <TableCell>{row.visitorName || "-"}</TableCell>
                  <TableCell>{row.visitorDocument || "-"}</TableCell>
                  <TableCell>{row.notes || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

function PackIdHistory({ rows }: Readonly<{ rows: PackIdRecentItem[] }>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Encomendas / PackID ({rows.length})
        </Typography>
        <TableContainer sx={{ maxHeight: 300 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Data / hora</TableCell>
                <TableCell>Código da encomenda</TableCell>
                <TableCell>Condômino</TableCell>
                <TableCell>Observação</TableCell>
                <TableCell>Registrado por</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">Nenhuma encomenda registrada para esta unidade.</TableCell>
                </TableRow>
              )}
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDateTime(row.arrivedAt)}</TableCell>
                  <TableCell>{row.labelPackageCode || row.packageCode || "-"}</TableCell>
                  <TableCell>{row.residentFullName || "-"}</TableCell>
                  <TableCell>{row.observations || "-"}</TableCell>
                  <TableCell>{row.createdBy || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

function DeliveryHistory({ rows }: Readonly<{ rows: DeliveryRecord[] }>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Entregas ({rows.length})
        </Typography>
        <TableContainer sx={{ maxHeight: 260 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Data / hora</TableCell>
                <TableCell>Entregador</TableCell>
                <TableCell>Empresa</TableCell>
                <TableCell>Entrada</TableCell>
                <TableCell>Observação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">Nenhuma entrega registrada.</TableCell>
                </TableRow>
              )}
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDateTime(row.deliveredAt)}</TableCell>
                  <TableCell>{row.deliveryPersonName || "-"}</TableCell>
                  <TableCell>{row.company || "-"}</TableCell>
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
      </CardContent>
    </Card>
  );
}

export default function RegistryScreen() {
  const [type, setType] = useState<RegistryEntryType>("RESIDENT");
  const [rows, setRows] = useState<RegistryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RegistryEntryPayload>(emptyPayload(type));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<RegistryEntry | null>(null);
  const [registerNow, setRegisterNow] = useState(false);
  const [quickAccess, setQuickAccess] = useState<AccessForm>(emptyAccessForm());

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventRow, setEventRow] = useState<RegistryEntry | null>(null);
  const [eventForm, setEventForm] = useState<AccessForm>(emptyAccessForm());

  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [unitLoading, setUnitLoading] = useState(false);
  const [unitSummary, setUnitSummary] = useState<UnitRegistrySummary | null>(null);

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRow, setHistoryRow] = useState<RegistryEntry | null>(null);
  const [visitorHistory, setVisitorHistory] = useState<VisitorVisit[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryRecord[]>([]);

  const loadRows = async (selectedType: RegistryEntryType) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRegistryEntries(selectedType);
      setRows(data);
      setSelectedRow((current) =>
        current ? data.find((item) => item.id === current.id) ?? null : null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar cadastros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedRow(null);
    void loadRows(type);
  }, [type]);

  const visibleRows = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return rows;

    return rows.filter((row) =>
      [
        row.name,
        row.document,
        row.phone,
        row.email,
        row.block,
        row.apartment,
        row.company,
        row.ownerName,
        row.brand,
        row.model,
        row.color,
        row.identifier,
        row.species,
        row.breed,
        row.parkingSpace,
        row.notes,
      ].some((value) => normalize(value).includes(q)),
    );
  }, [rows, search]);

  const editingRow = editingId ? rows.find((row) => row.id === editingId) ?? null : null;
  const photoLockedByAnotherAccount = Boolean(
    editingRow?.photoAvailable && !editingRow.photoOwnedByCurrentUser,
  );
  const storedPhotoUrl =
    editingRow?.photoAvailable && editingRow.photoOwnedByCurrentUser
      ? registryEntryPhotoUrl(editingRow.id, editingRow.updatedAt ?? editingRow.createdAt)
      : null;

  const selectedLabel = TYPES.find((item) => item.type === type)?.label ?? "Cadastros";
  const isAccessPerson = type === "VISITOR" || type === "DELIVERY_PERSON";

  const resetPhotoSelection = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyPayload(type));
    setRegisterNow(false);
    setQuickAccess(emptyAccessForm());
    resetPhotoSelection();
    setDialogOpen(true);
  };

  const openEdit = (row: RegistryEntry) => {
    setEditingId(row.id);
    setSelectedRow(row);
    setRegisterNow(false);
    setQuickAccess(emptyAccessForm());
    resetPhotoSelection();
    setForm({
      entryType: row.entryType,
      name: row.name ?? "",
      document: row.document ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      block: row.block ?? "",
      apartment: row.apartment ?? "",
      company: row.company ?? "",
      ownerName: row.ownerName ?? "",
      brand: row.brand ?? "",
      model: row.model ?? "",
      color: row.color ?? "",
      identifier: row.identifier ?? "",
      species: row.species ?? "",
      breed: row.breed ?? "",
      parkingSpace: row.parkingSpace ?? "",
      notes: row.notes ?? "",
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
    if (file.size > 5 * 1024 * 1024) {
      setError("A foto deve ter no máximo 5 MB.");
      return;
    }
    setError(null);
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const removePhoto = async () => {
    if (!editingId || !editingRow?.photoAvailable) return;
    if (!globalThis.confirm("Remover a foto deste cadastro do Google Drive?")) return;
    setLoading(true);
    setError(null);
    try {
      await deleteRegistryEntryPhoto(editingId);
      resetPhotoSelection();
      await loadRows(type);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao remover a foto.");
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

  const save = async () => {
    if (!form.name.trim()) {
      setError("Informe o nome ou a identificação principal do cadastro.");
      return;
    }
    if (type === "RESIDENT" && (!form.block?.trim() || !form.apartment?.trim())) {
      setError("Para condômino, informe bloco/página e apartamento.");
      return;
    }
    if (registerNow && (!quickAccess.block.trim() || !quickAccess.apartment.trim())) {
      setError("Para registrar a entrada agora, informe bloco e apartamento de destino.");
      return;
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
      if (!editingId && registerNow && isAccessPerson) {
        await registerAccessEvent(saved, quickAccess);
      }

      resetPhotoSelection();
      setDialogOpen(false);
      setEditingId(null);
      setRegisterNow(false);
      await loadRows(type);
      setSelectedRow(saved);
    } catch (e) {
      if (newlyCreatedId) await loadRows(type);
      setError(e instanceof Error ? e.message : "Falha ao salvar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (row: RegistryEntry) => {
    if (!globalThis.confirm(`Excluir o cadastro "${row.name}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      await deleteRegistryEntry(row.id);
      if (selectedRow?.id === row.id) setSelectedRow(null);
      await loadRows(type);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao excluir cadastro.");
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao registrar movimentação.");
    } finally {
      setLoading(false);
    }
  };

  const openUnitSummary = async (row: RegistryEntry) => {
    if (!row.block || !row.apartment) {
      setError("O condômino precisa ter bloco e apartamento para abrir a visão da unidade.");
      return;
    }
    setSelectedRow(row);
    setUnitDialogOpen(true);
    setUnitLoading(true);
    setUnitSummary(null);
    setError(null);
    try {
      setUnitSummary(await fetchUnitRegistrySummary(row.block, row.apartment));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar dados do apartamento.");
      setUnitDialogOpen(false);
    } finally {
      setUnitLoading(false);
    }
  };

  const openHistory = async (row: RegistryEntry) => {
    if (row.entryType !== "VISITOR" && row.entryType !== "DELIVERY_PERSON") return;
    setHistoryRow(row);
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    setVisitorHistory([]);
    setDeliveryHistory([]);
    setError(null);
    try {
      if (row.entryType === "VISITOR") {
        setVisitorHistory(await fetchVisitorVisits(row.id));
      } else {
        setDeliveryHistory(await fetchDeliveryRecords(row.id));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar histórico.");
      setHistoryDialogOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1500, mx: "auto", mt: 2, mb: 3 }}>
      <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          gap={2}
        >
          <Box>
            <Typography variant="h5">Cadastros do condomínio</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Condôminos, entregadores, visitantes, bicicletas, pets e veículos vinculados ao condomínio.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            Novo cadastro
          </Button>
        </Stack>

        <Tabs
          value={type}
          onChange={(_, value: RegistryEntryType) => {
            setType(value);
            setSearch("");
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mt: 2, borderBottom: 1, borderColor: "divider" }}
        >
          {TYPES.map((item) => (
            <Tab key={item.type} value={item.type} label={item.label} />
          ))}
        </Tabs>

        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Pesquisar em ${selectedLabel.toLowerCase()}...`}
          size="small"
          fullWidth
          sx={{ mt: 2, maxWidth: 620 }}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.55 }} /> }}
        />

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1.5 }}>
            {error}
          </Typography>
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
                    <FieldCard label="Nome / descrição" value={selectedRow.name} />
                    <FieldCard label="Unidade" value={unitLabel(selectedRow)} />
                    <FieldCard label="Documento / identificação" value={identifierLabel(selectedRow)} />
                    <FieldCard label="Telefone" value={selectedRow.phone} />
                    <FieldCard label="Detalhes" value={detailsLabel(selectedRow)} />
                    <FieldCard label="Responsável" value={selectedRow.ownerName} />
                    <FieldCard label="Observações" value={selectedRow.notes} />
                    <FieldCard label="Status" value={selectedRow.active ? "Ativo" : "Inativo"} />
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
                    <Button
                      variant="outlined"
                      startIcon={selectedRow.entryType === "VISITOR" ? <MeetingRoomOutlinedIcon /> : <LocalShippingOutlinedIcon />}
                      onClick={() => openEvent(selectedRow)}
                    >
                      {selectedRow.entryType === "VISITOR" ? "Registrar visita" : "Registrar entrega"}
                    </Button>
                    <Button
                      variant="text"
                      startIcon={<VisibilityOutlinedIcon />}
                      onClick={() => void openHistory(selectedRow)}
                    >
                      Ver histórico
                    </Button>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        <TableContainer sx={{ mt: 2 }}>
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead>
              <TableRow>
                <TableCell width={72}>Foto</TableCell>
                <TableCell>Nome / descrição</TableCell>
                <TableCell>Unidade</TableCell>
                <TableCell>Documento / identificação</TableCell>
                <TableCell>Detalhes</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && visibleRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, opacity: 0.7 }}>
                    Nenhum cadastro encontrado.
                  </TableCell>
                </TableRow>
              )}
              {visibleRows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  selected={selectedRow?.id === row.id}
                  onClick={() => setSelectedRow(row)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <Avatar
                      src={
                        row.photoAvailable && row.photoOwnedByCurrentUser
                          ? registryEntryPhotoUrl(row.id, row.updatedAt ?? row.createdAt)
                          : undefined
                      }
                      alt={row.name}
                      sx={{ width: 40, height: 40 }}
                    >
                      {row.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                    {row.ownerName && row.entryType !== "PET" && (
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        Responsável: {row.ownerName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{unitLabel(row)}</TableCell>
                  <TableCell>{identifierLabel(row)}</TableCell>
                  <TableCell>{detailsLabel(row)}</TableCell>
                  <TableCell>{row.phone || "-"}</TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={row.active ? "Ativo" : "Inativo"} variant={row.active ? "filled" : "outlined"} />
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(row)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {row.entryType === "RESIDENT" && (
                      <Tooltip title="Visualizar apartamento e histórico">
                        <IconButton size="small" onClick={() => void openUnitSummary(row)}>
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {row.entryType === "VISITOR" && (
                      <Tooltip title="Registrar visita">
                        <IconButton size="small" onClick={() => openEvent(row)}>
                          <MeetingRoomOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {row.entryType === "DELIVERY_PERSON" && (
                      <Tooltip title="Registrar entrega">
                        <IconButton size="small" onClick={() => openEvent(row)}>
                          <LocalShippingOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {(row.entryType === "VISITOR" || row.entryType === "DELIVERY_PERSON") && (
                      <Tooltip title="Ver histórico">
                        <IconButton size="small" onClick={() => void openHistory(row)}>
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Excluir">
                      <IconButton size="small" onClick={() => void remove(row)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => {
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
                  <Button component="label" variant="outlined" startIcon={<PhotoCameraIcon />} disabled={loading || photoLockedByAnotherAccount}>
                    {photoFile ? "Trocar foto selecionada" : editingRow?.photoAvailable ? "Trocar foto" : "Selecionar foto"}
                    <input hidden type="file" accept="image/jpeg,image/png" onChange={(event) => handlePhotoSelected(event.target.files?.[0])} />
                  </Button>
                  {editingRow?.photoAvailable && editingRow.photoOwnedByCurrentUser && (
                    <Button color="error" variant="text" startIcon={<DeleteForeverIcon />} onClick={() => void removePhoto()} disabled={loading}>
                      Remover foto
                    </Button>
                  )}
                </Stack>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  JPG ou PNG, até 5 MB. A imagem fica no Google Drive da conta autenticada.
                </Typography>
                {photoLockedByAnotherAccount && (
                  <Typography variant="caption" color="warning.main">
                    A foto atual pertence ao Drive de outra conta Google.
                  </Typography>
                )}
              </Stack>
            </Box>

            <TextField
              label={
                type === "PET" ? "Nome do pet" :
                type === "VEHICLE" ? "Descrição do veículo" :
                type === "BICYCLE" ? "Descrição da bicicleta" :
                "Nome completo"
              }
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              required
              fullWidth
            />

            {(type === "RESIDENT" || type === "DELIVERY_PERSON" || type === "VISITOR") && (
              <TextField label="CPF / Documento" value={form.document ?? ""} onChange={(e) => setField("document", e.target.value)} fullWidth />
            )}
            {(type === "RESIDENT" || type === "DELIVERY_PERSON" || type === "VISITOR") && (
              <TextField label="Telefone" value={form.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} fullWidth />
            )}
            {type === "RESIDENT" && (
              <TextField label="E-mail" type="email" value={form.email ?? ""} onChange={(e) => setField("email", e.target.value)} fullWidth />
            )}
            {type === "DELIVERY_PERSON" && (
              <TextField label="Empresa / Transportadora" value={form.company ?? ""} onChange={(e) => setField("company", e.target.value)} fullWidth />
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
                <TextField label="Espécie" value={form.species ?? ""} onChange={(e) => setField("species", e.target.value)} fullWidth />
                <TextField label="Raça" value={form.breed ?? ""} onChange={(e) => setField("breed", e.target.value)} fullWidth />
                <TextField label="Cor" value={form.color ?? ""} onChange={(e) => setField("color", e.target.value)} fullWidth />
              </>
            )}
            {(type === "RESIDENT" || type === "BICYCLE" || type === "PET" || type === "VEHICLE") && (
              <>
                <TextField label="Bloco" value={form.block ?? ""} onChange={(e) => setField("block", e.target.value)} required={type === "RESIDENT"} fullWidth />
                <TextField label="Apartamento" value={form.apartment ?? ""} onChange={(e) => setField("apartment", e.target.value)} required={type === "RESIDENT"} fullWidth />
              </>
            )}
            {type === "VEHICLE" && (
              <TextField label="Vaga" value={form.parkingSpace ?? ""} onChange={(e) => setField("parkingSpace", e.target.value)} fullWidth />
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
                    <TextField label="Bloco de destino" value={quickAccess.block} onChange={(e) => setQuickAccess((v) => ({ ...v, block: e.target.value }))} required />
                    <TextField label="Apartamento de destino" value={quickAccess.apartment} onChange={(e) => setQuickAccess((v) => ({ ...v, apartment: e.target.value }))} required />
                    <TextField label="Data e hora" type="datetime-local" value={quickAccess.dateTime} onChange={(e) => setQuickAccess((v) => ({ ...v, dateTime: e.target.value }))} InputLabelProps={{ shrink: true }} />
                    {type === "DELIVERY_PERSON" && (
                      <FormControlLabel control={<Switch checked={quickAccess.authorizedToEnter} onChange={(e) => setQuickAccess((v) => ({ ...v, authorizedToEnter: e.target.checked }))} />} label="Entregador autorizado a entrar" />
                    )}
                    <TextField label="Observação da movimentação" value={quickAccess.notes} onChange={(e) => setQuickAccess((v) => ({ ...v, notes: e.target.value }))} fullWidth sx={{ gridColumn: { sm: "1 / -1" } }} />
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogOpen(false); setEditingId(null); setRegisterNow(false); resetPhotoSelection(); }}>Cancelar</Button>
          <Button onClick={() => void save()} variant="contained" disabled={loading}>Salvar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={eventDialogOpen} onClose={() => setEventDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {eventRow?.entryType === "VISITOR" ? "Registrar visita" : "Registrar entrega"}
          {eventRow ? ` — ${eventRow.name}` : ""}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField label="Bloco de destino" value={eventForm.block} onChange={(e) => setEventForm((v) => ({ ...v, block: e.target.value }))} required autoFocus />
            <TextField label="Apartamento de destino" value={eventForm.apartment} onChange={(e) => setEventForm((v) => ({ ...v, apartment: e.target.value }))} required />
            <TextField label="Data e hora" type="datetime-local" value={eventForm.dateTime} onChange={(e) => setEventForm((v) => ({ ...v, dateTime: e.target.value }))} InputLabelProps={{ shrink: true }} />
            {eventRow?.entryType === "DELIVERY_PERSON" && (
              <FormControlLabel control={<Switch checked={eventForm.authorizedToEnter} onChange={(e) => setEventForm((v) => ({ ...v, authorizedToEnter: e.target.checked }))} />} label="Autorizado a entrar" />
            )}
            <TextField label="Observações" value={eventForm.notes} onChange={(e) => setEventForm((v) => ({ ...v, notes: e.target.value }))} multiline minRows={2} sx={{ gridColumn: { sm: "1 / -1" } }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveEvent()} disabled={loading}>Registrar</Button>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={unitDialogOpen} onClose={() => setUnitDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>
          {unitSummary ? `Apartamento — Bloco ${unitSummary.block} / Apto ${unitSummary.apartment}` : "Carregando apartamento..."}
        </DialogTitle>
        <DialogContent>
          {unitLoading && <Typography sx={{ py: 3 }}>Carregando dados da unidade...</Typography>}
          {unitSummary && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
                <RegistryGroup title="Condôminos" rows={unitSummary.residents} />
                <RegistryGroup title="Pets" rows={unitSummary.pets} />
                <RegistryGroup title="Veículos" rows={unitSummary.vehicles} />
                <RegistryGroup title="Bicicletas" rows={unitSummary.bicycles} />
              </Box>
              <PackIdHistory rows={unitSummary.packIds ?? []} />
              <VisitHistory rows={unitSummary.visits} />
              <DeliveryHistory rows={unitSummary.deliveries} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnitDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
