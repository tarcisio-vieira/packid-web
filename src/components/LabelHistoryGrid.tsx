import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Stack,
  Button,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";

import PrintIcon from "@mui/icons-material/Print";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import SearchIcon from "@mui/icons-material/Search";

export type LabelHistoryRow = {
  id: string;
  createdAt: string;
  bookPage?: string;
  block?: string;
  apartment: string;
  residentFullName?: string;
  packageCode: string;
  observations?: string;
  status?: "saving" | "saved" | "error";
  errorMessage?: string;
};

type Props = Readonly<{
  rows: LabelHistoryRow[];
  maxRows?: number;

  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;

  onPrintRow: (row: LabelHistoryRow) => void;
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
  });

  const time = d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
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
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onPrintRow,
  compact = false,
}: Props) {
  const { t } = useTranslation();

  const locale = "pt-BR";
  const [search, setSearch] = useState("");

  const visibleRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    const compactQuery = query.replace(/[^0-9a-z]/gi, "");

    const filtered = query
      ? rows.filter((row) => {
          const page = String(row.bookPage ?? "").trim();
          const block = String(row.block ?? "").trim();
          const apartment = String(row.apartment ?? "").trim();

          // Permite pesquisar a unidade tanto no formato completo
          // página + bloco + apartamento (ex.: 09911203) quanto
          // somente bloco + apartamento (ex.: 11203).
          const pageBlockApartment = `${page}${block}${apartment}`;
          const blockApartment = `${block}${apartment}`;

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

    return filtered.slice(0, maxRows);
  }, [rows, maxRows, search, locale]);

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
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.55 }} />,
          }}
        />

        {!visibleRows.length ? (
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
                      <Typography variant="body2" fontWeight={700} sx={{ overflowWrap: "anywhere" }}>
                        {r.packageCode}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ opacity: 0.75 }}>
                        {date} {time} · Pág. {r.bookPage || "-"}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ opacity: 0.75 }}>
                        Bloco {r.block || "-"} · Apto {r.apartment || "-"}
                      </Typography>
                    </Box>
                    <Tooltip title={t("history.printSingleLabel")}>
                      <IconButton
                        aria-label={t("history.printSingleLabel")}
                        onClick={() => onPrintRow(r)}
                        size="small"
                      >
                        <LocalOfferOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
    if (!visibleRows.length) return;

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
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: { xs: "100%", sm: 330 } }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.55 }} />,
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

        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={handlePrintTable}
          disabled={!visibleRows.length}
        >
          {t("history.printTable")}
        </Button>
      </Box>

      {!visibleRows.length ? (
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
