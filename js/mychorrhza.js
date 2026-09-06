/* ============================================================
   MYCORRHIZA — root network behaviour
   Works on any ".root-field" container holding elements tagged:
     data-node="unique-id"
     data-links="other-id, other-id"
   Draws a faint curved "root" between every linked pair, and a
   "nest" dot at any node with 2+ connections. On hover/focus of
   a node, its roots and nests light up gold.
   ============================================================ */

(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";

  function initRootField(container) {
    if (!container) return;

    let svg = container.querySelector(":scope > svg.mycorrhiza-svg");
    if (!svg) {
      svg = document.createElementNS(SVG_NS, "svg");
      svg.classList.add("mycorrhiza-svg");
      container.insertBefore(svg, container.firstChild);
    }

    function getNodes() {
      return Array.from(container.querySelectorAll("[data-node]"));
    }

    function centerOf(el, containerRect) {
      const r = el.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - containerRect.left,
        y: r.top + r.height / 2 - containerRect.top,
      };
    }

    function draw() {
      const containerRect = container.getBoundingClientRect();
      svg.setAttribute("width", containerRect.width);
      svg.setAttribute("height", containerRect.height);
      svg.innerHTML = "";

      const els = getNodes();
      const byId = {};
      els.forEach((el) => {
        byId[el.dataset.node] = el;
      });

      const drawnPairs = new Set();
      const connectionCount = {};

      els.forEach((el) => {
        const links = (el.dataset.links || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const from = centerOf(el, containerRect);

        links.forEach((id) => {
          const target = byId[id];
          if (!target) return;

          const pairKey = [el.dataset.node, id].sort().join("|");
          if (drawnPairs.has(pairKey)) return;
          drawnPairs.add(pairKey);

          const to = centerOf(target, containerRect);
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2 + 24; // slight droop, like a root

          const path = document.createElementNS(SVG_NS, "path");
          path.setAttribute("d", `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`);
          path.dataset.a = el.dataset.node;
          path.dataset.b = id;
          svg.appendChild(path);

          connectionCount[el.dataset.node] = (connectionCount[el.dataset.node] || 0) + 1;
          connectionCount[id] = (connectionCount[id] || 0) + 1;
        });
      });

      // Nest markers at hubs (2+ connections)
      Object.keys(connectionCount).forEach((id) => {
        if (connectionCount[id] < 2) return;
        const el = byId[id];
        if (!el) return;

        const pos = centerOf(el, containerRect);
        const circle = document.createElementNS(SVG_NS, "circle");
        circle.setAttribute("cx", pos.x);
        circle.setAttribute("cy", pos.y);
        circle.setAttribute("r", 5 + Math.min(connectionCount[id], 5));
        circle.classList.add("nest");
        circle.dataset.node = id;
        svg.appendChild(circle);
      });
    }

    function setActive(id, active) {
      svg
        .querySelectorAll(`path[data-a="${id}"], path[data-b="${id}"]`)
        .forEach((p) => p.classList.toggle("active", active));
      svg
        .querySelectorAll(`circle.nest[data-node="${id}"]`)
        .forEach((c) => c.classList.toggle("active", active));
    }

    getNodes().forEach((el) => {
      el.addEventListener("mouseenter", () => setActive(el.dataset.node, true));
      el.addEventListener("mouseleave", () => setActive(el.dataset.node, false));
      el.addEventListener("focus", () => setActive(el.dataset.node, true));
      el.addEventListener("blur", () => setActive(el.dataset.node, false));
    });

    draw();
    window.addEventListener("resize", draw);
    window.addEventListener("load", draw);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".root-field").forEach(initRootField);
  });
})();
        
