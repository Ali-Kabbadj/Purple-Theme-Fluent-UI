(function () {
  // Grab body node
  const bodyNode = document.querySelector("body");
  let isLayoutCompact = false;
  let isUILite = false;
  let withResizeListener = false;
  let darkBg = "#202020";
  let lightBg = "#ffffff";
  let accentColor = "#005fb8";
  let accentHover = "#005fb8e6";
  let accentPressed = "#005fb8cc";
  const splitViewSelector =
    ".grid-view-container > .monaco-grid-view > .monaco-grid-branch-node > .monaco-split-view2 > .monaco-scrollable-element > .split-view-container";

  let debounceTimer;
  const debounce = (callback, time) => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(callback, time);
  };

  const resizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
      if (entry.contentBoxSize) {
        debounce(applyCompactStyles, 300);
      }
    }
  });

  const watchLayout = (mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        debounce(applyCompactStyles, 300);
      }
    }
  };

  const watchAttributes = (mutationsList, observer) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "attributes") {
        console.log("Attribute changed on chromium");
        const chromium = document.querySelector("div.chromium");

        const { classList } = chromium;
        if (classList.contains("vs")) {
          applyLightStyles();
        }

        if (classList.contains("vs-dark")) {
          applyDarkStyles();
        }
      }
    }
  };

  const watchSplitViewChildren = (mutationsList, observer) => {
    for (let mutation of mutationsList) {
      if (mutation.type === "childList") {
        debounce(adjustScrollableWidth, 180);
      }
    }
  };
  const editorChildrenObserver = new MutationObserver(watchSplitViewChildren);

  // Callback function to execute when mutations are observed
  const watchForBootstrap = (mutationsList, observer) => {
    for (let mutation of mutationsList) {
      if (mutation.type === "attributes") {
        debugger;
        // does the style div exist yet?
        const tokensLoaded = document.querySelector(".vscode-tokens-styles");

        // does it have content ?
        // const tokenStyles = document.querySelector('.vscode-tokens-styles').innerText;

        // sometimes VS code takes a while to init the styles content, so stop this observer and add an observer for that
        if (tokensLoaded) {
          observer.disconnect();
          observer.observe(tokensLoaded, { childList: true });
        }
      }

      if (mutation.type === "childList") {
        const tokensLoaded = document.querySelector(".vscode-tokens-styles");
        // const tokenStyles = document.querySelector('.vscode-tokens-styles').innerText;

        // Everything we need is ready, so initialise
        if (tokensLoaded) {
          initFluentUI([IS_COMPACT], [LIGHT_BG], [DARK_BG], [ACCENT], observer);
        }
      }
    }
  };

  // Add custom styles
  const initFluentUI = (isCompact, lightBgColor, darkBgColor, accent, obs) => {
    isLayoutCompact = isCompact;
    accentColor = accent;
    accentHover = accent + "e6";
    accentPressed = accent + "cc";
    darkBg = darkBgColor;
    lightBg = lightBgColor;

    var themeStyleTag = document.querySelector(".vscode-tokens-styles");

    if (!themeStyleTag) {
      return;
    }

    // Add style classes
    const settingsEditor = document.querySelector(".settings-editor");
    const sidebar = document.querySelector(".sidebar");
    sidebar.classList.add("card");

    const splitViewContainer = sidebar.parentElement.closest(
      ".split-view-container",
    );
    const editorSplitViewContainer = document.querySelector(splitViewSelector);
    editorChildrenObserver.observe(editorSplitViewContainer, {
      childList: true,
    });

    if (editorSplitViewContainer) {
      adjustScrollableWidth();
    }

    if (isLayoutCompact) {
      const sidebarContainer = sidebar.parentElement;
      const editorContainer = document.querySelector(".editor-container");

      console.log("Attaching resize observers");
      // Mutation observer to check layout changes and apply corresponding classes
      const layoutObserver = new MutationObserver(watchLayout);
      layoutObserver.observe(splitViewContainer, { childList: true });

      // init resize observer on sidebarContainer to refresh layout when it changes
      resizeObserver.observe(sidebarContainer);
      resizeObserver.observe(editorContainer);

      applyCompactStyles();
    }

    const chromium = document.querySelector("div.chromium");
    const chromeThemeObserver = new MutationObserver(watchAttributes);
    chromeThemeObserver.observe(chromium, { attributes: true });

    overrideDocumentStyle({
      property: "background",
      value: "var(--wallpaper)",
    });

    console.log("Fluent UI: initialised!");

    // disconnect the observer because we don't need it anymore
    if (obs) {
      obs.disconnect();
    }
  };

  const overrideDocumentStyle = ({ property, value }) => {
    document.documentElement.style.setProperty(property, value);
  };

  const applyDarkStyles = () => {
    try {
      console.log("Applying dark styles");
      // Yeap, I have to override each one individually until VSCode allows me to dynamically
      overrideDocumentStyle({ property: "--accent", value: accentColor });
      overrideDocumentStyle({ property: "--accent-hover", value: accentHover });
      overrideDocumentStyle({
        property: "--accent-pressed-bg",
        value: accentPressed,
      });
      overrideDocumentStyle({
        property: "--card-bg",
        value: darkBg,
      });
      overrideDocumentStyle({
        property: "--context-menu-bg",
        value: darkBg,
      });
      overrideDocumentStyle({
        property: "--flyout-bg",
        value: darkBg,
      });
      overrideDocumentStyle({
        property: "--editor-bg",
        value: darkBg,
      });
      overrideDocumentStyle({
        property: "--active-action-item-bg",
        value: "var(--card-bg)",
      });
      // overrideDocumentStyle({ property: '--activitybar-indicator-bg', value: '#60cdff' });
      // overrideDocumentStyle({ property: '--app-bg', value:
      // 'var(--card-bg)' });
      overrideDocumentStyle({
        property: "--app-bg",
        value: "rgba(44, 44, 44, 0.85)",
      });
      overrideDocumentStyle({
        property: "--body-bg",
        value: "rgba(44, 44, 44, 1)",
      });
      overrideDocumentStyle({
        property: "--body-bg-t",
        value: "rgba(44, 44, 44, 0)",
      });
      overrideDocumentStyle({
        property: "--background-color",
        value: "rgba(0, 0, 0, 0.0578)",
      });

      overrideDocumentStyle({
        property: "--card-bg-blend-mode",
        value: "color, luminosity",
      });

      overrideDocumentStyle({
        property: "--editor-widget-bg",
        value: "var(--card-bg)",
      });
      overrideDocumentStyle({ property: "--foreground", value: "#ffffff" });
      overrideDocumentStyle({
        property: "--hover-bg",
        value: "var(--card-bg)",
      });
      overrideDocumentStyle({
        property: "--list-item-bg",
        value: "rgba(255, 255, 255, 0.0605)",
      });
      overrideDocumentStyle({ property: "--list-item-fg", value: "#ffffff99" });
      overrideDocumentStyle({
        property: "--notification-toast-bg",
        value: "var(--flyout-bg)",
      });
      overrideDocumentStyle({
        property: "--quick-input-widget-bg",
        value: "var(--flyout-bg)",
      });

      overrideDocumentStyle({
        property: "background",
        value: "var(--wallpaper)",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const applyLightStyles = () => {
    try {
      console.log("Applying light styles");
      console.log("Current accent", accentColor);
      // Yeap, I have to override each one individually until VSCode allows me to dynamically add <style> tags to the document
      overrideDocumentStyle({ property: "--accent", value: accentColor });
      overrideDocumentStyle({ property: "--accent-hover", value: accentHover });
      overrideDocumentStyle({
        property: "--accent-pressed-bg",
        value: accentPressed,
      });
      overrideDocumentStyle({
        property: "--card-bg",
        value: lightBg,
      });
      overrideDocumentStyle({
        property: "--flyout-bg",
        value: lightBg,
      });
      overrideDocumentStyle({
        property: "--background-color",
        value: lightBg,
      });
      overrideDocumentStyle({
        property: "--active-action-item-bg",
        value: "rgba(0, 0, 0, 0.0605)",
      });

      overrideDocumentStyle({ property: "--app-bg", value: "var(--card-bg)" });

      overrideDocumentStyle({
        property: "--card-bg-blend-mode",
        value: "multiply",
      });
      overrideDocumentStyle({
        property: "--context-menu-bg",
        value: "var(--menu-bg)",
      });
      overrideDocumentStyle({
        property: "--editor-bg",
        value: "var(--card-bg)",
      });
      overrideDocumentStyle({
        property: "--editor-widget-bg",
        value: "var(--flyout-bg)",
      });
      overrideDocumentStyle({ property: "--foreground", value: "#000000" });
      overrideDocumentStyle({
        property: "--hover-bg",
        value: " var(--flyout-bg)",
      });
      overrideDocumentStyle({
        property: "--list-item-bg",
        value: "rgba(0, 0, 0, 0.0373)",
      });
      overrideDocumentStyle({ property: "--list-item-fg", value: "#0000009b" });
      overrideDocumentStyle({
        property: "--notification-toast-bg",
        value: "var(--flyout-bg)",
      });
      overrideDocumentStyle({
        property: "--quick-input-widget-bg",
        value: "var(--flyout-bg)",
      });

      overrideDocumentStyle({
        property: "background",
        value: "var(--wallpaper)",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const adjustScrollableWidth = () => {
    const overflowGuards = document.querySelectorAll(".overflow-guard");

    overflowGuards.forEach((element) => {
      const width = element.offsetWidth;
      element.style.width = `${width - 4}px`;
    });

    setTimeout(() => {
      const minimaps = [...document.querySelectorAll(".minimap")];

      if (minimaps.length > 1) {
        const notLastMinimaps = minimaps.slice(0, -1);
        notLastMinimaps.forEach((minimap) => {
          minimap.style.setProperty("right", "13px", "important");
        });
      }

      const decorationsOverviewRulers = [
        ...document.querySelectorAll(".decorationsOverviewRuler"),
      ];

      if (decorationsOverviewRulers.length > 1) {
        const notLastRulers = decorationsOverviewRulers.slice(0, -1);
        notLastRulers.forEach((ruler) => {
          ruler.style.setProperty("right", "4px", "important");
        });
      }
    }, 1000);
  };

  // document.addEventListener('DOMContentLoaded', () => {
  //     adjustScrollableWidth();
  // });

  const applyCompactStyles = () => {
    const sidebar = document.querySelector(".sidebar");
    sidebar.classList.add("compact");
    const sidebarContainer = sidebar.parentElement;

    const activitybar = document.querySelector(".activitybar");
    activitybar.classList.add("compact");

    const tabs = document.querySelector(".tabs");
    tabs.classList.add("compact");

    const bottomPanel = document.querySelector(".part.panel.bottom");
    bottomPanel.classList.add("compact");

    const breadcrumbs = document.querySelector(".monaco-breadcrumbs");
    breadcrumbs.classList.add("compact");

    const editor = document.querySelector(".editor");
    editor.classList.add("compact");

    const editorContainer = document.querySelector(".editor-container");
    editorContainer.classList.add("compact");

    // Here we override the activitybar width
    document.documentElement.style.setProperty("--activity-bar-width", "36px");

    const activitybarContainer = activitybar.parentElement;
    activitybarContainer.style.setProperty("width", "36px");
    activitybarContainer.style.setProperty("max-width", "36px");

    if (sidebar.classList.contains("left")) {
      sidebarContainer.style.setProperty("left", "42px");
    }

    if (activitybar.classList.contains("right")) {
      sidebarContainer.style.setProperty("right", "36px");
      activitybarContainer.style.removeProperty("left");
      activitybarContainer.style.setProperty("right", "0");
      activitybarContainer.style.setProperty("margin-right", "2px");
    }
  };

  // try to initialise the theme
  initFluentUI([IS_COMPACT], [LIGHT_BG], [DARK_BG], [ACCENT]);

  // Use a mutation observer to check when we can bootstrap the theme
  const observer = new MutationObserver(watchForBootstrap);
  observer.observe(bodyNode, { attributes: true, childList: true });
})();

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
