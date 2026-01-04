import { useMemo } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";

export type LabelHistoryRow = {
  id: string;
  createdAt: string; // ISO
  apartment: string;
  packageCode: string;
};

type Props = Readonly<{
  rows: LabelHistoryRow[];
  maxRows?: number;
}>;

function escapeHtml(v: string): string {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function LabelHistoryGrid({ rows, maxRows = 10 }: Props) {
  const visibleRows = useMemo(() => rows.slice(0, maxRows), [rows, maxRows]);

  const handlePrintTable = () => {
    const w = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=900,height=700"
    );
    if (!w) return;

    const htmlRows = visibleRows
      .map((row) => {
        const dt = new Date(row.createdAt);
        const date = dt.toLocaleDateString();
        const time = dt.toLocaleTimeString();

        return `
          <tr>
            <td>
              <div style="text-align:center; line-height:1.1;">${escapeHtml(
                date
              )}</div>
              <div style="text-align:center; font-size:11px; opacity:.75; line-height:1.1;">
                ${escapeHtml(time)}
              </div>
            </td>
            <td style="text-align:center; font-weight:700;">${escapeHtml(
              row.apartment
            )}</td>
            <td>${escapeHtml(row.packageCode)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>PackID - Tabela</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 16px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
            th { text-align: left; background: #f3f3f3; }
            .muted { font-size: 11px; opacity: .75; }
            @media print {
              body { margin: 0; }
              th, td { border: 1px solid #999; }
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th style="width:120px; text-align:center;">date</th>
                <th style="width:120px; text-align:center;">apartment</th>
                <th>packageCode</th>
              </tr>
            </thead>
            <tbody>
              ${
                htmlRows ||
                `<tr><td colspan="3" class="muted">Sem dados.</td></tr>`
              }
            </tbody>
          </table>
        </body>
      </html>
    `;

    w.document.open();
    w.document.write(html);
    w.document.close();

    w.onload = () => {
      w.focus();
      w.print();
      // fecha depois do print (nem todo browser dispara, mas ajuda)
      w.onafterprint = () => w.close();
    };
  };

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      {/* Barra de ações (somente imprimir) */}
      <Box display="flex" justifyContent="flex-end" mb={1}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PrintIcon />}
          onClick={handlePrintTable}
          disabled={visibleRows.length === 0}
        >
          Imprimir
        </Button>
      </Box>

      {rows.length === 0 ? (
        <Typography variant="body2" sx={{ opacity: 0.75 }}>
          Nenhum registro encontrado.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small" aria-label="packid-table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 120 }} align="center">
                  date
                </TableCell>
                <TableCell sx={{ width: 120 }} align="center">
                  apartment
                </TableCell>
                <TableCell>packageCode</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {visibleRows.map((row) => {
                const dt = new Date(row.createdAt);
                const date = dt.toLocaleDateString();
                const time = dt.toLocaleTimeString();

                return (
                  <TableRow key={row.id}>
                    {/* data/hora centralizado */}
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{ lineHeight: 1.1, textAlign: "center" }}
                      >
                        {date}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          opacity: 0.75,
                          lineHeight: 1.1,
                          textAlign: "center",
                        }}
                      >
                        {time}
                      </Typography>
                    </TableCell>

                    {/* apartment centralizado */}
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, textAlign: "center" }}
                      >
                        {row.apartment}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Tooltip title={row.packageCode}>
                        <Box
                          component="span"
                          sx={{
                            display: "inline-block",
                            maxWidth: { xs: 160, sm: 280 },
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            verticalAlign: "bottom",
                          }}
                        >
                          {row.packageCode}
                        </Box>
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
