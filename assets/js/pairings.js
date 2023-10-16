/**
 * @file Parses PDF into JSON data.
 * @author David Banwell-Clode <David@Banwell-Clode.com>
 */

/**
 * Pairing Class
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
class Pairing {
    /**
     * @param {String} id 
     */
    constructor(id) {
        this.id = id;
        /** @type {String[]} */
        this.days = [];
        this.base = 'nil';
        /** @type {Leg[]} */
        this.legs = [];
        this.start = '';
        this.end = '';
        this.tblk = '';
        this.dh = '0';
        /** @type {Hotel[]} */
        this.hotels = [];
        this.cdt = '';
        this.tafb = '';
        this.ldgs = '';
        this.codeshare = '';
        this.length = 0;
    }

    // String getter
    get toString() {
        return this.makeString();
    }

    // String method
    makeString() {
        return ("'" + this.id + "', '" + this.codeshare + "', '"
            + this.days.join("', '") + "', '" + this.base + "', "
            + Array.from(this.legs, x => x.toString).join("', ")
            + ", '" + this.start + "', '" + this.end + "', '" + this.tblk + "', '" + this.dh
            + Array.from(this.hotels, x => x.toString).join("', '")
            + ", '" + this.cdt + "', '" + this.tafb + "', '" + this.ldgs + "'");
    }

}

/**
 * Leg Class
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
class Leg {
    constructor() {
        this.origin = '';
        this.destination = '';
        this.flightNum = '';
        this.day = '';
        this.deadhead = false;
        this.depl = '';
        this.arrl = '';
        this.blkt = '';
        this.grnt = '';
        this.eqp = '';
        this.tblk = '';
        this.tcrd = '';
        this.tpay = '';
        this.duty = '';
        this.layo = '';
    }

    get toString() {
        return this.makeString();
    }

    makeString() {
        return ("'" + this.day + "', '" + this.deadhead + "', '" + this.flightNum + "', '" + this.origin + "', '" + this.destination + "'");
    }
}

/**
 * Hotel Class
 * @see pairings.py
 * @typedef {Object} Hotel
 * @property {String} name - Hotel name.
 * @property {String} phone - Hotel phone number.
 */
class Hotel {
    constructor(name, phone) {
        /**
         * @type {String}
         */
        this.name = name;
        /**
         * @type {String}
         */
        this.phone = phone;
    }

    get toString() {
        return this.makeString();
    }

    makeString() {
        return ("'" + this.name + "', '" + this.phone + "'");
    }
}

/**
 * Static arrays.
 */
const calendar = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'];
const daysOfTheWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const monthsOfTheYear = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'Ocotber']


// main();

// test();

// function test() {
//     getPDFPairings("demo.pdf")
//         .then((result) => console.log(result));
// }

// function main() {
//     let pairings = [];

//     // TODO: Get from file.
//     let month = "";
//     let year = "";
//     let codeshare = "";

//     getPDFText("demo.pdf")
//         .then((text) => {
//             let firstLine = text.split("\r\n")[1];
//             month = firstLine.split(" ")[0].substring(0, 3).toUpperCase();
//             year = firstLine.split(" ")[1].substring(2, 4);
//             codeshare = firstLine.split(" ")[3];
//             return buildPairings(text);
//         })
//         .then((res) => parsePairings(res, codeshare))
//         .then((pairs) => {
//             return verifyPairings(pairs);
//         });
// }

/**
 * Get Pairings from PDF.
 * @async
 * @param {File} file PDF file.
 * @param {String} fileName Name of the PDF file.
 * @returns {Promise<Array<String, String, Pairing[]>>} [month, year, pairings]
 */
async function getPDFPairings(file, fileName) {
    let pairings = [];
    let month = "";
    let year = "";
    let codeshare = "";

    const text = await getPDFText(file, fileName);

    // Check first line to see if it is a pairing file.
    // FORMAT: Month Year Pilot AA/DL/UA Pairings
    if (text.split(/\r?\n|\r|\n/g)[0].search(/^(January|February|March|April|May|June|July|August|September|October|November|December|Ocotber) (20)(\d{2}) Pilot (AA|DL|UA) Pairings .*$/) == -1) {
        // Incorrect file format.
        let progressBar = document.getElementById(fileName).children[0].children[0];
        progressBar.style.width = "100%";
        progressBar.ariaValueNow = "100";
        progressBar.innerText = "Error parsing PDF file: Format not as expected.";
        progressBar.classList.add("bg-danger")
        console.error("[ERROR] Error parsing file. Format not as expected.");
        return [];
    }

    let firstLine = text.split(/\r?\n|\r|\n/g)[0];
    month = firstLine.split(" ")[0].substring(0, 3).toUpperCase();
    if (month == "OCO") month = "OCT";
    year = firstLine.split(" ")[1].substring(2, 4);
    codeshare = firstLine.split(" ")[3];

    const builtPairings = await buildPairings(text);
    const parsedPairings = await parsePairings(builtPairings, codeshare);
    pairings = parsedPairings;

    return ([month, year, pairings]);

}

