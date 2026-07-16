/* Shared docx download utility — used by both in-app TemplatesView and standalone TemplateViewer */
import type { ContractTemplate } from "./contracts";

/** Chuẩn trình bày văn bản VN: Times New Roman, khổ A4, lề trên/dưới/phải 2cm, trái 3cm. */
const FONT = "Times New Roman";
const SIZE_BODY = 26; // 13pt (half-points)
const SIZE_SMALL = 24; // 12pt
const SIZE_TITLE = 32; // 16pt
const LINE_SPACING = 320; // ~1.33 dòng

const PAGE_A4 = {
  size: { width: 11906, height: 16838 },
  margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 },
};
// Bề rộng vùng chữ = 11906 - 1701 - 1134
const CONTENT_WIDTH = 9071;

const DOC_STYLES = {
  default: {
    document: { run: { font: FONT, size: SIZE_BODY } },
  },
  paragraphStyles: [
    {
      id: "Heading2",
      name: "Heading 2",
      basedOn: "Normal",
      next: "Normal",
      run: { font: FONT, size: SIZE_BODY, bold: true, color: "000000" },
    },
  ],
};

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Xuất docx dựng từ `template.sections` — cấu trúc hợp đồng chuẩn:
 * quốc hiệu, tiêu đề, số/ngày, các điều khoản căn đều, bảng phụ lục
 * thiết bị (STT/ĐVT/Số lượng/Tình trạng) và phần ký kết 2 cột.
 */
