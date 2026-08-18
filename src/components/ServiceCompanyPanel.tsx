import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import {
  createServiceCompany, deleteServiceCompany, fetchServiceCompanies, updateServiceCompany, userFriendlyError,
} from "../api";
import type { ServiceCompany, ServiceCompanyPayload } from "../api";

const emptyCompany = (): ServiceCompanyPayload => ({
  name: "", tradeName: "", documentNumber: "", phone: "", email: "", contactName: "", addressLine: "",
  city: "", state: "", zipCode: "", notes: "", active: true,
});

function normalize(v: unknown): string {
  return String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function ServiceCompanyPanel({ newRequestSeq = 0, hideHeader = false }: Readonly<{ newRequestSeq?: number; hideHeader?: boolean }>) {
  const [rows, setRows] = useState<ServiceCompany[]>([]);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState<ServiceCompany | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceCompanyPayload>(emptyCompany());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchServiceCompanies();
      data.sort((a,b) => a.active === b.active ? a.name.localeCompare(b.name, "pt-BR") : a.active ? -1 : 1);
      setRows(data);
      setSelected(current => current ? data.find(x => x.id === current.id) ?? null : null);
    } catch (e) { setError(userFriendlyError(e, "Falha ao carregar empresas.")); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => {
    const q = normalize(search.trim());
    return rows.filter(r => {
      if (!showInactive && !r.active) return false;
      if (!q) return true;
      return [r.name, r.tradeName, r.documentNumber, r.phone, r.email, r.contactName, r.city, r.state, r.notes]
        .some(v => normalize(v).includes(q));
    });
  }, [rows, search, showInactive]);

  useEffect(() => setPage(0), [search, showInactive, rowsPerPage]);
  const paged = visible.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  useEffect(() => {
    if (newRequestSeq <= 0) return;
    setEditingId(null);
    setForm(emptyCompany());
    setDialogOpen(true);
  }, [newRequestSeq]);
  const openEdit = (r: ServiceCompany) => {
    setEditingId(r.id);
    setForm({ name:r.name, tradeName:r.tradeName ?? "", documentNumber:r.documentNumber ?? "", phone:r.phone ?? "",
      email:r.email ?? "", contactName:r.contactName ?? "", addressLine:r.addressLine ?? "", city:r.city ?? "",
      state:r.state ?? "", zipCode:r.zipCode ?? "", notes:r.notes ?? "", active:r.active });
    setDialogOpen(true);
  };
  const setField = <K extends keyof ServiceCompanyPayload>(k: K, v: ServiceCompanyPayload[K]) => setForm(c => ({...c,[k]:v}));

  const save = async () => {
    if (!form.name.trim()) { setError("Informe o nome da empresa."); return; }
    setLoading(true); setError(null);
    try {
      const saved = editingId ? await updateServiceCompany(editingId, form) : await createServiceCompany(form);
      setDialogOpen(false); setEditingId(null); await load(); setSelected(saved);
      setSuccess(editingId ? "Empresa atualizada com sucesso." : "Empresa cadastrada com sucesso.");
    } catch (e) { setError(userFriendlyError(e, "Falha ao salvar empresa.")); }
    finally { setLoading(false); }
  };
  const remove = async (r: ServiceCompany) => {
    if (!globalThis.confirm(`Excluir a empresa "${r.name}"?`)) return;
    setLoading(true); setError(null);
    try { await deleteServiceCompany(r.id); if (selected?.id === r.id) setSelected(null); await load(); setSuccess("Empresa removida com sucesso."); }
    catch (e) { setError(userFriendlyError(e, "Falha ao excluir empresa.")); }
    finally { setLoading(false); }
  };

  return <Box sx={{ mt: hideHeader ? 0 : 2 }}>
    {!hideHeader && <Box>
      <Typography variant="subtitle1" fontWeight={700}>Empresas</Typography>
      <Typography variant="body2" sx={{opacity:.7}}>Cadastre empresas prestadoras de serviço e transportadoras para selecioná-las nos cadastros de prestadores e entregadores.</Typography>
    </Box>}
    <Stack direction={{xs:"column",sm:"row"}} gap={2} sx={{mt: hideHeader ? 2 : 2}} alignItems={{sm:"center"}}>
      <TextField size="small" fullWidth sx={{maxWidth:620}} value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="Pesquisar empresa, CNPJ, contato..." InputProps={{startAdornment:<SearchIcon sx={{mr:1,opacity:.55}}/>}} />
      <Tooltip title="Mostrar inativos" arrow>
        <IconButton
          size="small"
          aria-label="Mostrar inativos"
          aria-pressed={showInactive}
          onClick={() => setShowInactive(current => !current)}
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
    {error && <Alert severity="error" sx={{mt:1.5}} onClose={()=>setError(null)}>{error}</Alert>}
    {success && <Alert severity="success" sx={{mt:1.5}} onClose={()=>setSuccess(null)}>{success}</Alert>}
    {selected && <Card variant="outlined" sx={{mt:2,bgcolor:"action.hover"}}><CardContent>
      <Stack direction="row" spacing={2} alignItems="center"><BusinessOutlinedIcon fontSize="large"/><Box sx={{flex:1}}>
        <Typography fontWeight={700}>{selected.name}</Typography>
        <Typography variant="body2">{selected.tradeName || "-"} · CNPJ/Documento: {selected.documentNumber || "-"}</Typography>
        <Typography variant="body2">Contato: {selected.contactName || "-"} · {selected.phone || "-"} · {selected.email || "-"}</Typography>
      </Box></Stack>
    </CardContent></Card>}
    <TableContainer sx={{mt:2}}><Table size="small" sx={{minWidth:900}}><TableHead><TableRow>
      <TableCell>Empresa</TableCell><TableCell>Nome fantasia</TableCell><TableCell>CNPJ / Documento</TableCell><TableCell>Contato</TableCell><TableCell>Telefone</TableCell><TableCell align="center">Status</TableCell><TableCell align="right">Ações</TableCell>
    </TableRow></TableHead><TableBody>
      {!loading && visible.length===0 && <TableRow><TableCell colSpan={7} align="center" sx={{py:4,opacity:.7}}>Nenhuma empresa encontrada.</TableCell></TableRow>}
      {paged.map(r=><TableRow key={r.id} hover selected={selected?.id===r.id} onClick={()=>setSelected(r)} sx={{cursor:"pointer"}}>
        <TableCell><strong>{r.name}</strong></TableCell><TableCell>{r.tradeName || "-"}</TableCell><TableCell>{r.documentNumber || "-"}</TableCell>
        <TableCell>{r.contactName || r.email || "-"}</TableCell><TableCell>{r.phone || "-"}</TableCell><TableCell align="center">{r.active?"Ativa":"Inativa"}</TableCell>
        <TableCell align="right" onClick={e=>e.stopPropagation()}><Tooltip title="Editar"><IconButton size="small" onClick={()=>openEdit(r)}><EditOutlinedIcon fontSize="small"/></IconButton></Tooltip>
          <Tooltip title="Excluir"><IconButton size="small" onClick={()=>void remove(r)}><DeleteOutlineIcon fontSize="small"/></IconButton></Tooltip></TableCell>
      </TableRow>)}
    </TableBody></Table></TableContainer>
    <TablePagination component="div" count={visible.length} page={page} onPageChange={(_,p)=>setPage(p)} rowsPerPage={rowsPerPage}
      onRowsPerPageChange={e=>{setRowsPerPage(Number(e.target.value));setPage(0)}} rowsPerPageOptions={[5,10,50]}
      labelRowsPerPage="Linhas por página:" labelDisplayedRows={({from,to,count})=>`${from}-${to} de ${count}`}/>

    <Dialog open={dialogOpen} onClose={()=>setDialogOpen(false)} fullWidth maxWidth="md"><DialogTitle>{editingId?"Editar empresa":"Nova empresa"}</DialogTitle><DialogContent>
      <Box sx={{mt:1,display:"grid",gridTemplateColumns:{xs:"1fr",sm:"1fr 1fr"},gap:2}}>
        <TextField label="Razão social / Nome *" value={form.name} onChange={e=>setField("name",e.target.value)} required/>
        <TextField label="Nome fantasia" value={form.tradeName ?? ""} onChange={e=>setField("tradeName",e.target.value)}/>
        <TextField label="CNPJ / Documento" value={form.documentNumber ?? ""} onChange={e=>setField("documentNumber",e.target.value)}/>
        <TextField label="Responsável / Contato" value={form.contactName ?? ""} onChange={e=>setField("contactName",e.target.value)}/>
        <TextField label="Telefone" value={form.phone ?? ""} onChange={e=>setField("phone",e.target.value)}/>
        <TextField label="E-mail" type="email" value={form.email ?? ""} onChange={e=>setField("email",e.target.value)}/>
        <TextField label="Endereço" value={form.addressLine ?? ""} onChange={e=>setField("addressLine",e.target.value)} sx={{gridColumn:{sm:"1 / -1"}}}/>
        <TextField label="Cidade" value={form.city ?? ""} onChange={e=>setField("city",e.target.value)}/>
        <TextField label="Estado" value={form.state ?? ""} onChange={e=>setField("state",e.target.value)}/>
        <TextField label="CEP" value={form.zipCode ?? ""} onChange={e=>setField("zipCode",e.target.value)}/>
        <TextField label="Observações" value={form.notes ?? ""} onChange={e=>setField("notes",e.target.value)} multiline minRows={2} sx={{gridColumn:{sm:"1 / -1"}}}/>
        <FormControlLabel control={<Switch checked={form.active} onChange={e=>setField("active",e.target.checked)}/>} label="Empresa ativa"/>
      </Box>
    </DialogContent><DialogActions><Button onClick={()=>setDialogOpen(false)}>Cancelar</Button><Button variant="contained" onClick={()=>void save()} disabled={loading}>{loading?"Salvando...":"Salvar"}</Button></DialogActions></Dialog>
  </Box>;
}
