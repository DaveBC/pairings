/**
 * @file Parses JSON data, applies a filter, and displays output on a leaflet.js map.
 * @author David Banwell-Clode <David@Banwell-Clode.com>
 */

/**
 * Pairing Object
 * @see pairings.py
 * @typedef {Object} Pairing
 * @property {String} id - Pairing ID number.
 * @property {String[]} days - Days of the month the pairing runs. 1-31.
 * @property {String} base - Base of pairing.
 * @property {Leg[]} legs - Array of leg objects.
 * @property {String} start - Report time. Format: HHMML.
 * @property {String} end - Release time. Format: HHMML.
 * @property {String} tblk - Total block time.
 * @property {String} dh - Total deadhead time.
 * @property {Hotel[]} hotels - Array of hotel objects.
 * @property {String} cdt - Credit time.
 * @property {String} tafb - Time away from base.
 * @property {String} ldgs - Number of landings.
 * @property {String} codeshare - Codeshare.
 * @property {Number} length - Number of days the pairing covers.
 */

/**
 * Leg Object
 * @see pairings.py
 * @typedef {Object} Leg
 * @property {String} origin - Origin airport (IATA).
 * @property {String} destination - Destination airport (IATA).
 * @property {String} flightNum - Flight number.
 * @property {String} day - Day of the week (Numeric or shorthand, MO, TU...).
 * @property {Boolean} deadhead - Deadhead leg.
 * @property {String} depl - Departure time, local. Format: HHMM.
 * @property {String} arrl - Arriival time, local. Format: HHMM.
 * @property {String} blkt - Block time.
 * @property {String} grnt - Ground time.
 * @property {String} eqp - Equipment type.
 * @property {[String]} tblk - Total block time. Only for last flight of day.
 * @property {[String]} tcrd - Total credit time. Only for last flight of day.
 * @property {[String]} tpay - Total pay time. Only for last flight of day.
 * @property {[String]} duty - Total duty time. Only for last flight of day.
 * @property {[String]} layo - Total layover time. Only for last flight of day.
 */

/**
 * Hotel Object
 * @see pairings.py
 * @typedef {Object} Hotel
 * @property {String} name - Hotel name.
 * @property {String} phone - Hotel phone number.
 */


/** 
 * An array of filter components.
 * Number arrays are defined as a min ([0]) and max ([1]).
 * String arrays are to only contain subsets of the values defined below. 
 * avoidAirports is intended to be a list of IATA airports.
 * @typedef {Object} FilterArray
 * @property {String[]} codeshares
 * @property {String[]} bases
 * @property {String[]} daysOfTheWeek
 * @property {Boolean} daysOfTheWeekLegs
 * @property {Number[]} pairingLength
 * @property {Number[]} startTime
 * @property {Number[]} endTime
 * @property {Number[]} credit
 * @property {Number[]} tafb
 * @property {Number[]} tblk
 * @property {Number[]} legs
 * @property {Number[]} landings
 * @property {Number[]} deadheads
 * @property {Number[]} deadheadTime
 * @property {[String[]]} avoidAirports
 * @property {Boolean} avoidAirportsLegs
 * @property {[String[]]} includeAirports
 * @property {Boolean} includeAirportsLegs
 */

//  =======================================================================================
//  Variables
//  =======================================================================================

/**
 * Global filter array.
 * @type {FilterArray}
 */
let filter = {
    codeshares: ["AA", "DL", "UA"],
    bases: ["BOS", "CMH", "DCA", "EWR", "IND", "LGA", "ORD", "PHL", "PIT", "SDF"],
    daysOfTheWeek: ["MO", "TU", "WE", "TH", "FR", "SA", "SU"],
    daysOfTheWeekLegs: false,
    pairingLength: [-1, -1],
    startTime: [-1, -1],
    endTime: [-1, -1],
    credit: [-1, -1],
    tafb: [-1, -1],
    tblk: [-1, -1],
    legs: [-1, -1],
    landings: [-1, -1],
    deadheads: [-1, -1],
    deadheadTime: [-1, -1],
    avoidAirports: [""],
    avoidAirportsLegs: false,
    includeAirports: [""],
    includeAirportsLegs: false
};

/**
* Map layer and control.
* @type {L.tileLayer}
*/
let osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
});

/**
* Map.
* @type {L.map}
*/
let map = L.map('map', {
    center: [38.3731002808, -81.5932006836],
    zoom: 5,
    layers: [osm]
});

/**
 * Click variable. Used to detect double clicks.
 * @type {timeoutID}
 */
let pendingClick;

// COLORS 
// united gold: f1be59 light blue: 03c3d7
// delta blue: 003366 red: C01933 light red: e3132c
// american red: B61F23 blue: 0D73B1 silver: C7D0D7

/**
 * Dictionary of codeshares and colors. Used for lines.
 * @constant {Object}
 */
const mapColors = { ua: "#4fccf5", purple: "#816797", dl: "#003366", aa: "#B61F23" };

/**
 * Airport object.
 * @typedef {Object} Airport
 * @property {String} city
 * @property {String} country
 * @property {Number} elevation
 * @property {String} iata
 * @property {String} icao
 * @property {Number} lat
 * @property {Number} lon
 * @property {String} name
 * @property {String} state
 * @property {String} tz
 */
/**
 * Dictionary of airports.
 * @type {{airports: Object.<String, Airport>}}
 */
let airportJSON;

/**
 * Array of active month/year pairings.
 * @type {Pairing[]}
 */
let pairingsJSON;

/**
 * Array of arrays of pairings, grouped by month/year.
 * @type {Array.<Array.<String, String, Pairing[]>>}
 */
let allPairingsJSON = [];

/**
 * Array of months, in MMM format. First element is the empty string.
 * Accomodates retrieveal by month number.
 * @constant {String[]}
 */
const monthArray = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * Active month in mm format.
 * @type {Number}
 */
let month = 11;

/**
 * Active year in yyyy format.
 * @type {Number}
 */
let year = 2022;

/**
 * Destination marker/icon.
 * @constant {L.icon}
 */
const purpleIcon = L.icon({
    iconUrl: '/pairings/assets/images/PurpleCircle.png',

    iconSize: [10, 10], // size of the icon
    iconAnchor: [5, 5], // point of the icon which will correspond to marker's location
});

/**
 * Republic Airways Base marker/icon.
 * @constant {L.icon}
 */
const rpaIcon = L.icon({
    iconUrl: '/pairings/assets/images/RPAPin_small.png',
    iconSize: [25, 35],
    iconAnchor: [12, 35]
});

/**
 * Array of base markers.
 * @constant {L.marker[]}
 */
const baseMarkers = [L.marker([42.36429977, -71.00520325], { icon: rpaIcon, name: "BOS", numPairings: "0" }).bindPopup('<b>Boston<b>'),
L.marker([39.9980010986, -82.8918991089], { icon: rpaIcon, name: "CMH", numPairings: "0" }).bindPopup('<b>Columbus<b>'),
L.marker([38.8521003723, -77.0376968384], { icon: rpaIcon, name: "DCA", numPairings: "0" }).bindPopup('<b>DC<b>'),
L.marker([40.6925010681, -74.1687011719], { icon: rpaIcon, name: "EWR", numPairings: "0" }).bindPopup('<b>Newark<b>'),
L.marker([39.717300415, -86.2944030762], { icon: rpaIcon, name: "IND", numPairings: "0" }).bindPopup('<b>Indianapolis<b>'),
L.marker([40.77719879, -73.87259674], { icon: rpaIcon, name: "LGA", numPairings: "0" }).bindPopup('<b>La Guardia<b>'),
L.marker([41.97859955, -87.90480042], { icon: rpaIcon, name: "ORD", numPairings: "0" }).bindPopup('<b>Chicago<b>'),
L.marker([39.8718986511, -75.2410964966], { icon: rpaIcon, name: "PHL", numPairings: "0" }).bindPopup('<b>Philadelphia<b>'),
L.marker([40.49150085, -80.23290253], { icon: rpaIcon, name: "PIT", numPairings: "0" }).bindPopup('<b>Pittsburgh<b>'),
L.marker([38.1744003296, -85.736000061], { icon: rpaIcon, name: "SDF", numPairings: "0" }).bindPopup('<b>Louisville<b>')
]

/**
 * Layer group of base markers.
 * @constant {L.layerGroup}
 */
const bases = L.layerGroup([...baseMarkers]).addTo(map);

/**
 * Array of bases in IATA format.
 * @constant {String[]}
 */
const basesIATA = ["BOS", "CMH", "DCA", "EWR", "IND", "LGA", "ORD", "PHL", "PIT", "SDF"];

/**
 * Layer group of route polylines.
 * @type {L.layerGroup}
 */
let routes = L.layerGroup();

/**
 * Array of destination airports in IATA format.
 * Used to help place destination markers.
 * @type {String}
 */
let routeDestinations = [];

/**
 * Layer group of destination markers.
 * @type {L.layerGroup}
 */
let destinationMarkerGroup = L.layerGroup();

//  =======================================================================================
//  Functions: Pairing Handling
//  =======================================================================================

// Execute main function onload.
window.onload = function () { main() };

/**
 * Generates tooltips, fetches, loads and saves data.
 * Shows the help overlay on first load. Detemined by existance of airports in localstorage.
 * Builds the map and hides loading overlay.
 * @return {undefined} 
 */
function main() {
    // Load tooltips.
    $('[data-bs-tooltip="tooltip"]').tooltip();

    // Airports path.
    let airports = "/pairings/assets/js/airports_rpa.json";

    // Clear active pairings.
    pairingsJSON = [];

    // Check if airports are stored in local storage.
    if (localStorage["airportJSON"]) {
        airportJSON = JSON.parse(localStorage["airportJSON"]);

        // Fetch from database.
        loadFromDatabase()
            .then((stp) => {
                if (stp.length > 0) {
                    allPairingsJSON = stp;
                    if (allPairingsJSON.length > 0) {
                        for (let i = allPairingsJSON.length - 1; i > -1; i--) {
                            let pYear = allPairingsJSON[i][0];
                            let pMonth = allPairingsJSON[i][1];
                            document.getElementById("month-pagination").innerHTML = '<li class="page-item"><a class="page-link" href="#">' +
                                pYear + "-" + pMonth +
                                '</a></li>' +
                                document.getElementById("month-pagination").innerHTML;
                        }

                        // Make active pagination.
                        document.getElementsByClassName("page-link")[0].classList.add("active");
                        pairingsJSON = allPairingsJSON[0][2]; // Set newest pairing as the visible.
                        year = "20" + allPairingsJSON[0][1];
                        month = monthArray.indexOf(allPairingsJSON[0][0]);
                        buildLegs()
                            .then(() => toggleLoadingScreen());
                    }
                }
                else {
                    toggleLoadingScreen();
                }
            });
    }
    else {
        // Doesn't exist.
        // Load airportJSON.
        // Put airportJSON into local storage.
        $('#helpModalCenter').modal('show');
        fetch(airports) // Get JSON from file.
            .then((fetched) => {
                fetched.json() // Get PDF Pairings and build json object.
                    .then((jsonObject) => {
                        localStorage['airportJSON'] = JSON.stringify(jsonObject);
                        airportJSON = jsonObject; // Put into global variables.
                    })
                    .then(() => buildLegs()) // Populate map.
                    .then(() => toggleLoadingScreen());
            });
    }

    // Clear upload list. Don't want any carryover.
    document.getElementById("uploadInput").value = null;
    document.getElementById("uploadList").innerHTML = "";
}

/**
 * Main leg function. Pushes curves to layergroup "routes".
 * @async
 * @return {Promise<void>}
 */
async function buildLegs() {
    // Clear Map.
    routes.clearLayers();
    destinationMarkerGroup.clearLayers();
    routeDestinations = [];

    getPairings()
        .then((pairings) => { displayStats(pairings); return getLegs(pairings) })
        .then((legs) => getCurves(legs))
        .then((lines) => displayLines(lines))
        .then(() => getMarkerLatLons())
        .then((destinationLatLons) => getMarkerLayers(destinationLatLons))
        .then((destinationMarkers) => getDestinationMarkerGroup(destinationMarkers))
        .then((markerGroup) => displayDestinationMarkers(markerGroup));
}

