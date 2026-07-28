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
  tabGraph.setAttribute("aria-selected", tab === "graph");
  tabGraph.tabIndex = tab === "graph" ? 0 : -1;

  const tabRecipes = document.getElementById("tab-recipes");
  tabRecipes.classList.toggle("border-blue-500", tab === "recipes");
  tabRecipes.classList.toggle("text-blue-600", tab === "recipes");
  tabRecipes.classList.toggle("border-transparent", tab !== "recipes");
  tabRecipes.classList.toggle("text-gray-600", tab !== "recipes");
  tabRecipes.setAttribute("aria-selected", tab === "recipes");
  tabRecipes.tabIndex = tab === "recipes" ? 0 : -1;

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

/**
 * Shows a modal with a message and a row of buttons, for choices that
 * don't fit a native confirm()'s single OK/Cancel pair (e.g. offering a
 * third option instead of chaining several confirm() dialogs in a row).
 * Traps Tab within its buttons, closes on Escape (resolving as whichever
 * button has value "cancel", if any), and returns focus to whatever
 * triggered it - a native confirm()/alert() gets all of that for free,
 * so this custom replacement has to do it by hand.
 * @param {string} message
 * @param {Array<{value: string, label: string, primary?: boolean}>} buttons
 * @returns {Promise<string>} The value of whichever button was clicked.
 */
export function showActionDialog(message, buttons) {
  return new Promise(resolve => {
    const overlay = document.getElementById("confirm-dialog-overlay");
    const messageEl = document.getElementById("confirm-dialog-message");
    const buttonsEl = document.getElementById("confirm-dialog-buttons");
    const previouslyFocused = document.activeElement;

    messageEl.textContent = message;
    buttonsEl.innerHTML = "";

    const close = value => {
      overlay.classList.add("hidden");
      overlay.removeEventListener("keydown", handleKeydown);
      previouslyFocused?.focus();
      resolve(value);
    };

    buttons.forEach(({ value, label, primary }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.className = primary
        ? "px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        : "px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1";
      button.addEventListener("click", () => close(value));
      buttonsEl.appendChild(button);
    });

    const handleKeydown = event => {
      const focusable = [...buttonsEl.querySelectorAll("button")];
      if (event.key === "Tab" && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      } else if (event.key === "Escape") {
        const cancelButton = buttons.find(b => b.value === "cancel");
        if (cancelButton) close("cancel");
      }
    };
    overlay.addEventListener("keydown", handleKeydown);

    overlay.classList.remove("hidden");
    // Land on the first button (Cancelar, by every current caller's
    // convention) rather than a riskier default action.
    buttonsEl.querySelector("button")?.focus();
  });
}
