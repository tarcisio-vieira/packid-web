import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  FormControlLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import {
  createRegistryEntry,
  deleteRegistryEntry,
  deleteRegistryEntryPhoto,
  fetchRegistryEntries,
  registryEntryPhotoUrl,
  updateRegistryEntry,
  uploadRegistryEntryPhoto,
} from "../api";
import type {
  RegistryEntry,
  RegistryEntryPayload,
  RegistryEntryType,
} from "../api";

const TYPES: Array<{ type: RegistryEntryType; label: string }> = [
  { type: "RESIDENT", label: "Condôminos" },
  { type: "DELIVERY_PERSON", label: "Entregadores" },
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
  if (entry.entryType === "VEHICLE") return entry.identifier || "-";
  if (entry.entryType === "BICYCLE") return entry.identifier || "-";
  if (entry.entryType === "PET") return entry.species || "-";
  return entry.document || "-";
}

function detailsLabel(entry: RegistryEntry): string {
  switch (entry.entryType) {
    case "DELIVERY_PERSON":
      return entry.company || "-";
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

  const loadRows = async (selectedType: RegistryEntryType) => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchRegistryEntries(selectedType));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar cadastros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const editingRow = editingId
    ? rows.find((row) => row.id === editingId) ?? null
    : null;
  const photoLockedByAnotherAccount = Boolean(
    editingRow?.photoAvailable && !editingRow.photoOwnedByCurrentUser,
  );
  const storedPhotoUrl =
    editingRow?.photoAvailable && editingRow.photoOwnedByCurrentUser
      ? registryEntryPhotoUrl(
          editingRow.id,
          editingRow.updatedAt ?? editingRow.createdAt,
        )
      : null;

  const resetPhotoSelection = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyPayload(type));
    resetPhotoSelection();
    setDialogOpen(true);
  };

  const openEdit = (row: RegistryEntry) => {
    setEditingId(row.id);
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
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePhotoSelected = (file?: File) => {
    if (!file) return;

    if (!(["image/jpeg", "image/png"] as string[]).includes(file.type)) {
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

  const save = async () => {
    if (!form.name.trim()) {
      setError("Informe o nome ou a identificação principal do cadastro.");
      return;
    }

    if (type === "RESIDENT" && (!form.block?.trim() || !form.apartment?.trim())) {
      setError("Para condômino, informe bloco/página e apartamento.");
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
        setEditingId(saved.id);
      }

      if (photoFile) {
        saved = await uploadRegistryEntryPhoto(saved.id, photoFile);
      }

      resetPhotoSelection();
      setDialogOpen(false);
      setEditingId(null);
      await loadRows(type);
    } catch (e) {
      if (newlyCreatedId) {
        await loadRows(type);
        setError(
          `Cadastro salvo, mas não foi possível gravar a foto no Google Drive. ${
            e instanceof Error ? e.message : ""
          }`.trim(),
        );
      } else {
        setError(e instanceof Error ? e.message : "Falha ao salvar cadastro.");
      }
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
      await loadRows(type);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao excluir cadastro.");
    } finally {
      setLoading(false);
    }
  };

  const selectedLabel = TYPES.find((item) => item.type === type)?.label ?? "Cadastros";

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", mt: 2, mb: 3 }}>
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
              Condôminos, entregadores, bicicletas, pets e veículos vinculados ao condomínio.
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
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.55 }} />,
          }}
        />

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1.5 }}>
            {error}
          </Typography>
        )}

        <TableContainer sx={{ mt: 2 }}>
          <Table size="small" sx={{ minWidth: 900 }}>
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
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Tooltip
                      title={
                        row.photoAvailable && !row.photoOwnedByCurrentUser
                          ? "Foto armazenada no Google Drive de outra conta"
                          : row.photoAvailable
                            ? "Foto armazenada no Google Drive"
                            : "Sem foto"
                      }
                    >
                      <Avatar
                        src={
                          row.photoAvailable && row.photoOwnedByCurrentUser
                            ? registryEntryPhotoUrl(
                                row.id,
                                row.updatedAt ?? row.createdAt,
                              )
                            : undefined
                        }
                        alt={row.name}
                        sx={{ width: 40, height: 40 }}
                      >
                        {row.name?.charAt(0)?.toUpperCase()}
                      </Avatar>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {row.name}
                    </Typography>
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
                    <Chip
                      size="small"
                      label={row.active ? "Ativo" : "Inativo"}
                      variant={row.active ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(row)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
          resetPhotoSelection();
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {editingId ? "Editar cadastro" : "Novo cadastro"} — {selectedLabel}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              mt: 1,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
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
              <Avatar
                src={photoPreview ?? storedPhotoUrl ?? undefined}
                alt={form.name || "Foto do cadastro"}
                sx={{ width: 96, height: 96 }}
              >
                {form.name?.charAt(0)?.toUpperCase()}
              </Avatar>

              <Stack spacing={1} alignItems="flex-start">
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<PhotoCameraIcon />}
                    disabled={loading || photoLockedByAnotherAccount}
                  >
                    {photoFile
                      ? "Trocar foto selecionada"
                      : editingRow?.photoAvailable
                        ? "Trocar foto"
                        : "Selecionar foto"}
                    <input
                      hidden
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(event) =>
                        handlePhotoSelected(event.target.files?.[0])
                      }
                    />
                  </Button>

                  {editingRow?.photoAvailable && editingRow.photoOwnedByCurrentUser && (
                    <Button
                      color="error"
                      variant="text"
                      startIcon={<DeleteForeverIcon />}
                      onClick={() => void removePhoto()}
                      disabled={loading}
                    >
                      Remover foto
                    </Button>
                  )}
                </Stack>

                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  JPG ou PNG, até 5 MB. A imagem é salva na pasta “PackID - Fotos”
                  do Google Drive da conta autenticada. No banco ficam somente os
                  dados de referência do arquivo.
                </Typography>

                {photoLockedByAnotherAccount && (
                  <Typography variant="caption" color="warning.main">
                    A foto atual pertence ao Drive de outra conta Google. Entre com
                    a conta que fez o upload para visualizar, trocar ou remover.
                  </Typography>
                )}
              </Stack>
            </Box>

            <TextField
              label={
                type === "PET"
                  ? "Nome do pet"
                  : type === "VEHICLE"
                    ? "Descrição do veículo"
                    : type === "BICYCLE"
                      ? "Descrição da bicicleta"
                      : "Nome completo"
              }
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              required
              fullWidth
            />

            {(type === "RESIDENT" || type === "DELIVERY_PERSON") && (
              <TextField
                label="CPF / Documento"
                value={form.document ?? ""}
                onChange={(e) => setField("document", e.target.value)}
                fullWidth
              />
            )}

            {(type === "RESIDENT" || type === "DELIVERY_PERSON") && (
              <TextField
                label="Telefone"
                value={form.phone ?? ""}
                onChange={(e) => setField("phone", e.target.value)}
                fullWidth
              />
            )}

            {type === "RESIDENT" && (
              <TextField
                label="E-mail"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setField("email", e.target.value)}
                fullWidth
              />
            )}

            {type === "DELIVERY_PERSON" && (
              <TextField
                label="Empresa / Transportadora"
                value={form.company ?? ""}
                onChange={(e) => setField("company", e.target.value)}
                fullWidth
              />
            )}

            {(type === "BICYCLE" || type === "PET" || type === "VEHICLE") && (
              <TextField
                label="Proprietário / Responsável"
                value={form.ownerName ?? ""}
                onChange={(e) => setField("ownerName", e.target.value)}
                fullWidth
              />
            )}

            {(type === "BICYCLE" || type === "VEHICLE") && (
              <>
                <TextField
                  label="Marca"
                  value={form.brand ?? ""}
                  onChange={(e) => setField("brand", e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Modelo"
                  value={form.model ?? ""}
                  onChange={(e) => setField("model", e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Cor"
                  value={form.color ?? ""}
                  onChange={(e) => setField("color", e.target.value)}
                  fullWidth
                />
                <TextField
                  label={type === "VEHICLE" ? "Placa" : "Tag / Nº de série"}
                  value={form.identifier ?? ""}
                  onChange={(e) => setField("identifier", e.target.value.toUpperCase())}
                  fullWidth
                />
              </>
            )}

            {type === "PET" && (
              <>
                <TextField
                  label="Espécie"
                  value={form.species ?? ""}
                  onChange={(e) => setField("species", e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Raça"
                  value={form.breed ?? ""}
                  onChange={(e) => setField("breed", e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Cor"
                  value={form.color ?? ""}
                  onChange={(e) => setField("color", e.target.value)}
                  fullWidth
                />
              </>
            )}

            {type !== "DELIVERY_PERSON" && (
              <>
                <TextField
                  label="Bloco / Página"
                  value={form.block ?? ""}
                  onChange={(e) => setField("block", e.target.value)}
                  required={type === "RESIDENT"}
                  fullWidth
                />
                <TextField
                  label="Apartamento"
                  value={form.apartment ?? ""}
                  onChange={(e) => setField("apartment", e.target.value)}
                  required={type === "RESIDENT"}
                  fullWidth
                />
              </>
            )}

            {type === "VEHICLE" && (
              <TextField
                label="Vaga"
                value={form.parkingSpace ?? ""}
                onChange={(e) => setField("parkingSpace", e.target.value)}
                fullWidth
              />
            )}

            <TextField
              label="Observações"
              value={form.notes ?? ""}
              onChange={(e) => setField("notes", e.target.value)}
              multiline
              minRows={2}
              fullWidth
              sx={{ gridColumn: { sm: "1 / -1" } }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={(e) => setField("active", e.target.checked)}
                />
              }
              label="Cadastro ativo"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
              setEditingId(null);
              resetPhotoSelection();
            }}
          >
            Cancelar
          </Button>
          <Button onClick={() => void save()} variant="contained" disabled={loading}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
