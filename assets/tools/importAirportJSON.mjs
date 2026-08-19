//For Local use.
//node --js-promise-withresolvers ./assets/tools/importAirportJSON.mjs

import { writeFile } from 'fs/promises';

preload();

/**
 * Retrieves airports.json before running main().
 */
function preload() {
    console.info(`[${new Date().toISOString()}] | [INFO] Initializing...`); 
    // Get airports
    fetch('https://raw.githubusercontent.com/mwgg/Airports/refs/heads/master/airports.json')
    .then(res => res.json())
    .then(out => {
        main(out);
    })
    .catch(err => console.log(err));
}

/**
 * Filters airports.json and exports to /assets/js/airports_rpa.json.
 */
async function main(jsonData) {
    const entriesArray = Object.entries(jsonData);
    console.log("[INFO] Number of airports to start: " + entriesArray.length);
    const filteredAirportArray = entriesArray.filter(airports => {
        // LATLON between 60N135W and 10N45W
        const entry = airports[1];
        if(entry.lat >= 10.0 && entry.lat <= 60.0 && entry.lon <= -45.0 && entry.lon >= -135.0) {
            // Exclude airports with ICAO's containing numbers.
            const hasNumber = /\d/.test(entry.icao);
            if(hasNumber) return false;

            // If US, ICAO must begin with K.
            if(entry.country == "US" && entry.icao[0] != "K") { 
                return false;
            }
            // If CA, ICAO must begin with CY or CZ
            if(entry.country == "CA" && !(entry.icao[0] == "C" && (entry.icao[1] == "Y" || entry.icao[1] == "Z"))) { 
                return false;
            }

            return true;
        }
        else {
            return false;
        }
    });
    console.log("[INFO] Number of airports to end: " + filteredAirportArray.length);

    // Convert to back object.
    const filteredAirportObject = Object.fromEntries(filteredAirportArray);

    // PBI fix
    filteredAirportObject["KDJT"].iata = "DJT";
    filteredAirportObject["KPBI"] = {
        icao: "KPBI",
        iata: "PBI",
        name: "Palm Beach International Airport",
        city: "West Palm Beach",
        state: "Florida",
        country: "US",
        elevation: 20,
        lat: 26.6832008362,
        lon: -80.0955963135,
        tz: "America/New_York"
    }

    // Write to file.
    try {
    // Convert object to a formatted JSON string (using 2 spaces for readability)
    const jsonString = JSON.stringify(filteredAirportObject, null, 2);
    
    // Write the file asynchronously
    await writeFile('./assets/js/airports_rpa.json', jsonString, 'utf8');
    
    console.log('JSON file successfully written!');
    } catch (error) {
    console.error('Error writing file:', error);
    }
}