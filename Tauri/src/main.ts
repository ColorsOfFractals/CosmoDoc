import "./styles.css";

import ExcelJS from "exceljs";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";

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

function applyWorkbookGeometry(): void {
  for (let col = 0; col < COLS; col++) {
    const gridColumn = col + 2;
    const width = columnWidths.get(col + 1) ?? 118;

    document
      .querySelectorAll<HTMLElement>(
        `.cell[style*="grid-column: ${gridColumn};"], .column-header[style*="grid-column: ${gridColumn};"]`
      )
      .forEach((element) => {
        element.style.width = `${width}px`;
        element.style.minWidth = `${width}px`;
        element.style.maxWidth = `${width}px`;
      });
  }

  for (let row = 1; row <= ROWS; row++) {
    const gridRow = row + 1;
    const height = rowHeights.get(row) ?? 32;

    document
      .querySelectorAll<HTMLElement>(
        `.cell[style*="grid-row: ${gridRow};"], .row-header[style*="grid-row: ${gridRow};"]`
      )
      .forEach((element) => {
        element.style.height = `${height}px`;
        element.style.minHeight = `${height}px`;
      });
  }
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

function renderGrid(): string {
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

      html += `
        <div
          class="cell"
          data-cell="${id}"
          tabindex="0"
          style="
            grid-column: ${col + 2};
            grid-row: ${row + 1};
          "
        >
          ${escapeHtml(value)}
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

function refreshGrid(): void {
  grid.innerHTML = renderGrid();
  applyWorkbookGeometry();
  selectCell(activeCell);
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





