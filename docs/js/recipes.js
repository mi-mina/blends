import { state } from "./state.js";
import { roundTo, blendColors, getContrastTextColor } from "./utils.js";
import { t, materialName } from "./i18n.js";
import { colorA, colorB, colorC, colorD } from "./constants.js";

///////////////////////////////////////////////////////////////////////////////
// Functions to draw blends ///////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Populates the recipe material selects with options from the provided materials array.
 * @param {Array} materials - An array of material objects, each containing materialId and materialName.
 * @description This function updates all recipe material selects with the available materials.
 */

export function populateRecipeMaterialSelects() {
  // Get all selects for recipe materials
  const selects = document.querySelectorAll(".recipe-material-select");
  // Build options HTML
  let options = `<option value="">${t("selectMaterialOption")}</option>`;
  state.loadedMaterials.forEach(mat => {
    options += `<option value="${mat.materialId}">${materialName(mat)}</option>`;
  });
  // Set options for each select, preserving the current selection (this
  // also runs after a language switch, when options are rebuilt with
  // translated names but the underlying materialId shouldn't change)
  selects.forEach(select => {
    const previousValue = select.value;
    select.innerHTML = options;
    select.value = previousValue;
    // Set initial class based on value
    if (!select.value) {
      select.classList.add("text-gray-400");
    } else {
      select.classList.remove("text-gray-400");
    }

    // Upadate text color based on selection
    select.addEventListener("change", () => {
      if (select.value) {
        select.classList.remove("text-gray-400");
      } else {
        select.classList.add("text-gray-400");
      }
    });
  });
}

const RECIPE_STORAGE_KEY = "blends-recipes";

const RECIPE_CARDS = [
  { recipeId: "recipe1", key: "1" },
  { recipeId: "recipe2", key: "2" },
  { recipeId: "recipe3", key: "3" },
  { recipeId: "recipe4", key: "4" },
];

const RECIPE_ROW_SELECTOR = ".mb-2.flex.items-center";

/**
 * Wires up a single recipe row: saving state/re-rendering on change,
 * disabling the percentage input until a material is selected, letting
 * arrow keys nudge the percentage, and auto-adding a new row once this
 * one (if it's the last row in the card) gets a material selected.
 */
function wireRecipeRow(container, key, select, input, checkbox) {
  // Toggling "additive" is saved like any other row change, and also
  // changes whether this row's percentage counts towards the 100% base total.
  [select, input, checkbox].forEach(el => {
    el.addEventListener("change", () => {
      state.recipes[key] = getRecipeData(container.id);
      saveRecipesToLocalStorage();
      renderRecipesTable();
      updateRecipeTotal(container);
    });
  });

  // A percentage only makes sense once its row has a material selected,
  // so keep the percentage input disabled (and empty) until then.
  const syncPercentageInput = () => {
    input.disabled = !select.value;
    if (!select.value) input.value = "";
  };
  syncPercentageInput();
  select.addEventListener("change", syncPercentageInput);

  // Let the up/down arrow keys nudge the percentage by 1, clamped to 0-100
  input.addEventListener("keydown", event => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();

    const step = event.key === "ArrowUp" ? 1 : -1;
    const current = parseFloat(input.value) || 0;
    input.value = Math.min(100, Math.max(0, current + step));
    input.dispatchEvent(new Event("change"));
  });

  // Keep a spare empty row at the end of each card: once the last row
  // gets a material selected, add a fresh one after it.
  select.addEventListener("change", () => {
    if (!select.value) return;
    const selects = container.querySelectorAll(".recipe-material-select");
    if (select === selects[selects.length - 1]) {
      addRecipeRow(container, key);
    }
  });
}

/**
 * Sums a recipe card's percentage inputs and updates its "Total: x%" text,
 * turning it black and bold once the non-additive rows add up to exactly
 * 100 (additives sit on top of the base 100% and don't count towards it).
 */
