/**
 * VideoTeleprompterApp - Main application class that coordinates all components
 */
class VideoTeleprompterApp {
    constructor() {
        this.videoComponent = null;
        this.scriptComponent = null;
        this.controlsComponent = null;
        
        this.init();
    }

    async init() {
        console.log('Initializing Video Teleprompter App...');
        
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
        } else {
            this.initializeComponents();
        }
    }

    async initializeComponents() {
        try {
            console.log('Initializing components...');
            
            // Initialize components in the right order
            // 1. Video component (handles camera and recording)
            this.videoComponent = new VideoComponent();
            
            // 2. Script component (handles text display and interaction)
            this.scriptComponent = new ScriptComponent();
            
            // 3. Controls component (coordinates the other two)
            this.controlsComponent = new ControlsComponent(this.videoComponent, this.scriptComponent);
            
            console.log('All components initialized successfully');
            
            // Setup global event handlers
            this.setupGlobalEventHandlers();
            
            // Setup PWA features
            this.setupPWA();
            
        } catch (error) {
            console.error('Error initializing components:', error);
            this.showError('Failed to initialize the application. Please refresh the page.');
        }
    }

    setupGlobalEventHandlers() {
        // Handle visibility changes (when user switches tabs)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // User switched away from tab
                console.log('App hidden - pausing if recording');
                const state = this.controlsComponent.getControlState();
                if (state.isRecording) {
                    // Optionally pause recording when tab is hidden
                    console.log('Recording continues in background');
                }
            } else {
                // User returned to tab
                console.log('App visible again');
            }
        });

        // Handle page unload
        window.addEventListener('beforeunload', (e) => {
            const state = this.controlsComponent.getControlState();
            if (state.isRecording) {
                e.preventDefault();
                e.returnValue = 'Recording is in progress. Are you sure you want to leave?';
                return e.returnValue;
            }
        });

        // Handle errors
        window.addEventListener('error', (e) => {
            console.error('Global error caught:', e.error);
            this.showError('An unexpected error occurred. Please refresh the page if the app becomes unresponsive.');
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not typing in the script
            if (e.target === this.scriptComponent.scriptInput) return;
            
            switch (e.key) {
                case ' ': // Spacebar - toggle recording
                    e.preventDefault();
                    this.controlsComponent.triggerAction('toggleRecording');
                    break;
                case 'r': // R key - rotate text
                case 'R':
                    e.preventDefault();
                    this.controlsComponent.triggerAction('toggleRotation');
                    break;
                case 'c': // C key - switch camera
                case 'C':
                    e.preventDefault();
                    this.controlsComponent.triggerAction('switchCamera');
                    break;
                case '1': // Number keys for speed
                    e.preventDefault();
                    this.controlsComponent.triggerAction('setSpeed', 'slow');
                    break;
                case '2':
                    e.preventDefault();
                    this.controlsComponent.triggerAction('setSpeed', 'normal');
                    break;
                case '3':
                    e.preventDefault();
                    this.controlsComponent.triggerAction('setSpeed', 'fast');
                    break;
            }
        });
    }

    setupPWA() {
        // Service Worker registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered successfully:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }

        // Handle PWA install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('PWA install prompt available');
            deferredPrompt = e;
            // You could show a custom install button here
        });

        // Handle PWA install
        window.addEventListener('appinstalled', (e) => {
            console.log('PWA was installed');
            deferredPrompt = null;
        });
    }

    // Public API methods for external control
    async startRecording() {
        await this.controlsComponent.triggerAction('toggleRecording');
    }

    async stopRecording() {
        const state = this.controlsComponent.getControlState();
        if (state.isRecording) {
            await this.controlsComponent.triggerAction('toggleRecording');
        }
    }

    toggleTextRotation() {
        this.controlsComponent.triggerAction('toggleRotation');
    }

    async switchCamera() {
        await this.controlsComponent.triggerAction('switchCamera');
    }

    setSpeed(speedType) {
        this.controlsComponent.triggerAction('setSpeed', speedType);
    }

    setTextSize(sizeType) {
        this.controlsComponent.triggerAction('setTextSize', sizeType);
    }

    getAppState() {
        return this.controlsComponent.getControlState();
    }

    // Utility methods
    showError(message) {
        // Create a simple error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 68, 68, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            max-width: 80vw;
            text-align: center;
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    // Cleanup method
    destroy() {
        console.log('Destroying Video Teleprompter App...');
        
        if (this.videoComponent) {
            this.videoComponent.destroy();
        }
        
        // Components don't need explicit destruction as they don't have resources to clean up
        // But we can null the references
        this.videoComponent = null;
        this.scriptComponent = null;
        this.controlsComponent = null;
    }
}

// Global app instance
let teleprompterApp;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    teleprompterApp = new VideoTeleprompterApp();
});

// Make app available globally for debugging/external control
window.teleprompterApp = teleprompterApp;