/**
 * Get the text from a page.
 * @param {String} fileName Name of the file.
 * @param {Object} pdf PDF.loadingTask.promise.
 * @param {Number} pageNo Page number.
 * @param {Number} incr Increment amount for progress bar.
 * @returns {Promise<String>} Promise to a string containing the text from a pdf page.
 */
async function getPageText(fileName, pdf, pageNo, incr) {
    const page = await pdf.getPage(pageNo);
    const textContent = await page.getTextContent();
    var textItems = textContent.items;
    var finalString = "";
    var line = 0;

    // Concatenate the string of the item to the final string
    for (var i = 0; i < textItems.length; i++) {
        if (line != textItems[i].transform[5]) {
            if (line != 0) {
                finalString += '\r\n';
            }

            line = textItems[i].transform[5]
        }
        var item = textItems[i];

        finalString += item.str;
    }

    // Update progress bar per page.
    let progressBar = document.getElementById(fileName).children[0].children[0];
    let newWidth = parseFloat(progressBar.style.width) + incr;
    if (newWidth > 100) newWidth = 100;
    progressBar.style.width = newWidth + "%";
    progressBar.ariaValueNow = newWidth;
    progressBar.innerText = Math.ceil(newWidth) + "%";
    return finalString;
}

/**
 * Get text from a PDF document.
 * @param {File} file PDF file.
 * @param {String} fileName Name of pdf file.
 * @returns {Promise<String>} Promise to a string containing all text from a PDF.
 */
async function getPDFText(file, fileName) {
    // The workerSrc property shall be specified.
    //
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    // 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js';

    //
    // Asynchronous download PDF
    //
    const loadingTask = pdfjsLib.getDocument(file);
    //
    // Load PDF
    //
    const pdf = await loadingTask.promise;

    // How many pages are there?
    let maxPages = pdf.numPages;
    let pageTask = [];
    for (let i = 1; i <= maxPages; i++) {
        pageTask.push(getPageText(fileName, pdf, i, 100 / maxPages));
    }

    const finalStrings = await Promise.all(pageTask)
    return finalStrings.join("\n");
}

/**
 * Divide string into pairings.
 * @param {String} pdfText String of PDF text.
 * @returns {String[]} Array of pairings as strings.
 */
async function buildPairings(pdfText) {
    let lines = pdfText.split(/\r?\n|\r|\n/g);
    let pairingArray = [];
    let flag = false; // Inside pairing indicator.
    let pairing = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Detect new column. First word is a month.
        if (monthsOfTheYear.some(function (v) { return line.includes(v) })) {
            flag = false;
            continue;
        }

        // Detect '='. Now inside the first pairing.
        if (line.includes("========================================================================") && !flag) {
            flag = true;
            continue;
        }

        // Inside of pairing.
        if (flag) {
            if (line.includes("========================================================================")) {
                // End of pairing. Save and reset.
                pairingArray.push(pairing);
                pairing = [];
                continue;
            }
            // Append line to pairing string.
            if (!((!/\S/.test(line)) || line == "" || line.includes("(This is intentionally left blank.)") || line.includes("STANDOVER"))) {
                pairing.push(line);
            }
        }
    }
    return pairingArray;
}

/**
 * Convert pairing strings into pairing objects.
 * @param {String[]} pairArr Array of pairing strings.
 * @param {String} codeshare Codeshare of the pairings.
 * @returns {Pairing[]} Array of pairing objects.
 */
