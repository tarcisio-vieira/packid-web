import { Avatar, Box, type AvatarProps, type SxProps, type Theme } from "@mui/material";
import { useEffect, useState, type ReactNode } from "react";

function useAuthenticatedObjectUrl(remoteUrl?: string): string | undefined {
  const [objectUrl, setObjectUrl] = useState<string>();

  useEffect(() => {
    let active = true;
    let createdUrl: string | undefined;
    const controller = new AbortController();

    if (!remoteUrl) {
      setObjectUrl(undefined);
      return () => controller.abort();
    }

    void fetch(remoteUrl, {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Falha ao carregar imagem (${response.status}).`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (!active) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.warn("Não foi possível carregar imagem autenticada.", error);
        if (active) setObjectUrl(undefined);
      });

    return () => {
      active = false;
      controller.abort();
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [remoteUrl]);

  return objectUrl;
}

export function AuthenticatedAvatar({
  remoteSrc,
  children,
  ...props
}: Readonly<AvatarProps & { remoteSrc?: string; children?: ReactNode }>) {
  const src = useAuthenticatedObjectUrl(remoteSrc);
  return <Avatar {...props} src={src}>{children}</Avatar>;
}

export function AuthenticatedImage({
  remoteSrc,
  alt,
  sx,
}: Readonly<{ remoteSrc?: string; alt: string; sx?: SxProps<Theme> }>) {
  const src = useAuthenticatedObjectUrl(remoteSrc);
  if (!src) return null;
  return <Box component="img" src={src} alt={alt} sx={sx} />;
}
