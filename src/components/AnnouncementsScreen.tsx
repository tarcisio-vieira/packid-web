import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Stack, TextField, Typography,
} from "@mui/material";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { createAnnouncement, fetchAnnouncements, userFriendlyError, type Announcement, type User } from "../api";
import RichTextEditor from "./shared/RichTextEditor";

const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));

function statusChip(row: Announcement) {
  if (row.deliveryStatus === "SENT") return <Chip size="small" color="success" label={`Enviado · ${row.deliveredCount}`} />;
  if (row.deliveryStatus === "PARTIAL") return <Chip size="small" color="warning" label={`Parcial · ${row.deliveredCount}/${row.recipientCount}`} />;
  if (row.deliveryStatus === "FAILED") return <Chip size="small" color="error" label="Falha no envio" />;
  return <Chip size="small" color="info" label={`Enviando · ${row.recipientCount}`} />;
}

export default function AnnouncementsScreen({ currentUser }: Readonly<{ currentUser: User }>) {
  const canPublish = currentUser.canManageSettings ?? ["ADMIN", "SECRETARY"].includes((currentUser.role ?? "").toUpperCase());
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [compose, setCompose] = useState(false);
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [publishing, setPublishing] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRows(await fetchAnnouncements()); setError(null); }
    catch (e) { setError(userFriendlyError(e, "Não foi possível carregar os comunicados.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const publish = async () => {
    const plain = bodyHtml.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
    if (!title.trim() || !plain) { setError("Informe o título e o conteúdo do comunicado."); return; }
    setPublishing(true); setError(null);
    try {
      await createAnnouncement({ title: title.trim(), bodyHtml });
      setCompose(false); setTitle(""); setBodyHtml("");
      setSuccess("Comunicado publicado. O envio por e-mail foi iniciado para os usuários ativos deste condomínio.");
      await load();
    } catch (e) { setError(userFriendlyError(e, "Não foi possível publicar o comunicado.")); }
    finally { setPublishing(false); }
  };

  const ordered = useMemo(() => rows, [rows]);

  return <Box sx={{ maxWidth: 1050, mx: "auto", p: { xs: .5, sm: 1.5 } }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.25} sx={{ mb: 2 }}>
      <Box><Stack direction="row" spacing={1} alignItems="center"><CampaignRoundedIcon color="primary" /><Typography variant="h5" fontWeight={900}>Comunicados</Typography></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: .4 }}>{canPublish ? "Publique avisos para o condomínio e envie por e-mail aos usuários ativos." : "Consulte os comunicados publicados pela administração."}</Typography></Box>
      <Stack direction="row" spacing={1}>{<Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={() => void load()}>Atualizar</Button>}{canPublish && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCompose(true)}>Novo comunicado</Button>}</Stack>
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>{error}</Alert>}
    {success && <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setSuccess(null)}>{success}</Alert>}
    {loading ? <Box sx={{ py: 8, display: "grid", placeItems: "center" }}><CircularProgress /></Box> : <Stack spacing={1.25}>
      {!ordered.length && <Card variant="outlined"><CardContent sx={{ py: 5, textAlign: "center" }}><CampaignRoundedIcon color="disabled" sx={{ fontSize: 44 }} /><Typography color="text.secondary" sx={{ mt: 1 }}>Nenhum comunicado publicado.</Typography></CardContent></Card>}
      {ordered.map(row => <Card key={row.id} variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}><CardActionArea onClick={() => setSelected(row)}><CardContent><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.25}><Box sx={{ minWidth: 0 }}><Typography fontWeight={900} sx={{ fontSize: 17 }}>{row.title}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .35 }}>{dateTime(row.publishedAt)}{row.createdBy ? ` · ${row.createdBy}` : ""}</Typography><Typography variant="body2" sx={{ mt: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{row.bodyText}</Typography></Box>{canPublish && <Box sx={{ flexShrink: 0 }}>{statusChip(row)}</Box>}</Stack></CardContent></CardActionArea></Card>)}
    </Stack>}

    <Dialog open={compose} onClose={() => !publishing && setCompose(false)} fullWidth maxWidth="md"><DialogTitle>Novo comunicado</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ mt: .75 }}><Alert severity="info">Ao publicar, o comunicado ficará visível no sistema e será enviado por e-mail aos usuários ativos do mesmo condomínio.</Alert><TextField label="Título" value={title} onChange={e => setTitle(e.target.value)} inputProps={{ maxLength: 180 }} autoFocus /><RichTextEditor value={bodyHtml} onChange={setBodyHtml} /></Stack></DialogContent><DialogActions><Button onClick={() => setCompose(false)} disabled={publishing}>Cancelar</Button><Button variant="contained" startIcon={<SendRoundedIcon />} onClick={() => void publish()} disabled={publishing}>{publishing ? "Publicando..." : "Publicar e enviar"}</Button></DialogActions></Dialog>

    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="md"><DialogTitle>{selected?.title}</DialogTitle><DialogContent>{selected && <><Typography variant="caption" color="text.secondary">{dateTime(selected.publishedAt)}{selected.createdBy ? ` · ${selected.createdBy}` : ""}</Typography><Box sx={{ mt: 2, lineHeight: 1.6, "& img": { maxWidth: "100%", height: "auto", borderRadius: 2 } }} dangerouslySetInnerHTML={{ __html: selected.bodyHtml }} /></>}</DialogContent><DialogActions><Button onClick={() => setSelected(null)}>Fechar</Button></DialogActions></Dialog>
  </Box>;
}
