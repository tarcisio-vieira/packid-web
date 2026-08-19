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
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import DoorFrontOutlinedIcon from "@mui/icons-material/DoorFrontOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

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
          "radial-gradient(circle at 10% 10%, rgba(25,118,210,.10), transparent 30%), radial-gradient(circle at 92% 90%, rgba(46,125,50,.08), transparent 30%), linear-gradient(145deg, #f8f9fb 0%, #f5f2e9 100%)",
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
            background: "linear-gradient(90deg, #1976d2 0%, #42a5f5 52%, #2e7d32 100%)",
          }}
        />

        <CardContent
          sx={{
            p: { xs: 3, sm: 4.25 },
            "&:last-child": { pb: { xs: 3, sm: 4.25 } },
          }}
        >
          <Stack alignItems="center" textAlign="center">
            <Box
              sx={{
                width: 66,
                height: 66,
                borderRadius: 4,
                display: "grid",
                placeItems: "center",
                color: "white",
                background: "linear-gradient(145deg, #2588e3 0%, #1169c7 100%)",
                boxShadow: "0 14px 30px rgba(25,118,210,.28)",
                mb: 1.7,
              }}
            >
              <ApartmentRoundedIcon sx={{ fontSize: 36 }} />
            </Box>

            <Typography
              variant="overline"
              sx={{
                fontWeight: 900,
                letterSpacing: 2.4,
                color: "text.secondary",
                lineHeight: 1,
                mb: 0.8,
              }}
            >
              VSGI
            </Typography>

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
              color="primary"
              size="small"
              sx={{
                mt: 1.7,
                px: 0.5,
                fontWeight: 750,
                bgcolor: "rgba(25,118,210,.035)",
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
              borderColor: "rgba(25,118,210,.48)",
              bgcolor: "#fff",
              fontWeight: 800,
              textTransform: "none",
              boxShadow: "0 3px 10px rgba(28,58,90,.04)",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: "rgba(25,118,210,.035)",
                boxShadow: "0 6px 16px rgba(25,118,210,.08)",
              },
            }}
            startIcon={
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#1a73e8",
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
              color: "#263746",
              bgcolor: "#f7f9fb",
              border: "1px solid rgba(38,55,70,.08)",
              "&:hover": { bgcolor: "#f0f4f7" },
            }}
          >
            Acessar como morador
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
