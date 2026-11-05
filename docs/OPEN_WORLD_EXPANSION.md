# Rescue Santa — Open World Design & Engineering Roadmap

Last reviewed: 2026-11-05. Source of truth: Next.js 16 + React 19, Three.js / React Three Fiber, Drei, Rapier, deterministic \`SoloGame\`, and isolated Airfield simulation.

## Non-negotiable product identity
- Browser-first, single-player-first, Christmas tone. Preserve the licensed Santa asset and existing rescue story, Express route, flight controls, sound and airport.
- Never claim planned systems are implemented. Avoid menus for unplayable systems.
- Prioritize a genuinely responsive 30 FPS mobile floor (goal) and 60 FPS desktop (goal), stable 10 Hz fixed simulation, deterministic progression, and optional local save without login.
- Existing game: Adventure / Christmas Eve Express / Airfield. Chapter sequence: ice cage → sleigh flight → Aurora Village → Midnight Metropolis → optional Noel Field.
- Separate "implemented and tested" from "engineered but pending visual/mobile QA" from "planned".

## Release phases and acceptance gates

### Phase 1 — North Pole first act (initial code batch)
- Grow the Adventure physical world from a 92m square to a 440m square (22.87× area), keep existing central battle and ice cage intact.
- Add ten landmark outposts and explorable districts, snow paths, landmark discovery rewards, 90 hidden present/letter pickups, six milestone bonuses.
- Build a reusable 5-vehicle snow/road physics fleet with proximity mounting, brake, boost, and chase camera. Keep separate flyable plane mode fully intact.
- Introduce magical shield and frost wave, enemy variants, credit economy, city drop precision and combo scoring.
- Add tactical map, portal fast travel to Express and Airfield, local profile hydration and durable progress.
- **Gate:** original rescue/flight/village/city/Express/Airfield regressions and new vehicle/combat/collectible/save tests must pass; preview must compile with TypeScript. Mobile interaction requires device/browser QA.

### Phase 2 — Multi-region world streaming
- World partition cells; GPS-style region/mission map, portal hubs, save checkpoints, cross-chapter progress.
- Stream Aurora Village, Frozen Mountains, Candy Forest, Reindeer Ranch and Elven Workshop with a detail system.
- Add ground handling presets, tune drifting and collisions, add driving hazards and controls customization.
- First 25 authored side quests; upgrade navigation, mission journal, character/NPC AI.
- **Gate:** 30 FPS on iPhone-class device in benchmark scenes, no cross-region state reset or memory growth over 30 minutes.

### Phase 3 — Midnight Metropolis sandbox
- Evolve current deterministic sleigh-delivery corridor into free-roam districts with persistent citizens, traffic routes and building interiors.
- 100+ route variations, authentic rooftop/chimney landing, fragile parcel damage, gift categories, children/citizen responses and earned credits.
- Introduce city vehicle garages, 20+ drivable traffic models, pedestrian response simulation, wanted/Naughty system, local economy.
- **Gate:** city free roam without forced auto-loop; AI traffic pathing, collision safety, deterministic scoring and mobile GPU budget.

### Phase 4 — Airports, mountains, bosses and dungeons
- Extend Noel Field into a regional air network; plane handling presets, runway guidance, airborne present drops, drone opponents.
- Frozen caves/vaults, Naughty List Prison Island, Aurora Islands, racing and 15 phased boss encounters.
- **Gate:** aircraft approach/land/deboard state machines, boss telegraphs and checkpoints verified with automated replay.

### Phase 5 — Progression, events and rich content
- 4 skill paths, avatar customization, reindeer companions, player home base, workshops, crafting, and vehicle tuning.
- 200 achievement levels, 500+ hidden discoveries, 100+ playable side missions, dynamic weather and special live events.
- Replace procedural placeholders with authored level design, lore and professionally licensed models/audio where justified.

### Phase 6 — Stabilization / longevity
- Instancing, cell streaming, resource disposal, worker-side pathfinding, occlusion, fog/LOD budgets, telemetry-ready diagnostics.
- Remappable touch and gamepad controls, motion reduction, captions, contrast and graphics settings.
- Optional cloud saves only with account consent; never silently migrate or erase existing local data.
- Multiplayer-ready state boundaries, but no multiplayer promise before authoritative synchronization and abuse protection.

## Content inventory — *planned tickets, not playable items*
The code-based planning registry in \`lib/ExpansionBacklog.ts\` expands to exactly **1,675 planned content tickets**, with predictable IDs:
- 900 regional side-mission variants (10 regions × 15 authored archetypes × 6 challenge styles)
- 280 collectible entries (10 regions × 14 object families × 2 rarities)
- 240 dynamic-event scenarios (10 regions × 12 archetypes × day/night)
- 40 planned vehicle chassis / handling / variant configurations
- 15 planned cinematic boss encounters
- 200 planned progression achievement levels (20 counters × 10 tiers)

Those are **design/backlog definitions** rather than claims that all quests are playable. Each requires scripts, assets, audio, UX, testing and quality review before status changes.

## Delivery target: 1,100 distinct launched improvements over the full program
| Production category | Quota |
| --- | ---: |
| Core gameplay | 160 |
| Vehicles and traversal | 115 |
| Combat, enemies and bosses | 130 |
| Present delivery and city life | 110 |
| Progression and collections | 160 |
| World building and immersion | 220 |
| Technical/accessibility/polish | 115 |
| Experimental/wildcard | 90 |
| **Total** | **1,100** |

The 1,675-ticket backlog is larger than the 1,100-item **release target** so content can be rejected during playtesting. The 1,100 target includes content pieces and interactions, not 1,100 unrelated software subsystems.

## Technical architecture
- \`lib/SoloGame.ts\`: authoritative tab-local 10Hz progression/quest/combat simulation, existing chapter transitions.
- \`lib/VehicleFleet.ts\`: deterministic vehicle handling, mutable vehicle state, board/dismount, acceleration, boost and collision callback. Future air/water handling should be separate presets, not conditional branches in React components.
- \`lib/OpenWorld.ts\`: stable North Pole landmarks, procedural instancing coordinates, collectibles, two portals, expansion region catalog.
- \`components/NorthPoleDistrict.tsx\`: GPU-batched conifers, cabins and collectibles plus landmark models and the ground vehicle rigs.
- \`components/Player.tsx\`: physically simulated avatar and mounted-vehicle view synchronization.
- \`components/WorldMap.tsx\`: resolution-independent SVG map, no remote tile dependency.
- \`components/CityChapter.tsx\`: current city aerial-drop scene (not yet full ground free-roam).
- \`components/AirportGame.tsx\` / \`lib/Airfield.ts\`: existing aircraft flight and mail service.
- \`lib/ExpansionBacklog.ts\`: planning-only content ticket generator. DO NOT import into the game bundle.
- Local save key \`rescue-santa-profile-v1\`: credits, finds, visits and milestones. Keep migration backwards-compatible.

## Visual and performance design rules
1. Render hundreds of static trees/buildings using instanced geometry; no shadow-casting point lights per tree or per civilian.
2. Animate only nearby or visible agents. Distant crowds and vehicles must be batched/LOD simplified.
3. Only allow a single authoritative simulation update stream per active mode; avoid React state writes inside high-frequency render loops.
4. Verify stable framerate on portrait/landscape mobile, low-power phones, desktop, and graphics fallback.
5. All external GLTF/texture/audio assets require explicit license/attribution records. Existing Santa model and credits must remain.
6. Keep winter palette (snow cyan, forest green, gold, red) and restrained HUD—no giant floating controls obscuring gameplay.
7. New regions share coordinate conventions, input and save interfaces before being connected to main map.

## Known limits after this initial batch
- The North Pole expanded map has landmarks, exploration and vehicles, but not all buildings have interiors.
- Land vehicle collision uses simplified circle/arena collision. Detailed world props and parked traffic will require cell-based colliders.
- Metropolis remains a playable aerial delivery course; true free-roam city blocks are Phase 3.
- Noel Field still runs through its own simulator. Fast travel links the modes, but universal seamless city-to-airport flight is not yet implemented.
- No realtime multiplayer, cloud accounts, 40 usable vehicles, 15 bosses or 1,000 launched mechanics are claimed.
