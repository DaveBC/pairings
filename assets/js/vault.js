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

  let url = URL.createObjectURL( new Blob( [cipher], {encoding:"UTF-8",type:'text/plain'} ) );

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
function unlockData() {
  // Change upload button to inhibit clicks and display spinner.
  let unlockButton = document.getElementById("unlockButton");
  unlockButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
  unlockButton.disabled = true;

  let unlockProgress = document.getElementById("unlockProgressContainer");
  unlockProgress.hidden = false;

  let passphrase = document.getElementById("inputPassphrase").value;
  let checkvalue = "U2FsdGVkX1+9HmtGUS/C3tRnPtk+Qh5Z0Yu15S0cwzk=";
  if (decrypt(checkvalue,passphrase) == "correct") {
      // Read from file.
      readRequest()
      .then((cipherText) => {
        // Decrypt.
        let plain = decrypt(encodeURI(cipherText), passphrase);

        // Convert from String to JSON.
        // Replace allPairingsJSON.
        allPairingsJSON = JSON.parse(plain);
        unlockButton.innerHTML = 'Upload';
        unlockButton.disabled = false;

        // Reload pagination.
        updatePagination();

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
          .then(() =>  { $('#unlockModalCenter').modal('hide')
          unlockButton.innerHTML = 'Unlock';
          unlockButton.disabled = false;
          unlockProgress.hidden = true; });
      });
    }
  else {
    let alert = '<div class="alert alert-danger alert-dismissible fade show center-block me-auto ms-auto" role="alert" id="unlockFailAlert">' +
        'Unable to unlock data (incorrect passphrase)' +
        '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
        '</div>';
    // Handle error.
    console.log("uh oh...");
    unlockButton.innerHTML = 'Unlock';
    unlockButton.disabled = false;
    unlockProgress.hidden = true;
    document.getElementById("alertPlaceholder").innerHTML = alert;
  }
}

/**
* Download encrypted pairing data.
* @return {Promise} Promise of pairing data string.
*/
function readRequest() {
  return new Promise(function(resolve, reject) {
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
      req.addEventListener("progress", updateProgress);
      
      if(isMobile()) {
        req.open("GET", "/assets/data/data3");
      }
      else {
        req.open("GET", "/assets/data/data");
      }
      req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=UTF-8')
      req.send();
  });
}

/**
* File download progress handler.
* @param {ProgressEvent} event Object representing the current progress.
* @return {undefined}
*/
function updateProgress(event) {
  if (event.lengthComputable) {
    const percentComplete = (event.loaded / event.total) * 100;
    // console.log(percentComplete);
    let progressBar = document.getElementById("unlockProgressBar");
    let newWidth = parseFloat(percentComplete);
    if (newWidth > 100) newWidth = 100;
    progressBar.style.width = newWidth + "%";
    progressBar.ariaValueNow = newWidth;
    progressBar.innerText = Math.ceil(newWidth) + "%";
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
  if (allPairingsJSON.length > 2) {
    allPairingsJSON.splice(allPairingsJSON.length-1,1);
    document.getElementById("uploadInput").value = null;
    document.getElementById("uploadList").innerHTML = "";
    document.getElementById("month-pagination").innerHTML = pagination;
    buildLegs();
    console.log("Last month removed.");
  }
  else {
    console.log("Nothing to remove.");
  }
}