async function parsePairings(pairArr, codeshare) {
    pairings = [];
    pairingStrings = [];
    flag = false;
    pairingStr = "";

    // Create pairing objects, and legs.
    for (let j = 0; j < pairArr.length; j++) {
        let pairing = pairArr[j];
        // Create new pairing object.
        pairingObj = new Pairing("0");
        pairingObj.codeshare = codeshare;

        // Iterate through each line.
        for (let i = 0; i < pairing.length; i++) {
            // Whitespace
            if ((!/\S/.test(pairing[i]))) {
                continue;
            }

            // console.log(pairing[i].trim().split(/\s+/));
            // let reg = pairing[i].replaceAll(":","").trim().split(" ").filter(function(elem) { return /\S/.test(elem); });
            let reg = pairing[i].replaceAll(":", "").trim().split(" ").filter(function (elem) { return elem != "" });

            // Line is empty. Shouldn't get here.
            if (reg.length < 1) {
                console.log("WARNING: No data: " + pairing[i]);
                console.log("Line: " + i);
                console.log(reg);
                console.log(pairing);
                break;
            }

            if (i == 0) {
                // ID
                pairingObj.id = reg[0];

                // Check 2nd item is "BASE"
                if (reg[1] != "BASE") {
                    console.log("[AUTOCORRECT] Fixing 'BASE'.");
                    if (reg[1] + reg[2] == "BASE") {
                        reg[1] = reg[1] + reg.splice(2, 1);
                    }
                    else {
                        console.error("[ERROR] Unable to fix 'BASE'. " + pairingObj.id);
                        console.error(reg[1]);
                        console.error(reg);
                        throw new Error("Unable to fix 'BASE'.");
                    }
                }
                // Check 3rd item is "REPT"
                if (reg[2] != "REPT") {
                    console.log("[AUTOCORRECT] Fixing 'REPT'.");
                    // Try and fix.
                    if (reg[2] == "R") {
                        if (reg[3] == "EPT") {
                            reg[2] = "REPT";
                            reg.splice(3, 1);
                        }
                        else if (reg[3].substring(0, 3) == "EPT") {
                            reg[2] = "REPT";
                            reg[3] = reg[3].substring(3);
                        }
                        else {
                            console.error("[ERROR] Unable to fix 'REPT'. " + pairingObj.id);
                            console.error(reg[2]);
                            console.error(reg);
                            throw new Error("Unable to fix 'REPT'.");
                        }
                    }
                    else if (reg[2] == "RE") {
                        if (reg[3] == "PT") {
                            reg[2] == "REPT";
                            reg.splice(3, 1);
                        }
                        else if (reg[3].substring(0, 2) == "PT") {
                            reg[2] = "REPT";
                            reg[3] = reg[3].substring(2);
                        }
                        else {
                            console.error("[ERROR] Unable to fix 'REPT'. " + pairingObj.id);
                            console.error(reg[2]);
                            console.error(reg);
                            throw new Error("Unable to fix 'REPT'.");
                        }
                    }
                    else if (reg[3] == "T") {
                        reg[2] = reg[2] + reg.splice(3, 1);
                    }
                    else if (reg[3].charAt(0) == "T") {
                        reg[2] = reg[2] + "T";
                        reg[3] = reg[3].substring(1);
                    }
                    else {
                        console.error("[ERROR] Unable to fix 'REPT'. " + pairingObj.id);
                        console.error(reg[2]);
                        console.error(reg);
                        throw new Error("Unable to fix 'REPT'.");
                    }
                }

                // Start time. Format: HHMML
                if (reg[3].length != 5) {
                    console.log("[AUTOCORRECT] Fixing start.");
                    reg[3] = reg[3] + reg.splice(4, 1);
                    if (reg[3].length != 5) {
                        console.error("[ERROR] Incorrect start time format for pairing. " + pairingObj.id);
                        console.error(reg[3]);
                        console.error(reg);
                        throw new Error("Incorrect start time format for pairing.");
                    }
                }
                pairingObj.start = reg[3];
                continue;
            }
            if (i == 1) {
                // Base. Format: AAA
                if (reg[1].length != 3) {
                    console.log("[AUTOCORRECT] Fixing base.");
                    reg[1] = reg[1] + reg.splice(2, 1);
                    if (reg[1].length != 3) {
                        console.error("[ERROR] Incorrect base format for pairing. " + pairingObj.id);
                        console.error(reg[1]);
                        console.error(reg);
                        throw new Error("Incorrect base format for pairing.");
                    }
                }
                pairingObj.base = reg[1];
            }
            if (i > 2) {
                // Leg 

                // if line is 7 long and dashes or numbers in the month.

                // 1. If two characters and is a day of the week.
                // 2. One character and is a number between 1-7 and reg.length > 7
                if ((reg[0].length == 2 && daysOfTheWeek.some(function (v) { return reg[0].includes(v) }))
                    || (reg[0].length == 1 && reg[0].search(/^[1-7]$/) != -1 && reg.length > 7)) {


                    // 1. Two characters long and is a day of the week.
                    // 2. One character and is a number between 1-7. (trips that occur more than once a month).
                    // 3. Day of the week has been split (might be redundant with new pdf reader).
                    // if ( (reg[0].length == 2 && daysOfTheWeek.some(function(v) { return reg[0].includes(v) }))
                    // || (reg[0].length == 1 && reg[0].search(/^[0-7]$/) != -1 && reg[1] != "--") 
                    // || (reg[0].length == 1 && daysOfTheWeek.some(function(v) { return (reg[0]+reg[1]).includes(v) })) ) {
                    let leg = new Leg();

                    // Check if deadhead flight.
                    if (reg[1] == "DH") {
                        leg.deadhead = true;
                        reg.splice(1, 1);
                    }

                    // Day. Format: DD
                    if (!(daysOfTheWeek.some(function (v) { return reg[0].includes(v) }) || reg[0].search(/^[0-7]$/) != -1)) {
                        if (reg[0].length == 1 && reg[0].search(/^[A-Za-z]$/) != -1) {
                            reg[0] = reg[0] + reg.splice(1, 1);
                        }
                        if (!(daysOfTheWeek.some(function (v) { return reg[0].includes(v) }) || reg[0].search(/^[0-7]$/) != -1)) {
                            console.error("[ERROR] Incorrect day format for pairing. " + pairingObj.id);
                            console.error(reg[0]);
                            console.error(reg);
                            throw new Error("Incorrect day format for pairing.");
                        }
                    }
                    leg.day = reg[0];

                    // Flight number. Format: NNNN
                    if (reg[1].search(/^[0-9]{4}$/) == -1) {
                        if (leg.deadhead) {
                            // Deadhead flight number does not have to be 4 digits.
                            // Check for spillage.
                            if (reg[2].substring(0, 1).search(/^[0-9]$/) != -1) {
                                let index = 0;
                                while (index < reg[2].length) {
                                    if (reg[2].substring(index, index + 1).search(/^[0-9]$/) == -1) {
                                        break;
                                    }
                                    index += 1;
                                }
                                reg[1] = reg[1] + reg[2].substring(0, index);
                                reg[2] = reg[2].substring(index);
                            }
                            if (reg[1].search(/^[0-9]+$/) == -1) {
                                console.error("[ERROR] Incorrect flight number format for pairing. " + pairingObj.id);
                                console.error(reg[1]);
                                console.error(reg);
                                throw new Error("Incorrect flight number format for pairing.");
                            }
                        }
                        else {
                            console.log("[AUTOCORRECT] Fixing flight number.");
                            console.log(reg);
                            reg[1] = reg[1] + reg.splice(2, 1);
                            if (reg[1].length != 4) {
                                console.error("[ERROR] Incorrect flight number format for pairing. " + pairingObj.id);
                                console.error(reg[1]);
                                console.error(reg);
                                throw new Error("Incorrect flight number format for pairing.");
                            }
                        }
                    }
                    leg.flightNum = reg[1];

                    // Origin. Format: AAA
                    // if (reg[2].search(/^[A-Z]{3}$/) == -1) {
                    //     console.log("[AUTOCORRECT] Fixing origin.");
                    //     if (reg[2].length < 3) {
                    //         if ( (reg[2].length + reg[3].length) == 3 && (reg[2]+reg[3]).search(/^[0-9]+$/) == -1) {
                    //             reg[2] = reg[2] + reg.splice(3,1);
                    //         }
                    //         else if (reg[2].search(/^[0-9]+$/) != -1) {
                    //             // Flight number spilled over.
                    //             leg.flightNum = leg.flightNum + reg.splice(2,1);
                    //         }
                    //         else {
                    //             console.error("[ERROR] Incorrect origin format for pairing. " + pairingObj.id);
                    //             console.error(reg[2]);
                    //             console.error(reg);
                    //             throw new Error("Incorrect origin format for pairing.");
                    //         }
                    //     }
                    //     else {
                    //         // Check if flight number spilled over.
                    //         if (reg[2].substring(0,2).search(/^[0-9]+$/) != -1) {
                    //             leg.flightNum = leg.flightNum + reg[2].substring(0,2);
                    //             reg[2] = reg[2].substring(2);
                    //         }
                    //         else if (reg[2].substring(0,1).search(/^[0-9]+$/ != -1)) {
                    //             leg.flightNum = leg.flightNum + reg[2].substring(0,1);
                    //             reg[2] = reg[2].substring(1);
                    //         }
                    //         else {
                    //             console.error("[ERROR] Incorrect origin format for pairing. " + pairingObj.id);
                    //             console.error(reg[2]);
                    //             console.error(reg);
                    //             throw new Error("Incorrect origin format for pairing.");
                    //         }
                    //     }
                    // }
                    // leg.origin = reg[2];

                    // // Destination. Format: AA
                    // if (reg[3].length != 3) {
                    //     console.log("[AUTOCORRECT] Fixing destination.");
                    //     reg[3] = reg[3] + reg.splice(4,1);
                    //     if (reg[3].length != 3) {
                    //         console.error("[ERROR] Incorrect destination format for pairing. " + pairingObj.id);
                    //         console.error(reg[3]);
                    //         console.error(reg);
                    //         throw new Error("Incorrect destination format for pairing.");
                    //     }
                    // }
                    // leg.destination = reg[3];

                    // Origin
                    // Split Origin-Destination
                    let origin = reg[2].split("-")[0];
                    let destination = reg[2].split("-")[1];

                    // TODO: Remove these two lines and update reg[i] numbers thereafter.
                    reg[2] = origin;

                    if (destination === undefined) {
                        destination = reg[3].replace("-", "");
                    }
                    else {
                        reg.splice(3, 0, destination);
                    }
                    if (origin.search(/^[A-Z]{3}$/) == -1) {
                        console.error("[ERROR] Incorrect origin format for pairing. " + pairingObj.id);
                        console.error(origin);
                        console.error(reg);
                        throw new Error("Incorrect origin format for pairing.");
                    }
                    leg.origin = origin;

                    if (destination === undefined) {
                        console.log(reg);
                        console.log(pairingObj.id);
                    }

                    if (destination.search(/^[A-Z]{3}$/) == -1) {
                        console.error("[ERROR] Incorrect destination format for pairing. " + pairingObj.id);
                        console.error(destination);
                        console.error(reg);
                        throw new Error("Incorrect destination format for pairing.");
                    }
                    leg.destination = destination;

                    // Departure time. Format: hhmm
                    if (reg[4].length != 4) {
                        console.log("[AUTOCORRECT] Fixing departure time.");
                        reg[4] = reg[4] + reg.splice(5, 1);
                        if (reg[4].length != 4) {
                            console.error("[ERROR] Incorrect departure time format for pairing. " + pairingObj.id);
                            console.error(reg[4]);
                            console.error(reg);
                            throw new Error("Incorrect departure time format for pairing.");
                        }
                    }
                    leg.depl = reg[4];

                    // Arrival time. Format: hhmm
                    if (reg[5].length != 4) {
                        console.log("[AUTOCORRECT] Fixing departure time.");
                        reg[5] = reg[5] + reg.splice(6, 1);
                        if (reg[5].length != 4) {
                            console.error("[ERROR] Incorrect departure time format for pairing. " + pairingObj.id);
                            console.error(reg[5]);
                            console.error(reg);
                            throw new Error("Incorrect departure time format for pairing.");
                        }
                    }
                    leg.arrl = reg[5];

                    // Block time. Format: hhmm
                    if (reg[6].search(/^[0-9]{1,4}$/) == -1) {
                        console.log("[AUTOCORRECT] Fixing block time.");
                        reg[6] = reg[6] + reg.splice(7, 1);
                        if (reg[6].search(/^[0-9]{1,4}$/) == -1) {
                            console.error("[ERROR] Incorrect block time format for pairing. " + pairingObj.id);
                            console.error(reg[6]);
                            console.error(reg);
                            throw new Error("Incorrect block time format for pairing.");
                        }
                    }
                    leg.blkt = reg[6];

                    // Not last leg of day.
                    if (!pairing[i + 1].includes("D-END")) {
                        // Ground time. Format: hhmm. Blank if last flight of day.
                        if (reg[7].search(/^[0-9]{2,4}$/) == -1) {
                            console.log("[AUTOCORRECT] Fixing ground time.");
                            if (reg[7].length > 4) {
                                reg.splice(8, 0, reg.substring(2));
                                reg[7] = reg[7].substring(0, 2);
                            }
                            else {
                                reg[7] = reg[7] + reg.splice(8, 1);
                            }
                            if (reg[7].search(/^[0-9]{2,4}$/) == -1) {
                                console.log(pairing[i]);
                                console.log(i);
                                console.error("[ERROR] Incorrect ground time format for pairing. " + pairingObj.id);
                                console.error(reg[7]);
                                console.error(reg);
                                throw new Error("Incorrect ground time format for pairing.");
                            }
                        }
                        leg.grnt = reg[7];

                        // Equipment. Format: AAA or AA
                        if (!(reg[8].search(/^(?=.*[0-9])(?=.*[a-zA-Z])([a-zA-Z0-9]+){3}$/) != -1 || reg[8].search(/^[A-Z]{2}$/) != -1)) {
                            console.log("[AUTOCORRECT] Fixing equipment.");
                            if (reg.length > 9) {
                                reg[8] = reg[8] + reg.splice(9, 1);
                            }
                            if (!(reg[8].search(/^(?=.*[0-9])(?=.*[a-zA-Z])([a-zA-Z0-9]+){3}$/) != -1 || reg[8].search(/^[A-Z]{2}$/) != -1)) {
                                console.error("[ERROR] Incorrect equipment format for pairing. " + pairingObj.id);
                                console.error(reg[8]);
                                console.error(reg);
                                throw new Error("Incorrect equipment format for pairing.");
                            }
                        }
                        leg.eqp = reg[8];
                    }
                    // Last leg of day.
                    else {
                        // Equipment. Format: AAA
                        if (!(reg[7].search(/^(?=.*[0-9])(?=.*[a-zA-Z])([a-zA-Z0-9]+){3}$/) != -1 || reg[7].search(/^[A-Z]{2}$/) != -1)) {
                            console.log("[AUTOCORRECT] Fixing equipment.");
                            if (reg.length > 8) {
                                reg[7] = reg[7] + reg.splice(8, 1);
                            }
                            if (!(reg[7].search(/^(?=.*[0-9])(?=.*[a-zA-Z])([a-zA-Z0-9]+){3}$/) != -1 || reg[7].search(/^[A-Z]{2}$/) != -1)) {
                                console.error("[ERROR] Incorrect equipment format for pairing. " + pairingObj.id);
                                console.error(reg[7]);
                                console.error(reg);
                                throw new Error("Incorrect equipment format for pairing.");
                            }
                        }
                        leg.eqp = reg[7];

                        // Total Block time. Format: (h)hmm.
                        if (reg[8].search(/^[0-9]{1,4}$/) == -1) {
                            console.log("[AUTOCORRECT] Fixing total block time.");
                            if (reg.length > 9) {
                                reg[8] = reg[8] + reg.splice(9, 1);
                            }
                            if (reg[8].search(/^[0-9]{2,4}$/ == -1)) {
                                console.error("[ERROR] Incorrect total block time format for pairing. " + pairingObj.id);
                                console.error(reg[8]);
                                console.error(reg);
                                throw new Error("Incorrect total block time format for pairing.");
                            }
                        }
                        leg.tblk = reg[8];

                        // Total Credit time. Format: (h)hmm.
                        if (reg[9].search(/^[0-9]{1,4}$/) == -1) {
                            console.log("[AUTOCORRECT] Fixing total credit time.");
                            reg[9] = reg[9] + reg.splice(10, 1);
                            if (reg[9].search(/^[0-9]{1,4}$/) == -1) {
                                console.error("[ERROR] Incorrect total credit time format for pairing. " + pairingObj.id);
                                console.error(reg[9]);
                                console.error(reg);
                                throw new Error("Incorrect total credit time format for pairing.");
                            }
                        }
                        leg.tcrd = reg[9];

                        // Total pay time. Format: (h)hmm.
                        if (reg[10].search(/^[0-9]{2,4}$/) == -1) {
                            console.log("[AUTOCORRECT] Fixing total pay time.");
                            reg[10] = reg[10] + reg.splice(11, 1);
                            if (reg[10].search(/^[0-9]{2,4}$/) == -1) {
                                console.error("[ERROR] Incorrect total pay time format for pairing. " + pairingObj.id);
                                console.error(reg[10]);
                                console.error(reg);
                                throw new Error("Incorrect total pay time format for pairing.");
                            }
                        }
                        leg.tpay = reg[10];

                        // Duty time. Format: (h)hmm.
                        if (reg[11].search(/^[0-9]{2,4}$/) == -1) {
                            console.log("[AUTOCORRECT] Fixing duty time.");
                            reg[11] = reg[11] + reg.splice(12, 1);
                            if (reg[11].search(/^[0-9]{2,4}$/) == -1) {
                                console.error("[ERROR] Incorrect duty time format for pairing. " + pairingObj.id);
                                console.error(reg[11]);
                                console.error(reg);
                                throw new Error("Incorrect duty time format for pairing.");
                            }
                        }
                        leg.duty = reg[11];

                        // Layover time. Format: (h)hmm. (Optional)
                        if (pairing[i + 1].search("D-END") != -1 && pairing[i + 2].search("TOTALS") == -1) {
                            if (reg[12].search(/^[0-9]{2,4}$/) == -1) {
                                console.log("[AUTOCORRECT] Fixing layover time.");
                                if (reg.length > 13) {
                                    reg[12] = reg[12] + reg.splice(13, 1);
                                }
                                if (reg[12].search(/^[0-9]{2,4}$/) == -1) {
                                    console.error("[ERROR] Incorrect layover time format for pairing. " + pairingObj.id);
                                    console.error(reg[12]);
                                    console.error(reg);
                                    throw new Error("Incorrect layover time format for pairing.");
                                }
                            }
                            leg.layo = reg[12];
                        }
                        else if (reg.length > 12) {
                            console.log("[AUTOCORRECT] Fixing duty time for very last leg.");
                            leg.duty = reg[11] + reg[12];
                        }
                    }
                    pairingObj.legs.push(leg);
                }

                // Check if hotel line.
                else if (reg[0] != "D-END" && reg[0] != "TOTALS" && reg[0] != "--" && reg[0].search(/^[0-9]+$/) == -1) {
                    let hotelObj = new Hotel();
                    hotelName = reg[0];

                    if (reg[0] == "TBD") {
                        hotelObj.name = reg[0];
                        hotelObj.phone = "000-000-0000";
                    }
                    else {
                        let idx = 1;
                        while (idx < reg.length && reg[idx].search(/^\s*[0-9]{3}-[0-9]{3}-[0-9]{4}\s*$/) == -1) {
                            hotelName += ' ' + reg[idx];
                            idx++;
                        }
                        hotelObj.name = hotelName;
                        hotelObj.phone = reg.slice(idx).toString();
                        // hotelObj.name = reg[0];
                        // hotelObj.phone = reg[1];
                    }
                    pairingObj.hotels.push(hotelObj);
                }

                // Catch phone number for long hotel names (rare).
                if (pairing[i].search(/^\s*[0-9]{3}-[0-9]{3}-[0-9]{4}\s*$/) != -1) {
                    let number = reg.join("-");
                    pairingObj.hotels[pairingObj.hotels.length - 1].phone = number;
                }
            }

            if (i < 6) {
                // Check for day(s). Break when word not a number or not "--".
                let words = reg.reverse();
                for (let x = 0; x < reg.length; x++) {
                    let word = words[x];
                    if (!calendar.some(function (v) { return word == v }) && !word.includes("--")) {
                        break;
                    }
                    if (calendar.some(function (v) { return word == v })) {
                        pairingObj.days.push(word);
                    }
                }
            }

            // Last but one line of pairing block.
            if (i == pairing.length - 2) {
                // End time. Format: HHMML
                if (reg[1].length != 5) {
                    console.log("[AUTOCORRRECT] Fixing end time.");
                    reg[1] = reg[1] + reg.splice(2, 1);
                    if (reg[2].length != 5) {
                        console.error("[ERROR] Incorrect end time format for pairing. " + pairingObj.id);
                        console.error(reg[1]);
                        console.error(reg);
                        throw new Error("Incorrect end time format for pairing.");
                    }
                }
                pairingObj.end = reg[1];
            }

            // Last line of pairing block (TOTALS BLK).
            if (i == pairing.length - 1) {
                // Clean line (tendency for numbers and words to be split)
                // for (let x = 0; x < reg.length; x++) {
                //     if (x+1 >= reg.length) {
                //         break;
                //     }
                //     if (["TOTALS","BLK","DHD","TRIP","RIG","CDT","LDGS"].includes((reg[x] + reg[x+1]).toUpperCase()) || (reg[x].search(/^[0-9]+$/) != -1 && reg[x+1].search(/^[0-9]+$/) != -1)) {
                //         reg[x] = reg[x] + reg.splice(x+1,1);
                //     }
                // }

                // NOTE: The above was for a different pdf interpreter. Uncomment if errors occur.

                pairingObj.tblk = reg[2];
                pairingObj.dh = reg[4];
                pairingObj.cdt = reg[9];
                pairingObj.tafb = reg[11];
                pairingObj.ldgs = reg[13];
            }
        }
        pairingObj.length = calcLength(pairingObj);
        pairings.push(pairingObj);
    }
    return pairings;
}

