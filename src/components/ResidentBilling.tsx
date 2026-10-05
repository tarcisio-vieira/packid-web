import { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import { fetchResidentBillingCharges, residentBillingChargePrintUrl, userFriendlyError, type BillingCharge } from "../api";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateBr = (value: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));

export default function ResidentBilling() {
  const [rows, setRows] = useState<BillingCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { fetchResidentBillingCharges().then(setRows).catch((e) => setError(userFriendlyError(e, "Não foi possível carregar seus boletos."))).finally(() => setLoading(false)); }, []);
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); } catch { /* noop */ } };
  if (loading) return <Box sx={{ display: "grid", placeItems: "center", py: 6 }}><CircularProgress /></Box>;
  return <Stack spacing={1.5}>
    <Box><Typography variant="h6" fontWeight={900}>Meus boletos</Typography><Typography variant="body2" color="text.secondary">Cobranças disponíveis para sua unidade.</Typography></Box>
    {error && <Alert severity="error">{error}</Alert>}
    {!rows.length && <Card variant="outlined"><CardContent><Typography color="text.secondary">Nenhum boleto disponível no momento.</Typography></CardContent></Card>}
    {rows.map((r) => <Card key={r.id} variant="outlined" sx={{ borderRadius: 3 }}><CardContent>
      <Stack direction="row" justifyContent="space-between" spacing={1}><Stack direction="row" spacing={1.2}><Box sx={{ width: 44, height: 44, borderRadius: 2.2, display: "grid", placeItems: "center", bgcolor: "primary.50", color: "primary.main" }}><ReceiptLongRoundedIcon /></Box><Box><Typography fontWeight={900}>{r.description || "Boleto condominial"}</Typography><Typography variant="body2" color="text.secondary">Vencimento {dateBr(r.dueDate)}</Typography></Box></Stack><Chip size="small" color={r.status === "PAID" ? "success" : r.status === "OVERDUE" ? "error" : "warning"} label={r.status === "PAID" ? "Pago" : r.status === "OVERDUE" ? "Vencido" : "Em aberto"} /></Stack>
      <Typography sx={{ mt: 1.5, fontSize: 24, fontWeight: 950 }}>{brl.format(r.nominalValue || 0)}</Typography>
      {r.digitableLine && <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: "action.hover" }}><Typography variant="caption" color="text.secondary">Linha digitável</Typography><Typography variant="body2" sx={{ wordBreak: "break-all", fontFamily: "monospace", mt: .25 }}>{r.digitableLine}</Typography><Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={() => void copy(r.digitableLine!)} sx={{ mt: .5 }}>Copiar</Button></Box>}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}><Button fullWidth variant="outlined" startIcon={<PrintRoundedIcon />} onClick={() => window.open(residentBillingChargePrintUrl(r.id), "_blank", "noopener")}>Visualizar / imprimir</Button>{r.documentUrl && <Button fullWidth variant="contained" startIcon={<OpenInNewRoundedIcon />} onClick={() => window.open(r.documentUrl!, "_blank", "noopener")}>Abrir no banco</Button>}</Stack>
    </CardContent></Card>)}
  </Stack>;
}
