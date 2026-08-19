import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import {
  condominiumLogoUrl,
  createPoolCard,
  deletePoolCard,
  exportPoolCardsExcel,
  fetchPoolCards,
  fetchPoolCardSettings,
  fetchRegistryEntriesPage,
  poolCardMedicalReportDriveUrl,
  poolCardPdfUrl,
  updatePoolCard,
  uploadPoolCardMedicalReport,
  userFriendlyError,
  type PoolCard,
  type PoolCardSettings,
  type RegistryEntry,
  type User,
} from "../api";
import PoolCardVisual from "./PoolCardVisual";
import { confirmDialog } from "../utils/confirmDialog";

const today = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

function formatDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

export default function PoolCardsScreen({ currentUser }: Readonly<{ currentUser: User }>) {
  const canManage = Boolean(currentUser.canManagePoolCards)
    || ["ADMIN", "SECRETARY"].includes((currentUser.role || "").toUpperCase());

  const [cards, setCards] = useState<PoolCard[]>([]);
  const [settings, setSettings] = useState<PoolCardSettings | null>(null);
  const [residents, setResidents] = useState<RegistryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<PoolCard | null>(null);
  const [viewing, setViewing] = useState<PoolCard | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [resident, setResident] = useState<RegistryEntry | null>(null);
  const [issueDate, setIssueDate] = useState(today());
  const [underTen, setUnderTen] = useState(false);
  const [report, setReport] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [items, config] = await Promise.all([fetchPoolCards(search), fetchPoolCardSettings()]);
      setCards(items);
      setSettings(config);
      if (canManage && residents.length === 0) {
        const firstPage = await fetchRegistryEntriesPage({
          type: "RESIDENT",
          includeInactive: false,
          page: 0,
          size: 100,
          sort: "unit",
          direction: "asc",
        });
        const allResidents = [...firstPage.content];
        for (let residentPage = 1; residentPage < firstPage.totalPages; residentPage += 1) {
          const nextPage = await fetchRegistryEntriesPage({
            type: "RESIDENT",
            includeInactive: false,
            page: residentPage,
            size: 100,
            sort: "unit",
            direction: "asc",
          });
          allResidents.push(...nextPage.content);
        }
        setResidents(allResidents);
      }
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível carregar as carteirinhas."));
    } finally {
      setLoading(false);
    }
  }, [search, canManage, residents.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => setPage(0), [search, rowsPerPage]);
  useEffect(() => {
    const lastPage = Math.max(0, Math.ceil(cards.length / rowsPerPage) - 1);
    if (page > lastPage) setPage(lastPage);
  }, [cards.length, page, rowsPerPage]);

  const pagedCards = useMemo(
    () => cards.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [cards, page, rowsPerPage],
  );

  const openNew = () => {
    setEditing(null);
    setResident(null);
    setIssueDate(today());
    setUnderTen(false);
    setReport(null);
    setFormOpen(true);
  };

  const openEdit = (card: PoolCard) => {
    setEditing(card);
    setResident(residents.find((item) => item.id === card.residentRegistryEntryId) || null);
    setIssueDate(card.issueDate);
    setUnderTen(card.underTen);
    setReport(null);
    setFormOpen(true);
  };

  const save = async () => {
    if (!resident) {
      setError("Selecione o condômino.");
      return;
    }
    if (!editing && !report) {
      setError("Anexe o laudo médico em PDF, JPG ou PNG.");
      return;
    }

    setSaving(true);
    setError("");
    let createdCard: PoolCard | null = null;
    try {
      const payload = { residentRegistryEntryId: resident.id, issueDate, underTen };
      let saved: PoolCard;
      if (editing) {
        saved = await updatePoolCard(editing.id, payload);
      } else {
        saved = await createPoolCard(payload);
        createdCard = saved;
      }
      if (report) saved = await uploadPoolCardMedicalReport(saved.id, report);
      setFormOpen(false);
      await load();
      setViewing(saved);
    } catch (e) {
      if (createdCard) {
        try {
          await deletePoolCard(createdCard.id);
        } catch {
          // Evita deixar carteirinha sem laudo quando o upload falhar.
        }
      }
      setError(userFriendlyError(e, "Não foi possível salvar a carteirinha."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (card: PoolCard) => {
    const confirmed = await confirmDialog({
      title: "Excluir carteirinha?",
      text: `Tem certeza que deseja excluir a carteirinha de ${card.residentName}?`,
      confirmButtonText: "Excluir",
    });
    if (!confirmed) return;
    try {
      await deletePoolCard(card.id);
      await load();
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível excluir."));
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    setError("");
    try {
      await exportPoolCardsExcel();
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível exportar as carteirinhas para Excel."));
    } finally {
      setExporting(false);
    }
  };

  const logo = useMemo(
    () => settings?.logoAvailable ? condominiumLogoUrl(Date.now()) : undefined,
    [settings?.logoAvailable],
  );

  return (
    <Box sx={{ mt: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={1.5}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>Carteirinhas de piscina</Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            Consulte carteirinhas por condômino, bloco ou apartamento e acompanhe a validade do exame.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexShrink={0}>
          {canManage && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
              Novo cadastro
            </Button>
          )}
          {canManage && (
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={() => void exportExcel()}
              disabled={exporting}
            >
              {exporting ? "Exportando..." : "Exportar Excel"}
            </Button>
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setError("")}>{error}</Alert>}

      <TextField
        fullWidth
        size="small"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Pesquisar condômino, bloco ou apartamento"
        sx={{ mt: 2, maxWidth: 720 }}
      />

      {loading ? (
        <Box sx={{ py: 6, textAlign: "center" }}><CircularProgress /></Box>
      ) : (
        <Paper variant="outlined" sx={{ mt: 2, overflow: "hidden" }}>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Condômino</TableCell>
                  <TableCell>Bloco</TableCell>
                  <TableCell>Apto</TableCell>
                  <TableCell>Validade</TableCell>
                  <TableCell>Laudo médico</TableCell>
                  <TableCell align="center">Situação</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedCards.map((card) => (
                  <TableRow key={card.id} hover>
                    <TableCell><strong>{card.residentName}</strong></TableCell>
                    <TableCell>{card.block || "—"}</TableCell>
                    <TableCell>{card.apartment || "—"}</TableCell>
                    <TableCell>{formatDate(card.validUntil)}</TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      {!card.medicalReportAvailable ? "—" : canManage ? (
                        <Tooltip title="Abrir laudo médico no Google Drive" arrow>
                          <Link
                            href={poolCardMedicalReportDriveUrl(card.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              maxWidth: 220,
                              verticalAlign: "middle",
                            }}
                          >
                            <DescriptionOutlinedIcon sx={{ fontSize: 18, flexShrink: 0 }} />
                            <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {card.medicalReportFileName || "Abrir laudo"}
                            </Box>
                          </Link>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">Cadastrado</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={card.valid ? "Carteirinha dentro da validade" : "Carteirinha fora da validade"}>
                        <span>
                          {card.valid
                            ? <CheckCircleOutlineIcon sx={{ color: "text.disabled" }} />
                            : <ErrorOutlineIcon sx={{ color: "text.disabled" }} />}
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Visualizar">
                        <IconButton size="small" onClick={() => setViewing(card)}><VisibilityOutlinedIcon /></IconButton>
                      </Tooltip>
                      <Tooltip title="Exportar PDF">
                        <IconButton size="small" component="a" href={poolCardPdfUrl(card.id)}><PictureAsPdfOutlinedIcon /></IconButton>
                      </Tooltip>
                      {canManage && (
                        <>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => openEdit(card)}><EditOutlinedIcon /></IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton size="small" onClick={() => void remove(card)}><DeleteOutlineIcon /></IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!cards.length && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>Nenhuma carteirinha encontrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={cards.length}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 50]}
            labelRowsPerPage="Linhas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </Paper>
      )}

      <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Editar carteirinha" : "Nova carteirinha de piscina"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={residents}
              value={resident}
              onChange={(_, value) => setResident(value)}
              getOptionLabel={(item) => `${item.name} — Bloco ${item.block || "?"} / Apto ${item.apartment || "?"}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField {...params} label="Condômino" required placeholder="Digite nome, bloco ou apartamento" />
              )}
            />
            <TextField
              type="date"
              label="Data de emissão"
              value={issueDate}
              onChange={(event) => setIssueDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />
            <Autocomplete
              options={[{ label: "Sim", value: true }, { label: "Não", value: false }]}
              value={underTen ? { label: "Sim", value: true } : { label: "Não", value: false }}
              onChange={(_, value) => setUnderTen(Boolean(value?.value))}
              isOptionEqualToValue={(a, b) => a.value === b.value}
              renderInput={(params) => <TextField {...params} label="Menor de 10 anos" />}
            />
            <Button component="label" variant="outlined" startIcon={<DescriptionOutlinedIcon />}>
              {report
                ? report.name
                : editing?.medicalReportAvailable
                  ? "Substituir laudo médico (PDF/JPG/PNG)"
                  : "Anexar laudo médico (PDF/JPG/PNG)"}
              <input
                hidden
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(event) => setReport(event.target.files?.[0] || null)}
              />
            </Button>
            {settings && <Chip label={`Validade configurada: ${settings.validityMonths} meses`} variant="outlined" />}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => void save()}
            disabled={saving || !resident || !issueDate || (!editing && !report)}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} fullWidth maxWidth="md">
        <DialogTitle>Carteirinha de Piscina</DialogTitle>
        <DialogContent>
          {viewing && settings && <PoolCardVisual card={viewing} settings={settings} logoUrl={logo} />}
        </DialogContent>
        <DialogActions>
          {viewing && (
            <Button startIcon={<PictureAsPdfOutlinedIcon />} component="a" href={poolCardPdfUrl(viewing.id)}>
              Exportar PDF
            </Button>
          )}
          <Button onClick={() => setViewing(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