/**
 * Returns pairings that fit the filter. Filter is a key,value array.
 * Values in filter are used to include pairings that match.
 * @return {Promise<Pairing[]>} A promise to the array of filtered pairings.
 */
function getPairings() {
    let pairings = [];
    return new Promise(function (resolve) {
        pairingsJSON.forEach(function (pair) {

            // Codeshare filter.
            if (!filter.codeshares.includes(pair.codeshare)) return;

            // Base filter.
            if (!filter.bases.includes(pair.base)) return;

            // Pairing length filter.
            if (filter.pairingLength[0] != -1 && filter.pairingLength[1] != -1) {
                // Min and max.
                if (pair.length < filter.pairingLength[0] || pair.length > filter.pairingLength[1]) return;
            }
            else if (filter.pairingLength[0] != -1) {
                // Just min
                if (pair.length < filter.pairingLength[0]) return;
            }
            else if (filter.pairingLength[1] != -1) {
                // Just max
                if (pair.length > filter.pairingLength[1]) return;
            }

            // Start time
            if (filter.startTime[0] != -1 && filter.startTime[1] != -1) {
                // Min and max.
                if (parseInt(pair.start) < filter.startTime[0] || parseInt(pair.start) > filter.startTime[1]) return;
            }
            else if (filter.startTime[0] != -1) {
                // Just min
                if (parseInt(pair.start) < filter.startTime[0]) return;
            }
            else if (filter.startTime[1] != -1) {
                // Just max
                if (parseInt(pair.start) > filter.startTime[1]) return;
            }

            // End time
            if (filter.endTime[0] != -1 && filter.endTime[1] != -1) {
                // Min and max.
                if (parseInt(pair.end) < filter.endTime[0] || parseInt(pair.end) > filter.endTime[1]) return;
            }
            else if (filter.endTime[0] != -1) {
                // Just min
                if (parseInt(pair.end) < filter.endTime[0]) return;
            }
            else if (filter.endTime[1] != -1) {
                // Just max
                if (parseInt(pair.end) > filter.endTime[1]) return;
            }

            // Credit
            if (filter.credit[0] != -1 && filter.credit[1] != -1) {
                // Min and max.
                if (parseInt(pair.cdt) < filter.credit[0] || parseInt(pair.cdt) > filter.credit[1]) return;
            }
            else if (filter.credit[0] != -1) {
                // Just min
                if (parseInt(pair.cdt) < filter.credit[0]) return;
            }
            else if (filter.credit[1] != -1) {
                // Just max
                if (parseInt(pair.cdt) > filter.credit[1]) return;
            }

            // TAFB
            if (filter.tafb[0] != -1 && filter.tafb[1] != -1) {
                // Min and max.
                if (parseInt(pair.timeaway) < filter.tafb[0] || parseInt(pair.timeaway) > filter.tafb[1]) return;
            }
            else if (filter.tafb[0] != -1) {
                // Just min
                if (parseInt(pair.timeaway) < filter.tafb[0]) return;
            }
            else if (filter.tafb[1] != -1) {
                // Just max
                if (parseInt(pair.timeaway) > filter.tafb[1]) return;
            }

            // Total Block Time
            if (filter.tblk[0] != -1 && filter.tblk[1] != -1) {
                // Min and max.
                if (parseInt(pair.tblk) < filter.tblk[0] || parseInt(pair.tblk) > filter.tblk[1]) return;
            }
            else if (filter.tblk[0] != -1) {
                // Just min
                if (parseInt(pair.tblk) < filter.tblk[0]) return;
            }
            else if (filter.tblk[1] != -1) {
                // Just max
                if (parseInt(pair.tblk) > filter.tblk[1]) return;
            }

            // Legs
            if (filter.legs[0] != -1 && filter.legs[1] != -1) {
                // Min and max.
                if (pair.legs.length < filter.legs[0] || pair.legs.length > filter.legs[1]) return;
            }
            else if (filter.legs[0] != -1) {
                // Just min
                if (pair.legs.length < filter.legs[0]) return;
            }
            else if (filter.legs[1] != -1) {
                // Just max
                if (pair.legs.length > filter.legs[1]) return;
            }

            // Landings
            if (filter.landings[0] != -1 && filter.landings[1] != -1) {
                // Min and max.
                if (parseInt(pair.ldgs) < filter.landings[0] || parseInt(pair.ldgs) > filter.landings[1]) return;
            }
            else if (filter.landings[0] != -1) {
                // Just min
                if (parseInt(pair.ldgs) < filter.landings[0]) return;
            }
            else if (filter.landings[1] != -1) {
                // Just max
                if (parseInt(pair.ldgs) > filter.landings[1]) return;
            }

            // Days of the week
            if (!filter.daysOfTheWeekLegs) {
                // Get day(s)
                let daysArr = []
                let days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
                pair.days.forEach(function (day) {
                    daysArr.push(days[gauss(year, month, parseInt(day))]);
                });
                if (!daysArr.some(v => filter.daysOfTheWeek.includes(v))) {
                    return;
                }
            }

            // Avoid airports.
            if (!filter.avoidAirportsLegs) {
                if (filter.avoidAirports.length > 0 && filter.avoidAirports[0] != "") {
                    if (pair.legs.some(v => filter.avoidAirports.includes(v.destination) || filter.avoidAirports.includes(v.origin))) {
                        return;
                    }
                }
            }

            // Include airports.
            if (!filter.includeAirportsLegs) {
                if (filter.includeAirports.length > 0 && filter.includeAirports[0] != "") {
                    if (!pair.legs.some(v => filter.includeAirports.includes(v.destination) || filter.includeAirports.includes(v.origin))) {
                        return;
                    }
                }
            }

            // Deadhead Legs
            let deadheadLegs = pair.legs.reduce(
                function (accumulator, leg) { return accumulator + (leg.deadhead ? 1 : 0) }, 0
            );
            if (filter.deadheads[0] != -1 && filter.deadheads[1] != -1) {
                if (deadheadLegs < filter.deadheads[0] || deadheadLegs > filter.deadheads[1]) return;
            }
            else if (filter.deadheads[0] != -1) {
                if (deadheadLegs < filter.deadheads[0]) return;
            }
            else if (filter.deadheads[1] != -1) {
                if (deadheadLegs > filter.deadheads[1]) return;
            }

            // Deadhead time
            if (filter.deadheadTime[0] != -1 && filter.deadheadTime[1] != -1) {
                if (parseInt(pair.dh) < filter.deadheadTime[0] || parseInt(pair.dh) > filter.deadheadTime[1]) return;
            }
            else if (filter.deadheadTime[0] != -1) {
                if (parseInt(pair.dh) < filter.deadheadTime[0]) return;
            }
            else if (filter.deadheads[1] != -1) {
                if (parseInt(pair.dh) > filter.deadheadTime[1]) return;
            }

            // Filter by leg.
            if (filter.avoidAirportsLegs || filter.includeAirportsLegs || filter.daysOfTheWeekLegs) {
                // Make deep copy
                let modifiedPair = JSON.parse(JSON.stringify(pair));
                let matchedLegs = [];

                // Leg filters.
                pair.legs.forEach(function (leg) {


                    // Avoid Airport filter.
                    if (filter.avoidAirportsLegs && (filter.avoidAirports.includes(leg.destination) || filter.avoidAirports.includes(leg.origin))) {
                        return;
                    }

                    // Include Airport filter.
                    if (filter.includeAirportsLegs && !(filter.includeAirports.includes(leg.destination) || filter.includeAirports.includes(leg.origin))) {
                        return;
                    }

                    // Day of the week filter.
                    if (filter.daysOfTheWeekLegs) {
                        if (filter.daysOfTheWeek.includes(leg.day)) {
                            matchedLegs.push(leg);
                        }
                        else if (["1", "2", "3", "4", "5", "6", "7"].includes(leg.day)) {
                            // Multi-occurance pairings.
                            let dayList = [];
                            pair.days.forEach(function (day) {
                                let dayNum = gauss(year, month, parseInt(day));
                                const twoLetter = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
                                dayList.push(twoLetter[dayNum]);
                            });
                            if (dayList.some(d => filter.daysOfTheWeek.includes(d))) {
                                matchedLegs.push(leg);
                            }
                        }
                    }
                    else {
                        matchedLegs.push(leg);
                    }
                });
                modifiedPair.legs = matchedLegs;
                if (modifiedPair.legs.length > 0) {
                    pairings.push(modifiedPair);
                }
            }
            else {
                pairings.push(pair);
            }
        });
        resolve(pairings);
    });
}


/**
 * Generate a map of legs to a pairing list and codeshare array..
 * "ORIG-DEST -> {pairings: [Pairinglist], codeshares: ['ua','aa','dl']}"
 * @param {Pairing[]} pairings - Array of pairings.
 * @return {Promise<Map<String, Object>>} Promise to a map of legs mapped to a pairing list and codeshare array.
 */
function getLegs(pairings) {
    const legList = new Map();

    return new Promise(function (resolve) {
        pairings.forEach(function (pair) {
            pair.legs.forEach(function (leg) {
                let legStr = leg.origin + '-' + leg.destination;
                if (legList.has(legStr)) {
                    legList.get(legStr).pairings.push(pair.id);
                    if (!legList.get(legStr).codeshares.includes(pair.codeshare)) {
                        legList.get(legStr).codeshares.push(pair.codeshare);
                    }
                } else {
                    legList.set(legStr, { pairings: [pair.id], codeshares: [pair.codeshare] });
                }
            });
        });
        resolve(legList);
    });
}

/**
 * Change the JSON pairing file.
 * @param {HTMLElement} data The pagination element that was clicked.
 * @return {undefined}
 */
function changeMonthYear(data) {
    // TODO: Add error checking.

    if (data.target.classList.contains("fa-file-pdf")) return;
    toggleLoadingScreen();

    // Get month and year of the clicked element.
    month = monthArray.indexOf(data.target.innerText.split("-")[0].toUpperCase());
    year = data.target.innerText.split("-")[1];

    // Update the active pagination tab.
    if (document.getElementsByClassName("page-link active").length > 0) {
        document.getElementsByClassName("page-link active")[0].classList.remove("active");
        data.target.classList.add("active");
    }

    // Find month/year in allPairings.
    for (let i = 0; i < allPairingsJSON.length; i++) {
        if (allPairingsJSON[i][0] == monthArray[month] && allPairingsJSON[i][1] == year) {
            pairingsJSON = allPairingsJSON[i][2];
            buildLegs()
                .then(() => toggleLoadingScreen());
            break;
        }
    }
}

/**
 * Load pairings from indexeddb.
 * @return {Promise<Pairing[]>} Promise to the array of pairings. 
 */
function loadFromDatabase() {
    return new Promise(function (resolve, reject) {
        let openRequest = indexedDB.open("RPAPairings", 1);

        openRequest.onupgradeneeded = function () {
            // triggers if the client had no database
            // ...perform initialization...
        };

        openRequest.onerror = function () {
            console.error("Error opening database (loading).", openRequest.error);
        };

        openRequest.onsuccess = function () {
            let db = openRequest.result;

            if (!db.objectStoreNames.contains('pairings')) {
                resolve([]);
            }
            else {
                let txn = db.transaction('pairings', 'readonly');
                let store = txn.objectStore('pairings');
                let query = store.get(1);

                query.onsuccess = (event) => {
                    resolve(event.target.result);
                }

                query.onerror = (event) => {
                    console.error("Error retrieving pairings.", event);
                }
            }
        };
    });
}

/**
 * Save allPairingsJSON to indexeddb.
 * @return {undefined}
 */
function saveToDatabase() {
    let openRequest = indexedDB.open('RPAPairings', 1);

    openRequest.onupgradeneeded = function () {
        // triggers if the client had no database
        // ...perform initialization...
        let db = openRequest.result;
        if (!db.objectStoreNames.contains('pairings')) { // if there's no "pairings" store
            db.createObjectStore('pairings'); // create it
        }
    };

    openRequest.onerror = function () {
        console.error("Error", openRequest.error);
    };

    openRequest.onsuccess = function () {
        let db = openRequest.result;
        if (!db.objectStoreNames.contains('pairings')) { // if there's no "pairings" store
            db.createObjectStore('pairings'); // create it
        }
        // continue working with database using db object
        let transaction = db.transaction('pairings', 'readwrite');
        let store = transaction.objectStore('pairings');
        let query = store.put(allPairingsJSON, 1);

        query.onsuccess = function (event) {
            console.info("Saved to database.");
        }

        query.onerror = function (event) {
            console.log("Error saving to database.", error);
        }

        transaction.oncomplete = function () {
            db.close();
        }
    };
}

