// Badge Manager for App Icon Badges
// This module handles updating the app icon badge count like mobile apps

class BadgeManager {
    constructor() {
        this.currentCount = 0;
        this.isSupported = 'setAppBadge' in navigator;
        this.init();
    }

    async init() {
        // Check if service worker is ready
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                console.log('Badge manager initialized');
            } catch (error) {
                console.log('Service worker not ready:', error);
            }
        }
    }

    // Increment badge count (for new updates)
    async incrementBadge() {
        if (!this.isSupported) {
            console.log('Badge API not supported');
            return;
        }

        this.currentCount++;
        await this.updateBadge(this.currentCount);
        
        // Also notify service worker
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            registration.active.postMessage({
                type: 'INCREMENT_BADGE'
            });
        }
    }

    // Set specific badge count
    async setBadge(count) {
        if (!this.isSupported) {
            console.log('Badge API not supported');
            return;
        }

        this.currentCount = count;
        await this.updateBadge(count);
        
        // Also notify service worker
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            registration.active.postMessage({
                type: 'UPDATE_BADGE',
                count: count
            });
        }
    }

    // Clear badge
    async clearBadge() {
        if (!this.isSupported) {
            console.log('Badge API not supported');
            return;
        }

        this.currentCount = 0;
        await this.updateBadge(0);
        
        // Also notify service worker
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            registration.active.postMessage({
                type: 'CLEAR_BADGE'
            });
        }
    }

    // Internal method to update badge
    async updateBadge(count) {
        try {
            if (count > 0) {
                await navigator.setAppBadge(count);
                console.log(`Badge updated to: ${count}`);
            } else {
                await navigator.clearAppBadge();
                console.log('Badge cleared');
            }
        } catch (error) {
            console.log('Failed to update badge:', error);
        }
    }

    // Get current badge count
    getCurrentCount() {
        return this.currentCount;
    }

    // Check if badge API is supported
    isBadgeSupported() {
        return this.isSupported;
    }
}

// Create global instance
window.badgeManager = new BadgeManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BadgeManager;
} 