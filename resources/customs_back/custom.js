// Responsive top-capper for split-view dropdowns, with deferred init until sidebar exists

document.addEventListener("DOMContentLoaded", () => {
  const SIDEBAR_SELECTOR = "div#workbench\\.parts\\.sidebar";
  // Percentage of sidebar height to subtract when above threshold
  const OFFSET_RATIO = 0.02;
  // Track elements that have been adjusted
  const adjustedElements = new Map();

  let sidebar = null;

  function initialize() {
    sidebar = document.querySelector(SIDEBAR_SELECTOR);
    if (!sidebar) {
      // console.log("Sidebar not ready, retrying...");
      return;
    }
    clearInterval(poll);
    // console.log("Sidebar found, initializing observers.");

    // Core adjust logic using sidebar height as threshold
    function adjustDropdown(dropdown, forceCheck = false) {
      const cs = window.getComputedStyle(dropdown);
      const topVal = parseFloat(cs.top);
      // console.log("checking top:", topVal + "px");

      const thresholdPx = sidebar.getBoundingClientRect().height;
      // console.log("thresholdPx", thresholdPx);

      const wasAbove = dropdown.dataset.wasAbove === "true";
      const isAbove = topVal > thresholdPx - 100;

      // Track the expected position if we've adjusted this dropdown before
      const previousAdjusted = adjustedElements.get(dropdown);
      const expectedTop = previousAdjusted
        ? previousAdjusted.adjustedTop
        : null;

      // Detect if this element has been pushed by others
      const hasBeenPushed =
        previousAdjusted && Math.abs(topVal - expectedTop) > 1 && isAbove;

      // Conditions to adjust: first time above threshold, or pushed by other elements
      if ((isAbove && !wasAbove) || hasBeenPushed || (forceCheck && isAbove)) {
        // calculate offset based on sidebar height
        const offsetPx = thresholdPx * OFFSET_RATIO;
        // If it was pushed, recalculate from current position
        const baseTop = hasBeenPushed ? topVal : topVal;
        const newTop = baseTop - offsetPx;

        setTimeout(() => {
          // temporarily disable 'top' transitions for instant apply
          const origTrans = dropdown.style.transition;
          dropdown.style.transition = origTrans
            .split(",")
            .filter((s) => !s.includes("top"))
            .join(",");

          dropdown.style.top = `${newTop.toFixed(1)}px`;
          // console.log(
          //   `adjusted top by ${offsetPx.toFixed(1)}px → ${newTop.toFixed(1)}px`,
          //   hasBeenPushed ? "(repositioned after push)" : "",
          // );

          // Track this adjustment
          adjustedElements.set(dropdown, {
            adjustedTop: newTop,
            timestamp: Date.now(),
          });

          dropdown.offsetHeight; // force reflow
          dropdown.style.transition = origTrans;
        }, 50);
      }

      // update crossing flag
      dropdown.dataset.wasAbove = isAbove.toString();
    }

    // Attach transition listener to dropdown
    function observeDropdown(dropdown) {
      dropdown.removeEventListener("transitionend", dropdown._handler);
      const handler = (e) => {
        if (e.propertyName === "top") {
          adjustDropdown(dropdown);
        }
      };
      dropdown._handler = handler;
      dropdown.addEventListener("transitionend", handler);

      // also initial adjust on attach
      adjustDropdown(dropdown);
    }

    // Observe mutations within each container
    function observeContainer(container) {
      // initial calculate & observe
      container
        .querySelectorAll(".split-view-view.visible")
        .forEach((dd) => observeDropdown(dd));

      const mo = new MutationObserver(() => {
        container
          .querySelectorAll(".split-view-view.visible")
          .forEach((dd) => observeDropdown(dd));
      });
      mo.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    }

    // Initial pass for all containers
    document
      .querySelectorAll(".composite.viewlet")
      .forEach((container) => observeContainer(container));

    // Global observer for new containers
    const globalMO = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.type === "childList") {
          m.addedNodes.forEach((n) => {
            if (n instanceof HTMLElement && n.matches(".composite.viewlet")) {
              observeContainer(n);
            }
          });
        }
      });
    });

    globalMO.observe(document.body, { childList: true, subtree: true });

    // Periodically check if any adjusted dropdowns need readjustment
    setInterval(() => {
      // Only check elements that have been adjusted in the last 5 seconds
      const recentThreshold = Date.now() - 5000;

      adjustedElements.forEach((data, dropdown) => {
        // If an element was recently adjusted, check if it's been moved unexpectedly
        if (data.timestamp > recentThreshold && dropdown.isConnected) {
          const cs = window.getComputedStyle(dropdown);
          const currentTop = parseFloat(cs.top);

          // If position differs from what we set by more than 1px, it might have been pushed
          if (Math.abs(currentTop - data.adjustedTop) > 1) {
            // console.log("Element possibly pushed, rechecking:", dropdown);
            adjustDropdown(dropdown, true);
          }
        } else if (!dropdown.isConnected) {
          // Clean up disconnected elements
          adjustedElements.delete(dropdown);
        }
      });
    }, 300);

    // ✅ Trigger on viewport size or zoom changes
    // Handle recalculations on window resize or zoom
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // console.log("Window resized, re-checking dropdowns...");
        document.querySelectorAll(".composite.viewlet").forEach((container) => {
          container
            .querySelectorAll(".split-view-view.visible")
            .forEach((dropdown) => {
              // Force recomputation by temporarily clearing flag
              delete dropdown.dataset.wasAbove;
              adjustDropdown(dropdown, true);
            });
        });
      }, 100); // give layout time to stabilize
    });
  }

  // Poll until sidebar is available, then init
  const poll = setInterval(initialize, 100);
  window.addEventListener("load", initialize);
});
