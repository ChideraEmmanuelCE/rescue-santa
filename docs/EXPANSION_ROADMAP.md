# RESCUE SANTA — OPEN-WORLD EXPANSION PROGRAM

**Scope:** evolve the existing solo Christmas rescue game into a modular, browser-first open-world experience, retaining the original character, rescue controls, sleigh flight, Express route, and Airfield. New regions are activated incrementally with visual/technical gates. This is a **planned backlog**, not a claim that 1,000 features already exist.

## Existing playable foundation (preserve)

- **Adventure:** North Pole ice-cage rescue, health, snowmen AI, charged snowballs, shattering cover, healing crates and escort.
- **Aurora:** two-rider sleigh flight, Aurora Village and five gift pickups.
- **Metropolis:** night city flyover, 11 delivery targets, gravity and wind, drop reticle, combo/perfect scoring; eight required deliveries.
- **Christmas Eve Express:** timed three-stop route with no restart.
- **Airfield:** pilotable aircraft, boarding, flight power, takeoff, landing and unloading.
- **Deployment:** Next.js 16, React 19, React Three Fiber/Three.js, Rapier, Vercel; original Santa GLTF, credited licensed assets.

## Quantified 1,185-item production backlog

Counting rule: every item is a separately playable behavior, asset variant, mission, collectible type, scene interaction, accessibility setting, or verified quality improvement. Mere duplicated prop placement does not count. Work through each milestone with a ticket and acceptance criteria.

| Category | Target | Major groups |
|---|---:|---|
| A. Gameplay and systems | 175 | locomotion 28, flight/driving 29, combat integration 25, economy 23, save/mission logic 30, camera/weather 40 |
| B. Vehicles/traversal | 130 | vehicle types/handling 45, customization 25, courses 20, transport interfaces 20, stunts/physics 20 |
| C. Enemy design and bosses | 145 | AI variants 40, bosses 20, weapons 30, combos/effects 25, arenas and enemy patrols 30 |
| D. Delivery and city life | 120 | delivery types 28, storefronts 24, NPC interactions 28, traffic/events 22, rooftop interactions 18 |
| E. Progression and collecting | 165 | outfits 30, companions 20, collectibles 50, skills 30, achievements/UI 35 |
| F. Immersion and world building | 235 | regional set pieces 100, ambient AI 45, audio/voice 35, weather/VFX 30, interiors 25 |
| G. Technical quality | 115 | streaming/LOD 30, accessibility 20, mobile controls 20, persistence 15, telemetry/testing 30 |
| H. Wildcards | 100 | Naughty events 25, seasonal games 25, secret puzzles 20, replay/photo 15, festive construction 15 |
| **Total planned** | **1,185** | **8 categories; 10 connected regions** |

Each target is a *development target*. It is not an already-shipped feature count.

## Geography and phased build sequence

**Phase 0 — Regression baseline** (current): audited and preserve Adventure, Express and Airfield. Strict CI build, unit tests for existing three-chapter story, and mobile Safari/browser checks. Confirm asset licenses, memory/performance profile.

**Phase 1 — North Pole: first open-world vertical slice** (current batch): ~23× original expedition area by surface area, initial 10 discoverable landmarks, deterministic forests/cabins, 90 collectible hidden parcels and letters, 5 ground vehicles with distinct handling, ground collision, map/portals, saved inventory/credits, ice shield and frost wave, performance-conscious instancing. All original rescue objectives remain playable. Gate: complete North Pole rescue after free-roaming in a vehicle; no forced reset or soft lock; city and airfield unaffected.

**Phase 2 — Regional streaming and vehicles:** dynamic grid chunks (64m cells), HLOD and texture budget, vehicle suspension and collision, realistic skid/traction, cockpit and first-person cameras, road network, save checkpoints, minimap navigation, 10 additional vehicle platforms. Gate: consistent 30 FPS target on representative phones (measured, not asserted); 60 FPS desktop when possible.

**Phase 3 — First act and boss:** rebuild ice prison interior, boss with telegraphed attacks and multi-phase AI, objective variation, companions and warmth, elf rescues, 20 side missions. Introduce fail/retry checkpoints without breaking saves.

**Phase 4 — Connected Aurora, Metropolis and Airfield:** streamed stage handoff with transition cinematics and portal network, enter/exit sleigh, improved ballistic present delivery, district-specific missions, traffic pedestrian navigation. Build return paths: city → airfield → tundra without resetting campaign progress.

