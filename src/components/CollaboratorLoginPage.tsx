import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import DoorFrontOutlinedIcon from "@mui/icons-material/DoorFrontRounded";
import LockOutlinedIcon from "@mui/icons-material/LockRounded";
import CondominiumBrandIcon from "./shared/CondominiumBrandIcon";
import { condominiumBrand } from "../theme/condominiumBrand";

export default function CollaboratorLoginPage({
  error,
  onGoogleLogin,
  onResidentAccess,
}: Readonly<{
  error?: string | null;
  onGoogleLogin: () => void;
  onResidentAccess: () => void;
}>) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 5 },
        background:
          "radial-gradient(circle at 10% 10%, rgba(20,184,166,.13), transparent 30%), radial-gradient(circle at 92% 90%, rgba(15,118,110,.10), transparent 30%), linear-gradient(145deg, #f7fbfa 0%, #eef7f5 100%)",
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 470,
          borderRadius: { xs: 4, sm: 5 },
          border: "1px solid rgba(31, 47, 65, .10)",
          boxShadow: "0 26px 80px rgba(24, 39, 58, .13)",
          overflow: "hidden",
          bgcolor: "rgba(255,255,255,.98)",
        }}
      >
        <Box
          sx={{
            height: 6,
            background: `linear-gradient(90deg, ${condominiumBrand.primaryDark} 0%, ${condominiumBrand.primary} 52%, ${condominiumBrand.primaryLight} 100%)`,
          }}
        />

        <CardContent
          sx={{
            p: { xs: 3, sm: 4.25 },
            "&:last-child": { pb: { xs: 3, sm: 4.25 } },
          }}
        >
          <Stack alignItems="center" textAlign="center">
            <Box sx={{ mb: 1.7 }}><CondominiumBrandIcon size={66} /></Box>

            <Typography
              component="h1"
              fontWeight={900}
              sx={{
                fontSize: { xs: 28, sm: 32 },
                letterSpacing: -0.9,
                lineHeight: 1.12,
                color: "#15202b",
              }}
            >
              Condomínio
            </Typography>

            <Chip
              icon={<AdminPanelSettingsOutlinedIcon />}
              label="Acesso de colaboradores"
              variant="outlined"
              size="small"
              sx={{
                mt: 1.7,
                px: 0.5,
                fontWeight: 750,
                bgcolor: condominiumBrand.primarySofter,
                color: condominiumBrand.primary,
                borderColor: condominiumBrand.primary,
                "& .MuiChip-icon": { color: condominiumBrand.primary },
              }}
            />

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1.55, maxWidth: 350, lineHeight: 1.55 }}
            >
              Portaria, secretaria e administração entram com a conta Google autorizada pelo condomínio.
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2.5 }}>
              {error}
            </Alert>
          )}

          <Button
            fullWidth
            size="large"
            variant="outlined"
            onClick={onGoogleLogin}
            sx={{
              mt: 3,
              minHeight: 52,
              borderRadius: 2.6,
              color: "#17212b",
              borderColor: "rgba(15,118,110,.42)",
              bgcolor: "#fff",
              fontWeight: 800,
              textTransform: "none",
              boxShadow: "0 3px 10px rgba(28,58,90,.04)",
              "&:hover": {
                borderColor: condominiumBrand.primary,
                bgcolor: condominiumBrand.primarySofter,
                boxShadow: "0 6px 16px rgba(15,118,110,.10)",
              },
            }}
            startIcon={
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: condominiumBrand.primary,
                  lineHeight: 1,
                  fontFamily: "Arial, sans-serif",
                }}
              >
                G
              </Box>
            }
          >
            Entrar com Google
          </Button>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={0.7}
            sx={{ mt: 1.4, color: "text.secondary" }}
          >
            <LockOutlinedIcon sx={{ fontSize: 15 }} />
            <Typography variant="caption">Acesso protegido pela autenticação Google</Typography>
          </Stack>

          <Divider sx={{ my: 2.8 }} />

          <Button
            fullWidth
            color="inherit"
            endIcon={<ArrowForwardRoundedIcon />}
            startIcon={<DoorFrontOutlinedIcon />}
            onClick={onResidentAccess}
            sx={{
              minHeight: 46,
              borderRadius: 2.4,
              textTransform: "none",
              fontWeight: 750,
              color: condominiumBrand.text,
              bgcolor: condominiumBrand.primarySofter,
              border: `1px solid ${condominiumBrand.border}`,
              "&:hover": { bgcolor: condominiumBrand.primarySoft },
            }}
          >
            Acessar como morador
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