/**
 * Verify pairing objects have been built correctly.
 * @param {Pairing[]} pairings Array of pairings
 * @returns {Boolean} True if all is correct, false otherwise.
 */
async function verifyPairings(pairings) {
    let count = 0;
    let total = pairings.length;

    for (let i = 0; i < total; i++) {
        let pairing = pairings[i];
        // console.info(pairing);
        // ID
        // Format: A0000
        if (pairing.id.search(/^[A-Z][0-9]{4}$/) == -1) {
            console.error("[ERROR] ID format incorrect.\n" + pairing.toString);
            throw new Error("Incorrect ID format.");
        }

        // Codeshare.
        if (!["UA", "AA", "DL"].includes(pairing.codeshare)) {
            console.error("[ERROR] Codeshare format incorrect.\n" + pairing.codeshare + "\n" + pairing.toString);
            throw new Error("Incorrect codeshare format.");
        }

        // Days
        // Format: 0 or 00. Range 1-31.
        for (let d = 0; d < pairing.days.length; d++) {
            let day = pairing.days[d];
            if (day.search(/^([1-9]|[12][0-9]|3[01])$/) == -1) {
                console.error("[ERROR] Day format incorrect.\n" + day + "\n" + pairing.toString);
                throw new Error("Incorrect day format.");
            }
        }

        // Base
        // Format: AAA.
        if (pairing.base.search(/^[A-Z]{3}$/) == -1) {
            console.error("[ERROR] Base format incorrect.\n" + pairing.base + "\n" + pairing.toString);
            throw new Error("Incorrect base format.");
        }

        // Start Time
        // Format: 0000L
        if (pairing.start.search(/^[0-9]{4}L$/) == -1) {
            console.error("[ERROR] Start time format incorrect.\n" + pairing.start + "\n" + pairing.toString);
            throw new Error("Incorrect start time format.");
        }

        // End Time
        // Format: 0000L
        if (pairing.end.search(/^[0-9]{4}L$/) == -1) {
            console.error("[ERROR] End time format incorrect.\n" + pairing.end + "\n" + pairing.toString);
            throw new Error("Incorrect end time format.");
        }

        // Total Block Time
        // Format: 0-0000
        if (pairing.tblk.search(/^[0-9]{1,4}$/) == -1) {
            console.error("[ERROR] Block time format incorrect.\n" + pairing.tblk + "\n" + pairing.toString);
            throw new Error("Incorrect block time format.");
        }

        // Total Deadhead Time
        // Format: 0-0000
        if (pairing.dh.search(/^[0-9]{1,4}$/) == -1) {
            console.error("[ERROR] Deadhead time format incorrect.\n" + pairing.dh + "\n" + pairing.toString);
            throw new Error("Incorrect deadhead time format.");
        }

        // Hotels List.
        if (!verifyHotels(pairing.hotels)) {
            console.error("[ERROR] Hotel format incorrect.\n" + pairing.toString);
            throw new Error("Incorrect hotel format.");
        }

        // Total Credit Time
        // Format: 0-0000
        if (pairing.cdt.search(/^[0-9]{1,4}$/) == -1) {
            console.error("[ERROR] Credit time format incorrect.\n" + pairing.cdt + "\n" + pairing.toString);
            throw new Error("Incorrect credit time format.");
        }

        // Time Away From Base Time
        // Format: 0-00000
        if (pairing.tafb.search(/^[0-9]{1,5}$/) == -1) {
            console.error("[ERROR] TAFB format incorrect.\n" + pairing.tafb + "\n" + pairing.toString);
            throw new Error("Incorrect TAFB time format.");
        }

        // Total Number of Landings
        // Format 0-00
        if (pairing.ldgs.search(/^[0-9]{1,2}$/) == -1) {
            console.error("[ERROR] Number of Landings format incorrect.\n" + pairing.ldgs + "\n" + pairing.toString);
            throw new Error("Incorrect number of landings format.");
        }

        // Legs
        // const 
        if (!verifyLegs(pairing.legs)) {
            console.error("[ERROR] Leg format incorrect.\n" + pairing.toString);
            throw new Error("Incorrect leg format.");
        }

        count++;
        console.log(count + "/" + total + " pairings verified.");
    }
    console.log(count + "/" + total + " pairings verified.");
    return true;
}

