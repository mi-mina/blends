// Published in https://mi-mina.github.io/blends/
// https://mimina.goatcounter.com/

// TODO
// - Añadir textos de ayuda en cada input al pasar el ratón por encima?
// - Posibilidad de darle un nombre custom a cada receta
// - Poder elegir los colores de las esquinas
// - Hacer que se oculte la parte de la izquierda
// - Ver cómo facilitar la creación de grillas de Currie

// - Introducir los diagramas de stuhl de las recetas?
// Stuhl diagram desarrollado por Derek Philip Au en d3.js
// https://derekphilipau.github.io/ceramic-chemistry-visualization/charts/d3.html

import { state } from "./js/state.js";
import { loadMaterials } from "./js/materials.js";
import { roundTo } from "./js/utils.js";
import {
  getLinearData,
  getTriaxialData,
  getBiaxialData,
} from "./js/blendData.js";
import {
  drawLinearBlend,
  drawTriaxialBlend,
  drawBiaxialBlend,
} from "./js/chart.js";
import {
  populateRecipeMaterialSelects,
  renderRecipesTable,
  loadRecipesFromLocalStorage,
  clearAllRecipes,
  clearRecipesBeyondBlendType,
  importRecipes,
  getBlendTypeCornerCount,
  countPopulatedCorners,
} from "./js/recipes.js";
import {
  updateBlendInputs,
  updateRecipeCards,
  showTab,
  applyRecipeCardColors,
  showActionDialog,
} from "./js/ui.js";
import {
  downloadDiagramAsPng,
  downloadRecipesAsCsv,
  exportRecipesAsJson,
} from "./js/download.js";
import { applyStaticTranslations, getLang, setLang, t } from "./js/i18n.js";
import { resortMaterials } from "./js/materials.js";

loadMaterials()
  .then(() => {
    init();
  })
  .catch(error => {
    console.error("Error loading materials.json:", error);
  });

const BLEND_TYPE_LABEL_KEYS = {
  line: "blendTypeLine",
  triaxial: "blendTypeTriaxial",
  biaxial: "blendTypeBiaxial",
};
const CORNER_COUNT_TO_BLEND_TYPE = { 2: "line", 3: "triaxial", 4: "biaxial" };

