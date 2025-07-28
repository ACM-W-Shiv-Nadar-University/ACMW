//SIDENAV

function toggleMenu() {
    const sideNav = document.getElementById("side-nav");
    const overlay = document.getElementById("overlay");

    if (sideNav.style.width === "250px") {
      closeMenu();
    } else {
      sideNav.style.width = "250px";
      overlay.classList.add("active");
    }
  }

  function closeMenu() {
    document.getElementById("side-nav").style.width = "0";
    document.getElementById("overlay").classList.remove("active");
  }