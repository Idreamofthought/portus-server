(function () {
  "use strict";

  var seasonNames = ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"];
  var rootField = document.querySelector(".root-field");

  if (!rootField) return;

  var nodes = Array.prototype.slice.call(rootField.querySelectorAll("[data-node]"));
  var nodeMap = {};
  nodes.forEach(function (node) { nodeMap[node.dataset.node] = node; });

  function setSeason() {
    rootField.dataset.season = seasonNames[new Date().getMonth()];
  }

  function makeSvgElement(name, attributes) {
    var element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attributes).forEach(function (key) { element.setAttribute(key, attributes[key]); });
    return element;
  }

  function drawRoots() {
    var oldSvg = rootField.querySelector(".root-lines");
    if (oldSvg) oldSvg.remove();

    var fieldRect = rootField.getBoundingClientRect();
    var svg = makeSvgElement("svg", { class: "root-lines", viewBox: "0 0 " + fieldRect.width + " " + fieldRect.height, preserveAspectRatio: "none", "aria-hidden": "true" });
    var seen = {};

    nodes.forEach(function (source) {
      var sourceRect = source.getBoundingClientRect();
      var startX = sourceRect.left + sourceRect.width / 2 - fieldRect.left;
      var startY = sourceRect.top + sourceRect.height / 2 - fieldRect.top;
      var links = (source.dataset.links || "").split(/[,\s]+/).filter(Boolean);

      links.forEach(function (targetName) {
        var target = nodeMap[targetName];
        if (!target || target === source) return;
        var pairKey = [source.dataset.node, targetName].sort().join("|");
        if (seen[pairKey]) return;
        seen[pairKey] = true;

        var targetRect = target.getBoundingClientRect();
        var endX = targetRect.left + targetRect.width / 2 - fieldRect.left;
        var endY = targetRect.top + targetRect.height / 2 - fieldRect.top;
        var bend = Math.max(42, Math.abs(endX - startX) * 0.32);
        var path = makeSvgElement("path", { class: "root-line", d: "M " + startX + " " + startY + " C " + (startX + bend) + " " + startY + ", " + (endX - bend) + " " + endY + ", " + endX + " " + endY, "data-link": pairKey });
        svg.appendChild(path);
      });
    });

    rootField.insertBefore(svg, rootField.firstChild);
  }

  function setActive(node, active) {
    node.classList.toggle("is-active", active);
    var related = (node.dataset.links || "").split(/[,\s]+/).filter(Boolean);
    related.forEach(function (targetName) {
      var key = [node.dataset.node, targetName].sort().join("|");
      var path = rootField.querySelector('[data-link="' + key + '"]');
      if (path) path.classList.toggle("is-active", active);
      if (nodeMap[targetName]) nodeMap[targetName].classList.toggle("is-active", active);
    });
  }

  setSeason();
  drawRoots();
  rootField.classList.add("is-entering");

  nodes.forEach(function (node) {
    node.addEventListener("mouseenter", function () { setActive(node, true); });
    node.addEventListener("mouseleave", function () { setActive(node, false); });
    node.addEventListener("focus", function () { setActive(node, true); });
    node.addEventListener("blur", function () { setActive(node, false); });
  });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) rootField.classList.add("is-visible"); });
    }, { threshold: 0.15 });
    observer.observe(rootField);
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(drawRoots, 120);
  });
}());