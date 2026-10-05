import { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardActionArea, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { fetchResidentAnnouncements, userFriendlyError, type Announcement } from "../api";

const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));

export default function ResidentAnnouncements({ compact = false, onViewAll }: Readonly<{ compact?: boolean; onViewAll?: () => void }>) {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Announcement | null>(null);
  useEffect(() => { void fetchResidentAnnouncements().then(setRows).catch(e => setError(userFriendlyError(e, "Não foi possível carregar os comunicados."))).finally(() => setLoading(false)); }, []);

  if (compact) {
    return <Card variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" spacing={1} alignItems="center"><CampaignRoundedIcon color="primary" /><Box><Typography fontWeight={900}>Comunicados recentes</Typography><Typography variant="caption" color="text.secondary">Avisos publicados pela administração</Typography></Box></Stack>
          {onViewAll && <Button size="small" endIcon={<ChevronRightRoundedIcon />} onClick={onViewAll}>Ver todos</Button>}
        </Stack>
        {loading && <Box sx={{ py: 3, display: "grid", placeItems: "center" }}><CircularProgress size={24} /></Box>}
        {error && <Alert severity="error" sx={{ m: 1.25 }}>{error}</Alert>}
        {!loading && !error && !rows.length && <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2.5 }}>Nenhum comunicado publicado.</Typography>}
        {!loading && rows.slice(0, 3).map((row, index) => <CardActionArea key={row.id} onClick={() => setSelected(row)} sx={{ px: 2, py: 1.25, borderBottom: index < Math.min(rows.length, 3) - 1 ? "1px solid" : "none", borderColor: "divider" }}><Typography fontWeight={850}>{row.title}</Typography><Typography variant="caption" color="text.secondary">{dateTime(row.publishedAt)}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .35, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{row.bodyText}</Typography></CardActionArea>)}
      </CardContent>
      <AnnouncementDialog selected={selected} onClose={() => setSelected(null)} />
    </Card>;
  }

  if (loading) return <Box sx={{ py: 6, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  return <Stack spacing={1.25}>
    {error && <Alert severity="error">{error}</Alert>}
    {!rows.length && <Card variant="outlined"><CardContent sx={{ py: 5, textAlign: "center" }}><CampaignRoundedIcon color="disabled" sx={{ fontSize: 44 }} /><Typography color="text.secondary" sx={{ mt: 1 }}>Nenhum comunicado publicado.</Typography></CardContent></Card>}
    {rows.map(row => <Card key={row.id} variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}><CardActionArea onClick={() => setSelected(row)}><CardContent><Typography fontWeight={900}>{row.title}</Typography><Typography variant="caption" color="text.secondary">{dateTime(row.publishedAt)}</Typography><Typography variant="body2" sx={{ mt: .85, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{row.bodyText}</Typography></CardContent></CardActionArea></Card>)}
    <AnnouncementDialog selected={selected} onClose={() => setSelected(null)} />
  </Stack>;
}

function AnnouncementDialog({ selected, onClose }: Readonly<{ selected: Announcement | null; onClose: () => void }>) {
  return <Dialog open={Boolean(selected)} onClose={onClose} fullWidth maxWidth="sm"><DialogTitle>{selected?.title}</DialogTitle><DialogContent>{selected && <><Typography variant="caption" color="text.secondary">{dateTime(selected.publishedAt)}</Typography><Box sx={{ mt: 2, lineHeight: 1.6, "& img": { maxWidth: "100%", height: "auto", borderRadius: 2 } }} dangerouslySetInnerHTML={{ __html: selected.bodyHtml }} /></>}</DialogContent><DialogActions><Button onClick={onClose}>Fechar</Button></DialogActions></Dialog>;
}
