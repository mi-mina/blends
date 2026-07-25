// Published in https://mi-mina.github.io/Blends/
// https://mimina.goatcounter.com/

// TODO
// - Que se pueda descargar tanto el diagrama como las recetas en un formato que luego se pueda cargar de nuevo (por ejemplo, un JSON con los datos de la mezcla y las recetas, o un CSV con las recetas).
// - Banner, la proporción de los espirógrafos no se mantiene al cambiar el tamaño de la ventana, hacer que se mantenga la proporción.

// Improve:
// - Calcular cuántos ml hacen falta de cada esmalte de los extremos
// - Hacer que se oculte la parte de la izquierda
// - Poder elegir los colores de las esquinas

// Recipes:
// - Comprobar que los aditivos se calculan correctamente en las recetas
// - Reordenar las columnas de la tabla para que los aditivos estén al final y no al principio?
// - Complementar el listado de materiales con https://ceramica.name/calculos/aformula
// - Las recetas no se ven bien en pantallas pequeñas, hacer que se vea bien en móviles y tablets

// General:
// - Cambiar la url para que blends se escriba con minúscula

// Stuhl diagram desarrollado por Derek Philip Au en d3.js
// https://derekphilipau.github.io/ceramic-chemistry-visualization/charts/d3.html

import { state } from "./js/state.js";
import { loadMaterials } from "./js/materials.js";
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
} from "./js/recipes.js";
import {
  updateBlendInputs,
  updateRecipeCards,
  showTab,
  applyRecipeCardColors,
} from "./js/ui.js";
import { downloadDiagramAsPng, downloadRecipesAsCsv } from "./js/download.js";
import { applyStaticTranslations, getLang, setLang, t } from "./js/i18n.js";
import { resortMaterials } from "./js/materials.js";

loadMaterials()
  .then(() => {
    init();
  })
  .catch(error => {
    console.error("Error loading materials.json:", error);
  });

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

  document.getElementById("download-button").addEventListener("click", () => {
    const onGraphTab = !document
      .getElementById("tab-content-graph")
      .classList.contains("hidden");

    if (onGraphTab) {
      downloadDiagramAsPng();
    } else {
      downloadRecipesAsCsv();
    }
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
    if (settings[id] !== undefined) document.getElementById(id).value = settings[id];
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

  if (blendType === "line") {
    if (!meetsRange(linePointsInput, "labelPoints")) return;
    state.blendData = getLinearData(linePointsInput.value, increment, testSize);
    drawLinearBlend(state.blendData);
  } else if (blendType === "triaxial") {
    if (!meetsRange(triaxialPointsInput, "labelPoints")) return;
    state.blendData = getTriaxialData(triaxialPointsInput.value, testSize);
    drawTriaxialBlend(state.blendData);
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
    drawBiaxialBlend(state.blendData);
  }

  document.getElementById("total-points-value").textContent =
    state.blendData.length;

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
