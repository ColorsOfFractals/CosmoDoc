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
    class="theme-button"
    type="button"
    aria-haspopup="true"
    aria-expanded="false"
  >
    <span id="themeButtonIcon" class="theme-icon">🪐</span>
    <span id="themeButtonLabel">Cosmic</span>
    <span class="theme-chevron">⌄</span>
  </button>

  <div
    id="themeMenu"
    class="theme-menu"
    role="menu"
    hidden
  >
    <button type="button" class="theme-option active" data-theme-value="cosmic" data-icon="🪐">Cosmic</button>
    <button type="button" class="theme-option" data-theme-value="beach" data-icon="🌴">Beach</button>
    <button type="button" class="theme-option" data-theme-value="jungle" data-icon="🌿">Jungle</button>
    <button type="button" class="theme-option" data-theme-value="snowy" data-icon="❄️">Snowy</button>
    <button type="button" class="theme-option" data-theme-value="lava" data-icon="🌋">Lava</button>
    <button type="button" class="theme-option" data-theme-value="fractal" data-icon="🌀">Fractal</button>
    <button type="button" class="theme-option" data-theme-value="music" data-icon="🎵">Music</button>
    <button type="button" class="theme-option" data-theme-value="donut" data-icon="🍩">Donut</button>
    <button type="button" class="theme-option" data-theme-value="candyland" data-icon="🍭">Candyland</button>
    <button type="button" class="theme-option" data-theme-value="void" data-icon="◯">Void</button>
    <button type="button" class="theme-option" data-theme-value="starry" data-icon="✨">Starry</button>
    <button type="button" class="theme-option" data-theme-value="nautical" data-icon="⚓">Nautical</button>
    <button type="button" class="theme-option" data-theme-value="mystical" data-icon="🔮">Mystical</button>
    <button type="button" class="theme-option" data-theme-value="ancient" data-icon="🏛️">Ancient</button>
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

const themeButtonIcon =
  document.querySelector<HTMLSpanElement>("#themeButtonIcon")!;

const themeButtonLabel =
  document.querySelector<HTMLSpanElement>("#themeButtonLabel")!;

const themeMenu =
  document.querySelector<HTMLDivElement>("#themeMenu")!;

const themeOptions =
  Array.from(
    document.querySelectorAll<HTMLButtonElement>(".theme-option")
  );

function autosizeColumn(cell: HTMLElement): void {
  const column = Number(cell.style.gridColumn);

  if (!column || column < 2) {
    return;
  }

  const text = cell.textContent ?? "";

  const width = Math.min(
    Math.max(118, text.length * 10 + 28),
    520
  );

  document
    .querySelectorAll<HTMLElement>(
      `.cell[style*="grid-column: ${column};"], .column-header[style*="grid-column: ${column};"]`
    )
    .forEach((element) => {
      element.style.width = `${width}px`;
      element.style.minWidth = `${width}px`;
    });
}

function autosizeLoadedColumns(): void {
  document
    .querySelectorAll<HTMLElement>(".cell")
    .forEach((cell) => {
      if ((cell.textContent ?? "").length > 14) {
        autosizeColumn(cell);
      }
    });
}
function refreshGrid(): void {
  grid.innerHTML = renderGrid();
  selectCell(activeCell);
  autosizeLoadedColumns();
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

    autosizeColumn(cell);
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

function applyTheme(
  value: string,
  label: string,
  icon: string
): void {
  document.body.dataset.theme = value;

  themeButtonLabel.textContent = label;
  themeButtonIcon.textContent = icon;

  themeOptions.forEach((option) => {
    option.classList.toggle(
      "active",
      option.dataset.themeValue === value
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
    const value = option.dataset.themeValue ?? "cosmic";
    const icon = option.dataset.icon ?? "✦";
    const label = option.textContent?.trim() ?? "Cosmic";

    applyTheme(value, label, icon);
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



