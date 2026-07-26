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
const ORIGINAL_ROWS_PER_CARD = 4;

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

  // Show a small "x" button to clear this row's material, instead of
  // requiring the user to reopen the select and pick the blank option.
  const clearButton = select.parentElement.querySelector(
    ".recipe-clear-material-button",
  );
  const syncClearButton = () => {
    clearButton.classList.toggle("hidden", !select.value);
  };
  syncClearButton();
  select.addEventListener("change", syncClearButton);
  clearButton.addEventListener("click", () => {
    const row = select.closest(RECIPE_ROW_SELECTOR);
    const rows = container.querySelectorAll(RECIPE_ROW_SELECTOR);

    select.value = "";
    input.value = "";
    checkbox.checked = false;

    if (rows.length <= ORIGINAL_ROWS_PER_CARD) {
      // Keep at least the original 4 rows: instead of leaving this now-empty
      // row as a gap in the middle, move it after the current last row.
      const lastRow = rows[rows.length - 1];
      if (lastRow !== row) lastRow.insertAdjacentElement("afterend", row);
    } else {
      // Already more rows than the baseline (extras auto-added as earlier
      // ones filled up), so there's no need to keep this one around.
      row.remove();
    }

    select.dispatchEvent(new Event("change"));
  });

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

  let baseTotal = 0;
  let additivesTotal = 0;
  let hasAdditives = false;
  rows.forEach(row => {
    const input = row.querySelector('input[type="text"]');
    const checkbox = row.querySelector('input[type="checkbox"]');
    const percentage = parseFloat(input?.value) || 0;

    if (checkbox?.checked) {
      additivesTotal += percentage;
      hasAdditives = true;
    } else {
      baseTotal += percentage;
    }
  });

  const baseLine = container.querySelector(".recipe-total-base");
  const baseValueEl = container.querySelector(".recipe-total-base-value");
  const additivesLine = container.querySelector(".recipe-total-additives");
  const additivesValueEl = container.querySelector(
    ".recipe-total-additives-value",
  );
  if (!baseLine || !baseValueEl || !additivesLine || !additivesValueEl) return;

  baseValueEl.textContent = `${roundTo(baseTotal)}%`;
  additivesValueEl.textContent = `${roundTo(additivesTotal)}%`;
  additivesLine.classList.toggle("hidden", !hasAdditives);

  const isComplete = roundTo(baseTotal) === 100;
  baseLine.classList.toggle("text-gray-500", !isComplete);
  baseLine.classList.toggle("text-black", isComplete);
  baseLine.classList.toggle("font-bold", isComplete);
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
    if (inputs[i])
      wireRecipeRow(container, key, select, inputs[i], checkboxes[i]);
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
 * Resets a single recipe card's selects/inputs/checkboxes, removes any
 * rows added beyond the original 4 (see addRecipeRow), and syncs
 * state.recipes[key] to match (but doesn't touch localStorage or
 * re-render the table - callers do that once after clearing).
 */
