const STORAGE_KEY = "blends-lang";

export const translations = {
  es: {
    pageTitle: "Calculadora de mezclas volumétricas",
    blendTypeLabel: "Tipo de mezcla",
    optionLine: "Lineal",
    optionTriaxial: "Triaxial",
    optionBiaxial: "Biaxial",
    sampleSizeLabel: "Tamaño de la muestra (ml)",
    numberPlaceholder: "Introduce un número",
    pointsLabel: "Puntos",
    pointsLabelTriaxial: "Puntos del lateral",
    rowsLabel: "Filas",
    columnsLabel: "Columnas",
    totalPointsLabel: "Nº total de puntos:",
    recalculateButton: "Recalcular",
    tabDiagram: "Diagrama",
    tabRecipes: "Recetas",
    downloadPngButton: "Descargar PNG",
    downloadCsvButton: "Descargar CSV",
    exportRecipesButton: "Exportar JSON",
    importRecipesButton: "Importar JSON",
    clearRecipesButton: "Limpiar recetas",
    recipeTitleA: "Receta A",
    recipeTitleB: "Receta B",
    recipeTitleC: "Receta C",
    recipeTitleD: "Receta D",
    recipeMaterial: "Material",
    recipePercent: "%",
    recipeAdditive: "Adit.",
    recipeTotalBaseLabel: "Total base:",
    recipeTotalAdditivesLabel: "Total aditivos:",
    minTotalMlNote:
      "Cantidad mínima necesaria de cada esmalte de las esquinas: {amount} ml",
    recipesTableTitle: "Tabla de {count} recetas",
    baseMaterialsLabel: "Materiales de la base",
    additivesLabel: "Aditivos",
    selectMaterialOption: "Selecciona un material",
    removeMaterialLabel: "Quitar material",
    noMaterialMatches: "Sin resultados",
    aboutTitle: "Sobre esta página",
    aboutIntro:
      "Esta herramienta genera diagramas de mezclas —lineales, triaxiales y biaxiales— para ayudarte a diseñar pruebas de esmaltes cerámicos usando el método volumétrico. Empecé haciéndola para mis propios experimentos y la comparto aquí por si a alguien más le resulta útil.",
    aboutVolumetricTitle: "¿Qué es el método volumétrico?",
    aboutVolumetricBody:
      "Es una técnica de experimentación con esmaltes que permite generar decenas de combinaciones intermedias entre dos, tres o cuatro esmaltes de partida sin tener que pesar cada una por separado. En lugar de usar una balanza en cada punto de la mezcla, se miden volúmenes en mililitros, generalmente usando una jeringa o similar.",
    aboutPrincipleTitle: "El principio en el que se basa",
    aboutPrincipleBody:
      "Cada esmalte de esquina se prepara con un peso seco de materiales exactamente igual y se completa con agua hasta alcanzar el mismo volumen final. Al fijar de antemano estos dos valores, todos los esmaltes de esquina quedan con la misma concentración de sólidos por mililitro, aunque sus composiciones sean completamente distintas. Esto significa que un mililitro de cualquier esquina aporta siempre la misma cantidad de gramos secos. Como consecuencia, medir volúmenes en los puntos intermedios equivale, de forma exacta, a mezclar los esmaltes en esas mismas proporciones de peso.",
    aboutUsageTitle: "Cómo usarla",
    aboutUsageBody:
      "Calcular a mano el volumen (ml) para cada punto de una mezcla intermedia y apuntarlo en un papel es tedioso. Con esta herramienta, tú defines el tipo de mezcla, qué tamaño de muestra quieres preparar, cuántos puntos intermedios deseas generar y ella te calcula automáticamente cuántos mililitros de cada esmalte de esquina necesitas añadir en cada punto. Si además introduces las recetas de los esmaltes de las esquinas en el apartado de Recetas, la herramienta te generará también todas las recetas para cada punto intermedio. Puedes descargar los diagramas en formato PNG y las recetas en formato CSV para imprimirlas o guardarlas.",
    footerCredit: "Hecho por Esperanza Moreno Cruz",
    footerLicenseLabel: "Licencia",
    rangeExact: "entre {min} y {max}",
    rangeMin: "al menos {min}",
    meetsRangeError: "Introduce {range} {label} para dibujar el diagrama.",
    labelPoints: "puntos",
    labelRows: "filas",
    labelColumns: "columnas",
    invalidPointsAlert: "Introduce un número entero válido para Puntos.",
    confirmClearRecipes:
      "¿Limpiar todas las recetas? Esta acción no se puede deshacer.",
    cancelButton: "Cancelar",
    importInvalidFile: "El archivo no es válido.",
    importDroppedRows:
      "Se han descartado {count} fila(s) porque el material ya no existe.",
    importReplaceWarning:
      "Vas a importar recetas. Si tienes datos introducidos en las recetas actuales los vas a perder y esta acción no se puede deshacer.",
    importBlendTypeMismatch:
      "El archivo incluye datos para {importedCount} recetas, pero el tipo de mezcla actual ({currentBlendType}) solo usa {currentCount}. ¿Cambiarlo a {targetBlendType} para conservarlas todas? Si no cambias el tipo de mezcla se perderán los datos de las recetas que no caben en {currentBlendType}.",
    importConfirmButton: "Importar recetas",
    importKeepBlendTypeButton: "Importar manteniendo {currentBlendType}",
    importSwitchBlendTypeButton: "Importar cambiando a {targetBlendType}",
    csvBaseRecipes: "Recetas base",
    csvRecipe: "Receta",
    csvMaterial: "Material",
    csvCalculatedTable: "Tabla calculada",
    filenameDiagram: "diagrama",
    filenameRecipes: "recetas",
    filenamePoints: "puntos",
    blendTypeLine: "lineal",
    blendTypeTriaxial: "triaxial",
    blendTypeBiaxial: "biaxial",
  },
  en: {
    pageTitle: "Volumetric Blend Calculator",
    blendTypeLabel: "Blend type",
    optionLine: "Linear",
    optionTriaxial: "Triaxial",
    optionBiaxial: "Biaxial",
    sampleSizeLabel: "Sample size (ml)",
    numberPlaceholder: "Enter a number",
    pointsLabel: "Points",
    pointsLabelTriaxial: "Side points",
    rowsLabel: "Rows",
    columnsLabel: "Columns",
    totalPointsLabel: "Total points:",
    recalculateButton: "Recalculate",
    tabDiagram: "Diagram",
    tabRecipes: "Recipes",
    downloadPngButton: "Download PNG",
    downloadCsvButton: "Download CSV",
    exportRecipesButton: "Export JSON",
    importRecipesButton: "Import JSON",
    clearRecipesButton: "Clear recipes",
    recipeTitleA: "Recipe A",
    recipeTitleB: "Recipe B",
    recipeTitleC: "Recipe C",
    recipeTitleD: "Recipe D",
    recipeMaterial: "Material",
    recipePercent: "%",
    recipeAdditive: "Add.",
    recipeTotalBaseLabel: "Base total:",
    recipeTotalAdditivesLabel: "Additives total:",
    minTotalMlNote:
      "Minimum amount needed of each corner glaze: {amount} ml",
    recipesTableTitle: "Table of {count} recipes",
    baseMaterialsLabel: "Base materials",
    additivesLabel: "Additives",
    selectMaterialOption: "Select a material",
    removeMaterialLabel: "Remove material",
    noMaterialMatches: "No matches",
    aboutTitle: "About this page",
    aboutIntro:
      "This tool generates blend diagrams —linear, triaxial and biaxial— to help you design ceramic glaze tests using the volumetric method. I started building it for my own experiments and I'm sharing it here in case it's useful to someone else.",
    aboutVolumetricTitle: "What is the volumetric method?",
    aboutVolumetricBody:
      "It's an experimentation technique for glazes that lets you generate dozens of intermediate combinations between two, three or four starting glazes without weighing each one separately. Instead of using a scale at every point of the blend, volumes are measured in milliliters, usually with a syringe or similar.",
    aboutPrincipleTitle: "The principle behind it",
    aboutPrincipleBody:
      "Each corner glaze is prepared with an exactly equal dry weight of materials and topped up with water to the same final volume. By fixing those two values in advance, every corner slip ends up with the same concentration of solids per milliliter, even though their compositions are completely different. This means one milliliter from any corner always contributes the same amount of dry grams. As a result, measuring volumes at the intermediate points is exactly equivalent to blending the glazes in those same weight proportions.",
    aboutUsageTitle: "How to use it",
    aboutUsageBody:
      "Working out the volume (ml) for each point of an intermediate blend by hand and writing it down is tedious. With this tool, you set the blend type, the sample size you want to prepare, and how many intermediate points to generate, and it automatically calculates how many milliliters of each corner glaze you need to add at each point. If you also enter the corner glaze recipes in the Recipes tab, the tool will generate every recipe for each intermediate point too. You can download the diagrams as PNG and the recipes as CSV to print or save them.",
    footerCredit: "Made by Esperanza Moreno Cruz",
    footerLicenseLabel: "License",
    rangeExact: "between {min} and {max}",
    rangeMin: "at least {min}",
    meetsRangeError: "Enter {range} {label} to draw the diagram.",
    labelPoints: "points",
    labelRows: "rows",
    labelColumns: "columns",
    invalidPointsAlert: "Please enter a valid integer for Points.",
    confirmClearRecipes: "Clear all recipes? This action cannot be undone.",
    cancelButton: "Cancel",
    importInvalidFile: "The file isn't valid.",
    importDroppedRows:
      "{count} row(s) were dropped because the material no longer exists.",
    importReplaceWarning:
      "You're about to import recipes. Any data already entered in the current recipes will be lost, and this action cannot be undone.",
    importBlendTypeMismatch:
      "The file has data for {importedCount} recipes, but the current blend type ({currentBlendType}) only uses {currentCount}. Switch to {targetBlendType} to keep them all? If you don't switch, the recipes that don't fit in {currentBlendType} will be lost.",
    importConfirmButton: "Import recipes",
    importKeepBlendTypeButton: "Import, keep {currentBlendType}",
    importSwitchBlendTypeButton: "Import, switch to {targetBlendType}",
    csvBaseRecipes: "Base recipes",
    csvRecipe: "Recipe",
    csvMaterial: "Material",
    csvCalculatedTable: "Calculated table",
    filenameDiagram: "diagram",
    filenameRecipes: "recipes",
    filenamePoints: "points",
    blendTypeLine: "linear",
    blendTypeTriaxial: "triaxial",
    blendTypeBiaxial: "biaxial",
  },
};

