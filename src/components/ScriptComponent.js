/**
 * ScriptComponent - Handles the teleprompter script display and editing
 * Refactored with best practices while maintaining functionality
 */
class ScriptComponent {
    // Constants for configuration and magic numbers
    static CONSTANTS = {
        DEFAULT_SPEED: 120,
        DEFAULT_TEXT_SIZE: 24,
        ANIMATION_FPS: 60,
        SETTINGS_KEY: 'teleprompterSettings',
        CSS_CLASSES: {
            SCROLLING: 'scrolling',
            ROTATED: 'rotated'
        },
        RESIZE: {
            MIN_HEIGHT: 150,
            MAX_HEIGHT: window.innerHeight * 0.8,
            MIN_WIDTH: 300,
            MAX_WIDTH: window.innerWidth * 0.9,
            HANDLE_HEIGHT: 10,
            HANDLE_WIDTH: 10,
            HANDLE_COLOR: 'rgba(255, 255, 255, 0.3)',
            HANDLE_HOVER_COLOR: 'rgba(255, 255, 255, 0.6)'
        }
    };

    /**
     * @constructor
     * Initializes the ScriptComponent with DOM elements and default state
     */
    constructor() {
        // Validate required DOM elements exist
        this.scriptBox = this._getRequiredElement('scriptBox');
        this.scriptInput = this._getRequiredElement('scriptInput');
        
        // Initialize state
        this.state = {
            isScrolling: false,
            isTextRotated: false,
            currentSpeed: ScriptComponent.CONSTANTS.DEFAULT_SPEED,
            currentTextSize: ScriptComponent.CONSTANTS.DEFAULT_TEXT_SIZE,
            isResizing: false,
            initialHeight: 0,
            initialMouseY: 0,
            isResizingWidth: false,
            initialWidth: 0,
            initialMouseX: 0,
            resizeDirection: null // 'bottom', 'left', 'right'
        };
        
        // Animation state
        this.scrollAnimation = null;
        
        // Resize elements
        this.resizeHandle = null;
        this.leftResizeHandle = null;
        this.rightResizeHandle = null;
        
        this.init();
    }

    /**
     * Initialize the component with proper error handling
     */
    async init() {
        try {
            console.log('Initializing ScriptComponent...');
            
            await this._loadSettings();
            this._createResizeHandles();
            this._setupResizeListeners();
            
            console.log('ScriptComponent initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ScriptComponent:', error);
            this._handleInitializationError(error);
        }
    }