function init() {
  applyStaticTranslations();
  initLangSwitch();
  applyRecipeCardColors();

  // Restore the previous session's blend type/size/points, if any (falls
  // back to the static HTML defaults, forcing "line", if nothing was saved)
  loadBlendSettings();
  const initialBlendType = document.getElementById("blendType").value;
  updateBlendInputs(initialBlendType);
  updateRecipeCards(initialBlendType);

  // Event listeners for blend type and tab changes
  document.getElementById("blendType").addEventListener("change", event => {
    const blendType = event.target.value;

    // Update blend inputs visibility
    updateBlendInputs(blendType);

    // Update recipe cards visibility
    updateRecipeCards(blendType);

    // Recompute state.blendData for the new blend type before clearing
    // recipes/re-rendering the table below, which both read from it
    drawBlend();

    // Clear any recipe cards this blend type doesn't use, so they don't
    // leak into the recipes table's columns/calculations
    clearRecipesBeyondBlendType(blendType);

    renderRecipesTable();
  });

  document.getElementById("tab-graph").addEventListener("click", function () {
    showTab("graph", drawBlend);
  });
  document.getElementById("tab-recipes").addEventListener("click", function () {
    showTab("recipes");
  });

  // Left/Right switches tabs and moves focus with it, per the ARIA tabs
  // pattern's "roving tabindex" - only 2 tabs exist, so the other one is
  // always just "whichever isn't this button".
  [
    document.getElementById("tab-graph"),
    document.getElementById("tab-recipes"),
  ].forEach(tabButton => {
    tabButton.addEventListener("keydown", event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();

      const other =
        tabButton.id === "tab-graph"
          ? document.getElementById("tab-recipes")
          : document.getElementById("tab-graph");
      other.focus();
      other.click();
    });
  });

  document
    .getElementById("download-png-button")
    .addEventListener("click", downloadDiagramAsPng);

  document
    .getElementById("download-csv-button")
    .addEventListener("click", downloadRecipesAsCsv);

  document
    .getElementById("export-recipes-button")
    .addEventListener("click", exportRecipesAsJson);

  const importInput = document.getElementById("import-recipes-input");
  document
    .getElementById("import-recipes-button")
    .addEventListener("click", () => importInput.click());

  importInput.addEventListener("change", () => {
    const file = importInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      // Reset now so picking the same file again still fires "change".
      importInput.value = "";

      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch {
        parsed = null;
      }
      if (!parsed || typeof parsed.recipes !== "object") {
        alert(t("importInvalidFile"));
        return;
      }

      const blendTypeSelect = document.getElementById("blendType");
      const currentCount = getBlendTypeCornerCount(blendTypeSelect.value);
      const importedCount = countPopulatedCorners(parsed.recipes);
      const currentBlendType = t(BLEND_TYPE_LABEL_KEYS[blendTypeSelect.value]);

      // The file has recipes beyond what the current blend type shows -
      // offer switching to match (keeps them all) alongside importing as
      // is, instead of chaining several confirm() dialogs in a row.
      let message = t("importReplaceWarning");
      const buttons = [{ value: "cancel", label: t("cancelButton") }];
      let target = null;

      if (importedCount > currentCount) {
        target = CORNER_COUNT_TO_BLEND_TYPE[importedCount];
        const targetBlendType = t(BLEND_TYPE_LABEL_KEYS[target]);
        message +=
          "\n\n" +
          t("importBlendTypeMismatch", {
            importedCount,
            currentCount,
            currentBlendType,
            targetBlendType,
          });
        buttons.push({
          value: "keep",
          label: t("importKeepBlendTypeButton", { currentBlendType }),
        });
        buttons.push({
          value: "switch",
          label: t("importSwitchBlendTypeButton", { targetBlendType }),
          primary: true,
        });
      } else {
        buttons.push({
          value: "keep",
          label: t("importConfirmButton"),
          primary: true,
        });
      }

      const choice = await showActionDialog(message, buttons);
      if (choice === "cancel") return;
      if (choice === "switch") {
        blendTypeSelect.value = target;
        blendTypeSelect.dispatchEvent(new Event("change"));
      }

      const droppedRows = importRecipes(parsed.recipes);
      clearRecipesBeyondBlendType(document.getElementById("blendType").value);
      if (droppedRows > 0) {
        alert(t("importDroppedRows", { count: droppedRows }));
      }
    };
    reader.readAsText(file);
  });

  document
    .getElementById("clear-recipes-button")
    .addEventListener("click", () => {
      if (confirm(t("confirmClearRecipes"))) {
        clearAllRecipes();
      }
    });

  // Event listeners for input validation
  document.getElementById("linePoints").addEventListener("input", event => {
    const numberPoints = event.target.value;

    // Check if the value is an integer
    if (!Number.isInteger(Number(numberPoints)) && numberPoints !== "") {
      alert(t("invalidPointsAlert"));
      event.target.value = ""; // Clear the input if invalid
    }
  });

  // Event listener for the "Recalculate" button
  document
    .getElementById("recalculateButton")
    .addEventListener("click", drawBlend);

  // Persist size/points/rows/columns as soon as they change, so they
  // survive a reload even if the user never clicks "Recalcular"
  // (blendType already saves on its own "change" listener above, via
  // drawBlend()).
  BLEND_SETTINGS_FIELDS.filter(id => id !== "blendType").forEach(id => {
    document.getElementById(id).addEventListener("change", saveBlendSettings);
  });

  populateRecipeMaterialSelects();

  // Initial draw on page load
  drawBlend();

  // Restore saved recipe selections now that state.blendData exists
  loadRecipesFromLocalStorage();

  // Saved recipes may include leftovers from a blend type with more
  // corners than the one just restored, so sweep away anything beyond
  // what's currently visible.
  clearRecipesBeyondBlendType(document.getElementById("blendType").value);
}

const BLEND_SETTINGS_KEY = "blends-settings";
const BLEND_SETTINGS_FIELDS = [
  "blendType",
  "size",
  "linePoints",
  "triaxialPoints",
  "biaxialRows",
  "biaxialColumns",
];

/**
 * Saves the current blend type, sample size, and points/rows/columns for
 * every blend type, so they survive a page reload.
 */
