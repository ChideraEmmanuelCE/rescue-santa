# Rescue Santa

A landscape-first North Pole rescue game for the browser. Players join a named room, fight snowmen, and hold the rescue action at the ice cage. Room creation is automatic.

## Run the client

Use Node 22 or newer. Run `npm install`, then `node scripts/prepare-assets.mjs` and `npm run dev`. Asset preparation downloads the pinned Santa model and optimizes its maps. See `public/credits.txt` for the source and licenses.

Set `NEXT_PUBLIC_PARTYKIT_HOST=rescue-santa-realtime.onrender.com` in `.env.local` to use the deployed room service locally. A local PartyKit worker on port 1999 is also supported by `npm run party:dev`. The production client uses the deployed room service by default.

## Play

Open the same room link on two devices, choose callsigns and join. On a phone, hold the left side to move, drag the right side to aim, and hold the throw button to fire. Dragging the throw button also adjusts aim. On desktop use WASD, click to capture the mouse, hold the left mouse button or F to fire, Space to jump, and E near the ice to rescue Santa. The menu contains the room invitation, roster and sound toggle.

## Verify and build

Run `npm run build` to prepare licensed assets, run room and combat regression checks, type-check, and build Next.js. Run `node scripts/check-live-room.mjs` for a two-client check against an isolated temporary room on the deployed realtime service. It verifies presence, movement, facing, a shot and disconnect. WebGL 2 is required for the 3D client.
