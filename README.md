# Dupont Flyer Priority Map

A simple static GitHub Pages site for tracking flyer coverage around Dupont Circle.

## What it does

- Shows the listed Dupont Circle flyer locations on an OpenStreetMap map.
- Clicking a marker opens that spot.
- A volunteer can add their name, a photo, and a description.
- Completed spots change from numbered markers to check marks.
- Completed entries show the volunteer name, image, description, and timestamp.
- Entries automatically reset after the second Monday of the month ends, at Tuesday 12:00 AM in the visitor's local browser time.
- Export and import buttons let you move the current browser's entries between devices.

## GitHub Pages

1. Push these files to a GitHub repository.
2. In GitHub, open `Settings` -> `Pages`.
3. Set the source to your main branch and the repository root.
4. Open the published Pages URL.

## Important storage note

This version is intentionally simple and static. The data is stored in each visitor's browser with `localStorage`, so it persists on that device until the weekly reset but is not automatically shared across everyone.

For a shared team-wide tracker, add a small backend such as Supabase, Firebase, or a serverless function with file storage. The map UI can stay the same; only the `loadState` and `saveState` parts of `script.js` need to be swapped for backend calls.
