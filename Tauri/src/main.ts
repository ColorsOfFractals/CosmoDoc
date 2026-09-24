import "./styles.css";

import ExcelJS from "exceljs";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { evaluateRegisteredFunction } from "./formula/engine";

const ROWS = 100;
const COLS = 26;

let activeCell = "A1";
let currentPath: string | null = null;
let currentFileName = "Untitled.xlsx";
let activeSheetName = "Sheet1";

interface SheetState {
  name: string;
  cellValues: Map<string, string>;
  columnWidths: Map<number, number>;
  rowHeights: Map<number, number>;
}

let loadedWorkbook: ExcelJS.Workbook | null = null;

const sheetStates =
  new Map<string, SheetState>();

let cellValues = new Map<string, string>();

let columnWidths = new Map<number, number>();
let rowHeights = new Map<number, number>();

function excelColumnWidthToPixels(width: number): number {
  return Math.max(48, Math.round(width * 7 + 12));
}

function excelRowHeightToPixels(height: number): number {
  return Math.max(24, Math.round(height * 96 / 72));
}

const MIN_COLUMN_WIDTH = 48;
const MAX_COLUMN_WIDTH = 520;
const DEFAULT_COLUMN_WIDTH = 118;
const DEFAULT_ROW_HEIGHT = 32;
const COLUMN_TEXT_PADDING = 28;

function clampColumnWidth(width: number): number {
  return Math.max(
    MIN_COLUMN_WIDTH,
    Math.min(MAX_COLUMN_WIDTH, Math.round(width))
  );
}

function measureColumnTextWidth(
  column: number
): number {
  const canvas =
    document.createElement("canvas");

  const context =
    canvas.getContext("2d");

  if (!context) {
    return DEFAULT_COLUMN_WIDTH;
  }

  const sampleCell =
    document.querySelector<HTMLElement>(".cell");

  const computed =
    sampleCell
      ? window.getComputedStyle(sampleCell)
      : null;

  context.font =
    computed?.font ??
    "14px monospace";

  let widest =
    context.measureText(
      columnName(column - 1)
    ).width;

  for (let row = 1; row <= ROWS; row++) {
    const id =
      `${columnName(column - 1)}${row}`;

    const value =
      cellValues.get(id) ?? "";

    if (!value) continue;

    const measured =
      context.measureText(value).width;

    if (measured > widest) {
      widest = measured;
    }
  }

  return clampColumnWidth(
    widest + COLUMN_TEXT_PADDING
  );
}

function autoFitColumn(column: number): void {
  columnWidths.set(
    column,
    measureColumnTextWidth(column)
  );

  applyWorkbookGeometry();
  renderWorksheetImages();
  installWorksheetImageInteractions();
  captureCurrentSheetState();

  dirtyState.textContent = "MODIFIED";
  statusText.textContent =
    `COLUMN ${columnName(column - 1)} AUTOFIT`;
}

function installColumnResizeHandles(): void {
  document
    .querySelectorAll<HTMLElement>(".column-header")
    .forEach((header, index) => {
      const column = index + 1;

      if (
        header.querySelector(
          ".column-resize-handle"
        )
      ) {
        return;
      }

      const handle =
        document.createElement("div");

      handle.className =
        "column-resize-handle";

      handle.title =
        "Drag to resize // Double-click to AutoFit";

      handle.addEventListener(
        "dblclick",
        (event) => {
          event.preventDefault();
          event.stopPropagation();
          autoFitColumn(column);
        }
      );

      handle.addEventListener(
        "mousedown",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          const startX =
            event.clientX;

          const startWidth =
            columnWidths.get(column) ??
            header.getBoundingClientRect().width ??
            DEFAULT_COLUMN_WIDTH;

          document.body.classList.add(
            "column-resizing"
          );

          const onMove =
            (moveEvent: MouseEvent) => {
              const width =
                clampColumnWidth(
                  startWidth +
                  moveEvent.clientX -
                  startX
                );

              columnWidths.set(
                column,
                width
              );

              applyWorkbookGeometry();
              renderWorksheetImages();
  installWorksheetImageInteractions();
            };

          const onUp = () => {
            window.removeEventListener(
              "mousemove",
              onMove
            );

            window.removeEventListener(
              "mouseup",
              onUp
            );

            document.body.classList.remove(
              "column-resizing"
            );

            captureCurrentSheetState();

            dirtyState.textContent =
              "MODIFIED";

            statusText.textContent =
              `COLUMN ${columnName(column - 1)} RESIZED`;
          };

          window.addEventListener(
            "mousemove",
            onMove
          );

          window.addEventListener(
            "mouseup",
            onUp
          );
        }
      );

      header.appendChild(handle);
    });
}

function autoFitImportedColumns(): void {
  for (let column = 1; column <= COLS; column++) {
    const contentWidth =
      measureColumnTextWidth(column);

    const importedWidth =
      columnWidths.get(column) ??
      DEFAULT_COLUMN_WIDTH;

    columnWidths.set(
      column,
      clampColumnWidth(
        Math.max(
          importedWidth,
          contentWidth
        )
      )
    );
  }

  applyWorkbookGeometry();
}
const worksheetImageUrls =
  new Map<string, string>();

function clearWorksheetImageUrls(): void {
  for (const url of worksheetImageUrls.values()) {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }

  worksheetImageUrls.clear();
}

function worksheetImageMime(
  extension: unknown
): string {
  const ext =
    String(extension ?? "png").toLowerCase();

  if (ext === "jpg" || ext === "jpeg") {
    return "image/jpeg";
  }

  if (ext === "gif") {
    return "image/gif";
  }

  return "image/png";
}

function resolveWorksheetImageSource(
  imageId: number
): string | null {
  if (!loadedWorkbook) {
    return null;
  }

  const key =
    `${currentFileName}:${imageId}`;

  const cached =
    worksheetImageUrls.get(key);

  if (cached) {
    return cached;
  }

  const image =
    loadedWorkbook.getImage(imageId) as any;

  if (!image) {
    return null;
  }

  if (typeof image.base64 === "string") {
    const source =
      image.base64.startsWith("data:")
        ? image.base64
        : `data:${worksheetImageMime(image.extension)};base64,${image.base64}`;

    worksheetImageUrls.set(
      key,
      source
    );

    return source;
  }

  if (image.buffer) {
    let bytes: Uint8Array;

    if (image.buffer instanceof Uint8Array) {
      bytes =
        new Uint8Array(image.buffer);
    } else if (
      image.buffer instanceof ArrayBuffer
    ) {
      bytes =
        new Uint8Array(image.buffer);
    } else {
      bytes =
        new Uint8Array(image.buffer);
    }

    const copy =
      new Uint8Array(bytes.byteLength);

    copy.set(bytes);

    const blob =
      new Blob(
        [copy.buffer],
        {
          type:
            worksheetImageMime(
              image.extension
            )
        }
      );

    const source =
      URL.createObjectURL(blob);

    worksheetImageUrls.set(
      key,
      source
    );

    return source;
  }

  return null;
}

function worksheetAnchorCoordinate(
  anchor: any
): {
  column: number;
  row: number;
} {
  const column =
    Number(
      anchor?.col ??
      anchor?.nativeCol ??
      0
    );

  const row =
    Number(
      anchor?.row ??
      anchor?.nativeRow ??
      0
    );

  return {
    column:
      Number.isFinite(column)
        ? Math.max(0,column)
        : 0,

    row:
      Number.isFinite(row)
        ? Math.max(0,row)
        : 0
  };
}

