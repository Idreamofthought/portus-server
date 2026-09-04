# Portus UI Guide

Portus should feel like a quiet interface discovered inside a dream. The UI supports repeated city-building actions without becoming loud, dense, or mechanical.

## Visual Direction

Use:

- Deep indigo and near-black backgrounds
- Misty translucent surfaces and restrained blur
- Soft blue-violet borders and glows
- Warm, readable text with Georgia or another serif face
- Pixelated canvas rendering with smooth surrounding UI
- Small, deliberate transitions rather than constant motion

Avoid:

- Neon saturation
- Large marketing-style hero sections
- Excessive gradients or decorative blobs
- Dense card nesting
- Text that explains obvious controls
- Animations that compete with the map

## Layout

The game HUD has five primary zones:

- Top bar: Portus identity, time, resources, and audio controls
- Center stage: the 1200x792 logical canvas and map
- Left panel: Codex and remembered world knowledge
- Right panel: live warnings and risks
- Bottom controls: building toolbar and research bar

The layout must remain usable at narrow widths. Toolbars may scroll horizontally; panels may stack vertically on mobile.

## Controls

Building buttons select a building type. The selected building should be visually distinct and the selection should be announced through a notification. A canvas click attempts placement and gives gentle feedback when terrain, occupancy, or bounds reject it.

Panel buttons toggle secondary information. Keep labels short and consistent with the panel heading. Audio controls must remain optional and must not prevent game play when unavailable.

## Resource Ledger

The resource ledger displays wood, stone, food, and gold. Keep values easy to scan, aligned consistently, and updated from the shared game state. Do not duplicate resource state in the DOM or create a second economy model for presentation.

## Typography and Content

Use sentence case for explanatory content and short labels for controls. Reserve uppercase or increased letter spacing for small metadata such as seasons, categories, and status labels. Keep line lengths short in side panels.

## Motion and Sound

Transitions should be brief and low contrast. New panel content may fade in. Ambient sound must start only after a browser-approved user gesture. Placement sounds should confirm successful construction, remain short, and never play for invalid placement.

Respect the user's music and SFX toggles. Audio failures should be non-fatal.

## Accessibility

- Use semantic landmarks and button elements.
- Give icon-only controls an accessible name.
- Preserve visible keyboard focus.
- Keep text contrast readable against translucent panels.
- Do not communicate state through color alone.
- Ensure horizontal toolbars remain keyboard navigable.

## Implementation Rules

- Preserve the existing element IDs used by `public/ui.js`.
- Keep gameplay state in the `state` object.
- Prefer DOM text updates over unsafe HTML when content is user-controlled.
- Keep canvas coordinates based on `TS` from `public/map.js`.
- Test desktop and mobile layouts after changing shared styles.

## Review Checklist

- Does the change preserve the dreamlike tone?
- Is the primary action obvious without an instruction paragraph?
- Does the layout work at 600px and desktop widths?
- Are focus, hover, disabled, empty, and error states present?
- Does the change use the existing state and panel abstractions?
- Does it avoid adding a second source of truth?
