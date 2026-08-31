import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Badge, Box, Button, Card, CardContent, Chip, CircularProgress, Collapse, Divider,
  Fab, IconButton, Paper, Stack, Tooltip, Typography,
} from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import DoneAllOutlinedIcon from "@mui/icons-material/DoneAllOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import {
  clearPendingPackagePickups, fetchPendingPackagePickups, handOverPackage,
  userFriendlyError, type PackIdPickupRequest,
} from "../api";

const TOAST_MS = 20_000;

export default function PackagePickupNotifier({ enabled }: { enabled: boolean }) {
  const [items, setItems] = useState<PackIdPickupRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const next = await fetchPendingPackagePickups();
      const nextIds = new Set(next.map(item => item.id));
      const hasNew = next.some(item => !knownIds.current.has(item.id));
      setItems(next);
      setError("");
      if (next.length > 0 && (firstLoad.current || hasNew)) setToastVisible(true);
      knownIds.current = nextIds;
      firstLoad.current = false;
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível consultar as solicitações de encomenda."));
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setItems([]); setPanelOpen(false); setToastVisible(false); knownIds.current.clear(); firstLoad.current = true;
      return;
    }
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5000);
    const refresh = () => void load();
    window.addEventListener("packid:registered", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("packid:registered", refresh); };
  }, [enabled, load]);

  useEffect(() => {
    if (!toastVisible) return;
    const timer = window.setTimeout(() => setToastVisible(false), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toastVisible, items.length]);

  const visible = useMemo(() => items.slice(0, 3), [items]);

  const deliver = async (item: PackIdPickupRequest) => {
    setBusy(item.id); setError("");
    try {
      await handOverPackage(item.id);
      setItems(current => current.filter(x => x.id !== item.id));
      knownIds.current.delete(item.id);
      window.dispatchEvent(new Event("packid:registered"));
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível finalizar a entrega."));
    } finally { setBusy(null); }
  };

  const clearAll = async () => {
    if (!items.length || clearing) return;
    setClearing(true); setError("");
    try {
      await clearPendingPackagePickups();
      setItems([]); knownIds.current.clear(); setPanelOpen(false); setToastVisible(false);
      window.dispatchEvent(new Event("packid:registered"));
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível limpar as solicitações de retirada."));
    } finally { setClearing(false); }
  };

  if (!enabled) return null;

  return <>
    <Collapse in={toastVisible && items.length > 0} unmountOnExit>
      <Box sx={{ position: "fixed", top: { xs: 220, sm: 210 }, left: "50%", transform: "translateX(-50%)", zIndex: 1450, width: { xs: "calc(100% - 28px)", sm: 360 }, maxWidth: 360 }}>
        <Card elevation={9} sx={{ borderRadius: 2.5, border: "1px solid", borderColor: "primary.light" }}>
          <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
            <Stack direction="row" spacing={.8} alignItems="center">
              <NotificationsActiveOutlinedIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>Retirada de encomenda</Typography>
              <Chip size="small" color="primary" label={items.length} />
              <IconButton size="small" onClick={() => setToastVisible(false)} aria-label="Fechar aviso"><CloseIcon fontSize="small" /></IconButton>
            </Stack>
            <Divider sx={{ my: .8 }} />
            <Stack spacing={.7}>
              {visible.map(item => <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" fontWeight={700}>Bloco {item.block || "—"} · Apto {item.apartment || "—"}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>Encomenda: {item.packageCode || item.id.slice(0, 8)}</Typography>
                </Box>
                <Button size="small" variant="contained" color="success" disabled={Boolean(busy)} onClick={() => void deliver(item)}>
                  {busy === item.id ? <CircularProgress size={15} color="inherit" /> : "Entregar"}
                </Button>
              </Box>)}
              {items.length > visible.length && <Typography variant="caption" color="text.secondary">+ {items.length - visible.length} solicitação(ões) na central.</Typography>}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Collapse>

    {items.length > 0 && <Tooltip title="Solicitações de retirada" placement="left" arrow>
      <Fab size="small" color="primary" onClick={() => setPanelOpen(v => !v)} aria-label="Abrir solicitações de retirada"
        sx={{ position: "fixed", right: { xs: 12, sm: 18 }, bottom: { xs: 14, sm: 18 }, zIndex: 1440 }}>
        <Badge color="error" badgeContent={items.length} max={99}><Inventory2OutlinedIcon /></Badge>
      </Fab>
    </Tooltip>}

    {panelOpen && items.length > 0 && <Paper elevation={10} sx={{ position: "fixed", right: { xs: 8, sm: 18 }, bottom: { xs: 66, sm: 70 }, zIndex: 1440, width: { xs: "calc(100% - 16px)", sm: 370 }, maxHeight: "65vh", overflow: "auto", borderRadius: 2.5 }}>
      <Box sx={{ p: 1.25 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Inventory2OutlinedIcon color="primary" />
          <Typography fontWeight={800} sx={{ flex: 1 }}>Encomendas solicitadas</Typography>
          <IconButton size="small" onClick={() => setPanelOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </Stack>
        <Button fullWidth size="small" variant="outlined" color="error" startIcon={clearing ? <CircularProgress size={15} color="inherit" /> : <DeleteSweepOutlinedIcon />}
          disabled={clearing || Boolean(busy)} onClick={() => void clearAll()} sx={{ mb: 1 }}>
          Limpar todas as notificações
        </Button>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Ao limpar, as solicitações retornam no aplicativo do morador para “Solicitar retirada”.
        </Typography>
        {error && <Alert severity="warning" sx={{ mb: 1 }}>{error}</Alert>}
        <Stack spacing={1}>
          {items.map(item => <Box key={item.id} sx={{ p: 1.1, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <Typography fontWeight={700}>Bloco {item.block || "—"} / Apto {item.apartment || "—"}</Typography>
            <Typography variant="body2">Encomenda: {item.packageCode || item.id.slice(0, 8)}</Typography>
            {item.residentFullName && <Typography variant="caption" color="text.secondary">{item.residentFullName}</Typography>}
            <Button fullWidth size="small" variant="contained" color="success" startIcon={busy === item.id ? <CircularProgress size={15} color="inherit" /> : <DoneAllOutlinedIcon />}
              disabled={Boolean(busy) || clearing} sx={{ mt: 1 }} onClick={() => void deliver(item)}>Entregou a encomenda</Button>
          </Box>)}
        </Stack>
      </Box>
    </Paper>}

    {error && !panelOpen && <Alert severity="warning" sx={{ position: "fixed", right: 18, bottom: 18, zIndex: 1450, maxWidth: 380 }}>{error}</Alert>}
  </>;
}
