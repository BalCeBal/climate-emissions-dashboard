// src/data/countries.json.js

async function generateMapData() {
    // 1. Fetch standard open-source world map geometry
    const geoResponse = await fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson");
    const geojson = await geoResponse.json();

    // 2. Fetch the official ISO country-to-continent mapping
    const mapResponse = await fetch("https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json");
    const mappingData = await mapResponse.json();

    // 3. Our dashboard's internal continent codes
    const contMap = {
        "Europe": "EUR",
        "Asia": "ASI",
        "Africa": "AFR",
        "Americas": "AME",
        "Oceania": "OCE"
    };

    // 4. Merge them together into the exact format our map component expects
    geojson.features.forEach(feature => {
        const iso3 = feature.id; // Get the 3-letter code (e.g., "AUT")
        const match = mappingData.find(d => d["alpha-3"] === iso3);
        
        let cont = "GLB";
        if (match && match.region) {
            cont = contMap[match.region] || "GLB";
        }
        
        feature.properties = feature.properties || {};
        feature.properties.continentCode = cont;
    });

    // 5. Output the finished JSON for the Framework compiler
    process.stdout.write(JSON.stringify(geojson));
}

generateMapData();