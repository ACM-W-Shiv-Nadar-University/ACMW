//SIDENAV

function toggleMenu() {
  const sideNav = document.getElementById("side-nav");
  const overlay = document.getElementById("overlay");

  if (!sideNav) return;

  if (sideNav.style.width === "250px") {
    closeMenu();
  } else {
    sideNav.style.width = "250px";
    if (overlay) overlay.classList.add("active");
  }
}

function closeMenu() {
  const sideNav = document.getElementById("side-nav");
  const overlay = document.getElementById("overlay");
  if (sideNav) sideNav.style.width = "0";
  if (overlay) overlay.classList.remove("active");
}