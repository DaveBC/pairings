/**
 * @file Handles encryption of pairing JSON data.
 * @author David Banwell-Clode <David@Banwell-Clode.com>
 */

/**
 * Decrypt string.
 * @param {String} encrypted Encrypted message in UTF-8 encoding.
 * @param {String} passphrase Decryption passphrase.
 * @return {String} Plaintext string.
 */
function decrypt(encrypted, passphrase) {
  return CryptoJS.AES.decrypt(encrypted, passphrase).toString(CryptoJS.enc.Utf8);
}

/**
* Encrypt string.
* @param {String} message Plaintext message.
* @param {String} passphrase Encryption passphrase.
* @return {String} Ciphered string.
*/
function encrypt(message, passphrase) {
  return CryptoJS.AES.encrypt(message, passphrase);
}

/**
* Generate ciphered pairings.
* @param {String} passphrase Encryption passphrase.
* @return {String} Cipher of pairings in JSON string format.
*/
function generateCipherText(passphrase) {
  return encrypt(JSON.stringify(allPairingsJSON), passphrase).toString();
}

/**
* Generate monthly block of ciphered pairings.
* @param {String} passphrase Encryption passphrase.
* @param {Number} months Number of months to cipher.
* @return {String} Cipher of pairings in JSON string format.
*/
function generateMonthlyCipherText(passphrase, months) {
  var pairings = [];
  for (let i = 0; i < months && i < allPairingsJSON.length; i++) {
    pairings.push([allPairingsJSON[i][0], allPairingsJSON[i][1], allPairingsJSON[i][2]]);
  }
  return encrypt(JSON.stringify(pairings), passphrase).toString();
}

/**
* Export ciphered pairings to file.
* @param {String} passphrase Encryption passphrase.
* @param {String} filename Filename to be used.
* @param {Number} months Number of months to cipher.
* @return {undefined} Blob that can be saved as a file.
*/
function exportCipher(passphrase, filename, months) {

  var cipher = ""

  if (months === undefined) {
    cipher = generateCipherText(passphrase);
  }
  else {
    cipher = generateMonthlyCipherText(passphrase, months);
  }

  let url = URL.createObjectURL(new Blob([cipher], { encoding: "UTF-8", type: 'text/plain' }));

  // Create pseudo element.
  var element = document.createElement('a');
  element.setAttribute('href', url);
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);

  // Activate download.
  element.click();

  // Clear psuedo element.
  document.body.removeChild(element);
}

