import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow,
  TextField, Tooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import PoolOutlinedIcon from "@mui/icons-material/PoolOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import {
  condominiumLogoUrl, createPoolCard, deletePoolCard, exportPoolCardsExcel, fetchPoolCards,
  fetchPoolCardResidentOptions, fetchPoolCardSettings, poolCardPdfUrl,
  updatePoolCard, userFriendlyError, type PoolCard, type PoolCardExpiryFilter,
  type PoolCardResidentOption, type PoolCardSettings, type User,
} from "../api";
import PoolCardLandscapeViewer from "./PoolCardLandscapeViewer";
import { confirmDialog } from "../utils/confirmDialog";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
function formatDate(value: string): string { return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR"); }

export default function PoolCardsScreen({ currentUser }: Readonly<{ currentUser: User }>) {
  const role = (currentUser.role || "").toUpperCase();
  const canManage = Boolean(currentUser.canManagePoolCards) || ["ADMIN", "SECRETARY"].includes(role);
  const isPoolAttendant = role === "POOL_ATTENDANT";
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

  const openNew = () => { setEditing(null); setResident(null); setResidentQuery(""); setResidentOptions([]); setIssueDate(today()); setUnderTen(false); setFormOpen(true); };
  const openEdit = (card: PoolCard) => {
    const selected = { id: card.residentRegistryEntryId, name: card.residentName, block: card.block, apartment: card.apartment };
    setEditing(card); setResident(selected); setResidentQuery(card.residentName); setResidentOptions([selected]); setIssueDate(card.issueDate); setUnderTen(card.underTen); setFormOpen(true);
  };
  const save = async () => {
    if (!resident) return setError("Selecione o condômino.");
    setSaving(true); setError("");
    try {
      const payload = { residentRegistryEntryId: resident.id, issueDate, underTen };
      const saved = editing ? await updatePoolCard(editing.id, payload) : await createPoolCard(payload);
      setFormOpen(false);
      const target = editing ? page : 0;
      if (!editing) setPage(0);
      await loadCards(target);
      setViewing(saved);
    } catch (e) { setError(userFriendlyError(e, "Não foi possível salvar a carteirinha.")); }
    finally { setSaving(false); }
  };
  const remove = async (card: PoolCard) => {
    if (!await confirmDialog({ title: "Excluir carteirinha?", text: `Tem certeza que deseja excluir a carteirinha de ${card.residentName}?`, confirmButtonText: "Excluir" })) return;
    try { await deletePoolCard(card.id); const target = cards.length === 1 && page > 0 ? page - 1 : page; if (target !== page) setPage(target); await loadCards(target); }
    catch (e) { setError(userFriendlyError(e, "Não foi possível excluir.")); }
  };
  const exportExcel = async () => { setExporting(true); setError(""); try { await exportPoolCardsExcel(); } catch (e) { setError(userFriendlyError(e, "Não foi possível exportar as carteirinhas para Excel.")); } finally { setExporting(false); } };
  const logo = useMemo(() => settings?.logoAvailable ? condominiumLogoUrl(Date.now()) : undefined, [settings?.logoAvailable]);

  const filterButtons: Array<{ value: PoolCardExpiryFilter; title: string; icon: ReactNode }> = [
    { value: "EXPIRED", title: "Carteirinhas vencidas", icon: <EventBusyOutlinedIcon /> },
    { value: "WEEK", title: "A vencer em até 7 dias", icon: <EventOutlinedIcon /> },
    { value: "MONTH", title: "A vencer em até 1 mês", icon: <CalendarMonthOutlinedIcon /> },
  ];

  const mobileList = <Stack spacing={1.15} sx={{ mt: 1.5, pb: 1 }}>
    {cards.map(card => <Paper key={card.id} elevation={0} variant="outlined" sx={{ p: 1.4, borderRadius: 3 }}>
      <Stack direction="row" spacing={1.2} alignItems="flex-start">
        <Box sx={{ width: 44, height: 44, borderRadius: 2.2, bgcolor: card.valid ? "success.main" : "action.disabledBackground", color: card.valid ? "success.contrastText" : "text.secondary", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <BadgeOutlinedIcon />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography fontWeight={800} sx={{ lineHeight: 1.2 }}>{card.residentName}</Typography>
          <Stack direction="row" spacing={.5} alignItems="center" sx={{ mt: .45 }}>
            <ApartmentOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">Bloco {card.block || "—"} · Apto {card.apartment || "—"}</Typography>
          </Stack>
          <Stack direction="row" spacing={.7} alignItems="center" sx={{ mt: .7, flexWrap: "wrap" }} useFlexGap>
            <Chip size="small" color={card.valid ? "success" : "default"} label={card.valid ? "VÁLIDA" : "VENCIDA"} sx={{ fontWeight: 800 }} />
            <Typography variant="caption" color="text.secondary">Validade: {formatDate(card.validUntil)}</Typography>
          </Stack>
        </Box>
      </Stack>
      <Stack direction="row" spacing={.75} sx={{ mt: 1.25 }}>
        <Button fullWidth variant="contained" size="medium" startIcon={<VisibilityOutlinedIcon />} onClick={() => setViewing(card)}>Ver carteirinha</Button>
        {canManage && <Tooltip title="Editar"><IconButton color="primary" onClick={() => openEdit(card)}><EditOutlinedIcon /></IconButton></Tooltip>}
        {canManage && <Tooltip title="Excluir"><IconButton color="error" onClick={() => void remove(card)}><DeleteOutlineIcon /></IconButton></Tooltip>}
      </Stack>
    </Paper>)}
    {!cards.length && <Paper variant="outlined" sx={{ p: 3, textAlign: "center", borderRadius: 3 }}><PoolOutlinedIcon sx={{ fontSize: 36, opacity: .4 }} /><Typography sx={{ mt: 1 }}>Nenhuma carteirinha encontrada.</Typography></Paper>}
  </Stack>;

  return <Box sx={{ mt: mobile ? 0 : 2, mx: mobile ? -1 : 0 }}>
    <Box sx={mobile ? { position: "sticky", top: 0, zIndex: 3, bgcolor: "background.default", px: 1.25, pt: 1, pb: 1, borderBottom: "1px solid", borderColor: "divider" } : undefined}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.2}>
        <Box>
          <Stack direction="row" spacing={.8} alignItems="center"><PoolOutlinedIcon color="primary" /><Typography variant={mobile ? "h6" : "subtitle1"} fontWeight={800}>Carteirinhas de piscina</Typography></Stack>
          <Typography variant="body2" sx={{ opacity: .7 }}>{mobile && isPoolAttendant ? "Consulta rápida para acesso à piscina." : "Consulte a validade e gerencie as carteirinhas dos condôminos."}</Typography>
        </Box>
        <Stack direction="row" spacing={.5} alignItems="center" flexWrap="wrap" useFlexGap>
          {filterButtons.map(f => <Tooltip key={f.value} title={f.title} arrow><IconButton size={mobile ? "small" : "medium"} color={expiryFilter === f.value ? "primary" : "default"} onClick={() => { setExpiryFilter(v => v === f.value ? "" : f.value); setPage(0); }} aria-label={f.title}>{f.icon}</IconButton></Tooltip>)}
          {canManage && !mobile && <Tooltip title="Exportar Excel" arrow><span><IconButton color="primary" onClick={() => void exportExcel()} disabled={exporting} aria-label="Exportar Excel"><GridOnOutlinedIcon /></IconButton></span></Tooltip>}
          {canManage && <Button size={mobile ? "small" : "medium"} variant="contained" startIcon={<AddIcon />} onClick={openNew}>Novo cadastro</Button>}
        </Stack>
      </Stack>
      {expiryFilter && <Chip size="small" sx={{ mt: 1 }} label={filterButtons.find(i => i.value === expiryFilter)?.title} onDelete={() => { setExpiryFilter(""); setPage(0); }} />}
      {error && <Alert severity="error" sx={{ mt: 1.2 }} onClose={() => setError("")}>{error}</Alert>}
      <TextField fullWidth size="small" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Pesquisar nome, bloco ou apartamento" sx={{ mt: 1.2, maxWidth: 720, bgcolor: "background.paper" }} />
    </Box>

    {loading ? <Box sx={{ py: 6, textAlign: "center" }}><CircularProgress /></Box> : mobile ? <Box sx={{ px: 1 }}>{mobileList}
      {totalElements > 0 && <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden", mb: 1 }}><TablePagination component="div" count={totalElements} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[10, 20]} labelRowsPerPage="Por página:" labelDisplayedRows={({from,to,count}) => `${from}-${to} de ${count}`} /></Paper>}
    </Box> : <Paper variant="outlined" sx={{ mt: 2, overflow: "hidden" }}>
      <TableContainer><Table size="small" sx={{ minWidth: 940 }}><TableHead><TableRow>
        <TableCell>Condômino</TableCell><TableCell>Bloco</TableCell><TableCell>Apto</TableCell><TableCell>Validade</TableCell><TableCell align="center">Situação</TableCell><TableCell align="right">Ações</TableCell>
      </TableRow></TableHead><TableBody>
        {cards.map(card => <TableRow key={card.id} hover>
          <TableCell><strong>{card.residentName}</strong></TableCell>
          <TableCell>{card.block || "—"}</TableCell><TableCell>{card.apartment || "—"}</TableCell><TableCell>{formatDate(card.validUntil)}</TableCell>
          <TableCell align="center"><Chip size="small" color={card.valid ? "success" : "default"} variant="outlined" label={card.valid ? "Válida" : "Vencida"} /></TableCell>
          <TableCell align="right">
            <Tooltip title="Visualizar"><IconButton size="small" onClick={() => setViewing(card)}><VisibilityOutlinedIcon /></IconButton></Tooltip>
            {card.valid && <Tooltip title="Exportar PDF"><IconButton size="small" component="a" href={poolCardPdfUrl(card.id)}><PictureAsPdfOutlinedIcon /></IconButton></Tooltip>}
            {canManage && <><Tooltip title="Editar"><IconButton size="small" onClick={() => openEdit(card)}><EditOutlinedIcon /></IconButton></Tooltip><Tooltip title="Excluir"><IconButton size="small" onClick={() => void remove(card)}><DeleteOutlineIcon /></IconButton></Tooltip></>}
          </TableCell>
        </TableRow>)}
        {!cards.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>Nenhuma carteirinha encontrada.</TableCell></TableRow>}
      </TableBody></Table></TableContainer>
      <TablePagination component="div" count={totalElements} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }} rowsPerPageOptions={[5,10,50]} labelRowsPerPage="Linhas por página:" labelDisplayedRows={({from,to,count}) => `${from}-${to} de ${count}`} />
    </Paper>}

    <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} fullWidth maxWidth="sm" fullScreen={mobile && canManage}><DialogTitle>{editing ? "Editar carteirinha" : "Nova carteirinha de piscina"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
      <Autocomplete options={residentOptions} value={resident} loading={residentsLoading} filterOptions={o => o} onChange={(_,v) => setResident(v)} onInputChange={(_,v,r) => { if (r === "input" || r === "clear") setResidentQuery(v); }} getOptionLabel={i => `${i.name} — Bloco ${i.block || "?"} / Apto ${i.apartment || "?"}`} isOptionEqualToValue={(a,b) => a.id === b.id} renderInput={params => <TextField {...params} label="Condômino" required placeholder="Digite nome, bloco ou apartamento" InputProps={{...params.InputProps, endAdornment:<>{residentsLoading ? <CircularProgress size={18}/> : null}{params.InputProps.endAdornment}</>}} />} />
      <TextField type="date" label="Data de emissão" value={issueDate} onChange={e=>setIssueDate(e.target.value)} InputLabelProps={{shrink:true}} required />
      <Autocomplete options={[{label:"Sim",value:true},{label:"Não",value:false}]} value={underTen?{label:"Sim",value:true}:{label:"Não",value:false}} onChange={(_,v)=>setUnderTen(Boolean(v?.value))} isOptionEqualToValue={(a,b)=>a.value===b.value} renderInput={params=><TextField {...params} label="Menor de 10 anos"/>}/>
      {settings && <Chip label={`Validade configurada: ${settings.validityMonths} meses`} variant="outlined" />}
    </Stack></DialogContent><DialogActions><Button onClick={()=>setFormOpen(false)} disabled={saving}>Cancelar</Button><Button variant="contained" onClick={()=>void save()} disabled={saving || !resident || !issueDate}>{saving?"Salvando...":"Salvar"}</Button></DialogActions></Dialog>

    <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} fullWidth maxWidth="lg" fullScreen={mobile} PaperProps={{ sx: { overflow: "hidden", bgcolor: mobile ? "#111" : undefined } }}>
      <DialogTitle sx={{ py: 1.1, bgcolor: mobile ? "#111" : undefined, color: mobile ? "common.white" : undefined }}>Carteirinha de Piscina</DialogTitle>
      <DialogContent sx={{ p: mobile ? 0 : 2, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", bgcolor: mobile ? "#111" : undefined }}>{viewing && settings && <PoolCardLandscapeViewer card={viewing} settings={settings} logoUrl={logo} />}</DialogContent>
      <DialogActions sx={{ py: 1, px: 2, bgcolor: mobile ? "#111" : undefined }}>
        {viewing?.valid && !isPoolAttendant && <Button startIcon={<PictureAsPdfOutlinedIcon />} component="a" href={poolCardPdfUrl(viewing.id)}>Exportar PDF</Button>}
        <Button variant={mobile ? "contained" : "text"} fullWidth={mobile} onClick={() => setViewing(null)}>Fechar</Button>
      </DialogActions>
    </Dialog>
  </Box>;
}
