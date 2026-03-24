import { useMemo } from "react";
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
} from "@mui/material";

import PrintIcon from "@mui/icons-material/Print";

export type LabelHistoryRow = {
  id: string;
  createdAt: string;
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

  // filtro (YYYY-MM-DD)
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
}>;

function getLocale(language: string): string {
  switch (language) {
    case "pt":
      return "pt-BR";
    case "es":
      return "es-ES";
    case "en":
    default:
      return "en-US";
  }
}

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
}: Props) {
  const { t, i18n } = useTranslation();

  const locale = getLocale(i18n.resolvedLanguage || i18n.language || "en");
  const visibleRows = useMemo(() => rows.slice(0, maxRows), [rows, maxRows]);

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
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
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
        <th class="center">${escapeHtml(t("history.columns.apartment"))}</th>
        <th>${escapeHtml(t("history.columns.residentFullName"))}</th>
        <th>${escapeHtml(t("history.columns.packageCode"))}</th>
        <th>${escapeHtml(t("history.columns.observations"))}</th>
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
            <td class="center">${escapeHtml(r.apartment)}</td>
            <td>${escapeHtml(r.residentFullName || "-")}</td>
            <td>${escapeHtml(r.packageCode)}</td>
            <td>${escapeHtml(r.observations || "-")}</td>
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
    <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2 } }}>
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
          {t("history.print")}
        </Button>
      </Box>

      {!visibleRows.length ? (
        <Typography variant="body2" sx={{ opacity: 0.8, p: 1 }}>
          {t("history.noRecords")}
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small" aria-label={t("history.title")}>
            <TableHead>
              <TableRow>
                <TableCell align="center">
                  {t("history.columns.time")}
                </TableCell>
                <TableCell align="center">
                  {t("history.columns.apartment")}
                </TableCell>
                <TableCell>{t("history.columns.residentFullName")}</TableCell>
                <TableCell>{t("history.columns.packageCode")}</TableCell>
                <TableCell>{t("history.columns.observations")}</TableCell>
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
                      <Typography variant="body2">{r.apartment}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {r.residentFullName || "-"}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{r.packageCode}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {r.observations || "-"}
                      </Typography>
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
