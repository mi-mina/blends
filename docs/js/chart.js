import {
  pointSide,
  pointR,
  sep,
  margin,
  verticalGutter,
  colorA,
  colorB,
  colorC,
  colorD,
} from "./constants.js";
import {
  blendColors,
  formatNumber,
  formatPercentage,
  getContrastTextColor,
} from "./utils.js";
import { t } from "./i18n.js";

///////////////////////////////////////////////////////////////////////////////
// Functions to draw blends ///////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Geometry for each corner count: where each corner's colored box sits
 * relative to the point center, and where its percentage/ml labels go.
 * `anchor` is only set when it differs from the SVG default ("start").
 */
const CORNER_LAYOUTS = {
  2: {
    boxes: [
      { corner: "1", x: -pointSide / 2, y: -pointSide, color: colorA },
      { corner: "2", x: -pointSide / 2, y: 0, color: colorB },
    ],
    percentageLabels: [
      { corner: "1", x: -pointSide * 0.45, y: -pointSide * 0.85 },
      { corner: "2", x: pointSide * 0.45, y: pointSide * 0.85, anchor: "end" },
    ],
    mlLabels: [
      { corner: "1", x: 0, y: -pointSide * 0.5 },
      { corner: "2", x: 0, y: pointSide * 0.5 },
    ],
  },
  3: {
    boxes: [
      { corner: "1", x: -pointSide * 0.5, y: -pointSide, color: colorA },
      { corner: "2", x: -pointSide, y: 0, color: colorB },
      { corner: "3", x: 0, y: 0, color: colorC },
    ],
    percentageLabels: [
      { corner: "1", x: -pointSide * 0.45, y: -pointSide * 0.85 },
      { corner: "2", x: -pointSide * 0.95, y: pointSide * 0.85 },
      { corner: "3", x: pointSide * 0.95, y: pointSide * 0.85, anchor: "end" },
    ],
    mlLabels: [
      { corner: "1", x: 0, y: -pointSide * 0.5 },
      { corner: "2", x: -pointSide * 0.5, y: pointSide * 0.5 },
      { corner: "3", x: pointSide * 0.5, y: pointSide * 0.5 },
    ],
  },
  4: {
    boxes: [
      { corner: "1", x: -pointSide, y: -pointSide, color: colorA },
      { corner: "2", x: 0, y: -pointSide, color: colorB },
      { corner: "3", x: -pointSide, y: 0, color: colorC },
      { corner: "4", x: 0, y: 0, color: colorD },
    ],
    percentageLabels: [
      { corner: "1", x: -pointSide * 0.95, y: -pointSide * 0.85 },
      { corner: "2", x: pointSide * 0.95, y: -pointSide * 0.85, anchor: "end" },
      { corner: "3", x: -pointSide * 0.95, y: pointSide * 0.85 },
      { corner: "4", x: pointSide * 0.95, y: pointSide * 0.85, anchor: "end" },
    ],
    mlLabels: [
      { corner: "1", x: -pointSide * 0.5, y: -pointSide * 0.5 },
      { corner: "2", x: pointSide * 0.5, y: -pointSide * 0.5 },
      { corner: "3", x: -pointSide * 0.5, y: pointSide * 0.5 },
      { corner: "4", x: pointSide * 0.5, y: pointSide * 0.5 },
    ],
  },
};

/**
 * Removes the previous diagram before measuring #graph, so a leftover
 * scrollbar from it can't skew the size measured for the new one.
 */
function clearGraph() {
  d3.select(`#graph`).selectAll("*").remove();
}

