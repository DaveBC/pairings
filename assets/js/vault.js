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
  return encrypt(JSON.stringify(allPairingsJSON), passphrase).toString()
}

/**
* Export ciphered pairings to file.
* @param {String} passphrase Encryption passphrase.
* @param {String} filename Filename to be used.
* @return {undefined} Blob that can be saved as a file.
*/
function exportCipher(passphrase, filename) {
let url = URL.createObjectURL( new Blob( [generateCipherText(passphrase)], {encoding:"UTF-8",type:'text/plain'} ) );

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
let checkvalue = "U2FsdGVkX18Q/X7D5W5UAcYGtkhTGWq0L83W9J7LKfs="
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
      // Handle error.
      console.log("uh oh...");
      // TODO: Present error banner.
      unlockButton.innerHTML = 'Unlock';
      unlockButton.disabled = false;
      unlockProgress.hidden = true;
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
      req.open("GET", "/assets/data/data");
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