function worksheetImagePoint(
  column: number,
  row: number
): {
  x: number;
  y: number;
} {
  const firstCell =
    document.querySelector<HTMLElement>(
      '[data-cell="A1"]'
    );

  if (!firstCell) {
    return {
      x: 0,
      y: 0
    };
  }

  let x =
    firstCell.offsetLeft;

  let y =
    firstCell.offsetTop;

  const wholeColumn =
    Math.floor(column);

  const columnFraction =
    column - wholeColumn;

  const wholeRow =
    Math.floor(row);

  const rowFraction =
    row - wholeRow;

  for (
    let index = 1;
    index <= wholeColumn;
    index++
  ) {
    x +=
      columnWidths.get(index) ??
      DEFAULT_COLUMN_WIDTH;
  }

  if (wholeColumn < COLS) {
    x +=
      columnFraction *
      (
        columnWidths.get(
          wholeColumn + 1
        ) ??
        DEFAULT_COLUMN_WIDTH
      );
  }

  for (
    let index = 1;
    index <= wholeRow;
    index++
  ) {
    y +=
      rowHeights.get(index) ??
      32;
  }

  if (wholeRow < ROWS) {
    y +=
      rowFraction *
      (
        rowHeights.get(
          wholeRow + 1
        ) ??
        32
      );
  }

  return { x,y };
}

function renderWorksheetImages(): void {
  document
    .querySelectorAll(
      ".worksheet-image-layer"
    )
    .forEach(
      (element) => element.remove()
    );

  if (!loadedWorkbook) {
    return;
  }

  const worksheet =
    loadedWorkbook.getWorksheet(
      activeSheetName
    );

  if (!worksheet) {
    return;
  }

  const images =
    worksheet.getImages() as any[];

  if (!images.length) {
    return;
  }

  const layer =
    document.createElement("div");

  layer.className =
    "worksheet-image-layer";

  for (const worksheetImage of images) {
    const source =
      resolveWorksheetImageSource(
        Number(worksheetImage.imageId)
      );

    if (!source) {
      continue;
    }

    const range =
      worksheetImage.range ?? {};

    const startAnchor =
      worksheetAnchorCoordinate(
        range.tl ?? {}
      );

    const start =
      worksheetImagePoint(
        startAnchor.column,
        startAnchor.row
      );

    let width = 160;
    let height = 90;

    if (range.br) {
      const endAnchor =
        worksheetAnchorCoordinate(
          range.br
        );

      const end =
        worksheetImagePoint(
          endAnchor.column,
          endAnchor.row
        );

      width =
        Math.max(
          1,
          end.x - start.x
        );

      height =
        Math.max(
          1,
          end.y - start.y
        );
    } else if (range.ext) {
      const candidateWidth =
        Number(range.ext.width);

      const candidateHeight =
        Number(range.ext.height);

      if (
        Number.isFinite(candidateWidth) &&
        candidateWidth > 0
      ) {
        width =
          candidateWidth;
      }

      if (
        Number.isFinite(candidateHeight) &&
        candidateHeight > 0
      ) {
        height =
          candidateHeight;
      }
    }

    const image =
      document.createElement("img");

    image.className =
      "worksheet-image";

    image.src =
      source;

    image.alt =
      `Worksheet image ${worksheetImage.imageId}`;

    image.style.left =
      `${start.x}px`;

    image.style.top =
      `${start.y}px`;

    image.style.width =
      `${width}px`;

    image.style.height =
      `${height}px`;

    layer.appendChild(image);
  }

  grid.appendChild(layer);
}
function applyWorkbookGeometry(): void {
  const columns = [
    "48px",
    ...Array.from(
      { length: COLS },
      (_, index) =>
        `${columnWidths.get(index + 1) ?? DEFAULT_COLUMN_WIDTH}px`
    )
  ];

  const rows = [
    "32px",
    ...Array.from(
      { length: ROWS },
      (_, index) =>
        `${rowHeights.get(index + 1) ?? 32}px`
    )
  ];

  grid.style.gridTemplateColumns =
    columns.join(" ");

  grid.style.gridTemplateRows =
    rows.join(" ");

  grid.style.gridAutoColumns =
    `${DEFAULT_COLUMN_WIDTH}px`;

  grid.style.gridAutoRows =
    "32px";

  grid.style.width =
    `${columns.reduce(
      (total, value) =>
        total + Number.parseFloat(value),
      0
    )}px`;
}

function columnName(index: number): string {
  let name = "";
  let n = index + 1;

  while (n > 0) {
    const remainder = (n - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    n = Math.floor((n - 1) / 26);
  }

  return name;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface WorksheetMergeDisplay {
  master: string;
  startRow: number;
  endRow: number;
  startColumn: number;
  endColumn: number;
}

function buildWorksheetMergeLookup():
  Map<string, WorksheetMergeDisplay> {
  const lookup =
    new Map<string, WorksheetMergeDisplay>();

  if (!loadedWorkbook) {
    return lookup;
  }

  const worksheet =
    loadedWorkbook.getWorksheet(activeSheetName);

  if (!worksheet) {
    return lookup;
  }

  const model =
    worksheet.model as any;

  const ranges: unknown[] =
    Array.isArray(model?.merges)
      ? model.merges
      : [];

  for (const rawRange of ranges) {
    const range =
      String(rawRange);

    const parts =
      range.split(":");

    if (parts.length !== 2) {
      continue;
    }

    const start =
      worksheet.getCell(parts[0]);

    const end =
      worksheet.getCell(parts[1]);

    const merge: WorksheetMergeDisplay = {
      master: start.address,
      startRow: Number(start.row),
      endRow: Number(end.row),
      startColumn: Number(start.col),
      endColumn: Number(end.col)
    };

    const firstRow =
      Math.max(1,merge.startRow);

    const lastRow =
      Math.min(ROWS,merge.endRow);

    const firstColumn =
      Math.max(1,merge.startColumn);

    const lastColumn =
      Math.min(COLS,merge.endColumn);

    for (
      let row = firstRow;
      row <= lastRow;
      row++
    ) {
      for (
        let column = firstColumn;
        column <= lastColumn;
        column++
      ) {
        const id =
          `${columnName(column - 1)}${row}`;

        lookup.set(id,merge);
      }
    }
  }

  return lookup;
}
/* ============================================================
   CosmoDoc Bake 043 — live workbook formula bridge

   Workbook source stays authoritative in cellValues:
       =SUM(E5:E41)

   Grid display receives the evaluated value:
       0

   Formula bar / editor still receive the original source.
   ============================================================ */

function workbookColumnNumber(name: string): number {
  let result = 0;

  for (const char of name.toUpperCase()) {
    result =
      result * 26 +
      (char.charCodeAt(0) - 64);
  }

  return result;
}

function workbookColumnName(column: number): string {
  let value = column;
  let result = "";

  while (value > 0) {
    value -= 1;

    result =
      String.fromCharCode(
        65 + (value % 26)
      ) +
      result;

    value = Math.floor(value / 26);
  }

  return result;
}

function splitWorkbookArguments(
  source: string
): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];

    if (char === "(") {
      depth += 1;
      continue;
    }

    if (char === ")") {
      depth -= 1;
      continue;
    }

    if (char === "," && depth === 0) {
      parts.push(
        source.slice(start, index).trim()
      );

      start = index + 1;
    }
  }

  parts.push(source.slice(start).trim());

  return parts.filter(
    part => part.length > 0
  );
}

function findTopLevelOperator(
  source: string,
  operator: string
): number {
  let depth = 0;

  for (let index = source.length - 1; index >= 0; index--) {
    const char = source[index];

    if (char === ")") {
      depth += 1;
      continue;
    }

    if (char === "(") {
      depth -= 1;
      continue;
    }

    if (
      depth === 0 &&
      char === operator
    ) {
      return index;
    }
  }

  return -1;
}

