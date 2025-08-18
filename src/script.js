class VideoTeleprompter {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.isScrolling = false;
        this.scrollAnimation = null;
        this.stream = null;
        this.currentCamera = 'user'; // 'user' for front, 'environment' for back
        this.isTextRotated = false;
        
        // DOM elements
        this.recordButton = document.getElementById('recordButton');
        this.rotateButton = document.getElementById('rotateButton');
        this.cameraButton = document.getElementById('cameraButton');
        this.scriptBox = document.getElementById('scriptBox');
        this.scriptInput = document.getElementById('scriptInput');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.textSizeSlider = document.getElementById('textSizeSlider');
        this.textSizeValue = document.getElementById('textSizeValue');
        
        this.init();
    }
    
    checkCompatibility() {
        console.log('Checking browser compatibility...');
        
        // Check MediaRecorder support
        if (!window.MediaRecorder) {
            console.error('MediaRecorder API not supported');
            alert('Your browser does not support video recording. Please use a modern browser like Chrome, Firefox, or Safari.');
            return;
        }
        
        // Check supported MIME types
        const supportedTypes = [];
        const typesToCheck = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4'
        ];
        
        typesToCheck.forEach(type => {
            if (MediaRecorder.isTypeSupported(type)) {
                supportedTypes.push(type);
            }
        });
        
        console.log('Supported recording formats:', supportedTypes);
        
        if (supportedTypes.length === 0) {
            console.warn('No standard video formats supported');
            alert('Your browser may have limited video recording support. Recording may not work properly.');
        }
        
        // iOS specific warnings
        if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
            console.log('iOS device detected');
            console.log('Note: iOS has limited MediaRecorder support. Recording may use different formats.');
        }
    }
    
    async init() {
        this.checkCompatibility();
        this.setupEventListeners();
        this.setupDragAndResize();
        this.loadSettings();
        this.updateSpeedDisplay();
        this.updateTextSizeDisplay();
        
        // Start camera feed immediately
        try {
            await this.setupCamera();
        } catch (error) {
            console.error('Camera setup failed:', error);
            // Show a dark background if camera fails
            document.querySelector('.app-container').style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)';
        }
    }
    
    setupEventListeners() {
        // Record button
        this.recordButton.addEventListener('click', () => this.toggleRecording());
        
        // Rotate button
        this.rotateButton.addEventListener('click', () => this.toggleTextRotation());
        
        // Camera switch button
        this.cameraButton.addEventListener('click', () => this.switchCamera());
        
        // Speed slider
        this.speedSlider.addEventListener('input', () => this.updateSpeedDisplay());
        this.speedSlider.addEventListener('change', () => this.saveSettings());
        
        // Text size slider
        this.textSizeSlider.addEventListener('input', () => this.updateTextSizeDisplay());
        this.textSizeSlider.addEventListener('change', () => this.saveSettings());
        
        // Script input
        this.scriptInput.addEventListener('input', () => this.saveSettings());
        this.scriptInput.addEventListener('blur', () => this.saveSettings());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && e.ctrlKey) {
                e.preventDefault();
                this.toggleRecording();
            }
        });
        
        // Window resize
        window.addEventListener('resize', () => this.saveSettings());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.saveSettings(), 100);
        });
    }
    
    setupDragAndResize() {
        let isDragging = false;
        let isResizing = false;
        let startX, startY, startLeft, startTop, startWidth, startHeight;
        
        const header = this.scriptBox.querySelector('.script-header');
        const resizeHandle = this.scriptBox.querySelector('.resize-handle');
        
        // Dragging functionality
        const startDrag = (e) => {
            if (e.target === resizeHandle) return;
            
            isDragging = true;
            this.scriptBox.classList.add('dragging');
            
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            
            startX = clientX;
            startY = clientY;
            startLeft = this.scriptBox.offsetLeft;
            startTop = this.scriptBox.offsetTop;
            
            e.preventDefault();
        };
        
        const drag = (e) => {
            if (!isDragging) return;
            
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            
            let newLeft = startLeft + deltaX;
            let newTop = startTop + deltaY;
            
            // Keep within viewport bounds
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - this.scriptBox.offsetWidth));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - this.scriptBox.offsetHeight));
            
            this.scriptBox.style.left = newLeft + 'px';
            this.scriptBox.style.top = newTop + 'px';
            
            // Preserve rotation state when dragging
            if (this.isTextRotated) {
                this.scriptBox.style.transform = 'rotate(90deg)';
            } else {
                this.scriptBox.style.transform = 'none';
            }
            
            e.preventDefault();
        };
        
        const endDrag = () => {
            if (isDragging) {
                isDragging = false;
                this.scriptBox.classList.remove('dragging');
                this.saveSettings();
            }
        };
        
        // Resize functionality
        const startResize = (e) => {
            isResizing = true;
            this.scriptBox.classList.add('resizing');
            
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            
            startX = clientX;
            startY = clientY;
            startWidth = this.scriptBox.offsetWidth;
            startHeight = this.scriptBox.offsetHeight;
            
            e.preventDefault();
            e.stopPropagation();
        };
        
        const resize = (e) => {
            if (!isResizing) return;
            
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
            
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            
            let newWidth = startWidth + deltaX;
            let newHeight = startHeight + deltaY;
            
            // Enforce min/max constraints
            newWidth = Math.max(300, Math.min(newWidth, window.innerWidth * 0.9));
            newHeight = Math.max(200, Math.min(newHeight, window.innerHeight * 0.9));
            
            this.scriptBox.style.width = newWidth + 'px';
            this.scriptBox.style.height = newHeight + 'px';
            
            e.preventDefault();
        };
        
        const endResize = () => {
            if (isResizing) {
                isResizing = false;
                this.scriptBox.classList.remove('resizing');
                this.saveSettings();
            }
        };
        
        // Mouse events
        header.addEventListener('mousedown', startDrag);
        resizeHandle.addEventListener('mousedown', startResize);
        document.addEventListener('mousemove', (e) => {
            drag(e);
            resize(e);
        });
        document.addEventListener('mouseup', () => {
            endDrag();
            endResize();
        });
        
        // Touch events
        header.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) startDrag(e);
        });
        
        resizeHandle.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) startResize(e);
        });
        
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                drag(e);
                resize(e);
            } else if (e.touches.length === 2 && !isDragging) {
                // Two-finger resize for mobile
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const distance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                
                if (!this.lastDistance) {
                    this.lastDistance = distance;
                    return;
                }
                
                const scale = distance / this.lastDistance;
                const currentWidth = this.scriptBox.offsetWidth;
                const currentHeight = this.scriptBox.offsetHeight;
                
                let newWidth = currentWidth * scale;
                let newHeight = currentHeight * scale;
                
                newWidth = Math.max(300, Math.min(newWidth, window.innerWidth * 0.9));
                newHeight = Math.max(200, Math.min(newHeight, window.innerHeight * 0.9));
                
                this.scriptBox.style.width = newWidth + 'px';
                this.scriptBox.style.height = newHeight + 'px';
                
                this.lastDistance = distance;
                e.preventDefault();
            }
        });
        
        document.addEventListener('touchend', (e) => {
            endDrag();
            endResize();
            this.lastDistance = null;
        });
    }
    
    async setupCamera() {
        const constraints = {
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 },
                facingMode: this.currentCamera
            },
            audio: true
        };

        // Stop existing stream if any
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Setup video background
        const videoPreview = document.getElementById('videoPreview');
        videoPreview.srcObject = this.stream;
        
        // Ensure video plays
        videoPreview.onloadedmetadata = () => {
            videoPreview.play().catch(console.error);
        };
    }
    
    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }
    
    async startRecording() {
        try {
            if (!this.stream) {
                await this.setupCamera();
            }
            
            this.recordedChunks = [];
            
            // Check what MIME types are supported (iOS compatibility)
            let mimeType = 'video/webm;codecs=vp9,opus';
            
            // iOS/Safari compatibility - try different formats
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                console.log('WebM not supported, trying MP4...');
                mimeType = 'video/mp4';
                
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    console.log('MP4 not supported, trying WebM with VP8...');
                    mimeType = 'video/webm;codecs=vp8,opus';
                    
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        console.log('VP8 not supported, trying basic WebM...');
                        mimeType = 'video/webm';
                        
                        if (!MediaRecorder.isTypeSupported(mimeType)) {
                            console.log('Using default MIME type');
                            mimeType = '';
                        }
                    }
                }
            }
            
            console.log('Using MIME type:', mimeType || 'default');
            
            const options = mimeType ? { mimeType } : {};
            this.mediaRecorder = new MediaRecorder(this.stream, options);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                    console.log('Data chunk received:', event.data.size, 'bytes');
                }
            };
            
            this.mediaRecorder.onstop = () => {
                console.log('Recording stopped, saving...');
                this.saveRecording();
            };
            
            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
            };
            
            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;
            
            this.recordButton.classList.add('recording');
            console.log('Recording started successfully');
            
            this.startScrolling();
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Recording failed: ' + error.message);
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            this.recordButton.classList.remove('recording');
            
            this.stopScrolling();
        }
    }
    
    saveRecording() {
        console.log('Saving recording with', this.recordedChunks.length, 'chunks');
        
        if (this.recordedChunks.length === 0) {
            console.error('No recording data available');
            alert('No recording data available. Recording may have failed.');
            return;
        }
        
        // Determine the MIME type based on what was actually recorded
        let mimeType = 'video/webm';
        let extension = 'webm';
        
        if (this.mediaRecorder && this.mediaRecorder.mimeType) {
            mimeType = this.mediaRecorder.mimeType;
            if (mimeType.includes('mp4')) {
                extension = 'mp4';
            }
        }
        
        console.log('Creating blob with MIME type:', mimeType);
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        console.log('Blob created with size:', blob.size, 'bytes');
        
        if (blob.size === 0) {
            console.error('Empty blob created');
            alert('Recording failed: No data recorded');
            return;
        }
        
        // Create download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `teleprompter-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${extension}`;
        
        // For iOS compatibility, try different approaches
        if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
            // iOS approach - open in new window if direct download fails
            a.target = '_blank';
            console.log('iOS detected, using target=_blank for download');
        }
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        console.log('Download initiated');
        
        setTimeout(() => {
            // Ready for next recording
            console.log('Ready for next recording');
        }, 3000);
    }
    
    startScrolling() {
        if (this.isScrolling) return;
        
        const script = this.scriptInput.value.trim();
        if (!script) return;
        
        this.isScrolling = true;
        this.scriptInput.classList.add('scrolling');
        
        // Calculate scroll parameters
        const wpm = parseInt(this.speedSlider.value);
        const wordCount = script.split(/\s+/).filter(word => word.length > 0).length;
        const readingTimeMinutes = wordCount / wpm / 10;
        const durationMs = readingTimeMinutes * 60 * 1000;
        
        console.log(`Words: ${wordCount}, WPM: ${wpm}, Duration: ${(durationMs/1000).toFixed(1)}s`);
        
        // Use scrollTop animation instead of transform
        this.scriptInput.scrollTop = 0;
        const maxScroll = this.scriptInput.scrollHeight - this.scriptInput.clientHeight;
        
        if (maxScroll > 0) {
            this.scrollInterval = setInterval(() => {
                const progress = (Date.now() - this.scrollStartTime) / durationMs;
                if (progress >= 1) {
                    this.scriptInput.scrollTop = maxScroll;
                    clearInterval(this.scrollInterval);
                } else {
                    this.scriptInput.scrollTop = maxScroll * progress;
                }
            }, 16); // 60fps
            
            this.scrollStartTime = Date.now();
        }
    }
    
    stopScrolling() {
        this.isScrolling = false;
        this.scriptInput.classList.remove('scrolling');
        
        // Clear the scroll interval
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
            this.scrollInterval = null;
        }
        
        // Reset scroll position
        this.scriptInput.scrollTop = 0;
    }
    
    async switchCamera() {
        try {
            this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';
            await this.setupCamera();
        } catch (error) {
            console.error('Failed to switch camera:', error);
            // Revert back to previous camera if switch fails
            this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';
        }
    }

    toggleTextRotation() {
        this.isTextRotated = !this.isTextRotated;
        
        if (this.isTextRotated) {
            this.scriptBox.classList.add('rotated');
            this.rotateButton.classList.add('active');
            
            // If the box has been positioned manually, apply rotation without centering
            if (this.scriptBox.style.left && this.scriptBox.style.top) {
                this.scriptBox.style.transform = 'rotate(90deg)';
            }
        } else {
            this.scriptBox.classList.remove('rotated');
            this.rotateButton.classList.remove('active');
            
            // If the box has been positioned manually, remove rotation
            if (this.scriptBox.style.left && this.scriptBox.style.top) {
                this.scriptBox.style.transform = 'none';
            }
        }
        
        this.saveSettings();
    }

    updateSpeedDisplay() {
        const speed = this.speedSlider.value;
        this.speedValue.textContent = speed;
        
        // Update scrolling if active
        if (this.isScrolling) {
            this.stopScrolling();
            this.startScrolling();
        }
    }
    
    updateTextSizeDisplay() {
        const size = this.textSizeSlider.value;
        this.textSizeValue.textContent = size;
        this.scriptInput.style.fontSize = size + 'px';
    }
    
    saveSettings() {
        const settings = {
            scriptText: this.scriptInput.value,
            scrollSpeed: this.speedSlider.value,
            textSize: this.textSizeSlider.value,
            currentCamera: this.currentCamera,
            isTextRotated: this.isTextRotated
            // Removed scriptBoxPosition - let user position it fresh each time
        };
        
        localStorage.setItem('teleprompter-settings', JSON.stringify(settings));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('teleprompter-settings');
        if (!saved) return;
        
        try {
            const settings = JSON.parse(saved);
            
            if (settings.scriptText) {
                this.scriptInput.value = settings.scriptText;
            }
            
            if (settings.scrollSpeed) {
                this.speedSlider.value = settings.scrollSpeed;
            }
            
            if (settings.textSize) {
                this.textSizeSlider.value = settings.textSize;
                this.updateTextSizeDisplay();
            }

            if (settings.currentCamera) {
                this.currentCamera = settings.currentCamera;
            }

            if (settings.isTextRotated) {
                this.isTextRotated = settings.isTextRotated;
                if (this.isTextRotated) {
                    this.scriptBox.classList.add('rotated');
                    this.rotateButton.classList.add('active');
                    // No need to handle positioning since we don't save positions anymore
                }
            }
            
            // Removed scriptBoxPosition loading - box starts in default position each time
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js');
    }
    
    new VideoTeleprompter();
});

// Handle app install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

// Handle fullscreen for better mobile experience
function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
}

// Add fullscreen on double-tap for mobile
let lastTap = 0;
document.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 500 && tapLength > 0) {
        toggleFullscreen();
    }
    lastTap = currentTime;
});
