
# Change Log
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.2.1] - 2025-01-21

### Changed
- Alert banner used full window width with text centered.

### Added
- Error handling for data downloads.

## [1.2.0] - 2025-01-05

### Changed

- Merged inbound and outbound routes to de-clutter the map.
- Route paths are now great circle paths rather than bezier curves.
- Route popup is now tabbed to separate inbound and outbound pairings.
- Pairings are now listed alphabetically.

### Added

- Mouse-over increases width of route paths.
- Mouse-over increases size of destination markers.
- Selective data download. Ability to choose which months to download. Size of data is also shown prior to download.
- Selective data removal.
- Departure count added to destination marker popup.
- Overnight tab added to destination marker popup. Disabled if there are no overnights.

## [1.1.7] - 2024-12-14

### Fixed

- Capitalized letter capture January 2025 PDFs.
- Hotel order reversed when viewing the same pairing in the detail window twice in a row.

### Changed

- Double click method for right side menu. Still investigating across platforms.

## [1.1.6] - 2024-10-21

### Fixed

- Database loading error with persistent empty database.
- Month pagination width and sizing.

### Added

- Mobile double tap functionality for the side menu.

### Changed
- Updated dependencies: Bootstrap 5.3.3, Bootstrap Icons 1.11.3, JQuery 3.7.1, Font Awesome 6.6.0, pdf.js 3.11.174, crypto-js 4.2.0.

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
