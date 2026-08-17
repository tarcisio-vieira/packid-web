import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
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
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import {
  createAppUser,
  deleteAppUser,
  fetchAppUsers,
  updateAppUser,
  userFriendlyError,
  type AppUserManagement,
  type AppUserRole,
  type User,
} from "../api";

type UserForm = {
  email: string;
  fullName: string;
  role: AppUserRole;
  enabled: boolean;
};

const emptyForm = (): UserForm => ({ email: "", fullName: "", role: "PORTER", enabled: true });

function roleLabel(role: AppUserRole): string {
  if (role === "ADMIN") return "Administrador";
  if (role === "SECRETARY") return "Secretaria";
  return "Portaria";
}

export default function SystemUsersPanel({ currentUser }: Readonly<{ currentUser?: User | null }>) {
  const [users, setUsers] = useState<AppUserManagement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppUserManagement | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());

  const isAdmin = (currentUser?.role ?? "").toUpperCase() === "ADMIN";
  const roles = useMemo<AppUserRole[]>(() => isAdmin ? ["PORTER", "SECRETARY", "ADMIN"] : ["PORTER", "SECRETARY"], [isAdmin]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await fetchAppUsers());
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível carregar os usuários do condomínio."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (user: AppUserManagement) => {
    setEditing(user);
    setForm({ email: user.email, fullName: user.fullName ?? "", role: user.role, enabled: user.enabled !== false });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.email.trim()) {
      setError("Informe o e-mail Google do usuário.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (editing) {
        await updateAppUser(editing.id, {
          email: form.email.trim(),
          fullName: form.fullName.trim() || null,
          role: form.role,
          enabled: form.enabled,
        });
      } else {
        await createAppUser({
          email: form.email.trim(),
          fullName: form.fullName.trim() || null,
          provider: "GOOGLE",
          providerSubject: null,
          role: form.role,
          enabled: form.enabled,
        });
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível salvar o usuário."));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (user: AppUserManagement) => {
    if (!globalThis.confirm(`Excluir o acesso de ${user.email}?`)) return;
    setLoading(true);
    setError(null);
    try {
      await deleteAppUser(user.id);
      await load();
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível excluir o usuário."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: "center" }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <ManageAccountsOutlinedIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>Usuários do sistema</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Cadastre previamente os e-mails Google da secretaria e da portaria. No primeiro login Google, o VSGI vincula a conta automaticamente ao perfil cadastrado.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>Novo usuário</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <TableContainer sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Nome</TableCell><TableCell>E-mail Google</TableCell><TableCell>Perfil</TableCell><TableCell>Status</TableCell><TableCell align="right">Ações</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {users.length === 0 && <TableRow><TableCell colSpan={5} align="center">Nenhum usuário cadastrado.</TableCell></TableRow>}
            {users.map((user) => {
              const protectedAdmin = user.role === "ADMIN" && !isAdmin;
              return <TableRow key={user.id}>
                <TableCell>{user.fullName || "-"}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell><Chip size="small" label={roleLabel(user.role)} color={user.role === "PORTER" ? "default" : "primary"} variant="outlined" /></TableCell>
                <TableCell><Chip size="small" label={user.enabled ? "Ativo" : "Desabilitado"} color={user.enabled ? "success" : "default"} /></TableCell>
                <TableCell align="right">
                  <Tooltip title={protectedAdmin ? "Somente administrador pode alterar outro administrador" : "Editar"}>
                    <span><IconButton size="small" disabled={protectedAdmin} onClick={() => openEdit(user)}><EditOutlinedIcon fontSize="small" /></IconButton></span>
                  </Tooltip>
                  <Tooltip title={protectedAdmin ? "Somente administrador pode excluir outro administrador" : "Excluir"}>
                    <span><IconButton size="small" disabled={protectedAdmin || user.email.toLowerCase() === currentUser?.email?.toLowerCase()} onClick={() => void remove(user)}><DeleteOutlineIcon fontSize="small" /></IconButton></span>
                  </Tooltip>
                </TableCell>
              </TableRow>;
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Editar usuário" : "Novo usuário do condomínio"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nome" value={form.fullName} onChange={(e) => setForm(v => ({ ...v, fullName: e.target.value }))} fullWidth />
            <TextField label="E-mail Google" type="email" required value={form.email} onChange={(e) => setForm(v => ({ ...v, email: e.target.value }))} fullWidth
              helperText="Ex.: recantoportaria245@gmail.com. Não é necessário informar o identificador Google." />
            <TextField select label="Perfil" value={form.role} onChange={(e) => setForm(v => ({ ...v, role: e.target.value as AppUserRole }))} fullWidth>
              {roles.map(role => <MenuItem key={role} value={role}>{roleLabel(role)}</MenuItem>)}
            </TextField>
            <FormControlLabel control={<Switch checked={form.enabled} onChange={(e) => setForm(v => ({ ...v, enabled: e.target.checked }))} />} label="Acesso ativo" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void save()} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