/**
 * Draws a blend chart: lays out one group per point using
 * `pointTransform`, and renders the corner boxes/circle/labels from
 * `corners` (one of CORNER_LAYOUTS[2|3|4]). The geometry that genuinely
 * differs between blend types (SVG size, point positions) is passed in by
 * each drawX function below instead of living here.
 * @param {Array} data - The blend data to visualize.
 * @param {Object} options
 * @param {Object} options.corners - Entry from CORNER_LAYOUTS.
 * @param {number} options.svgWidth
 * @param {number} options.svgHeight
 * @param {string} options.chartTransform
 * @param {Function} options.pointTransform - (d, i) => transform string.
 * @param {Map<number, Object>} [options.cornerLabels] - Maps a point number
 * to { letter, x, y, anchor } for the pure corner it represents. x/y are
 * relative to that point's own origin, positioned outside its boxes.
 * @param {string} options.ariaLabel - Accessible name for the diagram,
 * since it's otherwise just shapes/text with no name a screen reader
 * would announce (the same data is also available as the recipes table).
 */
function renderBlendChart(
  data,
  {
    corners,
    svgWidth,
    svgHeight,
    chartTransform,
    pointTransform,
    cornerLabels,
    ariaLabel,
  }
) {
  const svg = d3
    .select(`#graph`)
    .append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .attr("role", "img")
    .attr("aria-label", ariaLabel)
    .style("user-select", "none")
    .style("font-family", "ui-sans-serif, system-ui, sans-serif");

  const chartContainer = svg.append("g").attr("transform", chartTransform);

  const pointContainer = chartContainer
    .selectAll(".pointContainer")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "pointContainer")
    .attr("transform", pointTransform);

  // Colored boxes, one per corner
  corners.boxes.forEach(box => {
    pointContainer
      .append("rect")
      .attr("x", box.x)
      .attr("y", box.y)
      .attr("width", pointSide)
      .attr("height", pointSide)
      .style("fill", box.color)
      .style("fill-opacity", d => d.percentages[box.corner] / 100)
      .style("stroke", "black")
      .style("stroke-width", 1);
  });

  // Circle with the blended color
  const colors = corners.boxes.map(box => box.color);
  pointContainer
    .append("circle")
    .attr("r", pointR)
    .style("fill", d => blendColors(colors, Object.values(d.percentages)))
    .style("stroke", "black")
    .style("stroke-width", 1);

  // Point number - same blended color as the circle it sits on, so its
  // contrast is computed rather than assuming black always reads fine
  // (true for every single corner color here, but not guaranteed once
  // they're blended together).
  pointContainer
    .append("text")
    .attr("x", 0)
    .attr("y", 0)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .style("font-size", "0.8em")
    .style("fill", d =>
      getContrastTextColor(blendColors(colors, Object.values(d.percentages))),
    )
    .text(d => d.point);

  // Corner letter (A, B, C, D), outside the pure corner points only
  if (cornerLabels && cornerLabels.size) {
    const cornerText = pointContainer
      .filter(d => cornerLabels.has(d.point))
      .append("text")
      .attr("x", d => cornerLabels.get(d.point).x)
      .attr("y", d => cornerLabels.get(d.point).y)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => cornerLabels.get(d.point).anchor)
      .style("font-size", "1.5em")
      .style("font-weight", "bold");
    cornerText.text(d => cornerLabels.get(d.point).letter);
  }

  // Percentage labels
  corners.percentageLabels.forEach(label => {
    const text = pointContainer
      .append("text")
      .attr("x", label.x)
      .attr("y", label.y)
      .attr("dy", "0.35em")
      .style("font-size", "0.6em");
    if (label.anchor) text.attr("text-anchor", label.anchor);
    text.text(d => formatPercentage(d.percentages[label.corner]));
  });

  // Milliliter labels
  corners.mlLabels.forEach(label => {
    pointContainer
      .append("text")
      .attr("x", label.x)
      .attr("y", label.y)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("font-size", "1.2em")
      .text(d => formatNumber(d.ml[label.corner]));
  });
}

/**
 * Draws a linear blend chart using D3.js.
 * @param {Array} data - The blend data to visualize.
 * @description Each object in the data array should contain the point index, percentages for each corner, and milliliters for each corner.
 * @returns {{x: number, y: number}} The bottom-left corner of point A's box
 * (the bottom-left-most point in this layout), for anchoring the min-ml note.
 */
