import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import {
  condominiumLogoUrl, createPoolCard, deletePoolCard, fetchPoolCards, fetchPoolCardSettings,
  fetchRegistryEntriesPage, poolCardMedicalReportUrl, poolCardPdfUrl, updatePoolCard,
  uploadPoolCardMedicalReport, userFriendlyError,
  type PoolCard, type PoolCardSettings, type RegistryEntry, type User,
} from "../api";
import PoolCardVisual from "./PoolCardVisual";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default function PoolCardsScreen({ currentUser }: { currentUser: User }) {
  const canManage = Boolean(currentUser.canManagePoolCards) || ["ADMIN", "SECRETARY"].includes((currentUser.role || "").toUpperCase());
  const [cards, setCards] = useState<PoolCard[]>([]);
  const [settings, setSettings] = useState<PoolCardSettings | null>(null);
  const [residents, setResidents] = useState<RegistryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<PoolCard | null>(null);
  const [viewing, setViewing] = useState<PoolCard | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [resident, setResident] = useState<RegistryEntry | null>(null);
  const [issueDate, setIssueDate] = useState(today());
  const [underTen, setUnderTen] = useState(false);
  const [report, setReport] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [items, config] = await Promise.all([fetchPoolCards(search), fetchPoolCardSettings()]);
      setCards(items); setSettings(config);
      if (canManage && residents.length === 0) {
        const firstPage = await fetchRegistryEntriesPage({ type: "RESIDENT", includeInactive: false, page: 0, size: 100, sort: "unit", direction: "asc" });
        const allResidents = [...firstPage.content];
        for (let page = 1; page < firstPage.totalPages; page += 1) {
          const nextPage = await fetchRegistryEntriesPage({ type: "RESIDENT", includeInactive: false, page, size: 100, sort: "unit", direction: "asc" });
          allResidents.push(...nextPage.content);
        }
        setResidents(allResidents);
      }
    } catch (e) { setError(userFriendlyError(e, "Não foi possível carregar as carteirinhas.")); }
    finally { setLoading(false); }
  }, [search, canManage, residents.length]);

  useEffect(() => { const t = window.setTimeout(load, 250); return () => window.clearTimeout(t); }, [load]);

  const openNew = () => { setEditing(null); setResident(null); setIssueDate(today()); setUnderTen(false); setReport(null); setFormOpen(true); };
  const openEdit = (card: PoolCard) => {
    setEditing(card); setResident(residents.find(r => r.id === card.residentRegistryEntryId) || null);
    setIssueDate(card.issueDate); setUnderTen(card.underTen); setReport(null); setFormOpen(true);
  };
  const save = async () => {
    if (!resident) { setError("Selecione o condômino."); return; }
    if (!editing && !report) { setError("Anexe o laudo médico em PDF, JPG ou PNG."); return; }
    setSaving(true); setError("");
    let createdCard: PoolCard | null = null;
    try {
      const payload = { residentRegistryEntryId: resident.id, issueDate, underTen };
      let saved: PoolCard;
      if (editing) {
        saved = await updatePoolCard(editing.id, payload);
      } else {
        saved = await createPoolCard(payload);
        createdCard = saved;
      }
      if (report) saved = await uploadPoolCardMedicalReport(saved.id, report);
      setFormOpen(false); await load(); setViewing(saved);
    } catch (e) {
      if (createdCard) {
        try { await deletePoolCard(createdCard.id); } catch { /* evita deixar carteirinha sem laudo quando o upload falhar */ }
      }
      setError(userFriendlyError(e, "Não foi possível salvar a carteirinha."));
    } finally { setSaving(false); }
  };
  const remove = async (card: PoolCard) => {
    if (!window.confirm(`Excluir a carteirinha de ${card.residentName}?`)) return;
    try { await deletePoolCard(card.id); await load(); } catch (e) { setError(userFriendlyError(e, "Não foi possível excluir.")); }
  };

  const logo = useMemo(() => settings?.logoAvailable ? condominiumLogoUrl(Date.now()) : undefined, [settings?.logoAvailable]);

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" sx={{ mb: 2 }}>
        <Box><Typography variant="h5" fontWeight={800}>Carteirinhas de Piscina</Typography><Typography color="text.secondary">Consulta por condômino, bloco ou apartamento.</Typography></Box>
        {canManage && <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>Nova carteirinha</Button>}
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField fullWidth size="small" label="Pesquisar condômino, bloco ou apartamento" value={search} onChange={e => setSearch(e.target.value)} sx={{ mb: 2 }} />
      {loading ? <Box sx={{ py: 6, textAlign: "center" }}><CircularProgress /></Box> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow><TableCell>Condômino</TableCell><TableCell>Bloco</TableCell><TableCell>Apto</TableCell><TableCell>Validade</TableCell><TableCell align="center">Situação</TableCell><TableCell align="right">Ações</TableCell></TableRow></TableHead>
            <TableBody>
              {cards.map(card => <TableRow key={card.id} hover>
                <TableCell>{card.residentName}</TableCell><TableCell>{card.block || "—"}</TableCell><TableCell>{card.apartment || "—"}</TableCell>
                <TableCell>{new Date(`${card.validUntil}T12:00:00`).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell align="center"><Tooltip title={card.valid ? "Carteirinha dentro da validade" : "Carteirinha fora da validade"}><span>{card.valid ? <CheckCircleOutlineIcon sx={{ color: "text.disabled" }} /> : <ErrorOutlineIcon sx={{ color: "text.disabled" }} />}</span></Tooltip></TableCell>
                <TableCell align="right">
                  <Tooltip title="Visualizar"><IconButton size="small" onClick={() => setViewing(card)}><VisibilityOutlinedIcon /></IconButton></Tooltip>
                  {canManage && card.medicalReportAvailable && <Tooltip title="Visualizar laudo médico"><IconButton size="small" component="a" href={poolCardMedicalReportUrl(card.id)} target="_blank"><DescriptionOutlinedIcon /></IconButton></Tooltip>}
                  <Tooltip title="Exportar PDF"><IconButton size="small" component="a" href={poolCardPdfUrl(card.id)}><PictureAsPdfOutlinedIcon /></IconButton></Tooltip>
                  {canManage && <><Tooltip title="Editar"><IconButton size="small" onClick={() => openEdit(card)}><EditOutlinedIcon /></IconButton></Tooltip><Tooltip title="Excluir"><IconButton size="small" onClick={() => remove(card)}><DeleteOutlineIcon /></IconButton></Tooltip></>}
                </TableCell>
              </TableRow>)}
              {!cards.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>Nenhuma carteirinha encontrada.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Editar carteirinha" : "Nova carteirinha de piscina"}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
          <Autocomplete options={residents} value={resident} onChange={(_, v) => setResident(v)} getOptionLabel={r => `${r.name} — Bloco ${r.block || "?"} / Apto ${r.apartment || "?"}`} isOptionEqualToValue={(a,b) => a.id === b.id} renderInput={params => <TextField {...params} label="Condômino" required placeholder="Digite nome, bloco ou apartamento" />} />
          <TextField type="date" label="Data de emissão" value={issueDate} onChange={e => setIssueDate(e.target.value)} InputLabelProps={{ shrink: true }} required />
          <Autocomplete options={[{label:"Sim",value:true},{label:"Não",value:false}]} value={underTen ? {label:"Sim",value:true}:{label:"Não",value:false}} onChange={(_,v) => setUnderTen(Boolean(v?.value))} isOptionEqualToValue={(a,b)=>a.value===b.value} renderInput={params => <TextField {...params} label="Menor de 10 anos" />} />
          <Button component="label" variant="outlined" startIcon={<DescriptionOutlinedIcon />}>{report ? report.name : editing?.medicalReportAvailable ? "Substituir laudo médico (PDF/JPG/PNG)" : "Anexar laudo médico (PDF/JPG/PNG)"}<input hidden type="file" accept="application/pdf,image/jpeg,image/png" onChange={e => setReport(e.target.files?.[0] || null)} /></Button>
          {settings && <Chip label={`Validade configurada: ${settings.validityMonths} meses`} variant="outlined" />}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button><Button variant="contained" onClick={save} disabled={saving || !resident || !issueDate || (!editing && !report)}>{saving ? "Salvando..." : "Salvar"}</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} fullWidth maxWidth="md">
        <DialogTitle>Carteirinha de Piscina</DialogTitle>
        <DialogContent>{viewing && settings && <PoolCardVisual card={viewing} settings={settings} logoUrl={logo} />}</DialogContent>
        <DialogActions>{viewing && <Button startIcon={<PictureAsPdfOutlinedIcon />} component="a" href={poolCardPdfUrl(viewing.id)}>Exportar PDF</Button>}<Button onClick={() => setViewing(null)}>Fechar</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
