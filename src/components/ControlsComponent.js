/**
 * ControlsComponent - Handles all the control buttons and user interface
 */
class ControlsComponent {
    constructor(videoComponent, scriptComponent) {
        this.videoComponent = videoComponent;
        this.scriptComponent = scriptComponent;
        
        // Control elements
        this.recordButton = document.getElementById('recordButton');
        this.rotateButton = document.getElementById('rotateButton');
        this.cameraButton = document.getElementById('cameraButton');
        
        // Speed control buttons
        this.speedSlow = document.getElementById('speedSlow');
        this.speedNormal = document.getElementById('speedNormal');
        this.speedFast = document.getElementById('speedFast');
        
        // Size control buttons
        this.sizeSmall = document.getElementById('sizeSmall');
        this.sizeMedium = document.getElementById('sizeMedium');
        this.sizeLarge = document.getElementById('sizeLarge');
        
        // Speed and size mappings
        this.speedMap = {
            slow: 60,
            normal: 120,
            fast: 200
        };
        
        this.sizeMap = {
            small: 18,
            medium: 24,
            large: 32
        };
        
        this.init();
    }

    init() {
        console.log('Initializing ControlsComponent...');
        this.setupEventListeners();
        this.updateButtonStates();
    }

    setupEventListeners() {
        // Record button
        this.recordButton.addEventListener('click', () => {
            this.toggleRecording();
        });

        // Rotate button
        this.rotateButton.addEventListener('click', () => {
            this.toggleTextRotation();
        });

        // Camera switch button
        this.cameraButton.addEventListener('click', () => {
            this.switchCamera();
        });

        // Speed control buttons
        this.speedSlow.addEventListener('click', () => this.setSpeed('slow'));
        this.speedNormal.addEventListener('click', () => this.setSpeed('normal'));
        this.speedFast.addEventListener('click', () => this.setSpeed('fast'));

        // Size control buttons
        this.sizeSmall.addEventListener('click', () => this.setTextSize('small'));
        this.sizeMedium.addEventListener('click', () => this.setTextSize('medium'));
        this.sizeLarge.addEventListener('click', () => this.setTextSize('large'));
    }

    async toggleRecording() {
        const videoState = this.videoComponent.getRecordingState();
        
        if (!videoState.hasStream) {
            alert('Please allow camera access first.');
            return;
        }

        if (videoState.isRecording) {
            // Stop recording
            const success = this.videoComponent.stopRecording();
            if (success) {
                this.scriptComponent.stopScrolling();
                this.updateRecordButton(false);
                console.log('Recording stopped by user');
            }
        } else {
            // Start recording
            const success = await this.videoComponent.startRecording();
            if (success) {
                this.scriptComponent.startScrolling();
                this.updateRecordButton(true);
                console.log('Recording started by user');
            }
        }
    }

    toggleTextRotation() {
        this.scriptComponent.toggleRotation();
        this.updateRotateButton();
    }

    async switchCamera() {
        console.log('Camera switch requested');
        this.updateCameraButton(true); // Show loading state
        
        const success = await this.videoComponent.switchCamera();
        if (success) {
            console.log('Camera switched successfully');
        } else {
            console.error('Failed to switch camera');
        }
        
        this.updateCameraButton(false); // Remove loading state
    }

    setSpeed(speedType) {
        const speed = this.speedMap[speedType];
        this.scriptComponent.setSpeed(speed);
        this.updateSpeedButtons(speedType);
        console.log(`Speed set to ${speedType}: ${speed} px/s`);
    }

    setTextSize(sizeType) {
        const size = this.sizeMap[sizeType];
        this.scriptComponent.setTextSize(size);
        this.updateSizeButtons(sizeType);
        console.log(`Text size set to ${sizeType}: ${size}px`);
    }

    // UI Update Methods
    updateButtonStates() {
        const videoState = this.videoComponent.getRecordingState();
        const scriptState = this.scriptComponent.getScrollState();
        
        this.updateRecordButton(videoState.isRecording);
        this.updateRotateButton();
        this.updateCameraButton(false);
        
        // Update speed buttons based on current speed
        const currentSpeedType = this.getSpeedTypeFromValue(scriptState.currentSpeed);
        this.updateSpeedButtons(currentSpeedType);
        
        // Update size buttons based on current size
        const currentSizeType = this.getSizeTypeFromValue(scriptState.currentTextSize);
        this.updateSizeButtons(currentSizeType);
    }

