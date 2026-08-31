import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  Box,
  Stack,
  TextField,
  IconButton,
  InputAdornment,
  Tooltip,
} from "@mui/material";

import PrintIcon from "@mui/icons-material/Print";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import SearchIcon from "@mui/icons-material/Search";
import PhoneAndroidOutlinedIcon from "@mui/icons-material/PhoneAndroidOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";

export type LabelHistoryRow = {
  id: string;
  createdAt: string;
  bookPage?: string;
  block?: string;
  apartment: string;
  residentFullName?: string;
  packageCode: string;
  packageType?: "PACKAGE" | "PARCEL" | "LETTER" | "OTHER";
  observations?: string;
  residentAcknowledgedAt?: string | null;
  handedOverAt?: string | null;
  status?: "saving" | "saved" | "error";
  errorMessage?: string;
};

type Props = Readonly<{
  rows: LabelHistoryRow[];
  maxRows?: number;
  search: string;
  onSearchChange: (value: string) => void;

  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;

  onPrintRow: (row: LabelHistoryRow) => void;
  onCancelRow: (row: LabelHistoryRow) => void;
  cancellingId?: string | null;
  compact?: boolean;
}>;

function formatDateTimeParts(
  iso: string,
  locale: string,
): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "-", time: "-" };

  const date = d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });

  const time = d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  return { date, time };
}