/**
 * Verify pairing objects have been built correctly.
 * @param {Leg[]} legs Array of legs
 * @returns {Boolean} True if all is correct, false otherwise.
 */
async function verifyLegs(legs) {
    for (let i = 0; i < legs.length; i++) {
        let leg = legs[i];

        // Origin Airport.
        // Format: AAA
        if (leg.origin.search(/^[A-Z]{3}$/) == -1) {
            console.log("[ERROR] Leg origin format incorrect.\n" + leg.origin);
            return false;
        }

        // Destination Airport
        // Format: AAA
        if (leg.destination.search(/^[A-Z]{3}$/) == -1) {
            console.log("[ERROR] Leg destination format incorrect.\n" + leg.destination);
            return false;
        }

        // Flight Number
        // Format: 0-0000
        if (leg.flightNum.search(/^[0-9]{4}$/) == -1) {
            if (leg.deadhead) {
                if (leg.flightNum.search(/[0-9]{1,4}$/) == -1) {
                    console.log("[ERROR] Leg flight number format incorrect.\n" + leg.flightNum);
                    return false;
                }
            }
            else {
                console.log("[ERROR] Leg flight number format incorrect.\n" + leg.flightNum);
                return false;
            }
        }

        // Day of the Week
        // Format: AA or single digit.
        if (!(daysOfTheWeek.includes(leg.day) || leg.day.search(/^[0-7]$/ != 1))) {
            console.log("[ERROR] Leg day of the week format incorrect.\n" + leg.day);
            return false;
        }

        // Departure time
        // Format: 0000
        if (leg.depl.search(/^[0-9]{4}$/) == -1) {
            console.log("[ERROR] Leg departure time format incorrect.\n" + leg.depl);
            return false;
        }

        // Arrival time
        // Format: 0000
        if (leg.arrl.search(/^[0-9]{4}$/) == -1) {
            console.log("[ERROR] Leg departure time format incorrect.\n" + leg.arrl);
            return false;
        }

        // Block time
        // Format: 00-0000
        if (leg.blkt.search(/^[0-9]{2,4}$/) == -1) {
            console.log("[ERROR] Leg block time format incorrect.\n" + leg.blkt);
            return false;
        }

        // Ground time
        // Format: 00-000 (Optional)
        if (leg.grnt != "") {
            if (leg.grnt.search(/^[0-9]{2,4}$/) == -1) {
                console.log("[ERROR] Leg ground time format incorrect.\n" + leg.grnt);
                return false;
            }
        }

        // Equipment
        // Format: AAA or AA
        if (leg.eqp.search(/^[0-9A-Z]{3}|[A-Z]{2}$/) == -1) {
            console.log("[ERROR] Leg Equipment time format incorrect.\n" + leg.eqp);
            return false;
        }

        // Total block time
        // Format: 00-0000 (Optional)
        if (leg.tblk != "") {
            if (leg.tblk.search(/^[0-9]{2,4}$/) == -1) {
                console.log("[ERROR] Leg total block time format incorrect.\n" + leg.tblk);
                return false;
            }
        }

        // Total credit time
        // Format: 00-0000 (Optional)
        if (leg.tcrd != "") {
            if (leg.tcrd.search(/^[0-9]{1,4}$/) == -1) {
                console.log("[ERROR] Leg total credit time format incorrect.\n" + leg.tcrd);
                return false;
            }
        }

        // Total pay time
        // Format: 00-0000 (Optional)
        if (leg.tpay != "") {
            if (leg.tpay.search(/^[0-9]{2,4}$/) == -1) {
                console.log("[ERROR] Leg total pay time format incorrect.\n" + leg.tpay);
                return false;
            }
        }

        // Duty
        // Format: 00-0000 (Optional)
        if (leg.duty != "") {
            if (leg.duty.search(/^[0-9]{2,4}$/) == -1) {
                console.log("[ERROR] Leg duty time format incorrect.\n" + leg.duty);
                return false;
            }
        }

        // Layover time
        // Format: 00-0000 (Optional)
        if (leg.layo != "") {
            if (leg.layo.search(/^[0-9]{2,4}$/) == -1) {
                console.log("[ERROR] Leg layover time format incorrect.\n" + leg.layo);
                return false;
            }
        }
    }
    return true;
}

