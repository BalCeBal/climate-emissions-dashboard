// src/components/map.js
import * as d3 from "d3";
import L from "leaflet";

export function createMap(countriesGeo, countryToContinent, onLocationChange) {
  const container = d3.create("div")
    .attr("class", "leaflet-map-container")
    .style("width", "100%")
    .style("height", "100%")
    .style("min-height", "360px")
    .style("border-radius", "8px")
    .style("position", "relative")
    .style("overflow", "hidden")
    .style("background", "radial-gradient(circle at 50% 45%, #1c232c 0%, #161b22 60%, #11161d 100%)")
    .node();

  const map = L.map(container, {
    zoomControl: false,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    worldCopyJump: false,
    preferCanvas: true,
    attributionControl: false,
    minZoom: 2,
    maxZoom: 8,
    maxBounds: [[-85, -180], [85, 180]],
    maxBoundsViscosity: 0.8
  }).setView([20, 10], 2);

  const dynamicLabel = d3.select(container).append("div")
    .attr("class", "dynamic-map-label")
    .style("position", "absolute")
    .style("top", "24px")
    .style("left", "50%")
    .style("transform", "translateX(-50%)")
    .style("z-index", "1000")
    .style("pointer-events", "none")
    .style("text-align", "center")
    .style("color", "#ffffff")
    .style("font-family", "consolas");

  const manual = d3.select(container).append("div")
    .style("position", "absolute")
    .style("top", "2%")
    .style("left", "2%")
    .style("z-index", "1000")
    .style("pointer-events", "none")
    .style("font-family", "consolas");

  manual.append("div")
    .style("font-size", "13px")
    .style("font-weight", "800")
    .style("color", "#ffffff")
    .style("letter-spacing", "0.5px")
    .style("text-shadow", "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000")
    .text("Navigation Guide");

  manual.append("div")
    .style("font-size", "11px")
    .style("color", "#cbd5e1")
    .style("margin-top", "6px")
    .style("text-shadow", "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000")
    .text("🖱️ Left Click : Drill Down");

  manual.append("div")
    .style("font-size", "11px")
    .style("color", "#cbd5e1")
    .style("margin-top", "3px")
    .style("text-shadow", "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000")
    .text("🖱️ Right Click : Drill Up");

  manual.append("div")
    .style("font-size", "11px")
    .style("color", "#cbd5e1")
    .style("margin-top", "3px")
    .style("text-shadow", "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000")
    .text("🖱️ Scroll Wheel : Free Zoom");

  const legendDiv = d3.select(container).append("div")
    .attr("class", "map-legend")
    .style("position", "absolute")
    .style("right", "12px")
    .style("bottom", "12px")
    .style("z-index", "1000")
    .style("pointer-events", "none")
    .style("width", "140px")
    .style("height", "48px")
    .style("overflow", "visible")
    .style("box-sizing", "border-box");

  const legSvg = legendDiv.append("svg")
    .attr("viewBox", "0 0 150 52")
    .attr("preserveAspectRatio", "xMaxYMax meet")
    .style("width", "140px")
    .style("height", "48px")
    .style("display", "block");

  const gradientId = `temp-gradient-${Math.random().toString(36).slice(2)}`;

  const gradient = legSvg.append("defs")
    .append("linearGradient")
    .attr("id", gradientId)
    .attr("x1", "0%")
    .attr("x2", "100%");

  d3.range(0, 1.1, 0.1).forEach(t => {
    gradient.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", d3.interpolateRdYlBu(t));
  });

  legSvg.append("text")
    .attr("x", 75)
    .attr("y", 12)
    .attr("font-size", "11px")
    .attr("font-weight", "800")
    .attr("fill", "#ffffff")
    .attr("text-anchor", "middle")
    .style("font-family", "consolas")
    .style("paint-order", "stroke")
    .style("stroke", "#000000")
    .style("stroke-width", "3px")
    .style("stroke-linejoin", "round")
    .text("Temperature Anomaly");

  legSvg.append("rect")
    .attr("x", 5)
    .attr("y", 20)
    .attr("width", 140)
    .attr("height", 10)
    .attr("rx", 2)
    .style("fill", `url(#${gradientId})`);

  legSvg.append("text")
    .attr("x", 5)
    .attr("y", 46)
    .attr("font-size", "10px")
    .attr("font-weight", "700")
    .attr("fill", "#cbd5e1")
    .style("font-family", "consolas")
    .text("+2°C")
    .style("paint-order", "stroke")
    .style("stroke", "#000000")
    .style("stroke-width", "2px")
    .style("stroke-linejoin", "round");

  legSvg.append("text")
    .attr("x", 75)
    .attr("y", 46)
    .attr("font-size", "10px")
    .attr("font-weight", "700")
    .attr("fill", "#cbd5e1")
    .attr("text-anchor", "middle")
    .style("font-family", "consolas")
    .text("0°C")
    .style("paint-order", "stroke")
    .style("stroke", "#000000")
    .style("stroke-width", "2px")
    .style("stroke-linejoin", "round");

  legSvg.append("text")
    .attr("x", 145)
    .attr("y", 46)
    .attr("font-size", "10px")
    .attr("font-weight", "700")
    .attr("fill", "#cbd5e1")
    .attr("text-anchor", "end")
    .style("font-family", "consolas")
    .text("-2°C")
    .style("paint-order", "stroke")
    .style("stroke", "#000000")
    .style("stroke-width", "2px")
    .style("stroke-linejoin", "round");

  const geoLayer = L.geoJSON(countriesGeo, {
    bubblingMouseEvents: false,

    style: {
      fillColor: "#1e293b",
      color: "#94a3b8",
      weight: 0.4,
      opacity: 0.9,
      fillOpacity: 0.4
    },

    onEachFeature(feature, layer) {
      layer.on({
        mouseover: () => {
          layer.setStyle({
            weight: 2,
            color: "#ffffff",
            opacity: 1
          });

          if (layer.bringToFront) layer.bringToFront();
        },

        mouseout: () => {
          layer.setStyle(
            layer.options.currentDataStyle || {
              fillColor: "#1e293b",
              color: "#94a3b8",
              weight: 0.4,
              opacity: 0.9,
              fillOpacity: 0.4
            }
          );
        },

        click: e => {
          if (e.originalEvent) {
            e.originalEvent.__countryClick = true;
            L.DomEvent.stop(e.originalEvent);
          }

          onLocationChange(
            feature.id,
            countryToContinent.get(feature.id),
            layer
          );
        }
      });
    }
  }).addTo(map);

  function resetView() {
    map.invalidateSize(true);
    map.setView([20, 10], 2, {
      animate: true,
      duration: 0.6
    });
  }

  function zoomToContinent(contCode) {
    const bounds = L.latLngBounds([]);

    geoLayer.eachLayer(layer => {
      if (countryToContinent.get(layer.feature.id) === contCode) {
        bounds.extend(layer.getBounds());
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        animate: true,
        duration: 0.8,
        padding: [30, 30]
      });
    }
  }

  setTimeout(resetView, 100);
  setTimeout(resetView, 500);

  return {
    element: container,
    map,
    geoLayer,
    dynamicLabel,
    zoomToContinent,
    resetView
  };
}