function escapeHtml(str: string): string {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function LabelHistoryGrid({
  rows,
  maxRows = 10,
  search,
  onSearchChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onPrintRow,
  onCancelRow,
  cancellingId = null,
  compact = false,
}: Props) {
  const { t } = useTranslation();

  const locale = "pt-BR";
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredRows = useMemo(() => {
    const rawQuery = search.trim();
    const query = rawQuery.toLocaleLowerCase(locale);
    const compactQuery = query.replace(/[^0-9a-z]/gi, "");
    const numericQuery = rawQuery.replace(/\D/g, "");
    const looksLikeUnit = /^[0-9\s./-]+$/.test(rawQuery)
      && (numericQuery.length === 4 || numericQuery.length === 5);

    const filtered = query
      ? rows.filter((row) => {
          const page = String(row.bookPage ?? "").trim();
          const block = String(row.block ?? "").trim();
          const apartment = String(row.apartment ?? "").trim();

          const pageBlockApartment = `${page}${block}${apartment}`;
          const blockApartment = `${block}${apartment}`;

          // Para 2608, 2/608 etc., trata a busca como unidade e não como
          // trecho do código da encomenda. Isso evita falsos positivos como
          // um rastreio contendo "2608" no meio do código.
          if (looksLikeUnit) {
            return blockApartment.replace(/\D/g, "") === numericQuery;
          }

          const candidates = [
            row.packageCode,
            row.bookPage,
            row.block,
            row.apartment,
            row.residentFullName,
            pageBlockApartment,
            blockApartment,
          ]
            .filter(Boolean)
            .map((value) => String(value).toLocaleLowerCase(locale));

          return candidates.some((value) => {
            if (value.includes(query)) return true;
            if (!compactQuery) return false;
            return value.replace(/[^0-9a-z]/gi, "").includes(compactQuery);
          });
        })
      : rows;

    return filtered;
  }, [rows, search, locale]);

  useEffect(() => {
    setPage(0);
  }, [rows]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredRows.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredRows.length, rowsPerPage, page]);

  const visibleRows = useMemo(() => {
    if (compact) return filteredRows.slice(0, maxRows);
    return filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [compact, filteredRows, maxRows, page, rowsPerPage]);

  if (compact) {
    return (
      <Paper elevation={1} sx={{ p: 1.25, width: "100%" }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          Últimas encomendas
        </Typography>

        <TextField
          size="small"
          label={t("history.filters.search")}
          placeholder="Código, página+bloco+apto ou bloco+apto"
          value={search}
          onChange={(e) => { onSearchChange(e.target.value); setPage(0); }}
          fullWidth
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.55 }} />,
            endAdornment: search ? (
              <InputAdornment position="end">
                <Tooltip title="Limpar pesquisa" arrow>
                  <IconButton
                    size="small"
                    aria-label="Limpar pesquisa"
                    onClick={() => { onSearchChange(""); setPage(0); }}
                    edge="end"
                  >
                    <ClearRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : undefined,
          }}
        />

        {!filteredRows.length ? (
          <Typography variant="body2" sx={{ opacity: 0.75, py: 1.5 }}>
            {t("history.noRecords")}
          </Typography>
        ) : (
          <Stack spacing={0} divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />} sx={{ mt: 1 }}>
            {visibleRows.map((r) => {
              const { date, time } = formatDateTimeParts(r.createdAt, locale);
              return (
                <Box key={r.id} sx={{ py: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={0.55} alignItems="center">
                        <Typography variant="body2" fontWeight={700} sx={{ overflowWrap: "anywhere" }}>
                          {r.packageCode}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" display="block" sx={{ opacity: 0.75 }}>
                        {date} {time} · Pág. {r.bookPage || "-"}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ opacity: 0.75 }}>
                        Bloco {r.block || "-"} · Apto {r.apartment || "-"}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.15} alignItems="center">
                      {r.residentAcknowledgedAt && (
                        <Tooltip title="Retirada solicitada pelo morador via aplicativo" arrow>
                          <span style={{ display: "inline-flex" }}>
                            <PhoneAndroidOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                          </span>
                        </Tooltip>
                      )}
                      <Tooltip title={t("history.printSingleLabel")}>
                        <IconButton
                          aria-label={t("history.printSingleLabel")}
                          onClick={() => onPrintRow(r)}
                          size="small"
                        >
                          <LocalOfferOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {r.packageType === "LETTER" && (
                        <Tooltip title="Carta" arrow>
                          <span style={{ display: "inline-flex" }}>
                            <MailOutlineRoundedIcon sx={{ fontSize: 17, color: "text.secondary" }} />
                          </span>
                        </Tooltip>
                      )}
                      <Tooltip title={r.handedOverAt ? "Encomenda já entregue não pode ser cancelada" : "Cancelar registro incorreto"}>
                        <span>
                          <IconButton
                            aria-label="Cancelar registro incorreto"
                            onClick={() => onCancelRow(r)}
                            size="small"
                            color="error"
                            disabled={cancellingId === r.id || Boolean(r.handedOverAt)}
                          >
                            <CancelOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Paper>
    );
  }

  const handlePrintTable = () => {
    if (!filteredRows.length) return;

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(t("app.title"))}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; }
    h1 { margin: 0 0 16px 0; font-size: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
    th { font-weight: 700; }
    .center { text-align: center; }
    .small { font-size: 11px; opacity: 0.85; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(t("history.title"))}</h1>
  <table>
    <thead>
      <tr>
        <th class="center">${escapeHtml(t("history.columns.time"))}</th>
        <th class="center">${escapeHtml(t("history.columns.page"))}</th>
        <th class="center">${escapeHtml(t("history.columns.block"))}</th>
        <th class="center">${escapeHtml(t("history.columns.apartment"))}</th>
        <th>${escapeHtml(t("history.columns.packageCode"))}</th>
      </tr>
    </thead>
    <tbody>
      ${visibleRows
        .map((r) => {
          const { date, time } = formatDateTimeParts(r.createdAt, locale);
          return `<tr>
            <td class="center">
              ${escapeHtml(date)}<br/>
              <span class="small">${escapeHtml(time)}</span>
            </td>
            <td class="center">${escapeHtml(r.bookPage || "-")}</td>
            <td class="center">${escapeHtml(r.block || "-")}</td>
            <td class="center">${escapeHtml(r.apartment)}</td>
            <td>${escapeHtml(r.packageCode)}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
  </table>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    const win = iframe.contentWindow;

    if (!doc || !win) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      win.focus();
      win.print();

      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {
          // ignore
        }
      }, 800);
    }, 200);
  };

  return (
    <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2 }, width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "center",
          justifyContent: "flex-start",
          flexWrap: "wrap",
          mb: 1,
        }}
      >
        <TextField
          size="small"
          label={t("history.filters.search")}
          placeholder={t("history.filters.searchPlaceholder")}
          value={search}
          onChange={(e) => { onSearchChange(e.target.value); setPage(0); }}
          sx={{ minWidth: { xs: "100%", sm: 330 } }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.55 }} />,
            endAdornment: search ? (
              <InputAdornment position="end">
                <Tooltip title="Limpar pesquisa" arrow>
                  <IconButton
                    size="small"
                    aria-label="Limpar pesquisa"
                    onClick={() => { onSearchChange(""); setPage(0); }}
                    edge="end"
                  >
                    <ClearRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : undefined,
          }}
        />

        <TextField
          size="small"
          type="date"
          label={t("history.filters.from")}
          value={fromDate}
          onChange={(e) => onFromDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          type="date"
          label={t("history.filters.to")}
          value={toDate}
          onChange={(e) => onToDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <Tooltip title={t("history.printTable")} arrow>
          <span>
            <IconButton
              color="primary"
              onClick={handlePrintTable}
              disabled={!filteredRows.length}
              aria-label={t("history.printTable")}
            >
              <PrintIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {!filteredRows.length ? (
        <Typography variant="body2" sx={{ opacity: 0.8, p: 1 }}>
          {t("history.noRecords")}
        </Typography>
      ) : (
        <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
          <Table
            size="small"
            aria-label={t("history.title")}
            sx={{ minWidth: 820 }}
          >
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                  {t("history.columns.time")}
                </TableCell>
                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                  {t("history.columns.page")}
                </TableCell>
                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                  {t("history.columns.block")}
                </TableCell>
                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                  {t("history.columns.apartment")}
                </TableCell>
                <TableCell>{t("history.columns.packageCode")}</TableCell>
                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                  App
                </TableCell>
                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                  Carta
                </TableCell>
                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                  {t("history.columns.actions")}
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {visibleRows.map((r) => {
                const { date, time } = formatDateTimeParts(r.createdAt, locale);

                return (
                  <TableRow key={r.id} hover>
                    <TableCell align="center">
                      <Stack
                        spacing={0}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Typography variant="body2">{date}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.75 }}>
                          {time}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell align="center">
                      <Typography variant="body2">{r.bookPage || "-"}</Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Typography variant="body2">{r.block || "-"}</Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Typography variant="body2">{r.apartment}</Typography>
                    </TableCell>

                    <TableCell sx={{ minWidth: 220, wordBreak: "break-word" }}>
                      <Typography variant="body2">{r.packageCode}</Typography>
                    </TableCell>

                    <TableCell align="center">
                      {r.residentAcknowledgedAt && (
                        <Tooltip title="Retirada solicitada pelo morador via aplicativo" arrow>
                          <span style={{ display: "inline-flex" }}>
                            <PhoneAndroidOutlinedIcon sx={{ fontSize: 19, color: "text.secondary" }} />
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      {r.packageType === "LETTER" && (
                        <Tooltip title="Carta" arrow>
                          <span style={{ display: "inline-flex" }}>
                            <MailOutlineRoundedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      <Stack direction="row" spacing={0.2} justifyContent="center" alignItems="center">
                        <Tooltip title={t("history.printSingleLabel")}>
                          <span>
                            <IconButton
                              aria-label={t("history.printSingleLabel")}
                              onClick={() => onPrintRow(r)}
                              size="small"
                            >
                              <LocalOfferOutlinedIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={r.handedOverAt ? "Encomenda já entregue não pode ser cancelada" : "Cancelar registro incorreto"}>
                          <span>
                            <IconButton
                              aria-label="Cancelar registro incorreto"
                              onClick={() => onCancelRow(r)}
                              size="small"
                              color="error"
                              disabled={cancellingId === r.id || Boolean(r.handedOverAt)}
                            >
                              <CancelOutlinedIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!compact && filteredRows.length > 0 && (
        <TablePagination
          component="div"
          count={filteredRows.length}
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
      )}
    </Paper>
  );
}