function workbookCellRuntimeValue(
  address: string,
  stack: Set<string>
): unknown {
  const normalized =
    address.toUpperCase();

  if (stack.has(normalized)) {
    throw new Error(
      `Circular formula reference: ${normalized}`
    );
  }

  const source =
    cellValues.get(normalized) ?? "";

  if (source === "") {
    return null;
  }

  if (source.startsWith("=")) {
    stack.add(normalized);

    try {
      return evaluateWorkbookFormula(
        source,
        stack
      );
    } finally {
      stack.delete(normalized);
    }
  }

  const numeric =
    Number(source);

  if (
    source.trim() !== "" &&
    Number.isFinite(numeric)
  ) {
    return numeric;
  }

  return source;
}

function workbookRangeRuntimeValue(
  startAddress: string,
  endAddress: string,
  stack: Set<string>
): unknown[][] {
  const start =
    /^([A-Z]+)([1-9]\d*)$/i.exec(
      startAddress
    );

  const end =
    /^([A-Z]+)([1-9]\d*)$/i.exec(
      endAddress
    );

  if (!start || !end) {
    throw new Error(
      `Invalid workbook range: ${startAddress}:${endAddress}`
    );
  }

  const startColumn =
    workbookColumnNumber(start[1]);

  const endColumn =
    workbookColumnNumber(end[1]);

  const startRow =
    Number(start[2]);

  const endRow =
    Number(end[2]);

  const columnLow =
    Math.min(startColumn, endColumn);

  const columnHigh =
    Math.max(startColumn, endColumn);

  const rowLow =
    Math.min(startRow, endRow);

  const rowHigh =
    Math.max(startRow, endRow);

  const values: unknown[][] = [];

  for (
    let row = rowLow;
    row <= rowHigh;
    row++
  ) {
    const rowValues: unknown[] = [];

    for (
      let column = columnLow;
      column <= columnHigh;
      column++
    ) {
      const address =
        `${workbookColumnName(column)}${row}`;

      rowValues.push(
        workbookCellRuntimeValue(
          address,
          stack
        )
      );
    }

    values.push(rowValues);
  }

  return values;
}

function evaluateWorkbookExpression(
  rawSource: string,
  stack: Set<string>
): unknown {
  let source =
    rawSource.trim();

  if (source.startsWith("=")) {
    source =
      source.substring(1).trim();
  }

  if (!source) {
    return null;
  }

  /*
   * Registered function call.
   *
   * Parsing the outer function first means:
   *   SUM(E42*0.725)
   *
   * correctly sends E42*0.725 back through this
   * expression evaluator as the function argument.
   */
  const functionMatch =
    /^([A-Z][A-Z0-9.]*)\((.*)\)$/is.exec(
      source
    );

  if (functionMatch) {
    const name =
      functionMatch[1].toUpperCase();

    const argumentSources =
      splitWorkbookArguments(
        functionMatch[2]
      );

    const args =
      argumentSources.map(
        argument => {
          const value =
            evaluateWorkbookExpression(
              argument,
              stack
            );

          /*
           * XLSX ranges arrive from the workbook bridge as
           * a 2D row/column matrix.
           *
           * Production functions already know how to operate
           * on value collections, but their historical flatten
           * helpers are not uniform. Normalize the workbook
           * boundary once rather than patching individual
           * spreadsheet functions.
           */
          if (Array.isArray(value)) {
            /*
             * XLSX blank cells resolve as null.
             *
             * Normalize true blanks away at the workbook boundary.
             * For SUM ranges, Excel also ignores text cells such as
             * "N/A" while retaining numeric cells.
             *
             * Keep this behavior at the XLSX bridge rather than
             * changing the production SUM implementation globally.
             */
            const material =
              value
                .flat(Infinity)
                .filter(
                  item =>
                    item !== null &&
                    item !== undefined &&
                    item !== ""
                );

            if (name === "SUM") {
              return material.filter(
                item =>
                  typeof item === "number" &&
                  Number.isFinite(item)
              );
            }

            return material;
          }

          return value;
        }
      );

    return evaluateRegisteredFunction(
      name,
      args
    );
  }

  /*
   * Multiplication is the only arithmetic operator
   * required by the current real workbook.
   */
  const multiplyIndex =
    findTopLevelOperator(source, "*");

  if (multiplyIndex >= 0) {
    const left =
      evaluateWorkbookExpression(
        source.slice(0, multiplyIndex),
        stack
      );

    const right =
      evaluateWorkbookExpression(
        source.slice(multiplyIndex + 1),
        stack
      );

    const leftNumber =
      Number(left ?? 0);

    const rightNumber =
      Number(right ?? 0);

    if (
      !Number.isFinite(leftNumber) ||
      !Number.isFinite(rightNumber)
    ) {
      throw new Error(
        `Non-numeric multiplication: ${source}`
      );
    }

    return leftNumber * rightNumber;
  }

  const rangeMatch =
    /^([A-Z]+[1-9]\d*):([A-Z]+[1-9]\d*)$/i.exec(
      source
    );

  if (rangeMatch) {
    return workbookRangeRuntimeValue(
      rangeMatch[1],
      rangeMatch[2],
      stack
    );
  }

  const cellMatch =
    /^[A-Z]+[1-9]\d*$/i.exec(
      source
    );

  if (cellMatch) {
    return workbookCellRuntimeValue(
      source,
      stack
    );
  }

  const numeric =
    Number(source);

  if (
    source !== "" &&
    Number.isFinite(numeric)
  ) {
    return numeric;
  }

  throw new Error(
    `Unsupported workbook expression: ${source}`
  );
}

function evaluateWorkbookFormula(
  source: string,
  stack: Set<string> = new Set()
): unknown {
  return evaluateWorkbookExpression(
    source,
    stack
  );
}

/* ============================================================
   CosmoDoc Bake 046 — XLSX formula number-format mirror

   Formula source:
       =SUM(...)

   Runtime result:
       0

   XLSX numFmt:
       "$"#,##0.00

   Grid display:
       $0.00
   ============================================================ */

function workbookCellNumberFormat(
  address: string
): string | undefined {
  if (!loadedWorkbook) {
    return undefined;
  }

  const worksheet =
    loadedWorkbook.getWorksheet(
      activeSheetName
    );

  if (!worksheet) {
    return undefined;
  }

  const format =
    worksheet.getCell(address).numFmt;

  if (
    typeof format !== "string" ||
    format.trim() === "" ||
    format === "General"
  ) {
    return undefined;
  }

  return format;
}

