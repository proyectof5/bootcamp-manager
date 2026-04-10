/**
 * Sidebar Desktop Toggle Module
 * Handles collapsible sidebar for desktop screens
 */

class SidebarDesktopToggle {
    constructor() {
        this.sidebar = document.getElementById('sidebar-desktop');
        this.toggleBtn = document.getElementById('sidebar-desktop-toggle');
        this.mainContent = document.querySelector('main');
        this.storageKey = 'sidebarDesktopState';
        
        this.init();
    }

    init() {
        if (!this.sidebar || !this.toggleBtn) {
            console.warn('Sidebar or toggle button not found');
            return;
        }

        // Add click listener to toggle button
        this.toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggle();
        });

        // Restore previous state from localStorage
        this.restoreState();
    }

    toggle() {
        document.body.classList.toggle('sidebar-collapsed');
        this.saveState();
    }

    saveState() {
        const isCollapsed = document.body.classList.contains('sidebar-collapsed');
        localStorage.setItem(this.storageKey, JSON.stringify({ collapsed: isCollapsed }));
    }

    restoreState() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            const state = JSON.parse(saved);
            if (state.collapsed) {
                document.body.classList.add('sidebar-collapsed');
            }
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.sidebarToggle = new SidebarDesktopToggle();
    });
} else {
    window.sidebarToggle = new SidebarDesktopToggle();
}