export async function downloadTemplateDocx(template: ContractTemplate) {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TextRun,
    UnderlineType,
    VerticalAlign,
    WidthType,
  } = await import("docx");

  const run = (
    text: string,
    opts: { bold?: boolean; italics?: boolean; allCaps?: boolean; size?: number; underline?: boolean } = {},
  ) =>
    new TextRun({
      text,
      font: FONT,
      size: opts.size ?? SIZE_BODY,
      bold: opts.bold,
      italics: opts.italics,
      allCaps: opts.allCaps,
      underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [
    new Paragraph({
      children: [run("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", { bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [run("Độc lập - Tự do - Hạnh phúc", { bold: true, underline: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
    }),
  ];

  const QUOC_HIEU = ["CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "Độc lập - Tự do - Hạnh phúc"];

  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const noBorders = {
    top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
    insideHorizontal: noBorder, insideVertical: noBorder,
  };
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

  // STT | Đồ đạc và thiết bị | ĐVT | Số lượng | Tình trạng
  const DEVICE_COL_WIDTHS = [700, 4471, 1000, 1100, 1800];

  const deviceCell = (
    text: string,
    column: number,
    opts: { header?: boolean; center?: boolean } = {},
  ) =>
    new TableCell({
      borders: cellBorders,
      verticalAlign: VerticalAlign.CENTER,
      width: { size: DEVICE_COL_WIDTHS[column], type: WidthType.DXA },
      shading: opts.header ? { type: ShadingType.CLEAR, color: "auto", fill: "EDEDED" } : undefined,
      margins: { top: 80, bottom: 80, left: 110, right: 110 },
      children: [
        new Paragraph({
          children: [run(text, { bold: opts.header, size: SIZE_SMALL })],
          alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        }),
      ],
    });

  for (const section of template.sections) {
    switch (section.type) {
      case "title":
        children.push(
          new Paragraph({
            children: [run(section.text, { bold: true, allCaps: true, size: SIZE_TITLE })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 80 },
          }),
        );
        break;
      case "meta":
        // Quốc hiệu đã in ở đầu file — bỏ qua nếu section trùng lặp.
        if (QUOC_HIEU.includes(section.text.trim())) break;
        children.push(
          new Paragraph({
            children: [run(section.text, { italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
          }),
        );
        break;
      case "intro":
        children.push(
          new Paragraph({
            children: [run(section.text)],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 140, after: 140, line: LINE_SPACING },
          }),
        );
        break;
      case "party": {
        const lines = section.text.split("\n");
        lines.forEach((line, index) => {
          children.push(
            new Paragraph({
              children: [run(line, { bold: index === 0 })],
              spacing: { before: index === 0 ? 200 : 0, after: 60, line: LINE_SPACING },
            }),
          );
        });
        break;
      }
      case "article-heading":
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [run(section.text, { bold: true, allCaps: true })],
            spacing: { before: 320, after: 140 },
            keepNext: true,
          }),
        );
        break;
      case "clause": {
        const lines = section.text.split("\n");
        for (const line of lines) {
          const isListItem = /^[-•]/.test(line.trim());
          children.push(
            new Paragraph({
              children: [run(line)],
              alignment: AlignmentType.JUSTIFIED,
              indent: isListItem ? { left: 425 } : undefined,
              spacing: { after: 100, line: LINE_SPACING },
            }),
          );
        }
        break;
      }
      case "appendix-heading":
        children.push(
          new Paragraph({
            children: [run(section.text, { bold: true, allCaps: true, size: 28 })],
            alignment: AlignmentType.CENTER,
            pageBreakBefore: true,
            spacing: { before: 120, after: 80 },
          }),
        );
        break;
      case "device-table": {
        if (!section.devices?.length) break;
        const header = new TableRow({
          tableHeader: true,
          children: [
            deviceCell("STT", 0, { header: true, center: true }),
            deviceCell("Đồ đạc và thiết bị", 1, { header: true }),
            deviceCell("ĐVT", 2, { header: true, center: true }),
            deviceCell("Số lượng", 3, { header: true, center: true }),
            deviceCell("Tình trạng", 4, { header: true, center: true }),
          ],
        });
        const rows = section.devices.map(
          (device, index) =>
            new TableRow({
              children: [
                deviceCell(String(index + 1), 0, { center: true }),
                deviceCell(device.ten, 1),
                deviceCell(device.dvt, 2, { center: true }),
                deviceCell(String(device.so_luong).padStart(2, "0"), 3, { center: true }),
                deviceCell(device.tinh_trang, 4, { center: true }),
              ],
            }),
        );
        children.push(
          new Paragraph({ text: "", spacing: { after: 60 } }),
          new Table({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            columnWidths: DEVICE_COL_WIDTHS,
            layout: TableLayoutType.FIXED,
            rows: [header, ...rows],
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),
        );
        break;
      }
      case "signing": {
        // Bảng 2 cột không viền, chừa khoảng trống để ký tên.
        children.push(
          new Paragraph({
            children: [run("KÝ KẾT", { bold: true, allCaps: true })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 480, after: 280 },
          }),
        );
        const blocks = section.text.split("\n\n");
        const signCell = (block: string) => {
          const lines = block.split("\n");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cellChildren: any[] = lines.map(
            (line, index) =>
              new Paragraph({
                children: [run(line, index === 0 ? { bold: true } : { italics: true, size: SIZE_SMALL })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
              }),
          );
          // Khoảng trống ký tên
          for (let i = 0; i < 4; i++) {
            cellChildren.push(new Paragraph({ text: "", spacing: { after: 120 } }));
          }
          return new TableCell({
            borders: noBorders,
            width: { size: Math.floor(CONTENT_WIDTH / 2), type: WidthType.DXA },
            children: cellChildren,
          });
        };
        children.push(
          new Table({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            columnWidths: [Math.floor(CONTENT_WIDTH / 2), Math.floor(CONTENT_WIDTH / 2)],
            layout: TableLayoutType.FIXED,
            borders: noBorders,
            rows: [new TableRow({ children: blocks.slice(0, 2).map(signCell) })],
          }),
        );
        break;
      }
    }
  }

  const doc = new Document({
    styles: DOC_STYLES,
    sections: [{ properties: { page: PAGE_A4 }, children }],
  });

  triggerDownload(await Packer.toBlob(doc), template.filename);
}

/* ============================================================
   Xuất docx từ text thuần (người dùng đã chỉnh sửa nội dung)
   — nhận diện dòng bằng regex, cùng chuẩn Times New Roman/A4.
   ============================================================ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildTextDocument(text: string): Promise<any> {
  const { AlignmentType, Document, HeadingLevel, Paragraph, TextRun, UnderlineType } = await import("docx");

  const run = (
    line: string,
    opts: { bold?: boolean; italics?: boolean; allCaps?: boolean; size?: number; underline?: boolean } = {},
  ) =>
    new TextRun({
      text: line,
      font: FONT,
      size: opts.size ?? SIZE_BODY,
      bold: opts.bold,
      italics: opts.italics,
      allCaps: opts.allCaps,
      underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
    });

  const lines = text.split("\n");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
    } else if (/^CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM$/i.test(trimmed)) {
      children.push(
        new Paragraph({
          children: [run(trimmed, { bold: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
        }),
      );
    } else if (/^Độc lập - Tự do - Hạnh phúc$/i.test(trimmed)) {
      children.push(
        new Paragraph({
          children: [run(trimmed, { bold: true, underline: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 360 },
        }),
      );
    } else if (/^HỢP ĐỒNG /.test(trimmed)) {
      children.push(
        new Paragraph({
          children: [run(trimmed, { bold: true, allCaps: true, size: SIZE_TITLE })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 80 },
        }),
      );
    } else if (/^Số:/.test(trimmed)) {
      children.push(
        new Paragraph({
          children: [run(trimmed, { italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 140 },
        }),
      );
    } else if (/^(BÊN CHO THUÊ|BÊN THUÊ|BÊN BÁN|BÊN MUA)\s*\(/.test(trimmed)) {
      children.push(
        new Paragraph({
          children: [run(trimmed, { bold: true })],
          spacing: { before: 200, after: 60 },
        }),
      );
    } else if (/^ĐIỀU \d+:/.test(trimmed)) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [run(trimmed, { bold: true, allCaps: true })],
          spacing: { before: 320, after: 140 },
          keepNext: true,
        }),
      );
    } else if (/^(PHỤ LỤC|KÝ KẾT)/.test(trimmed)) {
      children.push(
        new Paragraph({
          children: [run(trimmed, { bold: true, allCaps: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 200 },
        }),
      );
    } else if (/^Hôm nay,/.test(trimmed)) {
      children.push(
        new Paragraph({
          children: [run(trimmed, { italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 140 },
        }),
      );
    } else if (/^[-•]/.test(trimmed)) {
      children.push(
        new Paragraph({
          children: [run(trimmed)],
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 425 },
          spacing: { after: 100, line: LINE_SPACING },
        }),
      );
    } else {
      children.push(
        new Paragraph({
          children: [run(trimmed)],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 100, line: LINE_SPACING },
        }),
      );
    }
  }

  return new Document({
    styles: DOC_STYLES,
    sections: [{ properties: { page: PAGE_A4 }, children }],
  });
}

export async function createDocxBlob(text: string): Promise<Blob> {
  const { Packer } = await import("docx");
  const doc = await buildTextDocument(text);
  return Packer.toBlob(doc);
}

export async function downloadAsDocx(text: string, filename: string) {
  const { Packer } = await import("docx");
  const doc = await buildTextDocument(text);
  triggerDownload(await Packer.toBlob(doc), filename);
}