function workbookFormatDecimalPlaces(
  format: string
): number {
  /*
   * Use the positive-number section of an Excel format.
   * Example:
   *
   *   "$"#,##0.00;[Red]-"$"#,##0.00
   *
   * becomes:
   *
   *   "$"#,##0.00
   */
  const positive =
    format.split(";")[0] ?? format;

  const decimalMatch =
    /\.([0#]+)/.exec(positive);

  return decimalMatch
    ? decimalMatch[1].length
    : 0;
}

function formatWorkbookFormulaResult(
  address: string,
  value: number
): string {
  const format =
    workbookCellNumberFormat(address);

  if (!format) {
    return String(value);
  }

  const positive =
    format.split(";")[0] ?? format;

  const decimals =
    workbookFormatDecimalPlaces(format);

  /*
   * Percentage formats store 0.25 and display 25%.
   */
  if (positive.includes("%")) {
    return (
      (value * 100).toLocaleString(
        undefined,
        {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }
      ) +
      "%"
    );
  }

  /*
   * Currency/accounting-like formats.
   *
   * Preserve the symbol declared by the XLSX rather than
   * assuming every workbook is USD.
   */
  const currencyMatch =
    positive.match(
      /[$€£¥₹]/
    );

  if (currencyMatch) {
    const symbol =
      currencyMatch[0];

    const formatted =
      Math.abs(value).toLocaleString(
        undefined,
        {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
          useGrouping: positive.includes(",")
        }
      );

    return value < 0
      ? `-${symbol}${formatted}`
      : `${symbol}${formatted}`;
  }

  /*
   * Standard decimal / thousands formatting.
   *
   * Examples:
   *   0
   *   0.00
   *   #,##0
   *   #,##0.00
   */
  if (
    /[0#]/.test(positive)
  ) {
    return value.toLocaleString(
      undefined,
      {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: positive.includes(",")
      }
    );
  }

  /*
   * Unknown/custom format:
   * preserve the calculated value rather than inventing
   * presentation semantics.
   */
  return String(value);
}

function workbookDisplayValue(
  address: string,
  source: string
): string {
  if (!source.startsWith("=")) {
    return source;
  }

  try {
    const stack =
      new Set<string>([
        address.toUpperCase()
      ]);

    const result =
      evaluateWorkbookFormula(
        source,
        stack
      );

    if (
      result === null ||
      result === undefined
    ) {
      return "";
    }

    if (
      typeof result === "number" &&
      !Number.isFinite(result)
    ) {
      return "#NUM!";
    }

    if (typeof result === "number") {
      return formatWorkbookFormulaResult(
        address,
        result
      );
    }

    return String(result);

  } catch (error) {
    console.warn(
      `Formula display fallback ${address}`,
      error
    );

    /*
     * Unsupported formulas remain editable and visible
     * rather than destroying workbook source.
     */
    return source;
  }
}

/* ============================================================
   CosmoDoc Bake 047 — native XLSX cell style mirror

   ExcelJS retained workbook remains the style authority.

   Mirrored:
     font
     fill
     borders
     alignment
     wrapText

   Geometry, merges, formulas and numFmt remain independent.
   ============================================================ */

function workbookArgbToCss(
  color: any
): string | undefined {
  if (!color) {
    return undefined;
  }

  if (
    typeof color.argb === "string" &&
    /^[0-9A-F]{8}$/i.test(color.argb)
  ) {
    const argb =
      color.argb.toUpperCase();

    const alpha =
      parseInt(argb.slice(0, 2), 16) / 255;

    const red =
      parseInt(argb.slice(2, 4), 16);

    const green =
      parseInt(argb.slice(4, 6), 16);

    const blue =
      parseInt(argb.slice(6, 8), 16);

    if (alpha >= 0.999) {
      return `rgb(${red}, ${green}, ${blue})`;
    }

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  return undefined;
}

function workbookBorderStyleCss(
  style: string | undefined
): string {
  switch (style) {
    case "hair":
      return "1px solid";

    case "thin":
      return "1px solid";

    case "medium":
      return "2px solid";

    case "thick":
      return "3px solid";

    case "double":
      return "3px double";

    case "dotted":
      return "1px dotted";

    case "dashed":
      return "1px dashed";

    case "dashDot":
    case "dashDotDot":
      return "1px dashed";

    case "mediumDashed":
    case "mediumDashDot":
    case "mediumDashDotDot":
      return "2px dashed";

    default:
      return "1px solid";
  }
}

function workbookBorderSideCss(
  side: any
): string | undefined {
  if (!side?.style) {
    return undefined;
  }

  const color =
    workbookArgbToCss(side.color) ??
    "currentColor";

  return `${workbookBorderStyleCss(side.style)} ${color}`;
}

function workbookCellStyleCss(
  address: string
): string {
  if (!loadedWorkbook) {
    return "";
  }

  const worksheet =
    loadedWorkbook.getWorksheet(
      activeSheetName
    );

  if (!worksheet) {
    return "";
  }

  const cell =
    worksheet.getCell(address);

  const css: string[] = [];

  const font =
    cell.font as any;

  if (font) {
    if (
      typeof font.name === "string" &&
      font.name.trim() !== ""
    ) {
      css.push(
        `font-family:${JSON.stringify(font.name)}`
      );
    }

    if (
      typeof font.size === "number" &&
      Number.isFinite(font.size)
    ) {
      css.push(
        `font-size:${font.size}pt`
      );
    }

    if (font.bold === true) {
      css.push("font-weight:700");
    }

    if (font.italic === true) {
      css.push("font-style:italic");
    }

    if (font.underline) {
      css.push("text-decoration:underline");
    }

    const fontColor =
      workbookArgbToCss(font.color);

    if (fontColor) {
      css.push(`color:${fontColor}`);
    }
  }

  const fill =
    cell.fill as any;

  if (
    fill?.type === "pattern" &&
    fill.pattern === "solid"
  ) {
    const fillColor =
      workbookArgbToCss(
        fill.fgColor
      );

    if (fillColor) {
      css.push(
        `background-color:${fillColor}`
      );
    }
  }

  const border =
    cell.border as any;

  if (border) {
    const top =
      workbookBorderSideCss(border.top);

    const right =
      workbookBorderSideCss(border.right);

    const bottom =
      workbookBorderSideCss(border.bottom);

    const left =
      workbookBorderSideCss(border.left);

    if (top) {
      css.push(`border-top:${top}`);
    }

    if (right) {
      css.push(`border-right:${right}`);
    }

    if (bottom) {
      css.push(`border-bottom:${bottom}`);
    }

    if (left) {
      css.push(`border-left:${left}`);
    }
  }

  const alignment =
    cell.alignment as any;

  if (alignment) {
    switch (alignment.horizontal) {
      case "left":
        css.push("text-align:left");
        break;

      case "center":
      case "centerContinuous":
        css.push("text-align:center");
        break;

      case "right":
        css.push("text-align:right");
        break;

      case "justify":
      case "distributed":
        css.push("text-align:justify");
        break;
    }

    switch (alignment.vertical) {
      case "top":
        css.push("align-items:flex-start");
        break;

      case "middle":
        css.push("align-items:center");
        break;

      case "bottom":
        css.push("align-items:flex-end");
        break;

      case "justify":
      case "distributed":
        css.push("align-items:center");
        break;
    }

    if (alignment.wrapText === true) {
      css.push("white-space:normal");
      css.push("overflow-wrap:anywhere");
    }

    if (
      typeof alignment.indent === "number" &&
      alignment.indent > 0
    ) {
      css.push(
        `padding-left:${8 + alignment.indent * 12}px`
      );
    }
  }

  return css.join(";");
}

function renderGrid(): string {
  const mergeLookup =
    buildWorksheetMergeLookup();

  let html = `
    <div
      class="corner"
      style="grid-column: 1; grid-row: 1;"
    ></div>
  `;

  for (let col = 0; col < COLS; col++) {
    html += `
      <div
        class="column-header"
        style="
          grid-column: ${col + 2};
          grid-row: 1;
        "
      >
        ${columnName(col)}
      </div>
    `;
  }

  for (let row = 1; row <= ROWS; row++) {
    html += `
      <div
        class="row-header"
        style="
          grid-column: 1;
          grid-row: ${row + 1};
        "
      >
        ${row}
      </div>
    `;

    for (let col = 0; col < COLS; col++) {
      const id = `${columnName(col)}${row}`;
      const value = cellValues.get(id) ?? "";
      const displayValue =
        workbookDisplayValue(id, value);

      const cellStyle =
        workbookCellStyleCss(id);
      const merge =
        mergeLookup.get(id);

      if (
        merge &&
        merge.master !== id
      ) {
        continue;
      }

      const gridColumn =
        merge
          ? `${merge.startColumn + 1} / ${merge.endColumn + 2}`
          : `${col + 2}`;

      const gridRow =
        merge
          ? `${merge.startRow + 1} / ${merge.endRow + 2}`
          : `${row + 1}`;

      html += `
        <div
          class="cell${merge ? " merged-cell" : ""}"
          data-cell="${id}"
          tabindex="0"
          style="
            grid-column: ${gridColumn};
            grid-row: ${gridRow};
      ${cellStyle}
          "
        >
          ${escapeHtml(displayValue)}
        </div>
      `;
    }
  }

  return html;
}

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="cosmic-shell">

    <header class="topbar">
      <div>
        <div class="eyebrow">MUSEUM // RE-CODED TOOLS</div>
        <h1>CosmoDoc</h1>
      </div>

      <div class="top-actions">
        <button id="openButton">Open XLSX</button>
        <button id="saveButton">Save</button>

        <div class="theme-picker" id="themePicker">
  <button
  id="themeButton"
  type="button"
  aria-haspopup="menu"
  aria-expanded="false"
>
  <span id="themeButtonLabel">Cosmic</span>
  <span class="theme-caret" aria-hidden="true">&#9662;</span>
</button>

  <div
  id="themeMenu"
  class="theme-menu"
  role="menu"
  hidden
>
  <button type="button" class="theme-option active" data-theme="cosmic">Cosmic</button>
  <button type="button" class="theme-option" data-theme="beach">Beach</button>
  <button type="button" class="theme-option" data-theme="jungle">Jungle</button>
  <button type="button" class="theme-option" data-theme="snowy">Snowy</button>
  <button type="button" class="theme-option" data-theme="lava">Lava</button>
  <button type="button" class="theme-option" data-theme="fractal">Fractal</button>
  <button type="button" class="theme-option" data-theme="music">Music</button>
  <button type="button" class="theme-option" data-theme="donut">Donut</button>
  <button type="button" class="theme-option" data-theme="candyland">Candyland</button>
  <button type="button" class="theme-option" data-theme="void">Void</button>
  <button type="button" class="theme-option" data-theme="starry">Starry</button>
  <button type="button" class="theme-option" data-theme="nautical">Nautical</button>
  <button type="button" class="theme-option" data-theme="mystical">Mystical</button>
  <button type="button" class="theme-option" data-theme="ancient">Ancient</button>
</div>
</div>
      </div>
    </header>

    <section class="workbook-bar">
      <span class="workbook-dot"></span>
      <strong id="workbookName">Untitled.xlsx</strong>
      <span id="dirtyState" class="dirty-state">LOCAL REALITY</span>
    </section>

    <section class="formula-bar">
      <div id="cellName" class="cell-name">A1</div>
      <div class="fx">fx</div>

      <input
        id="formulaInput"
        autocomplete="off"
        placeholder="Enter a value..."
      />
    </section>

    <main class="sheet-stage">
      <div id="grid" class="grid">
        ${renderGrid()}
      </div>
    </main>

    <footer class="statusbar">
      <div id="sheetTabs" class="sheet-tabs">
        <button id="sheetTab" class="sheet-tab active">
          Sheet1
        </button>
        <button class="add-sheet">+</button>
      </div>

      <div id="statusText">
        READY // A1
      </div>
    </footer>

  </div>
`;

const grid =
  document.querySelector<HTMLDivElement>("#grid")!;

const formulaInput =
  document.querySelector<HTMLInputElement>("#formulaInput")!;

const cellName =
  document.querySelector<HTMLDivElement>("#cellName")!;

const statusText =
  document.querySelector<HTMLDivElement>("#statusText")!;

const workbookName =
  document.querySelector<HTMLElement>("#workbookName")!;

const dirtyState =
  document.querySelector<HTMLElement>("#dirtyState")!;


const themePicker =
  document.querySelector<HTMLDivElement>("#themePicker")!;

const themeButton =
  document.querySelector<HTMLButtonElement>("#themeButton")!;

const themeButtonLabel =
  document.querySelector<HTMLSpanElement>("#themeButtonLabel")!;

const themeMenu =
  document.querySelector<HTMLDivElement>("#themeMenu")!;

const themeOptions =
  Array.from(
    document.querySelectorAll<HTMLButtonElement>(".theme-option")
  );

/*
 * COSMICSHEET // ASCII-SAFE THEME CATALOG
 *
 * Emoji are represented as JavaScript Unicode escapes.
 * main.ts therefore does not depend on PowerShell preserving
 * literal emoji bytes during future source mutations.
 */
const themeLabels: Record<string, string> = {
  cosmic:    "\u{1FA90} Cosmic",
  beach:     "\u{1F334} Beach",
  jungle:    "\u{1F33F} Jungle",
  snowy:     "\u2744\uFE0F Snowy",
  lava:      "\u{1F30B} Lava",
  fractal:   "\u{1F300} Fractal",
  music:     "\u{1F3B5} Music",
  donut:     "\u{1F369} Donut",
  candyland: "\u{1F36D} Candyland",
  void:      "\u26AB Void",
  starry:    "\u2728 Starry",
  nautical:  "\u2693 Nautical",
  mystical:  "\u{1F52E} Mystical",
  ancient:   "\u{1F3DB}\uFE0F Ancient"
};

themeOptions.forEach((option) => {
  const theme = option.dataset.theme;

  if (!theme) {
    return;
  }

  const label = themeLabels[theme];

  if (!label) {
    return;
  }

  option.textContent = label;
});

const currentTheme =
  document.body.dataset.theme ?? "cosmic";

themeButtonLabel.textContent =
  themeLabels[currentTheme] ?? themeLabels.cosmic;

/* ============================================================
   CosmoDoc Bake 049RR — interactive worksheet images
   ============================================================ */

interface WorksheetPixelCoordinate {
  column: number;
  row: number;
}

function worksheetImageCoordinateFromPixels(
  x: number,
  y: number
): WorksheetPixelCoordinate {
  let remainingX = Math.max(0, x);
  let column = 0;

  for (let index = 1; index <= COLS; index++) {
    const width =
      columnWidths.get(index) ??
      DEFAULT_COLUMN_WIDTH;

    if (remainingX <= width) {
      column =
        (index - 1) +
        remainingX / width;
      break;
    }

    remainingX -= width;
    column = index;
  }

  let remainingY = Math.max(0, y);
  let row = 0;

  for (let index = 1; index <= ROWS; index++) {
    const height =
      rowHeights.get(index) ??
      DEFAULT_ROW_HEIGHT;

    if (remainingY <= height) {
      row =
        (index - 1) +
        remainingY / height;
      break;
    }

    remainingY -= height;
    row = index;
  }

  return { column, row };
}

function updateWorksheetImageAnchor(
  media: any,
  left: number,
  top: number,
  width: number,
  height: number
): void {
  const range = media?.range as any;

  if (!range?.tl) return;

  const topLeft =
    worksheetImageCoordinateFromPixels(
      left,
      top
    );

  range.tl.col = topLeft.column;
  range.tl.row = topLeft.row;

  if (range.ext) {
    range.ext.width =
      Math.max(48, width);

    range.ext.height =
      Math.max(48, height);

    return;
  }

  if (range.br) {
    const bottomRight =
      worksheetImageCoordinateFromPixels(
        left + width,
        top + height
      );

    range.br.col = bottomRight.column;
    range.br.row = bottomRight.row;
  }
}

function installWorksheetImageInteractions(): void {
  if (!loadedWorkbook) return;

  const worksheet =
    loadedWorkbook.getWorksheet(
      activeSheetName
    );

  if (!worksheet) return;

  const media = worksheet.getImages();

  const images =
    Array.from(
      document.querySelectorAll<HTMLImageElement>(
        ".worksheet-image"
      )
    );

  images.forEach((image, index) => {
    if (
      image.dataset.cosmoInteractive ===
      "true"
    ) {
      return;
    }

    const imageMedia = media[index] as any;
    if (!imageMedia) return;

    const layer = image.parentElement;
    if (!layer) return;

    image.dataset.cosmoInteractive = "true";
    image.classList.add("worksheet-image-interactive");
    image.draggable = false;

    /*
     * CosmoDoc Bake 055
     *
     * The rendered image already owns the exact ExcelJS
     * worksheet-media object through imageMedia.
     *
     * Give the image keyboard focus so Delete / Backspace can
     * remove that exact worksheet image without inventing a
     * second selection system.
     */
    image.tabIndex = 0;

    image.addEventListener(
      "keydown",
      event => {
        if (
          event.key !== "Delete" &&
          event.key !== "Backspace"
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        /*
         * ExcelJS exposes worksheet images for reading but does
         * not provide a public removeImage() counterpart.
         *
         * _media is therefore the retained worksheet media
         * collection that worksheet.getImages() reflects.
         *
         * Locate by object identity rather than captured index so
         * deletion remains correct after earlier images disappear.
         */
        const worksheetMedia =
          (worksheet as any)._media as any[];

        if (!Array.isArray(worksheetMedia)) {
          throw new Error(
            "Worksheet media collection unavailable."
          );
        }

        const mediaIndex =
          worksheetMedia.indexOf(imageMedia);

        if (mediaIndex < 0) {
          throw new Error(
            "Selected worksheet image was not found."
          );
        }

        worksheetMedia.splice(mediaIndex, 1);

        clearWorksheetImageUrls();
        renderWorksheetImages();
        installWorksheetImageInteractions();

        dirtyState.textContent =
          "MODIFIED";

        statusText.textContent =
          `IMAGE DELETED // ${activeSheetName}`;
      }
    );

    const handle =
      document.createElement("div");

    handle.className =
      "worksheet-image-resize-handle";

    handle.title =
      "Drag to resize image";

    layer.appendChild(handle);

    const syncHandle = (): void => {
      handle.style.left =
        `${image.offsetLeft +
           image.offsetWidth - 7}px`;

      handle.style.top =
        `${image.offsetTop +
           image.offsetHeight - 7}px`;
    };

    const selectImage = (): void => {
      document
        .querySelectorAll(
          ".worksheet-image-selected"
        )
        .forEach(element =>
          element.classList.remove(
            "worksheet-image-selected"
          )
        );

      document
        .querySelectorAll(
          ".worksheet-image-resize-handle.active"
        )
        .forEach(element =>
          element.classList.remove("active")
        );

      image.classList.add(
        "worksheet-image-selected"
      );

      /*
       * Selection and keyboard authority are now the same thing.
       * preventScroll avoids jumping the worksheet when clicked.
       */
      image.focus({
        preventScroll: true
      });

      handle.classList.add("active");
      syncHandle();
    };

    syncHandle();

    image.addEventListener(
      "click",
      event => {
        event.stopPropagation();
        selectImage();
      }
    );

    image.addEventListener(
      "pointerdown",
      event => {
        if (event.button !== 0) return;

        event.preventDefault();
        event.stopPropagation();

        selectImage();

        const startPointerX =
          event.clientX;

        const startPointerY =
          event.clientY;

        const startLeft =
          image.offsetLeft;

        const startTop =
          image.offsetTop;

        const width =
          image.offsetWidth;

        const height =
          image.offsetHeight;

        image.setPointerCapture(
          event.pointerId
        );

        image.classList.add(
          "worksheet-image-dragging"
        );

        const onMove =
          (moveEvent: PointerEvent): void => {
            const left =
              Math.max(
                0,
                startLeft +
                moveEvent.clientX -
                startPointerX
              );

            const top =
              Math.max(
                0,
                startTop +
                moveEvent.clientY -
                startPointerY
              );

            image.style.left = `${left}px`;
            image.style.top = `${top}px`;

            syncHandle();
          };

        const finish =
          (finishEvent: PointerEvent): void => {
            image.removeEventListener(
              "pointermove",
              onMove
            );

            image.removeEventListener(
              "pointerup",
              finish
            );

            image.removeEventListener(
              "pointercancel",
              finish
            );

            image.classList.remove(
              "worksheet-image-dragging"
            );

            try {
              image.releasePointerCapture(
                finishEvent.pointerId
              );
            } catch {}

            updateWorksheetImageAnchor(
              imageMedia,
              image.offsetLeft,
              image.offsetTop,
              width,
              height
            );

            dirtyState.textContent =
              "MODIFIED";

            statusText.textContent =
              `IMAGE MOVED // ${activeSheetName}`;
          };

        image.addEventListener(
          "pointermove",
          onMove
        );

        image.addEventListener(
          "pointerup",
          finish
        );

        image.addEventListener(
          "pointercancel",
          finish
        );
      }
    );

    handle.addEventListener(
      "pointerdown",
      event => {
        if (event.button !== 0) return;

        event.preventDefault();
        event.stopPropagation();

        selectImage();

        const startPointerX =
          event.clientX;

        const startPointerY =
          event.clientY;

        const startWidth =
          image.offsetWidth;

        const startHeight =
          image.offsetHeight;

        const aspect =
          startHeight > 0
            ? startWidth / startHeight
            : 1;

        handle.setPointerCapture(
          event.pointerId
        );

        image.classList.add(
          "worksheet-image-resizing"
        );

        const onMove =
          (moveEvent: PointerEvent): void => {
            let width =
              Math.max(
                48,
                startWidth +
                moveEvent.clientX -
                startPointerX
              );

            let height =
              Math.max(
                48,
                startHeight +
                moveEvent.clientY -
                startPointerY
              );

            if (moveEvent.shiftKey) {
              if (
                Math.abs(
                  moveEvent.clientX -
                  startPointerX
                ) >=
                Math.abs(
                  moveEvent.clientY -
                  startPointerY
                )
              ) {
                height = width / aspect;
              } else {
                width = height * aspect;
              }
            }

            image.style.width = `${width}px`;
            image.style.height = `${height}px`;

            syncHandle();
          };

        const finish =
          (finishEvent: PointerEvent): void => {
            handle.removeEventListener(
              "pointermove",
              onMove
            );

            handle.removeEventListener(
              "pointerup",
              finish
            );

            handle.removeEventListener(
              "pointercancel",
              finish
            );

            image.classList.remove(
              "worksheet-image-resizing"
            );

            try {
              handle.releasePointerCapture(
                finishEvent.pointerId
              );
            } catch {}

            updateWorksheetImageAnchor(
              imageMedia,
              image.offsetLeft,
              image.offsetTop,
              image.offsetWidth,
              image.offsetHeight
            );

            dirtyState.textContent =
              "MODIFIED";

            statusText.textContent =
              `IMAGE RESIZED // ${activeSheetName}`;
          };

        handle.addEventListener(
          "pointermove",
          onMove
        );

        handle.addEventListener(
          "pointerup",
          finish
        );

        handle.addEventListener(
          "pointercancel",
          finish
        );
      }
    );
  });
}

