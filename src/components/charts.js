// src/components/charts.js
import * as d3 from "d3";

export function createEmissionChart(annualData, countryToContinent, onNavigate) {
  const width = 928;
  const height = 500;
  const margin = {top: 40, right: 120, bottom: 50, left: 60};

  let currentLevel = "Global";
  let currentLoc = "GLB";

  const xScale = d3.scaleLinear().range([margin.left, width - margin.right]);
  const yScale = d3.scaleLinear().domain([-1.5, 2.5]).range([height - margin.bottom, margin.top]);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .style("background-color", "#161b22")
    .style("font-family", "sans-serif");

  svg.append("style").text(`
    .chart-axis path.domain { display: none; }
    .chart-axis .tick line { stroke: #334155; stroke-dasharray: 3,3; }
    .chart-axis .tick text { fill: #94a3b8; font-size: 12px; }
    .comet-dot { cursor: pointer; }
  `);

  const defs = svg.append("defs");
  defs.append("clipPath")
    .attr("id", "chart-clip")
    .append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top - 10)
    .attr("width", width - margin.left - margin.right + 20)
    .attr("height", height - margin.top - margin.bottom + 20);

  svg.append("text").attr("id", "watermark-year").attr("x", width - margin.right).attr("y", margin.top + 100).attr("fill", "#ffffff").attr("font-size", "140px").attr("font-weight", "bold").attr("opacity", 0.2).attr("text-anchor", "end").style("pointer-events", "none");

  const xAxis = d3.axisBottom(xScale).ticks(8).tickFormat(d => d >= 1000 ? (d/1000) + "K" : d).tickSize(-height + margin.top + margin.bottom);
  const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat(d => d > 0 ? `+${d}` : d).tickSize(-width + margin.left + margin.right);

  const xAxisG = svg.append("g").attr("class", "chart-axis x-axis").attr("transform", `translate(0, ${height - margin.bottom})`);
  const yAxisG = svg.append("g").attr("class", "chart-axis y-axis").attr("transform", `translate(${margin.left}, 0)`);

  svg.append("text").attr("x", width / 2).attr("y", height - 10).attr("fill", "#ffffff").attr("font-size", "13px").attr("font-weight", "bold").attr("text-anchor", "middle").text("Sum of Emission (MtCO2)");
  svg.append("text").attr("transform", "rotate(-90)").attr("x", -height / 2).attr("y", 20).attr("fill", "#ffffff").attr("font-size", "13px").attr("font-weight", "bold").attr("text-anchor", "middle").text("Temperature Anomaly (°C)");

  svg.append("g").attr("id", "comet-trails").attr("clip-path", "url(#chart-clip)");
  svg.append("g").attr("id", "comet-dots").attr("clip-path", "url(#chart-clip)");
  svg.append("g").attr("id", "comet-labels").attr("clip-path", "url(#chart-clip)");

  // Safe Right-Click Drill Up
  svg.on("contextmenu", (e) => {
      e.preventDefault();
      if (currentLevel === "Country") {
          onNavigate("Continent", countryToContinent.get(currentLoc));
      } else if (currentLevel === "Continent") {
          onNavigate("Global", "GLB");
      }
  });

  // The Updater Function
  function update(year, level, loc) {
    currentLevel = level;
    currentLoc = loc;

    let entityLevel = level === "Global" ? "Continent" : "Country";
    let filterContinent = level === "Global" ? null : (level === "Continent" ? loc : countryToContinent.get(loc));

    let allYearsData = annualData.filter(d => d.Level === entityLevel);
    if (filterContinent) {
       allYearsData = allYearsData.filter(d => 
         entityLevel === "Continent" ? d.ISO_Code === filterContinent : countryToContinent.get(d.ISO_Code) === filterContinent
       );
    }

    let maxEmissionBasis = level === "Country" ? allYearsData.filter(d => d.ISO_Code === loc) : allYearsData;
    const localMaxEmission = d3.max(maxEmissionBasis, d => d.Emissions_MtCO2) || 10;
    xScale.domain([0, localMaxEmission * 1.05]);

    let chartData = allYearsData.filter(d => d.Year <= year);
    const groupedData = Array.from(d3.group(chartData, d => d.ISO_Code).entries());
    
    const colorScale = d3.scaleSequential([2, -2], d3.interpolateRdYlBu);
    const lineGen = d3.line().x(d => xScale(d.Emissions_MtCO2)).y(d => yScale(d.Temp_Anomaly)).curve(d3.curveCatmullRom.alpha(0.5));
    const contNames = { "EUR": "Europe", "ASI": "Asia", "AFR": "Africa", "AME": "Americas", "OCE": "Oceania" };

    svg.select("#watermark-year").text(year);

    const t = svg.transition().duration(400).ease(d3.easeLinear);

    xAxisG.transition(t).call(xAxis);
    yAxisG.transition(t).call(yAxis);

    /*
    svg.select("#comet-trails").selectAll("path").data(groupedData, d => d[0])
      .join(
         enter => enter.append("path").attr("fill", "none").attr("d", d => lineGen(d[1])),
         update => update.call(update => update.transition(t).attr("d", d => lineGen(d[1])))
      )
      .attr("stroke", d => colorScale(d[1][d[1].length - 1].Temp_Anomaly))
      .attr("stroke-width", 2.5)
      .attr("opacity", d => (level === "Country" && d[0] !== loc) ? 0.0 : 0.35);
    */

    svg.select("#comet-dots").selectAll("circle").data(groupedData, d => d[0])
      .join(
         enter => enter.append("circle").attr("class", "comet-dot").attr("cx", d => xScale(d[1][d[1].length - 1].Emissions_MtCO2)).attr("cy", d => yScale(d[1][d[1].length - 1].Temp_Anomaly)),
         update => update.call(update => update.transition(t).attr("cx", d => xScale(d[1][d[1].length - 1].Emissions_MtCO2)).attr("cy", d => yScale(d[1][d[1].length - 1].Temp_Anomaly)))
      )
      .attr("r", 9).attr("fill", d => colorScale(d[1][d[1].length - 1].Temp_Anomaly)).attr("stroke", "#ffffff").attr("stroke-width", 1.5)
      .attr("opacity", d => (level === "Country" && d[0] !== loc) ? 0.0 : 1.0)
      .on("click", (e, d) => {
          const clickedLoc = d[0];
          if (level === "Global") onNavigate("Continent", clickedLoc);
          else if (level === "Continent" || (level === "Country" && clickedLoc !== loc)) onNavigate("Country", clickedLoc);
      });

    svg.select("#comet-labels").selectAll("text").data(groupedData, d => d[0])
      .join(
         enter => enter.append("text").attr("x", d => xScale(d[1][d[1].length - 1].Emissions_MtCO2) + 14).attr("y", d => yScale(d[1][d[1].length - 1].Temp_Anomaly) + 4),
         update => update.call(update => update.transition(t).attr("x", d => xScale(d[1][d[1].length - 1].Emissions_MtCO2) + 14).attr("y", d => yScale(d[1][d[1].length - 1].Temp_Anomaly) + 4))
      )
      .attr("fill", "#f8fafc").attr("font-size", "13px").attr("font-weight", "bold").attr("filter", "drop-shadow(0px 2px 2px rgba(0,0,0,0.8))")
      .attr("opacity", d => (level === "Country" && d[0] !== loc) ? 0.0 : 1.0)
      .text(d => level === "Global" ? (contNames[d[0]] || d[0]) : d[1][d[1].length - 1].Location_Name);
  }

  return { element: svg.node(), update };
}

