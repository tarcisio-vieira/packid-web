import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import ToysIcon from "@mui/icons-material/Toys";
import KeyIcon from "@mui/icons-material/Key";
import PrintIcon from "@mui/icons-material/Print";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SpaOutlinedIcon from "@mui/icons-material/SpaOutlined";
import {
  completeSpaceAccess,
  fetchSpaceAccess,
  releaseSpaceAccess,
  userFriendlyError,
  type SpaceAccess,
  type SpaceType,
} from "../api";

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
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function todayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function SpacesScreen({ embedded = false }: Readonly<{ embedded?: boolean }> = {}) {
  const [rows, setRows] = useState<SpaceAccess[]>([]);
  const [spaceType, setSpaceType] = useState<SpaceType | "">("");
  const [from, setFrom] = useState(todayOffset(-30));
  const [to, setTo] = useState(todayOffset(0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchSpaceAccess({ spaceType, from: from || undefined, to: to || undefined }));
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível carregar as solicitações da área de lazer."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [spaceType, from, to]);

  const pending = useMemo(() => rows.filter(r => r.status === "REQUESTED_PICKUP" || r.status === "REQUESTED_RETURN"), [rows]);

  const release = async (row: SpaceAccess) => {
    setLoading(true); setError(null);
    try { await releaseSpaceAccess(row.id); await load(); }
    catch (err) { setError(userFriendlyError(err, "Não foi possível registrar a liberação da chave.")); }
    finally { setLoading(false); }
  };

  const complete = async (row: SpaceAccess) => {
    setLoading(true); setError(null);
    try { await completeSpaceAccess(row.id); await load(); }
    catch (err) { setError(userFriendlyError(err, "Não foi possível finalizar a devolução da chave.")); }
    finally { setLoading(false); }
  };

  const printReport = () => {
    const reportRows = rows.map(row => `
      <tr>
        <td>${escapeHtml(spaceLabel(row.spaceType))}</td>
        <td>${escapeHtml(`Bloco ${row.block} / Apto ${row.apartment}`)}</td>
        <td>${escapeHtml(formatDateTime(row.requestedAt))}</td>
        <td>${escapeHtml(formatDateTime(row.releasedAt))}</td>
        <td>${escapeHtml(formatDateTime(row.returnRequestedAt))}</td>
        <td>${escapeHtml(formatDateTime(row.completedAt))}</td>
        <td>${escapeHtml(spaceAccessStatusLabel(row.status))}</td>
      </tr>`).join("");
    const popup = globalThis.open("", "_blank", "width=1100,height=800");
    if (!popup) { setError("O navegador bloqueou a janela de impressão. Libere pop-ups para este site."); return; }
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório de área de lazer</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0 0 8px}.sub{margin-bottom:18px;color:#555}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #bbb;padding:6px;text-align:left}th{background:#eee}@media print{body{padding:0}}</style></head>
      <body><h1>VSGI Condomínio — ${escapeHtml(spaceType ? spaceLabel(spaceType) : "Relatório de área de lazer")}</h1>
      <div class="sub">Período: ${escapeHtml(from || "início")} a ${escapeHtml(to || "hoje")} · ${rows.length} registro(s)</div>
      <table><thead><tr><th>Área</th><th>Unidade</th><th>Solicitação</th><th>Liberação</th><th>Pedido devolução</th><th>Encerramento</th><th>Status</th></tr></thead><tbody>${reportRows}</tbody></table>
      <script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  return (
    <Box sx={{ maxWidth: embedded ? "none" : 1500, mx: embedded ? 0 : "auto", mt: embedded ? 2 : 2, mb: embedded ? 0 : 4 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>Área de lazer</Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>Liberação e devolução de chaves da Brinquedoteca, Sala de Jogos, Academia e Sauna.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={printReport} disabled={loading}>Imprimir relatório</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(4,1fr)" }, gap: 2, mb: 2 }}>
        {(["PLAYROOM", "GAMES_ROOM", "GYM", "SAUNA"] as SpaceType[]).map(type => {
          const count = pending.filter(row => row.spaceType === type).length;
          return <Card key={type} variant="outlined" sx={{ cursor: "pointer", borderColor: spaceType === type ? "primary.main" : undefined }} onClick={() => setSpaceType(current => current === type ? "" : type)}>
            <CardContent><Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 2, bgcolor: "action.hover" }}>{spaceIcon(type)}</Box>
              <Box sx={{ flex: 1 }}><Typography fontWeight={700}>{spaceLabel(type)}</Typography><Typography variant="caption" color="text.secondary">{count} solicitação(ões) pendente(s)</Typography></Box>
              {count > 0 && <Chip label={count} color="warning" />}
            </Stack></CardContent>
          </Card>;
        })}
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
            <TextField select label="Área" value={spaceType} onChange={(e) => setSpaceType(e.target.value as SpaceType | "")} sx={{ minWidth: 220 }}>
              <MenuItem value="">Todos</MenuItem><MenuItem value="PLAYROOM">Brinquedoteca</MenuItem><MenuItem value="GAMES_ROOM">Sala de Jogos</MenuItem><MenuItem value="GYM">Academia</MenuItem><MenuItem value="SAUNA">Sauna</MenuItem>
            </TextField>
            <TextField label="De" type="date" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Até" type="date" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Box sx={{ flex: 1 }} />
            <Button onClick={() => void load()} disabled={loading}>Atualizar</Button>
          </Stack>

          <TableContainer>
            <Table size="small" sx={{ minWidth: 1050 }}>
              <TableHead><TableRow>
                <TableCell>Área</TableCell><TableCell>Unidade</TableCell><TableCell>Solicitado</TableCell>
                <TableCell>Liberado</TableCell><TableCell>Pedido devolução</TableCell><TableCell>Encerrado</TableCell><TableCell>Status</TableCell><TableCell align="right">Ação</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>Nenhum registro no período.</TableCell></TableRow>}
                {rows.map(row => <TableRow key={row.id} hover>
                  <TableCell><Stack direction="row" spacing={1} alignItems="center">{spaceIcon(row.spaceType)}<span>{spaceLabel(row.spaceType)}</span></Stack></TableCell>
                  <TableCell>Bloco {row.block} / Apto {row.apartment}</TableCell>
                  <TableCell>{formatDateTime(row.requestedAt)}</TableCell>
                  <TableCell>{formatDateTime(row.releasedAt)}</TableCell>
                  <TableCell>{formatDateTime(row.returnRequestedAt)}</TableCell>
                  <TableCell>{formatDateTime(row.completedAt)}</TableCell>
                  <TableCell><Chip size="small" label={spaceAccessStatusLabel(row.status)} color={row.status === "REQUESTED_PICKUP" || row.status === "REQUESTED_RETURN" ? "warning" : row.status === "IN_USE" ? "info" : "default"} /></TableCell>
                  <TableCell align="right">
                    {row.status === "REQUESTED_PICKUP" && <Button size="small" variant="contained" startIcon={<KeyIcon />} onClick={() => void release(row)}>Liberar chave</Button>}
                    {row.status === "REQUESTED_RETURN" && <Button size="small" color="success" variant="contained" startIcon={<AssignmentTurnedInIcon />} onClick={() => void complete(row)}>Receber chave</Button>}
                  </TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
