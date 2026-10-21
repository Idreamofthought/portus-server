# Save compatibility

The settlement remains version 1 with a 44 by 30 map. Existing filenames, account IDs, storage keys and Electron application identity are unchanged.

`protected/js/save-validation.js` is the shared browser, server and desktop contract; the root module re-exports it for existing server and test imports. Validate and migrate a candidate before changing a running town. Missing resources and bonuses from supported older saves receive their existing migration defaults. Unknown settlement fields, invalid positions, duplicate placements and invalid numbers remain rejected.

Optional `offlineDiscoveries` metadata contains rolls, artifacts, fragments and unlocked Codex entries. Manual export and authenticated cloud save preserve this data, including in browser mode. Browser gameplay continues using its server-backed discovery system: importing offline metadata does not award online account discoveries or merge online inventories. A save transferred back to desktop retains its offline history. No automatic synchronization between separate files or accounts is implied.

Desktop persistence validates the save before writing it. Writes are serialized per path. The previous valid save is kept as `.backup`; a corrupt primary save cannot overwrite that backup. Loading tries the backup if the primary is missing, unparsable, oversized or invalid under the game schema. If neither existing file is usable, loading reports the error rather than silently starting a new town.

The 512 KiB persistence limit is measured in UTF-8 bytes. This change does not migrate production databases or transfer accounts between the old and new hosting projects.