/**
 * Clear data stored in indexeddb.
 * @return {undefined}
 */
function deleteDatabase() {
    return new Promise(function (resolve) {
        let deleteRequest = indexedDB.deleteDatabase('RPAPairings');

        deleteRequest.onerror = function () {
            console.error("Error deleting database.", error);
        };

        deleteRequest.onsuccess = function () {
            console.info("Database deleted.");
            resolve();
        };
    });
}

/**
 * Clear data stored in localStorage and indexeddb.
 * Reloads map.
 * @return {undefined}
 */
function clearAllData() {

    let clearAllDataButton = document.getElementById("clearAllDataButton");

    let alert = '<div class="alert alert-success alert-dismissible fade show center-block me-auto ms-auto" role="alert" id="clearDataAlert">' +
        'All data successfully cleared!' +
        '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
        '</div>';

    let pagination = '<li class="page-item">' +
        '<a id="upload" type="button" class="page-link" title="Other Settings" data-bs-toggle="modal" data-bs-target="#uploadModalCenter">' +
        '<i class="fa-solid fa-file-pdf" aria-hidden="true"></i>' +
        '</a></li>';

    // Display loading
    toggleLoadingScreen();
    clearAllDataButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Clear All Data';

    // Clear local storage.
    localStorage.clear();

    // Clear database.
    deleteDatabase()
        .then(() => {
            toggleLoadingScreen();
            clearAllDataButton.innerHTML = 'Clear All Data';
            document.getElementById("alertPlaceholder").innerHTML = alert;
            allPairingsJSON = [];
            pairingsJSON = [];
            document.getElementById("uploadInput").value = null;
            document.getElementById("uploadList").innerHTML = "";
            document.getElementById("month-pagination").innerHTML = pagination;
            buildLegs();
        });
}

//  =======================================================================================
//  Functions: Leaflet
//  =======================================================================================

/**
 * Creates a curved path.
 * @param {Number[]} latlng1 Coordinates of the starting point.
 * @param {Number[]} latlng2 Coordinates of the end point.
 * @param {Object} options Path options. 
 * @see {@link https://leafletjs.com/reference.html#path} for path options.
 * @returns {Promise<L.curve>} A promise to the L.curve object.
 */
function curvedPath(latlng1, latlng2, options) {
    return new Promise(function (resolve, reject) {
        let latlngs = [];
        let offsetX = latlng2[1] - latlng1[1],
            offsetY = latlng2[0] - latlng1[0];

        let r = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2)),
            theta = Math.atan2(offsetY, offsetX);

        // "Curvature"
        let thetaOffset = (0.2);

        let r2 = (r / 2) / (Math.cos(thetaOffset)),
            theta2 = theta + thetaOffset;

        let midpointX = (r2 * Math.cos(theta2)) + latlng1[1],
            midpointY = (r2 * Math.sin(theta2)) + latlng1[0];

        let midpointLatLng = [midpointY, midpointX];

        latlngs.push(latlng1, midpointLatLng, latlng2);

        let cP = L.curve(
            [
                'M', latlng1,
                'Q', midpointLatLng,
                latlng2
            ], options);
        resolve(cP);
    });
}

/**
 * Return array of curves from the array of legs.
 * @param {Leg[]} legs - Array of legs.
 * @return {Promise<L.curve[]>} Promise to an array of L.curve objects.
 */
function getCurves(legs) {
    const curvePromises = [];
    return new Promise(function (resolve) {
        legs.forEach(function (legPairing, legKey) {

            let latlng1 = getAirportLatLon(legKey.split("-")[0]);
            let latlng2 = getAirportLatLon(legKey.split("-")[1]);

            // Add to destination array.
            if (!routeDestinations.includes(legKey.split("-")[1])) {
                // Ignore base airports.
                if (!basesIATA.includes(legKey.split("-")[1])) {
                    routeDestinations.push(legKey.split("-")[1]);
                }
            }

            let airports = [latlng1, latlng2];

            Promise.all(airports)
                .then((coords) => {
                    let lineColor = "black";
                    if (legPairing.codeshares.length == 1) {
                        if (legPairing.codeshares[0] == "AA") { lineColor = mapColors.aa };
                        if (legPairing.codeshares[0] == "DL") { lineColor = mapColors.dl };
                        if (legPairing.codeshares[0] == "UA") { lineColor = mapColors.ua };
                    }
                    else {
                        lineColor = mapColors.purple;
                    }
                    curvePromises.push(curvedPath(coords[0], coords[1], { color: lineColor, weight: '2.0', pairings: legPairing.pairings, route: legKey, codeshares: legPairing.codeshares }));
                })
        });
        resolve(curvePromises);
    });
}

/**
 * Takes array of curve promises, then builds a group layer of curves and pushes to the map.
 * @param {Promise<L.curve>[]} lines Array of promises to L.curve objects.
 * @return {undefined}
 */
function displayLines(lines) {
    Promise.all(lines)
        .then((lineArr) => {
            Promise.all(lineArr)
                .then((lineArr) => buildRoutesGroupLayer(lineArr))
                .then((layerGroup) => {
                    routes = layerGroup;
                    routes.addTo(map)
                })
                // .then(() => console.log("REFRESHED MAP"));
        });
}

/**
 * Builds a layer group of curves.
 * @param {L.curve[]} lineArr Array of curves.
 * @returns {Promise<L.layerGroup>} Promise to a layergroup of curves.
 */
function buildRoutesGroupLayer(lineArr) {
    const routeLayerG = L.layerGroup();
    return new Promise(function (resolve) {
        lineArr.forEach(function (line) {
            line.bindPopup("<b>" + line.options.route + "</b> (" + line.options.codeshares.map(function (cs) { return cs.toUpperCase(); }).join(", ") + ")</br>" + (line.options.pairings.map(pair => `<a data-filter="${pair}" data-bs-toggle="modal" data-bs-target="#pairingModalCenter" onclick="pairingLinkClick('${pair}')" href=#>${pair}</a>`)).join(", "));
            routeLayerG.addLayer(line);
        });
        resolve(routeLayerG);
    });
}

/**
 * Get airport latitude and longitude coordinates.
 * @param {String} airportIATA Airport identifier in IATA format.
 * @return {Promise<Array<Number, Number>>} A promise to an array containing lat and lon coordinates.
 */
function getAirportLatLon(airportIATA) {
    return new Promise(function (resolve, reject) {
        Object.keys(airportJSON).forEach(function (key) {
            if (airportJSON[key].iata === airportIATA) {
                resolve([airportJSON[key].lat, airportJSON[key].lon]);
            }
        });
        reject(new Error("IATA Code '" + airportIATA + "' not found."));
    });
}

/**
 * Gets the latitude and longitude coordinates for destination markers.
 * Uses the global variable, routeDestinations, as input.
 * @returns {Promise<Number[]>} Promise to an array of coordinates.
 */
function getMarkerLatLons() {
    destinationLatLons = [];
    routeDestinations.forEach(function (destination) {
        destinationLatLons.push(getAirportLatLon(destination));
    });
    return Promise.all(destinationLatLons);
}

/**
 * Returns promise of destination markers.
 * @param {[lat,lon]} destinationLatLons The destination latitude and longitude.
 * @return {Promise<L.marker[]>} Promise of destination markers (L.marker).
 */
function getMarkerLayers(destinationLatLons) {
    destinationMarkers = [];
    destinationLatLons.forEach(function (destination, i) {
        destinationMarkers.push(L.marker(destination, { icon: purpleIcon }).bindPopup(routeDestinations[i]));
    });
    return Promise.all(destinationMarkers);
}

/**
 * Returns promise of layerGroup of destination markers.
 * @param {L.layers} destinationMarkers The destination marker layers.
 * @return {Promise<L.layerGroup>} Promise to a layerGroup of destination markers.
 */
function getDestinationMarkerGroup(destinationMarkers) {
    return new Promise(function (resolve) {
        let markerGroup = L.layerGroup([...destinationMarkers])
        resolve(markerGroup);
    })
}

/**
 * Add destination markers to the map.
 * @param {L.layerGroup} markerGroup The layer group of markers to display on the map.
 * @return {undefined}
 */
function displayDestinationMarkers(markerGroup) {
    destinationMarkerGroup = markerGroup;
    destinationMarkerGroup.addTo(map);
}

//  =======================================================================================
//  Functions: UI & Stats
//  =======================================================================================

/**
 * Handles single clicks on the filter menu.
 * Rebuilds legs if filters are changed.
 * @param {Object} data 
 * @return {undefined}
 */
function singleClickAction(data) {
    if (!(data.target.hasAttribute("data-bs-toggle") || data.target.parentElement.hasAttribute("data-bs-toggle"))) {
        if (data.target.hasAttribute("data-filter")) {
            let button = data.target;
            if (data.target.tagName != "BUTTON") {
                button = data.target.parentElement;
            }
            if (button.classList.contains("active")) {
                // Remove Active State
                button.classList.remove("active");
                button.setAttribute("aria-pressed", false);
            }
            else {
                // Add Active State
                button.classList.add("active");
                button.setAttribute("aria-pressed", true);
            }
        }
    }
    if (data.target.hasAttribute("data-filter")) {
        if (data.target.getAttribute("data-filter").includes("codeshare")) {
            if ((data.target.tagName == "IMG" && data.target.parentElement.classList.contains("active")) || (data.target.classList.contains("active"))) {
                // Add to filter, if not already there.
                if (!filter.codeshares.includes(data.target.attributes["data-filter"].value.substring(10))) {
                    filter.codeshares.push(data.target.attributes["data-filter"].value.substring(10));
                }
            }
            else {
                // Remove from filter.
                if (filter.codeshares.includes(data.target.attributes["data-filter"].value.substring(10))) {
                    filter.codeshares.splice(filter.codeshares.indexOf(data.target.attributes["data-filter"].value.substring(10)), 1);
                }
                else {
                    console.log("Unable to remove. " + data.target.attributes["data-filter"].value.substring(10) + " does not exist in filter.");
                }
            }
        }
        else if (data.target.getAttribute("data-filter").includes("base")) {
            if ((data.target.tagName == "SPAN" && data.target.parentElement.classList.contains("active")) || (data.target.classList.contains("active"))) {
                // Add to filter, if not already there.
                if (!filter.bases.includes(data.target.attributes["data-filter"].value.substring(5))) {
                    filter.bases.push(data.target.attributes["data-filter"].value.substring(5));
                }
            }
            else {
                // Remove from filter.
                if (filter.bases.includes(data.target.attributes["data-filter"].value.substring(5))) {
                    filter.bases.splice(filter.bases.indexOf(data.target.attributes["data-filter"].value.substring(5)), 1);
                }
                else {
                    console.log("Unable to remove. Does not exist in filter.");
                    console.log(data);
                }
            }
        }
        else if (data.target.getAttribute("data-filter").includes("day")) {
            if ((data.target.tagName == "SPAN" && data.target.parentElement.classList.contains("active")) || (data.target.classList.contains("active"))) {
                // Add to filter, if not already there.
                if (!filter.daysOfTheWeek.includes(data.target.attributes["data-filter"].value.substring(4))) {
                    filter.daysOfTheWeek.push(data.target.attributes["data-filter"].value.substring(4));
                }
            }
            else {
                // Remove from filter.
                if (filter.daysOfTheWeek.includes(data.target.attributes["data-filter"].value.substring(4))) {
                    filter.daysOfTheWeek.splice(filter.daysOfTheWeek.indexOf(data.target.attributes["data-filter"].value.substring(4)), 1);
                }
                else {
                    console.log("Unable to remove. Does not exist in filter.");
                    console.log(data);
                }
            }
        }

        // Rebuild map with new filter.
        buildLegs();
    }
}

/**
 * Handles double clicks on the filter menu.
 * Rebuilds legs if filters are changed.
 * @param {Object} data 
 * @return {undefined}
 */
