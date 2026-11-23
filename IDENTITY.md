# IDENTITY (contract; every later phase obeys this file)

DIRECTION: D2 gallery
GROUND: #ffffff poster-white
SURFACE: #f6f6f4
DEEP: #ececea
LINE: #dcdcd8
INK: #17161a
ACCENT: #d92bd9 magenta
ON_ACCENT: #17161a
SECOND: none
OK: #2e7d4f
WARN: #a8641c
BAD: #b3382c
FONT_DISPLAY: F10 Unbounded (next/font/google: Unbounded)
FONT_BODY: Manrope (next/font/google: Manrope)
FONT_MONO: none
STRUCTURE: S6 story-scroll
ARCHETYPE: L5 bands
MOTION: M4 wipe, prefix efflux-
KIT: K6 three
RADIUS: sharp
HEADER: solid ground, border-b in LINE, sticky
LOGO_POLICY: brand-mark

## Why

The farm assigned this identity so that no two projects share a look, a route map or an interaction style. It is not a suggestion. Tie the product's own nouns to it; do not swap any row for a familiar one.

## Direction: D2 gallery

Pure white poster space, one electric hue, oversized type.

Surface treatment: Type is the main visual at poster scale, the electric hue appears as solid flat blocks, cards have no borders, wide white gaps separate everything.

Every hex in app/globals.css comes from the key block above. RADIUS sharp means 0 to 0.125rem on every card, panel and control. ON_ACCENT is the text color on an ACCENT fill. The semantic colors (OK, WARN, BAD) mark state only, never brand.

## Structure: S6 story-scroll

One long scroll narrative on the home route with the live product embedded and driven by the chapters.

Route map (name the bracketed parts with the product's own words):
- `/` : 3 to 5 scroll chapters, each changing the state of the same live component with seed data
- `/play` : the free-form tool without the narrative
- `/notes` : method, numbers and sponsor tech as an appendix

Rules:
- the same live component stays on screen while the chapter text changes beside or over it
- a chapter indicator shows progress and lets the reader jump between chapters
- the last chapter hands control to the reader and links to `/play`

## Archetype: L5 bands (the composition of the home route)

Stacked full-width horizontal bands alternating ground and surface colors, each band one sentence plus one artifact (figure, live frame, or control).

MUSTs: at least 4 bands; bands alternate surface color from the IDENTITY ramp; one band is the CTA band.
Bans: columns inside a band at lg; cards inside bands.

## Motion: M4 wipe (the entrance signature)

clip-path inset reveal, cubic-bezier(0.65, 0, 0.35, 1), 600ms. One keyframe block implements it; every keyframe name starts with `efflux-`. A `prefers-reduced-motion: reduce` block disables it.

## Interaction kit: K6 three

React Three Fiber: one interactive 3D object that embodies the product.

Packages for package.json dependencies: "three": "^0.187.0", "@react-three/fiber": "^9.8.2", "@react-three/drei": "^10.7.9". devDependencies: "@types/three": "^0.187.0".

Typical import: `import { Canvas, useFrame } from "@react-three/fiber"; import { OrbitControls, Float } from "@react-three/drei";`

Signature interactions (the scaffold ships the first; all three exist by the end of the frontend phase):
1. ONE interactive 3D object on the first screen that embodies the product's core noun, built from primitives (boxes, cylinders, extrusions), orbitable or pointer-reactive, no external model files
2. the object reacts to real product state: a seed value drives its scale, color or position, and changing the demo input updates the scene
3. a step-linked or scroll-linked camera move between two viewpoints

Rules:
- the Canvas component loads through `next/dynamic` with `ssr: false` from inside a client component
- an error boundary wraps it and falls back to the SVG illustration; the page must work without WebGL
- use `frameloop="demand"` or pause offscreen; render a static frame under reduced motion
- materials and lights use IDENTITY colors only; all text stays in HTML, never inside WebGL
- add the packages above to package.json `dependencies` (and `devDependencies` where listed) with exactly these ranges; the runner installs them
- every import of a kit package lives in a component that starts with `"use client"`
- server HTML must be readable with JavaScript off: never server-render content at opacity 0 or off screen; animate from the visible state or on interaction
- honor `prefers-reduced-motion: reduce`: the content and every control stay usable with motion off
- every interaction is driven by the real seed data; a decorative animation with no product meaning does not count as a signature

## Amendments (append-only; later phases add dated lines here, never edit anything above)