function refreshGrid(): void {
  grid.innerHTML = renderGrid();
  applyWorkbookGeometry();
  installColumnResizeHandles();
  selectCell(activeCell);
  renderWorksheetImages();
  installWorksheetImageInteractions();
}

function selectCell(id: string): void {
  document
    .querySelectorAll(".cell.selected")
    .forEach((cell) => cell.classList.remove("selected"));

  const target =
    document.querySelector<HTMLDivElement>(
      `[data-cell="${id}"]`
    );

  if (!target) {
    return;
  }

  activeCell = id;
  target.classList.add("selected");

  cellName.textContent = id;
  formulaInput.value = cellValues.get(id) ?? "";
  statusText.textContent = `READY // ${id}`;
}

grid.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const cell = target.closest<HTMLDivElement>(".cell");

  if (!cell?.dataset.cell) {
    return;
  }

  selectCell(cell.dataset.cell);
});

grid.addEventListener("dblclick", (event) => {
  const target = event.target as HTMLElement;
  const cell = target.closest<HTMLDivElement>(".cell");

  if (!cell?.dataset.cell) {
    return;
  }

  const id = cell.dataset.cell;
  const originalValue = cellValues.get(id) ?? "";

  selectCell(id);

  cell.contentEditable = "true";
  cell.classList.add("editing");
  cell.textContent = originalValue;

  cell.focus();

  const selection = window.getSelection();
  const range = document.createRange();

  range.selectNodeContents(cell);
  range.collapse(false);

  selection?.removeAllRanges();
  selection?.addRange(range);

  const finishEdit = (commit: boolean) => {
    const newValue = commit
      ? (cell.textContent ?? "")
      : originalValue;

    cell.contentEditable = "false";
    cell.classList.remove("editing");

    cellValues.set(id, newValue);
    cell.textContent = newValue;

    formulaInput.value = newValue;

    dirtyState.textContent = "MUTATED";
    statusText.textContent = `EDITED // ${id}`;


  };

  cell.addEventListener(
    "keydown",
    (keyEvent) => {
      if (keyEvent.key === "Enter") {
        keyEvent.preventDefault();
        finishEdit(true);
      }

      if (keyEvent.key === "Escape") {
        keyEvent.preventDefault();
        finishEdit(false);
      }
    },
    { once: false }
  );

  cell.addEventListener(
    "blur",
    () => finishEdit(true),
    { once: true }
  );
});