function doubleClickAction(data) {
    if (data.target.hasAttribute("data-filter")) {
        if (data.target.getAttribute("data-filter").includes("codeshare")) {
            if (filter.codeshares.length <= 1) {
                filter.codeshares = ["AA", "DL", "UA"];
                makeAllButtonsActive('#collapseCodeshares .btn-group-vertical button');
            }
            else {
                // Make only item in filter.
                filter.codeshares = [data.target.attributes["data-filter"].value.substring(10)];
                isolateActiveButton('#collapseCodeshares .btn-group-vertical button', data.target.getAttribute("data-filter"));
            }
        }
        else if (data.target.getAttribute("data-filter").includes("base")) {
            // If only one button active, make all others active too.
            if (filter.bases.length <= 1) {
                filter.bases = basesIATA;
                makeAllButtonsActive('#collapseBases .btn-group-vertical button');
            }
            else {
                // Make only item in filter.
                filter.bases = [data.target.attributes["data-filter"].value.substring(5)];
                isolateActiveButton('#collapseBases .btn-group-vertical button', data.target.getAttribute("data-filter"));
            }
        }
        else if (data.target.getAttribute("data-filter").includes("day")) {
            if (filter.daysOfTheWeek.length <= 1) {
                filter.daysOfTheWeek = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
                makeAllButtonsActive('#collapseDays .btn-group-vertical button');
            }
            else {
                // Make only item in filter.
                filter.daysOfTheWeek = [data.target.attributes["data-filter"].value.substring(4)];
                // Make button active.
                isolateActiveButton('#collapseDays .btn-group-vertical button', data.target.getAttribute("data-filter"));
            }
        }
        // Rebuild map with new filter.
        buildLegs();
    }
}

/**
 * Makes the excluded button the only active button in the group.
 * @param {String} selector The query string of the buttons to select and remove active state from.
 * @param {String} exclude The data-filter value of the button to make/keep active.
 */
function isolateActiveButton(selector, exclude) {
    var buttons = document.querySelectorAll(selector);
    buttons.forEach(function (button) {
        if (button.getAttribute("data-filter") == exclude) {
            button.classList.add("active");
            button.setAttribute("aria-pressed", true);
            return;
        }
        button.classList.remove("active");
        button.setAttribute("aria-pressed", false);
    });
}

/**
 * Makes all buttons active button in the group.
 * @param {String} selector The query string of the buttons to select and remove active state from.
 */
function makeAllButtonsActive(selector) {
    let buttons = document.querySelectorAll(selector);
    buttons.forEach(function (button) {
        if (button.classList) {
            button.classList.add("active");
            button.setAttribute("aria-pressed", true);
        }
    });
}

/**
 * Generate and display statistics of the filtered pairings.
 * @param {Pairing[]} pairings Array of filtered pairings.
 * @return {undefined}
 */
function displayStats(pairings) {
    let airportCount = [];
    let pairingList = pairings.map(pair => `<a data-filter="${pair.id}" data-bs-toggle="modal" data-bs-target="#pairingModalCenter" onclick="pairingLinkClick('${pair.id}')" href=#>${pair.id}</a>`).join(", ");
    let flightCount = 0;
    let creditCount = 0; // In hours.
    let blockCount = 0;  // In hours.
    let dayCount = 0;
    let legCount = 0;
    let groundCount = 0;
    let deadheadCount = 0;
    let longestFlight = ["", "0"]; // Dep-Arr, blkt
    let shortestFlight = ["", "9999"]; // Dep-Arr, blkt
    let leastVisited = [];
    let mostVisited = [];
    let airportVisit = new Map(); // Airport -> count
    let reducedMin = 0; // Number of times the least visited airport was visited.
    let reducedMax = 0; // Number of times the most visited airport was visited.

    let dayDistribution = [0, 0, 0, 0, 0]; // 1-5.

    // Distributions
    buildBaseDistributions(pairings);

    pairings.forEach(function (pair) {
        flightCount += pair.legs.length * pair.days.length;
        legCount += pair.legs.length;

        dayDistribution[pair.length - 1] += 1;

        // Count total block time.
        blockCount += timeToHours(pair.tblk);

        // Count total credit.
        creditCount += timeToHours(pair.cdt);

        // Count total Deadhead
        deadheadCount += timeToHours(pair.dh);

        let currentDay = "";

        pair.legs.forEach(function (leg) {

            if (currentDay == "" || leg.day != currentDay) {
                // First leg or new day..
                currentDay = leg.day;
                dayCount += 1;
            }

            if (!airportCount.includes(leg.origin)) {
                airportCount.push(leg.origin);
            }
            if (!airportCount.includes(leg.destination)) {
                airportCount.push(leg.destination);
            }

            // Ground time.
            groundCount += timeToHours(leg.grnt);

            // Airport visit count.
            if (airportVisit.has(leg.destination)) {
                airportVisit.set(leg.destination, airportVisit.get(leg.destination) + 1 * pair.days.length);
            }
            else {
                // ignore bases.
                if (!basesIATA.includes(leg.destination)) {
                    airportVisit.set(leg.destination, 1 * pair.days.length);
                }
            }

            // Flight length.
            if (parseInt(leg.blkt) > parseInt(longestFlight[1])) {
                longestFlight[0] = leg.origin + "-" + leg.destination;
                longestFlight[1] = leg.blkt;
            }
            if (parseInt(leg.blkt) < parseInt(shortestFlight[1])) {
                shortestFlight[0] = leg.origin + "-" + leg.destination;
                shortestFlight[1] = leg.blkt;
            }

        });
    });

    // Check array isnt empty. Prevent reduction of empty array with no initial value.
    if (pairings.length == 0) {
        reducedMin = 0;
        reducedMax = 0;
        shortestFlight = ["", "0"];
    }
    else {
        reducedMin = [...airportVisit.entries()].reduce((a, e) => e[1] < a[1] ? e : a)[1]; // Least number of visits.
        reducedMax = [...airportVisit.entries()].reduce((a, e) => e[1] > a[1] ? e : a)[1]; // Most number of visits.
        leastVisited = Array.from([...airportVisit.entries()].filter(([k, v]) => v == reducedMin), ([k, v]) => k); // Airports that have been visited min times.
        mostVisited = Array.from([...airportVisit.entries()].filter(([k, v]) => v == reducedMax), ([k, v]) => k); // Airports that have been visited max times.
    }

    let oneDay = pairings.length > 0 ? ((dayDistribution[0] / pairings.length) * 100).toFixed(1) : 0;
    let twoDay = pairings.length > 0 ? ((dayDistribution[1] / pairings.length) * 100).toFixed(1) : 0;
    let threeDay = pairings.length > 0 ? ((dayDistribution[2] / pairings.length) * 100).toFixed(1) : 0;
    let fourDay = pairings.length > 0 ? ((dayDistribution[3] / pairings.length) * 100).toFixed(1) : 0;
    let fiveDay = pairings.length > 0 ? ((dayDistribution[4] / pairings.length) * 100).toFixed(1) : 0;


    document.getElementById("stats_pairingCount").innerHTML = "Pairings <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Total number of pairings'>" + pairings.length.toLocaleString("en-US") + "</span>";
    document.getElementById("stats_blockHours").innerHTML = "Block Hours <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Total block hours'>" + blockCount.toLocaleString("en-US", { maximumFractionDigits: 1 }) + "</span>";
    document.getElementById("stats_creditCount").innerHTML = "Credit Hours <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Total credit hours'>" + creditCount.toLocaleString("en-US", { maximumFractionDigits: 1 }) + "</span>";
    document.getElementById("stats_flightCount").innerHTML = "Flights <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Total number of flights'>" + flightCount.toLocaleString("en-US") + "</span>";
    document.getElementById("stats_flightDayCount").innerHTML = "Flights/Day <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Average flights per day'>" + (flightCount / 30).toLocaleString("en-US", { maximumFractionDigits: 0 }) + "</span>";

    document.getElementById("stats_avgBlockFlight").innerHTML = "Average Block/Flight <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Average block time per flight'>" + (blockCount / flightCount).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "</span>";
    document.getElementById("stats_avgCreditFlight").innerHTML = "Average Credit/Flight <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Average credit time per flight'>" + (creditCount / flightCount).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "</span>";
    document.getElementById("stats_avgCreditDay").innerHTML = "Average Credit/Day <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Average credit time per day'>" + (creditCount / dayCount).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "</span>";
    document.getElementById("stats_avgLegsDay").innerHTML = "Average Legs/Day <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Average number of legs per day'>" + (legCount / dayCount).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "</span>";
    document.getElementById("stats_avgGrnt").innerHTML = "Average Ground Time/Day <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Average ground time per day'>" + (groundCount / dayCount).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "</span>";

    document.getElementById("stats_totalDH").innerHTML = "Total Deadhead <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Total deadhead hours'>" + deadheadCount.toLocaleString("en-US", { maximumFractionDigits: 1 }) + "</span>";
    document.getElementById("stats_avgDH").innerHTML = "Average Deadhead/Pairing <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Average deadhead hours per pairing'>" + (deadheadCount / pairings.length).toLocaleString("en-US", { maximumFractionDigits: 1 }) + "</span>";

    document.getElementById("stats_distribution1Day").innerHTML = "1 Day <span class='badge bg-primary rounded-pill'>" + dayDistribution[0].toLocaleString("en-US") + " </span>";
    document.getElementById("stats_distribution2Day").innerHTML = "2 Day <span class='badge bg-primary rounded-pill'>" + dayDistribution[1].toLocaleString("en-US") + " </span>";
    document.getElementById("stats_distribution3Day").innerHTML = "3 Day <span class='badge bg-primary rounded-pill'>" + dayDistribution[2].toLocaleString("en-US") + " </span>";
    document.getElementById("stats_distribution4Day").innerHTML = "4 Day <span class='badge bg-primary rounded-pill'>" + dayDistribution[3].toLocaleString("en-US") + " </span>";
    document.getElementById("stats_distribution5Day").innerHTML = "5 Day <span class='badge bg-primary rounded-pill'>" + dayDistribution[4].toLocaleString("en-US") + " </span>";

    document.getElementById("stats_distributionAll").innerHTML = 'Trip Length <div class="progress w-75" id="tripLengthDistr">' +
        '<div class="progress-bar" role="progressbar" aria-label="Segment one" style="width:' + oneDay + '%" aria-valuenow="' + oneDay + '" aria-valuemin="0" aria-valuemax="100" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip-standard" data-bs-title="1 Day: ' + oneDay.toLocaleString("en-US") + '%">' + oneDay.toLocaleString("en-US") + '</div>' +
        '<div class="progress-bar bg-success" role="progressbar" aria-label="Segment two" style="width:' + twoDay + '%" aria-valuenow="' + twoDay + '" aria-valuemin="0" aria-valuemax="100" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip-success" data-bs-title="2 Day: ' + twoDay.toLocaleString("en-US") + '%">' + twoDay.toLocaleString("en-US") + '</div>' +
        '<div class="progress-bar bg-info" role="progressbar" aria-label="Segment three" style="width:' + threeDay + '%" aria-valuenow="' + threeDay + '" aria-valuemin="0" aria-valuemax="100" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip-info" data-bs-title="3 Day: ' + threeDay.toLocaleString("en-US") + '%">' + threeDay.toLocaleString("en-US") + '</div>' +
        '<div class="progress-bar bg-danger" role="progressbar" aria-label="Segment four" style="width:' + fourDay + '%" aria-valuenow="' + fourDay + '" aria-valuemin="0" aria-valuemax="100" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip-danger" data-bs-title="4 Day: ' + fourDay.toLocaleString("en-US") + '%">' + fourDay.toLocaleString("en-US") + '</div>' +
        '<div class="progress-bar bg-warning" role="progressbar" aria-label="Segment five" style="width:' + fiveDay + '%" aria-valuenow="' + fiveDay + '" aria-valuemin="0" aria-valuemax="100" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-custom-class="custom-tooltip-warning" data-bs-title="5 Day: ' + fiveDay.toLocaleString("en-US") + '%">' + fiveDay.toLocaleString("en-US") + '</div>' +
        '</div>';

    document.getElementById("stats_airportCount").innerHTML = "Airports <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Number of airports served'>" + airportCount.length.toLocaleString("en-US") + "</span>";
    document.getElementById("stats_longestFlight").innerHTML = "Longest Flight <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Longest flight (by block time)'>" + longestFlight[0] + " (" + timeToHours(longestFlight[1]).toLocaleString("en-US", { maximumFractionDigits: 1 }) + ")</span>";
    document.getElementById("stats_shortestFlight").innerHTML = "Shortest Flight <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Shortest flight (by block time)'>" + shortestFlight[0] + " (" + timeToHours(shortestFlight[1]).toLocaleString("en-US", { maximumFractionDigits: 1 }) + ")</span>";
    document.getElementById("stats_mostVisited").innerHTML = "Most Visited <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Most visited airport(s) (non-base)'>" + mostVisited.join(", ") + " (" + reducedMax + ")" + "</span>";
    document.getElementById("stats_leastVisited").innerHTML = "Least Visited <span class='badge bg-primary rounded-pill' data-bs-toggle='tooltip' data-bs-placement='top' data-bs-title='Least visited airport(s)'>" + leastVisited.join(", ") + " (" + reducedMin + ")" + "</span>";

    document.getElementById("stats_pairingsList").innerHTML = pairingList;

    tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}

