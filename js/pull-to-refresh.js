// ========== Pull to Refresh ==========
let startY = 0;
let currentY = 0;
let isPulling = false;
let refreshThreshold = 80;

const container = document.getElementById('container');
const mainContent = document.getElementById('main-content');

// Create refresh indicator
const refreshIndicator = document.createElement('div');
refreshIndicator.id = 'refresh-indicator';
refreshIndicator.innerHTML = '<div class="refresh-spinner"></div><span>Pull to refresh</span>';
refreshIndicator.style.display = 'none';
container.insertBefore(refreshIndicator, container.firstChild);

// Touch start
container.addEventListener('touchstart', (e) => {
    // Only trigger if scrolled to top
    if (window.scrollY === 0 || document.documentElement.scrollTop === 0) {
        startY = e.touches[0].pageY;
        isPulling = true;
    }
}, { passive: true });

// Touch move
container.addEventListener('touchmove', (e) => {
    if (!isPulling) return;

    currentY = e.touches[0].pageY;
    const pullDistance = currentY - startY;

    // Only show indicator if pulling down from top
    if (pullDistance > 0 && (window.scrollY === 0 || document.documentElement.scrollTop === 0)) {
        e.preventDefault();

        // Show and update indicator
        refreshIndicator.style.display = 'flex';
        refreshIndicator.style.height = `${Math.min(pullDistance, refreshThreshold)}px`;
        refreshIndicator.style.opacity = `${Math.min(pullDistance / refreshThreshold, 1)}`;

        // Change text when threshold reached
        if (pullDistance >= refreshThreshold) {
            refreshIndicator.querySelector('span').textContent = 'Release to refresh';
            refreshIndicator.classList.add('ready');
        } else {
            refreshIndicator.querySelector('span').textContent = 'Pull to refresh';
            refreshIndicator.classList.remove('ready');
        }
    }
}, { passive: false });

// Touch end
container.addEventListener('touchend', (e) => {
    if (!isPulling) return;

    const pullDistance = currentY - startY;

    if (pullDistance >= refreshThreshold) {
        // Trigger refresh
        refreshIndicator.querySelector('span').textContent = 'Refreshing...';
        refreshIndicator.classList.add('refreshing');

        setTimeout(() => {
            // Get current route hash
            const currentPage = window.location.hash.slice(1) || 'home';

            if (currentPage === 'home') {
                // Trigger home page reload event
                const event = new CustomEvent('homePageLoaded');
                document.dispatchEvent(event);
            } else if (currentPage === 'search') {
                // Trigger search page reload event
                const event = new CustomEvent('searchPageLoaded');
                document.dispatchEvent(event);
            }

            // Reset indicator after a delay
            setTimeout(() => {
                refreshIndicator.style.display = 'none';
                refreshIndicator.classList.remove('ready', 'refreshing');
            }, 1000);
        }, 300);
    } else {
        // Reset indicator
        refreshIndicator.style.display = 'none';
        refreshIndicator.classList.remove('ready');
    }

    isPulling = false;
    startY = 0;
    currentY = 0;
}, { passive: true });
