import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Badge, Box, Button, Card, CardContent, Chip, Collapse, Divider, Fab,
  IconButton, Paper, Stack, Tooltip, Typography,
} from "@mui/material";
import KeyIcon from "@mui/icons-material/Key";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import {
  completeSpaceAccess, fetchPendingSpaceAccess, releaseSpaceAccess,
  userFriendlyError, type SpaceAccess,
} from "../api";
import { spaceAccessStatusLabel, spaceLabel } from "./SpacesScreen";

const TOAST_MS = 20_000;

export default function SpaceRequestNotifier({ enabled = true, onOpenSpaces }: Readonly<{ enabled?: boolean; onOpenSpaces?: () => void }>) {
  const [rows, setRows] = useState<SpaceAccess[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const load = async () => {
    if (!enabled) return;
    try {
      const data = await fetchPendingSpaceAccess();
      const hasNew = data.some(row => !knownIds.current.has(row.id));
      setRows(data); setError(null);
      if (data.length > 0 && (firstLoad.current || hasNew)) setToastVisible(true);
      knownIds.current = new Set(data.map(row => row.id));
      firstLoad.current = false;
    } catch (err) {
      setError(userFriendlyError(err, "Falha ao consultar solicitações da área de lazer."));
    }
  };

  useEffect(() => {
    if (!enabled) { setRows([]); setToastVisible(false); setPanelOpen(false); knownIds.current.clear(); firstLoad.current = true; return; }
    void load();
    const timer = globalThis.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 5000);
    const onVisibilityChange = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { globalThis.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, [enabled]);

  useEffect(() => {
    if (!toastVisible) return;
    const timer = window.setTimeout(() => setToastVisible(false), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toastVisible, rows.length]);

  const act = async (row: SpaceAccess) => {
    setBusyId(row.id); setError(null);
    try {
      if (row.status === "REQUESTED_PICKUP") await releaseSpaceAccess(row.id);
      else if (row.status === "REQUESTED_RETURN") await completeSpaceAccess(row.id);
      knownIds.current.delete(row.id);
      await load();
    } catch (err) { setError(userFriendlyError(err, "Não foi possível atualizar a solicitação.")); }
    finally { setBusyId(null); }
  };

  const visible = useMemo(() => rows.slice(0, 3), [rows]);
  if (!enabled) return null;

  const requestRow = (row: SpaceAccess, compact = false) => <Box key={row.id} sx={{ p: compact ? .75 : 1, borderRadius: 1.5, bgcolor: compact ? "action.hover" : undefined, border: compact ? undefined : "1px solid", borderColor: "divider" }}>
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>{spaceLabel(row.spaceType)} — Bloco {row.block} / Apto {row.apartment}</Typography>
        <Typography variant="caption" color="text.secondary">{spaceAccessStatusLabel(row.status)}</Typography>
      </Box>
      <Button size="small" variant="contained" color={row.status === "REQUESTED_RETURN" ? "success" : "primary"}
        startIcon={row.status === "REQUESTED_RETURN" ? <AssignmentTurnedInIcon /> : <KeyIcon />}
        disabled={busyId === row.id} onClick={() => void act(row)}>
        {row.status === "REQUESTED_RETURN" ? "Receber" : "Liberar"}
      </Button>
    </Stack>
  </Box>;

  return <>
    <Collapse in={toastVisible && rows.length > 0} unmountOnExit>
      <Box sx={{ position: "fixed", top: { xs: 62, sm: 76 }, left: "50%", transform: "translateX(-50%)", zIndex: 1460, width: { xs: "calc(100% - 28px)", sm: 360 }, maxWidth: 360 }}>
        <Card elevation={9} sx={{ borderRadius: 2.5, border: "1px solid", borderColor: "warning.light" }}>
          <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
            <Stack direction="row" alignItems="center" spacing={.8}>
              <NotificationsActiveOutlinedIcon color="warning" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>Solicitação da área de lazer</Typography>
              <Chip size="small" color="warning" label={rows.length} />
              <IconButton size="small" onClick={() => setToastVisible(false)} aria-label="Fechar aviso"><CloseIcon fontSize="small" /></IconButton>
            </Stack>
            <Divider sx={{ my: .8 }} />
            <Stack spacing={.65}>{visible.map(row => requestRow(row, true))}</Stack>
            {rows.length > visible.length && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: .7 }}>+ {rows.length - visible.length} solicitação(ões) na central.</Typography>}
          </CardContent>
        </Card>
      </Box>
    </Collapse>

    {rows.length > 0 && <Tooltip title="Solicitações da área de lazer" placement="left" arrow>
      <Fab size="small" color="warning" onClick={() => setPanelOpen(v => !v)} aria-label="Abrir solicitações da área de lazer"
        sx={{ position: "fixed", right: { xs: 12, sm: 18 }, top: { xs: 72, sm: 88 }, zIndex: 1440 }}>
        <Badge color="error" badgeContent={rows.length} max={99}><KeyIcon /></Badge>
      </Fab>
    </Tooltip>}

    {panelOpen && rows.length > 0 && <Paper elevation={10} sx={{ position: "fixed", right: { xs: 8, sm: 18 }, top: { xs: 124, sm: 140 }, zIndex: 1440, width: { xs: "calc(100% - 16px)", sm: 370 }, maxHeight: "65vh", overflow: "auto", borderRadius: 2.5 }}>
      <Box sx={{ p: 1.25 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <KeyIcon color="warning" />
          <Typography fontWeight={800} sx={{ flex: 1 }}>Área de lazer</Typography>
          <Chip size="small" color="warning" label={rows.length} />
          <IconButton size="small" onClick={() => setPanelOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        <Stack spacing={1}>{rows.map(row => requestRow(row))}</Stack>
        <Button size="small" fullWidth sx={{ mt: 1 }} onClick={() => { setPanelOpen(false); onOpenSpaces?.(); }}>Abrir área de lazer completa</Button>
      </Box>
    </Paper>}

    {error && !panelOpen && <Alert severity="warning" sx={{ position: "fixed", right: 18, bottom: 72, zIndex: 1450, maxWidth: 380 }}>{error}</Alert>}
  </>;
}
