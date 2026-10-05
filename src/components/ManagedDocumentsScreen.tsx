import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import TextSnippetRoundedIcon from "@mui/icons-material/TextSnippetRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import FolderZipRoundedIcon from "@mui/icons-material/FolderZipRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import {
  deleteManagedDocument,
  downloadManagedDocument,
  downloadResidentManagedDocument,
  fetchManagedDocuments,
  fetchResidentManagedDocuments,
  uploadManagedDocument,
  userFriendlyError,
  type ManagedDocument,
  type ManagedDocumentCategory,
  type User,
} from "../api";

type Props = {
  category: ManagedDocumentCategory;
  resident?: boolean;
  currentUser?: User;
};

function FileTypeIcon({ row }: Readonly<{ row: ManagedDocument }>) {
  const ext = (row.fileExtension || row.originalFileName.split(".").pop() || "").toLowerCase();
  const sx = { fontSize: 30 };
  if (ext === "pdf") return <PictureAsPdfRoundedIcon color="error" sx={sx} />;
  if (["doc", "docx", "odt", "rtf"].includes(ext)) return <DescriptionRoundedIcon color="primary" sx={sx} />;
  if (["xls", "xlsx", "ods", "csv"].includes(ext)) return <TableChartRoundedIcon color="success" sx={sx} />;
  if (["txt", "md", "log"].includes(ext)) return <TextSnippetRoundedIcon color="action" sx={sx} />;
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return <ImageRoundedIcon color="secondary" sx={sx} />;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return <FolderZipRoundedIcon color="warning" sx={sx} />;
  return <InsertDriveFileRoundedIcon color="action" sx={sx} />;
}

const fileSize = (bytes: number) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ManagedDocumentsScreen({ category, resident = false, currentUser }: Readonly<Props>) {
  const title = category === "LIBRARY" ? "Biblioteca" : "RI · Regulamento Interno";
  const subtitle = category === "LIBRARY"
    ? "Documentos disponibilizados pela administração do condomínio."
    : "Regulamentos, normas e documentos internos disponibilizados pela administração.";
  const HeaderIcon = category === "LIBRARY" ? LibraryBooksRoundedIcon : GavelRoundedIcon;
  const canManage = !resident && Boolean(currentUser?.canManageSettings ?? ["ADMIN", "SECRETARY"].includes((currentUser?.role ?? "").toUpperCase()));
  const [rows, setRows] = useState<ManagedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setRows(resident ? await fetchResidentManagedDocuments(category) : await fetchManagedDocuments(category));
      setError(null);
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível carregar os arquivos."));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [category, resident]);

  const visible = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(row => `${row.displayName} ${row.originalFileName}`.toLowerCase().includes(term));
  }, [rows, filter]);

  const download = async (row: ManagedDocument) => {
    setBusy(true); setError(null);
    try {
      if (resident) await downloadResidentManagedDocument(row.id, row.originalFileName);
      else await downloadManagedDocument(row.id, row.originalFileName);
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível baixar o arquivo."));
    } finally { setBusy(false); }
  };

  const upload = async () => {
    if (!file || !displayName.trim()) return;
    setBusy(true); setError(null);
    try {
      await uploadManagedDocument(category, displayName.trim(), file);
      setUploadOpen(false); setDisplayName(""); setFile(null);
      setSuccess("Arquivo incluído com sucesso.");
      await load();
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível incluir o arquivo."));
    } finally { setBusy(false); }
  };

  const remove = async (row: ManagedDocument) => {
    if (!globalThis.confirm(`Excluir \"${row.displayName}\"?`)) return;
    setBusy(true); setError(null);
    try {
      await deleteManagedDocument(row.id);
      setSuccess("Arquivo excluído.");
      await load();
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível excluir o arquivo."));
    } finally { setBusy(false); }
  };

  return <Box sx={{ maxWidth: 980, mx: "auto", p: resident ? 0 : { xs: 1, sm: 2 } }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.25} sx={{ mb: 2 }}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center"><HeaderIcon color="primary" /><Typography variant="h5" fontWeight={900}>{title}</Typography></Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: .4 }}>{subtitle}</Typography>
      </Box>
      {canManage && <Button variant="contained" startIcon={<UploadFileRoundedIcon />} onClick={() => setUploadOpen(true)}>Adicionar arquivo</Button>}
    </Stack>

    {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>{error}</Alert>}
    {success && <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setSuccess(null)}>{success}</Alert>}

    <TextField fullWidth size="small" label="Pesquisar por nome" value={filter} onChange={e => setFilter(e.target.value)} sx={{ mb: 1.5 }} />

    <Stack spacing={1}>
      {loading && <Card variant="outlined"><CardContent><Typography color="text.secondary">Carregando arquivos...</Typography></CardContent></Card>}
      {!loading && !visible.length && <Card variant="outlined"><CardContent sx={{ py: 4, textAlign: "center" }}><HeaderIcon color="disabled" sx={{ fontSize: 44 }} /><Typography color="text.secondary" sx={{ mt: 1 }}>Nenhum arquivo disponível.</Typography></CardContent></Card>}
      {visible.map(row => <Card key={row.id} variant="outlined" sx={{ borderRadius: 3 }}><CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: "action.hover", display: "grid", placeItems: "center", flex: "0 0 auto" }}><FileTypeIcon row={row} /></Box>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography fontWeight={850} noWrap title={row.displayName}>{row.displayName}</Typography>
            <Typography variant="caption" color="text.secondary" display="block" noWrap>{row.originalFileName} · {fileSize(row.fileSize)}</Typography>
          </Box>
          <Tooltip title="Baixar"><span><IconButton color="primary" disabled={busy} onClick={() => void download(row)}><DownloadRoundedIcon /></IconButton></span></Tooltip>
          {canManage && <Tooltip title="Excluir"><span><IconButton color="error" disabled={busy} onClick={() => void remove(row)}><DeleteOutlineRoundedIcon /></IconButton></span></Tooltip>}
        </Stack>
      </CardContent></Card>)}
    </Stack>

    <Dialog open={uploadOpen} onClose={() => !busy && setUploadOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Adicionar arquivo · {title}</DialogTitle>
      <DialogContent><Stack spacing={1.5} sx={{ mt: 1 }}>
        <TextField label="Nome para identificar na lista" value={displayName} onChange={e => setDisplayName(e.target.value)} inputProps={{ maxLength: 220 }} autoFocus />
        <Button component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />}>{file ? file.name : "Selecionar arquivo"}<input hidden type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} /></Button>
        <Typography variant="caption" color="text.secondary">PDF, Word, Excel, texto, imagem, ZIP e outros formatos. Tamanho máximo: 30 MB por arquivo.</Typography>
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setUploadOpen(false)} disabled={busy}>Cancelar</Button><Button variant="contained" onClick={() => void upload()} disabled={busy || !file || !displayName.trim()}>{busy ? "Enviando..." : "Adicionar"}</Button></DialogActions>
    </Dialog>
  </Box>;
}
