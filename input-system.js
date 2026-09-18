// ============================================================================
// PORTUS INPUT SYSTEM — FULL INTEGRATION FILE
// ============================================================================

// Assumes these modules exist globally or are imported:
// Pointer, DoubleTap, DragDrop, MultiSelect, RadialMenu, CameraGestures

// ---------------------------------------------------------------------------
// 1. DECLARATIVE POINTER MAP
// ---------------------------------------------------------------------------

Pointer.map({

  // CANVAS (main game surface)
  canvas: {
    tap: handleCanvasTap,
    drag: e => MultiSelect.update(e),
    hold: e => inspectBuilding(e)
  },

  // INVENTORY SLOTS
  ".inventory-slot": {
    tap: selectInventoryItem,
    drag: e => DragDropInventory.onDrag(e),
    hold: e => openInventoryDetails(e.target.dataset.item)
  },

  // BUILD MENU BUTTONS
  "#buildings button": {
    tap: e => selectBuildingToPlace(e.target.dataset.id),
    hold: e => openBuildingPreview(e.target.dataset.id)
  },

  // TECH TREE NODES
  ".tech-node": {
    tap: e => openTechDetails(e.target.dataset.tech),
    hold: e => openTechDetails(e.target.dataset.tech)
  },

  // RESOURCE BAR
  ".resource, .resource-icon, .resource-entry": {
    tap: e => openResourceDetails(e.target.dataset.resource),
    hold: e => openResourceAnalytics(e.target.dataset.resource)
  },

  // QUEST LOG
  ".quest-entry, .quest-item, .quest-row": {
    tap: e => openQuestDetails(e.target.dataset.quest),
    hold: e => openQuestChain(e.target.dataset.quest)
  },

  // CODEX
  ".codex-entry, .codex-item": {
    tap: e => openCodexEntry(e.target.dataset.codex),
    hold: e => toggleCodexPin(e.target.dataset.codex)
  },

  // GENERIC UI BUTTONS
  "button, .ui-button": {
    tap: e => handleUIButton(e),
    hold: null
  }
});

// ---------------------------------------------------------------------------
// 2. DOUBLE‑TAP SHORTCUTS
// ---------------------------------------------------------------------------

// Canvas: quick inspect / focus
DoubleTap.bind(canvas, e => {
  const tile = tileFromEvent(e);
  if (!tile) return;
  const b = grid[tile.y][tile.x].building;
  if (!b) return;
  centerCameraOnBuilding(b.id);
  playTone("focus");
});

// Inventory: quick‑use
DoubleTap.on(".inventory-slot", (e, el) => {
  const item = el.dataset.item;
  if (!item) return;
  quickUseItem(item);
  playTone("action");
});

// Tech: quick unlock (if affordable)
DoubleTap.on(".tech-node", (e, el) => {
  const tech = el.dataset.tech;
  if (tech && canAffordTech(tech)) {
    unlockTech(tech);
    playTone("unlock");
  }
});

// Resource: toggle analytics mode
DoubleTap.on(".resource, .resource-icon, .resource-entry", (e, el) => {
  const id = el.dataset.resource;
  if (!id) return;
  toggleResourceAnalyticsMode(id);
  playTone("toggle");
});

// ---------------------------------------------------------------------------
// 3. DRAG‑AND‑DROP (example: inventory)
// ---------------------------------------------------------------------------

document.querySelectorAll(".inventory-slot").forEach(el => {
  DragDrop.makeDraggable(el, {
    onStart: (e, el) => startInventoryDrag(el.dataset.item),
    onMove: (e, el) => updateInventoryDrag(e),
    onEnd: (e, el, dropTarget) => finishInventoryDrag(el.dataset.item, dropTarget)
  });
});

document.querySelectorAll(".inventory-drop-target").forEach(el => {
  DragDrop.makeDroppable(el, {
    onDrop: (item, target) => handleInventoryDrop(item, target)
  });
});

// ---------------------------------------------------------------------------
// 4. MULTI‑SELECT (canvas)
// ---------------------------------------------------------------------------

Pointer.bind(canvas, {
  onDrag: e => MultiSelect.update(e),
  onTap: e => handleCanvasTap(e),
  onHold: e => inspectBuilding(e)
});

Pointer.onDrag(canvas, e => {
  if (!MultiSelect.selection.size) MultiSelect.start(e);
});

Pointer.onEnd(canvas, e => MultiSelect.end(e));

// ---------------------------------------------------------------------------
// 5. RADIAL MENUS
// ---------------------------------------------------------------------------

// Inventory radial menu
RadialMenu.attach(".inventory-slot", el => [
  { label: "Inspect", action: "inspect", onSelect: () => openInventoryDetails(el.dataset.item) },
  { label: "Drop",    action: "drop",    onSelect: () => dropItem(el.dataset.item) },
  { label: "Pin",     action: "pin",     onSelect: () => pinItem(el.dataset.item) }
]);

// Tech radial menu
RadialMenu.attach(".tech-node", el => [
  { label: "Info",   action: "info",   onSelect: () => openTechDetails(el.dataset.tech) },
  { label: "Unlock", action: "unlock", onSelect: () => unlockTech(el.dataset.tech) }
]);

// ---------------------------------------------------------------------------
// 6. CAMERA GESTURES
// ---------------------------------------------------------------------------

CameraGestures.attach(canvas);

// ============================================================================
// END OF INTEGRATION FILE
// ============================================================================
