// Register the service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration.scope);

                // Check for updates periodically
                setInterval(() => {
                    registration.update();
                }, 60000); // Check every minute

                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker available, show update notification
                            showUpdateNotification();
                        }
                    });
                });
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });

        // Handle controller change (new service worker activated)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    });
}

// Show update notification
function showUpdateNotification() {
    const updateBanner = document.createElement('div');
    updateBanner.id = 'update-banner';
    updateBanner.innerHTML = `
    <div class="update-message">
      <span>🎉 New version available!</span>
      <button id="update-btn">Update Now</button>
      <button id="dismiss-update">Later</button>
    </div>
  `;
    document.body.insertBefore(updateBanner, document.body.firstChild);

    // Update button handler
    document.getElementById('update-btn').addEventListener('click', () => {
        navigator.serviceWorker.getRegistration().then((registration) => {
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        });
    });

    // Dismiss button handler
    document.getElementById('dismiss-update').addEventListener('click', () => {
        updateBanner.remove();
    });
}
