# HotelPro

HotelPro is a responsive booking and hotel operations demo for a boutique property. It includes a customer-facing booking engine alongside the team's front desk, reservation, room inventory, guest, reporting, and messaging screens.

## Run the demo

This is a static front-end demo. Open `index.html` in a browser, or serve this folder with any static file server. No build step or dependency install is required.

## Demo features

- Daily snapshot for occupancy, in-house guests, revenue, and average daily rate
- Revenue trend with week and month views
- Reservation list with guest search and status filters
- New reservation form with date validation and browser-local persistence
- Guest booking page with stay search, room choices, and on-device confirmation
- Direct guest bookings appear in the HotelPro reservation list in the same browser
- Room availability and housekeeping overview with status filtering
- Guest directory, inbox, reporting, and property settings screens
- Responsive layouts for desktop, tablet, and mobile

New reservations are saved in this browser only. The sample property, bookings, guests, and metrics are illustrative. Authentication, a shared database, payment processing, live inventory sync, and OTA integrations are not connected in this demo.

## Project structure

```text
.
├── index.html   # App structure and metadata
├── styles.css   # Responsive design system and layouts
├── app.js       # Demo data and operations interactions
├── book.html    # Customer-facing booking page
├── booking.css  # Booking page layout and room illustrations
└── booking.js   # Availability and local booking confirmation
```

## Publishing

The app can be hosted on any static web host. For GitHub Pages, set the repository's Pages source to GitHub Actions and use the included workflow.