/**
 * Verify hotel objects have been built correctly.
 * @param {Hotel[]} hotels Array of hotels
 * @returns {Boolean} True if all is correct, false otherwise.
 */
async function verifyHotels(hotels) {
    for (let i = 0; i < hotels.length; i++) {
        let hotel = hotels[i];
        // Name
        // Format: Anything.
        // No check for now.

        // Phone
        // Format: 000-000-0000
        if (hotel.phone.search(/^[0-9]{3}-[0-9]{3}-[0-9]{4}$/) == -1) {
            console.log("[ERROR] Hotel phone number format incorrect.\n" + hotel.phone);
            return false;
        }
    }
    return true;
}

/**
 * Get the number of days a pairing spans.
 * @param {Pairing} pairing Pairing object.
 * @returns {Number} Pairing length.
 */
function calcLength(pairing) {
    let firstD = 0;
    let lastD = 0;
    if (daysOfTheWeek.indexOf(pairing.legs[0].day) != -1) {
        firstD = daysOfTheWeek.indexOf(pairing.legs[0].day);
        lastD = daysOfTheWeek.indexOf(pairing.legs[pairing.legs.length - 1].day);
    }
    else {
        firstD = parseInt(pairing.legs[0].day);
        lastD = parseInt(pairing.legs[pairing.legs.length - 1].day);
    }
    let numDays = lastD - firstD;
    if (lastD <= firstD) {
        numDays += 7;
    }
    return (numDays % 7) + 1;
}
