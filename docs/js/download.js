import { state } from "./state.js";
import { roundTo } from "./utils.js";
import {
  getSelectedMaterials,
  getMaterialPercentageAtPoint,
} from "./recipes.js";
import { t, materialName } from "./i18n.js";

const BLEND_TYPE_KEYS = {
  line: "blendTypeLine",
  triaxial: "blendTypeTriaxial",
  biaxial: "blendTypeBiaxial",
};

const RECIPE_LETTERS = { 1: "A", 2: "B", 3: "C", 4: "D" };

/**
 * Downloads the currently drawn diagram as a PNG, by serializing the SVG,
 * rasterizing it on an offscreen canvas, and triggering a file download.
 */
export function downloadDiagramAsPng() {
  const svg = document.querySelector("#graph svg");
  if (!svg) return;

  const width = svg.width.baseVal.value;
  const height = svg.height.baseVal.value;

  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(svgUrl);

    canvas.toBlob(pngBlob => {
      const blendType = document.getElementById("blendType").value;
      const pointCount = state.blendData.length;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(pngBlob);
      const blendTypeLabel = BLEND_TYPE_KEYS[blendType]
        ? t(BLEND_TYPE_KEYS[blendType])
        : blendType;
      link.download = `${t("filenameDiagram")}-${blendTypeLabel}-${pointCount}${t("filenamePoints")}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
    }, "image/png");
  };
  image.src = svgUrl;
}

/**
 * Escapes a single CSV field: wraps it in quotes (doubling any quotes
 * inside) when it contains a comma, quote, or newline.
 * @param {*} value
 * @returns {string}
 */
function csvField(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(values) {
  return values.map(csvField).join(",") + "\r\n";
}

/**
 * Downloads the recipes as a CSV: the base recipes (materials and
 * percentages behind each Receta A/B/C/D), followed by the calculated
 * table (resulting % of each selected material at every point).
 */
export function downloadRecipesAsCsv() {
  const selectedMaterials = getSelectedMaterials();
  if (selectedMaterials.length === 0 || !state.blendData) return;

  let csv = "";

  csv += csvRow([t("csvBaseRecipes")]);
  csv += csvRow([t("csvRecipe"), t("csvMaterial"), "%"]);
  Object.entries(state.recipes).forEach(([key, recipe]) => {
    recipe
      .filter(mat => mat.materialId)
      .forEach(mat => {
        const material = state.materialsById[mat.materialId];
        csv += csvRow([
          RECIPE_LETTERS[key] ?? key,
          material ? materialName(material) : mat.materialName,
          mat.percentage,
        ]);
      });
  });

  csv += csvRow([]);
  csv += csvRow([t("csvCalculatedTable")]);
  csv += csvRow([
    "#",
    ...selectedMaterials.map(id => materialName(state.materialsById[id])),
  ]);
  state.blendData.forEach(point => {
    csv += csvRow([
      point.point,
      ...selectedMaterials.map(id =>
        roundTo(getMaterialPercentageAtPoint(point.point, id)),
      ),
    ]);
  });

  // BOM so Excel opens the UTF-8 accented characters correctly
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const blendType = document.getElementById("blendType").value;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  const blendTypeLabel = BLEND_TYPE_KEYS[blendType]
    ? t(BLEND_TYPE_KEYS[blendType])
    : blendType;
  link.download = `${t("filenameRecipes")}-${blendTypeLabel}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

const RECIPES_EXPORT_VERSION = 1;

/**
 * Downloads state.recipes as a JSON file that importRecipes() (recipes.js)
 * can read back, so recipes survive beyond this browser's localStorage.
 */
export function exportRecipesAsJson() {
  const payload = {
    version: RECIPES_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    recipes: state.recipes,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${t("filenameRecipes")}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}
