import { Product } from './models';

interface ZipEntry {
  name: string;
  data: Uint8Array;
  crc: number;
  offset: number;
}

const encoder = new TextEncoder();

export function downloadProductsXlsx(products: Product[], filename = 'produtos.xlsx'): void {
  const files = buildWorkbookFiles(products);
  const blob = createZip(files);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildWorkbookFiles(products: Product[]): Record<string, string> {
  const lastRow = Math.max(products.length + 1, 1);
  const rows = [
    rowXml(1, [
      textCell('A1', 'Código de barras', 1),
      textCell('B1', 'Código interno', 1),
      textCell('C1', 'Nome do produto', 1),
      textCell('D1', 'Preço', 1)
    ]),
    ...products.map((product, index) => {
      const row = index + 2;
      return rowXml(row, [
        textCell(`A${row}`, product.barcode ?? ''),
        textCell(`B${row}`, product.internalCode ?? ''),
        textCell(`C${row}`, product.name ?? ''),
        numberCell(`D${row}`, product.price ?? 0, 2)
      ]);
    })
  ].join('');

  const sheet = xmlHeader() +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:D${lastRow}"/>` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols><col min="1" max="1" width="20" customWidth="1"/><col min="2" max="2" width="20" customWidth="1"/><col min="3" max="3" width="42" customWidth="1"/><col min="4" max="4" width="15" customWidth="1"/></cols>` +
    `<sheetData>${rows}</sheetData>` +
    `<autoFilter ref="A1:D${lastRow}"/>` +
    `</worksheet>`;

  return {
    '[Content_Types].xml': xmlHeader() +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      `</Types>`,
    '_rels/.rels': xmlHeader() +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`,
    'xl/workbook.xml': xmlHeader() +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<sheets><sheet name="Produtos" sheetId="1" r:id="rId1"/></sheets>` +
      `</workbook>`,
    'xl/_rels/workbook.xml.rels': xmlHeader() +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
      `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      `</Relationships>`,
    'xl/worksheets/sheet1.xml': sheet,
    'xl/styles.xml': stylesXml()
  };
}

function xmlHeader(): string {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
}

function rowXml(row: number, cells: string[]): string {
  return `<row r="${row}">${cells.join('')}</row>`;
}

function textCell(ref: string, value: string, style?: number): string {
  const styleAttr = style === undefined ? '' : ` s="${style}"`;
  return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
}

function numberCell(ref: string, value: number, style?: number): string {
  const styleAttr = style === undefined ? '' : ` s="${style}"`;
  const numericValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `<c r="${ref}"${styleAttr}><v>${numericValue}</v></c>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stylesXml(): string {
  return xmlHeader() +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="1"><numFmt numFmtId="164" formatCode="R$ #,##0.00"/></numFmts>` +
    `<fonts count="2">` +
      `<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>` +
      `<font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/><family val="2"/></font>` +
    `</fonts>` +
    `<fills count="3">` +
      `<fill><patternFill patternType="none"/></fill>` +
      `<fill><patternFill patternType="gray125"/></fill>` +
      `<fill><patternFill patternType="solid"><fgColor rgb="FF217346"/><bgColor indexed="64"/></patternFill></fill>` +
    `</fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="3">` +
      `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
      `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
      `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
    `</cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`;
}

function createZip(files: Record<string, string>): Blob {
  const entries: ZipEntry[] = [];
  const localParts: Uint8Array[] = [];
  let offset = 0;
  const { time, date } = dosDateTime(new Date());

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, time, true);
    view.setUint16(12, date, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint16(28, 0, true);
    header.set(nameBytes, 30);

    entries.push({ name, data, crc, offset });
    localParts.push(header, data);
    offset += header.length + data.length;
  }

  const centralOffset = offset;
  const centralParts: Uint8Array[] = [];
  let centralSize = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const header = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, time, true);
    view.setUint16(14, date, true);
    view.setUint32(16, entry.crc, true);
    view.setUint32(20, entry.data.length, true);
    view.setUint32(24, entry.data.length, true);
    view.setUint16(28, nameBytes.length, true);
    view.setUint16(30, 0, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint32(38, 0, true);
    view.setUint32(42, entry.offset, true);
    header.set(nameBytes, 46);
    centralParts.push(header);
    centralSize += header.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  endView.setUint16(20, 0, true);

  const blobParts: BlobPart[] = [...localParts, ...centralParts, end].map(toArrayBuffer);

  return new Blob(blobParts, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(dateValue: Date): { time: number; date: number } {
  const year = Math.max(dateValue.getFullYear(), 1980);
  const time = (dateValue.getHours() << 11) | (dateValue.getMinutes() << 5) | Math.floor(dateValue.getSeconds() / 2);
  const date = ((year - 1980) << 9) | ((dateValue.getMonth() + 1) << 5) | dateValue.getDate();
  return { time, date };
}
