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
            // Check if online before attempting reload
            if (navigator.onLine) {
                // Online - reload (service worker will handle it)
                location.reload();
            } else {
                // Offline - just reset the indicator and show message
                refreshIndicator.querySelector('span').textContent = 'No internet connection';
                setTimeout(() => {
                    refreshIndicator.style.display = 'none';
                    refreshIndicator.classList.remove('ready', 'refreshing');
                }, 1500);
            }
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
