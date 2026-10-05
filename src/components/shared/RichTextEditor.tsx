import { useEffect, useRef, useState } from "react";
import {
  Box, Button, Divider, IconButton, Menu, MenuItem, Paper, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import FormatBoldRoundedIcon from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRoundedIcon from "@mui/icons-material/FormatItalicRounded";
import FormatUnderlinedRoundedIcon from "@mui/icons-material/FormatUnderlinedRounded";
import FormatAlignLeftRoundedIcon from "@mui/icons-material/FormatAlignLeftRounded";
import FormatAlignCenterRoundedIcon from "@mui/icons-material/FormatAlignCenterRounded";
import FormatAlignRightRoundedIcon from "@mui/icons-material/FormatAlignRightRounded";
import InsertPhotoRoundedIcon from "@mui/icons-material/InsertPhotoRounded";
import EmojiEmotionsRoundedIcon from "@mui/icons-material/EmojiEmotionsRounded";
import FormatClearRoundedIcon from "@mui/icons-material/FormatClearRounded";

const STICKERS = ["😊", "🎉", "📢", "✅", "⚠️", "❤️", "🏡", "🏢", "🔑", "📦", "🌿", "👏", "🙏", "📅", "🎈", "⭐"];

async function imageToDataUrl(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = source;
  });

  const max = 1200;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function RichTextEditor({ value, onChange }: Readonly<{ value: string; onChange: (html: string) => void }>) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    if (editor.innerHTML !== value) editor.innerHTML = value;
  }, [value]);

  const sync = () => onChange(editorRef.current?.innerHTML ?? "");
  const command = (name: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(name, false, commandValue);
    sync();
  };
  const insertEmoji = (emoji: string) => {
    editorRef.current?.focus();
    document.execCommand("insertText", false, emoji);
    setEmojiAnchor(null);
    sync();
  };
  const insertImage = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await imageToDataUrl(file);
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, `<p><img src="${dataUrl}" alt="Imagem do comunicado" style="max-width:100%;height:auto;border-radius:12px" /></p>`);
    sync();
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  return <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2.5 }}>
    <Stack direction="row" gap={0.25} alignItems="center" flexWrap="wrap" sx={{ p: 0.75, bgcolor: "#f7fbfa", borderBottom: "1px solid", borderColor: "divider" }}>
      <Tooltip title="Negrito"><IconButton size="small" onMouseDown={e => e.preventDefault()} onClick={() => command("bold")}><FormatBoldRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Itálico"><IconButton size="small" onMouseDown={e => e.preventDefault()} onClick={() => command("italic")}><FormatItalicRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Sublinhado"><IconButton size="small" onMouseDown={e => e.preventDefault()} onClick={() => command("underline")}><FormatUnderlinedRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Divider orientation="vertical" flexItem sx={{ mx: .4 }} />
      <TextField select size="small" defaultValue="3" aria-label="Tamanho da letra" sx={{ width: 112, "& .MuiInputBase-root": { height: 34 } }} onChange={e => command("fontSize", e.target.value)}>
        <MenuItem value="2">Pequena</MenuItem><MenuItem value="3">Normal</MenuItem><MenuItem value="4">Grande</MenuItem><MenuItem value="5">Maior</MenuItem>
      </TextField>
      <Tooltip title="Cor da letra"><Box component="label" sx={{ width: 34, height: 34, borderRadius: 1.5, display: "grid", placeItems: "center", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}><Box component="input" type="color" defaultValue="#17322c" onChange={(e) => command("foreColor", e.target.value)} sx={{ width: 22, height: 22, border: 0, p: 0, bgcolor: "transparent", cursor: "pointer" }} /></Box></Tooltip>
      <Divider orientation="vertical" flexItem sx={{ mx: .4 }} />
      <Tooltip title="Alinhar à esquerda"><IconButton size="small" onClick={() => command("justifyLeft")}><FormatAlignLeftRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Centralizar"><IconButton size="small" onClick={() => command("justifyCenter")}><FormatAlignCenterRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Alinhar à direita"><IconButton size="small" onClick={() => command("justifyRight")}><FormatAlignRightRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Divider orientation="vertical" flexItem sx={{ mx: .4 }} />
      <Tooltip title="Inserir imagem"><IconButton size="small" onClick={() => imageInputRef.current?.click()}><InsertPhotoRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={e => void insertImage(e.target.files?.[0])} />
      <Tooltip title="Figurinhas e emojis"><IconButton size="small" onClick={e => setEmojiAnchor(e.currentTarget)}><EmojiEmotionsRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Menu anchorEl={emojiAnchor} open={Boolean(emojiAnchor)} onClose={() => setEmojiAnchor(null)}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,42px)", p: .75 }}>
          {STICKERS.map(emoji => <Button key={emoji} onClick={() => insertEmoji(emoji)} sx={{ minWidth: 40, fontSize: 21 }}>{emoji}</Button>)}
        </Box>
      </Menu>
      <Tooltip title="Limpar formatação"><IconButton size="small" onClick={() => command("removeFormat")}><FormatClearRoundedIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>
    <Box
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      data-placeholder="Escreva o comunicado..."
      onInput={sync}
      sx={{
        minHeight: 260, p: 2, outline: "none", fontSize: 16, lineHeight: 1.55, color: "text.primary", bgcolor: "background.paper",
        "&:empty:before": { content: "attr(data-placeholder)", color: "text.disabled", pointerEvents: "none" },
        "& img": { maxWidth: "100%", height: "auto", borderRadius: 2 },
        "& p": { my: .7 },
      }}
    />
    <Box sx={{ px: 1.5, py: .75, bgcolor: "#f7fbfa", borderTop: "1px solid", borderColor: "divider" }}>
      <Typography variant="caption" color="text.secondary">Imagens são reduzidas automaticamente. Use o editor para formatar o conteúdo que também será enviado por e-mail.</Typography>
    </Box>
  </Paper>;
}
