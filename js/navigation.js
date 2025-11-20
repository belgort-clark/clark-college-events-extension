// ========== Hamburger Menu Toggle ==========
document.addEventListener("DOMContentLoaded", () => {
    console.log("Navigation.js loaded");
    const hamburger = document.querySelector(".hamburger");
    const navMenu = document.querySelector("nav ul");

    console.log("Hamburger element:", hamburger);
    console.log("Nav menu element:", navMenu);

    if (hamburger && navMenu) {
        console.log("Both elements found, adding event listener");
        hamburger.addEventListener("click", (e) => {
            console.log("Hamburger clicked!");
            e.stopPropagation();
            hamburger.classList.toggle("active");
            navMenu.classList.toggle("active");

            // Update aria-expanded
            const isExpanded = hamburger.classList.contains("active");
            hamburger.setAttribute("aria-expanded", isExpanded);
            console.log("Menu active state:", navMenu.classList.contains("active"));
        });

        // Close menu when clicking a link
        const navLinks = navMenu.querySelectorAll("a");
        navLinks.forEach(link => {
            link.addEventListener("click", () => {
                hamburger.classList.remove("active");
                navMenu.classList.remove("active");
                hamburger.setAttribute("aria-expanded", "false");
            });
        });

        // Close menu when clicking outside
        document.addEventListener("click", (e) => {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                hamburger.classList.remove("active");
                navMenu.classList.remove("active");
                hamburger.setAttribute("aria-expanded", "false");
            }
        });
    }
});