/**
 * Populate and display pairing modal.
 * @param {String} data Pairing ID
 * @return {undefined}
 */
function pairingLinkClick(data) {
    let pairing = pairingsJSON.filter(function (pairingData) { return pairingData.id == data })[0];

    document.getElementById("pairingModalLongTitle").innerHTML = "Pairing " + pairing.id;
    document.getElementById("pairing_base").innerHTML = "BASE : " + pairing.base;
    document.getElementById("pairing_start").innerHTML = "BASE REPT : " + pairing.start;
    document.getElementById("pairing_end").innerHTML = "BASE END : " + pairing.end;
    document.getElementById("pairing_tblk").innerHTML = "TOTALS BLK : " + pairing.tblk;
    document.getElementById("pairing_deadheads").innerHTML = "DHD : " + pairing.dh;
    document.getElementById("pairing_credit").innerHTML = "CDT : " + pairing.cdt;
    document.getElementById("pairing_tafb").innerHTML = "T.A.F.B. : " + pairing.tafb;
    document.getElementById("pairing_ldgs").innerHTML = "LDGS : " + pairing.ldgs;


    // --- Calendar ---
    let numDays = daysInMonth(year, month);
    let firstDay = gauss(year, month, 1);
    let lastDay = gauss(year, month, numDays);
    let whiteSpace = "&nbsp;";
    let calendar = document.getElementById("pairing_daysOfTheMonth");

    // Reset calendar.
    Array.from(calendar.children).forEach(function (child) {
        let childArr = Array.from(child.children);
        childArr[1].innerHTML = "--";
        childArr[2].innerHTML = "--";
        childArr[3].innerHTML = "--";
        childArr[4].innerHTML = "--";
        childArr[5].innerHTML = "--";
    });

    // 0 = sun, 6 = sa

    if (firstDay == 0) firstDay = 7;
    if (lastDay == 0) lastDay = 7;

    // Set second row of calender.
    for (let i = 0; i < firstDay - 1; i++) {
        calendar.children[i].children[1].innerHTML = whiteSpace;
    }

    // Calculate how many rows required for each month.
    let numberOfRows = numCalenderRows(numDays, firstDay);
    // Set last row of calendar.
    for (let i = 6; i > lastDay - 1; i--) {
        calendar.children[i].children[numberOfRows].innerHTML = whiteSpace;
    }
    // Clear last row.
    if (numberOfRows < 6) {
        calendar.children[0].children[6].innerHTML = whiteSpace;
        calendar.children[1].children[6].innerHTML = whiteSpace;
        calendar.children[2].children[6].innerHTML = whiteSpace;
        calendar.children[3].children[6].innerHTML = whiteSpace;
        calendar.children[4].children[6].innerHTML = whiteSpace;
        calendar.children[5].children[6].innerHTML = whiteSpace;
        calendar.children[6].children[6].innerHTML = whiteSpace;
    }

    // Fill in days to calendar.
    pairing.days.forEach(function (day) {
        // column (day of week)
        let column = gauss(year, month, Number(day));
        column = column == 0 ? 6 : column - 1;
        // row
        let row = Math.ceil((Number(day) + (firstDay - 1)) / 7);
        calendar.children[column].children[row].innerHTML = day;
    });
    // --- Calendar End ---

    // --- Legs ---

    // Reset legs.
    document.getElementById("pairing-leg-day").innerHTML = "<div>DAY</div>";
    document.getElementById("pairing-leg-dh").innerHTML = "<div>DH</div>";
    document.getElementById("pairing-leg-fltn").innerHTML = "<div>FLTN</div>";
    document.getElementById("pairing-leg-deparr").innerHTML = "<div>DPS-APS</div>";
    document.getElementById("pairing-leg-depl").innerHTML = "<div>DEPL</div>";
    document.getElementById("pairing-leg-arrl").innerHTML = "<div>ARRL</div>";
    document.getElementById("pairing-leg-blkt").innerHTML = "<div>BLKT</div>";
    document.getElementById("pairing-leg-grnt").innerHTML = "<div>GRNT</div>";
    document.getElementById("pairing-leg-eqp").innerHTML = "<div>EQP</div>";
    document.getElementById("pairing-leg-spacer").innerHTML = "<div>&nbsp</div>";
    document.getElementById("pairing-leg-tblk").innerHTML = "<div>TBLK</div>";
    document.getElementById("pairing-leg-tcrd").innerHTML = "<div>TCRD</div>";
    document.getElementById("pairing-leg-tpay").innerHTML = "<div>TPAY</div>";
    document.getElementById("pairing-leg-duty").innerHTML = "<div>DUTY</div>";
    document.getElementById("pairing-leg-layo").innerHTML = "<div>LAYO</div>";

    let currentDay = pairing.legs[0].day;
    let hotelArray = [...pairing.hotels.reverse()];

    pairing.legs.forEach(function (leg) {
        if (leg.day != currentDay) {
            currentDay = leg.day;
            let hotelDetail = hotelArray.pop();
            document.getElementById("pairing-leg-day").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-dh").innerHTML += "<div style='white-space: nowrap; width: 0px;'>" + hotelDetail.name + "</div>";
            document.getElementById("pairing-leg-fltn").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-deparr").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-depl").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-arrl").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-blkt").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-grnt").innerHTML += "<div style='white-space: nowrap; width: 0px'>" + hotelDetail.phone + "</div>";
            document.getElementById("pairing-leg-eqp").innerHTML += "<div>" + whiteSpace + "</div>";

            document.getElementById("pairing-leg-tblk").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-tcrd").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-tpay").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-duty").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-layo").innerHTML += "<div>" + whiteSpace + "</div>";
        }

        document.getElementById("pairing-leg-day").innerHTML += "<div>" + leg.day + "</div>";
        if (leg.deadhead) {
            document.getElementById("pairing-leg-dh").innerHTML += "<div>DH</div>";
        }
        else {
            document.getElementById("pairing-leg-dh").innerHTML += "<div>" + whiteSpace + "</div>";
        }
        document.getElementById("pairing-leg-fltn").innerHTML += "<div>" + leg.flightNum + "</div>";
        document.getElementById("pairing-leg-deparr").innerHTML += "<div>" + leg.origin + "-" + leg.destination + "</div>";
        document.getElementById("pairing-leg-depl").innerHTML += "<div>" + leg.depl + "</div>";
        document.getElementById("pairing-leg-arrl").innerHTML += "<div>" + leg.arrl + "</div>";
        document.getElementById("pairing-leg-blkt").innerHTML += "<div>" + leg.blkt + "</div>";
        if (leg.grnt) {
            document.getElementById("pairing-leg-grnt").innerHTML += "<div>" + leg.grnt + "</div>";
            document.getElementById("pairing-leg-tblk").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-tcrd").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-tpay").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-duty").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-layo").innerHTML += "<div>" + whiteSpace + "</div>";
        }
        else {
            document.getElementById("pairing-leg-grnt").innerHTML += "<div>" + whiteSpace + "</div>";
            document.getElementById("pairing-leg-tblk").innerHTML += "<div>" + leg.tblk + "</div>";
            document.getElementById("pairing-leg-tcrd").innerHTML += "<div>" + leg.tcrd + "</div>";
            document.getElementById("pairing-leg-tpay").innerHTML += "<div>" + leg.tpay + "</div>";
            document.getElementById("pairing-leg-duty").innerHTML += "<div>" + leg.duty + "</div>";
            document.getElementById("pairing-leg-layo").innerHTML += "<div>" + leg.layo + "</div>";
        }
        document.getElementById("pairing-leg-eqp").innerHTML += "<div>" + leg.eqp + "</div>";
    });
    // --- Legs End ---

}

/**
 * Returns the day of the week for a date.
 * @param {Number} year Year in YYYY format.
 * @param {Number} month Month in MM format.
 * @param {Number} day Day in DD format.
 * 
 * @return {Number} Day of the week. (0-6 : Su-Sa)
 */
function gauss(year, month, day) {
    // Offset table.
    const commonYears = [0, 3, 3, 6, 1, 4, 6, 2, 5, 0, 3, 5];
    let monthOffset = commonYears[month - 1];

    if (isLeapYear(year)) {
        monthOffset = (monthOffset + 1) % 7;
    }

    let dayNum = ((day + monthOffset + (5 * ((year - 1) % 4)) + (4 * ((year - 1) % 100)) + (6 * ((year - 1) % 400))) % 7);
    return dayNum;
}

/**
 * Returns the number of days in a month.
 * @param {Number} year Year in YYYY format.
 * @param {Number} month Month in MM format.
 * 
 * @return {Number} Number of days in a month.
 */
function daysInMonth(year, month) {
    if (month == 2) {
        return (28 + isLeapYear(year));
    }
    else {
        return 31 - ((month - 1) % 7 % 2);
    }
}

/**
 * Returns 1 for leap year and 0 if not.
 * @param {Number} year Year in YYYY format.
 * @return {Number} 1 if a leap year, 0 if not.
 */
function isLeapYear(year) {
    if ((year % 4) || ((year % 100 === 0) && (year % 400))) {
        return 0;
    } else {
        return 1;
    }
}

/**
 * Returns the number of calendar rows required.
 * @param {Number} numDays Number of days in the month.
 * @param {Number} firstDay First day of the month, where sunday = 0.
 * @return {Number} Number of calendar rows.
 */
function numCalenderRows(numDays, firstDay) {
    let numRows = Math.floor(numDays / 7);
    let rem = numDays % 7;
    if (rem == 0) {
        if (firstDay == 1) {
            return numRows;
        } else {
            return numRows + 1;
        }
    }

    if (rem - (8 - firstDay) > 0) {
        numRows += 2;
    }
    else {
        numRows += 1;
    }

    return numRows;
}

/**
 * Sets the inner text value of the min pairing length button.
 * @param {Number} value Pairing length.
 * @return {undefined}
 */
function pairingLengthMinClick(value) {
    const groupMinButton = document.getElementById("buttonPairingLength-min");
    const groupMaxButton = document.getElementById("buttonPairingLength-max");
    if (value == 0) {
        groupMinButton.innerText = "Min";
    }
    else {
        groupMinButton.innerText = value;
    }

    if (value > parseInt(groupMaxButton.innerText)) {
        groupMaxButton.innerText = value;
    }
}

/**
 * Sets the inner text value of the max pairing length button.
 * @param {Number} value Pairing length.
 * @return {undefined}
 */
function pairingLengthMaxClick(value) {
    const groupMinButton = document.getElementById("buttonPairingLength-min");
    const groupMaxButton = document.getElementById("buttonPairingLength-max");
    if (value == 0) {
        groupMaxButton.innerText = "Max";
    }
    else {
        groupMaxButton.innerText = value;
    }

    if (value < parseInt(groupMinButton.innerText)) {
        groupMinButton.innerText = value;
    }
}

/**
 * Sets the inner text value of the clicked min/max dropdown button.
 * @param {HTMLElement} elem Dropdown item.
 * @return {undefined}
 */