export function drawLinearBlend(data) {
  clearGraph();

  const svgWidth =
    pointSide * data.length +
    sep * (data.length - 1) +
    margin.left +
    margin.right;
  // Corner letters here sit beside the endpoints (see cornerLabels below),
  // not above/below them, so top/bottom only need a small gutter, not the
  // full `margin` reserved for corner labels on the other two blend types.
  const svgHeight = pointSide * 2 + verticalGutter * 2;
  const chartY = pointSide / 2 + verticalGutter;

  const cornerLabels = new Map([
    [
      data[0].point,
      { letter: "A", x: -(pointSide / 2 + 14), y: 0, anchor: "end" },
    ],
    [
      data[data.length - 1].point,
      { letter: "B", x: pointSide / 2 + 14, y: 0, anchor: "start" },
    ],
  ]);

  renderBlendChart(data, {
    corners: CORNER_LAYOUTS[2],
    svgWidth,
    svgHeight,
    chartTransform: `translate(${margin.left + pointSide / 2}, ${chartY})`,
    pointTransform: (d, i) => {
      const x = i * (pointSide + sep);
      const y = pointSide / 2;
      return `translate(${x}, ${y})`;
    },
    cornerLabels,
    ariaLabel: t("diagramAriaLabel", {
      blendType: t("blendTypeLine"),
      count: data.length,
    }),
  });

  return { x: margin.left, y: svgHeight - verticalGutter };
}

/**
 * Draws a triaxial blend chart using D3.js.
 * @param {Array} data - The triaxial blend data to visualize.
 * @description Each object in the data array should contain the point index, position in the triangle, percentages for each corner, and milliliters for each corner.
 * @returns {{x: number, y: number}} The bottom-left corner of the baseLeft
 * point's box (the bottom-left-most point in this layout), for anchoring
 * the min-ml note.
 */
export function drawTriaxialBlend(data) {
  clearGraph();

  const numberOfRows = data[data.length - 1].position[1] + 1;

  const svgWidth =
    pointSide * 2 * numberOfRows +
    sep * (numberOfRows - 1) +
    margin.left +
    margin.right;
  // Only the apex label (above) needs top margin - the base corner labels
  // sit beside the base row, not below it - so bottom only needs a small
  // gutter, not the full `margin` reserved for the apex. `pointSide * 2`
  // per row (rather than `pointSide * (2 * numberOfRows - 1)`) would
  // over-count by one pointSide, since only the topmost row's box
  // extends a full pointSide *above* its own row origin - the bottom
  // row's box doesn't extend an equivalent pointSide *below* the space
  // already reserved for it.
  const svgHeight =
    pointSide * (2 * numberOfRows - 1) +
    sep * (numberOfRows - 1) +
    margin.top +
    verticalGutter;

  // Scale to position points in a triangular grid
  const xScale = pointSide * 2 + sep;
  const yScale = pointSide * 2 + sep;

  const apex = data.find(d => d.position[0] === 0 && d.position[1] === 0);
  const baseLeft = data.find(
    d => d.position[0] === 0 && d.position[1] === numberOfRows - 1
  );
  const baseRight = data.find(
    d =>
      d.position[0] === numberOfRows - 1 && d.position[1] === numberOfRows - 1
  );
  const cornerLabels = new Map([
    [
      apex.point,
      { letter: "A", x: 0, y: -(pointSide + 14), anchor: "middle" },
    ],
    [
      baseLeft.point,
      {
        letter: "B",
        x: -(pointSide + 14),
        y: pointSide / 2,
        anchor: "end",
      },
    ],
    [
      baseRight.point,
      {
        letter: "C",
        x: pointSide + 14,
        y: pointSide / 2,
        anchor: "start",
      },
    ],
  ]);

  renderBlendChart(data, {
    corners: CORNER_LAYOUTS[3],
    svgWidth,
    svgHeight,
    chartTransform: `translate(${margin.left}, ${margin.top})`,
    pointTransform: d => {
      const t = ((numberOfRows - d.position[1]) * xScale) / 2;
      const x = t + d.position[0] * xScale;
      const y = d.position[1] * yScale;
      return `translate(${x}, ${y})`;
    },
    cornerLabels,
    ariaLabel: t("diagramAriaLabel", {
      blendType: t("blendTypeTriaxial"),
      count: data.length,
    }),
  });

  return {
    x: margin.left + xScale / 2 - pointSide,
    y: margin.top + (numberOfRows - 1) * yScale + pointSide,
  };
}

