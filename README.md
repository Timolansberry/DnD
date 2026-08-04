# Adventurers' Archive

Adventurers' Archive is a static browser-based Dungeons & Dragons character dashboard that recreates the sheet directly with native HTML form fields, authenticates players with Firebase Authentication, and stores sheet data in Firebase Realtime Database.

## Project Purpose

This project replaces the earlier PDF and OneDrive approach with a faster in-browser sheet editor. The dashboard keeps one reusable form in the DOM, switches instantly between five fixed character records, calculates derived values in the browser, and syncs precise field updates to Firebase.

## Architecture

The application uses only:

- `index.html`
- `styles.css`
- `app.js`
- Firebase Web SDK browser modules loaded from the official CDN

There is no React, Vue, Angular, TypeScript, npm build step, backend, Cloud Functions, or Firebase Admin SDK.

## Firebase Realtime Database Usage

All persistent sheet data lives in Firebase Realtime Database under:

```text
campaigns/
  main-campaign/
    characters/
      character-1/
      character-2/
      character-3/
      character-4/
      character-5/
```

Each record stores:

- `meta`
- `sheet.identity`
- `sheet.abilities`
- `sheet.savingThrows`
- `sheet.skills`
- `sheet.combat`
- `sheet.attacks`
- `sheet.personality`
- `sheet.proficiencies`
- `sheet.equipment`
- `sheet.features`
- `sheet.appearance`
- `sheet.organizations`
- `sheet.backstory`
- `sheet.treasure`
- `sheet.spellcasting`

The browser attaches one real-time listener to `campaigns/main-campaign/characters`, caches all five character records in memory, and updates only the field path that changed instead of resending the full character object on each edit.

## Firebase Authentication Usage

The login screen uses Firebase Authentication Email/Password sign-in only.

- Public self-registration is not exposed in the UI.
- Anonymous authentication is not used.
- Passwords are never stored in project files or localStorage.
- Authentication persistence is handled by Firebase's normal browser behavior.

The Firebase accounts for players should be created manually in Firebase Console.

## Why Firebase Admin SDK Must Never Be Used In Browser Code

Firebase Admin SDK is for trusted server environments. A static browser app cannot safely hide Admin credentials, private keys, or service-account JSON files. Putting Admin credentials into frontend code would expose full backend access to anyone who can open developer tools or inspect deployed assets.

This project intentionally uses only the Firebase Web SDK.

## Why Service-Account Keys Must Never Be Committed

A Firebase or Google service-account key is a private credential. If committed to Git, shared in source control, or bundled into client code, it can be copied and abused outside your app. Static browser apps must rely on Authentication and Realtime Database Security Rules instead.

## How To Create A Firebase Web App

1. Open Firebase Console.
2. Create a project or open the existing project.
3. Open `Project settings`.
4. In `General`, scroll to `Your apps`.
5. Add a Web app if one does not already exist.

## Where To Obtain The Firebase Web Configuration

Use the config snippet shown in:

`Firebase Console -> Project settings -> General -> Your apps`

Do not use the Service Accounts page for this project.

## How To Copy `firebase-config.example.js` To `firebase-config.js`

1. Copy `firebase-config.example.js`.
2. Save the copy as `firebase-config.js`.
3. Paste the Firebase Web config values into `firebase-config.js`.

This project now tracks `firebase-config.js` on purpose so static hosts like GitHub Pages can load the app correctly.

## How To Enable Email/Password Authentication

1. Open Firebase Console.
2. Go to `Authentication`.
3. Open `Sign-in method`.
4. Enable `Email/Password`.
5. Save the change.

## How To Create The Player Accounts Manually

1. In Firebase Console, open `Authentication`.
2. Go to the `Users` tab.
3. Click `Add user`.
4. Enter each player's email and password.
5. Repeat for every player who should be allowed to sign in.

## How To Find Each Account's UID

1. Open Firebase Console.
2. Go to `Authentication`.
3. Open the `Users` tab.
4. Click a user or inspect the row.
5. Copy the `UID` value for each allowed player.

## How To Replace UID Placeholders In `database.rules.json`

Open [database.rules.json](T:\Documents New\06_GitHub\DnD\database.rules.json) and replace:

- `REPLACE_WITH_UID_1`
- `REPLACE_WITH_UID_2`

with real Firebase Authentication UIDs.

Add more OR conditions only if more players need access.

## How To Publish Realtime Database Rules

1. Open Firebase Console.
2. Go to `Realtime Database`.
3. Open the `Rules` tab.
4. Paste the contents of [database.rules.json](T:\Documents New\06_GitHub\DnD\database.rules.json).
5. Publish the rules.

Do not deploy public rules like `".read": true` or `".write": true`.

## How To Initialize The Five Character Records

