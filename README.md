# Bondibai List PWA

A private, installable recipient and delivery tracker. Recipient data is stored in the browser's `localStorage` with offline support, Eatolls Maldives map address lookups, and one-click CSV Import & Export.

## Run locally

1. Copy `.env.example` to `.env.local` and set `APP_PASSWORD` and `SESSION_SECRET`.
2. Run `npm run dev`.
3. Open `http://localhost:3000` (or `http://localhost:3002`).

The password is read from `APP_PASSWORD`; it is never included in browser code. `SESSION_SECRET` is used for signing secure HMAC session cookies.

## Features

- **Offline-First**: All data is saved on the device in `localStorage`.
- **Eatolls & Google Maps Integration**: 1-click address lookup on Eatolls and Google Maps with Maldives quick-tag chips (H., M., G., Ma., Hulhumalé, Hiyaa, Vinares, Villimalé).
- **CSV Backup & Restore**: Export your full distribution list to CSV or import existing spreadsheets anytime.
- **PWA Ready**: Installable on mobile phones & tablets with standalone app experience.

## Import format

Use a CSV with any of these headings: `ID`, `Name`, `Group`, `Area`, `Driver`, `Address`, `Phone`, `Portions`, `Status`, `Notes`, `Updated At`. Only `Name` is essential. Supported statuses are `planned`, `packed`, `delivered`, and `on-hold`. Imports can be reviewed before adding them to or replacing the current browser list.
