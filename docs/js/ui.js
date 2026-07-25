///////////////////////////////////////////////////////////////////////////////
// Functions to update UI elements ////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
import { colorA, colorB, colorC, colorD } from "./constants.js";
import { getContrastTextColor } from "./utils.js";

/**
 * Colors each recipe card's border and title banner with the same color
 * as its corresponding corner in the diagram, using a readable text color.
 */
export function applyRecipeCardColors() {
  const cards = [
    { card: document.getElementById("recipe1"), color: colorA },
    { card: document.getElementById("recipe2"), color: colorB },
    { card: document.getElementById("recipe3"), color: colorC },
    { card: document.getElementById("recipe4"), color: colorD },
  ];

  cards.forEach(({ card, color }) => {
    const header = card.querySelector("h3");
    card.style.borderColor = color;
    header.style.backgroundColor = color;
    header.style.color = getContrastTextColor(color);
  });
}

/**
 * Updates the visibility of blend inputs based on the selected blend type.
 * @param {string} blendType - The selected blend type ("line", "triaxial", or "biaxial").
 */
export function updateBlendInputs(blendType = "line") {
  const lineInputs = document.getElementById("lineInputs");
  const triaxialInputs = document.getElementById("triaxialInputs");
  const biaxialInputs = document.getElementById("biaxialInputs");

  // Show/hide inputs based on the selected blend type
  if (blendType === "line") {
    lineInputs.classList.remove("hidden");
    triaxialInputs.classList.add("hidden");
    biaxialInputs.classList.add("hidden");
  } else if (blendType === "triaxial") {
    lineInputs.classList.add("hidden");
    triaxialInputs.classList.remove("hidden");
    biaxialInputs.classList.add("hidden");
  } else if (blendType === "biaxial") {
    lineInputs.classList.add("hidden");
    triaxialInputs.classList.add("hidden");
    biaxialInputs.classList.remove("hidden");
  }
}

/**
 * Updates the visibility of recipe cards based on the selected blend type.
 * @param {string} blendType - The selected blend type ("line", "triaxial", or "biaxial").
 * @description Shows 2 cards for "line", 3 cards for "triaxial", and 4 cards for "biaxial".
 * @example
 * @returns {void}
 */
export function updateRecipeCards(blendType = "line") {
  const cards = [
    document.getElementById("recipe1"),
    document.getElementById("recipe2"),
    document.getElementById("recipe3"),
    document.getElementById("recipe4"),
  ];
  let showCount = 2;
  if (blendType === "triaxial") showCount = 3;
  if (blendType === "biaxial") showCount = 4;
  cards.forEach((card, idx) => {
    if (idx < showCount) {
      card.classList.remove("hidden");
    } else {
      card.classList.add("hidden");
    }
  });
}

/**
 * Shows the selected tab and hides the others.
 * @param {string} tab - The tab to show ("graph" or "recipes").
 * @param {Function} [onShowGraph] - Called when the "graph" tab is shown (used to redraw the blend).
 * @description Updates the tab buttons and contents based on the selected tab.
 */
export function showTab(tab, onShowGraph) {
  // Tab buttons
  const tabGraph = document.getElementById("tab-graph");
  tabGraph.classList.toggle("border-blue-500", tab === "graph");
  tabGraph.classList.toggle("text-blue-600", tab === "graph");
  tabGraph.classList.toggle("border-transparent", tab !== "graph");
  tabGraph.classList.toggle("text-gray-600", tab !== "graph");

  const tabRecipes = document.getElementById("tab-recipes");
  tabRecipes.classList.toggle("border-blue-500", tab === "recipes");
  tabRecipes.classList.toggle("text-blue-600", tab === "recipes");
  tabRecipes.classList.toggle("border-transparent", tab !== "recipes");
  tabRecipes.classList.toggle("text-gray-600", tab !== "recipes");

  // Tab contents
  document
    .getElementById("tab-content-graph")
    .classList.toggle("hidden", tab !== "graph");
  document
    .getElementById("tab-content-recipes")
    .classList.toggle("hidden", tab !== "recipes");

  if (tab === "graph" && onShowGraph) {
    // If the graph tab is selected, redraw the blend
    onShowGraph();
  }
}