formulaInput.addEventListener("input", () => {
  const value = formulaInput.value;

  cellValues.set(activeCell, value);

  const cell =
    document.querySelector<HTMLDivElement>(
      `[data-cell="${activeCell}"]`
    );

  if (!cell) {
    return;
  }

  cell.textContent = value;

  dirtyState.textContent = "MUTATED";
  statusText.textContent = `EDITED // ${activeCell}`;
});

function closeThemeMenu(): void {
  themeMenu.hidden = true;
  themeButton.setAttribute("aria-expanded", "false");
  themePicker.classList.remove("open");
}

function openThemeMenu(): void {
  themeMenu.hidden = false;
  themeButton.setAttribute("aria-expanded", "true");
  themePicker.classList.add("open");
}

function applyTheme(value: string): void {
  document.body.dataset.theme = value;

  themeButtonLabel.textContent =
    themeLabels[value] ?? themeLabels.cosmic;

  themeOptions.forEach((option) => {
    option.classList.toggle(
      "active",
      option.dataset.theme === value
    );
  });

  closeThemeMenu();
}

themeButton.addEventListener("click", (event) => {
  event.stopPropagation();

  if (themeMenu.hidden) {
    openThemeMenu();
    return;
  }

  closeThemeMenu();
});

themeOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const value = option.dataset.theme ?? "cosmic";
    applyTheme(value);
  });
});