export function renderDualAxisChart(svgElement, annualData, year, level, loc) {
  const width = 928;
  const height = 350;
  const margin = {top: 60, right: 80, bottom: 40, left: 80};

  const svg = d3.select(svgElement);
  svg.selectAll("*").remove(); 

  let chartData = annualData.filter(d => d.Level === level);
  if (level !== "Global") chartData = chartData.filter(d => d.ISO_Code === loc);
  else chartData = chartData.filter(d => d.ISO_Code === "GLB"); 
  
  chartData.sort((a, b) => a.Year - b.Year);
  const pastData = chartData.filter(d => d.Year <= year);

  const xScale = d3.scaleLinear().domain([1900, 2013]).range([margin.left, width - margin.right]);
  const maxEmission = d3.max(chartData, d => d.Emissions_MtCO2) || 10;
  const yEmissionScale = d3.scaleLinear().domain([0, maxEmission * 1.05]).range([height - margin.bottom, margin.top]);
  const minTemp = d3.min(chartData, d => d.Temp_Anomaly) || -1;
  const maxTemp = d3.max(chartData, d => d.Temp_Anomaly) || 1;
  const yTempScale = d3.scaleLinear().domain([minTemp - 0.2, maxTemp + 0.2]).range([height - margin.bottom, margin.top]);

  const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d")).tickSize(-height + margin.top + margin.bottom);
  svg.append("g").attr("transform", `translate(0, ${height - margin.bottom})`).call(xAxis)
    .call(g => g.select(".domain").remove()).call(g => g.selectAll(".tick line").attr("stroke", "#334155").attr("stroke-dasharray", "3,3")).call(g => g.selectAll(".tick text").attr("fill", "#94a3b8").attr("font-size", "12px"));

  svg.append("g").attr("transform", `translate(${margin.left}, 0)`).call(d3.axisLeft(yEmissionScale).ticks(5).tickFormat(d => d >= 1000 ? (d/1000).toFixed(1) + "K" : d))
    .call(g => g.select(".domain").remove()).call(g => g.selectAll(".tick text").attr("fill", "#94a3b8").attr("font-size", "12px"));
  svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", 25).attr("fill", "#94a3b8").attr("font-size", "13px").attr("font-weight", "bold").attr("text-anchor", "middle").text("Sum of Emission (MtCO2)");

  svg.append("g").attr("transform", `translate(${width - margin.right}, 0)`).call(d3.axisRight(yTempScale).ticks(5).tickFormat(d => d > 0 ? `+${d}` : d))
    .call(g => g.select(".domain").remove()).call(g => g.selectAll(".tick text").attr("fill", "#e2737a").attr("font-size", "12px"));
  svg.append("text").attr("transform", "rotate(-90)").attr("x", -height/2).attr("y", width - 20).attr("fill", "#e2737a").attr("font-size", "13px").attr("font-weight", "bold").attr("text-anchor", "middle").text("Temperature Anomaly (°C)");

  const barWidth = Math.max(2, (width - margin.left - margin.right) / 114 - 1.5);

  svg.append("g").selectAll("rect").data(chartData).join("rect").attr("x", d => xScale(d.Year) - barWidth/2).attr("y", d => yEmissionScale(d.Emissions_MtCO2)).attr("width", barWidth).attr("height", d => height - margin.bottom - yEmissionScale(d.Emissions_MtCO2)).attr("fill", "#334155").attr("opacity", 0.15);
  svg.append("g").selectAll("rect").data(pastData).join("rect").attr("x", d => xScale(d.Year) - barWidth/2).attr("y", d => yEmissionScale(d.Emissions_MtCO2)).attr("width", barWidth).attr("height", d => height - margin.bottom - yEmissionScale(d.Emissions_MtCO2)).attr("fill", "#475569").attr("opacity", d => d.Year === year ? 1.0 : 0.7);

  const lineGen = d3.line().x(d => xScale(d.Year)).y(d => yTempScale(d.Temp_Anomaly)).curve(d3.curveMonotoneX);
  svg.append("path").datum(chartData).attr("fill", "none").attr("stroke", "#e2737a").attr("stroke-width", 2).attr("opacity", 0.15).attr("d", lineGen);
  svg.append("path").datum(pastData).attr("fill", "none").attr("stroke", "#e2737a").attr("stroke-width", 3).attr("d", lineGen);

  const currentPoint = pastData[pastData.length - 1];
  if (currentPoint) svg.append("circle").attr("cx", xScale(currentPoint.Year)).attr("cy", yTempScale(currentPoint.Temp_Anomaly)).attr("r", 5).attr("fill", "#e2737a").attr("stroke", "#161b22").attr("stroke-width", 2);

  const contNames = { "EUR": "Europe", "ASI": "Asia", "AFR": "Africa", "AME": "Americas", "OCE": "Oceania", "GLB": "Global" };
  const locName = level === "Global" ? "Global" : (level === "Continent" ? contNames[loc] : chartData[0]?.Location_Name || loc);
  svg.append("text").attr("x", margin.left).attr("y", margin.top - 25).attr("fill", "#ffffff").attr("font-size", "18px").attr("font-weight", "bold").text(`${locName} Historical Trend`);

  const legendGroup = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top - 8})`);
  legendGroup.append("circle").attr("cx", 0).attr("cy", 0).attr("r", 6).attr("fill", "#475569");
  legendGroup.append("text").attr("x", 12).attr("y", 4).attr("fill", "#94a3b8").attr("font-size", "12px").text("Annual Emissions");
  legendGroup.append("circle").attr("cx", 130).attr("cy", 0).attr("r", 6).attr("fill", "#e2737a");
  legendGroup.append("text").attr("x", 142).attr("y", 4).attr("fill", "#94a3b8").attr("font-size", "12px").text("Temperature Anomaly");
}