    /**
     * Get required DOM element with validation
     * @private
     * @param {string} id - Element ID
     * @returns {HTMLElement} The DOM element
     * @throws {Error} If element not found
     */
    _getRequiredElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Required DOM element with ID '${id}' not found`);
        }
        return element;
    }

    /**
     * Handle initialization errors gracefully
     * @private
     * @param {Error} error - The error that occurred
     */
    _handleInitializationError(error) {
        console.error('ScriptComponent initialization failed:', error);
        // Could show user-friendly error message or fallback UI
        // For now, we'll just log and continue with limited functionality
    }

    // === SETTINGS MANAGEMENT ===

    /**
     * Load settings from localStorage with error handling
     * @private
     */
    async _loadSettings() {
        try {
            const settings = JSON.parse(
                localStorage.getItem(ScriptComponent.CONSTANTS.SETTINGS_KEY) || '{}'
            );
            
            this._applySettings(settings);
            console.log('Settings loaded successfully');
        } catch (error) {
            console.error('Failed to load settings:', error);
            // Continue with default settings
        }
    }

    /**
     * Apply loaded settings to the component
     * @private
     * @param {Object} settings - Settings object from localStorage
     */
    _applySettings(settings) {
        // Apply script content
        if (settings.scriptContent) {
            this.scriptInput.value = settings.scriptContent;
        }

        // Apply position
        if (settings.position) {
            this._updateElementPosition(settings.position);
        }

        // Apply dimensions
        if (settings.width) {
            this.scriptBox.style.width = `${settings.width}px`;
        }
        if (settings.height) {
            this.scriptBox.style.height = `${settings.height}px`;
        }

        // Apply text properties
        if (settings.textSize) {
            this.state.currentTextSize = settings.textSize;
            this.scriptInput.style.fontSize = `${settings.textSize}px`;
        }
        if (settings.speed) {
            this.state.currentSpeed = settings.speed;
        }

        // Apply rotation state
        if (settings.isTextRotated) {
            this.state.isTextRotated = settings.isTextRotated;
            if (this.state.isTextRotated) {
                this.scriptBox.classList.add(ScriptComponent.CONSTANTS.CSS_CLASSES.ROTATED);
            }
        }
    }

    /**
     * Update element position
     * @private
     * @param {Object} position - Position object with left, top properties
     */
    _updateElementPosition(position) {
        if (position.left !== undefined) {
            this.scriptBox.style.left = `${position.left}px`;
            // When positioned, remove the centering transform
            const currentTransform = this.scriptBox.style.transform || '';
            if (currentTransform.includes('translateX')) {
                this.scriptBox.style.transform = this.state.isTextRotated ? 'rotate(90deg)' : 'none';
            }
        }
        if (position.top !== undefined) {
            this.scriptBox.style.top = `${position.top}px`;
        }
    }

    /**
     * Save current settings to localStorage
     * @private
     */
    _saveSettings() {
        try {
            // Get position more carefully
            const computedStyle = window.getComputedStyle(this.scriptBox);
            const rect = this.scriptBox.getBoundingClientRect();
            
            const settings = {
                scriptContent: this.scriptInput.value,
                speed: this.state.currentSpeed,
                textSize: this.state.currentTextSize,
                isTextRotated: this.state.isTextRotated,
                width: this.scriptBox.offsetWidth,
                height: this.scriptBox.offsetHeight,
                position: {
                    // Only save explicit positioning, not computed values that might be from centering
                    left: this.scriptBox.style.left ? parseInt(this.scriptBox.style.left) : undefined,
                    top: this.scriptBox.style.top ? parseInt(this.scriptBox.style.top) : undefined
                }
            };
            
            localStorage.setItem(ScriptComponent.CONSTANTS.SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    // === RESIZE FUNCTIONALITY ===

    /**
     * Create all resize handles for the script box
     * @private
     */
    _createResizeHandles() {
        this._createBottomResizeHandle();
        this._createLeftResizeHandle();
        this._createRightResizeHandle();
    }

    /**
     * Create the bottom resize handle for height adjustment
     * @private
     */
    _createBottomResizeHandle() {
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.className = 'script-resize-handle script-resize-handle-bottom';
        this.resizeHandle.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: ${ScriptComponent.CONSTANTS.RESIZE.HANDLE_HEIGHT}px;
            background: ${ScriptComponent.CONSTANTS.RESIZE.HANDLE_COLOR};
            cursor: ns-resize;
            border-radius: 0 0 12px 12px;
            transition: background-color 0.2s ease;
            z-index: 10;
        `;
        