document.addEventListener("click", (event) => {
  const target = event.target as Node;

  if (!themePicker.contains(target)) {
    closeThemeMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeThemeMenu();
  }
});

function captureCurrentSheetState(): void {
  if (!activeSheetName) return;

  sheetStates.set(activeSheetName, {
    name: activeSheetName,
    cellValues,
    columnWidths,
    rowHeights
  });
}

function renderSheetTabs(): void {
  const host =
    document.querySelector<HTMLDivElement>("#sheetTabs");

  if (!host) return;

  host.innerHTML = "";

  for (const state of sheetStates.values()) {
    const button =
      document.createElement("button");

    button.className =
      state.name === activeSheetName
        ? "sheet-tab active"
        : "sheet-tab";

    button.textContent = state.name;

    button.addEventListener("click", () => {
      captureCurrentSheetState();
      activateSheet(state.name);
    });

    host.appendChild(button);
  }

  const add =
    document.createElement("button");

  add.className = "add-sheet";
  add.textContent = "+";
  add.title = "Add worksheet (coming next)";

  host.appendChild(add);
}

function activateSheet(name: string): void {
  const state = sheetStates.get(name);

  if (!state) {
    throw new Error(
      `Unknown worksheet: ${name}`
    );
  }

  activeSheetName = name;
  cellValues = state.cellValues;
  columnWidths = state.columnWidths;
  rowHeights = state.rowHeights;

  activeCell = "A1";

  refreshGrid();
  autoFitImportedColumns();
  renderSheetTabs();

  statusText.textContent =
    `XLSX ONLINE // ${activeSheetName}`;
}

function importWorksheetState(
  worksheet: ExcelJS.Worksheet
): SheetState {
  const values =
    new Map<string, string>();

  const widths =
    new Map<number, number>();

  const heights =
    new Map<number, number>();

  for (let col = 1; col <= COLS; col++) {
    const width =
      worksheet.getColumn(col).width;

    if (typeof width === "number") {
      widths.set(
        col,
        excelColumnWidthToPixels(width)
      );
    }
  }

  for (let row = 1; row <= ROWS; row++) {
    const height =
      worksheet.getRow(row).height;

    if (typeof height === "number") {
      heights.set(
        row,
        excelRowHeightToPixels(height)
      );
    }
  }

  worksheet.eachRow(
    { includeEmpty: false },
    (row, rowNumber) => {
      row.eachCell(
        { includeEmpty: false },
        (cell, colNumber) => {
          const id =
            `${columnName(colNumber - 1)}${rowNumber}`;

          let value = "";

          if (
            typeof cell.value === "object" &&
            cell.value !== null &&
            "formula" in cell.value
          ) {
            value =
              `=${String(cell.value.formula)}`;
          } else if (cell.value instanceof Date) {
            /*
             * ExcelJS exposes XLSX dates as JavaScript Date objects.
             *
             * Their UTC calendar components represent the workbook
             * date. Stringifying through the local timezone can move
             * midnight XLSX dates into the previous local day.
             *
             * Keep this bridge intentionally small: the current real
             * workbook uses short calendar dates.
             */
            value =
              `${cell.value.getUTCMonth() + 1}/` +
              `${cell.value.getUTCDate()}/` +
              `${cell.value.getUTCFullYear()}`;
          } else if (cell.value !== null) {
            value =
              String(cell.text ?? cell.value);
          }

          values.set(id,value);
        }
      );
    }
  );

  return {
    name: worksheet.name,
    cellValues: values,
    columnWidths: widths,
    rowHeights: heights
  };
}

function writeSheetStateToWorksheet(
  state: SheetState,
  worksheet: ExcelJS.Worksheet
): void {
  for (
    const [column,width] of state.columnWidths
  ) {
    worksheet.getColumn(column).width =
      Math.max(
        1,
        (width - 12) / 7
      );
  }

  for (const [id,value] of state.cellValues) {
    if (value.startsWith("=")) {
      worksheet.getCell(id).value = {
        formula: value.substring(1)
      };
    } else {
      worksheet.getCell(id).value = value;
    }
  }
}
async function loadWorkbook(path: string): Promise<void> {
  try {
    statusText.textContent = "READING XLSX...";

    const bytes = await readFile(path);

    const workbook =
      new ExcelJS.Workbook();

    await workbook.xlsx.load(bytes);

    if (!workbook.worksheets.length) {
      throw new Error(
        "Workbook contains no worksheets."
      );
    }

    clearWorksheetImageUrls();
    loadedWorkbook = workbook;
    sheetStates.clear();

    for (
      const worksheet of workbook.worksheets
    ) {
      const state =
        importWorksheetState(worksheet);

      sheetStates.set(
        state.name,
        state
      );
    }

    const first =
      workbook.worksheets[0];

    const firstState =
      sheetStates.get(first.name);

    if (!firstState) {
      throw new Error(
        "Failed to import first worksheet."
      );
    }

    currentPath = path;

    currentFileName =
      path.split(/[\\/]/).pop() ??
      "Workbook.xlsx";

    workbookName.textContent =
      currentFileName;

    activeSheetName =
      first.name;

    cellValues =
      firstState.cellValues;

    columnWidths =
      firstState.columnWidths;

    rowHeights =
      firstState.rowHeights;

    activeCell = "A1";

    refreshGrid();
    autoFitImportedColumns();
    renderSheetTabs();

    dirtyState.textContent = "LOADED";

    statusText.textContent =
      `XLSX ONLINE // ${activeSheetName} // ${workbook.worksheets.length} SHEETS`;
  } catch (error) {
    console.error(error);

    dirtyState.textContent = "FAULT";

    statusText.textContent =
      `OPEN FAILED // ${String(error)}`;
  }
}

