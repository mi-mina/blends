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
// - Añadir automáticamente una fila nueva en las recetas cuando se rellena la última disponible
// - Comprobar que los aditivos se calculan correctamente en las recetas
// - Complementar el listado de materiales con https://ceramica.name/calculos/aformula
// - Los anchos de las columnas de la tabla de recetas se reparten de forma desigual, hacer que se repartan de forma más uniforme
// - No hacer que la tabla ocupe todo el ancho de la pantalla, sino solo el espacio necesario y pegada a la izquierda.
// - Resaltar mejor el cuadro de las recetas
// - Las recetas no se ven bien en pantallas pequeñas, hacer que se vea bien en móviles y tablets
// - Añadir la suma de los porcentajes en cada receta, y que se pueda ver si es 100% o no

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

  // Force "line" blend type to be selected on page load
  document.getElementById("blendType").value = "line";
  document.getElementById("blendType").dispatchEvent(new Event("change"));

  // Event listeners for blend type and tab changes
  document.getElementById("blendType").addEventListener("change", event => {
    const blendType = event.target.value;

    // Update blend inputs visibility
    updateBlendInputs(blendType);

    // Update recipe cards visibility
    updateRecipeCards(blendType);

    drawBlend();

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
}

/**
 * Draws the blend chart based on the selected blend type and input values.
 * @description This function retrieves input values, generates blend data, and calls the appropriate draw function.
 */
function drawBlend() {
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