function settingsDropDownClick(elem) {
    let value = parseInt(elem.getAttribute("value"));

    const groupMinButton = elem.parentElement.parentElement.parentElement.children[1];
    const groupMaxButton = elem.parentElement.parentElement.parentElement.children[3];

    if (elem.parentElement.parentElement.classList.contains("dropdown-menu-end")) {
        // Max
        if (value == -1) {
            groupMaxButton.innerText = "Max";
        }
        else {
            groupMaxButton.innerText = elem.innerText;
        }

        if (value > -1 && value < parseInt(groupMinButton.innerText)) {
            groupMinButton.innerText = elem.innerText;
        }
    }
    else {
        // Min
        if (value == -1) {
            groupMinButton.innerText = "Min";
        }
        else {
            groupMinButton.innerText = elem.innerText;
        }

        if (value > -1 && value > parseInt(groupMaxButton.innerText)) {
            groupMaxButton.innerText = elem.innerText;
        }
    }
}

/**
 * Auto format user input to HH:MM time format.
 * @param {String} timeString User input string.
 * @return {String} String in HH:MM format.
 */
function autoFormatTime(timeString) {
    try {
        var cleaned = ("" + timeString).replace(/\D:/g, "");
        var match = cleaned.match(/^([0-9])?([0-9])?(:)?([0-5])?([0-9])?$/);
        return [
            match[1],
            match[2],
            match[3] ? ":" : "",
            match[4] ? (match[3] ? "" : ":") : "",
            match[4],
            match[5] ? (match[4] ? match[5] : "") : ""
        ].join("");
    } catch (err) {
        return timeString.slice(0, -1);
    }
}

/**
 * Auto correct user input to HH:MM time format.
 * @param {HTMLElement} elem User input field.
 * @return {undefined}
 */
function textFieldMaxMinCorrect(elem) {

    // Append missing digits if needed.
    if (elem.target.value.length < 5) {
        if (elem.target.value.length == 1) elem.target.value += "0:00"
        if (elem.target.value.length == 2) elem.target.value += ":00"
        if (elem.target.value.length == 3) elem.target.value += "00"
        if (elem.target.value.length == 4) elem.target.value += "0"
    }

    // Remove : from string.
    let value = parseInt(elem.target.value.replace(":", ""));

    // Get the dropdown button for min and max.
    const groupMinText = elem.target.parentElement.children[1];
    const groupMaxText = elem.target.parentElement.children[2];

    // Prevent overlap. e.g. min being greater than max.
    if (elem.target.classList.contains("input-text-min")) {
        // Min
        if (value > parseInt(groupMaxText.value.replace(":", ""))) {
            groupMaxText.value = elem.target.value
        }
    }
    else {
        // Max
        if (value < parseInt(groupMinText.value.replace(":", ""))) {
            groupMinText.value = elem.target.value
        }
    }
}

/**
 * Auto format user input to IATA airport format.
 * @param {String} iataString User input string.
 * @return {String} String in IATA format.
 */
function autoFormatIATA(iataString) {
    try {
        var cleaned = ("" + iataString).replace(/[^A-Za-z0-9, ]/g, "").toUpperCase();
        return cleaned;
    } catch (err) {
        return iataString.slice(0, -1);
    }
}

/**
 * Auto correct user input to IATA airport format.
 * @param {HTMLElement} elem User input field.
 * @return {undefined}
 */
function autoCorrectIATA(elem) {
    elem.target.value = elem.target.value.replace(/( )?(,)?( )*$/g, '');
}

/**
 * Store setting in the filter.
 * @see filter
 * @return {undefined}
 */
function saveSettings() {
    // Verfiy input.
    let invalidFlag = false;

    // Credit
    if (!creditTimeMin.value.match("^([0-9])([0-9])(:)([0-5])([0-9])|()$")) {
        invalidFlag = true;
        creditTimeMin.classList.add("is-invalid");
    }
    else {
        creditTimeMin.classList.remove("is-invalid");
    }
    if (!creditTimeMax.value.match("^([0-9])([0-9])(:)([0-5])([0-9])|()$")) {
        invalidFlag = true;
        creditTimeMax.classList.add("is-invalid");
    }
    else {
        // Make sure invalid is removed.
        creditTimeMax.classList.remove("is-invalid");
    }


    // TAFB
    if (!tafbTimeMin.value.match("^([0-9])([0-9])(:)([0-5])([0-9])|()$")) {
        invalidFlag = true;
        tafbTimeMin.classList.add("is-invalid");
    }
    else {
        // Make sure invalid is removed.
        tafbTimeMin.classList.remove("is-invalid");
    }
    if (!tafbTimeMax.value.match("^([0-9])([0-9])(:)([0-5])([0-9])|()$")) {
        invalidFlag = true;
        tafbTimeMax.classList.add("is-invalid");
    }
    else {
        // Make sure invalid is removed.
        tafbTimeMax.classList.remove("is-invalid");
    }

    // Total Block
    if (!tblkTimeMin.value.match("^([0-9])([0-9])(:)([0-5])([0-9])|()$")) {
        invalidFlag = true;
        tblkTimeMin.classList.add("is-invalid");
    }
    else {
        // Make sure invalid is removed.
        tblkTimeMin.classList.remove("is-invalid");
    }
    if (!tblkTimeMax.value.match("^([0-9])([0-9])(:)([0-5])([0-9])|()$")) {
        invalidFlag = true;
        tblkTimeMax.classList.add("is-invalid");
    }
    else {
        // Make sure invalid is removed.
        tblkTimeMax.classList.remove("is-invalid");
    }

    // Deadhead Time
    if (!dhTimeMin.value.match("^([0-9])([0-9])(:)([0-5])([0-9])|()$")) {
        invalidFlag = true;
        dhTimeMin.classList.add("is-invalid");
    }
    else {
        // Make sure invalid is removed.
        dhTimeMin.classList.remove("is-invalid");
    }
    if (!dhTimeMax.value.match("^([0-9])([0-9])(:)([0-5])([0-9])|()$")) {
        invalidFlag = true;
        dhTimeMax.classList.add("is-invalid");
    }
    else {
        // Make sure invalid is removed.
        dhTimeMax.classList.remove("is-invalid");
    }

    // Avoid Airports
    if (!avoidAirports.value.match("^([A-Z0-9]{3})*(,( )?[A-Z0-9]{3})*$")) {
        invalidFlag = true;
        avoidAirports.classList.add("is-invalid");
    }
    else {
        // Make sure invalid is removed.
        avoidAirports.classList.remove("is-invalid");
    }

    // Include Airports
    if (!includeAirports.value.match("^([A-Z0-9]{3})*(,( )?[A-Z0-9]{3})*$")) {
        invalidFlag = true;
        includeAirports.classList.add("is-invalid");
    }
    else {
        // Make sure invalid is removed.
        includeAirports.classList.remove("is-invalid");
    }

    // Update Filter.
    if (!invalidFlag) {
        filter.pairingLength[0] = document.getElementById("buttonPairingLength-min").innerText == "Min" ? -1 : parseInt(document.getElementById("buttonPairingLength-min").innerText);
        filter.pairingLength[1] = document.getElementById("buttonPairingLength-max").innerText == "Max" ? -1 : parseInt(document.getElementById("buttonPairingLength-max").innerText);
        filter.startTime[0] = document.getElementById("buttonStartTime-min").innerText == "Min" ? -1 : parseInt(document.getElementById("buttonStartTime-min").innerText.replace(":", ""));
        filter.startTime[1] = document.getElementById("buttonStartTime-max").innerText == "Max" ? -1 : parseInt(document.getElementById("buttonStartTime-max").innerText.replace(":", ""));
        filter.endTime[0] = document.getElementById("buttonEndTime-min").innerText == "Min" ? -1 : parseInt(document.getElementById("buttonEndTime-min").innerText.replace(":", ""));
        filter.endTime[1] = document.getElementById("buttonEndTime-max").innerText == "Max" ? -1 : parseInt(document.getElementById("buttonEndTime-max").innerText.replace(":", ""));
        filter.credit[0] = creditTimeMin.value == "" ? -1 : parseInt(creditTimeMin.value.replace(":", ""));
        filter.credit[1] = creditTimeMax.value == "" ? -1 : parseInt(creditTimeMax.value.replace(":", ""));
        filter.tafb[0] = tafbTimeMin.value == "" ? -1 : parseInt(tafbTimeMin.value.replace(":", ""));
        filter.tafb[1] = tafbTimeMax.value == "" ? -1 : parseInt(tafbTimeMax.value.replace(":", ""));
        filter.tblk[0] = tblkTimeMin.value == "" ? -1 : parseInt(tblkTimeMin.value.replace(":", ""));
        filter.tblk[1] = tblkTimeMax.value == "" ? -1 : parseInt(tblkTimeMax.value.replace(":", ""));
        filter.legs[0] = document.getElementById("buttonNumberOfLegs-min").innerText == "Min" ? -1 : parseInt(document.getElementById("buttonNumberOfLegs-min").innerText);
        filter.legs[1] = document.getElementById("buttonNumberOfLegs-max").innerText == "Max" ? -1 : parseInt(document.getElementById("buttonNumberOfLegs-max").innerText);
        filter.landings[0] = document.getElementById("buttonNumberOfLandings-min").innerText == "Min" ? -1 : parseInt(document.getElementById("buttonNumberOfLandings-min").innerText);
        filter.landings[1] = document.getElementById("buttonNumberOfLandings-max").innerText == "Max" ? -1 : parseInt(document.getElementById("buttonNumberOfLandings-max").innerText);
        filter.deadheads[0] = document.getElementById("buttonDeadheads-min").innerText == "Min" ? -1 : parseInt(document.getElementById("buttonDeadheads-min").innerText);
        filter.deadheads[1] = document.getElementById("buttonDeadheads-max").innerText == "Max" ? -1 : parseInt(document.getElementById("buttonDeadheads-max").innerText);
        filter.deadheadTime[0] = dhTimeMin.value == "" ? -1 : parseInt(dhTimeMin.value.replace(":", ""));
        filter.deadheadTime[1] = dhTimeMax.value == "" ? -1 : parseInt(dhTimeMax.value.replace(":", ""));
        filter.avoidAirports = avoidAirports.value.replace(/ /g, "").split(",");
        filter.avoidAirportsLegs = document.getElementById("settings_avoidAirportsCheckbox").checked;
        filter.includeAirports = includeAirports.value.replace(/ /g, "").split(",");
        filter.includeAirportsLegs = document.getElementById("settings_includeAirportsCheckbox").checked;
        filter.daysOfTheWeekLegs = document.getElementById("settings_daysCheckbox").checked;

        // Dismiss modal.
        $('#filterModalCenter').modal('hide')

        // Redraw map.
        buildLegs();
    }
}

/**
 * Reset settings in the filter.
 * @see filter
 * @return {undefined}
 */
