---
title: Global Climate & Emissions Analytics
theme: dashboard
---

<style>
@import url("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");

h1 {
  text-align: center;
  width: 100%;
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 800;
  color: #f8fafc;
  letter-spacing: 0.02em;
}

.dashboard-slider {
  padding: 1rem;
}

.timeline-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.timeline-button {
  flex-shrink: 0;

  border: 0;
  border-radius: 999px;
  padding: 0.65rem 1rem;
  font-weight: 700;
  cursor: pointer;
  background: #1e293b;
  color: white;
}

.timeline-range {
  flex: 1;
  width: auto;
  min-width: 0;
}

.timeline-label {
  flex-shrink: 0;
  min-width: 60px;
  text-align: right;
  font-weight: 800;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  grid-template-rows: auto auto;
  gap: 0.5rem;
}

.card {
  border: 1px solid #232933 !important;
  box-shadow: none !important;
  background: #161b22 !important;
  border-radius: 8px !important;
  padding: 0.5rem !important;
  margin: 1 !important;
  overflow: hidden;
}

.card svg {
  width: 100%;
  height: 100%;
  display: block;
}

.map-card,
.spiral-card,
.emission-card,
.dual-card {
  height: 38vh;
}

@media (max-width: 1000px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .map-card,
  .spiral-card,
  .emission-card,
  .dual-card {
    height: auto;
  }
}

body {
  background: #101418;
}
</style>

# Global Climate & Emissions Analytics

