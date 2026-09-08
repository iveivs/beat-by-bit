# Beat by Bit Development Notes

## Product
- Drum practice tracker for students named Beat by Bit.
- Keep the current drum-pad/pixel-grid logo unless the user explicitly approves a new mark.
- Show the visible app version near the title after every shipped change.

## UX Defaults
- Desktop should be readable at normal browser zoom, with the project / skill column wide enough for real names.
- Desktop date range should keep today near the middle; avoid showing too many columns if it makes names cramped.
- Mobile should use the card/list layout, not the desktop table. Avoid page-level horizontal scrolling.
- Projects can contain exercises. Exercises should be collapsible under their parent project.
- Destructive actions need confirmation.
- Per-habit charts live behind an action on the habit row/card. A larger analytics dashboard is a separate feature and should not crowd the main tracker.

## Auth And Data
- Firebase Auth and Firestore are the current backend.
- Google sign-in is optional; email/password must remain available for mobile and messenger in-app browsers.
- Do not store, log, or display passwords. Password fields stay local to the form and are sent only to Firebase Auth.
- Registration should require password confirmation and send Firebase email verification.
- Signed-in users may set an optional nickname from a small profile dialog; the app must also allow changing or clearing it later.

## Validation Before Publishing
- Run build and lint before publishing.
- Check desktop and mobile screenshots locally after visual changes.
- Programmatically check mobile width for horizontal overflow when layout changes.
- Publish GitHub Pages and Firebase Hosting only after the checked build is ready.
