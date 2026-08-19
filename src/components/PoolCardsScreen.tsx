import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Link, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow,
  TextField, Tooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import HighlightOffOutlinedIcon from "@mui/icons-material/HighlightOffOutlined";
import {
  approvePoolCard, condominiumLogoUrl, createPoolCard, deletePoolCard, exportPoolCardsExcel, fetchPoolCards,
  fetchPoolCardResidentOptions, fetchPoolCardSettings, poolCardMedicalReportDriveUrl, poolCardPdfUrl, rejectPoolCard,
  updatePoolCard, uploadPoolCardMedicalReport, userFriendlyError, type PoolCard, type PoolCardExpiryFilter,
  type PoolCardResidentOption, type PoolCardSettings, type User,
} from "../api";
import PoolCardLandscapeViewer from "./PoolCardLandscapeViewer";
import PoolCardStatusIcon, { poolCardStatusLabel } from "./PoolCardStatusIcon";
import { confirmDialog } from "../utils/confirmDialog";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
function formatDate(value: string): string { return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR"); }

export default function PoolCardsScreen({ currentUser }: Readonly<{ currentUser: User }>) {
  const canManage = Boolean(currentUser.canManagePoolCards) || ["ADMIN", "SECRETARY"].includes((currentUser.role || "").toUpperCase());
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [cards, setCards] = useState<PoolCard[]>([]);
  const [settings, setSettings] = useState<PoolCardSettings | null>(null);
  const [residentOptions, setResidentOptions] = useState<PoolCardResidentOption[]>([]);
  const [residentQuery, setResidentQuery] = useState("");
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expiryFilter, setExpiryFilter] = useState<PoolCardExpiryFilter>("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<PoolCard | null>(null);
  const [viewing, setViewing] = useState<PoolCard | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [resident, setResident] = useState<PoolCardResidentOption | null>(null);
  const [issueDate, setIssueDate] = useState(today());
  const [underTen, setUnderTen] = useState(false);
  const [report, setReport] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalElements, setTotalElements] = useState(0);

  const loadCards = useCallback(async (requestedPage = page) => {
    setLoading(true); setError("");
    try {
      const result = await fetchPoolCards({ search, expiryFilter, page: requestedPage, size: rowsPerPage });
      setCards(result.content); setTotalElements(result.totalElements);
      if (result.totalPages > 0 && requestedPage >= result.totalPages) setPage(result.totalPages - 1);
    } catch (e) { setError(userFriendlyError(e, "Não foi possível carregar as carteirinhas.")); }
    finally { setLoading(false); }
  }, [page, rowsPerPage, search, expiryFilter]);

  useEffect(() => {
    let active = true;
    void fetchPoolCardSettings().then(v => { if (active) setSettings(v); })
      .catch(e => { if (active) setError(userFriendlyError(e, "Não foi possível carregar as configurações da piscina.")); });
    return () => { active = false; };
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void loadCards(), 250); return () => window.clearTimeout(timer); }, [loadCards]);
  useEffect(() => {
    if (!formOpen || !canManage) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      setResidentsLoading(true);
      void fetchPoolCardResidentOptions(residentQuery, 20).then(items => {
        if (!active) return;
        setResidentOptions(resident && !items.some(i => i.id === resident.id) ? [resident, ...items] : items);
      }).catch(e => { if (active) setError(userFriendlyError(e, "Não foi possível pesquisar os condôminos.")); })
        .finally(() => { if (active) setResidentsLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [formOpen, canManage, residentQuery, resident]);

  const openNew = () => { setEditing(null); setResident(null); setResidentQuery(""); setResidentOptions([]); setIssueDate(today()); setUnderTen(false); setReport(null); setFormOpen(true); };
  const openEdit = (card: PoolCard) => {
    const selected = { id: card.residentRegistryEntryId, name: card.residentName, block: card.block, apartment: card.apartment };
    setEditing(card); setResident(selected); setResidentQuery(card.residentName); setResidentOptions([selected]); setIssueDate(card.issueDate); setUnderTen(card.underTen); setReport(null); setFormOpen(true);
  };
  const save = async () => {
    if (!resident) return setError("Selecione o condômino.");
    if (!editing && !report) return setError("Anexe o laudo médico em PDF, JPG ou PNG.");
    setSaving(true); setError(""); let created: PoolCard | null = null;
    try {
      const payload = { residentRegistryEntryId: resident.id, issueDate, underTen };
      let saved = editing ? await updatePoolCard(editing.id, payload) : await createPoolCard(payload);
      if (!editing) created = saved;
      if (report) saved = await uploadPoolCardMedicalReport(saved.id, report);
      setFormOpen(false); const target = editing ? page : 0; if (!editing) setPage(0); await loadCards(target); setViewing(saved);
    } catch (e) {
      if (created) try { await deletePoolCard(created.id); } catch { /* evita órfão */ }
      setError(userFriendlyError(e, "Não foi possível salvar a carteirinha."));
    } finally { setSaving(false); }
  };
  const remove = async (card: PoolCard) => {
    if (!await confirmDialog({ title: "Excluir carteirinha?", text: `Tem certeza que deseja excluir a carteirinha de ${card.residentName}?`, confirmButtonText: "Excluir" })) return;
    try { await deletePoolCard(card.id); const target = cards.length === 1 && page > 0 ? page - 1 : page; if (target !== page) setPage(target); await loadCards(target); }
    catch (e) { setError(userFriendlyError(e, "Não foi possível excluir.")); }
  };
  const approve = async (card: PoolCard) => {
    if (!await confirmDialog({ title: "Validar carteirinha?", text: `Confirma que o laudo de ${card.residentName} foi conferido e está apto?`, confirmButtonText: "Validar" })) return;
    try { const saved = await approvePoolCard(card.id); if (viewing?.id === card.id) setViewing(saved); await loadCards(page); }
    catch (e) { setError(userFriendlyError(e, "Não foi possível validar a carteirinha.")); }
  };
  const reject = async (card: PoolCard) => {
    if (!await confirmDialog({ title: "Reprovar laudo?", text: `Confirma que o laudo de ${card.residentName} não deve liberar a carteirinha?`, confirmButtonText: "Reprovar" })) return;
    try { const saved = await rejectPoolCard(card.id); if (viewing?.id === card.id) setViewing(saved); await loadCards(page); }
    catch (e) { setError(userFriendlyError(e, "Não foi possível reprovar o laudo.")); }
  };
  const exportExcel = async () => { setExporting(true); setError(""); try { await exportPoolCardsExcel(); } catch (e) { setError(userFriendlyError(e, "Não foi possível exportar as carteirinhas para Excel.")); } finally { setExporting(false); } };
  const logo = useMemo(() => settings?.logoAvailable ? condominiumLogoUrl(Date.now()) : undefined, [settings?.logoAvailable]);

  const filterButtons: Array<{ value: PoolCardExpiryFilter; title: string; icon: ReactNode }> = [
    { value: "EXPIRED", title: "Carteirinhas vencidas", icon: <EventBusyOutlinedIcon /> },
    { value: "WEEK", title: "A vencer em até 7 dias", icon: <EventOutlinedIcon /> },
    { value: "MONTH", title: "A vencer em até 1 mês", icon: <CalendarMonthOutlinedIcon /> },
  ];

  return <Box sx={{ mt: 2 }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5}>
      <Box><Typography variant="subtitle1" fontWeight={700}>Carteirinhas de piscina</Typography><Typography variant="body2" sx={{ opacity: .7 }}>Consulte validade e acompanhe os laudos pendentes de conferência.</Typography></Box>
      <Stack direction="row" spacing={.5} alignItems="center" flexWrap="wrap" useFlexGap>
        {filterButtons.map(f => <Tooltip key={f.value} title={f.title} arrow><IconButton color={expiryFilter === f.value ? "primary" : "default"} onClick={() => { setExpiryFilter(v => v === f.value ? "" : f.value); setPage(0); }} aria-label={f.title}>{f.icon}</IconButton></Tooltip>)}
        {canManage && <Tooltip title="Exportar Excel" arrow><span><IconButton color="primary" onClick={() => void exportExcel()} disabled={exporting} aria-label="Exportar Excel"><GridOnOutlinedIcon /></IconButton></span></Tooltip>}
        {canManage && <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>Novo cadastro</Button>}
      </Stack>
    </Stack>
    {expiryFilter && <Chip size="small" sx={{ mt: 1 }} label={filterButtons.find(i => i.value === expiryFilter)?.title} onDelete={() => { setExpiryFilter(""); setPage(0); }} />}
    {error && <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setError("")}>{error}</Alert>}
    <TextField fullWidth size="small" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Pesquisar condômino, bloco ou apartamento" sx={{ mt: 2, maxWidth: 720 }} />

    {loading ? <Box sx={{ py: 6, textAlign: "center" }}><CircularProgress /></Box> : <Paper variant="outlined" sx={{ mt: 2, overflow: "hidden" }}>
      <TableContainer><Table size="small" sx={{ minWidth: 940 }}><TableHead><TableRow>
        <TableCell>Condômino</TableCell><TableCell>Bloco</TableCell><TableCell>Apto</TableCell><TableCell>Validade</TableCell><TableCell>Laudo médico</TableCell><TableCell align="center">Situação</TableCell><TableCell align="right">Ações</TableCell>
      </TableRow></TableHead><TableBody>
        {cards.map(card => <TableRow key={card.id} hover>
          <TableCell><Stack direction="row" spacing={.7} alignItems="center"><strong>{card.residentName}</strong><PoolCardStatusIcon status={card.reviewStatus} valid={card.valid} validUntil={card.validUntil} /></Stack></TableCell>
          <TableCell>{card.block || "—"}</TableCell><TableCell>{card.apartment || "—"}</TableCell><TableCell>{formatDate(card.validUntil)}</TableCell>
          <TableCell sx={{ maxWidth: 240 }}>{!card.medicalReportAvailable ? "—" : canManage ? <Tooltip title="Abrir laudo médico no Google Drive" arrow><Link href={poolCardMedicalReportDriveUrl(card.id)} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ display: "inline-flex", alignItems: "center", gap: .5, maxWidth: 220, verticalAlign: "middle" }}><DescriptionOutlinedIcon sx={{ fontSize: 18, flexShrink: 0 }} /><Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.medicalReportFileName || "Abrir laudo"}</Box></Link></Tooltip> : <Typography variant="body2" color="text.secondary">Cadastrado</Typography>}</TableCell>
          <TableCell align="center"><Tooltip title={poolCardStatusLabel(card.reviewStatus, card.valid, card.validUntil)}><span><Chip size="small" variant="outlined" label={card.reviewStatus === "PENDING_REVIEW" ? "Pendente" : card.reviewStatus === "REJECTED" ? "Reprovada" : card.valid ? "Validada" : "Vencida"} /></span></Tooltip></TableCell>
          <TableCell align="right">
            <Tooltip title="Visualizar"><IconButton size="small" onClick={() => setViewing(card)}><VisibilityOutlinedIcon /></IconButton></Tooltip>
            {card.reviewStatus === "APPROVED" && card.valid && <Tooltip title="Exportar PDF"><IconButton size="small" component="a" href={poolCardPdfUrl(card.id)}><PictureAsPdfOutlinedIcon /></IconButton></Tooltip>}
            {canManage && card.medicalReportAvailable && card.reviewStatus !== "APPROVED" && <Tooltip title="Validar e conferir"><IconButton size="small" color="success" onClick={() => void approve(card)}><TaskAltOutlinedIcon /></IconButton></Tooltip>}
            {canManage && card.medicalReportAvailable && card.reviewStatus !== "REJECTED" && <Tooltip title="Reprovar laudo"><IconButton size="small" color="error" onClick={() => void reject(card)}><HighlightOffOutlinedIcon /></IconButton></Tooltip>}
            {canManage && <><Tooltip title="Editar"><IconButton size="small" onClick={() => openEdit(card)}><EditOutlinedIcon /></IconButton></Tooltip><Tooltip title="Excluir"><IconButton size="small" onClick={() => void remove(card)}><DeleteOutlineIcon /></IconButton></Tooltip></>}
          </TableCell>
        </TableRow>)}
        {!cards.length && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>Nenhuma carteirinha encontrada.</TableCell></TableRow>}
      </TableBody></Table></TableContainer>
      <TablePagination component="div" count={totalElements} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[5,10,50]} labelRowsPerPage="Linhas por página:" labelDisplayedRows={({from,to,count}) => `${from}-${to} de ${count}`} />
    </Paper>}

    <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} fullWidth maxWidth="sm"><DialogTitle>{editing ? "Editar carteirinha" : "Nova carteirinha de piscina"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
      <Autocomplete options={residentOptions} value={resident} loading={residentsLoading} filterOptions={o => o} onChange={(_,v) => setResident(v)} onInputChange={(_,v,r) => { if (r === "input" || r === "clear") setResidentQuery(v); }} getOptionLabel={i => `${i.name} — Bloco ${i.block || "?"} / Apto ${i.apartment || "?"}`} isOptionEqualToValue={(a,b) => a.id === b.id} renderInput={params => <TextField {...params} label="Condômino" required placeholder="Digite nome, bloco ou apartamento" InputProps={{...params.InputProps, endAdornment:<>{residentsLoading ? <CircularProgress size={18}/> : null}{params.InputProps.endAdornment}</>}} />} />
      <TextField type="date" label="Data de emissão" value={issueDate} onChange={e=>setIssueDate(e.target.value)} InputLabelProps={{shrink:true}} required />
      <Autocomplete options={[{label:"Sim",value:true},{label:"Não",value:false}]} value={underTen?{label:"Sim",value:true}:{label:"Não",value:false}} onChange={(_,v)=>setUnderTen(Boolean(v?.value))} isOptionEqualToValue={(a,b)=>a.value===b.value} renderInput={params=><TextField {...params} label="Menor de 10 anos"/>}/>
      <Button component="label" variant="outlined" startIcon={<DescriptionOutlinedIcon />}>{report ? report.name : editing?.medicalReportAvailable ? "Substituir laudo médico (PDF/JPG/PNG)" : "Anexar laudo médico (PDF/JPG/PNG)"}<input hidden type="file" accept="application/pdf,image/jpeg,image/png" onChange={e=>setReport(e.target.files?.[0] || null)}/></Button>
      {settings && <Chip label={`Validade configurada: ${settings.validityMonths} meses`} variant="outlined" />}
    </Stack></DialogContent><DialogActions><Button onClick={()=>setFormOpen(false)} disabled={saving}>Cancelar</Button><Button variant="contained" onClick={()=>void save()} disabled={saving || !resident || !issueDate || (!editing && !report)}>{saving?"Salvando...":"Salvar"}</Button></DialogActions></Dialog>

    <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} fullWidth maxWidth="md" fullScreen={mobile} PaperProps={{ sx: { overflow: "hidden" } }}><DialogTitle sx={{ py: 1.25 }}>Carteirinha de Piscina</DialogTitle><DialogContent sx={{ p: mobile ? 0 : 2, overflow: "hidden" }}>{viewing && settings && <PoolCardLandscapeViewer card={viewing} settings={settings} logoUrl={logo} />}</DialogContent><DialogActions sx={{ py: 1, px: 2 }}>
      {viewing && canManage && viewing.medicalReportAvailable && viewing.reviewStatus !== "APPROVED" && <Button color="success" startIcon={<TaskAltOutlinedIcon />} onClick={() => void approve(viewing)}>Validar</Button>}
      {viewing?.reviewStatus === "APPROVED" && viewing.valid && <Button startIcon={<PictureAsPdfOutlinedIcon />} component="a" href={poolCardPdfUrl(viewing.id)}>Exportar PDF</Button>}
      <Button onClick={() => setViewing(null)}>Fechar</Button>
    </DialogActions></Dialog>
  </Box>;
}
