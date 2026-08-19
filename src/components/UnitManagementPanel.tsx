import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import {
  createResidentialUnit,
  deleteResidentialUnit,
  fetchResidentialUnits,
  updateResidentialUnit,
  userFriendlyError,
  type ResidentialUnit,
} from "../api";
import { confirmDialog } from "../utils/confirmDialog";

type Props = Readonly<{ tenantId: string; condominiumId: string }>;
type Form = { block: string; apartment: string; name: string; active: boolean };
const emptyForm = (): Form => ({ block: "", apartment: "", name: "", active: true });

export default function UnitManagementPanel({ tenantId, condominiumId }: Props) {
  const [units, setUnits] = useState<ResidentialUnit[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ResidentialUnit | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try { setUnits(await fetchResidentialUnits()); }
    catch (err) { setError(userFriendlyError(err, "Não foi possível carregar blocos e apartamentos.")); }
    finally { setBusy(false); }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    if (!q) return units;
    return units.filter((unit) => `${unit.block} ${unit.apartment} ${unit.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(q));
  }, [search, units]);

  const newUnit = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const editUnit = (unit: ResidentialUnit) => {
    setEditing(unit);
    setForm({ block: unit.block ?? "", apartment: unit.apartment ?? "", name: unit.name ?? "", active: unit.active !== false });
    setOpen(true);
  };

  const save = async () => {
    if (!form.block.trim() || !form.apartment.trim()) { setError("Informe o bloco e o apartamento/unidade."); return; }
    setBusy(true); setError(null);
    try {
      const payload = {
        tenantId,
        condominiumId,
        block: form.block.trim(),
        apartment: form.apartment.trim(),
        code: `${form.block.trim()}${form.apartment.trim()}`,
        name: form.name.trim() || `Bloco ${form.block.trim()} Apto ${form.apartment.trim()}`,
        active: form.active,
      };
      if (editing) await updateResidentialUnit(editing.id, payload);
      else await createResidentialUnit(payload);
      setOpen(false);
      await load();
    } catch (err) { setError(userFriendlyError(err, "Não foi possível salvar o bloco/apartamento.")); }
    finally { setBusy(false); }
  };

  const remove = async (unit: ResidentialUnit) => {
    const confirmed = await confirmDialog({
      title: "Excluir bloco/apartamento?",
      text: `A unidade Bloco ${unit.block} - Apto ${unit.apartment} deixará de aparecer nos novos cadastros. Os registros históricos serão preservados.`,
      confirmButtonText: "Excluir",
    });
    if (!confirmed) return;
    setBusy(true); setError(null);
    try { await deleteResidentialUnit(unit.id); await load(); }
    catch (err) { setError(userFriendlyError(err, "Não foi possível excluir a unidade.")); }
    finally { setBusy(false); }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: "center" }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <ApartmentOutlinedIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>Blocos e apartamentos</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Cadastro mestre usado nos campos pesquisáveis de bloco e apartamento. Somente o administrador pode alterar esta lista.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={newUnit}>Nova unidade</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <TextField size="small" label="Pesquisar bloco ou apartamento" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mt: 2, width: { xs: "100%", sm: 360 } }} />
      <TableContainer sx={{ mt: 1.5, maxHeight: 360 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow><TableCell>Bloco</TableCell><TableCell>Apartamento / unidade</TableCell><TableCell>Descrição</TableCell><TableCell>Status</TableCell><TableCell align="right">Ações</TableCell></TableRow></TableHead>
          <TableBody>
            {!busy && filtered.length === 0 && <TableRow><TableCell colSpan={5} align="center">Nenhuma unidade encontrada.</TableCell></TableRow>}
            {filtered.map((unit) => <TableRow key={unit.id} hover>
              <TableCell>{unit.block}</TableCell><TableCell>{unit.apartment}</TableCell><TableCell>{unit.name}</TableCell><TableCell>{unit.active ? "Ativa" : "Inativa"}</TableCell>
              <TableCell align="right">
                <Tooltip title="Editar"><IconButton size="small" onClick={() => editUnit(unit)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Excluir"><IconButton size="small" onClick={() => void remove(unit)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
              </TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Editar bloco/apartamento" : "Nova unidade"}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
          <TextField required label="Bloco" value={form.block} onChange={(e) => setForm((v) => ({ ...v, block: e.target.value }))} autoFocus />
          <TextField required label="Apartamento / unidade" value={form.apartment} onChange={(e) => setForm((v) => ({ ...v, apartment: e.target.value }))} />
          <TextField label="Descrição (opcional)" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} helperText="Ex.: Bloco 2 Apto 608. Se ficar vazio, o sistema gera automaticamente." />
          <FormControlLabel control={<Switch checked={form.active} onChange={(e) => setForm((v) => ({ ...v, active: e.target.checked }))} />} label="Unidade ativa" />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Cancelar</Button><Button variant="contained" onClick={() => void save()} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button></DialogActions>
      </Dialog>
    </Paper>
  );
}
