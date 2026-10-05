import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import SyncRoundedIcon from "@mui/icons-material/SyncRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import {
  billingChargePrintUrl, createBillingCharge, emailBillingCharge, fetchBillingCharges, fetchResidentialUnits,
  requestBillingSync, userFriendlyError,
  type BillingCharge, type BillingChargeCreatePayload, type ResidentialUnit,
} from "../api";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateBr = (value?: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : "-";
const emptyForm: BillingChargeCreatePayload = { block: "", apartment: "", nominalValue: 0, dueDate: "", description: "Taxa condominial", issueDate: new Date().toISOString().slice(0, 10) };

function statusChip(status: BillingCharge["status"]) {
  if (status === "PAID") return <Chip size="small" color="success" label="Pago" />;
  if (status === "OVERDUE") return <Chip size="small" color="error" label="Vencido" />;
  if (status === "CANCELLED") return <Chip size="small" label="Cancelado" />;
  return <Chip size="small" color="warning" label="Em aberto" />;
}

export default function BillingScreen() {
  const [rows, setRows] = useState<BillingCharge[]>([]);
  const [units, setUnits] = useState<ResidentialUnit[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<BillingChargeCreatePayload>(emptyForm);
  const [emailCharge, setEmailCharge] = useState<BillingCharge | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [charges, unitList] = await Promise.all([fetchBillingCharges(), fetchResidentialUnits()]);
      setRows(charges); setUnits(unitList); setError(null);
    } catch (e) { setError(userFriendlyError(e, "Não foi possível carregar os boletos.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => `${r.block} ${r.apartment} ${r.description ?? ""} ${r.referenceNumber ?? ""}`.toLowerCase().includes(term));
  }, [rows, search]);

  const sync = async () => {
    setSyncing(true); setError(null); setSuccess(null);
    try { await requestBillingSync(); setSuccess("Sincronização concluída."); await load(); }
    catch (e) { setError(userFriendlyError(e, "Não foi possível sincronizar com o banco.")); }
    finally { setSyncing(false); }
  };

  const create = async () => {
    setError(null); setSuccess(null);
    try {
      await createBillingCharge(form);
      setCreating(false); setForm(emptyForm); setSuccess("Boleto incluído."); await load();
    } catch (e) { setError(userFriendlyError(e, "Não foi possível incluir o boleto.")); }
  };

  const send = async () => {
    if (!emailCharge) return;
    setSending(true); setError(null);
    try { await emailBillingCharge(emailCharge.id, email.trim() || undefined); setSuccess("Boleto enviado por e-mail."); setEmailCharge(null); setEmail(""); }
    catch (e) { setError(userFriendlyError(e, "Não foi possível enviar o boleto.")); }
    finally { setSending(false); }
  };

  const unitValue = form.block && form.apartment ? `${form.block}|||${form.apartment}` : "";

  return <Box sx={{ p: { xs: 1.5, md: 3 } }}>
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
      <Box><Typography variant="h5" fontWeight={900}>Boletos</Typography><Typography variant="body2" color="text.secondary">Cobranças por unidade, impressão e envio por e-mail.</Typography></Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button variant="outlined" startIcon={<SyncRoundedIcon />} onClick={() => void sync()} disabled={syncing}>{syncing ? "Sincronizando..." : "Sincronizar banco"}</Button>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreating(true)}>Adicionar boleto</Button>
      </Stack>
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
    {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}
    <Card variant="outlined" sx={{ mb: 2 }}><CardContent><TextField fullWidth label="Pesquisar por unidade, descrição ou referência" value={search} onChange={(e) => setSearch(e.target.value)} /></CardContent></Card>
    <TableContainer component={Card} variant="outlined"><Table size="small" sx={{ minWidth: 800 }}>
      <TableHead><TableRow><TableCell>Unidade</TableCell><TableCell>Descrição</TableCell><TableCell>Vencimento</TableCell><TableCell>Valor</TableCell><TableCell>Status</TableCell><TableCell align="right">Ações</TableCell></TableRow></TableHead>
      <TableBody>
        {!loading && !filtered.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}>Nenhum boleto encontrado.</TableCell></TableRow>}
        {filtered.map((r) => <TableRow key={r.id} hover>
          <TableCell><strong>Bloco {r.block} · Apto {r.apartment}</strong></TableCell>
          <TableCell>{r.description || "Cobrança condominial"}</TableCell><TableCell>{dateBr(r.dueDate)}</TableCell><TableCell>{brl.format(r.nominalValue || 0)}</TableCell><TableCell>{statusChip(r.status)}</TableCell>
          <TableCell align="right"><Stack direction="row" justifyContent="flex-end" spacing={.5}><Button size="small" startIcon={<PrintRoundedIcon />} onClick={() => window.open(billingChargePrintUrl(r.id), "_blank", "noopener")}>Imprimir</Button><Button size="small" startIcon={<EmailRoundedIcon />} onClick={() => { setEmailCharge(r); setEmail(""); }}>E-mail</Button></Stack></TableCell>
        </TableRow>)}
      </TableBody>
    </Table></TableContainer>

    <Dialog open={creating} onClose={() => setCreating(false)} fullWidth maxWidth="sm"><DialogTitle>Adicionar boleto</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
      <TextField select label="Unidade" value={unitValue} onChange={(e) => { const [block, apartment] = e.target.value.split("|||"); setForm((f) => ({ ...f, block, apartment })); }}>
        {units.map((u) => <MenuItem key={u.id} value={`${u.block}|||${u.apartment}`}>Bloco {u.block} · Apto {u.apartment}</MenuItem>)}
      </TextField>
      <TextField label="Descrição" value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}><TextField fullWidth type="number" label="Valor (R$)" inputProps={{ step: .01, min: 0 }} value={form.nominalValue} onChange={(e) => setForm((f) => ({ ...f, nominalValue: Number(e.target.value) }))} /><TextField fullWidth type="date" label="Vencimento" InputLabelProps={{ shrink: true }} value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} /></Stack>
      <TextField label="Linha digitável" value={form.digitableLine ?? ""} onChange={(e) => setForm((f) => ({ ...f, digitableLine: e.target.value }))} />
      <TextField label="URL do boleto no banco" value={form.documentUrl ?? ""} onChange={(e) => setForm((f) => ({ ...f, documentUrl: e.target.value }))} />
      <Alert severity="info">A inclusão manual serve como contingência. Na integração direta, estes dados serão preenchidos pela API do banco.</Alert>
    </Stack></DialogContent><DialogActions><Button onClick={() => setCreating(false)}>Cancelar</Button><Button variant="contained" onClick={() => void create()} disabled={!form.block || !form.apartment || !form.dueDate || form.nominalValue <= 0}>Salvar</Button></DialogActions></Dialog>

    <Dialog open={Boolean(emailCharge)} onClose={() => !sending && setEmailCharge(null)} fullWidth maxWidth="xs"><DialogTitle>Enviar boleto por e-mail</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ mt: 1 }}><Typography variant="body2">Informe o e-mail do morador que solicitou o boleto. Se deixar vazio, o sistema usará o primeiro e-mail ativo encontrado na unidade.</Typography><TextField type="email" label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} /></Stack></DialogContent><DialogActions><Button onClick={() => setEmailCharge(null)} disabled={sending}>Cancelar</Button><Button variant="contained" onClick={() => void send()} disabled={sending}>{sending ? "Enviando..." : "Enviar"}</Button></DialogActions></Dialog>
  </Box>;
}
