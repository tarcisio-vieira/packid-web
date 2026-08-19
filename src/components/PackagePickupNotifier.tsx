import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import DoneAllOutlinedIcon from "@mui/icons-material/DoneAllOutlined";
import { fetchPendingPackagePickups, handOverPackage, userFriendlyError, type PackIdPickupRequest } from "../api";

export default function PackagePickupNotifier({ enabled }: { enabled: boolean }) {
  const [items, setItems] = useState<PackIdPickupRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!enabled) return;
    try { setItems(await fetchPendingPackagePickups()); setError(""); }
    catch (e) { setError(userFriendlyError(e, "Não foi possível consultar as solicitações de encomenda.")); }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) { setItems([]); return; }
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 5000);
    return () => window.clearInterval(timer);
  }, [enabled, load]);

  if (!enabled || (!items.length && !error)) return null;
  return (
    <Box sx={{ position: "fixed", right: { xs: 8, sm: 18 }, bottom: { xs: 8, sm: 18 }, zIndex: 1400, width: { xs: "calc(100% - 16px)", sm: 390 }, maxHeight: "60vh", overflow: "auto" }}>
      <Card elevation={8} sx={{ borderRadius: 3 }}><CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><Inventory2OutlinedIcon color="primary" /><Typography fontWeight={800}>Solicitações de retirada</Typography></Stack>
        {error && <Alert severity="warning" sx={{ mb: 1 }}>{error}</Alert>}
        <Stack spacing={1.2}>{items.map(item => <Box key={item.id} sx={{ p: 1.2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
          <Typography fontWeight={700}>Bloco {item.block || "—"} / Apto {item.apartment || "—"}</Typography>
          <Typography variant="body2">Encomenda: {item.packageCode || item.id.slice(0, 8)}</Typography>
          {item.residentFullName && <Typography variant="caption" color="text.secondary">{item.residentFullName}</Typography>}
          <Button fullWidth size="small" variant="contained" color="success" startIcon={busy === item.id ? <CircularProgress size={15} color="inherit" /> : <DoneAllOutlinedIcon />} disabled={Boolean(busy)} sx={{ mt: 1 }} onClick={async () => {
            setBusy(item.id); try { await handOverPackage(item.id); setItems(v => v.filter(x => x.id !== item.id)); window.dispatchEvent(new Event("packid:registered")); } catch (e) { setError(userFriendlyError(e, "Não foi possível finalizar a entrega.")); } finally { setBusy(null); }
          }}>Entregou a encomenda</Button>
        </Box>)}</Stack>
      </CardContent></Card>
    </Box>
  );
}
