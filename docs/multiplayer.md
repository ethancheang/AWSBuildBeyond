# Optional multiplayer

Built for the current `main` Vite/TypeScript game. Lessons and scores remain local.
Only avatar position, heading, jump height, display name and lesson presence are shared.
Movement updates are capped at 10 per second; idle clients send a heartbeat every 2 seconds.

## Local two-player demo (no AWS account required)

From the repository root, with Node 22.12+:

```sh
npm ci --prefix server
npm start --prefix server
```

In another terminal, copy `.env.example` to `.env.local`, then:

```sh
npm run dev -- --port 5173 --strictPort
```

Open two tabs:

- http://127.0.0.1:5173/?room=test&name=Alice
- http://127.0.0.1:5173/?room=test&name=Bob

Click Let's makan in both. Walk, sprint and jump. Start a lesson in one tab:
its name tag fades for the other player. Closing a tab removes its avatar.
Different `room` values isolate players. `?solo=1` disables networking.
Remove `VITE_WS_URL` and restart Vite to restore the single-player default.
The relay binds to loopback by default. Set `HOST` and `ALLOWED_ORIGINS` explicitly
if intentionally exposing it to other devices; browser origins must match exactly.

## AppSync Events

Create an AppSync **Event API**, a `game` channel namespace, and configure connection,
publish and subscribe authorization. For a limited demo using API-key authorization,
set the three `VITE_APPSYNC_*` values in `.env.local` (or the hosting build environment).
Use the HTTP and realtime hostnames from the API settings, without schemes or paths.
Attach `aws/game-namespace-handlers.js` as the namespace's onPublish handler code.
Rebuild/restart the app after changing environment values. The Node relay is not needed.

The client implements the [AWS WebSocket protocol](https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-websocket-protocol.html).
Local transport tests do not verify a deployed AWS API, IAM setup or runtime handler acceptance.
An AWS deployment and two-device test are still required before claiming live AppSync support.

## Limits

- All `VITE_*` variables are bundled into public JavaScript. An AppSync API key is
  demo access, not player identity. Random room names do not make rooms private.
  Use authenticated users and namespace authorization for private/public production use.
- Client-reported movement is not authoritative. The demo handler bounds values but
  does not prevent impersonation or enforce collision checks. The Node relay binds IDs
  to sockets and limits message rate, payload size and room membership.
- No chat, voice or lesson answers are transmitted. Avoid real names in the `name` URL parameter.
- Browsers can suspend background tabs; an avatar disappears after 6 seconds without
  updates and returns on its next state message. Unload delivery is best-effort.
- Configure service quotas and budget alerts before publishing a demo. No AWS resources
  are created by this repository or by running the local relay.

## Verification

`npm run check` runs lint, unit tests and the production build. Transport unit tests
exercise AppSync protocol frames with a fake socket; they do not contact AWS.

`npx playwright test --config playwright.multiplayer.config.ts` starts an isolated
relay on 8081 and Vite on 5180, then tests real browser sessions. Install Playwright's
Chromium first, or set `PLAYWRIGHT_CHANNEL=msedge` to use installed Microsoft Edge.
