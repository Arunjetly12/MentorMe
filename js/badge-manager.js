// Badge Manager for App Icon Badges
// This module handles updating the app icon badge count like mobile apps

class BadgeManager {
    constructor() {
        this.currentCount = 0;
        this.isSupported = this.checkBadgeSupport();
        this.init();
    }

    async init() {
        // Check if service worker is ready
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                console.log('Badge manager initialized');
                
                // Request notification permission for better badge support
                if ('Notification' in window && Notification.permission === 'default') {
                    await Notification.requestPermission();
                }
            } catch (error) {
                console.log('Service worker not ready:', error);
            }
        }
    }

    // Check badge support more thoroughly
    checkBadgeSupport() {
        // Check for Badge API
        const hasBadgeAPI = 'setAppBadge' in navigator;
        
        // Check for experimental badge API
        const hasExperimentalBadge = 'setExperimentalAppBadge' in navigator;
        
        // Check for notification badge support
        const hasNotificationBadge = 'Notification' in window;
        
        console.log('Badge Support Check:', {
            badgeAPI: hasBadgeAPI,
            experimentalBadge: hasExperimentalBadge,
            notificationBadge: hasNotificationBadge
        });
        
        return hasBadgeAPI || hasExperimentalBadge || hasNotificationBadge;
    }

    // Increment badge count (for new updates)
    async incrementBadge() {
        if (!this.isSupported) {
            console.log('Badge API not supported, using notification fallback');
            this.showNotificationBadge();
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
            console.log('Badge API not supported, using notification fallback');
            this.currentCount = count;
            this.showNotificationBadge();
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
            console.log('Badge API not supported, clearing notification badge');
            this.currentCount = 0;
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
                // Try standard Badge API first
                if ('setAppBadge' in navigator) {
                    await navigator.setAppBadge(count);
                    console.log(`Badge updated to: ${count}`);
                }
                // Try experimental Badge API
                else if ('setExperimentalAppBadge' in navigator) {
                    await navigator.setExperimentalAppBadge(count);
                    console.log(`Experimental badge updated to: ${count}`);
                }
                // Fallback to notification
                else {
                    this.showNotificationBadge();
                }
            } else {
                if ('clearAppBadge' in navigator) {
                    await navigator.clearAppBadge();
                    console.log('Badge cleared');
                }
                else if ('clearExperimentalAppBadge' in navigator) {
                    await navigator.clearExperimentalAppBadge();
                    console.log('Experimental badge cleared');
                }
            }
        } catch (error) {
            console.log('Failed to update badge, using notification fallback:', error);
            this.showNotificationBadge();
        }
    }

    // Fallback method using notifications
    showNotificationBadge() {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(`MentorMe - ${this.currentCount} updates`, {
                body: `You have ${this.currentCount} new updates!`,
                icon: '/assets/icons/icon-192.png',
                badge: '/assets/icons/icon-192.png',
                tag: 'mentorme-badge',
                requireInteraction: false,
                silent: true
            });
            
            // Auto-close notification after 3 seconds
            setTimeout(() => {
                notification.close();
            }, 3000);
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

    // Get detailed support info
    getSupportInfo() {
        return {
            badgeAPI: 'setAppBadge' in navigator,
            experimentalBadge: 'setExperimentalAppBadge' in navigator,
            notificationBadge: 'Notification' in window,
            notificationPermission: 'Notification' in window ? Notification.permission : 'not-supported',
            serviceWorker: 'serviceWorker' in navigator
        };
    }
}

// Create global instance
window.badgeManager = new BadgeManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BadgeManager;
} 