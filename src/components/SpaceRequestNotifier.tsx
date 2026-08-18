import { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, Collapse, IconButton, Stack, Typography } from "@mui/material";
import KeyIcon from "@mui/icons-material/Key";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import {
  completeSpaceAccess,
  fetchPendingSpaceAccess,
  releaseSpaceAccess,
  userFriendlyError,
  type SpaceAccess,
} from "../api";
import { spaceAccessStatusLabel, spaceLabel } from "./SpacesScreen";

export default function SpaceRequestNotifier({ enabled = true, onOpenSpaces }: Readonly<{ enabled?: boolean; onOpenSpaces?: () => void }>) {
  const [rows, setRows] = useState<SpaceAccess[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!enabled) return;
    try {
      const data = await fetchPendingSpaceAccess();
      setRows(data);
      if (data.length > 0) setDismissed(false);
    } catch (err) {
      setError(userFriendlyError(err, "Falha ao consultar solicitações da área de lazer."));
    }
  };

  useEffect(() => {
    if (!enabled) return;
    void load();
    const timer = globalThis.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 5000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      globalThis.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);

  const act = async (row: SpaceAccess) => {
    setBusyId(row.id); setError(null);
    try {
      if (row.status === "REQUESTED_PICKUP") await releaseSpaceAccess(row.id);
      else if (row.status === "REQUESTED_RETURN") await completeSpaceAccess(row.id);
      await load();
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível atualizar a solicitação."));
    } finally { setBusyId(null); }
  };

  if (!enabled || rows.length === 0 || dismissed) return null;
  const visible = rows.slice(0, 3);
  return (
    <Box sx={{ position: "fixed", top: 84, right: 18, zIndex: 1400, width: { xs: "calc(100% - 36px)", sm: 390 }, maxWidth: 390 }}>
      <Collapse in>
        <Card elevation={8} sx={{ border: "1px solid", borderColor: "warning.light" }}>
          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <KeyIcon color="warning" />
              <Typography fontWeight={800} sx={{ flex: 1 }}>Solicitações de chaves</Typography>
              <Chip size="small" color="warning" label={rows.length} />
              <IconButton size="small" onClick={() => setDismissed(true)}><CloseIcon fontSize="small" /></IconButton>
            </Stack>
            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
            <Stack spacing={1}>
              {visible.map(row => <Box key={row.id} sx={{ p: 1, borderRadius: 1, bgcolor: "action.hover" }}>
                <Typography variant="body2" fontWeight={700}>{spaceLabel(row.spaceType)} — Bloco {row.block} / Apto {row.apartment}</Typography>
                <Typography variant="caption" color="text.secondary">{spaceAccessStatusLabel(row.status)}</Typography>
                <Box sx={{ mt: 0.75 }}>
                  <Button size="small" variant="contained" color={row.status === "REQUESTED_RETURN" ? "success" : "primary"}
                    startIcon={row.status === "REQUESTED_RETURN" ? <AssignmentTurnedInIcon /> : <KeyIcon />}
                    disabled={busyId === row.id} onClick={() => void act(row)}>
                    {row.status === "REQUESTED_RETURN" ? "Receber chave" : "Liberar chave"}
                  </Button>
                </Box>
              </Box>)}
            </Stack>
            <Button size="small" sx={{ mt: 1 }} onClick={onOpenSpaces}>Abrir área de lazer</Button>
          </CardContent>
        </Card>
      </Collapse>
    </Box>
  );
}