/**
* Download, decipher, and load pairings.
* @return {undefined}
*/
function downloadData() {

  const passphrase = document.getElementById("inputPassphrase");
  const checkvalue = "U2FsdGVkX1+9HmtGUS/C3tRnPtk+Qh5Z0Yu15S0cwzk=";
  if (decrypt(checkvalue, passphrase.value) == "correct") {

    // Disable button
    const downloadButton = document.getElementById("downloadButton");
    const downloadProgress = document.getElementById("downloadProgressContainer");
    downloadProgress.hidden = false;
    downloadButton.disabled = true;
    downloadButton.innerHTML = '<div class="spinner-border spinner-border-sm text-light" role="status">' +
      '<span class="visually-hidden">Loading...</span>' +
      '</div>';

    // Disable input
    passphrase.disabled = true;

    // Reset progress bar
    const prgbar = document.getElementById("downloadProgressBar");
    prgbar.style.width = 0 + "%";
    prgbar.ariaValueNow = 0;

    // Get selected months.
    const dataYearTabs = document.getElementById("dataYearTabs");
    const inputs = dataYearTabs.getElementsByTagName("input");
    let downloadList = [];
    let promiseArr = [];
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].checked) downloadList.push(inputs[i].getAttribute("data-path"));
    };

    downloadList.forEach(file => {
      promiseArr.push(getFile(file, downloadList.length));
    });
    Promise.all(promiseArr).then((cipherText) => {
      cipherText.forEach(cT => {
        // Decrypt.
        const plain = decrypt(encodeURI(cT), passphrase.value);

        // Convert from String to JSON
        const plainText = JSON.parse(plain);

        // Check allPairings for existing
        if (allPairingsJSON.length < 1) {
          allPairingsJSON = plainText;
        }
        else {
          const ind = allPairingsJSON.findIndex((element) => element[0] == plainText[0][0] && element[1] == plainText[0][1]);
          if (ind >= 0) {
            // Already exists
            // Overwrite in position
            allPairingsJSON[ind] = plainText[0];
          }
          else {
            // Insert chronologically
            for (let i = 0; i < allPairingsJSON.length; i++) {
              const apYear = Number("20" + allPairingsJSON[i][1]);
              const apMonth = monthArray.indexOf(allPairingsJSON[i][0]);
              const ptYear = Number("20" + plainText[0][1]);
              const ptMonth = monthArray.indexOf(plainText[0][0]);

              // Error check
              if (apMonth == -1) console.error("AP Month not found!");
              if (ptMonth == -1) console.error("PT Month not found!");

              if (apYear < ptYear || (apYear == ptYear && apMonth < ptMonth)) {
                // Insert
                allPairingsJSON.splice(i, 0, plainText[0]);
                // Exit
                break;
              }

              // Insert at end.
              if (i == allPairingsJSON.length - 1) {
                allPairingsJSON.push(plainText[0]);
                break;
              }
            }
          }
        }

      });

      // Reload pagination.
      updatePagination();

      // Update selection table.
      updateSelectionTable();

      // Update selected year and month. 
      // Save to database.
      if (allPairingsJSON.length != 0) {
        pairingsJSON = allPairingsJSON[0][2];
        year = "20" + allPairingsJSON[0][1];
        month = monthArray.indexOf(allPairingsJSON[0][0]);
        saveToDatabase();
      }

      // Build legs.
      buildLegs()
        .then(() => {
          $('#dataModalCenter').modal('hide')
          downloadButton.disabled = false;
          downloadButton.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i>';
          downloadProgress.hidden = true;
          passphrase.disabled = false;
          prgbar.style.width = 0 + "%";
          prgbar.ariaValueNow = 0;
        });
    });
  }
  else {
    // Incorrect passphrase
    console.log("wrong")
    const alert = '<div class="alert alert-danger alert-dismissible fade show center-block me-auto ms-auto" role="alert" id="incorrectPassphraseAlert">' +
      '<i class="fa-solid fa-triangle-exclamation"></i> ' +
      'Incorrect passphrase!' +
      '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
      '</div>';
    document.getElementById("alertPlaceholder").innerHTML = alert;
  }
}

/**
* Download encrypted pairing data.
* @return {Promise} Promise of pairing data string.
*/
function getFile(filename, fileCount = 1) {
  return new Promise(function (resolve, reject) {
    const req = new XMLHttpRequest();
    req.onload = function () {
      if (req.status >= 200 && req.status < 300) {
        resolve(req.response);
      } else {
        reject({
          status: req.status,
          statusText: req.statusText
        });
      }
    };
    req.onerror = reject;
    if (filename != "datalist.json") req.addEventListener("progress", function (e) { updateProgress(e, fileCount) });
    req.open("GET", "/assets/data/" + filename);
    req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=UTF-8')
    req.send();
  });
}

/**
* File download progress handler.
* @param {ProgressEvent} event Object representing the current progress.
* @return {undefined}
*/
function updateProgress(event, fileCount) {
  if (event.lengthComputable) {
    const percentComplete = ((event.loaded / event.total) * 100) / fileCount;
    let progressBar = document.getElementById("downloadProgressBar");
    let newWidth = Number(progressBar.ariaValueNow) + parseFloat(percentComplete);
    if (newWidth > 100) newWidth = 100;
    progressBar.style.width = newWidth + "%";
    progressBar.ariaValueNow = newWidth;
    // progressBar.innerText = Math.ceil(newWidth) + "%";
  } else {
    // Unable to compute progress information since the total size is unknown
  }
}

/**
* Detect user device type.
* @return {Boolean} True if using mobile.
*/
function isMobile() {
  // User agent string method
  let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Screen resolution method
  if (!isMobile) {
    let screenWidth = window.screen.width;
    let screenHeight = window.screen.height;
    isMobile = (screenWidth < 768 || screenHeight < 768);
  }

  // Touch events method
  if (!isMobile) {
    isMobile = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
  }

  // CSS media queries method
  if (!isMobile) {
    let bodyElement = document.getElementsByTagName('body')[0];
    isMobile = window.getComputedStyle(bodyElement).getPropertyValue('content').indexOf('mobile') !== -1;
  }

  return isMobile;
}

/**
 * Removes last month from allPairingsJSON.
 * @return {undefined}
 */
function removeLastMonth() {
  if (allPairingsJSON.length > 1) {
    allPairingsJSON.splice(allPairingsJSON.length - 1, 1);
    buildLegs();
    console.log("Last month removed.");
    updatePagination();
  }
  else {
    console.log("Nothing to remove.");
  }
}