function clearRecipeCard(recipeId, key) {
  const container = document.getElementById(recipeId);

  container.querySelectorAll(RECIPE_ROW_SELECTOR).forEach((row, i) => {
    if (i >= ORIGINAL_ROWS_PER_CARD) row.remove();
  });

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
  container
    .querySelectorAll(".recipe-clear-material-button")
    .forEach(clearButton => clearButton.classList.add("hidden"));

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
/**
 * Ceramic recipes are conventionally written so the base (non-additive)
 * ingredients sum to 100%. Users won't always type a base that actually
 * does, so scale every row - base and additive alike, matching
 * glazy.org's convention - by whatever factor would make the base hit
 * 100, rather than using the raw numbers as typed.
 * @param {Array} recipe - A state.recipes[key] entry.
 * @returns {number} The scaling factor, or 0 if the recipe has no base
 * at all (nothing to scale against).
 */
function getRecipeNormalizationFactor(recipe) {
  const baseTotal = recipe
    .filter(mat => !mat.additive)
    .reduce((sum, mat) => sum + (parseFloat(mat.percentage) || 0), 0);
  return baseTotal > 0 ? 100 / baseTotal : 0;
}

export function getMaterialPercentageAtPoint(point, materialId) {
  // blendData is always generated with sequential point numbers starting
  // at 1 (see blendData.js), so its index in the array is point - 1.
  const blend = state.blendData[point - 1];
  const percentages = blend ? blend.percentages : {};

  let materialPercentage = 0;

  Object.entries(state.recipes).forEach(([key, recipe]) => {
    // A key can exist in state.recipes without being one of the current
    // blend type's corners (e.g. "3"/"4" while on "line"), in which case
    // it has no percentage here - skip it rather than let `undefined * x`
    // poison the sum with NaN.
    const recipePercentage = percentages[key];
    if (recipePercentage === undefined) return;

    // Sum every row using this material in the recipe, in case it was
    // added more than once (e.g. once as a base ingredient, once as an additive).
    const rowsPercentage = recipe
      .filter(mat => mat.materialId === materialId)
      .reduce((sum, mat) => sum + (parseFloat(mat.percentage) || 0), 0);
    const normalizedPercentage =
      rowsPercentage * getRecipeNormalizationFactor(recipe);

    materialPercentage += (recipePercentage * normalizedPercentage) / 100;
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
    ([, value]) => Math.round(value) === 100,
  )?.[0];
  return pureKey ? CORNER_LETTERS[pureKey] : null;
}

/**
 * Renders the recipes table based on the selected materials and blend type.
 * @description This function generates a table with the selected materials as columns and the number of rows based on the blend type.
 */
export function renderRecipesTable() {
  const container = document.getElementById("recipes-table-container");
  const { nonAdditive, additiveOnly } = partitionSelectedMaterials();
  const selectedMaterials = [...nonAdditive, ...additiveOnly];
  // Index of the first additive-only column, so it can get a divider on
  // its left - only meaningful when there are regular ingredients too.
  const additiveStart = nonAdditive.length > 0 ? nonAdditive.length : -1;
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
    <div class="inline-block">
    <h3 class="w-full bg-gray-300 text-gray-800 text-lg font-semibold text-center px-3 py-1.5 rounded-t">${t("recipesTableTitle", { count: numRows })}</h3>
    <table class="border-collapse text-sm">
    <thead>
      ${
        additiveOnly.length > 0
          ? `<tr>
        <th class="px-2 py-1"></th>
        ${
          nonAdditive.length > 0
            ? `<th class="px-2 py-1 text-left font-normal text-gray-500" colspan="${nonAdditive.length}">${t("baseMaterialsLabel")}</th>`
            : ""
        }
        <th class="px-2 py-1 text-left font-normal text-gray-500 border-l border-l-gray-300" colspan="${additiveOnly.length}">${t("additivesLabel")}</th>
      </tr>`
          : ""
      }
      <tr>
        <th class="border-b-2 border-b-gray-500 px-2 py-1 text-center min-w-[64px] whitespace-nowrap">#</th>
        ${selectedMaterials
          .map((mat, idx) => {
            const name = materialName(state.materialsById[mat]);
            const divider = idx === additiveStart ? " border-l border-l-gray-300" : "";
            return `<th class="border-b-2 border-b-gray-500 px-2 py-1 text-left max-w-[200px] truncate${divider}" title="${name}">${name}</th>`;
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
        <td class="border-b-2 px-2 py-1 text-center min-w-[64px] whitespace-nowrap${cornerLetter ? " font-bold" : ""}" style="background-color:${pointColor};color:${pointTextColor};${rowBorderStyle}">${numberLabel}</td>
        ${selectedMaterials
          .map((materialId, idx) => {
            const materialPercentage = getMaterialPercentageAtPoint(
              recipeNumber,
              materialId,
            );
            const divider = idx === additiveStart ? " border-l border-l-gray-300" : "";
            return `<td class="border-b-2 px-2 py-1${divider}" style="${rowBorderStyle}">${roundTo(
              materialPercentage,
            )}%</td>`;
          })
          .join("")}
      </tr>
    `;
  }
  html += `</tbody></table></div>`;

  container.innerHTML = html;
}

/**
 * Splits the materials used across all recipes into regular ingredients
 * and additive-only ones (used exclusively as an additive, never as a
 * regular ingredient, in any recipe). A material only counts at all
 * once its row has both a material selected and a percentage filled in.
 */
function partitionSelectedMaterials() {
  const rows = document.querySelectorAll(RECIPE_ROW_SELECTOR);
  const nonAdditive = [];
  const additive = [];

  rows.forEach(row => {
    const select = row.querySelector(".recipe-material-select");
    const input = row.querySelector('input[type="text"]');
    if (!select?.value || !input?.value) return;

    const checkbox = row.querySelector('input[type="checkbox"]');
    const materials = checkbox?.checked ? additive : nonAdditive;
    if (!materials.includes(select.value)) materials.push(select.value);
  });

  const additiveOnly = additive.filter(id => !nonAdditive.includes(id));
  return { nonAdditive, additiveOnly };
}

/**
 * All materials that should show up in the recipes table, with
 * additive-only ones listed last, as their own trailing columns.
 */
export function getSelectedMaterials() {
  const { nonAdditive, additiveOnly } = partitionSelectedMaterials();
  return [...nonAdditive, ...additiveOnly];
}
