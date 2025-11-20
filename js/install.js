// ========== Add to Home Screen / Install PWA ==========
let deferredPrompt;
const installBtn = document.getElementById('install-btn');
const installMenuItem = document.getElementById('install-menu-item');

// Listen for beforeinstallprompt event (for Android/Chrome)
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install menu item
    if (installMenuItem) {
        installMenuItem.style.display = 'block';
    }
});

// Handle install button click
if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            // Clear the deferredPrompt so it can only be used once
            deferredPrompt = null;
            // Hide the install menu item
            if (installMenuItem) {
                installMenuItem.style.display = 'none';
            }
        } else {
            // For iOS devices, show instructions
            if (isIOS()) {
                alert('To add this app to your home screen:\n\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" in the top right corner');
            }
        }
    });
}

// Detect if device is iOS
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// For iOS, always show the menu item since we can't detect beforeinstallprompt
if (isIOS() && installMenuItem) {
    installMenuItem.style.display = 'block';
}

// Hide the menu item after app is installed
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    if (installMenuItem) {
        installMenuItem.style.display = 'none';
    }
});
