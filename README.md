# Particle Studio — Architecture Study

A small interactive React + Three.js prototype for a procedural architectural pavilion.

## Features
- Orbit / pan / zoom camera controls
- Procedural four-storey building with facade, floors, columns and core
- Assemble / explode / rebuild animation with timeline scrubbing
- Layer visibility toggles
- Solid / wireframe / X-ray display modes
- Section clipping plane with adjustable position
- Perspective / top / front camera presets

## Run locally
Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## Notes
This is a procedural geometry prototype, not a production BIM viewer. The building is generated from Three.js primitives so the interaction and animation pipeline can be tested before importing GLB/GLTF assets.
