import { useCallback, useEffect, useState } from "react";
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import ToysIcon from "@mui/icons-material/Toys";
import KeyIcon from "@mui/icons-material/Key";
import PrintIcon from "@mui/icons-material/Print";
import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SpaOutlinedIcon from "@mui/icons-material/SpaOutlined";
import DoneAllOutlinedIcon from "@mui/icons-material/DoneAllOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import {
  completeSpaceAccess, exportSpaceAccessExcel, fetchRegistryEntriesPage, fetchSpaceAccess, fetchSpaceAccessPage,
  manualReleaseSpaceAccess, regularizeOpenSpaceAccess, regularizeSpaceAccess, releaseSpaceAccess, userFriendlyError,
  type RegistryEntry, type SpaceAccess, type SpaceType,
} from "../api";
import { confirmDialog } from "../utils/confirmDialog";

export function spaceLabel(type: SpaceType): string {
  if (type === "GYM") return "Academia";
  if (type === "GAMES_ROOM") return "Sala de Jogos";
  if (type === "SAUNA") return "Sauna";
  return "Brinquedoteca";
}
export function spaceIcon(type: SpaceType) {
  if (type === "GYM") return <FitnessCenterIcon />;
  if (type === "GAMES_ROOM") return <SportsEsportsIcon />;
  if (type === "SAUNA") return <SpaOutlinedIcon />;
  return <ToysIcon />;
}
export function spaceAccessStatusLabel(status: SpaceAccess["status"]): string {
  if (status === "REQUESTED_PICKUP") return "Aguardando liberação";
  if (status === "IN_USE") return "Em uso";
  if (status === "REQUESTED_RETURN") return "Aguardando devolução";
  if (status === "COMPLETED") return "Finalizado";
  return "Cancelado";
}
function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(date);
}
function todayOffset(days: number): string {
  const base = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [year, month, day] = base.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
function nowDateTimeInput(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
function apiLocalDateTime(value: string): string {
  return value.length === 16 ? `${value}:00` : value;
}
function escapeHtml(value: unknown): string {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
const activeStatus = (status: SpaceAccess["status"]) => ["REQUESTED_PICKUP", "IN_USE", "REQUESTED_RETURN"].includes(status);

export default function SpacesScreen({ embedded = false, canExport = false }: Readonly<{ embedded?: boolean; canExport?: boolean }> = {}) {
  const [rows, setRows] = useState<SpaceAccess[]>([]);
  const [spaceType, setSpaceType] = useState<SpaceType | "">("");
  const [from, setFrom] = useState(todayOffset(-30));
  const [to, setTo] = useState(todayOffset(0));
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualSpaceType, setManualSpaceType] = useState<SpaceType>("GYM");
  const [resident, setResident] = useState<RegistryEntry | null>(null);
  const [residentQuery, setResidentQuery] = useState("");
  const [residentOptions, setResidentOptions] = useState<RegistryEntry[]>([]);
  const [residentLoading, setResidentLoading] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);

  const [completionRow, setCompletionRow] = useState<SpaceAccess | null>(null);
  const [completedAt, setCompletedAt] = useState("");
  const [completionBusy, setCompletionBusy] = useState(false);

  const load = useCallback(async (requestedPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSpaceAccessPage({ spaceType, from: from || undefined, to: to || undefined, page: requestedPage, size: rowsPerPage });
      setRows(result.content);
      setTotalElements(result.totalElements);
      if (result.totalPages > 0 && requestedPage >= result.totalPages) setPage(result.totalPages - 1);
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível carregar as solicitações da área de lazer."));
    } finally {
      setLoading(false);
    }
  }, [spaceType, from, to, page, rowsPerPage]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!manualOpen) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      setResidentLoading(true);
      void fetchRegistryEntriesPage({ type: "RESIDENT", search: residentQuery, page: 0, size: 20, sort: "unit", direction: "asc" })
        .then(result => {
          if (!active) return;
          const options = resident && !result.content.some(item => item.id === resident.id)
            ? [resident, ...result.content]
            : result.content;
          setResidentOptions(options);
        })
        .catch(err => { if (active) setError(userFriendlyError(err, "Não foi possível pesquisar os condôminos.")); })
        .finally(() => { if (active) setResidentLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [manualOpen, residentQuery, resident]);

  const release = async (row: SpaceAccess) => {
    setLoading(true); setError(null); setSuccess(null);
    try {
      await releaseSpaceAccess(row.id);
      setSuccess(`Chave da ${spaceLabel(row.spaceType)} liberada para Bloco ${row.block} Apto ${row.apartment}.`);
      await load(page);
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível registrar a liberação da chave."));
    } finally {
      setLoading(false);
    }
  };

  const openManualRelease = () => {
    setManualSpaceType("GYM");
    setResident(null);
    setResidentQuery("");
    setResidentOptions([]);
    setError(null);
    setSuccess(null);
    setManualOpen(true);
  };

  const saveManualRelease = async () => {
    if (!resident) { setError("Selecione o morador, bloco e apartamento."); return; }
    setManualBusy(true); setError(null); setSuccess(null);
    try {
      const created = await manualReleaseSpaceAccess({ residentRegistryEntryId: resident.id, spaceType: manualSpaceType });
      setManualOpen(false);
      setSuccess(`Chave da ${spaceLabel(created.spaceType)} liberada para ${created.residentName} — Bloco ${created.block} Apto ${created.apartment}.`);
      setPage(0);
      await load(0);
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível liberar a chave para o morador selecionado."));
    } finally {
      setManualBusy(false);
    }
  };

  const openCompletion = (row: SpaceAccess) => {
    setCompletionRow(row);
    setCompletedAt(nowDateTimeInput());
    setError(null);
    setSuccess(null);
  };

  const finishCompletion = async () => {
    if (!completionRow || !completedAt) { setError("Informe a data e a hora da entrega da chave."); return; }
    setCompletionBusy(true); setError(null); setSuccess(null);
    try {
      await completeSpaceAccess(completionRow.id, apiLocalDateTime(completedAt));
      setSuccess(`Chave da ${spaceLabel(completionRow.spaceType)} marcada como entregue.`);
      setCompletionRow(null);
      await load(page);
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível finalizar a devolução da chave."));
    } finally {
      setCompletionBusy(false);
    }
  };

  const regularize = async (row: SpaceAccess) => {
    const ok = await confirmDialog({ title: "Regularizar chave?", text: `Marcar a chave de ${spaceLabel(row.spaceType)} da unidade Bloco ${row.block} Apto ${row.apartment} como entregue e encerrar esta pendência?`, confirmButtonText: "Regularizar" });
    if (!ok) return;
    setLoading(true); setError(null); setSuccess(null);
    try {
      await regularizeSpaceAccess(row.id);
      await load(page);
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível regularizar a chave."));
    } finally {
      setLoading(false);
    }
  };

  const regularizeAll = async () => {
    const scope = spaceType ? ` de ${spaceLabel(spaceType)}` : "";
    const ok = await confirmDialog({ title: "Zerar pendências de chaves?", text: `Todas as pendências abertas${scope} serão encerradas como entrega regularizada, mantendo o histórico e quem realizou a ação.`, confirmButtonText: "Zerar pendências" });
    if (!ok) return;
    setLoading(true); setError(null); setSuccess(null);
    try {
      const affected = await regularizeOpenSpaceAccess(spaceType);
      await load(0);
      setPage(0);
      if (!affected) setError("Não havia pendências abertas para regularizar.");
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível zerar as pendências."));
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true); setError(null);
    try { await exportSpaceAccessExcel(); }
    catch (err) { setError(userFriendlyError(err, "Não foi possível exportar a área de lazer para Excel.")); }
    finally { setExporting(false); }
  };

  const printReport = async () => {
    try {
      const allRows = await fetchSpaceAccess({ spaceType, from: from || undefined, to: to || undefined });
      const reportRows = allRows.map(row => `<tr><td>${escapeHtml(spaceLabel(row.spaceType))}</td><td>${escapeHtml(row.residentName)}</td><td>${escapeHtml(`Bloco ${row.block} Apto ${row.apartment}`)}</td><td>${escapeHtml(formatDateTime(row.requestedAt))}</td><td>${escapeHtml(formatDateTime(row.releasedAt))}</td><td>${escapeHtml(formatDateTime(row.returnRequestedAt))}</td><td>${escapeHtml(formatDateTime(row.completedAt))}</td><td>${escapeHtml(spaceAccessStatusLabel(row.status))}</td></tr>`).join("");
      const popup = globalThis.open("", "_blank", "width=1100,height=800");
      if (!popup) { setError("O navegador bloqueou a janela de impressão. Libere pop-ups para este site."); return; }
      popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório de área de lazer</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0 0 8px}.sub{margin-bottom:18px;color:#555}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #bbb;padding:6px;text-align:left}th{background:#eee}@media print{body{padding:0}}</style></head><body><h1>VSGI Condomínio — ${escapeHtml(spaceType ? spaceLabel(spaceType) : "Relatório de área de lazer")}</h1><div class="sub">Período: ${escapeHtml(from || "início")} a ${escapeHtml(to || "hoje")} · ${allRows.length} registro(s)</div><table><thead><tr><th>Área</th><th>Morador</th><th>Unidade</th><th>Solicitação</th><th>Liberação</th><th>Pedido devolução</th><th>Encerramento</th><th>Status</th></tr></thead><tbody>${reportRows}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
      popup.document.close();
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível gerar o relatório."));
    }
  };

  return <Box sx={{ maxWidth: embedded ? "none" : 1500, mx: embedded ? 0 : "auto", mt: 2, mb: embedded ? 0 : 4 }}>
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>Área de lazer</Typography>
        <Typography variant="body2" sx={{ opacity: .7 }}>Liberação, devolução e regularização das chaves das áreas comuns.</Typography>
      </Box>
      <Stack direction="row" spacing={.5} alignItems="center">
        <Button variant="contained" startIcon={<KeyIcon />} onClick={openManualRelease} disabled={loading}>Liberar chave</Button>
        <Tooltip title="Imprimir relatório" arrow><span><IconButton color="primary" onClick={() => void printReport()} disabled={loading} aria-label="Imprimir relatório"><PrintIcon /></IconButton></span></Tooltip>
        {canExport && <Tooltip title="Exportar Excel" arrow><span><IconButton color="primary" onClick={() => void exportExcel()} disabled={loading || exporting} aria-label="Exportar Excel"><GridOnOutlinedIcon /></IconButton></span></Tooltip>}
        <Tooltip title="Zerar todas as pendências abertas de chave" arrow><span><IconButton color="warning" onClick={() => void regularizeAll()} disabled={loading} aria-label="Zerar pendências"><DoneAllOutlinedIcon /></IconButton></span></Tooltip>
      </Stack>
    </Stack>

    {error && <Alert severity={error.startsWith("Não havia") ? "info" : "error"} sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
    {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

    <Card variant="outlined"><CardContent>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField select label="Área" value={spaceType} onChange={e => { setSpaceType(e.target.value as SpaceType | ""); setPage(0); }} sx={{ minWidth: 220 }}>
          <MenuItem value="">Todos</MenuItem><MenuItem value="PLAYROOM">Brinquedoteca</MenuItem><MenuItem value="GAMES_ROOM">Sala de Jogos</MenuItem><MenuItem value="GYM">Academia</MenuItem><MenuItem value="SAUNA">Sauna</MenuItem>
        </TextField>
        <TextField label="De" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }}/>
        <TextField label="Até" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(0); }} InputLabelProps={{ shrink: true }}/>
        <Box sx={{ flex: 1 }}/><Button onClick={() => void load(page)} disabled={loading}>Atualizar</Button>
      </Stack>

      <TableContainer><Table size="small" sx={{ minWidth: 1180 }}><TableHead><TableRow>
        <TableCell>Área</TableCell><TableCell>Morador</TableCell><TableCell>Unidade</TableCell><TableCell>Solicitado</TableCell><TableCell>Liberado</TableCell><TableCell>Pedido devolução</TableCell><TableCell>Encerrado</TableCell><TableCell>Status</TableCell><TableCell align="right">Ação</TableCell>
      </TableRow></TableHead><TableBody>
        {!rows.length && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}>Nenhum registro no período.</TableCell></TableRow>}
        {rows.map(row => <TableRow key={row.id} hover>
          <TableCell><Stack direction="row" spacing={1} alignItems="center">{spaceIcon(row.spaceType)}<span>{spaceLabel(row.spaceType)}</span></Stack></TableCell>
          <TableCell>{row.residentName || "Morador"}</TableCell>
          <TableCell>Bloco {row.block} Apto {row.apartment}</TableCell>
          <TableCell>{formatDateTime(row.requestedAt)}</TableCell>
          <TableCell>{formatDateTime(row.releasedAt)}</TableCell>
          <TableCell>{formatDateTime(row.returnRequestedAt)}</TableCell>
          <TableCell>{formatDateTime(row.completedAt)}</TableCell>
          <TableCell><Chip size="small" label={spaceAccessStatusLabel(row.status)} color={row.status === "REQUESTED_PICKUP" || row.status === "REQUESTED_RETURN" ? "warning" : row.status === "IN_USE" ? "info" : "default"}/></TableCell>
          <TableCell align="right">
            <Stack direction="row" spacing={.5} justifyContent="flex-end" alignItems="center">
              {row.status === "REQUESTED_PICKUP" && <Tooltip title="Liberar chave"><Button size="small" variant="contained" startIcon={<KeyIcon/>} onClick={() => void release(row)}>Liberar</Button></Tooltip>}
              {(row.status === "IN_USE" || row.status === "REQUESTED_RETURN") && <Tooltip title="Marcar chave como entregue"><Button size="small" color="success" variant="contained" startIcon={<AssignmentTurnedInIcon/>} onClick={() => openCompletion(row)}>Entregue</Button></Tooltip>}
              {activeStatus(row.status) && <Tooltip title="Regularizar manualmente como chave entregue"><IconButton size="small" color="warning" onClick={() => void regularize(row)}><TaskAltOutlinedIcon/></IconButton></Tooltip>}
            </Stack>
          </TableCell>
        </TableRow>)}
      </TableBody></Table></TableContainer>
      <TablePagination component="div" count={totalElements} page={page} onPageChange={(_,p)=>setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={e=>{setRowsPerPage(Number(e.target.value));setPage(0);}} rowsPerPageOptions={[5,10,50]} labelRowsPerPage="Linhas por página:" labelDisplayedRows={({from:fr,to:tt,count})=>`${fr}-${tt} de ${count}`}/>
    </CardContent></Card>

    <Dialog open={manualOpen} onClose={() => !manualBusy && setManualOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Liberar chave da área de lazer</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ mt: .75 }}>
          <TextField select label="Área de lazer" value={manualSpaceType} onChange={e => setManualSpaceType(e.target.value as SpaceType)} fullWidth>
            <MenuItem value="GYM">Academia</MenuItem><MenuItem value="GAMES_ROOM">Sala de Jogos</MenuItem><MenuItem value="PLAYROOM">Brinquedoteca</MenuItem><MenuItem value="SAUNA">Sauna</MenuItem>
          </TextField>
          <Autocomplete
            options={residentOptions}
            value={resident}
            loading={residentLoading}
            filterOptions={options => options}
            onChange={(_, value) => setResident(value)}
            onInputChange={(_, value, reason) => { if (reason === "input" || reason === "clear") setResidentQuery(value); }}
            getOptionLabel={item => `${item.name} — Bloco ${item.block || "?"} / Apto ${item.apartment || "?"}`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={params => <TextField {...params} label="Morador / bloco / apartamento" placeholder="Digite nome, bloco ou apartamento" InputProps={{ ...params.InputProps, endAdornment: <>{residentLoading ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</> }} />}
          />
          {resident && <Alert severity="info" icon={false}>Será liberada a chave da <strong>{spaceLabel(manualSpaceType)}</strong> para <strong>{resident.name}</strong> — Bloco <strong>{resident.block || "-"}</strong> Apto <strong>{resident.apartment || "-"}</strong>.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setManualOpen(false)} disabled={manualBusy}>Cancelar</Button>
        <Button variant="contained" startIcon={<KeyIcon />} onClick={() => void saveManualRelease()} disabled={manualBusy || !resident}>{manualBusy ? "Liberando..." : "Liberar chave"}</Button>
      </DialogActions>
    </Dialog>

    <Dialog open={Boolean(completionRow)} onClose={() => !completionBusy && setCompletionRow(null)} fullWidth maxWidth="xs">
      <DialogTitle>Chave entregue</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ mt: .75 }}>
          {completionRow && <Typography variant="body2">{spaceLabel(completionRow.spaceType)} — {completionRow.residentName} — Bloco {completionRow.block} Apto {completionRow.apartment}</Typography>}
          <TextField
            label="Data e hora da entrega"
            type="datetime-local"
            value={completedAt}
            onChange={e => setCompletedAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
            helperText="Preenchido automaticamente com o horário atual. Altere somente se necessário."
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCompletionRow(null)} disabled={completionBusy}>Cancelar</Button>
        <Button color="success" variant="contained" startIcon={<AssignmentTurnedInIcon />} onClick={() => void finishCompletion()} disabled={completionBusy || !completedAt}>{completionBusy ? "Finalizando..." : "Marcar como entregue"}</Button>
      </DialogActions>
    </Dialog>
  </Box>;
}