export function getLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "en" ? "en" : "es";
}

export function setLang(lang) {
  localStorage.setItem(STORAGE_KEY, lang === "en" ? "en" : "es");
}

/**
 * Looks up a translation key for the active language, falling back to
 * Spanish then to the key itself. `vars` fills in "{name}" placeholders.
 * @param {string} key
 * @param {Object} [vars]
 * @returns {string}
 */
export function t(key, vars) {
  const lang = getLang();
  let text = translations[lang][key] ?? translations.es[key] ?? key;
  if (vars) {
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replaceAll(`{${name}}`, value);
    });
  }
  return text;
}

/**
 * Picks a material's display name for the active language. Material
 * records always carry both `materialName` (English) and
 * `materialName_es` (Spanish) — see docs/data/materials.json.
 * @param {Object} material
 * @returns {string}
 */
export function materialName(material) {
  return getLang() === "en" ? material.materialName : material.materialName_es;
}

/**
 * Text to match a material against when searching: its display name
 * plus whatever alternative names it's known by (e.g. "Creta" also
 * matches "Carbonato de Calcio") - see `searchName`/`searchName_es` in
 * docs/data/materials.json.
 * @param {Object} material
 * @returns {string}
 */
export function materialSearchText(material) {
  const aliases = getLang() === "en" ? material.searchName : material.searchName_es;
  return aliases ? `${materialName(material)} ${aliases}` : materialName(material);
}

/**
 * Applies the active language to every element tagged with
 * `data-i18n`/`data-i18n-placeholder`/`data-i18n-aria-label`, plus
 * <title> and <html lang>. Doesn't touch anything generated
 * dynamically (diagram, recipe selects/table) — callers re-render
 * those separately after switching.
 */
export function applyStaticTranslations() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.title = t("pageTitle");

  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach(el => {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
  });
}