/**
 * Draws a biaxial blend chart using D3.js.
 * @param {Array} data - The biaxial blend data to visualize.
 * @description Each object in the data array should contain the position, point index, percentages for each corner, and milliliters for each corner.
 * @returns {{x: number, y: number}} The bottom-left corner of the
 * bottomLeft point's box (the bottom-left-most point in this layout), for
 * anchoring the min-ml note.
 */
export function drawBiaxialBlend(data) {
  clearGraph();

  const numberOfRows = Math.max(...data.map(d => d.position[1])) + 1;
  const numberOfColumns = Math.max(...data.map(d => d.position[0])) + 1;

  const svgWidth =
    pointSide * 2 * numberOfColumns +
    sep * (numberOfColumns - 1) +
    margin.left +
    margin.right;
  // Every corner label sits beside its corner (x offset only, see
  // cornerLabels below), never above/below it, so top/bottom only need a
  // small gutter, not the full `margin` reserved for the left/right
  // labels. See the equivalent comment in drawTriaxialBlend() for why
  // it's `pointSide * (2 * numberOfRows - 1)`, not `pointSide * 2 * numberOfRows`.
  const svgHeight =
    pointSide * (2 * numberOfRows - 1) +
    sep * (numberOfRows - 1) +
    margin.top +
    verticalGutter;

  const topLeft = data.find(d => d.position[0] === 0 && d.position[1] === 0);
  const topRight = data.find(
    d => d.position[0] === numberOfColumns - 1 && d.position[1] === 0
  );
  const bottomLeft = data.find(
    d => d.position[0] === 0 && d.position[1] === numberOfRows - 1
  );
  const bottomRight = data.find(
    d =>
      d.position[0] === numberOfColumns - 1 &&
      d.position[1] === numberOfRows - 1
  );
  const cornerLabels = new Map([
    [
      topLeft.point,
      {
        letter: "A",
        x: -(pointSide + 14),
        y: -pointSide / 2,
        anchor: "end",
      },
    ],
    [
      topRight.point,
      {
        letter: "B",
        x: pointSide + 14,
        y: -pointSide / 2,
        anchor: "start",
      },
    ],
    [
      bottomLeft.point,
      {
        letter: "C",
        x: -(pointSide + 14),
        y: pointSide / 2,
        anchor: "end",
      },
    ],
    [
      bottomRight.point,
      {
        letter: "D",
        x: pointSide + 14,
        y: pointSide / 2,
        anchor: "start",
      },
    ],
  ]);

  renderBlendChart(data, {
    corners: CORNER_LAYOUTS[4],
    svgWidth,
    svgHeight,
    chartTransform: `translate(${margin.left}, ${margin.top})`,
    pointTransform: d => {
      const x = d.position[0] * (pointSide * 2 + sep);
      const y = d.position[1] * (pointSide * 2 + sep);
      return `translate(${x}, ${y})`;
    },
    cornerLabels,
    ariaLabel: t("diagramAriaLabel", {
      blendType: t("blendTypeBiaxial"),
      count: data.length,
    }),
  });

  return {
    x: margin.left - pointSide,
    y: margin.top + (numberOfRows - 1) * (pointSide * 2 + sep) + pointSide,
  };
}