function updateRecipeTotal(container) {
  const rows = container.querySelectorAll(RECIPE_ROW_SELECTOR);

  let total = 0;
  let baseTotal = 0;
  rows.forEach(row => {
    const input = row.querySelector('input[type="text"]');
    const checkbox = row.querySelector('input[type="checkbox"]');
    const percentage = parseFloat(input?.value) || 0;

    total += percentage;
    if (!checkbox?.checked) baseTotal += percentage;
  });

  const wrapper = container.querySelector(".recipe-total");
  const valueEl = container.querySelector(".recipe-total-value");
  if (!wrapper || !valueEl) return;

  valueEl.textContent = `${roundTo(total)}%`;

  const isComplete = roundTo(baseTotal) === 100;
  wrapper.classList.toggle("text-gray-500", !isComplete);
  wrapper.classList.toggle("text-black", isComplete);
  wrapper.classList.toggle("font-bold", isComplete);
}

/**
 * Clones the last row of a recipe card, resets it to empty, and wires
 * it up the same way as the original rows.
 */
function addRecipeRow(container, key) {
  const rows = container.querySelectorAll(RECIPE_ROW_SELECTOR);
  const lastRow = rows[rows.length - 1];
  const newRow = lastRow.cloneNode(true);

  const select = newRow.querySelector(".recipe-material-select");
  const input = newRow.querySelector('input[type="text"]');
  const checkbox = newRow.querySelector('input[type="checkbox"]');
  select.value = "";
  input.value = "";
  checkbox.checked = false;

  // Insert right after the last row, not at the end of the container,
  // since the "Total: x%" block now comes after the rows.
  lastRow.insertAdjacentElement("afterend", newRow);

  wireRecipeRow(container, key, select, input, checkbox);
  // cloneNode() copies the source select's <option>s but none of its
  // listeners, so re-add the text-gray-400 toggle for this new select.
  select.addEventListener("change", () => {
    select.classList.toggle("text-gray-400", !select.value);
  });
}

RECIPE_CARDS.forEach(({ recipeId, key }) => {
  const container = document.getElementById(recipeId);
  const selects = container.querySelectorAll(".recipe-material-select");
  const inputs = container.querySelectorAll('input[type="text"]');
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');

  selects.forEach((select, i) => {
    if (inputs[i]) wireRecipeRow(container, key, select, inputs[i], checkboxes[i]);
  });
});

function saveRecipesToLocalStorage() {
  localStorage.setItem(RECIPE_STORAGE_KEY, JSON.stringify(state.recipes));
}

/**
 * Restores previously saved recipe selections into the DOM. Relies on
 * the existing "change" listeners above to update state.recipes and
 * re-render the table, so it must run after populateRecipeMaterialSelects()
 * (selects need real <option>s for `.value = materialId` to take) and
 * after the first drawBlend() (state.blendData must exist before
 * renderRecipesTable() runs).
 */
export function loadRecipesFromLocalStorage() {
  const saved = localStorage.getItem(RECIPE_STORAGE_KEY);
  if (!saved) return;

  let savedRecipes;
  try {
    savedRecipes = JSON.parse(saved);
  } catch {
    return;
  }

  RECIPE_CARDS.forEach(({ recipeId, key }) => {
    const recipeData = savedRecipes[key];
    if (!recipeData) return;

    const container = document.getElementById(recipeId);

    // Re-query on every iteration: restoring a value into the last row
    // auto-adds a new one, which the next iteration needs to see.
    recipeData.forEach((row, i) => {
      const selects = container.querySelectorAll(".recipe-material-select");
      const inputs = container.querySelectorAll('input[type="text"]');
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');

      if (selects[i]) {
        selects[i].value = row.materialId;
        selects[i].dispatchEvent(new Event("change"));
      }
      if (inputs[i]) {
        inputs[i].value = row.percentage;
        inputs[i].dispatchEvent(new Event("change"));
      }
      if (checkboxes[i]) {
        checkboxes[i].checked = !!row.additive;
        checkboxes[i].dispatchEvent(new Event("change"));
      }
    });
  });
}

/**
 * Clears every recipe card (selects and % inputs), the in-memory
 * state.recipes, and the saved copy in localStorage.
 */
export function clearAllRecipes() {
  RECIPE_CARDS.forEach(({ recipeId, key }) => clearRecipeCard(recipeId, key));

  localStorage.removeItem(RECIPE_STORAGE_KEY);
  renderRecipesTable();
}