function saveBlendSettings() {
  const settings = {};
  BLEND_SETTINGS_FIELDS.forEach(id => {
    settings[id] = document.getElementById(id).value;
  });
  localStorage.setItem(BLEND_SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Restores a previously saved blend type/size/points into their inputs.
 * Leaves the static HTML defaults in place if nothing was saved.
 */
function loadBlendSettings() {
  const saved = localStorage.getItem(BLEND_SETTINGS_KEY);
  if (!saved) return;

  let settings;
  try {
    settings = JSON.parse(saved);
  } catch {
    return;
  }

  BLEND_SETTINGS_FIELDS.forEach(id => {
    if (settings[id] !== undefined)
      document.getElementById(id).value = settings[id];
  });
}

/**
 * Draws the blend chart based on the selected blend type and input values.
 * @description This function retrieves input values, generates blend data, and calls the appropriate draw function.
 */
function drawBlend() {
  saveBlendSettings();

  const testSize = document.getElementById("size").value;
  const blendType = document.getElementById("blendType").value;
  const linePointsInput = document.getElementById("linePoints");
  const triaxialPointsInput = document.getElementById("triaxialPoints");
  const biaxialRowsInput = document.getElementById("biaxialRows");
  const biaxialColumnsInput = document.getElementById("biaxialColumns");

  const increment = document.getElementById("increments")
    ? document.getElementById("increments").value
    : 0;

  let anchor;
  if (blendType === "line") {
    if (!meetsRange(linePointsInput, "labelPoints")) return;
    state.blendData = getLinearData(linePointsInput.value, increment, testSize);
    anchor = drawLinearBlend(state.blendData);
  } else if (blendType === "triaxial") {
    if (!meetsRange(triaxialPointsInput, "labelPoints")) return;
    state.blendData = getTriaxialData(triaxialPointsInput.value, testSize);
    anchor = drawTriaxialBlend(state.blendData);
  } else if (blendType === "biaxial") {
    if (
      !meetsRange(biaxialRowsInput, "labelRows") ||
      !meetsRange(biaxialColumnsInput, "labelColumns")
    )
      return;
    state.blendData = getBiaxialData(
      biaxialRowsInput.value,
      biaxialColumnsInput.value,
      testSize,
    );
    anchor = drawBiaxialBlend(state.blendData);
  }

  document.getElementById("total-points-value").textContent =
    state.blendData.length;

  // Every point's corner percentages sum to 100%, so across the whole
  // diagram each corner ends up needing an equal (symmetric) share of
  // the total ml poured - just the grand total divided by corner count.
  const totalMl = state.blendData.reduce(
    (sum, point) => sum + Object.values(point.ml).reduce((s, ml) => s + ml, 0),
    0,
  );
  const numCorners = Object.keys(state.blendData[0].ml).length;
  const minMlNote = document.getElementById("min-ml-note");
  minMlNote.textContent = t("minTotalMlNote", {
    amount: roundTo(totalMl / numCorners),
  });
  // Pin the note just below the bottom-left-most point (each drawXBlend
  // returns that point's box's bottom-left corner in SVG coordinates,
  // which line up 1:1 with CSS pixels since the SVG has no viewBox).
  minMlNote.style.left = `${anchor.x}px`;
  minMlNote.style.top = `${anchor.y + 8}px`;

  renderRecipesTable();
}

/**
 * Checks an input against its own `min`/`max` attributes. If it fails,
 * shows a warning in the graph panel instead of letting invalid data
 * (e.g. a division by zero producing NaN, or an unreasonably large
 * number of points freezing the page) reach the draw functions.
 * @param {HTMLInputElement} input
 * @param {string} labelKey - i18n key for the plural noun used in the warning message.
 * @returns {boolean}
 */
function meetsRange(input, labelKey) {
  const value = Number(input.value);
  const min = Number(input.min);
  const max = input.max === "" ? Infinity : Number(input.max);

  if (Number.isNaN(value) || value < min || value > max) {
    const range = Number.isFinite(max)
      ? t("rangeExact", { min, max })
      : t("rangeMin", { min });
    document.getElementById("graph").innerHTML =
      `<p class="p-4 text-gray-600">${t("meetsRangeError", { range, label: t(labelKey) })}</p>`;
    return false;
  }
  return true;
}

/**
 * Wires the ES/EN buttons in the banner: highlights the active language
 * and, on click, persists the choice and re-renders every translated
 * piece of the page (static text, material selects/table, diagram).
 */
function initLangSwitch() {
  const buttons = document.querySelectorAll("#lang-switch [data-lang]");

  function updateActiveButton() {
    const lang = getLang();
    buttons.forEach(button => {
      const active = button.dataset.lang === lang;
      button.classList.toggle("bg-white/80", active);
      button.classList.toggle("text-gray-900", active);
      button.classList.toggle("text-gray-900/60", !active);
      button.setAttribute("aria-pressed", active);
    });
  }

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.lang === getLang()) return;

      setLang(button.dataset.lang);
      applyStaticTranslations();
      updateActiveButton();
      resortMaterials();
      populateRecipeMaterialSelects();
      drawBlend();
    });
  });

  updateActiveButton();
}
