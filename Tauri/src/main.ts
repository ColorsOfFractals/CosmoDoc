import "./styles.css";

import ExcelJS from "exceljs";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";

const ROWS = 100;
const COLS = 26;

let activeCell = "A1";
let currentPath: string | null = null;
let currentFileName = "Untitled.xlsx";
let activeSheetName = "Sheet1";

const cellValues = new Map<string, string>();

const columnWidths = new Map<number, number>();
const rowHeights = new Map<number, number>();

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
        <h1>CosmicSheet</h1>
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
      <div class="sheet-tabs">
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

const sheetTab =
  document.querySelector<HTMLButtonElement>("#sheetTab")!;

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

      const path = selected as string;

      statusText.textContent = "READING XLSX...";

      const bytes = await readFile(path);

      const workbook = new ExcelJS.Workbook();

      await workbook.xlsx.load(bytes);

      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error("Workbook contains no worksheets.");
      }

      cellValues.clear();
      columnWidths.clear();
      rowHeights.clear();

      for (let col = 1; col <= COLS; col++) {
        const excelWidth = worksheet.getColumn(col).width;

        if (typeof excelWidth === "number") {
          columnWidths.set(
            col,
            excelColumnWidthToPixels(excelWidth)
          );
        }
      }

      for (let row = 1; row <= ROWS; row++) {
        const excelHeight = worksheet.getRow(row).height;

        if (typeof excelHeight === "number") {
          rowHeights.set(
            row,
            excelRowHeightToPixels(excelHeight)
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

              if (cell.value !== null &&
                  cell.value !== undefined) {

                if (
                  typeof cell.value === "object" &&
                  "formula" in cell.value
                ) {
                  value = `=${cell.value.formula}`;
                } else {
                  value = cell.text;
                }
              }

              cellValues.set(id, value);
            }
          );
        }
      );

      currentPath = path;

      currentFileName =
        path.split(/[\\/]/).pop() ?? "Workbook.xlsx";

      activeSheetName = worksheet.name;

      workbookName.textContent = currentFileName;
      sheetTab.textContent = activeSheetName;

      activeCell = "A1";

      refreshGrid();

      dirtyState.textContent = "LOADED";
      statusText.textContent =
        `XLSX ONLINE // ${activeSheetName}`;

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

      const workbook = new ExcelJS.Workbook();

      const worksheet =
        workbook.addWorksheet(activeSheetName);

      for (const [id, value] of cellValues) {

        if (value.startsWith("=")) {
          worksheet.getCell(id).value = {
            formula: value.substring(1)
          };
        } else {
          worksheet.getCell(id).value = value;
        }
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

selectCell("A1");