/**
 * Resets a single recipe card's selects/inputs/checkboxes and syncs
 * state.recipes[key] to match (but doesn't touch localStorage or
 * re-render the table - callers do that once after clearing).
 */
function clearRecipeCard(recipeId, key) {
  const container = document.getElementById(recipeId);

  container.querySelectorAll(".recipe-material-select").forEach(select => {
    select.value = "";
    select.classList.add("text-gray-400");
  });
  container.querySelectorAll('input[type="text"]').forEach(input => {
    input.value = "";
    input.disabled = true;
  });
  container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false;
  });

  state.recipes[key] = getRecipeData(recipeId);
  updateRecipeTotal(container);
}

/**
 * Clears any recipe card beyond what a blend type shows (e.g. cards 3
 * and 4 when switching to "line", which only uses 2). Otherwise their
 * leftover materials/percentages keep counting in getSelectedMaterials()
 * and getMaterialPercentageAtPoint(), adding stray columns to the
 * recipes table and corrupting totals for materials also used in a
 * still-visible recipe.
 * @param {string} blendType - "line", "triaxial", or "biaxial".
 */
export function clearRecipesBeyondBlendType(blendType) {
  let showCount = 2;
  if (blendType === "triaxial") showCount = 3;
  if (blendType === "biaxial") showCount = 4;

  RECIPE_CARDS.forEach(({ recipeId, key }, idx) => {
    if (idx >= showCount) clearRecipeCard(recipeId, key);
  });

  saveRecipesToLocalStorage();
  renderRecipesTable();
}

/**
 * Retrieves the recipe data from the specified recipe card.
 * @param {string} recipeId - The ID of the recipe card to retrieve data from.
 * @returns {Array} An array of objects containing material IDs, names, and percentages.
 * @description Each object in the array contains the material ID, name, and percentage from the recipe card.
 * @example
 * const recipeData = getRecipeData("recipe1");
 * console.log(recipeData);
 * // Output: [{ materialId: "mat1", materialName: "Material 1", percentage: "50" }, ...]
 */

export function getRecipeData(recipeId) {
  const recipe = document.getElementById(recipeId);
  const selects = recipe.querySelectorAll(".recipe-material-select");
  const inputs = recipe.querySelectorAll('input[type="text"]');
  const checkboxes = recipe.querySelectorAll('input[type="checkbox"]');
  const data = [];

  for (let i = 0; i < selects.length; i++) {
    data.push({
      materialId: selects[i].value,
      materialName: selects[i].options[selects[i].selectedIndex]?.text || "",
      percentage: inputs[i]?.value || "",
      additive: checkboxes[i]?.checked || false,
    });
  }
  return data;
}

///////////////////////////////////////////////////////////////////////////////
// Recipes Table  functions ///////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Computes what percentage of a given material ends up in the blend at a
 * specific point, by combining each recipe's material percentage with how
 * much of that recipe's corner is present at that point.
 * @param {number} point - Point number, as in blendData[].point.
 * @param {string} materialId
 * @returns {number}
 */
export function getMaterialPercentageAtPoint(point, materialId) {
  // blendData is always generated with sequential point numbers starting
  // at 1 (see blendData.js), so its index in the array is point - 1.
  const blend = state.blendData[point - 1];
  const percentages = blend ? blend.percentages : {};

  let materialPercentage = 0;

  Object.entries(state.recipes).forEach(([key, recipe]) => {
    const recipePercentage = percentages[key];

    const a = recipe.filter(mat => mat.materialId === materialId);
    // TODO handle case where materialId is not found
    // TODO ver qué pasa cuando aparece el mismo material dos veces en la misma receta
    // TODO ver qué pasa si los porcentajes de la receta no suman 100

    materialPercentage +=
      a.length > 0 ? (recipePercentage * a[0].percentage) / 100 : 0;
  });

  return materialPercentage;
}

const CORNER_COLORS = [colorA, colorB, colorC, colorD];
const CORNER_LETTERS = { 1: "A", 2: "B", 3: "C", 4: "D" };

