class VideoTeleprompter {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.isScrolling = false;
        this.scrollAnimation = null;
        this.stream = null;
        
        // DOM elements
        this.recordButton = document.getElementById('recordButton');
        this.scriptBox = document.getElementById('scriptBox');
        this.scriptInput = document.getElementById('scriptInput');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.textSizeSlider = document.getElementById('textSizeSlider');
        this.textSizeValue = document.getElementById('textSizeValue');
        this.statusText = document.getElementById('statusText');
        this.recordingDot = document.getElementById('recordingDot');
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.setupDragAndResize();
        this.loadSettings();
        this.updateSpeedDisplay();
        this.updateTextSizeDisplay();
        
        // Start camera feed immediately
        try {
            await this.setupCamera();
            this.updateStatus('Ready to record');
        } catch (error) {
            this.updateStatus('Camera access denied');
            console.error('Camera setup failed:', error);
            // Show a dark background if camera fails
            document.querySelector('.app-container').style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)';
        }
    }
    
    setupEventListeners() {
        // Record button
        this.recordButton.addEventListener('click', () => this.toggleRecording());
        
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
            this.scriptBox.style.transform = 'none';
            
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
                facingMode: 'user' // Use front-facing camera by default
            },
            audio: true
        };
        
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
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm;codecs=vp9,opus'
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.saveRecording();
            };
            
            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;
            
            this.recordButton.classList.add('recording');
            this.recordButton.querySelector('.record-text').textContent = 'Stop Recording';
            this.recordingDot.classList.add('active');
            this.updateStatus('Recording');
            
            this.startScrolling();
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.updateStatus('Recording failed');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            this.recordButton.classList.remove('recording');
            this.recordButton.querySelector('.record-text').textContent = 'Start Recording';
            this.recordingDot.classList.remove('active');
            this.updateStatus('Processing...');
            
            this.stopScrolling();
        }
    }
    
    saveRecording() {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        
        // Convert to MP4 if possible (simplified - in production, you'd use FFmpeg.js)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `teleprompter-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.updateStatus('Recording saved');
        
        setTimeout(() => {
            this.updateStatus('Ready to record');
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
    
    updateSpeedDisplay() {
        const speed = this.speedSlider.value;
        this.speedValue.textContent = speed + ' WPM';
        
        // Update scrolling if active
        if (this.isScrolling) {
            this.stopScrolling();
            this.startScrolling();
        }
    }
    
    updateTextSizeDisplay() {
        const size = this.textSizeSlider.value;
        this.textSizeValue.textContent = size + 'px';
        this.scriptInput.style.fontSize = size + 'px';
    }
    
    updateStatus(message) {
        this.statusText.textContent = message;
    }
    
    saveSettings() {
        const settings = {
            scriptText: this.scriptInput.value,
            scrollSpeed: this.speedSlider.value,
            textSize: this.textSizeSlider.value,
            scriptBoxPosition: {
                left: this.scriptBox.style.left,
                top: this.scriptBox.style.top,
                width: this.scriptBox.style.width,
                height: this.scriptBox.style.height,
                transform: this.scriptBox.style.transform
            }
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
            
            if (settings.scriptBoxPosition) {
                const pos = settings.scriptBoxPosition;
                if (pos.left) this.scriptBox.style.left = pos.left;
                if (pos.top) this.scriptBox.style.top = pos.top;
                if (pos.width) this.scriptBox.style.width = pos.width;
                if (pos.height) this.scriptBox.style.height = pos.height;
                if (pos.transform) this.scriptBox.style.transform = pos.transform;
            }
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
