// src/components/spiral.js
import * as d3 from "d3";

export function renderSpiral(
  svgElement,
  monthlyData,
  currentYear,
  currentMonth,
  currentLoc,
  currentLevel,
  useAbsolute = false
) {
  const svg = d3.select(svgElement);
  svg.style("font-family", "consolas");
  svg.selectAll("*").remove();

  const width = 928;
  const height = 600;
  const titleX = 16;
  const titleY = 24;

  const center = [width / 2, height / 2 + 18];

  if (!monthlyData || monthlyData.length === 0) return;

  const monthNames = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ];

  // 1. Filter and sort data for the selected scope
  const filteredData = monthlyData.filter(d =>
    d.Level === currentLevel &&
    (d.Location_Name === currentLoc || d.ISO_Code === currentLoc)
  );

  // Pick the value field based on mode
  const valueField = useAbsolute ? "AverageTemperature" : "Temp_Anomaly";

  const sortedData = filteredData
    .map(d => ({
      Year: +d.Year,
      Month: +d.Month,
      Temp_Anomaly: +d.Temp_Anomaly,
      AverageTemperature: +d.AverageTemperature,
      value: useAbsolute ? +d.AverageTemperature : +d.Temp_Anomaly
    }))
    .filter(d => !isNaN(d.Year) && !isNaN(d.Month) && !isNaN(d.value))
    .sort((a, b) => a.Year - b.Year || a.Month - b.Month);

  if (sortedData.length === 0) return;

  // 2. Slice data up to the active year-month
  const maxIndex = sortedData.findIndex(
    d => d.Year === currentYear && d.Month === currentMonth
  );

  const dataToDraw =
    maxIndex !== -1 ? sortedData.slice(0, maxIndex + 1) : sortedData;

  // 3. Group by year and add January bridge for wrap-around
  const yearGroups = [];

  for (const [year, yearData] of d3.group(dataToDraw, d => d.Year)) {
    const plotData = yearData.map(d => ({
      ...d,
      PlotMonth: d.Month
    }));

    const nextJan = sortedData.find(
      d => d.Year === year + 1 && d.Month === 1
    );

    if (
      nextJan &&
      (year < currentYear || (year === currentYear && currentMonth === 12))
    ) {
      plotData.push({
        ...nextJan,
        PlotMonth: 13
      });
    }

    yearGroups.push({ year, plotData });
  }

  // 4. Scales — adapt to mode
  const values = sortedData.map(d => d.value).filter(v => !isNaN(v));
  const minData = d3.min(values) ?? -1.5;
  const maxData = d3.max(values) ?? 2.0;

  let radiusScale, colorScale, tickValues;

  if (useAbsolute) {
    const mean = d3.mean(values);
    const std = d3.deviation(values) || 1;

    // Centre on mean, spread by ±2 standard deviations
    // This ensures seasonal variation always fills the spiral
    // even when the absolute range is narrow at global level
    radiusScale = d3.scaleLinear()
      .domain([mean - 2 * std, mean + 2 * std])
      .range([80, 260]);

    colorScale = d3.scaleSequential(
      [mean + 2 * std, mean - 2 * std],
      d3.interpolateRdYlBu
    );

    tickValues = d3.ticks(mean - 2 * std, mean + 2 * std, 4);

  } else {
    // Anomaly mode: symmetric around zero
    const absMax = Math.max(Math.abs(minData), Math.abs(maxData), 0.1);
    radiusScale = d3.scaleLinear()
      .domain([-absMax, absMax])
      .range([75, 235]);

    colorScale = d3.scaleSequential(
      [absMax, -absMax],
      d3.interpolateRdYlBu
    );

    tickValues = [-absMax, -absMax / 2, 0, absMax / 2, absMax];
  }

  const angleScale = d3.scaleLinear()
    .domain([1, 13])
    .range([0, 2 * Math.PI]);

  const g = svg.append("g");

  // Title — matches charts.js style exactly
  const contNames = { GLB: "Global", EUR: "Europe", ASI: "Asia", AFR: "Africa", AME: "Americas", OCE: "Oceania" };
  const locationLabel = currentLevel === "Global"
    ? "Global"
    : currentLevel === "Continent"
      ? (contNames[currentLoc] || currentLoc)
      : (filteredData[0]?.Location_Name || currentLoc);
  const modeLabel = useAbsolute ? "Absolute Temperature" : "Temperature Anomaly";

  const titleGroup = svg.append("g")
    .attr("class", "spiral-title")
    .attr("transform", `translate(${titleX}, ${titleY})`);

  titleGroup.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .attr("text-anchor", "start")
    .attr("dominant-baseline", "hanging")
    .attr("fill", "#ffffff")
    .attr("font-size", "32px")
    .attr("font-weight", "bold")
    .style("paint-order", "stroke")
    .style("stroke", "#000000")
    .style("stroke-width", 2)
    .text(`${locationLabel}: Hawkins Spiral`);

  titleGroup.append("text")
    .attr("x", 0)
    .attr("y", 36)
    .attr("text-anchor", "start")
    .attr("dominant-baseline", "hanging")
    .attr("fill", "#94a3b8")
    .attr("font-size", "24px")
    .attr("font-weight", "bold")
    .text(modeLabel);

  /*svg.append("text")
    .attr("x", 16)
    .attr("y", 28)
    .attr("fill", "#ffffff")
    .attr("font-size", "18px")
    .attr("font-weight", "bold")
    .style("paint-order", "stroke")
    .style("stroke", "#000000")
    .style("stroke-width", 2)
    .text(`${locationLabel} Hawkins Spiral`);

  svg.append("text")
    .attr("x", 16)
    .attr("y", 46)
    .attr("fill", "#94a3b8")
    .attr("font-size", "13px")
    .attr("font-weight", "bold")
    .text(modeLabel);*/

  // 5. Reference rings
  tickValues.forEach(t => {
    const r = radiusScale(t);
    if (r < 0) return; // skip if out of range
    const isZero = Math.abs(t) < 1e-9;

    g.append("circle")
      .attr("cx", center[0])
      .attr("cy", center[1])
      .attr("r", r)
      .attr("fill", "none")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", isZero ? 2.5 : 1.5)
      .attr("opacity", isZero ? 0.8 : 0.4);

    const label = useAbsolute
      ? `${t.toFixed(1)}°C`
      : `${t > 0 ? "+" : ""}${t.toFixed(1)}°C`;

    g.append("text")
      .attr("x", center[0])
      .attr("y", center[1] - r - 6)
      .attr("fill", "#ffffff")
      .attr("font-size", "13px")
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .style("paint-order", "stroke")
      .style("stroke", "#000000")
      .style("stroke-width", 1)
      .text(label);

    // ADD: bottom label (mirror position)
    g.append("text")
      .attr("x", center[0])
      .attr("y", center[1] + r + 16)
      .attr("fill", "#ffffff")
      .attr("font-size", "13px")
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .style("paint-order", "stroke")
      .style("stroke", "#000000")
      .style("stroke-width", 1)
      .text(label);
  });

  // 6. Month labels around the spiral
  monthNames.forEach((m, i) => {
    const angle = (i / 12) * (2 * Math.PI) - Math.PI / 2;

    g.append("text")
      .attr("x", center[0] + 255 * Math.cos(angle))
      .attr("y", center[1] + 255 * Math.sin(angle) + 4)
      .attr("fill", "#94a3b8")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("text-anchor", "middle")
      .text(m);
  });

  // 7. Center watermark-style year
  g.append("text")
    .attr("x", center[0])
    .attr("y", center[1] + 40)
    .attr("fill", "#ffffff")
    .attr("font-size", "120px")
    .attr("font-weight", "900")
    .attr("opacity", 0.16)
    .attr("text-anchor", "middle")
    .style("paint-order", "stroke")
    .style("stroke", "#000000")
    .style("stroke-width", 2)
    .style("pointer-events", "none")
    .text(currentYear);

  // 8. Month counter watermark
  g.append("text")
    .attr("x", center[0])
    .attr("y", center[1] + 80)
    .attr("fill", "#ffffff")
    .attr("font-size", "24px")
    .attr("font-weight", "900")
    .attr("opacity", 0.4)
    .attr("text-anchor", "middle")
    .style("paint-order", "stroke")
    .style("stroke", "#000000")
    .style("stroke-width", 2)
    .style("pointer-events", "none")
    .text(monthNames[currentMonth - 1]);

  // 9. Radial line generator — uses d.value
  const lineRadial = d3.lineRadial()
    .angle(d => angleScale(d.PlotMonth))
    .radius(d => radiusScale(d.value))
    .defined(d => d.value !== undefined && !isNaN(d.value))
    .curve(d3.curveCatmullRom.alpha(0.5));

  // 10. Layers
  const pastGroup = g.append("g")
    .attr("transform", `translate(${center[0]}, ${center[1]})`);

  const activeGroup = g.append("g")
    .attr("transform", `translate(${center[0]}, ${center[1]})`);

  for (const group of yearGroups) {
    const isCurrentYear = group.year === currentYear;
    const targetGroup = isCurrentYear ? activeGroup : pastGroup;

    targetGroup.append("path")
      .datum(group.plotData)
      .attr("fill", "none")
      .attr("stroke", () => {
        const avg = d3.mean(group.plotData.filter(m => m.PlotMonth <= 12), m => m.value);
        return colorScale(avg);
      })
      .attr("stroke-width", isCurrentYear ? 2.5 : 1.5)
      .attr("opacity", isCurrentYear ? 0.9 : 0.35)
      .attr("d", lineRadial);
  }
}