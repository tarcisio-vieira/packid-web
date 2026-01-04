import { useMemo } from "react";
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
  createdAt: string; // ISO
  apartment: string;
  packageCode: string; // o que você quer exibir (label_package_code)
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

function formatDateTimeParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "-", time: "-" };

  const date = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return { date, time };
}

function escapeHtml(str: string): string {
  return str
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
  const visibleRows = useMemo(() => rows.slice(0, maxRows), [rows, maxRows]);

  const handlePrintTable = () => {
    if (!visibleRows.length) return;

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>PackID</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { font-weight: 700; }
    .center { text-align: center; }
    .small { font-size: 11px; opacity: 0.85; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr>
        <th class="center">date</th>
        <th class="center">apartment</th>
        <th>packageCode</th>
      </tr>
    </thead>
    <tbody>
      ${visibleRows
        .map((r) => {
          const { date, time } = formatDateTimeParts(r.createdAt);
          return `<tr>
            <td class="center">
              ${escapeHtml(date)}<br/>
              <span class="small">${escapeHtml(time)}</span>
            </td>
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

    // dá tempo do browser “assentar” o layout do iframe antes de imprimir
    setTimeout(() => {
      win.focus();
      win.print();

      // remove depois para não acumular iframes
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
      {/* Barra de ações do grid: filtro + imprimir */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "center",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          mb: 1,
        }}
      >
        <TextField
          size="small"
          type="date"
          label="from"
          value={fromDate}
          onChange={(e) => onFromDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          type="date"
          label="to"
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
          Imprimir
        </Button>
      </Box>

      {!visibleRows.length ? (
        <Typography variant="body2" sx={{ opacity: 0.8, p: 1 }}>
          Nenhum registro.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small" aria-label="label history">
            <TableHead>
              <TableRow>
                <TableCell align="center">date</TableCell>
                <TableCell align="center">apartment</TableCell>
                <TableCell>packageCode</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {visibleRows.map((r) => {
                const { date, time } = formatDateTimeParts(r.createdAt);

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
                      <Typography variant="body2">{r.packageCode}</Typography>
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
