
# Change Log
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.1.5] - 2023-11-12

### Fixed

- Pairing stats not correctly counting pairings that repeat multiple times per month.

## [1.1.4] - 2023-09-04

### Added

- Unlock feature. Automatically load pairing data without having to manually handle PDF files by entering a passphrase.

### Fixed

- Copyright symbol on info modal.
- Clear all data promise.
- Hotel name and phone number text overlap.

### Removed

- First load help modal overlay. This can be manually triggered via the help button instead.

## [1.1.3] - 2023-08-07

### Fixed

- Marker popups not displaying complete list of pairings.

## [1.1.2] - 2023-08-07

### Fixed

- Single digit total block time is permissible (i.e. 0).

## [1.1.1] - 2023-05-11

### Fixed

- Incorrect month and year after initial upload.

## [1.1.0] - 2023-04-27

### Added

- Overnight marker toggle.
- Overnight markers display pairing list when clicked.
- Regular markers display pairing list when clicked.
- Layover time filter.
- Average layover time statistic.

### Fixed

- Deadhead max length filter being ignored when only max value entered.
- Create store error while attempting to save pairings to indexeddb.
- Calendar order incorrect in Chrome.
- Time autofill adds a zero in the incorrect place under certain circumstances.


## [1.0.0] - 2023-03-04

Initial release.