function resetSettings() {
    // Form reset
    document.getElementById("buttonPairingLength-min").value = -1;
    document.getElementById("buttonPairingLength-min").innerText = "Min";
    document.getElementById("buttonPairingLength-max").value = -1;
    document.getElementById("buttonPairingLength-max").innerText = "Max";
    document.getElementById("buttonStartTime-min").value = -1;
    document.getElementById("buttonStartTime-min").innerText = "Min";
    document.getElementById("buttonStartTime-max").value = -1;
    document.getElementById("buttonStartTime-max").innerText = "Max";
    document.getElementById("buttonEndTime-min").value = -1;
    document.getElementById("buttonEndTime-min").innerText = "Min";
    document.getElementById("buttonEndTime-max").value = -1;
    document.getElementById("buttonEndTime-max").innerText = "Max";
    creditTimeMin.value = "";
    creditTimeMax.value = "";
    tafbTimeMin.value = "";
    tafbTimeMax.value = "";
    tblkTimeMin.value = "";
    tblkTimeMax.value = "";
    document.getElementById("buttonNumberOfLegs-min").value = -1;
    document.getElementById("buttonNumberOfLegs-min").innerText = "Min";
    document.getElementById("buttonNumberOfLegs-max").value = -1;
    document.getElementById("buttonNumberOfLegs-max").innerText = "Max";
    document.getElementById("buttonNumberOfLandings-min").value = -1;
    document.getElementById("buttonNumberOfLandings-min").innerText = "Min";
    document.getElementById("buttonNumberOfLandings-max").value = -1;
    document.getElementById("buttonNumberOfLandings-max").innerText = "Max";
    document.getElementById("buttonDeadheads-min").value = -1;
    document.getElementById("buttonDeadheads-min").innerText = "Min";
    document.getElementById("buttonDeadheads-max").value = -1;
    document.getElementById("buttonDeadheads-max").innerText = "Max";
    dhTimeMin.value = "";
    dhTimeMax.value = "";
    avoidAirports.value = "";
    document.getElementById("settings_avoidAirportsCheckbox").checked = false;
    includeAirports.value = "";
    document.getElementById("settings_includeAirportsCheckbox").checked = false;
    document.getElementById("settings_daysCheckbox").checked = false;

    // Filter reset
    filter = {
        codeshares: ["AA", "DL", "UA"],
        bases: ["BOS", "CMH", "DCA", "EWR", "IND", "LGA", "ORD", "PHL", "PIT", "SDF"],
        daysOfTheWeek: ["MO", "TU", "WE", "TH", "FR", "SA", "SU"],
        daysOfTheWeekLegs: false,
        pairingLength: [-1, -1],
        startTime: [-1, -1],
        endTime: [-1, -1],
        credit: [-1, -1],
        tafb: [-1, -1],
        tblk: [-1, -1],
        legs: [-1, -1],
        landings: [-1, -1],
        deadheads: [-1, -1],
        deadheadTime: [-1, -1],
        avoidAirports: [""],
        avoidAirportsLegs: false,
        includeAirports: [""],
        includeAirportsLegs: false
    };

    document.getElementById("settings_resetButton").innerText = "Done!"
    setTimeout(() => {
        document.getElementById("settings_resetButton").innerText = "Reset";
    }, "3000");

    // Redraw map.
    buildLegs();
}

/**
 * Store setting in the filter.
 * @see filter
 * @return {undefined}
 */
function uploadFiles() {
    // Get file list.
    let filesList = document.getElementById("uploadInput").files;

    // Update file list on modal.
    updateFileList(filesList);

    // Change upload button to inhibit clicks and display spinner.
    let uploadButton = document.getElementById("uploadButton");
    uploadButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
    uploadButton.disabled = true;

    // Go through each file and read.
    readFiles(filesList)
        .then((result) => {
            if (result.indexOf(false) == -1) {
                uploadButton.innerHTML = 'Upload';
                uploadButton.disabled = false;
                updatePagination();
                if (allPairingsJSON.length != 0) {
                    pairingsJSON = allPairingsJSON[0][2];
                    saveToDatabase();
                }
                buildLegs();
                $("#uploadModalCenter").modal("hide");
            }
            else {
                uploadButton.innerHTML = 'Upload';
                uploadButton.disabled = false;
                if (result.indexOf(true) != -1) {
                    updatePagination();
                    if (allPairingsJSON.length != 0) {
                        pairingsJSON = allPairingsJSON[0][2];
                        saveToDatabase();
                    }
                    buildLegs();
                }
            }
        });
}

/**
 * Get an array of files.
 * @async
 * @param {FileList} filesList List of files to be read. 
 * @returns {Promise<Files[]>} Promise to an array of files.
 */
async function readFiles(filesList) {
    let filesToRead = [];

    for (let i = 0; i < filesList.length; i++) {
        filesToRead.push(readFile(filesList[i]));
    }

    return Promise.all(filesToRead);
}

/**
 * Read a file and store its contents.
 * @param {File} file File to be read.
 * @returns {Promise<Boolean>} Promise to a boolean indicating whether the file was read and information was stored.
 */
function readFile(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = function (e) {
            let myData = new Uint8Array(e.target.result);
            let docInitParams = { data: myData };
            getPDFPairings(docInitParams, file.name)
                .then((pairingObjects) => {

                    if (pairingObjects.length == 0) {
                        return resolve(false);
                    }

                    // If allPairings is empty.
                    if (allPairingsJSON.length == 0) {
                        allPairingsJSON.push(pairingObjects);
                    }
                    else {
                        // Insert into allPairings array in order of year/month.
                        for (let j = 0; j < allPairingsJSON.length; j++) {
                            // Year
                            if (parseInt(pairingObjects[1]) > parseInt(allPairingsJSON[j][1])) {
                                allPairingsJSON.splice(j, 0, pairingObjects);
                                break;
                            }
                            if (parseInt(pairingObjects[1]) == parseInt(allPairingsJSON[j][1])) {
                                // Month

                                // Check if year/month already exists.
                                if (monthArray.indexOf(pairingObjects[0]) == monthArray.indexOf(allPairingsJSON[j][0])) {

                                    // If pairing ID doesn't exist, insert.
                                    for (let k = 0; k < pairingObjects[2].length; k++) {
                                        if (allPairingsJSON[j][2].some(p => p.id == pairingObjects[2][k].id)) {
                                            // Already exists. Stop searching.
                                            continue;
                                        }
                                        else {
                                            // Insert.
                                            allPairingsJSON[j][2].push(pairingObjects[2][k]);
                                            continue;
                                        }
                                    }

                                    // allPairingsJSON[j][2] = allPairingsJSON[j][2].concat(pairingObjects[2]);
                                    break;
                                }

                                if (monthArray.indexOf(pairingObjects[0]) > monthArray.indexOf(allPairingsJSON[j][0])) {
                                    // Insert in front and then break.
                                    allPairingsJSON.splice(j, 0, pairingObjects);
                                    break;
                                }
                            }
                            if (j == allPairingsJSON.length - 1) {
                                // Insert at end.
                                allPairingsJSON.push(pairingObjects);
                            }
                        }
                    }
                    resolve(true);
                });
        }
    });
}

/**
 * Update file list of the upload file modal view.
 * @param {FileList} files List of files.
 * @return {undefined}
 */
function updateFileList(files) {
    let uploadList = document.getElementById("uploadList");

    uploadList.innerHTML = "";

    for (let i = 0; i < files.length; i++) {
        let listHTML = '<li class="list-group-item" id="' +
            files[i].name +
            '">' +
            files[i].name +
            '<div class="progress">' +
            '<div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-label="Example with label" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">Pending</div>' +
            '</div>' +
            '</li>'
        uploadList.innerHTML += listHTML;
    }
}

/**
 * Repopulate the pagination list.
 * @return {undefined}
 */
function updatePagination() {
    let pagination = document.getElementById("month-pagination");
    pagination.innerHTML = "";
    for (let i = 0; i < allPairingsJSON.length; i++) {
        let active = "";
        if (i == 0) active = " active";
        pagination.innerHTML += '<li class="page-item"><a class="page-link' + active + '" href="#">' + allPairingsJSON[i][0].charAt(0) + allPairingsJSON[i][0].slice(1).toLowerCase() + '-' + allPairingsJSON[i][1] + '</a></li>';
    }
    pagination.innerHTML += '<li class="page-item">' +
        '<a id="upload" type="button" class="page-link" title="Other Settings" data-bs-toggle="modal" data-bs-target="#uploadModalCenter">' +
        '<i class="fa-solid fa-file-pdf" aria-hidden="true"></i>' +
        '</a></li>'
}

/**
 * Toggles the loading screen overlay.
 * @return {undefined}
 */
function toggleLoadingScreen() {
    let loadingScreen = document.getElementById("loadingScreen");

    if (loadingScreen.classList.contains("loadingShow")) {
        document.getElementById("loadingScreen").classList.remove("loadingShow");
        document.getElementById("loadingScreen").classList.add("loadingHide");
    }
    else {
        document.getElementById("loadingScreen").classList.remove("loadingHide");
        document.getElementById("loadingScreen").classList.add("loadingShow");
    }
}

/**
 * Convert time from HHMM format to hours.
 * @param {String} time Time in HHMM format.
 * @return {Number} Number of hours.
 */
function timeToHours(time) {

    if (time == "") {
        return 0;
    }

    let hours = 0;

    if (time.length == 4) {
        hours += Number(time.slice(0, 2));
        hours += Number((time.slice(2, 4) / 60));
    }
    else if (time.length == 3) {
        hours += Number(time.slice(0, 1));
        hours += Number((time.slice(1, 3) / 60));
    }
    else if (time.length <= 2) {
        hours += Number((time / 60));
    }

    return hours;
}

/**
 * Generate and display a distribution of trip lengths for each base.
 * @param {Pairing[]} pairings Array of pairings
 * @return {undefined}
 */