        this._addHoverEffect(this.resizeHandle);
        this.scriptBox.appendChild(this.resizeHandle);
    }

    /**
     * Create the left resize handle for width adjustment
     * @private
     */
    _createLeftResizeHandle() {
        this.leftResizeHandle = document.createElement('div');
        this.leftResizeHandle.className = 'script-resize-handle script-resize-handle-left';
        this.leftResizeHandle.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            bottom: ${ScriptComponent.CONSTANTS.RESIZE.HANDLE_HEIGHT}px;
            width: ${ScriptComponent.CONSTANTS.RESIZE.HANDLE_WIDTH}px;
            background: ${ScriptComponent.CONSTANTS.RESIZE.HANDLE_COLOR};
            cursor: ew-resize;
            border-radius: 12px 0 0 0;
            transition: background-color 0.2s ease;
            z-index: 10;
        `;
        
        this._addHoverEffect(this.leftResizeHandle);
        this.scriptBox.appendChild(this.leftResizeHandle);
    }

    /**
     * Create the right resize handle for width adjustment
     * @private
     */
    _createRightResizeHandle() {
        this.rightResizeHandle = document.createElement('div');
        this.rightResizeHandle.className = 'script-resize-handle script-resize-handle-right';
        this.rightResizeHandle.style.cssText = `
            position: absolute;
            right: 0;
            top: 0;
            bottom: ${ScriptComponent.CONSTANTS.RESIZE.HANDLE_HEIGHT}px;
            width: ${ScriptComponent.CONSTANTS.RESIZE.HANDLE_WIDTH}px;
            background: ${ScriptComponent.CONSTANTS.RESIZE.HANDLE_COLOR};
            cursor: ew-resize;
            border-radius: 0 12px 0 0;
            transition: background-color 0.2s ease;
            z-index: 10;
        `;
        
        this._addHoverEffect(this.rightResizeHandle);
        this.scriptBox.appendChild(this.rightResizeHandle);
    }

    /**
     * Add hover effects to a resize handle
     * @private
     * @param {HTMLElement} handle - The resize handle element
     */
    _addHoverEffect(handle) {
        handle.addEventListener('mouseenter', () => {
            handle.style.background = ScriptComponent.CONSTANTS.RESIZE.HANDLE_HOVER_COLOR;
        });
        
        handle.addEventListener('mouseleave', () => {
            if (!this.state.isResizing && !this.state.isResizingWidth) {
                handle.style.background = ScriptComponent.CONSTANTS.RESIZE.HANDLE_COLOR;
            }
        });
    }

    /**
     * Setup resize event listeners for all handles
     * @private
     */
    _setupResizeListeners() {
        // Bottom handle (height resize)
        this.resizeHandle.addEventListener('mousedown', (e) => this._startResize(e, 'bottom'));
        
        // Left handle (width resize)
        this.leftResizeHandle.addEventListener('mousedown', (e) => this._startResize(e, 'left'));
        
        // Right handle (width resize)
        this.rightResizeHandle.addEventListener('mousedown', (e) => this._startResize(e, 'right'));
        
        // Global mouse events
        document.addEventListener('mousemove', this._handleResize.bind(this));
        document.addEventListener('mouseup', this._stopResize.bind(this));
    }

    /**
     * Start resize operation
     * @private
     * @param {MouseEvent} e - Mouse event
     * @param {string} direction - Resize direction ('bottom', 'left', 'right')
     */
    _startResize(e, direction) {
        e.preventDefault();
        e.stopPropagation();
        
        this.state.resizeDirection = direction;
        
        if (direction === 'bottom') {
            this.state.isResizing = true;
            this.state.initialHeight = this.scriptBox.offsetHeight;
            this.state.initialMouseY = e.clientY;
            document.body.style.cursor = 'ns-resize';
        } else {
            this.state.isResizingWidth = true;
            this.state.initialWidth = this.scriptBox.offsetWidth;
            this.state.initialMouseX = e.clientX;
            document.body.style.cursor = 'ew-resize';
        }
        
        // Add visual feedback
        document.body.style.userSelect = 'none';
        
        // Highlight the active handle
        const activeHandle = direction === 'bottom' ? this.resizeHandle : 
                           direction === 'left' ? this.leftResizeHandle : this.rightResizeHandle;
        activeHandle.style.background = ScriptComponent.CONSTANTS.RESIZE.HANDLE_HOVER_COLOR;
        
        console.log(`Started resizing script box from ${direction} side`);
    }

    /**
     * Handle resize operation
     * @private
     * @param {MouseEvent} e - Mouse event
     */
    _handleResize(e) {
        if (!this.state.isResizing && !this.state.isResizingWidth) return;
        
        e.preventDefault();
        
        if (this.state.isResizing && this.state.resizeDirection === 'bottom') {
            this._handleHeightResize(e);
        } else if (this.state.isResizingWidth) {
            this._handleWidthResize(e);
        }
    }

    /**
     * Handle height resizing
     * @private
     * @param {MouseEvent} e - Mouse event
     */
    _handleHeightResize(e) {
        const deltaY = e.clientY - this.state.initialMouseY;
        const newHeight = Math.max(
            ScriptComponent.CONSTANTS.RESIZE.MIN_HEIGHT,
            Math.min(
                ScriptComponent.CONSTANTS.RESIZE.MAX_HEIGHT,
                this.state.initialHeight + deltaY
            )
        );
        
        this.scriptBox.style.height = `${newHeight}px`;
        
        // Update the script input height to match (accounting for resize handle)
        const inputHeight = newHeight - ScriptComponent.CONSTANTS.RESIZE.HANDLE_HEIGHT;
        this.scriptInput.style.height = `${inputHeight}px`;
    }

    /**
     * Handle width resizing
     * @private
     * @param {MouseEvent} e - Mouse event
     */
    _handleWidthResize(e) {
        const deltaX = e.clientX - this.state.initialMouseX;
        let newWidth;
        
        if (this.state.resizeDirection === 'right') {
            // Resizing from right side - increase width with mouse movement to the right
            newWidth = this.state.initialWidth + deltaX;
        } else {
            // Resizing from left side - increase width with mouse movement to the left
            // For simplicity, we'll just change width without adjusting position
            newWidth = this.state.initialWidth - deltaX;
        }
        
        // Apply width constraints
        newWidth = Math.max(
            ScriptComponent.CONSTANTS.RESIZE.MIN_WIDTH,
            Math.min(
                ScriptComponent.CONSTANTS.RESIZE.MAX_WIDTH,
                newWidth
            )
        );
        
        this.scriptBox.style.width = `${newWidth}px`;
    }

    /**
     * Stop resize operation
     * @private
     * @param {MouseEvent} e - Mouse event
     */
    _stopResize(e) {
        if (!this.state.isResizing && !this.state.isResizingWidth) return;
        
        const wasResizing = this.state.isResizing || this.state.isResizingWidth;
        const direction = this.state.resizeDirection;
        
        // Reset state
        this.state.isResizing = false;
        this.state.isResizingWidth = false;
        this.state.resizeDirection = null;
        
        // Remove visual feedback
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // Reset handle colors
        this.resizeHandle.style.background = ScriptComponent.CONSTANTS.RESIZE.HANDLE_COLOR;
        this.leftResizeHandle.style.background = ScriptComponent.CONSTANTS.RESIZE.HANDLE_COLOR;
        this.rightResizeHandle.style.background = ScriptComponent.CONSTANTS.RESIZE.HANDLE_COLOR;
        
        // Save the new size
        if (wasResizing) {
            this._saveSettings();
            console.log(`Finished resizing script box from ${direction} side - New size: ${this.scriptBox.offsetWidth}x${this.scriptBox.offsetHeight}px`);
        }
    }


    // === PUBLIC API METHODS ===

    /**
     * Start scrolling the script text
     */
    startScroll() {
        if (this.state.isScrolling) return;
        
        this.state.isScrolling = true;
        this.scriptBox.classList.add(ScriptComponent.CONSTANTS.CSS_CLASSES.SCROLLING);
        
        const startScrollAnimation = () => {
            if (!this.state.isScrolling) return;
            
            const currentScroll = this.scriptInput.scrollTop;
            const scrollHeight = this.scriptInput.scrollHeight;
            const clientHeight = this.scriptInput.clientHeight;
            
            if (currentScroll + clientHeight >= scrollHeight) {
                this.stopScroll();
                return;
            }
            
            const pixelsPerSecond = this.state.currentSpeed;
            const pixelsPerFrame = pixelsPerSecond / ScriptComponent.CONSTANTS.ANIMATION_FPS;
            
            this.scriptInput.scrollTop += pixelsPerFrame;
            
            this.scrollAnimation = requestAnimationFrame(startScrollAnimation);
        };
        
        this.scrollAnimation = requestAnimationFrame(startScrollAnimation);
    }

    /**
     * Stop scrolling the script text
     */
    stopScroll() {
        this.state.isScrolling = false;
        this.scriptBox.classList.remove(ScriptComponent.CONSTANTS.CSS_CLASSES.SCROLLING);
        
        if (this.scrollAnimation) {
            cancelAnimationFrame(this.scrollAnimation);
            this.scrollAnimation = null;
        }
    }

    /**
     * Reset script scroll position to top
     */
    resetScroll() {
        this.stopScroll();
        this.scriptInput.scrollTop = 0;
    }

    /**
     * Set scrolling speed
     * @param {number} speed - Speed in pixels per second
     */
    setSpeed(speed) {
        this.state.currentSpeed = speed;
        this._saveSettings();
    }

    /**
     * Set text size
     * @param {number} size - Font size in pixels
     */
    setTextSize(size) {
        this.state.currentTextSize = size;
        this.scriptInput.style.fontSize = `${size}px`;
        this._saveSettings();
    }

    /**
     * Toggle text rotation
     */
    toggleRotation() {
        this.state.isTextRotated = !this.state.isTextRotated;
        
        if (this.state.isTextRotated) {
            this.scriptBox.classList.add(ScriptComponent.CONSTANTS.CSS_CLASSES.ROTATED);
        } else {
            this.scriptBox.classList.remove(ScriptComponent.CONSTANTS.CSS_CLASSES.ROTATED);
        }
        
        this._saveSettings();
    }

    /**
     * Get current scroll state
     * @returns {boolean} True if scrolling
     */
    isScrolling() {
        return this.state.isScrolling;
    }

    /**
     * Get current text rotation state
     * @returns {boolean} True if text is rotated
     */
    isTextRotated() {
        return this.state.isTextRotated;
    }

    /**
     * Get current speed
     * @returns {number} Current speed in pixels per second
     */
    getSpeed() {
        return this.state.currentSpeed;
    }

    /**
     * Get current text size
     * @returns {number} Current text size in pixels
     */
    getTextSize() {
        return this.state.currentTextSize;
    }

    /**
     * Set script content programmatically
     * @param {string} content - Script content
     */
    setContent(content) {
        this.scriptInput.value = content;
        this._saveSettings();
    }

    /**
     * Get current script content
     * @returns {string} Current script content
     */
    getContent() {
        return this.scriptInput.value;
    }

    /**
     * Get scroll state for controls component
     * @returns {Object} Scroll state object
     */
    getScrollState() {
        return {
            isScrolling: this.state.isScrolling,
            isTextRotated: this.state.isTextRotated,
            currentSpeed: this.state.currentSpeed,
            currentTextSize: this.state.currentTextSize
        };
    }

    /**
     * Start scrolling (public method)
     */
    startScrolling() {
        this.startScroll();
    }

    /**
     * Stop scrolling (public method)
     */
    stopScrolling() {
        this.stopScroll();
    }
}
