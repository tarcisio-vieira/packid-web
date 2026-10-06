import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, ButtonBase, Card, CardContent, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Typography,
} from "@mui/material";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ImageNotSupportedOutlinedIcon from "@mui/icons-material/ImageNotSupportedOutlined";
import {
  cancelResidentAmenityReservation, createResidentAmenityReservation,
  fetchResidentAmenityBookedDates, fetchResidentAmenityReservations, fetchResidentAmenitySpaces,
  residentAmenitySpacePhotoUrl, updateResidentAmenityGuests, userFriendlyError,
  type AmenityReservation, type AmenitySpace,
} from "../api";
import { AuthenticatedImage } from "./shared/AuthenticatedMedia";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateBr = (v: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${v}T12:00:00Z`));
const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const WEEK_DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

type ReservationFlow = "HOME" | "SPACE" | "DATE" | "SUMMARY" | "SUCCESS";
type GuestDraft = { name: string; document: string };
function localDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return localDateIso(date);
}

function parseIso(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function monthStart(value: string): Date {
  const date = parseIso(value);
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

function compareMonth(a: Date, b: Date): number {
  return (a.getFullYear() * 12 + a.getMonth()) - (b.getFullYear() * 12 + b.getMonth());
}

function ScreenHeader({ title, subtitle, onBack }: Readonly<{ title: string; subtitle?: string; onBack: () => void }>) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2.25 }}>
      <IconButton onClick={onBack} aria-label="Voltar" sx={{ border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <ArrowBackRoundedIcon />
      </IconButton>
      <Box>
        <Typography fontWeight={950} sx={{ fontSize: 21, lineHeight: 1.15 }}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Stack>
  );
}

function ReservationCalendar({
  value,
  minDate,
  maxDate,
  bookedDates,
  loading,
  onChange,
}: Readonly<{
  value: string;
  minDate: string;
  maxDate: string;
  bookedDates: Set<string>;
  loading: boolean;
  onChange: (value: string) => void;
}>) {
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => monthStart(value || minDate));

  useEffect(() => {
    setVisibleMonth(monthStart(value || minDate));
  }, [minDate, value]);

  const minMonth = monthStart(minDate);
  const maxMonth = monthStart(maxDate);
  const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12, 0, 0, 0);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });

  const moveMonth = (offset: number) => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1, 12, 0, 0, 0);
    if (compareMonth(next, minMonth) < 0 || compareMonth(next, maxMonth) > 0) return;
    setVisibleMonth(next);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.35 }}>
        <IconButton size="small" onClick={() => moveMonth(-1)} disabled={compareMonth(visibleMonth, minMonth) <= 0} aria-label="Mês anterior"><ChevronLeftRoundedIcon /></IconButton>
        <Typography fontWeight={900} sx={{ textTransform: "capitalize", fontSize: 19 }}>{monthLabel.format(visibleMonth)}</Typography>
        <IconButton size="small" onClick={() => moveMonth(1)} disabled={compareMonth(visibleMonth, maxMonth) >= 0} aria-label="Próximo mês"><ChevronRightRoundedIcon /></IconButton>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.55 }}>
        {WEEK_DAYS.map((label, index) => <Typography key={`${label}-${index}`} variant="caption" color="text.secondary" align="center" fontWeight={900} sx={{ py: 0.85 }}>{label}</Typography>)}
        {days.map((day) => {
          const iso = localDateIso(day);
          const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
          const outOfRange = iso < minDate || iso > maxDate;
          const booked = bookedDates.has(iso);
          const selected = value === iso;
          const disabled = loading || outOfRange || booked || !isCurrentMonth;
          const available = isCurrentMonth && !outOfRange && !booked;
          return (
            <ButtonBase
              key={iso}
              disabled={disabled}
              onClick={() => onChange(iso)}
              aria-label={booked ? `${dateBr(iso)} indisponível, já reservado` : `${dateBr(iso)}${selected ? ", selecionado" : ""}`}
              sx={{
                width: "100%", aspectRatio: "1.12 / 1", minHeight: 39, borderRadius: 1.4,
                border: "2px solid #fff",
                fontWeight: 800,
                bgcolor: selected ? "#2563a9" : booked ? "#a90808" : available ? "#118c2a" : "#e9edf0",
                color: selected || booked || available ? "#fff" : "#a9b1b8",
                opacity: !isCurrentMonth ? 0.45 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
                "&.Mui-disabled": {
                  color: booked ? "#fff" : "#a9b1b8",
                  bgcolor: booked ? "#a90808" : "#e9edf0",
                  opacity: booked ? 1 : 0.72,
                },
                "&:hover": disabled ? undefined : { filter: "brightness(.94)" },
              }}
            >
              {day.getDate()}
            </ButtonBase>
          );
        })}
      </Box>

      <Stack spacing={1.15} sx={{ mt: 2.25 }}>
        {[
          ["#118c2a", "Data disponível"],
          ["#a90808", "Data indisponível / já reservada"],
          ["#2563a9", "Data selecionada"],
          ["#e9edf0", "Data fora do período permitido"],
        ].map(([color, label]) => (
          <Stack key={label} direction="row" spacing={1.1} alignItems="center">
            <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: color, border: color === "#e9edf0" ? "1px solid #d9dfe4" : 0 }} />
            <Typography variant="body2" color="text.secondary">{label}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export default function ResidentAmenityReservations() {
  const [spaces, setSpaces] = useState<AmenitySpace[]>([]);
  const [reservations, setReservations] = useState<AmenityReservation[]>([]);
  const [flow, setFlow] = useState<ReservationFlow>("HOME");
  const [selected, setSelected] = useState<AmenitySpace | null>(null);
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [guests, setGuests] = useState<GuestDraft[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<AmenityReservation | null>(null);
  const [guestEditor, setGuestEditor] = useState<AmenityReservation | null>(null);
  const [guestDrafts, setGuestDrafts] = useState<GuestDraft[]>([]);
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [details, setDetails] = useState<AmenityReservation | null>(null);
  const [guestFilter, setGuestFilter] = useState("");
  const [guestPage, setGuestPage] = useState(0);
  const [guestRowsPerPage, setGuestRowsPerPage] = useState(25);

  const load = async () => {
    try {
      const [s, r] = await Promise.all([fetchResidentAmenitySpaces(), fetchResidentAmenityReservations()]);
      setSpaces(s);
      setReservations(r);
      setError(null);
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível carregar as reservas."));
    }
  };
  useEffect(() => { void load(); }, []);

  const minDate = useMemo(() => selected ? addDaysIso(selected.minAdvanceDays) : "", [selected]);
  const maxDate = useMemo(() => selected ? addDaysIso(selected.maxAdvanceDays) : "", [selected]);

  useEffect(() => {
    if (!selected || !minDate || !maxDate) {
      setBookedDates(new Set());
      setAvailabilityLoading(false);
      return;
    }
    let cancelled = false;
    setAvailabilityLoading(true);
    setBookedDates(new Set());
    void fetchResidentAmenityBookedDates(selected.id, minDate, maxDate)
      .then((dates) => { if (!cancelled) setBookedDates(new Set(dates)); })
      .catch((e) => { if (!cancelled) setError(userFriendlyError(e, "Não foi possível consultar as datas disponíveis.")); })
      .finally(() => { if (!cancelled) setAvailabilityLoading(false); });
    return () => { cancelled = true; };
  }, [selected, minDate, maxDate]);

  const startNew = () => {
    setSelected(null); setDate(""); setNotes(""); setGuests([]); setAgreed(false); setCreatedReservation(null); setError(null); setFlow("SPACE");
  };
  const addGuest = (target: "new" | "edit") => {
    const setter = target === "new" ? setGuests : setGuestDrafts;
    setter(current => [...current, { name: "", document: "" }]);
  };
  const updateGuest = (target: "new" | "edit", index: number, patch: Partial<GuestDraft>) => {
    const setter = target === "new" ? setGuests : setGuestDrafts;
    setter(current => current.map((g, i) => i === index ? { ...g, ...patch } : g));
  };
  const removeGuest = (target: "new" | "edit", index: number) => {
    const setter = target === "new" ? setGuests : setGuestDrafts;
    setter(current => current.filter((_, i) => i !== index));
  };

  const reserve = async () => {
    if (!selected || !date || !agreed) return;
    if (bookedDates.has(date)) {
      setError("Esta data já está reservada para o ambiente selecionado.");
      setFlow("DATE");
      return;
    }
    setBusy(true); setError(null); setSuccess(null);
    try {
      const created = await createResidentAmenityReservation({
        amenitySpaceId: selected.id,
        reservationDate: date,
        notes: notes || undefined,
        guests: guests.filter(g => g.name.trim()).map(g => ({ name: g.name.trim(), document: g.document.trim() || undefined })),
      });
      setCreatedReservation(created);
      setFlow("SUCCESS");
      await load();
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível concluir a reserva."));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (r: AmenityReservation) => {
    setBusy(true); setError(null);
    try {
      await cancelResidentAmenityReservation(r.id);
      setSuccess("Reserva cancelada.");
      setDetails(null);
      await load();
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível cancelar a reserva."));
    } finally { setBusy(false); }
  };

  const saveGuests = async () => {
    if (!guestEditor) return;
    setBusy(true); setError(null);
    try {
      const updated = await updateResidentAmenityGuests(guestEditor.id, guestDrafts.filter(g => g.name.trim()).map(g => ({ name: g.name.trim(), document: g.document.trim() || undefined })));
      setGuestEditor(null);
      setSuccess("Lista de convidados atualizada.");
      if (createdReservation?.id === updated.id) setCreatedReservation(updated);
      if (details?.id === updated.id) setDetails(updated);
      await load();
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível atualizar os convidados."));
    } finally { setBusy(false); }
  };

  const openDetails = (reservation: AmenityReservation) => {
    setDetails(reservation); setGuestFilter(""); setGuestPage(0); setGuestRowsPerPage(25);
  };
  const filteredGuests = useMemo(() => {
    const all = details?.guests ?? [];
    if (!guestFilter.trim()) return all;
    const term = guestFilter.trim().toLowerCase();
    return all.filter((g) => `${g.name} ${g.document ?? ""}`.toLowerCase().includes(term));
  }, [details, guestFilter]);
  const pagedGuests = useMemo(() => filteredGuests.slice(guestPage * guestRowsPerPage, guestPage * guestRowsPerPage + guestRowsPerPage), [filteredGuests, guestPage, guestRowsPerPage]);

  const commonAlerts = <>{error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}{success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}</>;

  if (flow === "SPACE") {
    return <Stack spacing={2}>
      {commonAlerts}
      <ScreenHeader title="Nova reserva" subtitle="Selecione um ambiente" onBack={() => setFlow("HOME")} />
      <Typography variant="body2" color="text.secondary">Escolha o ambiente desejado. A taxa e todas as regras aparecem antes da confirmação.</Typography>
      <Stack spacing={1.5}>
        {spaces.map((space) => (
          <Card key={space.id} variant="outlined" sx={{ borderRadius: 3.5, overflow: "hidden", boxShadow: "0 8px 24px rgba(30,60,45,.06)" }}>
            <Box sx={{ bgcolor: "primary.main", color: "primary.contrastText", px: 2, py: 1.4 }}><Typography fontWeight={900}>{space.name}</Typography></Box>
            {space.photoAvailable ? <AuthenticatedImage remoteSrc={residentAmenitySpacePhotoUrl(space.id)} alt={space.name} sx={{ width: "100%", height: 190, objectFit: "cover" }} /> : <Box sx={{ height: 170, display: "grid", placeItems: "center", bgcolor: "#f6f8f7" }}><ImageNotSupportedOutlinedIcon sx={{ fontSize: 64, color: "#c4d0cc" }} /></Box>}
            <CardContent sx={{ p: 2 }}>
              {space.description && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{space.description}</Typography>}
              <Stack spacing={.65}>
                <Typography variant="body2"><strong>Taxa de utilização:</strong> {brl.format(space.usageFee ?? 0)}</Typography>
                <Typography variant="body2"><strong>Antecedência:</strong> mínimo {space.minAdvanceDays} dias e máximo {space.maxAdvanceDays} dias</Typography>
                <Typography variant="body2"><strong>Cancelamento:</strong> até {space.cancellationDays} dias antes</Typography>
              </Stack>
              <Button fullWidth variant="contained" size="large" sx={{ mt: 2, minHeight: 48, borderRadius: 2.5, textTransform: "none", fontWeight: 900 }} onClick={() => { setSelected(space); setDate(""); setAgreed(false); setFlow("DATE"); }}>Selecionar ambiente</Button>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>;
  }

  if (flow === "DATE" && selected && minDate && maxDate) {
    return <Stack spacing={2}>
      {commonAlerts}
      <ScreenHeader title="Selecione a data" subtitle={selected.name} onBack={() => setFlow("SPACE")} />
      <Card variant="outlined" sx={{ borderRadius: 3.5 }}><CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        {availabilityLoading && <Alert severity="info" sx={{ mb: 1.5 }}>Consultando disponibilidade...</Alert>}
        <ReservationCalendar value={date} minDate={minDate} maxDate={maxDate} bookedDates={bookedDates} loading={availabilityLoading} onChange={setDate} />
      </CardContent></Card>
      {date && <Card sx={{ position: "sticky", bottom: "calc(8px + env(safe-area-inset-bottom))", zIndex: 4, borderRadius: 3, boxShadow: "0 12px 32px rgba(0,0,0,.18)" }}><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}><Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}><Box><Typography variant="caption" color="text.secondary">Data escolhida</Typography><Typography fontWeight={900}>{dateBr(date)}</Typography></Box><Button variant="contained" size="large" onClick={() => setFlow("SUMMARY")} sx={{ minWidth: 130, textTransform: "none", fontWeight: 900 }}>Continuar</Button></Stack></CardContent></Card>}
    </Stack>;
  }

  if (flow === "SUMMARY" && selected && date) {
    return <Stack spacing={2}>
      {commonAlerts}
      <ScreenHeader title="Resumo da reserva" subtitle="Confira antes de confirmar" onBack={() => setFlow("DATE")} />
      <Card variant="outlined" sx={{ borderRadius: 3.5 }}><CardContent sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={950}>{selected.name}</Typography>
        <Stack spacing={.8} sx={{ mt: 1.5 }}>
          <Typography><strong>Data:</strong> {dateBr(date)}</Typography>
          <Typography><strong>Taxa:</strong> {brl.format(selected.usageFee ?? 0)}</Typography>
          <Typography><strong>Antecedência mínima:</strong> {selected.minAdvanceDays} dias</Typography>
          <Typography><strong>Antecedência máxima:</strong> {selected.maxAdvanceDays} dias</Typography>
          <Typography color="error.main"><strong>Cancelamento:</strong> até {selected.cancellationDays} dias antes</Typography>
        </Stack>
      </CardContent></Card>

      <Card variant="outlined" sx={{ borderRadius: 3.5 }}><CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}><Box><Typography fontWeight={900}>Convidados autorizados</Typography><Typography variant="caption" color="text.secondary">A lista poderá ser alterada depois.</Typography></Box><Button size="small" startIcon={<AddRoundedIcon />} onClick={() => addGuest("new")}>Adicionar</Button></Stack>
        <Stack spacing={1}>
          {guests.map((g, i) => <Stack key={i} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}><TextField size="small" fullWidth label="Nome" value={g.name} onChange={e => updateGuest("new", i, { name: e.target.value })} /><TextField size="small" fullWidth label="Documento (opcional)" value={g.document} onChange={e => updateGuest("new", i, { document: e.target.value })} /><IconButton color="error" onClick={() => removeGuest("new", i)}><DeleteOutlineRoundedIcon /></IconButton></Stack>)}
          {!guests.length && <Typography variant="body2" color="text.secondary">Nenhum convidado informado.</Typography>}
        </Stack>
        <TextField label="Observações" multiline minRows={2} value={notes} onChange={e => setNotes(e.target.value)} fullWidth sx={{ mt: 2 }} />
      </CardContent></Card>

      <FormControlLabel control={<Checkbox checked={agreed} onChange={e => setAgreed(e.target.checked)} />} label="Li as informações e assumo a responsabilidade pela reserva deste ambiente." />
      <Button variant="contained" size="large" fullWidth disabled={!agreed || busy} onClick={() => void reserve()} sx={{ minHeight: 52, borderRadius: 2.5, textTransform: "none", fontWeight: 950 }}>{busy ? "Confirmando..." : "Confirmar reserva"}</Button>
    </Stack>;
  }

  if (flow === "SUCCESS" && createdReservation) {
    return <Stack spacing={2.5} alignItems="center" textAlign="center" sx={{ py: 2 }}>
      <Box sx={{ width: 96, height: 96, borderRadius: "50%", bgcolor: "success.light", color: "success.dark", display: "grid", placeItems: "center" }}><CheckCircleRoundedIcon sx={{ fontSize: 58 }} /></Box>
      <Box><Typography variant="h5" fontWeight={950}>Pronto!</Typography><Typography color="text.secondary" sx={{ mt: .75 }}>Reserva agendada com sucesso.</Typography></Box>
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 560, borderRadius: 3.5, textAlign: "left" }}><Box sx={{ bgcolor: "primary.main", color: "primary.contrastText", px: 2, py: 1.4 }}><Typography fontWeight={900}>{createdReservation.amenitySpaceName}</Typography></Box><CardContent><Stack direction="row" spacing={1.5} alignItems="center"><CalendarMonthRoundedIcon sx={{ fontSize: 54, color: "primary.main" }} /><Box><Typography fontWeight={900}>{dateBr(createdReservation.reservationDate)}</Typography><Typography variant="body2" color="text.secondary">{brl.format(createdReservation.usageFee ?? 0)} · {createdReservation.guests.length} convidado(s)</Typography></Box></Stack></CardContent></Card>
      <Stack spacing={1} sx={{ width: "100%", maxWidth: 560 }}>
        <Button variant="contained" size="large" onClick={startNew} sx={{ minHeight: 50, textTransform: "none", fontWeight: 900 }}>Realizar outra reserva</Button>
        <Button variant="outlined" size="large" onClick={() => { setGuestEditor(createdReservation); setGuestDrafts(createdReservation.guests.map(g => ({ name: g.name, document: g.document ?? "" }))); }} sx={{ minHeight: 50, textTransform: "none", fontWeight: 900 }}>Lista de convidados</Button>
        <Button size="large" onClick={() => setFlow("HOME")} sx={{ textTransform: "none" }}>Voltar para minhas reservas</Button>
      </Stack>
    </Stack>;
  }

  return <Stack spacing={2}>
    {commonAlerts}
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
      <Box><Typography variant="h6" fontWeight={950}>Minhas reservas</Typography><Typography variant="body2" color="text.secondary">Consulte, cancele ou gerencie convidados.</Typography></Box>
      <Stack direction="row" spacing={1}><Button variant="contained" startIcon={<EventAvailableRoundedIcon />} onClick={startNew}>Nova reserva</Button></Stack>
    </Stack>

    <Stack spacing={1.25}>
      {!reservations.length && <Card variant="outlined" sx={{ borderRadius: 3.5 }}><CardContent sx={{ py: 4, textAlign: "center" }}><CalendarMonthRoundedIcon sx={{ fontSize: 46, color: "text.disabled" }} /><Typography fontWeight={800} sx={{ mt: 1 }}>Você ainda não possui reservas.</Typography><Button variant="contained" sx={{ mt: 2 }} onClick={startNew}>Fazer primeira reserva</Button></CardContent></Card>}
      {reservations.map(r => <Card key={r.id} variant="outlined" component="button" onClick={() => openDetails(r)} sx={{ appearance: "none", width: "100%", textAlign: "left", borderRadius: 3.5, p: 0, bgcolor: "background.paper", color: "text.primary", cursor: "pointer", "&:hover": { borderColor: "primary.light", boxShadow: "0 8px 24px rgba(30,60,45,.08)" } }}><CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}><Stack direction="row" spacing={1.5} alignItems="center"><Box sx={{ width: 60, height: 60, borderRadius: 2.5, display: "grid", placeItems: "center", bgcolor: r.status === "BOOKED" ? "success.light" : "action.hover", color: r.status === "BOOKED" ? "success.dark" : "text.secondary" }}><CalendarMonthRoundedIcon sx={{ fontSize: 34 }} /></Box><Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={900}>{r.amenitySpaceName}</Typography><Typography variant="body2">{dateBr(r.reservationDate)} · {brl.format(r.usageFee ?? 0)}</Typography><Typography variant="caption" color="text.secondary">{r.guests.length} convidado(s) autorizado(s)</Typography></Box><Stack alignItems="flex-end" spacing={.75}><Chip size="small" color={r.status === "BOOKED" ? "success" : "default"} label={r.status === "BOOKED" ? "Reservado" : "Cancelado"} /><VisibilityRoundedIcon color="action" /></Stack></Stack></CardContent></Card>)}
    </Stack>

    <Dialog open={Boolean(details)} onClose={() => setDetails(null)} fullWidth maxWidth="md">
      <DialogTitle>Detalhes da reserva</DialogTitle>
      <DialogContent>{details && <Stack spacing={2} sx={{ mt: 1 }}>
        <Card variant="outlined"><CardContent><Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}><Box><Typography variant="h6" fontWeight={900}>{details.amenitySpaceName}</Typography><Typography variant="body2">Data: <strong>{dateBr(details.reservationDate)}</strong></Typography><Typography variant="body2">Taxa: <strong>{brl.format(details.usageFee ?? 0)}</strong></Typography><Typography variant="body2">Status: <strong>{details.status === "BOOKED" ? "Reservado" : "Cancelado"}</strong></Typography>{details.notes && <Typography variant="body2" sx={{ mt: .75 }}>Observações: {details.notes}</Typography>}</Box><Stack alignItems={{ xs: "flex-start", md: "flex-end" }} spacing={1}><Chip color={details.status === "BOOKED" ? "success" : "default"} label={`${details.guests.length} convidado(s)`} />{details.status === "BOOKED" && <Button size="small" onClick={() => { setGuestEditor(details); setGuestDrafts(details.guests.map((g) => ({ name: g.name, document: g.document ?? "" }))); }}>Editar convidados</Button>}</Stack></Stack></CardContent></Card>
        <Card variant="outlined"><CardContent><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.25} sx={{ mb: 1.5 }}><Typography fontWeight={900}>Convidados autorizados</Typography><TextField size="small" label="Filtrar convidado" value={guestFilter} onChange={(e) => { setGuestFilter(e.target.value); setGuestPage(0); }} sx={{ minWidth: { sm: 260 } }} /></Stack><TableContainer><Table size="small"><TableHead><TableRow><TableCell>Nome</TableCell><TableCell>Documento</TableCell></TableRow></TableHead><TableBody>{!pagedGuests.length && <TableRow><TableCell colSpan={2} align="center" sx={{ py: 3 }}>Nenhum convidado encontrado.</TableCell></TableRow>}{pagedGuests.map((g, index) => <TableRow key={`${g.name}-${g.document ?? ""}-${index}`}><TableCell>{g.name}</TableCell><TableCell>{g.document || "-"}</TableCell></TableRow>)}</TableBody></Table></TableContainer><TablePagination component="div" rowsPerPageOptions={[25, 50, 100]} count={filteredGuests.length} page={guestPage} onPageChange={(_, p) => setGuestPage(p)} rowsPerPage={guestRowsPerPage} onRowsPerPageChange={(e) => { setGuestRowsPerPage(Number(e.target.value)); setGuestPage(0); }} labelRowsPerPage="Linhas" labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`} /></CardContent></Card>
      </Stack>}</DialogContent>
      <DialogActions>{details?.status === "BOOKED" && <Button color="error" onClick={() => void cancel(details)} disabled={busy}>Cancelar reserva</Button>}<Button onClick={() => setDetails(null)}>Fechar</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(guestEditor)} onClose={() => !busy && setGuestEditor(null)} fullWidth maxWidth="sm">
      <DialogTitle><PeopleAltOutlinedIcon sx={{ verticalAlign: "middle", mr: 1 }} />Convidados autorizados</DialogTitle>
      <DialogContent><Stack spacing={1.25} sx={{ mt: 1 }}>{guestDrafts.map((g, i) => <Stack key={i} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}><TextField size="small" fullWidth label="Nome" value={g.name} onChange={e => updateGuest("edit", i, { name: e.target.value })} /><TextField size="small" fullWidth label="Documento (opcional)" value={g.document} onChange={e => updateGuest("edit", i, { document: e.target.value })} /><IconButton color="error" onClick={() => removeGuest("edit", i)}><DeleteOutlineRoundedIcon /></IconButton></Stack>)}<Button startIcon={<AddRoundedIcon />} onClick={() => addGuest("edit")}>Adicionar convidado</Button></Stack></DialogContent>
      <DialogActions><Button onClick={() => setGuestEditor(null)}>Cancelar</Button><Button variant="contained" onClick={() => void saveGuests()} disabled={busy}>Salvar lista</Button></DialogActions>
    </Dialog>
  </Stack>;
}