    updateRecordButton(isRecording) {
        const recordIcon = this.recordButton.querySelector('.record-icon');
        
        if (isRecording) {
            this.recordButton.classList.add('recording');
            recordIcon.style.backgroundColor = '#ff4444';
            recordIcon.style.borderRadius = '4px';
            this.recordButton.setAttribute('title', 'Stop Recording');
        } else {
            this.recordButton.classList.remove('recording');
            recordIcon.style.backgroundColor = '#ff4444';
            recordIcon.style.borderRadius = '50%';
            this.recordButton.setAttribute('title', 'Start Recording');
        }
    }

    updateRotateButton() {
        const scriptState = this.scriptComponent.getScrollState();
        
        if (scriptState.isTextRotated) {
            this.rotateButton.classList.add('active');
            this.rotateButton.setAttribute('title', 'Disable Text Rotation');
        } else {
            this.rotateButton.classList.remove('active');
            this.rotateButton.setAttribute('title', 'Rotate Text 90°');
        }
    }

    updateCameraButton(isLoading) {
        const cameraIcon = this.cameraButton.querySelector('.camera-icon');
        
        if (isLoading) {
            this.cameraButton.classList.add('loading');
            cameraIcon.textContent = '⟳';
            this.cameraButton.setAttribute('title', 'Switching Camera...');
        } else {
            this.cameraButton.classList.remove('loading');
            cameraIcon.textContent = '📷';
            this.cameraButton.setAttribute('title', 'Switch Camera');
        }
    }

    updateSpeedButtons(activeType) {
        // Remove active class from all speed buttons
        [this.speedSlow, this.speedNormal, this.speedFast].forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to selected button
        switch (activeType) {
            case 'slow':
                this.speedSlow.classList.add('active');
                break;
            case 'normal':
                this.speedNormal.classList.add('active');
                break;
            case 'fast':
                this.speedFast.classList.add('active');
                break;
        }
    }

    updateSizeButtons(activeType) {
        // Remove active class from all size buttons
        [this.sizeSmall, this.sizeMedium, this.sizeLarge].forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to selected button
        switch (activeType) {
            case 'small':
                this.sizeSmall.classList.add('active');
                break;
            case 'medium':
                this.sizeMedium.classList.add('active');
                break;
            case 'large':
                this.sizeLarge.classList.add('active');
                break;
        }
    }

    // Helper methods to determine current state
    getSpeedTypeFromValue(speed) {
        if (speed <= 60) return 'slow';
        if (speed <= 120) return 'normal';
        return 'fast';
    }

    getSizeTypeFromValue(size) {
        if (size <= 18) return 'small';
        if (size <= 24) return 'medium';
        return 'large';
    }

    // Public methods for external control
    getControlState() {
        const videoState = this.videoComponent.getRecordingState();
        const scriptState = this.scriptComponent.getScrollState();
        
        return {
            isRecording: videoState.isRecording,
            currentCamera: videoState.currentCamera,
            hasStream: videoState.hasStream,
            isScrolling: scriptState.isScrolling,
            currentSpeed: scriptState.currentSpeed,
            currentTextSize: scriptState.currentTextSize,
            isTextRotated: scriptState.isTextRotated
        };
    }

    // Method to programmatically trigger actions (useful for external APIs)
    async triggerAction(action, value = null) {
        switch (action) {
            case 'toggleRecording':
                await this.toggleRecording();
                break;
            case 'toggleRotation':
                this.toggleTextRotation();
                break;
            case 'switchCamera':
                await this.switchCamera();
                break;
            case 'setSpeed':
                if (value && this.speedMap[value]) {
                    this.setSpeed(value);
                }
                break;
            case 'setTextSize':
                if (value && this.sizeMap[value]) {
                    this.setTextSize(value);
                }
                break;
            default:
                console.warn('Unknown action:', action);
        }
    }
}