function buildBaseDistributions(pairings) {
    // Get placeholders.
    let bos = document.getElementById("dist_bos");
    let cmh = document.getElementById("dist_cmh");
    let dca = document.getElementById("dist_dca");
    let ewr = document.getElementById("dist_ewr");
    let ind = document.getElementById("dist_ind");
    let lga = document.getElementById("dist_lga");
    let ord = document.getElementById("dist_ord");
    let phl = document.getElementById("dist_phl");
    let pit = document.getElementById("dist_pit");
    let sdf = document.getElementById("dist_sdf");

    let elements = [bos, cmh, dca, ewr, ind, lga, ord, phl, pit, sdf];
    let labels = [document.getElementById("dist_bos_label"), document.getElementById("dist_cmh_label"), document.getElementById("dist_dca_label"), document.getElementById("dist_ewr_label"), document.getElementById("dist_ind_label"),
    document.getElementById("dist_lga_label"), document.getElementById("dist_ord_label"), document.getElementById("dist_phl_label"), document.getElementById("dist_pit_label"), document.getElementById("dist_sdf_label")];

    let distributions = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]; // Array of arrays. Format [total, aa, dl, ua]

    pairings.forEach(function (pair) {
        let baseArray = distributions[basesIATA.indexOf(pair.base)];
        baseArray[0] += 1;
        switch (pair.codeshare) {
            case 'AA': baseArray[1] += 1;
                break;
            case 'DL': baseArray[2] += 1;
                break;
            case 'UA': baseArray[3] += 1;
                break;
            default: break;
        }
    });

    // For no data.
    if (pairings.length == 0) {
        for (let i = 0; i < elements.length; i++) {
            labels[i].innerHTML = '<span class="badge bg-secondary">' + basesIATA[i] + '</span>'
            elements[i].innerHTML = '<div class="progress" style="width: 0%">' +
                '</div>';
        }
    }
    else {
        let largestBase = 0;
        distributions.forEach(function (base) {
            if (base[0] > largestBase) largestBase = base[0];
        })

        for (let i = 0; i < elements.length; i++) {
            labels[i].innerHTML = '<span class="badge bg-secondary" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="' + (distributions[i][0] / pairings.length * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '%">' + basesIATA[i] + '</span>'
            elements[i].innerHTML = '<div class="progress" style="width:' + (distributions[i][0] / largestBase * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '%">' +
                '<div class="progress-bar bg-aa" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="AA (' + ((distributions[i][1] / distributions[i][0]) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '%)" role="progressbar" aria-label="' + basesIATA[i] + '_AA" style="width: ' + ((distributions[i][1] / distributions[i][0]) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '%" aria-valuenow="' + ((distributions[i][1] / distributions[i][0]) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '" aria-valuemin="0" aria-valuemax="100">' + ((distributions[i][1] / distributions[i][0]) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '</div>' +
                '<div class="progress-bar bg-dl" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="DL (' + ((distributions[i][2] / distributions[i][0]) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '%)" role="progressbar" aria-label="' + basesIATA[i] + '_DL" style="width: ' + ((distributions[i][2] / distributions[i][0]) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '%" aria-valuenow="' + ((distributions[i][2] / distributions[i][0]) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '" aria-valuemin="0" aria-valuemax="100">' + ((distributions[i][2] / distributions[i][0]) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '</div>' +
                '<div class="progress-bar bg-ua" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="UA (' + ((distributions[i][3] / distributions[i][0]) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '%)" role="progressbar" aria-label="' + basesIATA[i] + '_UA" style="width: ' + ((distributions[i][3] / distributions[i][0]) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '%" aria-valuenow="' + ((distributions[i][3] / distributions[i][0]) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '" aria-valuemin="0" aria-valuemax="100">' + ((distributions[i][3] / distributions[i][0]) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 }) + '</div>' +
                '</div>';
        }
    }

    tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

}

/**
 * Copy pairings list to clipboard.
 * @return {undefined}
 */
function copyPairings() {
    let button = document.getElementById("stats_pairingsListButton");
    navigator.clipboard.writeText(document.getElementById("stats_pairingsList").innerText);
    button.innerHTML = '<i class="fa-solid fa-check"></i>'
    setTimeout(() => {
        button.innerHTML = '<i class="fa fa-copy"></i>';
    }, "3000");
}

//  =======================================================================================
//  Initializers & Event Listeners
//  =======================================================================================

// Enable tooltips.
let tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
let tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

/**
 * Settings: Min and Max input fields.
 */
const creditTimeMin = document.getElementById("settings_CreditMin");
const creditTimeMax = document.getElementById("settings_CreditMax");
const tafbTimeMin = document.getElementById("settings_TafbMin");
const tafbTimeMax = document.getElementById("settings_TafbMax");
const tblkTimeMin = document.getElementById("settings_TblkMin");
const tblkTimeMax = document.getElementById("settings_TblkMax");
const avoidAirports = document.getElementById("settings_avoidAirports");
const includeAirports = document.getElementById("settings_includeAirports");
const dhTimeMin = document.getElementById("settings_dhMin");
const dhTimeMax = document.getElementById("settings_dhMax");

/**
 * Settings: Assign auto format functions to each input field. 
 */
creditTimeMin.oninput = (e) => { e.target.value = autoFormatTime(e.target.value); };
creditTimeMax.oninput = (e) => { e.target.value = autoFormatTime(e.target.value); };
tafbTimeMin.oninput = (e) => { e.target.value = autoFormatTime(e.target.value); };
tafbTimeMax.oninput = (e) => { e.target.value = autoFormatTime(e.target.value); };
tblkTimeMin.oninput = (e) => { e.target.value = autoFormatTime(e.target.value); };
tblkTimeMax.oninput = (e) => { e.target.value = autoFormatTime(e.target.value); };
avoidAirports.oninput = (e) => { e.target.value = autoFormatIATA(e.target.value); };
includeAirports.oninput = (e) => { e.target.value = autoFormatIATA(e.target.value); };
dhTimeMin.oninput = (e) => { e.target.value = autoFormatTime(e.target.value); };
dhTimeMax.oninput = (e) => { e.target.value = autoFormatTime(e.target.value); };

/**
 * Settings: trigger autocorrect functions on focusout to each input field.
 */
creditTimeMin.addEventListener("focusout", textFieldMaxMinCorrect);
creditTimeMax.addEventListener("focusout", textFieldMaxMinCorrect);
tafbTimeMin.addEventListener("focusout", textFieldMaxMinCorrect);
tafbTimeMax.addEventListener("focusout", textFieldMaxMinCorrect);
tblkTimeMin.addEventListener("focusout", textFieldMaxMinCorrect);
tblkTimeMax.addEventListener("focusout", textFieldMaxMinCorrect);
avoidAirports.addEventListener("focusout", autoCorrectIATA);
includeAirports.addEventListener("focusout", autoCorrectIATA);
dhTimeMin.addEventListener("focusout", textFieldMaxMinCorrect);
dhTimeMax.addEventListener("focusout", textFieldMaxMinCorrect);

/**
 * Filter control panel.
 */
L.control.custom({
    position: 'topright',
    content:
        '<div class="accordion btn-group-vertical" id="accordionFilter">' +
        '<button type="button" class="btn btn-primary" title="Codeshares" data-bs-toggle="collapse" data-bs-target="#collapseCodeshares" aria-expanded="false" aria-controls="collapseCodeshares" data-bs-tooltip="tooltip" data-bs-placement="left" data-bs-trigger="hover">' +
        '<i class="fa-solid fa-plane-up"></i>' +
        '</button>' +
        '<div id="collapseCodeshares" class="collapse" data-bs-parent="#accordionFilter">' +
        '<div class="btn-group-vertical">' +
        '<button data-filter="codeshare_AA" type="button" class="btn btn-secondary active" id="codeshare_aa_btn" title="American Airlines" aria-pressed="true" autocomplete="off">' +
        '<img data-filter="codeshare_AA" src="/pairings/assets/images/logo_aa.png">' +
        '</button>' +
        '<button data-filter="codeshare_DL" type="button" class="btn btn-secondary active" id="codeshare_dl_btn" title="Delta Air Lines" aria-pressed="true" autocomplete="off">' +
        '<img data-filter="codeshare_DL" src="/pairings/assets/images/logo_dl.png">' +
        '</button>' +
        '<button data-filter="codeshare_UA" type="button" class="btn btn-secondary active" id="codeshare_ua_btn" title="United Airlines" aria-pressed="true" autocomplete="off">' +
        '<img data-filter="codeshare_UA" src="/pairings/assets/images/logo_ua.png">' +
        '</button>' +
        '</div>' +
        '</div>' +
        '<button type="button" class="btn btn-info" title="Bases" data-bs-toggle="collapse" data-bs-target="#collapseBases" aria-expanded="false" aria-controls="collapseBases" data-bs-tooltip="tooltip" data-bs-placement="left" data-bs-trigger="hover">' +
        '<i class="fa fa-home"></i>' +
        '</button>' +
        '<div id="collapseBases" class="collapse" data-bs-parent="#accordionFilter">' +
        '<div class="btn-group-vertical">' +
        '<button data-filter="base_BOS" type="button" class="btn btn-secondary active btn-text" title="Boston" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="base_BOS">BOS</span>' +
        '</button>' +
        '<button data-filter="base_CMH" type="button" class="btn btn-secondary active btn-text" title="Columbus" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="base_CMH">CMH</span>' +
        '</button>' +
        '<button data-filter="base_DCA" type="button" class="btn btn-secondary active btn-text" title="Washington, DC" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="base_DCA">DCA</span>' +
        '</button>' +
        '<button data-filter="base_EWR" type="button" class="btn btn-secondary active btn-text" title="Newark" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="base_EWR">EWR</span>' +
        '</button>' +
        '<button data-filter="base_IND" type="button" class="btn btn-secondary active btn-text" title="Indianapolis" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="base_IND">IND</span>' +
        '</button>' +
        '<button data-filter="base_LGA" type="button" class="btn btn-secondary active btn-text" title="La Guardia" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="base_LGA">LGA</span>' +
        '</button>' +
        '<button data-filter="base_ORD" type="button" class="btn btn-secondary active btn-text" title="Chicago" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="base_ORD">ORD</span>' +
        '</button>' +
        '<button data-filter="base_PHL" type="button" class="btn btn-secondary active btn-text" title="Philadelphia" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="base_PHL">PHL</span>' +
        '</button>' +
        '<button data-filter="base_PIT" type="button" class="btn btn-secondary active btn-text" title="Pittsburgh" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="base_PIT">PIT</span>' +
        '</button>' +
        '<button data-filter="base_SDF" type="button" class="btn btn-secondary active btn-text" title="Louisville" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="base_SDF">SDF</span>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '<button type="button" class="btn btn-danger" title="Days of the Week" data-bs-toggle="collapse" data-bs-target="#collapseDays" aria-expanded="false" aria-controls="collapseDays" data-bs-tooltip="tooltip" data-bs-placement="left" data-bs-trigger="hover">' +
        '<i class="fa fa-calendar"></i>' +
        '</button>' +
        '<div id="collapseDays" class="collapse" data-bs-parent="#accordionFilter">' +
        '<div class="btn-group-vertical">' +
        '<button data-filter="day_MO" type="button" class="btn btn-secondary active btn-text" title="Monday" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="day_MO">MO</span>' +
        '</button>' +
        '<button data-filter="day_TU" type="button" class="btn btn-secondary active btn-text" title="Tuesday" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="day_TU">TU</span>' +
        '</button>' +
        '<button data-filter="day_WE" type="button" class="btn btn-secondary active btn-text" title="Wednesday" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="day_WE">WE</span>' +
        '</button>' +
        '<button data-filter="day_TH" type="button" class="btn btn-secondary active btn-text" title="Thursday" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="day_TH">TH</span>' +
        '</button>' +
        '<button data-filter="day_FR" type="button" class="btn btn-secondary active btn-text" title="Friday" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="day_FR">FR</span>' +
        '</button>' +
        '<button data-filter="day_SA" type="button" class="btn btn-secondary active btn-text" title="Saturday" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="day_SA">SA</span>' +
        '</button>' +
        '<button data-filter="day_SU" type="button" class="btn btn-secondary active btn-text" title="Sunday" aria-pressed="true" autocomplete="off">' +
        '<span data-filter="day_SU">SU</span>' +
        '</button>' +
        '</div>' +
        '</div>' +
        '<button type="button" class="btn btn-purple" title="Filters" data-bs-toggle="modal" data-bs-target="#filterModalCenter" data-bs-tooltip="tooltip" data-bs-placement="left" data-bs-trigger="hover">' +
        '<i class="fa fa-filter" aria-hidden="true"></i>' +
        '</button>' +
        '<button type="button" class="btn btn-warning" title="Stats" data-bs-toggle="collapse" data-bs-target="#collapseInfo" aria-expanded="false" aria-controls="collapseInfo" data-bs-tooltip="tooltip" data-bs-placement="left" data-bs-trigger="hover">' +
        '<i class="fa-solid fa-chart-bar"></i>' +
        '</button>' +
        '<button type="button" class="btn btn-success" title="Help" data-bs-toggle="modal" data-bs-target="#helpModalCenter" data-bs-tooltip="tooltip" data-bs-placement="left" data-bs-trigger="hover">' +
        '<i class="fa-solid fa-circle-question" aria-hidden="true"></i>' +
        '</button>' +
        '<button type="button" class="btn btn-secondary" title="About" data-bs-toggle="modal" data-bs-target="#infoModalCenter" data-bs-tooltip="tooltip" data-bs-placement="left" data-bs-trigger="hover">' +
        '<i class="fa-solid fa-circle-info" aria-hidden="true"></i>' +
        '</button>' +
        '</div>',
    classes: 'btn-group-vertical d-flex',
    style:
    {
        margin: '10px',
        padding: '0px 0 0 0',
        cursor: 'pointer',
    },
    datas:
    {
        'foo': 'bar',
    },
    events:
    {
        click: function (data) {
            if (data.detail == 1) {
                pendingClick = setTimeout(() => {
                    clearTimeout(pendingClick);
                    singleClickAction(data);
                }, 200);
            }
            else {
                clearTimeout(pendingClick);
                doubleClickAction(data);
            }
        },
        contextmenu: function (data) {
        },
    }
})
    .addTo(map);

/**
 * Stats collapse button at bottom of page. 
 */
L.control.custom({
    position: 'bottomleft',
    content:
        '<div>' +
        '<button type="button" class="btn infoButton" data-bs-toggle="collapse" data-bs-target="#collapseInfo" aria-expanded="false" aria-controls="collapseInfo" ><i style="" class="fa fa-chevron-up fa-2xs"></i></button>' +
        '</div>',
    classes: 'infoButton',
    style:
    {
        margin: '0',
        padding: '0px 0 0 0',
        cursor: 'pointer',
    }
})
    .addTo(map);

/**
 * Pagination menu.
 */
L.control.custom({
    position: 'bottomleft',
    content:
        '<div>' +
        ' <nav aria-label="Page navigation example">' +
        '<ul class="pagination" id="month-pagination">' +
        '<li class="page-item">' +
        '<a id="upload" type="button" class="page-link" title="Upload" data-bs-toggle="modal" data-bs-target="#uploadModalCenter">' +
        '<i class="fa-solid fa-file-pdf" aria-hidden="true"></i>' +
        '</a></li>' +
        ' </ul>' +
        ' </nav>' +
        '</div>',
    classes: 'paginationYears',
    style:
    {
        margin: '0',
        padding: '0px 0 0 0',
        cursor: 'pointer',
    },
    datas:
    {
        'foo': 'bar',
    },
    events:
    {
        click: function (data) {
            if (data.target.id == "upload") {
                // Id clicked.

            }
            else {
                if (data.target.tagName == "DIV") {
                    // Ignore.
                }
                else {
                    changeMonthYear(data);
                }
            }
        }
    }
})
    .addTo(map);