import { state } from "./state.js";
import { roundTo } from "./utils.js";
import { t, materialName } from "./i18n.js";

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

RECIPE_CARDS.forEach(({ recipeId, key }) => {
  const container = document.getElementById(recipeId);
  container
    .querySelectorAll('.recipe-material-select, input[type="text"]')
    .forEach(el => {
      el.addEventListener("change", () => {
        state.recipes[key] = getRecipeData(recipeId);
        saveRecipesToLocalStorage();
        renderRecipesTable();
      });
    });

  // A percentage only makes sense once its row has a material selected,
  // so keep each percentage input disabled (and empty) until then.
  const selects = container.querySelectorAll(".recipe-material-select");
  const inputs = container.querySelectorAll('input[type="text"]');
  selects.forEach((select, i) => {
    const input = inputs[i];
    if (!input) return;

    const syncPercentageInput = () => {
      input.disabled = !select.value;
      if (!select.value) input.value = "";
    };

    syncPercentageInput();
    select.addEventListener("change", syncPercentageInput);
  });

  // Let the up/down arrow keys nudge a percentage input by 1, clamped to 0-100
  container.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener("keydown", event => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();

      const step = event.key === "ArrowUp" ? 1 : -1;
      const current = parseFloat(input.value) || 0;
      input.value = Math.min(100, Math.max(0, current + step));
      input.dispatchEvent(new Event("change"));
    });
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
    const selects = container.querySelectorAll(".recipe-material-select");
    const inputs = container.querySelectorAll('input[type="text"]');

    recipeData.forEach((row, i) => {
      if (selects[i]) {
        selects[i].value = row.materialId;
        selects[i].dispatchEvent(new Event("change"));
      }
      if (inputs[i]) {
        inputs[i].value = row.percentage;
        inputs[i].dispatchEvent(new Event("change"));
      }
    });
  });
}

/**
 * Clears every recipe card (selects and % inputs), the in-memory
 * state.recipes, and the saved copy in localStorage.
 */
export function clearAllRecipes() {
  RECIPE_CARDS.forEach(({ recipeId, key }) => {
    const container = document.getElementById(recipeId);

    container.querySelectorAll(".recipe-material-select").forEach(select => {
      select.value = "";
      select.classList.add("text-gray-400");
    });
    container.querySelectorAll('input[type="text"]').forEach(input => {
      input.value = "";
      input.disabled = true;
    });

    state.recipes[key] = getRecipeData(recipeId);
  });

  localStorage.removeItem(RECIPE_STORAGE_KEY);
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
  const data = [];

  for (let i = 0; i < selects.length; i++) {
    data.push({
      materialId: selects[i].value,
      materialName: selects[i].options[selects[i].selectedIndex]?.text || "",
      percentage: inputs[i]?.value || "",
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

  let html = `<table class="min-w-full border border-gray-300 text-sm">
    <thead>
      <tr>
        <th class="border px-2 py-1">#</th>
        ${selectedMaterials
          .map(
            mat =>
              `<th class="border px-2 py-1">${materialName(state.materialsById[mat])}</th>`
          )
          .join("")}
      </tr>
    </thead>
    <tbody>
  `;

  for (let i = 0; i < numRows; i++) {
    const recipeNumber = i + 1;
    html += `
      <tr>
        <td class="border px-2 py-1 text-center">${recipeNumber}</td>
        ${selectedMaterials
          .map(materialId => {
            const materialPercentage = getMaterialPercentageAtPoint(
              recipeNumber,
              materialId
            );
            return `<td class="border px-2 py-1">${roundTo(
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

export function getSelectedMaterials() {
  const selects = document.querySelectorAll(".recipe-material-select");
  const materials = Array.from(selects)
    .map(select => select.value)
    .filter(value => value && value !== "");
  // Return unique materials
  return [...new Set(materials)];
}