**Phase 5 — Frozen Mountains, Candy Forest and Reindeer Ranch:** snowmobile races, reindeer mounts, skiing, stunt courses, avalanche/blizzard hazards, mountain passes and frozen lakes.

**Phase 6 — Present Vaults, Ice Caves, Workshop District:** subterranean scene loading, puzzle doors, production-line minigames, buildable gifts, mineshaft carts and underground enemies.

**Phase 7 — Naughty Prison Island and Floating Aurora Islands:** wanted meter, guards, alerts, airships, portal unlocks, main-boss progression and seasonal events.

**Phase 8 — Long-tail content and polish:** 100+ side missions, 200 achievements, 500 hiding places, quality animations, authored voices/audio, photo and replay systems, more vehicles/enemies, accessibility and localization. Count and verify every deliverable against the planned backlog.

## Architecture contracts

- \`lib/world.ts\`: core North Pole collision and legacy enemy/cage constants.
- \`lib/OpenWorld.ts\`: deterministic metadata for outer landmarks, cabins, forest, collectibles, gates. This is a **vertical-slice content generator**, not yet true streamed terrain.
- \`lib/VehicleFleet.ts\`: isolated 10Hz deterministic five-vehicle simulation. Extend via vehicle specs rather than embedding physics in React.
- \`lib/SoloGame.ts\`: simulation state machine, profile serialization, events, mission scoring, collisions.
- \`components/GameScene.tsx\`: R3F scene router. Keep physics in region-root components and avoid multiple WebGL contexts.
- \`components/NorthPoleDistrict.tsx\`: instance-based visual population with fixed Rapier colliders.
- \`components/GameClient.tsx\` and \`components/WorldMap.tsx\`: input, overlays, accessibility and persisted player profile.
- \`components/SkyChapter.tsx\`, \`components/CityChapter.tsx\`, \`components/AirportGame.tsx\`: separate chapter and airfield experiences that share the existing lore.
- \`tests/solo.cjs\`: simulation acceptance tests. Expand with each feature batch.

Upcoming contract: \`WorldSession\` (single persistent player profile), \`RegionManager\` (load/unload chunks), \`MissionDirector\` (serializable quest states), \`InteractableRegistry\` (enter, pickup, trade, board), \`AudioDirector\` (adaptive stems), \`AssetRegistry\` (licensing, attribution, LOD), \`ReplayRecorder\` (record deterministic input stream).

## Art direction and assets

- Preserve the warm red-and-cream Santa, cold North Pole twilight, natural snowbanks, detailed spruces and festive amber light contrast.
- Author environmental scale and texture variation with instanced GLB/GLTF, baked light maps, normal/roughness maps and a coherent PBR palette; avoid 1,000 dynamically shadowed lights.
- Use legally compatible CC0/free-to-use assets; license-check every external download, track attribution and any redistribution restrictions in \`public/credits.txt\`. Never assume "free" means CC0 or unrestricted commercial use.
- Candidate resources: Kenney CC0, Poly Haven CC0, licensed Sketchfab/creator-authorized packs, and locally generated procedural geometry. Check each asset before use.
- For realistic city life: animated rigs, AI intersections, traffic headlight cones, wet-road reflections, multi-LOD building facades, rooftop delivery animations and richer snow weather.
- For Spline compatibility, export/migrate individual GLB mesh/texture assets, not the entire real-time simulator.

## Quality and release gates

1. Every major batch must pass \`npm test\`, \`npm run typecheck\`, \`npm run build\`.
2. Build a separate Vercel **preview** first; inspect compile logs, runtime health and screenshot/interactive QA where available.
3. Verify keyboard and touch flows; test rescue holds, vehicle board/dismount, shield, collectibles, city drops, Express timeout, airfield landing and return.
4. Measure JS memory draw calls, mesh counts, FPS, frame spikes, texture sizes, network transfer and mobile WebGL context loss. Do not advertise unmeasured performance.
5. Reuse existing production URL and assets. Create one reviewed PR per batch; promote only after checks.
6. Preserve saved progress and old player bests. Version persisted profile schema when making breaking changes. Do not fabricate multiplayer readiness.

## Known limitations of Phase 1

This is **not yet a fully seamless 10-region GTA-sized world**. The first outdoor map is bounded and uses instancing; nearby scenes use transitions/portals, not continuous streaming. Vehicles currently have simplified handling and visuals, and building interiors, NPC schedules, detailed suspension and boss encounters remain planned. The 1,185-item backlog is scoped for iterative delivery, not represented as shipped.
