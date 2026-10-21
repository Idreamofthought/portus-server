# Disaster System

Disasters are not punishments; they are messages from the world.

## Types

- Flood
- Storm
- Quake
- Drought
- Beast omen
- River shift
- Stone fracture

## Behaviour

Each disaster has a trigger, a warning, an effect, a recovery path, and one or
more possible Codex consequences. Implemented event rules live under
[`portus/events/`](../portus/events/README.md) and in the protected game modules.

## Example: Flood

- Trigger: heavy rain combined with low favour
- Warning: rising river sound
- Effect: resource loss or terrain pressure
- Recovery: ritual and rebuilding