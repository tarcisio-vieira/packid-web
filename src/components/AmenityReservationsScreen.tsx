import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Stack, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import MeetingRoomRoundedIcon from "@mui/icons-material/MeetingRoomRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  amenitySpacePhotoUrl, createAmenitySpace, fetchAmenityReservations, fetchAmenitySpaces,
  updateAmenitySpace, uploadAmenitySpacePhoto, userFriendlyError,
  type AmenityReservation, type AmenitySpace, type AmenitySpacePayload, type User,
} from "../api";

const emptyForm: AmenitySpacePayload = {
  name: "", description: "", usageFee: 0, minAdvanceDays: 7,
  maxAdvanceDays: 365, cancellationDays: 7, active: true,
};
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const displayDate = (v: string) => v ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${v}T12:00:00Z`)) : "-";
export default function AmenityReservationsScreen({ currentUser, embedded = false }: Readonly<{ currentUser: User; embedded?: boolean }>) {
  const canManage = currentUser.canManageSettings ?? ["ADMIN", "SECRETARY"].includes((currentUser.role ?? "").toUpperCase());
  const [tab, setTab] = useState(0);
  const [spaces, setSpaces] = useState<AmenitySpace[]>([]);
  const [reservations, setReservations] = useState<AmenityReservation[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includePast, setIncludePast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<AmenitySpace | null | "new">(null);
  const [form, setForm] = useState<AmenitySpacePayload>(emptyForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<AmenityReservation | null>(null);
  const [guestFilter, setGuestFilter] = useState("");
  const [guestPage, setGuestPage] = useState(0);
  const [guestRowsPerPage, setGuestRowsPerPage] = useState(25);

  const loadSpaces = async () => { try { setSpaces(await fetchAmenitySpaces()); } catch (e) { setError(userFriendlyError(e, "Não foi possível carregar os ambientes.")); } };
  const loadReservations = async () => { try { setReservations(await fetchAmenityReservations({ spaceId: spaceId || undefined, from: from || undefined, to: to || undefined, includePast })); } catch (e) { setError(userFriendlyError(e, "Não foi possível carregar as reservas.")); } };
  useEffect(() => { void loadSpaces(); }, []);
  useEffect(() => { void loadReservations(); }, [spaceId, from, to, includePast]);

  const today = new Date().toISOString().slice(0, 10);
  const rows = useMemo(() => reservations, [reservations]);
  const openEditor = (space?: AmenitySpace) => {
    setEditor(space ?? "new"); setPhoto(null);
    setForm(space ? { name: space.name, description: space.description ?? "", usageFee: space.usageFee, minAdvanceDays: space.minAdvanceDays, maxAdvanceDays: space.maxAdvanceDays, cancellationDays: space.cancellationDays, active: space.active } : emptyForm);
  };
  const openDetails = (reservation: AmenityReservation) => {
    setDetails(reservation);
    setGuestFilter("");
    setGuestPage(0);
    setGuestRowsPerPage(25);
  };
  const save = async () => {
    setSaving(true); setError(null);
    try {
      const saved = editor === "new" ? await createAmenitySpace(form) : await updateAmenitySpace((editor as AmenitySpace).id, form);
      if (photo) await uploadAmenitySpacePhoto(saved.id, photo);
      setEditor(null); await loadSpaces();
    } catch (e) { setError(userFriendlyError(e, "Não foi possível salvar o ambiente.")); }
    finally { setSaving(false); }
  };

  const filteredGuests = useMemo(() => {
    const all = details?.guests ?? [];
    if (!guestFilter.trim()) return all;
    const term = guestFilter.trim().toLowerCase();
    return all.filter((g) => `${g.name} ${g.document ?? ""}`.toLowerCase().includes(term));
  }, [details, guestFilter]);
  const pagedGuests = useMemo(() => filteredGuests.slice(guestPage * guestRowsPerPage, guestPage * guestRowsPerPage + guestRowsPerPage), [filteredGuests, guestPage, guestRowsPerPage]);

  return <Box sx={{ p: embedded ? 0 : { xs: 1.5, md: 3 }, mt: embedded ? 2 : 0 }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
      <Box><Typography variant="h5" fontWeight={900}>Reservas de ambientes</Typography><Typography variant="body2" color="text.secondary">Agenda de espaços e consulta detalhada dos convidados autorizados.</Typography></Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        {canManage && tab === 1 && <Button variant="contained" startIcon={<MeetingRoomRoundedIcon />} onClick={() => openEditor()}>Novo ambiente</Button>}
      </Stack>
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
      <Tab icon={<EventAvailableRoundedIcon />} iconPosition="start" label="Reservas" />
      {canManage && <Tab icon={<MeetingRoomRoundedIcon />} iconPosition="start" label="Cadastro de ambientes" />}
    </Tabs>

    {tab === 0 && <>
      <Card variant="outlined" sx={{ mb: 2 }}><CardContent>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
          <TextField select label="Ambiente" value={spaceId} onChange={e => setSpaceId(e.target.value)} sx={{ minWidth: 220 }}><MenuItem value="">Todos</MenuItem>{spaces.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</TextField>
          <TextField type="date" label="De" value={from} onChange={e => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField type="date" label="Até" value={to} onChange={e => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          <FormControlLabel control={<Checkbox checked={includePast} onChange={e => setIncludePast(e.target.checked)} />} label="Mostrar datas anteriores" />
        </Stack>
      </CardContent></Card>
      <TableContainer component={Card} variant="outlined"><Table size="small" sx={{ minWidth: 920 }}>
        <TableHead><TableRow><TableCell>Data</TableCell><TableCell>Ambiente</TableCell><TableCell>Unidade</TableCell><TableCell>Taxa</TableCell><TableCell>Status</TableCell><TableCell align="right">Ações</TableCell></TableRow></TableHead>
        <TableBody>{!rows.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>Nenhuma reserva encontrada.</TableCell></TableRow>}
          {rows.map(r => <TableRow key={r.id} hover sx={r.reservationDate === today ? { bgcolor: "action.selected", "& td:first-of-type": { borderLeft: "4px solid", borderLeftColor: "primary.main" } } : undefined}>
            <TableCell><Stack direction="row" spacing={1} alignItems="center"><strong>{displayDate(r.reservationDate)}</strong>{r.reservationDate === today && <Chip size="small" color="primary" label="Hoje" />}</Stack></TableCell>
            <TableCell>{r.amenitySpaceName}</TableCell><TableCell>Bloco {r.block} · Apto {r.apartment}</TableCell><TableCell>{brl.format(r.usageFee ?? 0)}</TableCell>
            <TableCell><Chip size="small" color={r.status === "BOOKED" ? "success" : "default"} label={r.status === "BOOKED" ? "Reservado" : "Cancelado"} /></TableCell>
            <TableCell align="right"><Button size="small" startIcon={<VisibilityRoundedIcon />} onClick={() => openDetails(r)}>Ver reserva</Button></TableCell>
          </TableRow>)}</TableBody>
      </Table></TableContainer>
    </>}

    {tab === 1 && canManage && <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)", xl: "repeat(3,1fr)" }, gap: 2 }}>
      {spaces.map(s => <Card key={s.id} variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        {s.photoAvailable && <Box component="img" src={amenitySpacePhotoUrl(s.id)} alt={s.name} sx={{ width: "100%", height: 180, objectFit: "cover" }} />}
        <CardContent><Stack direction="row" justifyContent="space-between" spacing={1}><Box><Typography fontWeight={900}>{s.name}</Typography><Typography variant="body2" color="text.secondary">{s.description || "Sem descrição"}</Typography></Box><Tooltip title="Editar"><IconButton onClick={() => openEditor(s)}><EditOutlinedIcon /></IconButton></Tooltip></Stack>
          <Stack direction="row" gap={.75} flexWrap="wrap" sx={{ mt: 1.5 }}><Chip size="small" label={brl.format(s.usageFee ?? 0)} /><Chip size="small" label={`Mín. ${s.minAdvanceDays} dias`} /><Chip size="small" label={`Máx. ${s.maxAdvanceDays} dias`} /><Chip size="small" label={`Canc. ${s.cancellationDays} dias`} /><Chip size="small" color={s.active ? "success" : "default"} label={s.active ? "Ativo" : "Inativo"} /></Stack>
        </CardContent></Card>)}
    </Box>}

    <Dialog open={editor !== null} onClose={() => !saving && setEditor(null)} fullWidth maxWidth="sm"><DialogTitle>{editor === "new" ? "Novo ambiente" : "Editar ambiente"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
      <TextField label="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <TextField label="Descrição" multiline minRows={2} value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} />
      <TextField label="Taxa de utilização (R$)" type="number" inputProps={{ min: 0, step: .01 }} value={form.usageFee} onChange={e => setForm({ ...form, usageFee: Number(e.target.value) })} />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}><TextField fullWidth label="Antecedência mínima (dias)" type="number" value={form.minAdvanceDays} onChange={e => setForm({ ...form, minAdvanceDays: Number(e.target.value) })} /><TextField fullWidth label="Antecedência máxima (dias)" type="number" value={form.maxAdvanceDays} onChange={e => setForm({ ...form, maxAdvanceDays: Number(e.target.value) })} /><TextField fullWidth label="Cancelamento mínimo (dias)" type="number" value={form.cancellationDays} onChange={e => setForm({ ...form, cancellationDays: Number(e.target.value) })} /></Stack>
      <FormControlLabel control={<Checkbox checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />} label="Ambiente disponível para reservas" />
      <Button component="label" variant="outlined" startIcon={<PhotoCameraOutlinedIcon />}>{photo ? photo.name : "Selecionar foto"}<input hidden type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] ?? null)} /></Button>
    </Stack></DialogContent><DialogActions><Button onClick={() => setEditor(null)} disabled={saving}>Cancelar</Button><Button variant="contained" onClick={() => void save()} disabled={saving || !form.name.trim()}>{saving ? "Salvando..." : "Salvar"}</Button></DialogActions></Dialog>

    <Dialog open={Boolean(details)} onClose={() => setDetails(null)} fullWidth maxWidth="md">
      <DialogTitle>Reserva de ambiente</DialogTitle>
      <DialogContent>
        {details && <Stack spacing={2} sx={{ mt: 1 }}>
          <Card variant="outlined"><CardContent>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
              <Box>
                <Typography variant="h6" fontWeight={900}>{details.amenitySpaceName}</Typography>
                <Typography variant="body2">Data: <strong>{displayDate(details.reservationDate)}</strong></Typography>
                <Typography variant="body2">Unidade: <strong>Bloco {details.block} · Apto {details.apartment}</strong></Typography>
                <Typography variant="body2">Taxa: <strong>{brl.format(details.usageFee ?? 0)}</strong></Typography>
                <Typography variant="body2">Status: <strong>{details.status === "BOOKED" ? "Reservado" : "Cancelado"}</strong></Typography>
                {details.notes && <Typography variant="body2" sx={{ mt: .75 }}>Observações: {details.notes}</Typography>}
              </Box>
              <Chip color={details.status === "BOOKED" ? "success" : "default"} label={`${details.guests.length} convidado(s)`} />
            </Stack>
          </CardContent></Card>

          <Card variant="outlined"><CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.25} sx={{ mb: 1.5 }}>
              <Typography fontWeight={900}>Convidados autorizados</Typography>
              <TextField size="small" label="Filtrar convidado" value={guestFilter} onChange={(e) => { setGuestFilter(e.target.value); setGuestPage(0); }} sx={{ minWidth: { sm: 260 } }} />
            </Stack>
            <TableContainer><Table size="small">
              <TableHead><TableRow><TableCell>Nome</TableCell><TableCell>Documento</TableCell></TableRow></TableHead>
              <TableBody>
                {!pagedGuests.length && <TableRow><TableCell colSpan={2} align="center" sx={{ py: 3 }}>Nenhum convidado encontrado.</TableCell></TableRow>}
                {pagedGuests.map((g, index) => <TableRow key={`${g.name}-${g.document ?? ""}-${index}`}><TableCell>{g.name}</TableCell><TableCell>{g.document || "-"}</TableCell></TableRow>)}
              </TableBody>
            </Table></TableContainer>
            <TablePagination component="div" rowsPerPageOptions={[25, 50, 100]} count={filteredGuests.length} page={guestPage} onPageChange={(_, p) => setGuestPage(p)} rowsPerPage={guestRowsPerPage} onRowsPerPageChange={(e) => { setGuestRowsPerPage(Number(e.target.value)); setGuestPage(0); }} labelRowsPerPage="Linhas" labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`} />
          </CardContent></Card>
        </Stack>}
      </DialogContent>
      <DialogActions><Button onClick={() => setDetails(null)}>Fechar</Button></DialogActions>
    </Dialog>
  </Box>;
}
