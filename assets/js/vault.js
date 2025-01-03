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
      getFile("datalist.json")
      .then((res) => {
        const files = JSON.parse(res);
        let promiseArr = []
        populateSelectionTable(files);
        files.files.forEach(path => {
          promiseArr.push(getFile(path[0]));
        });
        Promise.all(promiseArr).then((values) =>
        {
          // console.log(values);
        });
      });

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
* Generates a table of month/years of data available to download.
* @param {files:[String, Number]} values JSON of available years and months with file size in MB {files:[]}.
* @return {undefined}
*/
function populateSelectionTable(values) {

  const selectMenu = document.getElementById("dataYear-select");
  const tabs = document.getElementById("dataYearTabs");

  values.files.forEach((date) => {

    const year = date[0].split("/")[0];
    const month = date[0].split("/")[1].split("-")[1];

    // Year Select
    if(document.getElementById("tab-"+year) == null) {
      selectMenu.innerHTML += '<option class="dropdown-item nav-link" id="tab-' + year + '" data-bs-toggle="tab" data-bs-target="#data-' + year + '" type="button" role="tab" aria-controls="' + year + '" aria-selected="true" value="' + year + '">' + year + '</option>'
    }

    // Populate Tab
    if(document.getElementById("data-"+year) == null) {
      tabs.innerHTML += '<div class="tab-pane fade" id="data-' + year + '" role="tabpanel" aria-labelledby="' + year + '-tab">' +
                          '<div class="container text-center">' +
                            '<div class="row">' +
                                '<div class="col">' +
                                  '<input type="checkbox" class="btn-check" id="data-' + year + '-01" autocomplete="off">' +
                                  '<label class="btn btn-outline-primary w-100 m-1 disabled" for="data-' + year + '-01">Jan</label>' +
                                  '<input type="checkbox" class="btn-check" id="data-' + year + '-04" autocomplete="off">' +
                                  '<label class="btn btn-outline-primary w-100 m-1 disabled" for="data-' + year + '-04">Apr</label>' +
                                  '<input type="checkbox" class="btn-check" id="data-' + year + '-07" autocomplete="off">' +
                                  '<label class="btn btn-outline-primary w-100 m-1 disabled" for="data-' + year + '-07">Jul</label>' +
                                  '<input type="checkbox" class="btn-check" id="data-' + year + '-10" autocomplete="off">' +
                                  '<label class="btn btn-outline-primary w-100 m-1 disabled" for="data-' + year + '-10">Oct</label>' +
                                '</div>' +
                                '<div class="col">' +
                                  '<input type="checkbox" class="btn-check" id="data-' + year + '-02" autocomplete="off">' +
                                  '<label class="btn btn-outline-primary w-100 m-1 disabled" for="data-' + year + '-02">Feb</label>' +
                                  '<input type="checkbox" class="btn-check" id="data-' + year + '-05" autocomplete="off">' +
                                  '<label class="btn btn-outline-primary w-100 m-1 disabled" for="data-' + year + '-05">May</label>' +
                                  '<input type="checkbox" class="btn-check" id="data-' + year + '-08" autocomplete="off">' +
                                  '<label class="btn btn-outline-primary w-100 m-1 disabled" for="data-' + year + '-08">Aug</label>' +
                                  '<input type="checkbox" class="btn-check" id="data-' + year + '-11" autocomplete="off">' +
                                  '<label class="btn btn-outline-primary w-100 m-1 disabled" for="data-' + year + '-11">Nov</label>' +
                                '</div>' +
                                '<div class="col">' +
                                  '<input type="checkbox" class="btn-check" id="data-' + year + '-03" autocomplete="off">' +
                                  '<label class="btn btn-outline-primary w-100 m-1 disabled" for="data-' + year + '-03">Mar</label>' +
                                  '<input type="checkbox" class="btn-check" id="data-' + year + '-06" autocomplete="off">' +
                                  '<label class="btn btn-outline-primary w-100 m-1 disabled" for="data-' + year + '-06">Jun</label>' +
                                  '<input type="checkbox" class="btn-check" id="data-' + year + '-09" autocomplete="off">' +
                                  '<label class="btn btn-outline-primary w-100 m-1 disabled" for="data-' + year + '-09">Sep</label>' +
                                  '<input type="checkbox" class="btn-check" id="data-' + year + '-12" autocomplete="off">' +
                                  '<label class="btn btn-outline-primary w-100 m-1 disabled" for="data-' + year + '-12">Dec</label>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
    }

    // Enable month
    const inputTag = document.getElementById("data-" + year + "-" + month)
    const label = inputTag.nextSibling;
    label.classList.remove("disabled");

    // Set data path attribute
    inputTag.setAttribute("data-path", date[0]);

    // Set data size attribute
    inputTag.setAttribute("data-size", date[1]);
  });

  // Select Option: set selected and active tab.
  const recentYear = values.files[0][0].split("/")[0];
  // class active
  // aria selected true
  // selected
  const selectYear = document.getElementById("tab-"+recentYear);
  selectYear.classList.add("active");
  selectYear.setAttribute("aria-selected", "true");
  selectYear.setAttribute("selected", true);

  // show active
  const dataYear = document.getElementById("data-" + recentYear);
  dataYear.classList.add("show");
  dataYear.classList.add("active");
}

function downloadData() {
  // Get selected months.
  const dataYearTabs = document.getElementById("dataYearTabs");
  const inputs = dataYearTabs.getElementsByTagName("input");
  let downloadList = [];
  let promiseArr = [];
  for(let i = 0; i < inputs.length; i++) {
    if(inputs[i].checked) downloadList.push(inputs[i].getAttribute("data-path"));
  };

  downloadList.forEach(file => {
    promiseArr.push(getFile(file));
  });
  Promise.all(promiseArr).then((cipherText) =>
  {
    const passphrase = document.getElementById("inputPassphrase").value;
    // Decrypt.
    let plain = decrypt(encodeURI(cipherText), passphrase);

    // Convert from String to JSON.
    // TODO: Change to add to allPairingsJSON instead of overwrite.
    allPairingsJSON = JSON.parse(plain);


    const downloadButton = document.getElementById("downloadButton");
    downloadButton.disabled = true;

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

    // TODO: De-select data months.

    // Build legs.
    buildLegs()
      .then(() =>  { $('#dataModalCenter').modal('hide')
      downloadButton.disabled = false;
      downloadProgress.hidden = true; });
  });
}

/**
* Download encrypted pairing data.
* @return {Promise} Promise of pairing data string.
*/
function getFile(filename) {
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
      // req.addEventListener("progress", updateProgress);
      req.open("GET", "/assets/data/"+filename);
      req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=UTF-8')
      req.send();
  });
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
    buildLegs();
    console.log("Last month removed.");
    updatePagination();
  }
  else {
    console.log("Nothing to remove.");
  }
}