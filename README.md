# Dupont Flyer Priority Map

A simple static GitHub Pages site for tracking flyer coverage around Dupont Circle.

## What it does

- Shows the listed Dupont Circle flyer locations on an OpenStreetMap map.
- Clicking a marker opens that spot.
- A volunteer can add their name, a photo, and a description.
- Completed spots change from numbered markers to check marks.
- Completed entries show the volunteer name, image, description, and timestamp.
- Entries automatically reset after the second Monday of the month ends, at Tuesday 12:00 AM in the visitor's local browser time.
- When Supabase is configured, entries are shared for everyone using the site.
- Without Supabase, export and import buttons let you move the current browser's entries between devices.

## Free shared backend setup

This site is wired for Supabase's free hosted backend.

1. Create a free project at `https://supabase.com`.
2. In Supabase, open the SQL editor.
3. Paste and run the contents of `supabase-setup.sql`.
4. Open Project Settings -> API.
5. Copy the Project URL and anon public key.
6. Paste them into `config.js`:

```js
window.FLYER_BACKEND_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_PUBLIC_KEY",
  tableName: "flyer_entries",
  bucketName: "flyer-photos"
};
```

After that, uploads and marker updates are shared across visitors. The anon key is designed to be public in browser apps, but this setup intentionally lets anyone with the site link add, update, or clear flyer entries.

## GitHub Pages

1. Push these files to a GitHub repository.
2. In GitHub, open `Settings` -> `Pages`.
3. Set the source to your main branch and the repository root.
4. Open the published Pages URL.

## Important storage note

If `config.js` is blank, the app uses `localStorage`, so data stays on that device only. If `config.js` has Supabase credentials, the app saves to Supabase and everyone sees the same data for the current monthly cycle.

The monthly reset works by starting a new cycle after the second Monday ends. Older Supabase rows and photos remain stored unless you delete them from Supabase.
