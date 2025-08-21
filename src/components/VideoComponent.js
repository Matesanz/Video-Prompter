/**
 * VideoComponent - Handles camera streaming and video recording
 */
class VideoComponent {
    constructor() {
        this.stream = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.currentCamera = 'user'; // 'user' for front, 'environment' for back
        
        this.videoPreview = document.getElementById('videoPreview');
        this.init();
    }

    async init() {
        console.log('Initializing VideoComponent...');
        await this.setupCamera();
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

        try {
            console.log('Requesting camera access with constraints:', constraints);
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoPreview.srcObject = this.stream;
            
            console.log('Camera setup successful');
            console.log('Video tracks:', this.stream.getVideoTracks());
            console.log('Audio tracks:', this.stream.getAudioTracks());
            
            return true;
        } catch (error) {
            console.error('Error setting up camera:', error);
            alert('Unable to access camera. Please check your permissions and try again.');
            return false;
        }
    }

    async switchCamera() {
        console.log('Switching camera from:', this.currentCamera);
        this.currentCamera = this.currentCamera === 'user' ? 'environment' : 'user';
        console.log('To:', this.currentCamera);
        
        const success = await this.setupCamera();
        if (success) {
            console.log('Camera switched successfully');
        }
        return success;
    }

    checkRecordingCompatibility() {
        console.log('Checking browser compatibility...');
        
        // Check MediaRecorder support
        if (!window.MediaRecorder) {
            console.error('MediaRecorder API not supported');
            alert('Your browser does not support video recording. Please use a modern browser like Chrome, Firefox, or Safari.');
            return false;
        }
        
        // Check supported MIME types
        const supportedTypes = [];
        const typesToCheck = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4;codecs=h264,aac',
            'video/mp4'
        ];
        
        typesToCheck.forEach(type => {
            if (MediaRecorder.isTypeSupported(type)) {
                supportedTypes.push(type);
                console.log(`✅ Supported: ${type}`);
            } else {
                console.log(`❌ Not supported: ${type}`);
            }
        });
        
        if (supportedTypes.length === 0) {
            console.error('No supported video formats found');
            alert('Your browser does not support any compatible video recording formats.');
            return false;
        }
        
        console.log('Available recording formats:', supportedTypes);
        return supportedTypes;
    }

    async startRecording() {
        if (!this.stream) {
            console.error('No video stream available');
            return false;
        }

        const supportedTypes = this.checkRecordingCompatibility();
        if (!supportedTypes || supportedTypes.length === 0) {
            return false;
        }

        try {
            // Use the first supported type
            const mimeType = supportedTypes[0];
            console.log('Starting recording with MIME type:', mimeType);
            
            this.recordedChunks = [];
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: mimeType,
                videoBitsPerSecond: 2500000 // 2.5 Mbps
            });

            this.mediaRecorder.ondataavailable = (event) => {
                console.log('Data available:', event.data.size, 'bytes');
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                console.log('Recording stopped. Total chunks:', this.recordedChunks.length);
                this.downloadRecording();
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
            };

            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;
            console.log('Recording started successfully');
            return true;

        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Failed to start recording. Please try again.');
            return false;
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            console.log('Stopping recording...');
            this.mediaRecorder.stop();
            this.isRecording = false;
            return true;
        }
        return false;
    }

    downloadRecording() {
        if (this.recordedChunks.length === 0) {
            console.error('No recorded data to download');
            return;
        }

        console.log('Creating download from', this.recordedChunks.length, 'chunks');
        
        // Determine file extension based on the first chunk's type
        const blob = new Blob(this.recordedChunks, { type: this.recordedChunks[0].type });
        console.log('Blob created:', blob.size, 'bytes, type:', blob.type);
        
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Determine file extension
        let extension = 'webm';
        if (blob.type.includes('mp4')) {
            extension = 'mp4';
        }
        
        const filename = `teleprompter-recording-${timestamp}.${extension}`;
        
        // Check if we're on iOS Safari (which handles downloads differently)
        const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOSSafari) {
            // For iOS Safari, open in new tab so user can save manually
            console.log('iOS Safari detected, opening video in new tab');
            const newWindow = window.open();
            newWindow.document.write(`
                <html>
                    <head><title>Teleprompter Recording</title></head>
                    <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#000;">
                        <div style="text-align:center; color:white; font-family:Arial;">
                            <h2>Your Recording</h2>
                            <video controls autoplay style="max-width:100%; max-height:80vh;">
                                <source src="${url}" type="${blob.type}">
                            </video>
                            <p>Long press the video and select "Save to Photos" to download</p>
                        </div>
                    </body>
                </html>
            `);
        } else {
            // Standard download for other browsers
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            console.log('Download initiated:', filename);
        }
        
        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 5000);
        
        // Reset for next recording
        this.recordedChunks = [];
    }

    getRecordingState() {
        return {
            isRecording: this.isRecording,
            currentCamera: this.currentCamera,
            hasStream: !!this.stream
        };
    }

    destroy() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.mediaRecorder && this.isRecording) {
            this.stopRecording();
        }
    }
}