/* ============================================================
   CosmoDoc Bake 048 — worksheet photo import

   Flow:
     selected cell
       -> image picker
       -> ExcelJS workbook image
       -> active worksheet anchor
       -> existing image renderer
       -> ordinary XLSX save path

   The retained ExcelJS workbook remains media authority.
   ============================================================ */

function worksheetImageExtension(
  path: string
): "png" | "jpeg" {
  const extension =
    path
      .split(".")
      .pop()
      ?.toLowerCase();

  if (extension === "png") {
    return "png";
  }

  if (
    extension === "jpg" ||
    extension === "jpeg"
  ) {
    return "jpeg";
  }

  throw new Error(
    `Unsupported image type: ${extension ?? "unknown"}`
  );
}

function bytesToBase64(
  bytes: Uint8Array
): string {
  /*
   * Avoid spreading a large Uint8Array into
   * String.fromCharCode(), which can blow the
   * browser argument stack on real photos.
   */
  const chunkSize = 0x8000;
  let binary = "";

  for (
    let offset = 0;
    offset < bytes.length;
    offset += chunkSize
  ) {
    const chunk =
      bytes.subarray(
        offset,
        Math.min(
          offset + chunkSize,
          bytes.length
        )
      );

    binary +=
      String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function activeCellImageAnchor(): {
  row: number;
  column: number;
} {
  const match =
    /^([A-Z]+)([1-9]\d*)$/i.exec(
      activeCell
    );

  if (!match) {
    throw new Error(
      `Invalid active cell: ${activeCell}`
    );
  }

  return {
    /*
     * ExcelJS image anchors are zero-based.
     */
    row: Number(match[2]) - 1,
    column:
      workbookColumnNumber(match[1]) - 1
  };
}

async function importPhotoIntoWorksheet():
  Promise<void> {
  if (!loadedWorkbook) {
    throw new Error(
      "Open or create a workbook before importing a photo."
    );
  }

  const worksheet =
    loadedWorkbook.getWorksheet(
      activeSheetName
    );

  if (!worksheet) {
    throw new Error(
      `Worksheet not found: ${activeSheetName}`
    );
  }

  statusText.textContent =
    "SELECTING PHOTO...";

  const selected =
    await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: "Worksheet Image",
          extensions: [
            "png",
            "jpg",
            "jpeg"
          ]
        }
      ]
    });

  if (!selected) {
    statusText.textContent =
      "PHOTO IMPORT CANCELLED";

    return;
  }

  const path =
    selected as string;

  const extension =
    worksheetImageExtension(path);

  statusText.textContent =
    "IMPORTING PHOTO...";

  const bytes =
    await readFile(path);

  const base64 =
    bytesToBase64(bytes);

  const imageId =
    loadedWorkbook.addImage({
      base64:
        `data:image/${extension};base64,${base64}`,
      extension
    });

  const anchor =
    activeCellImageAnchor();

  /*
   * First useful placement contract:
   * anchor at the selected cell with a predictable
   * 320x240 worksheet footprint.
   *
   * Resize/dragging can come later without changing
   * the persistence architecture.
   */
  worksheet.addImage(
    imageId,
    {
      tl: {
        col: anchor.column,
        row: anchor.row
      },
      ext: {
        width: 320,
        height: 240
      },
      editAs: "oneCell"
    }
  );

  clearWorksheetImageUrls();
  renderWorksheetImages();
  installWorksheetImageInteractions();

  dirtyState.textContent =
    "MODIFIED";

  statusText.textContent =
    `PHOTO IMPORTED // ${activeSheetName} // ${activeCell}`;
}

function installPhotoImportButton(): void {
  if (
    document.querySelector(
      "#photoImportButton"
    )
  ) {
    return;
  }

  const saveButton =
    document.querySelector<HTMLButtonElement>(
      "#saveButton"
    );

  if (
    !saveButton ||
    !saveButton.parentElement
  ) {
    console.warn(
      "Photo import button host not found."
    );

    return;
  }

  /*
   * Clone the existing Save control so the button
   * automatically inherits CosmoDoc's current UI
   * structure/classes without adding CSS bureaucracy.
   */
  const button =
    saveButton.cloneNode(
      true
    ) as HTMLButtonElement;

  button.id =
    "photoImportButton";

  button.textContent =
    "IMPORT PHOTO";

  button.title =
    "Import photo at selected cell";

  button.removeAttribute(
    "disabled"
  );

  button.addEventListener(
    "click",
    async () => {
      try {
        await importPhotoIntoWorksheet();
      } catch (error) {
        console.error(error);

        dirtyState.textContent =
          "FAULT";

        statusText.textContent =
          `PHOTO IMPORT FAILED // ${String(error)}`;
      }
    }
  );

  saveButton.before(button);
}

installPhotoImportButton();

document
  .querySelector("#openButton")
  ?.addEventListener("click", async () => {

    try {
      statusText.textContent = "OPENING REALITY...";

      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "Excel Workbook",
            extensions: ["xlsx"]
          }
        ]
      });

      if (!selected) {
        statusText.textContent = "OPEN CANCELLED";
        return;
      }

      await loadWorkbook(selected as string);

    } catch (error) {
      console.error(error);

      dirtyState.textContent = "FAULT";

      statusText.textContent =
        `OPEN FAILED // ${String(error)}`;
    }
  });
document
  .querySelector("#saveButton")
  ?.addEventListener("click", async () => {

    try {
      statusText.textContent = "FORGING XLSX...";

      captureCurrentSheetState();

      const workbook =
        loadedWorkbook ??
        new ExcelJS.Workbook();

      if (!loadedWorkbook) {
        for (const state of sheetStates.values()) {
          if (!workbook.getWorksheet(state.name)) {
            workbook.addWorksheet(state.name);
          }
        }

        if (!workbook.worksheets.length) {
          workbook.addWorksheet(activeSheetName);
        }
      }

      for (const state of sheetStates.values()) {
        const worksheet =
          workbook.getWorksheet(state.name) ??
          workbook.addWorksheet(state.name);

        writeSheetStateToWorksheet(
          state,
          worksheet
        );
      }

      const buffer =
        await workbook.xlsx.writeBuffer();

      let targetPath = currentPath;

      if (!targetPath) {
        const selected = await save({
          defaultPath: currentFileName,
          filters: [
            {
              name: "Excel Workbook",
              extensions: ["xlsx"]
            }
          ]
        });

        if (!selected) {
          statusText.textContent = "SAVE CANCELLED";
          return;
        }

        targetPath = selected;
      }

      await writeFile(
        targetPath,
        new Uint8Array(buffer)
      );

      currentPath = targetPath;

      currentFileName =
        targetPath.split(/[\\/]/).pop()
        ?? "Workbook.xlsx";

      workbookName.textContent = currentFileName;

      dirtyState.textContent = "FOSSILIZED";
      statusText.textContent =
        `SAVED // ${currentFileName}`;

    } catch (error) {
      console.error(error);

      dirtyState.textContent = "FAULT";

      statusText.textContent =
        `SAVE FAILED // ${String(error)}`;
    }
  });

invoke<string | null>("startup_xlsx")
  .then(async (startupPath) => {
    if (!startupPath) {
      return;
    }

    await loadWorkbook(startupPath);
  })
  .catch((error) => {
    console.error(error);

    dirtyState.textContent = "FAULT";
    statusText.textContent =
      `STARTUP OPEN FAILED // ${String(error)}`;
  });

selectCell("A1");





