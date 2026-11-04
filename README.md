# Rescue Santa

A single-player, landscape-first snowball adventure for the browser. Select **Start expedition**, fight through the snowmen, hold the rescue action at Santa’s ice cage, then escort him to the sleigh. Stay near him and clear nearby snowmen. Red kits restore health, and the fastest completed escape is saved on this device. The browser runs movement, enemies, combat and rescue progress locally.

On a phone, hold the left side to move, swipe the right side to aim, and tap Throw for a quick shot. Hold for 0.8 seconds and release to break ice or deal double damage. On desktop use WASD to move, click to capture the mouse, press and release the left mouse button or F to throw, Space to jump, and E to rescue Santa.

Use Node 22 or newer. Run `npm install`, then `node scripts/prepare-assets.mjs` and `npm run dev`. Run `npm test` for the solo gameplay checks or `npm run build` for a production build. The game requires WebGL 2. Asset credits are in `public/credits.txt`.
