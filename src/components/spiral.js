// src/components/spiral.js
import * as d3 from "d3";

export function renderSpiral(svgElement, monthlyData, currentYear, currentMonth, currentLoc, currentLevel) {
  const svg = d3.select(svgElement);
  
  // Clear out the previous frame's geometry to redrawing fresh chronological steps
  svg.selectAll("*").remove();

  const width = 600;
  const height = 600;
  const center = [width / 2, height / 2];

  if (!monthlyData || monthlyData.length === 0) {
    svg.append("text")
      .attr("x", center[0])
      .attr("y", center[1])
      .attr("fill", "#ffffff")
      .attr("text-anchor", "middle")
      .text("Loading monthly data...");
    return;
  }

  // 1. Filter and chronologically sort all tracking coordinates
  const filteredData = monthlyData.filter(d => 
    d.Level === currentLevel && (d.Location_Name === currentLoc || d.ISO_Code === currentLoc)
  );

  const sortedData = filteredData.map(d => ({
    Year: +d.Year, Month: +d.Month, Temp_Anomaly: +d.Temp_Anomaly
  })).sort((a, b) => a.Year - b.Year || a.Month - b.Month);

  // 2. Slice the dataset up to the exact active time index slider position
  const maxIndex = sortedData.findIndex(d => d.Year === currentYear && d.Month === currentMonth);
  const dataToDraw = maxIndex !== -1 ? sortedData.slice(0, maxIndex + 1) : sortedData;

  // 3. Group datasets by year and attach the cross-year loop connector
  const years = d3.group(dataToDraw, d => d.Year);
  const yearGroups = [];

  for (const [year, yearData] of years) {
      const plotData = yearData.map(d => ({ ...d, PlotMonth: d.Month }));

      // Search the FULL sorted array for the upcoming January data point to bridge the wrap-around gap
      const nextJan = sortedData.find(d => d.Year === year + 1 && d.Month === 1);
      
      if (nextJan && (year < currentYear || (year === currentYear && currentMonth === 12))) {
          plotData.push({ ...nextJan, PlotMonth: 13 });
      }
      
      yearGroups.push({ year, plotData });
  }

  // 4. Set up geographic radius and custom temperature color scales
  const angleScale = d3.scaleLinear().domain([1, 13]).range([0, 2 * Math.PI]);
  const radiusScale = d3.scaleLinear().domain([-1.5, 2.0]).range([80, 260]); 
  const colorScale = d3.scaleSequential([2, -2], d3.interpolateRdYlBu);

  const g = svg.append("g");

  // 5. Build crisp white baseline reference rings (-1°C, 0°C, +1°C, +2°C)
  const thresholds = [-1, 0, 1, 2];
  thresholds.forEach(t => {
    const r = radiusScale(t);
    const circleColor = "#ffffff"; 
    
    g.append("circle")
      .attr("cx", center[0]).attr("cy", center[1]).attr("r", r)
      .attr("fill", "none")
      .attr("stroke", circleColor)
      .attr("stroke-width", 1.5) 
      .attr("opacity", 0.4);    

    g.append("text")
      .attr("x", center[0]).attr("y", center[1] - r - 6)
      .attr("fill", circleColor).attr("font-size", "11px").attr("text-anchor", "middle").attr("font-weight", "bold")
      .text(`${t > 0 ? '+' : ''}${t}°C`);
  });

  // 6. Draw circular calendar month indicators
  const monthsNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  monthsNames.forEach((month, i) => {
    const angle = (i / 12) * (2 * Math.PI) - Math.PI / 2;
    const labelRadius = 280; 
    g.append("text")
      .attr("x", center[0] + labelRadius * Math.cos(angle)).attr("y", center[1] + labelRadius * Math.sin(angle) + 4)
      .attr("fill", "#94a3b8").attr("font-size", "12px").attr("font-weight", "bold").attr("text-anchor", "middle")
      .text(month);
  });

  // 7. Render persistent HUD readouts inside the center core
  g.append("text")
    .attr("x", center[0]).attr("y", center[1] - 5)
    .attr("fill", "#ffffff").attr("font-size", "36px").attr("font-weight", "bold").attr("text-anchor", "middle")
    .text(currentYear);
    
  g.append("text")
    .attr("x", center[0]).attr("y", center[1] + 15)
    .attr("fill", "#94a3b8").attr("font-size", "14px").attr("font-weight", "bold").attr("text-anchor", "middle")
    .text(monthsNames[currentMonth - 1]);

  // 8. Generate smooth radial coordinate line definitions
  const lineRadial = d3.lineRadial()
    .angle(d => angleScale(d.PlotMonth))
    .radius(d => radiusScale(d.Temp_Anomaly))
    .defined(d => d.Temp_Anomaly !== undefined && !isNaN(d.Temp_Anomaly)) 
    .curve(d3.curveCatmullRom.alpha(0.5)); 

  // 9. Separate layers to keep past historical tracks locked beneath the active tracking year
  const pastGroup = g.append("g").attr("transform", `translate(${center[0]}, ${center[1]})`);
  const activeGroup = g.append("g").attr("transform", `translate(${center[0]}, ${center[1]})`);
  
  for (const group of yearGroups) {
      const isCurrentYear = group.year === currentYear;
      const targetGroup = isCurrentYear ? activeGroup : pastGroup;

      targetGroup.append("path")
        .datum(group.plotData)
        .attr("fill", "none")
        .attr("stroke", d => {
            const avg = d3.mean(group.plotData, m => m.Temp_Anomaly);
            return colorScale(avg);
        })
        .attr("stroke-width", isCurrentYear ? 2.5 : 1.5) 
        .attr("opacity", isCurrentYear ? 1.0 : 0.2) 
        .attr("d", lineRadial);
  }
}