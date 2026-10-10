# Experimental shared hawker hall

The experiment is based on the current `main`, including sprint, jump and isometric controls. It adapts the supplied `multiplayer-feat-refactor.patch`; the former `feat/refactor` and `jj_test` branches have already been merged and removed.

Each browser publishes its own position, height, heading, display name and busy flag to `/game/<room>`. Other browsers interpolate a procedural avatar and a camera-facing name tag. Lessons, answers, scores and saved progress stay local. A busy player's tag fades while they use a lesson or dialog.

No environment configuration means single-player with no socket connections. `?solo=1` opts out even on a configured build. Click **Let's makan** to join; the title screen does not join. Use the same `?room=test` on two devices. On multiplayer builds the title screen asks for a display name, prefilled from `&name=Alice` or the last name used in this browser; blank names become `Guest ###`. Names are capped at 16 characters. Room names are lowercased, reduced to letters, digits and interior dashes, and capped at 40 characters; an empty name falls back to `lobby`. The footer shows connection status and the number of players visible to this client.

## Run locally without AWS

Requires the project's Node 22.12+ toolchain. The optional relay has a separate locked dependency installation; the web app itself adds no runtime dependencies.

```sh
npm ci
npm ci --prefix server
npm start --prefix server
```

Copy `.env.example` to `.env.local`, leave the AppSync values blank, and enable `VITE_WS_URL=ws://127.0.0.1:8080`. In another terminal run `npm run dev`. Open `http://127.0.0.1:5173/?room=test&name=Alice` and a second tab with `name=Bob`, click **Let's makan** in both, then walk, sprint and jump. Enter a lesson in one tab and watch its name tag fade in the other. Closing a tab removes its avatar.

The relay listens only on loopback by default. `HOST`, `PORT` and comma-separated `ALLOWED_ORIGINS` override it. To test across devices on a trusted LAN, bind both Vite and the relay to `0.0.0.0`, use the host computer's LAN IP in `VITE_WS_URL`, and allow that exact browser origin. Hosting this alternative publicly requires TLS (`wss://` on an HTTPS page), access controls and operational ownership; AppSync avoids running this relay in production.

## Configure AWS AppSync Events

### AWS Console (no CLI credentials required)

1. Sign in to AWS and select **Asia Pacific (Singapore)**.
2. In AppSync, choose **Create API → Event API** and name it `kopi-that-mp`. The console creates an API key with a short expiry by default.
3. Open **Namespaces → Create namespace**, enter `game`, select **Code with no data source**, and replace the sample code with `aws/game-namespace-handlers.js`. Create the namespace.
4. Under **Settings**, copy the HTTP and Realtime DNS endpoints and API key into the three corresponding `.env.local` variables shown below. Leave off `https://`, `wss://` and path suffixes.
5. Check the key's expiration in Settings. Restart Vite and open two tabs with the same room name. The optional local relay can be stopped when using AppSync.

### AWS CLI alternative

Use an **Event API**, not a GraphQL API. The examples below use Singapore (`ap-southeast-1`), AWS CLI v2 and PowerShell, from the repository root. They are setup instructions, not commands that the app runs. An AWS account with permission to create AppSync resources is required.

```powershell
$eventApi = aws appsync create-api --region ap-southeast-1 --name kopi-that-mp --event-config file://aws/event-config.json --output json | ConvertFrom-Json
$eventApiId = $eventApi.api.apiId
$expires = [DateTimeOffset]::UtcNow.AddDays(30).ToUnixTimeSeconds()
$eventKey = aws appsync create-api-key --region ap-southeast-1 --api-id $eventApiId --expires $expires --output json | ConvertFrom-Json
aws appsync create-channel-namespace --region ap-southeast-1 --api-id $eventApiId --name game --code-handlers file://aws/game-namespace-handlers.js
```

Check that each command succeeded before proceeding. In the returned API, `api.dns.Http` and `api.dns.Realtime` provide the hostnames. The key is in `apiKey.id` of the key response. Put those three values into `.env.local`:

```dotenv
VITE_APPSYNC_HTTP_HOST=YOUR_ID.appsync-api.ap-southeast-1.amazonaws.com
VITE_APPSYNC_REALTIME_HOST=YOUR_ID.appsync-realtime-api.ap-southeast-1.amazonaws.com
VITE_APPSYNC_API_KEY=YOUR_EVENT_API_KEY
```

Restart Vite after changing environment variables. The `game` namespace handler validates messages on AWS before broadcasting them: it rejects invalid coordinates outside the inset octagonal hall, bounds jump height and heading, limits IDs and names, and removes unknown fields. It uses the restricted APPSYNC_JS runtime and has no Lambda or data source dependency. Upload it again after changing validation rules. The client independently validates received data.