```js
import * as d3 from "npm:d3";
import { createMap } from "./components/map.js";
import { createEmissionChart, renderDualAxisChart } from "./components/charts.js";
import { renderSpiral } from "./components/spiral.js";

const annualData = await FileAttachment("./data/dashboard_annual_data.csv").csv({typed: true});
const monthlyData = await FileAttachment("./data/dashboard_monthly_data.csv").csv({typed: true});
const countriesGeo = await FileAttachment("./data/countries.json").json();

const continentOverride = new Map([
  ["RUS", "ASI"]
]);

const countryToContinent = new Map(
  countriesGeo.features.map(f => [
    f.id,
    continentOverride.get(f.id) ?? f.properties.continentCode
  ])
);

countriesGeo.features.forEach(f => {
  if (continentOverride.has(f.id)) {
    f.properties.continentCode = continentOverride.get(f.id);
  }
});

let currentLevel = "Global";
let currentLoc = "GLB";
let isPlaying = false;
let playTimer = null;

const minIndex = 0;
const maxIndex = (2013 - 1900) * 12 + 11;

const timelineWrapper = document.createElement("div");
timelineWrapper.className = "timeline-control";

const playButton = document.createElement("button");
playButton.className = "timeline-button";
playButton.textContent = "▶ Play";

const scrubberUI = document.createElement("input");
scrubberUI.className = "timeline-range";
scrubberUI.type = "range";
scrubberUI.min = minIndex;
scrubberUI.max = maxIndex;
scrubberUI.step = 1;
scrubberUI.value = minIndex;

const yearLabel = document.createElement("div");
yearLabel.className = "timeline-label";
yearLabel.textContent = "1900";

timelineWrapper.append(playButton, scrubberUI, yearLabel);

const spiralContainer = d3.create("svg")
  .attr("viewBox", "0 0 600 600")
  .style("background-color", "#161b22")
  .node();

const dualAxisContainer = d3.create("svg")
  .attr("viewBox", "0 0 928 350")
  .style("background-color", "#161b22")
  .node();

function getTime() {
  const tIndex = Number(scrubberUI.value);
  return {
    tIndex,
    year: Math.floor(tIndex / 12) + 1900,
    month: (tIndex % 12) + 1
  };
}

function drillToCountry(countryCode, layer) {
  currentLevel = "Country";
  currentLoc = countryCode;
  mapObj.map.fitBounds(layer.getBounds(), {
    animate: true,
    duration: 0.8,
    padding: [30, 30]
  });
}

function drillToContinent(continentCode) {
  currentLevel = "Continent";
  currentLoc = continentCode;
  mapObj.zoomToContinent(continentCode);
}

function drillToGlobal() {
  currentLevel = "Global";
  currentLoc = "GLB";
  mapObj.resetView();
}

function drillUp() {
  if (currentLevel === "Country") {
    drillToContinent(countryToContinent.get(currentLoc));
  } else if (currentLevel === "Continent") {
    drillToGlobal();
  }

  updateDashboard();
}

const mapObj = createMap(countriesGeo, countryToContinent, (countryCode, continentCode, layer) => {
  if (!continentCode || continentCode === "GLB") return;

  if (currentLevel === "Global") {
    drillToContinent(continentCode);
  } else if (currentLevel === "Continent") {
    if (continentCode === currentLoc) {
      drillToCountry(countryCode, layer);
    } else {
      drillToContinent(continentCode);
    }
  } else if (currentLevel === "Country") {
    const activeContinent = countryToContinent.get(currentLoc);

    if (continentCode === activeContinent) {
      countryCode === currentLoc
        ? drillToContinent(activeContinent)
        : drillToCountry(countryCode, layer);
    } else {
      drillToContinent(continentCode);
    }
  }

  updateDashboard();
});

mapObj.map.on("click", e => {
  if (e.originalEvent?.__countryClick) return;
  drillUp();
});

mapObj.map.on("contextmenu", e => {
  if (e.originalEvent?.__countryClick) return;
  drillUp();
});

const chartObj = createEmissionChart(annualData, countryToContinent, (newLevel, newLoc) => {
  currentLevel = newLevel;
  currentLoc = newLoc;

  if (newLevel === "Global") {
    mapObj.resetView();
  } else if (newLevel === "Continent") {
    mapObj.zoomToContinent(newLoc);
  }

  updateDashboard();
});

function updateDashboard() {
  const {year, month} = getTime();
  yearLabel.textContent =
  `${year}-${String(month).padStart(2, "0")}`;

  const globalRow = annualData.find(d => d.Year === year && d.Level === "Global");
  const continentRows = annualData.filter(d => d.Year === year && d.Level === "Continent");
  const countryRows = annualData.filter(d => d.Year === year && d.Level === "Country");

  const contMap = new Map(continentRows.map(d => [d.ISO_Code, d.Temp_Anomaly]));
  const countryMap = new Map(countryRows.map(d => [d.ISO_Code, d.Temp_Anomaly]));
  const nameMap = new Map(countryRows.map(d => [d.ISO_Code, d.Location_Name]));

  const colorScale = d3.scaleSequential([2, -2], d3.interpolateRdYlBu);

  mapObj.geoLayer.eachLayer(layer => {
    const cCode = layer.feature.id;
    const contCode = countryToContinent.get(cCode);

    let fillColor = "#1e293b";
    let fillOpacity = 0.35;
    let strokeColor = "#64748b";
    let weight = 0.4;

    if (currentLevel === "Global") {
      const val = contMap.get(contCode);
      if (val !== undefined) {
        fillColor = colorScale(val);
        fillOpacity = 0.72;
        strokeColor = "#cbd5e1";
      }
    } else if (currentLevel === "Continent") {
      if (contCode === currentLoc) {
        const val = countryMap.get(cCode);
        if (val !== undefined) {
          fillColor = colorScale(val);
          fillOpacity = 0.78;
          strokeColor = "#e2e8f0";
        }
      } else {
        const val = contMap.get(contCode);
        if (val !== undefined) {
          fillColor = "#111827";
          fillOpacity = 0.3;
          strokeColor = colorScale(val);
          weight = 0.9;
        }
      }
    } else if (currentLevel === "Country") {
      if (cCode === currentLoc) {
        const val = countryMap.get(cCode);
        if (val !== undefined) {
          fillColor = colorScale(val);
          fillOpacity = 0.9;
          strokeColor = "#ffffff";
          weight = 1.8;
        }
      } else {
        const val = countryMap.get(cCode);
        if (val !== undefined) {
          fillColor = "#111827";
          fillOpacity = 0.3;
          strokeColor = colorScale(val);
          weight = 0.8;
        }
      }
    }

    const style = {fillColor, color: strokeColor, weight, fillOpacity, opacity: 0.9};
    layer.options.currentDataStyle = style;
    layer.setStyle(style);
  });

  const contNames = {
    EUR: "Europe",
    ASI: "Asia",
    AFR: "Africa",
    AME: "Americas",
    OCE: "Oceania",
    GLB: "Global"
  };

  let labelText = "Global Average";
  let valText = "No Data";

  if (currentLevel === "Global") {
    valText = globalRow ? `${globalRow.Temp_Anomaly.toFixed(2)} °C` : "No Data";
  } else if (currentLevel === "Continent") {
    labelText = contNames[currentLoc] || currentLoc;
    const val = contMap.get(currentLoc);
    valText = val !== undefined ? `${val.toFixed(2)} °C` : "No Data";
  } else if (currentLevel === "Country") {
    labelText = nameMap.get(currentLoc) || currentLoc;
    const val = countryMap.get(currentLoc);
    valText = val !== undefined ? `${val.toFixed(2)} °C` : "No Data";
  }

  mapObj.dynamicLabel.html(`
    <div style="font-size: 22px; font-weight: 800; text-shadow: 0 2px 6px rgba(0,0,0,0.9);">${labelText}</div>
    <div style="font-size: 17px; font-weight: 800; margin-top: 4px; text-shadow: 0 2px 6px rgba(0,0,0,0.9);">${valText}</div>
  `);

  chartObj.update(year, currentLevel, currentLoc);
  renderSpiral(spiralContainer, monthlyData, year, month, currentLoc, currentLevel);
  renderDualAxisChart(dualAxisContainer, annualData, year, currentLevel, currentLoc);
}

function startPlayback() {
  isPlaying = true;
  playButton.textContent = "⏸ Pause";

  playTimer = setInterval(() => {
    const current = Number(scrubberUI.value);
    scrubberUI.value = current >= maxIndex ? minIndex : current + 1;
    updateDashboard();
  }, 120);
}

function stopPlayback() {
  isPlaying = false;
  playButton.textContent = "▶ Play";

  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
}

playButton.addEventListener("click", () => {
  isPlaying ? stopPlayback() : startPlayback();
});

scrubberUI.addEventListener("input", updateDashboard);
updateDashboard();
```

<div class="card dashboard-slider">
${timelineWrapper}
</div>

<div class="dashboard-grid">

<div class="card map-card">
${mapObj.element}
</div>

<div class="card spiral-card">
${spiralContainer}
</div>

<div class="card dual-card">
${dualAxisContainer}
</div>

<div class="card emission-card">
${chartObj.element}
</div>

</div>