After a permitted user signs in, the app safely checks whether each fixed character record exists. Missing records are created automatically without overwriting existing ones. The initial tab names are:

- Rogue
- Character 2
- Character 3
- Character 4
- Character 5

## How Local Caching Works

- The app stores the latest character snapshot in localStorage as a fast display cache.
- The app also stores queued offline writes in localStorage.
- Cached data is shown immediately after an authenticated session is restored.
- Firebase remains the source of truth.
- If local JSON is malformed, the app falls back safely and logs the issue to the console.

## How Autosaving Works

- Text inputs and textareas save after a 600 ms debounce.
- Numeric fields save after a short debounce.
- Checkboxes save immediately.
- Pending writes flush when switching characters.
- Pending writes flush when the page becomes hidden.
- Saves use Firebase `update()` with precise field paths.

Status messages shown in the UI:

- `Saved`
- `Saving...`
- `Offline - changes queued`
- `Save failed`
- `Syncing...`

## How Multi-User Last-Write-Wins Behavior Works

This app uses Firebase real-time listeners and last-write-wins behavior at the individual field level.

- When another authenticated player edits a field, the latest Firebase value eventually wins.
- Focused fields are not force-replaced while the current user is typing.
- Remote changes show a subtle in-app update notice.
- `meta.updatedAt` and `meta.updatedBy` are written with each save.

## Local Run Command

Run the app from the project folder with:

```bash
python -m http.server 5500
```

Then open:

[http://localhost:5500](http://localhost:5500)

## Why Opening `index.html` Directly With `file://` May Fail

The app uses ES modules and browser-based Firebase imports from the official CDN. Browsers often block or inconsistently handle those patterns under `file://`, so use a local HTTP server instead.

## GitHub Pages Deployment Instructions

1. Push the project to GitHub.
2. Open the repository settings.
3. Enable `Pages`.
4. Publish from the repository root or the branch/folder you prefer.
5. Confirm `firebase-config.js` is included in the deployed output.

## Why `firebase-config.js` Can Be Committed In This Project

This app runs fully in the browser, so the Firebase Web config must be downloadable by the browser at runtime. That is normal for Firebase Web config and does not make it an Admin credential.

## Why Firebase Web Configuration Is Not An Admin Credential

Firebase Web config identifies the client app. It does not grant privileged server access by itself. Data protection comes from:

- Firebase Authentication
- Realtime Database Security Rules

## How To Export And Import Character JSON

- `Export Current Character` downloads a JSON file for the selected fixed character record.
- `Export All Characters` downloads all five records.
- `Import Current Character` accepts the app's exported single-character JSON schema, validates it, asks for confirmation, and then replaces the selected record through controlled Firebase updates.

## How To Print Sheets

Use the `Print Current Sheet` option in Settings. The print stylesheet hides navigation, settings controls, dice UI, save indicators, and other app chrome so the selected page prints cleanly.

## Troubleshooting Permission-Denied Errors

If sign-in succeeds but the dashboard shows permission-denied behavior:

1. Confirm Email/Password authentication is enabled.
2. Confirm the signed-in player's UID is listed in [database.rules.json](T:\Documents New\06_GitHub\DnD\database.rules.json).
3. Confirm the published rules in Firebase match the local file.
4. Confirm the app is pointing at the intended Firebase project in [firebase-config.js](T:\Documents New\06_GitHub\DnD\firebase-config.js).

## Never Commit These Files

- `serviceAccountKey.json`
- Firebase Admin private keys
- `.env` files containing private server credentials
- downloaded Google service-account JSON files

## Firebase Console Setup Checklist

1. Create or open the Firebase project.
2. Register the Web app.
3. Copy the Web SDK config into `firebase-config.js`.
4. Enable Email/Password authentication.
5. Create the player accounts manually.
6. Copy each allowed player's UID.
7. Replace the UID placeholders in `database.rules.json`.
8. Publish the Realtime Database rules.
9. Sign in with an allowed account.
10. Confirm the five fixed character records initialize.

## Files In This Project

- [index.html](T:\Documents New\06_GitHub\DnD\index.html)
- [styles.css](T:\Documents New\06_GitHub\DnD\styles.css)
- [app.js](T:\Documents New\06_GitHub\DnD\app.js)
- [firebase-config.example.js](T:\Documents New\06_GitHub\DnD\firebase-config.example.js)
- [firebase-config.js](T:\Documents New\06_GitHub\DnD\firebase-config.js)
- [database.rules.json](T:\Documents New\06_GitHub\DnD\database.rules.json)
- [README.md](T:\Documents New\06_GitHub\DnD\README.md)

## Security Notes

- This project does not include Firebase Admin SDK code.
- This project does not include service-account private keys.
- Security depends on Authentication plus Realtime Database Rules, not hidden frontend secrets.