For Amplify Hosting, use Node 22.12+ (Node 24 is used in CI), build with `npm ci && npm run build`, and publish `dist`. Set the three `VITE_APPSYNC_*` variables in Amplify before building. Vite embeds them at build time; rotating the key requires a rebuild and redeploy. `.env.local` is ignored by Git. The optional relay is not needed on Amplify.

## Connection lifecycle and limits

- Changed movement is sampled every 100 ms; idle and busy players send a heartbeat every two seconds. Arrival or reconnect sends a hello and current state. Other players respond to hello with their state, so new arrivals see stationary players too.
- Handshake/subscription and keep-alive timeouts trigger reconnection with jittered exponential backoff, capped at 30 seconds. No stale positions are queued while disconnected or backpressured.
- Page exit and world disposal send a best-effort leave and close the socket. Six seconds of silence removes an avatar even if leave is lost. Browser background throttling, suspended laptops and lost Wi-Fi can trigger this expiry; returning clients reappear after their next state.
- At most 30 remote avatars are rendered per client. This is a rendering safeguard, not an AppSync room limit. The optional relay enforces 30 connections per room and 20 incoming messages per second per socket.
- Movement is client-authoritative. Validation restricts message shape and hall bounds; it does not prevent teleporting, overlap with props, cheating or spoofed identities. API-key authentication identifies access to the API, not individual players. Anyone with that public key can publish/subscribe to allowed channels; random room names are not authorization. This configuration is for a controlled experiment. Authenticated users and room authorization are needed for a private or public production service.

## Cost and credentials

All `VITE_*` values are public in the built JavaScript, including the demo API key. Use a short-lived key, rotate or remove it after demos, and never put AWS access keys or account credentials in Vite variables. An API key and room name are not secrets or player identity.

AppSync bills event operations and connection time. Fan-out, handler invocations and active subscriptions affect cost, so the original patch's flat per-message hourly estimate is not a budget guarantee. Check [current AppSync pricing](https://aws.amazon.com/appsync/pricing/) and configure an AWS Budgets alert for the experiment; free-tier eligibility is account-specific. No AWS resources or budgets are created by this repository's build or tests.

## Verification

```sh
npm run check
npm run test:e2e
npm ci --prefix server
npm run test:relay
npm run test:multiplayer
```

The dedicated multiplayer browser suite starts Vite on 5174 and an actual local relay on 8081, with AWS variables explicitly blank. It checks two browsers joining, movement and jump publication, presence through a lesson, tab departure, separate rooms and solo opt-out. Unit tests cover the AppSync wire protocol with a fake socket, malformed frames, authentication headers, reconnects, timeouts, backpressure, idle/busy timing, validation parity and avatar smoothing/fade/expiry/disposal. The relay test checks socket-bound identity, room isolation, origin rejection and departure.

### Opt-in live AWS check

With `.env.local` configured, run:

```sh
npm run test:appsync
```

This contacts your real Event API, so event and connection charges apply. It opens three short-lived sockets in unique test rooms and uses synthetic player data. It checks authentication and subscription, two-way state delivery (including jump and busy flags), server-side name truncation and removal of unknown fields, filtering of an invalid position, room isolation, and departure. It never prints the API key. A failed check exits with a nonzero status. This is deliberately separate from CI and the local test suites.

On 30 September 2026, this live check passed against the Singapore Event API with the repository's namespace handler. Two Chrome game tabs also joined the same AWS room and displayed **Shared hall · 2 here** with the local relay stopped. Moving Player 1 changed its avatar's position in Player 2's view. Opening Player 1's lesson kept Player 2 in the hall with the remote name tag faded. The demo key created during setup expires on **7 October 2026 at 20:00 Singapore time**; obtain a replacement key and restart/rebuild before using the demo after that date. Keys and actual endpoint configuration stay in ignored `.env.local`.

The CLI provisioning commands and Amplify deployment have not been executed. Before a hosted rollout, still verify on two separate devices, reconnect after a network interruption, and expired-key behavior. This live test does not exercise a real-time key-expiry transition.

References: [AppSync WebSocket protocol](https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-websocket-protocol.html), [event handlers](https://docs.aws.amazon.com/appsync/latest/eventapi/writing-event-handlers.html), [runtime features](https://docs.aws.amazon.com/appsync/latest/eventapi/runtime-supported-features.html), [create-api](https://docs.aws.amazon.com/cli/latest/reference/appsync/create-api.html), [create-channel-namespace](https://docs.aws.amazon.com/cli/latest/reference/appsync/create-channel-namespace.html), [Amplify build settings](https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html).