/**
 * Computes a point's blended color the same way the diagram does (see
 * the circle fill in chart.js), so the recipes table can reuse it.
 * @param {number} point - Point number, as in blendData[].point.
 * @returns {string} Hex color.
 */
function getPointColor(point) {
  const percentages = state.blendData[point - 1]?.percentages;
  if (!percentages) return "#ffffff";

  const colors = CORNER_COLORS.slice(0, Object.keys(percentages).length);
  return blendColors(colors, Object.values(percentages));
}

/**
 * If a point is a pure corner (one of the original recipes, 100% of a
 * single corner), returns its letter (A/B/C/D); otherwise null.
 * @param {number} point - Point number, as in blendData[].point.
 * @returns {string|null}
 */
function getCornerLetter(point) {
  const percentages = state.blendData[point - 1]?.percentages;
  if (!percentages) return null;

  const pureKey = Object.entries(percentages).find(
    ([, value]) => Math.round(value) === 100
  )?.[0];
  return pureKey ? CORNER_LETTERS[pureKey] : null;
}

/**
 * Renders the recipes table based on the selected materials and blend type.
 * @description This function generates a table with the selected materials as columns and the number of rows based on the blend type.
 */
export function renderRecipesTable() {
  const container = document.getElementById("recipes-table-container");
  const selectedMaterials = getSelectedMaterials();
  const blendType = document.getElementById("blendType").value;

  let numRows = 0;
  if (blendType === "line") {
    numRows = Number(document.getElementById("linePoints").value) || 0;
  } else if (blendType === "triaxial") {
    const n = Number(document.getElementById("triaxialPoints").value) || 0;
    numRows = (n * (n + 1)) / 2; // Triangular number
  } else if (blendType === "biaxial") {
    const rows = Number(document.getElementById("biaxialRows").value) || 0;
    const cols = Number(document.getElementById("biaxialColumns").value) || 0;
    numRows = rows * cols;
  }

  if (numRows === 0 || selectedMaterials.length === 0) {
    container.innerHTML = "";
    return;
  }

  let html = `
    <h3 class="text-lg font-semibold mb-2">${t("recipesTableTitle")}</h3>
    <table class="border-collapse text-sm">
    <thead>
      <tr>
        <th class="border-b-2 border-gray-500 px-2 py-1 text-left">#</th>
        ${selectedMaterials
          .map(mat => {
            const name = materialName(state.materialsById[mat]);
            return `<th class="border-b-2 border-gray-500 px-2 py-1 text-left max-w-[200px] truncate" title="${name}">${name}</th>`;
          })
          .join("")}
      </tr>
    </thead>
    <tbody>
  `;

  for (let i = 0; i < numRows; i++) {
    const recipeNumber = i + 1;
    const pointColor = getPointColor(recipeNumber);
    const pointTextColor = getContrastTextColor(pointColor);
    const cornerLetter = getCornerLetter(recipeNumber);
    const numberLabel = cornerLetter
      ? `${recipeNumber} - ${cornerLetter}`
      : recipeNumber;
    const rowBorderStyle = `border-bottom-color:${pointColor}`;
    html += `
      <tr>
        <td class="border-b-2 px-2 py-1 text-center" style="background-color:${pointColor};color:${pointTextColor};${rowBorderStyle}">${numberLabel}</td>
        ${selectedMaterials
          .map(materialId => {
            const materialPercentage = getMaterialPercentageAtPoint(
              recipeNumber,
              materialId
            );
            return `<td class="border-b-2 px-2 py-1" style="${rowBorderStyle}">${roundTo(
              materialPercentage
            )}%</td>`;
          })
          .join("")}
      </tr>
    `;
  }
  html += `</tbody></table>`;

  container.innerHTML = html;
}

/**
 * A material only shows up in the recipes table once its row has both
 * a material selected and a percentage filled in.
 */
export function getSelectedMaterials() {
  const rows = document.querySelectorAll(RECIPE_ROW_SELECTOR);
  const materials = [];

  rows.forEach(row => {
    const select = row.querySelector(".recipe-material-select");
    const input = row.querySelector('input[type="text"]');
    if (select?.value && input?.value) {
      materials.push(select.value);
    }
  });

  // Return unique materials
  return [...new Set(materials)];
}
