/* Shared site nav: auto-hide, hover reveal, and touch handle.
   Used by every page that has <nav id="siteNav">. */
(function () {
  const siteNav = document.getElementById("siteNav");
  if (!siteNav) return;

  const navHandle = document.getElementById("navHandle");
  // Optional second, page-level nav (clock.html). It slides down while the
  // site nav is visible so the two never overlap.
  const pageNav = document.getElementById("pageNav");

  const NAV_HEIGHT = 60;
  const HIDDEN_TOP = "-70px";
  let hideTimer = null;
  let navPinned = false;

  // Highlight the link for the current page
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  siteNav.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href").replace(/\/+$/, "");
    if (
      path === href ||
      (href === "" && path === "/index.html") ||
      path.endsWith(href)
    ) {
      a.classList.add("active");
    }
  });

  function showNav() {
    siteNav.style.top = "0";
    siteNav.style.opacity = "1";
    if (pageNav) pageNav.style.top = NAV_HEIGHT + "px";
    clearTimeout(hideTimer);
  }

  function collapseNav() {
    siteNav.style.top = HIDDEN_TOP;
    siteNav.style.opacity = "0";
    if (pageNav) pageNav.style.top = "0";
  }

  function hideNav() {
    if (navPinned) return;
    hideTimer = setTimeout(collapseNav, 300);
  }

  // Show when the mouse is near the top of the window
  document.addEventListener("mousemove", (e) => {
    if (e.clientY < 20) showNav();
  });

  // Keep it visible while hovering it, hide after leaving
  siteNav.addEventListener("mouseenter", () => clearTimeout(hideTimer));
  siteNav.addEventListener("mouseleave", hideNav);

  // Touch devices: tap the handle to pin the nav open or closed
  if (navHandle) {
    navHandle.addEventListener("click", (e) => {
      e.stopPropagation();
      navPinned = !navPinned;
      if (navPinned) {
        showNav();
      } else {
        clearTimeout(hideTimer);
        collapseNav();
      }
    });
    navHandle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navHandle.click();
      }
    });
  }

  // Tapping elsewhere closes a pinned-open nav
  document.addEventListener("click", (e) => {
    if (!navPinned) return;
    if (siteNav.contains(e.target) || e.target === navHandle) return;
    navPinned = false;
    collapseNav();
  });

  // Hide initially
  hideNav();
})();
