import { useEffect, useState } from "react";
import { Box, Button, Card, CardContent, Chip, Collapse, IconButton, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import { fetchPendingPoolCardReviews, type PoolCard } from "../api";

export default function PoolCardReviewNotifier({ enabled = true, onOpenPoolCards }: Readonly<{ enabled?: boolean; onOpenPoolCards?: () => void }>) {
  const [rows, setRows] = useState<PoolCard[]>([]);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const load = () => void fetchPendingPoolCardReviews(20).then(data => { if (active) { setRows(data); if (data.length) setDismissed(false); } }).catch(() => undefined);
    load();
    const timer = globalThis.setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000);
    return () => { active = false; globalThis.clearInterval(timer); };
  }, [enabled]);
  if (!enabled || !rows.length || dismissed) return null;
  return <Box sx={{ position: "fixed", top: 84, left: 18, zIndex: 1399, width: { xs: "calc(100% - 36px)", sm: 390 }, maxWidth: 390 }}><Collapse in><Card elevation={8} sx={{ border: "1px solid", borderColor: "info.light" }}><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
    <Stack direction="row" alignItems="center" spacing={1}><FactCheckOutlinedIcon color="info"/><Typography fontWeight={800} sx={{ flex: 1 }}>Laudos para validar</Typography><Chip size="small" color="info" label={rows.length}/><IconButton size="small" onClick={()=>setDismissed(true)}><CloseIcon fontSize="small"/></IconButton></Stack>
    <Stack spacing={.6} sx={{ mt: 1 }}>{rows.slice(0,3).map(card => <Box key={card.id} sx={{ p: 1, borderRadius: 1, bgcolor: "action.hover" }}><Typography variant="body2" fontWeight={700}>{card.residentName}</Typography><Typography variant="caption" color="text.secondary">Bloco {card.block || "-"} / Apto {card.apartment || "-"} · laudo pendente</Typography></Box>)}</Stack>
    <Button size="small" sx={{ mt: 1 }} onClick={onOpenPoolCards}>Abrir carteirinhas</Button>
  </CardContent></Card></Collapse></Box>;
}
