# Closed beta checklist

What has to be true before BoyaCep goes to the first testers, and what is still open.

## Ready

- Database: every table has RLS; `supabase/tests/run.sh` covers access rules, life cycles and limits.
- App: `npm run check` (types, lint, unit and screen tests) runs in CI with the database tests and a web build.
- Privacy: users can download (`export_my_data`) and delete (`delete_my_account`) their data from Profile.
- Crashes: the root `ErrorBoundary` reports to `client_errors` (signed-in users, 20 per hour); admins see them in the panel.
- Photos are resized and re-encoded on the device (drops EXIF location) and stored in a private bucket.
- Colour contrast of the theme is tested against WCAG AA.

## Builds

`eas.json` has three profiles. Builds need a free Expo account (`npx eas login`).

| Profile | Use |
| --- | --- |
| `preview` | Android APK and iOS ad-hoc build for testers (internal distribution) |
| `development` | Development client for local debugging (needs `expo-dev-client`, not installed yet) |
| `production` | Store builds; version is incremented remotely |

Android testers install the APK from the link EAS prints and work through [telefon-testi.md](telefon-testi.md). iOS testers need their device registered (`eas device:create`) or TestFlight, which requires an Apple Developer account (paid).

## Open before a public launch

- Legal: KVKK aydınlatma metni and terms of use reviewed by a lawyer (the in-app privacy page is a summary).
- Email: Supabase's built-in email is rate-limited; connect an SMTP provider before real users arrive.
- Session storage: the auth session is kept in AsyncStorage. Consider an encrypted store (SecureStore-held key) before launch.
- Painter portfolio and profile photos.
- AI wall analysis (needs an owner decision on the paid service).
- Supabase project: confirm region, enable point-in-time recovery or daily backups on the paid plan before storing real customer data.
