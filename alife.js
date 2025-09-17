class ArtificialLife {
    constructor() {
        this.canvas = document.getElementById('lifeCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Initialize default values before calculation
        this.canvasWidth = 800;
        this.canvasHeight = 450;
        this.gridSizeX = 50;
        this.gridSizeY = 28;
        this.cellSize = 12;

        // Calculate responsive canvas size based on available space
        this.calculateCanvasSize();
        
        // Set both internal canvas resolution AND CSS display size
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        this.canvas.style.width = this.canvasWidth + 'px';
        this.canvas.style.height = this.canvasHeight + 'px';
        
        this.lifeforms = new Map();
        this.worldSpace = new Map();
        this.lifeformIdCounter = 0;
        this.isRunning = false;
        this.frameId = null;
        
        // Session parameters
        this.session = {
            highestConcurrentLifeforms: 0,
            currentLifeformAmount: 0,
            totalLifeformsCreated: 0,
            radiation: 0,
            radiationMax: 90,
            gravityOn: false,
            drawTrails: false,
            maxAttribute: 1000000,
            populationLimit: 50,
            maxEnemyFactor: 8,
            dnaChaosChance: 10,
            buildingEntities: true,
            wallChanceMultiplier: 512
        };

        // Text rendering properties
        this.centerText = '';
        this.textBounds = null;
        this.textBordersEnabled = true;
        
        this.initializeControls();
        this.initializeMIDI();
        this.initializeAudio();
        this.initializeAudioInput();
        this.initializeDanceController();
        this.startLife();
        this.startVisualizationUpdate();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.calculateCanvasSize();
            this.canvas.width = this.canvasWidth;
            this.canvas.height = this.canvasHeight;
            this.canvas.style.width = this.canvasWidth + 'px';
            this.canvas.style.height = this.canvasHeight + 'px';
            this.calculateTextBounds(); // Recalculate text position after resize
        });
    }
    
    calculateCanvasSize() {
        // Get available space (minus sidebar width of 350px and some padding)
        const availableWidth = window.innerWidth - 350 - 40; // 350px sidebar + 40px padding
        const availableHeight = window.innerHeight - 40; // 40px for top/bottom padding

        // Create a HORIZONTAL canvas (16:9 aspect ratio or wider)
        const targetAspectRatio = 16 / 9; // Widescreen ratio

        // Calculate dimensions based on available space
        let canvasWidth = availableWidth;
        let canvasHeight = canvasWidth / targetAspectRatio;

        // If height is too big, scale based on height instead
        if (canvasHeight > availableHeight) {
            canvasHeight = availableHeight;
            canvasWidth = canvasHeight * targetAspectRatio;
        }

        // Set minimum and maximum sizes
        const minWidth = 600;
        const maxWidth = 1400;
        const minHeight = 337; // 600 / (16/9)
        const maxHeight = 788; // 1400 / (16/9)

        canvasWidth = Math.max(minWidth, Math.min(maxWidth, canvasWidth));
        canvasHeight = Math.max(minHeight, Math.min(maxHeight, canvasHeight));

        // Calculate cell size based on the smaller dimension
        this.cellSize = 12; // Fixed cell size for consistency

        // Store the actual canvas dimensions
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // Calculate grid dimensions (FORCE horizontal rectangle - 16:9 ratio)
        // Force a 16:9 grid ratio regardless of canvas size
        const gridRatio = 16 / 9;

        // Calculate based on available space but maintain ratio
        const maxGridWidth = Math.floor(canvasWidth / this.cellSize);
        const maxGridHeight = Math.floor(canvasHeight / this.cellSize);

        // Choose the constraining dimension and scale accordingly
        if (maxGridWidth / maxGridHeight > gridRatio) {
            // Width is not the constraint, use height to determine width
            this.gridSizeY = maxGridHeight;
            this.gridSizeX = Math.floor(this.gridSizeY * gridRatio);
        } else {
            // Height is not the constraint, use width to determine height
            this.gridSizeX = maxGridWidth;
            this.gridSizeY = Math.floor(this.gridSizeX / gridRatio);
        }

        // Keep gridSize for backward compatibility (use the larger dimension)
        this.gridSize = Math.max(this.gridSizeX, this.gridSizeY);

        console.log(`🖥️ Canvas: ${canvasWidth}x${canvasHeight}px (${this.gridSizeX}x${this.gridSizeY} grid, ${this.cellSize}px cells)`);
    }

    calculateTextBounds() {
        if (!this.centerText || this.centerText.trim() === '') {
            this.textBounds = null;
            return;
        }

        // Set up font for measurement
        this.ctx.font = 'bold 28px JetBrains Mono, monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Measure text dimensions
        const metrics = this.ctx.measureText(this.centerText);
        const textWidth = metrics.width;
        const textHeight = 28; // Font size

        // Calculate position (center of canvas)
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;

        // Add padding around text (in pixels)
        const padding = 20;

        // Store text bounds for collision detection
        this.textBounds = {
            x: centerX - textWidth / 2 - padding,
            y: centerY - textHeight / 2 - padding,
            width: textWidth + padding * 2,
            height: textHeight + padding * 2,
            centerX: centerX,
            centerY: centerY
        };

        console.log('📝 Text bounds calculated:', this.textBounds);
    }

    getTextColor() {
        // Default to red if no dance controller
        if (!this.danceController || !this.danceController.isEnabled) {
            return '#FF0000';
        }

        // Get colors from current palette
        const palette = this.danceController.colorPalettes[this.danceController.currentPalette];
        if (!palette || palette.length === 0) {
            return '#FF0000';
        }

        // Return the first color in the palette as the primary text color
        return palette[0];
    }

    renderCenterText() {
        if (!this.centerText || this.centerText.trim() === '') {
            return;
        }

        this.ctx.save();

        // Set up text style
        this.ctx.font = 'bold 28px JetBrains Mono, monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;

        // Get dynamic color based on palette
        const textColor = this.getTextColor();

        // Draw text border/outline effect
        if (this.textBordersEnabled && this.textBounds) {
            // Draw border rectangle with palette color
            this.ctx.strokeStyle = textColor;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(this.textBounds.x, this.textBounds.y, this.textBounds.width, this.textBounds.height);

            // Optional: fill the text area to create a "hole"
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(this.textBounds.x, this.textBounds.y, this.textBounds.width, this.textBounds.height);
        }

        // Draw text with glow effect using palette color
        this.ctx.shadowColor = textColor;
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(this.centerText, centerX, centerY);

        // Draw text outline with palette color
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = textColor;
        this.ctx.lineWidth = 1;
        this.ctx.strokeText(this.centerText, centerX, centerY);

        this.ctx.restore();
    }

    checkTextCollision(gridX, gridY) {
        if (!this.textBounds) {
            return false;
        }

        // Convert grid coordinates to pixel coordinates
        const pixelX = gridX * this.cellSize;
        const pixelY = gridY * this.cellSize;

        // Check if the lifeform (with cell size) would overlap with text bounds
        const lifeformRight = pixelX + this.cellSize;
        const lifeformBottom = pixelY + this.cellSize;

        const textRight = this.textBounds.x + this.textBounds.width;
        const textBottom = this.textBounds.y + this.textBounds.height;

        // AABB collision detection
        return !(pixelX >= textRight ||
                lifeformRight <= this.textBounds.x ||
                pixelY >= textBottom ||
                lifeformBottom <= this.textBounds.y);
    }

    initializeControls() {
        // Tab functionality
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
        
        // Control buttons
        document.getElementById('startBtn').addEventListener('click', () => this.startLife());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseLife());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetLife());
        document.getElementById('thanosBtn').addEventListener('click', () => this.thanosSnap());
        
        document.getElementById('gravityToggle').addEventListener('change', (e) => {
            this.session.gravityOn = e.target.checked;
        });
        
        document.getElementById('trailsToggle').addEventListener('change', (e) => {
            this.session.drawTrails = e.target.checked;
        });
        
        document.getElementById('radiationSlider').addEventListener('input', (e) => {
            this.session.radiation = parseInt(e.target.value);
            document.getElementById('radiationValue').textContent = e.target.value;
        });
        
        // Audio controls
        document.getElementById('audioToggle').addEventListener('click', () => {
            if (this.audioSystem) {
                this.audioSystem.toggle();
                const btn = document.getElementById('audioToggle');
                btn.textContent = this.audioSystem.isEnabled ? 'Disable Audio' : 'Enable Audio';
            }
        });
        
        document.getElementById('musicVolume').addEventListener('input', (e) => {
            if (this.audioSystem) {
                this.audioSystem.setMusicVolume(parseInt(e.target.value) / 100);
            }
        });
        
        document.getElementById('sfxVolume').addEventListener('input', (e) => {
            if (this.audioSystem) {
                this.audioSystem.setSfxVolume(parseInt(e.target.value) / 100);
            }
        });
        
        document.getElementById('ambientVolume').addEventListener('input', (e) => {
            if (this.audioSystem) {
                this.audioSystem.setAmbientVolume(parseInt(e.target.value) / 100);
            }
        });
        
        // Audio input controls
        document.getElementById('audioInputToggle').addEventListener('click', async () => {
            if (this.audioInputController) {
                const btn = document.getElementById('audioInputToggle');
                if (!this.audioInputController.isEnabled) {
                    const success = await this.audioInputController.enableAudioInput();
                    if (success) {
                        btn.textContent = 'Disable Audio Input';
                    }
                } else {
                    this.audioInputController.disableAudioInput();
                    btn.textContent = 'Enable Audio Input';
                }
            }
        });
        
        document.getElementById('audioSensitivity').addEventListener('input', (e) => {
            if (this.audioInputController) {
                this.audioInputController.setSensitivity(parseFloat(e.target.value));
            }
        });
        
        document.getElementById('pitchSensitivity').addEventListener('input', (e) => {
            if (this.audioInputController) {
                this.audioInputController.setPitchSensitivity(parseFloat(e.target.value));
            }
        });
        
        // Dance controls
        document.getElementById('danceToggle').addEventListener('click', () => {
            if (this.danceController) {
                const btn = document.getElementById('danceToggle');
                if (!this.danceController.isEnabled) {
                    this.danceController.enable();
                    btn.textContent = 'Disable Dance Mode';
                    // Auto-enable audio input for dance mode
                    if (this.audioInputController && !this.audioInputController.isEnabled) {
                        document.getElementById('audioInputToggle').click();
                    }
                } else {
                    this.danceController.disable();
                    btn.textContent = 'Enable Dance Mode';
                }
            }
        });
        
        document.getElementById('danceStyle').addEventListener('change', (e) => {
            if (this.danceController) {
                this.danceController.setDanceStyle(e.target.value);
            }
        });

        document.getElementById('formationSelect').addEventListener('change', (e) => {
            if (this.danceController) {
                this.danceController.setFormation(e.target.value);
            }
        });
        
        document.getElementById('colorPalette').addEventListener('change', (e) => {
            if (this.danceController) {
                this.danceController.setPalette(e.target.value);
            }
        });
        
        // Exhibition mode
        document.getElementById('exhibitionToggle').addEventListener('click', () => {
            this.toggleExhibitionMode();
        });

        // Text controls
        document.getElementById('centerText').addEventListener('input', (e) => {
            this.centerText = e.target.value;
            this.calculateTextBounds();
        });

        document.getElementById('clearTextBtn').addEventListener('click', () => {
            document.getElementById('centerText').value = '';
            this.centerText = '';
            this.textBounds = null;
        });

        document.getElementById('textBorderToggle').addEventListener('change', (e) => {
            this.textBordersEnabled = e.target.checked;
        });

        // Handle fullscreen changes (including ESC key)
        document.addEventListener('fullscreenchange', () => {
            this.handleFullscreenChange();
        });

        // Also handle webkit prefix for Safari
        document.addEventListener('webkitfullscreenchange', () => {
            this.handleFullscreenChange();
        });
    }
    
    initializeMIDI() {
        // Initialize MIDI controller if available
        if (typeof MIDIController !== 'undefined') {
            this.midiController = new MIDIController(this);
        }
    }
    
    initializeAudio() {
        // Initialize audio system if available
        if (typeof ALifeAudioSystem !== 'undefined') {
            this.audioSystem = new ALifeAudioSystem(this);
        }
    }
    
    initializeAudioInput() {
        // Initialize audio input controller if available
        if (typeof AudioInputController !== 'undefined') {
            this.audioInputController = new AudioInputController(this);
        }
    }
    
    initializeDanceController() {
        // Initialize dance controller if available
        if (typeof DanceController !== 'undefined') {
            this.danceController = new DanceController(this);
        }
    }
    
    switchTab(tabName) {
        // Remove active class from all tabs and panels
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding panel
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }
    
    startLife() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lifeforms.clear();
        this.worldSpace.clear();
        
        // Create initial lifeforms
        for (let i = 0; i < 10; i++) {
            this.createLifeform();
        }
        
        this.animate();
    }
    
    pauseLife() {
        this.isRunning = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
        }
    }
    
    resetLife() {
        this.pauseLife();
        this.lifeforms.clear();
        this.worldSpace.clear();
        this.lifeformIdCounter = 0;
        this.session.totalLifeformsCreated = 0;
        this.session.highestConcurrentLifeforms = 0;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.updateStats();
    }
    
    thanosSnap() {
        const lifeformArray = Array.from(this.lifeforms.values());
        const halfCount = Math.floor(lifeformArray.length / 2);
        
        for (let i = 0; i < halfCount; i++) {
            const randomIndex = Math.floor(Math.random() * lifeformArray.length);
            const lifeform = lifeformArray[randomIndex];
            this.removeLifeform(lifeform.id);
            lifeformArray.splice(randomIndex, 1);
        }
    }
    
    createLifeform(x = null, y = null, dna = null) {
        if (this.lifeforms.size >= this.session.populationLimit) return null;
        
        const id = this.lifeformIdCounter++;
        
        if (x === null || y === null) {
            const pos = this.findFreePosition();
            if (!pos) return null;
            x = pos.x;
            y = pos.y;
        }
        
        const lifeform = new Lifeform(id, x, y, this.session, dna);
        this.lifeforms.set(id, lifeform);
        this.worldSpace.set(`${x},${y}`, id);
        
        this.session.totalLifeformsCreated++;
        this.session.currentLifeformAmount = this.lifeforms.size;
        
        if (this.session.currentLifeformAmount > this.session.highestConcurrentLifeforms) {
            this.session.highestConcurrentLifeforms = this.session.currentLifeformAmount;
        }
        
        return lifeform;
    }
    
    removeLifeform(id) {
        const lifeform = this.lifeforms.get(id);
        if (!lifeform) return;
        
        this.worldSpace.delete(`${lifeform.x},${lifeform.y}`);
        this.lifeforms.delete(id);
        this.session.currentLifeformAmount = this.lifeforms.size;
    }
    
    findFreePosition() {
        const maxAttempts = 100;
        for (let i = 0; i < maxAttempts; i++) {
            const x = Math.floor(Math.random() * this.gridSizeX);
            const y = Math.floor(Math.random() * this.gridSizeY);
            if (!this.worldSpace.has(`${x},${y}`)) {
                return { x, y };
            }
        }
        return null;
    }
    
    animate() {
        if (!this.isRunning) return;
        
        // Process all lifeforms
        for (const lifeform of this.lifeforms.values()) {
            this.processLifeform(lifeform);
        }
        
        // Render
        this.render();
        this.updateStats();
        
        this.frameId = requestAnimationFrame(() => this.animate());
    }
    
    processLifeform(lifeform) {
        // Age the lifeform
        lifeform.timeToLiveCount -= 1 + (this.session.radiation * 0.001);
        
        if (lifeform.timeToLiveCount <= 0) {
            this.removeLifeform(lifeform.id);
            return;
        }
        
        // Handle movement
        if (lifeform.timeToMoveCount > 0) {
            lifeform.timeToMoveCount--;
        } else {
            lifeform.timeToMoveCount = lifeform.timeToMove;
            this.moveLifeform(lifeform);
        }
        
        // Handle breeding
        if (lifeform.waitingToSpawn && this.lifeforms.size < this.session.populationLimit) {
            const spawnPos = this.findAdjacentFreePosition(lifeform.x, lifeform.y);
            if (spawnPos) {
                const childDna = {
                    seed1: lifeform.waitingSeed1,
                    seed2: lifeform.waitingSeed2,
                    seed3: lifeform.waitingSeed3
                };
                this.createLifeform(spawnPos.x, spawnPos.y, childDna);
                lifeform.waitingToSpawn = false;
            }
        }
    }
    
    moveLifeform(lifeform) {
        const oldKey = `${lifeform.x},${lifeform.y}`;
        let newX = lifeform.x;
        let newY = lifeform.y;
        
        // Apply gravity if enabled
        if (this.session.gravityOn && (lifeform.strength < lifeform.weight || lifeform.momentum <= 0)) {
            lifeform.direction = 'move_down';
        }
        
        // Calculate new position based on direction
        switch (lifeform.direction) {
            case 'move_up': newY--; break;
            case 'move_down': newY++; break;
            case 'move_left': newX--; break;
            case 'move_right': newX++; break;
            case 'move_up_and_right': newY--; newX++; break;
            case 'move_up_and_left': newY--; newX--; break;
            case 'move_down_and_right': newY++; newX++; break;
            case 'move_down_and_left': newY++; newX--; break;
        }
        
        // Check boundaries
        if (newX < 0 || newX >= this.gridSizeX || newY < 0 || newY >= this.gridSizeY) {
            lifeform.changeDirection();
            return;
        }

        // Check text boundary collision
        if (this.textBordersEnabled && this.checkTextCollision(newX, newY)) {
            lifeform.changeDirection();
            return;
        }
        
        const newKey = `${newX},${newY}`;
        
        // Check for collision
        if (this.worldSpace.has(newKey)) {
            const collidedId = this.worldSpace.get(newKey);
            const collidedLifeform = this.lifeforms.get(collidedId);
            
            if (collidedLifeform) {
                this.handleCollision(lifeform, collidedLifeform);
            }
            
            lifeform.changeDirection();
            return;
        }
        
        // Move lifeform
        this.worldSpace.delete(oldKey);
        lifeform.x = newX;
        lifeform.y = newY;
        this.worldSpace.set(newKey, lifeform.id);
        
        // Update momentum
        if (this.session.gravityOn && lifeform.direction.includes('down')) {
            lifeform.momentum = Math.min(100, lifeform.momentum + 1);
        } else {
            lifeform.momentum = Math.max(0, lifeform.momentum - 2);
        }
    }
    
    handleCollision(lifeform1, lifeform2) {
        const aggressionDiff = Math.abs(lifeform1.aggressionFactor - lifeform2.aggressionFactor);
        
        // Breeding
        if (aggressionDiff <= lifeform1.breedThreshold) {
            if (!lifeform1.waitingToSpawn) {
                lifeform1.waitingToSpawn = true;
                lifeform1.waitingSeed1 = this.getDna(lifeform1, lifeform2, 1);
                lifeform1.waitingSeed2 = this.getDna(lifeform1, lifeform2, 2);
                lifeform1.waitingSeed3 = this.getDna(lifeform1, lifeform2, 3);
            }
        } else {
            // Combat
            if (lifeform1.strength > lifeform2.strength) {
                lifeform1.timeToLiveCount += lifeform2.timeToLiveCount;
                lifeform1.strength += Math.floor(lifeform2.strength * 0.5);
                this.removeLifeform(lifeform2.id);
            } else if (lifeform2.strength > lifeform1.strength) {
                lifeform2.timeToLiveCount += lifeform1.timeToLiveCount;
                lifeform2.strength += Math.floor(lifeform1.strength * 0.5);
                this.removeLifeform(lifeform1.id);
            } else {
                // Equal strength - coin flip
                if (Math.random() < 0.5) {
                    lifeform1.timeToLiveCount += lifeform2.timeToLiveCount;
                    this.removeLifeform(lifeform2.id);
                } else {
                    lifeform2.timeToLiveCount += lifeform1.timeToLiveCount;
                    this.removeLifeform(lifeform1.id);
                }
            }
        }
    }
    
    getDna(parent1, parent2, dnaKey) {
        // DNA chaos chance
        if (Math.random() * 100 < this.session.dnaChaosChance) {
            return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        }
        
        // 50/50 chance of inheriting from either parent
        if (Math.random() < 0.5) {
            return parent1[`lifeSeed${dnaKey}`];
        } else {
            return parent2[`lifeSeed${dnaKey}`];
        }
    }
    
    findAdjacentFreePosition(x, y) {
        const directions = [
            {dx: 0, dy: -1}, {dx: 0, dy: 1}, {dx: -1, dy: 0}, {dx: 1, dy: 0},
            {dx: -1, dy: -1}, {dx: 1, dy: -1}, {dx: -1, dy: 1}, {dx: 1, dy: 1}
        ];
        
        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            
            if (newX >= 0 && newX < this.gridSizeX && newY >= 0 && newY < this.gridSizeY) {
                if (!this.worldSpace.has(`${newX},${newY}`)) {
                    return { x: newX, y: newY };
                }
            }
        }
        
        return null;
    }
    
    render() {
        // Handle trails differently in dance mode
        if (!this.session.drawTrails || (this.danceController && this.danceController.isEnabled)) {
            // In dance mode, add a subtle fade effect
            if (this.danceController && this.danceController.isEnabled) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            } else {
                this.ctx.fillStyle = '#000000';
            }
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Draw all lifeforms
        for (const lifeform of this.lifeforms.values()) {
            const x = lifeform.x * this.cellSize;
            const y = lifeform.y * this.cellSize;
            
            // Use dance colors if dance mode is active
            if (this.danceController && this.danceController.isEnabled) {
                const colors = this.danceController.colorPalettes[this.danceController.currentPalette];
                const colorIndex = lifeform.id % colors.length;
                let baseColor = colors[colorIndex];
                
                // Apply rhythmic color intensity
                const colorIntensity = lifeform.rhythmicColorIntensity || 1;
                if (colorIntensity !== 1) {
                    // Adjust color brightness based on rhythm
                    const rgb = baseColor.match(/\w\w/g);
                    if (rgb) {
                        const r = Math.min(255, parseInt(rgb[0], 16) * colorIntensity);
                        const g = Math.min(255, parseInt(rgb[1], 16) * colorIntensity);
                        const b = Math.min(255, parseInt(rgb[2], 16) * colorIntensity);
                        baseColor = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
                    }
                }
                
                this.ctx.fillStyle = baseColor;
                this.ctx.shadowColor = baseColor;
                
                // Enhanced shadow effects
                let shadowBlur = 12 + (lifeform.beatPulse || 1) * 8;
                if (lifeform.shimmer && lifeform.shimmer > 1) {
                    shadowBlur += lifeform.shimmer * 5;
                }
                this.ctx.shadowBlur = shadowBlur;
                
                // Render with multiple effects
                let size = this.cellSize * (lifeform.beatPulse || 1);
                
                // Apply rhythmic scaling
                if (lifeform.rhythmicScale) {
                    size *= lifeform.rhythmicScale;
                }
                
                const offset = (size - this.cellSize) / 2;
                this.ctx.fillRect(x - offset, y - offset, size, size);
                
                // Add STRONG flash effect for kick drums
                if (lifeform.flash && lifeform.flashIntensity) {
                    // Flash decays over time
                    const flashAge = Date.now() - (lifeform.lastKickTime || 0);
                    const flashDecay = Math.max(0, 1 - flashAge / 150); // 150ms flash duration

                    if (flashDecay > 0) {
                        // White flash overlay
                        this.ctx.save();
                        this.ctx.globalCompositeOperation = 'screen';
                        this.ctx.fillStyle = `rgba(255, 255, 255, ${flashDecay * lifeform.flashIntensity})`;
                        this.ctx.fillRect(x - offset * 1.5, y - offset * 1.5, size * 1.5, size * 1.5);
                        this.ctx.restore();

                        // Extra bright glow
                        this.ctx.shadowColor = '#FFFFFF';
                        this.ctx.shadowBlur = shadowBlur * 2 * flashDecay;
                        this.ctx.fillRect(x - offset, y - offset, size, size);
                    } else {
                        lifeform.flash = false;
                    }
                }
            } else {
                // Original red color variations
                const redIntensity = 150 + (lifeform.redColor * 105); // 150-255
                const greenComponent = Math.floor(lifeform.greenColor * 50); // 0-50
                const blueComponent = Math.floor(lifeform.blueColor * 30); // 0-30
                
                this.ctx.fillStyle = `rgb(${redIntensity}, ${greenComponent}, ${blueComponent})`;
                this.ctx.shadowColor = `rgb(${redIntensity}, ${greenComponent}, ${blueComponent})`;
                this.ctx.shadowBlur = 8;
                
                this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
            }
        }
        
        // Render dance effects
        if (this.danceController && this.danceController.isEnabled) {
            this.danceController.renderDanceEffects(this.ctx);
        }

        // Render center text (always on top)
        this.renderCenterText();
    }
    
    updateStats() {
        document.getElementById('currentCount').textContent = this.lifeforms.size;
        document.getElementById('totalCount').textContent = this.session.totalLifeformsCreated;
        document.getElementById('maxCount').textContent = this.session.highestConcurrentLifeforms;
    }
    
    startVisualizationUpdate() {
        // Update audio input visualization every 100ms
        setInterval(() => {
            if (this.audioInputController && this.audioInputController.isEnabled) {
                const data = this.audioInputController.getVisualizationData();
                
                // Update volume meter
                const volumeBar = document.getElementById('volumeBar');
                if (volumeBar) {
                    volumeBar.style.width = `${data.volume * 100}%`;
                }
                
                // Update frequency display
                const frequencyDisplay = document.getElementById('frequencyDisplay');
                if (frequencyDisplay) {
                    if (data.frequency > 0) {
                        const noteName = this.audioInputController.midiNoteToName(data.pitch);
                        frequencyDisplay.textContent = `${data.frequency.toFixed(1)}Hz (${noteName})`;
                    } else {
                        frequencyDisplay.textContent = data.volume > 0.1 ? 'Analyzing...' : 'No signal';
                    }
                }
                
                // Send audio data to dance controller
                if (this.danceController && this.danceController.isEnabled) {
                    this.danceController.updateFromAudioData(data);
                }
            }
        }, 100);
    }
    
    handleFullscreenChange() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const btn = document.getElementById('exhibitionToggle');

        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            // Exited fullscreen (either by button or ESC key)
            sidebar.style.display = 'flex';
            mainContent.style.width = '';
            mainContent.style.height = '';
            mainContent.style.padding = '';
            btn.textContent = 'Exhibition Mode';

            // Restore HTML and body styles
            document.documentElement.style.width = '';
            document.documentElement.style.height = '';
            document.documentElement.style.margin = '';
            document.documentElement.style.padding = '';

            document.body.style.width = '';
            document.body.style.height = '';
            document.body.style.margin = '';
            document.body.style.padding = '';
            document.body.style.overflow = '';

            // RESTORE canvas container styles - REMOVE ALL NUCLEAR CSS
            const canvasContainer = document.querySelector('.canvas-container');
            canvasContainer.style.cssText = '';  // Clear all inline styles completely

            // RESTORE canvas styles - REMOVE ALL NUCLEAR CSS
            this.canvas.style.cssText = '';  // Clear all inline styles completely

            // Restore responsive canvas size
            this.calculateCanvasSize();
            this.canvas.width = this.canvasWidth;
            this.canvas.height = this.canvasHeight;
            this.canvas.style.width = this.canvasWidth + 'px';
            this.canvas.style.height = this.canvasHeight + 'px';

            console.log('🎨 Exhibition mode deactivated');
        }
    }

    toggleExhibitionMode() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const btn = document.getElementById('exhibitionToggle');

        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            // Enter exhibition mode
            const requestFullscreen = mainContent.requestFullscreen ||
                                    mainContent.webkitRequestFullscreen ||
                                    mainContent.mozRequestFullScreen ||
                                    mainContent.msRequestFullscreen;

            if (requestFullscreen) {
                requestFullscreen.call(mainContent).then(() => {
                    sidebar.style.display = 'none';
                    mainContent.style.width = '100vw';
                    mainContent.style.height = '100vh';
                    mainContent.style.padding = '0';
                    btn.textContent = 'Exit Exhibition';

                    // Auto-enable dance mode in exhibition
                    if (this.danceController && !this.danceController.isEnabled) {
                        document.getElementById('danceToggle').click();
                    }

                    // Use ABSOLUTE FULL screen for exhibition - FORCE EXACT DIMENSIONS
                    this.canvasWidth = screen.width || window.innerWidth;
                    this.canvasHeight = screen.height || window.innerHeight;
                    this.cellSize = 8; // Even smaller cells for maximum coverage

                    // FORCE VIEWPORT DIMENSIONS - OVERRIDE EVERYTHING
                    const actualScreenWidth = window.innerWidth;
                    const actualScreenHeight = window.innerHeight;

                    // ALSO TRY VIEWPORT UNITS
                    document.documentElement.style.setProperty('--full-width', '100vw');
                    document.documentElement.style.setProperty('--full-height', '100vh');

                    console.log(`🔥 FORCING FULL SCREEN: ${actualScreenWidth}x${actualScreenHeight}`);

                    // NUCLEAR OPTION - FORCE EVERYTHING TO VIEWPORT SIZE
                    const canvasContainer = document.querySelector('.canvas-container');
                    canvasContainer.style.cssText = `
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        max-width: none !important;
                        max-height: none !important;
                        min-width: 100vw !important;
                        min-height: 100vh !important;
                        box-sizing: border-box !important;
                    `;

                    // FORCE EVERYTHING TO FULL SCREEN
                    document.documentElement.style.width = '100vw';
                    document.documentElement.style.height = '100vh';
                    document.documentElement.style.margin = '0';
                    document.documentElement.style.padding = '0';

                    document.body.style.width = '100vw';
                    document.body.style.height = '100vh';
                    document.body.style.margin = '0';
                    document.body.style.padding = '0';
                    document.body.style.overflow = 'hidden';

                    // Using actualScreenWidth/Height defined above

                    // For exhibition: RECALCULATE GRID BASED ON ACTUAL SCREEN SIZE
                    this.gridSizeX = Math.floor(actualScreenWidth / this.cellSize);
                    this.gridSizeY = Math.floor(actualScreenHeight / this.cellSize);

                    // Update gridSize for compatibility
                    this.gridSize = Math.max(this.gridSizeX, this.gridSizeY);

                    console.log(`🎨 EXHIBITION GRID: ${this.gridSizeX} x ${this.gridSizeY} cells`);
                    console.log(`🎨 SCREEN: ${actualScreenWidth} x ${actualScreenHeight} pixels`);
                    console.log(`🎨 CELL SIZE: ${this.cellSize}px`);

                    // REDISTRIBUTE existing lifeforms across the FULL screen
                    for (const lifeform of this.lifeforms.values()) {
                        // Remove from old position
                        this.worldSpace.delete(`${Math.floor(lifeform.x)},${Math.floor(lifeform.y)}`);

                        // Place randomly across FULL new grid
                        const newX = Math.floor(Math.random() * this.gridSizeX);
                        const newY = Math.floor(Math.random() * this.gridSizeY);

                        lifeform.x = newX;
                        lifeform.y = newY;

                        this.worldSpace.set(`${newX},${newY}`, lifeform.id);
                    }

                    // FORCE CANVAS TO EXACT SCREEN DIMENSIONS
                    console.log(`🔥 BEFORE: canvas ${this.canvas.width}x${this.canvas.height}, style ${this.canvas.style.width}x${this.canvas.style.height}`);

                    // Set internal resolution to EXACT screen size
                    this.canvas.width = actualScreenWidth;
                    this.canvas.height = actualScreenHeight;

                    // NUCLEAR OPTION FOR CANVAS TOO
                    this.canvas.style.cssText = `
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        max-width: none !important;
                        max-height: none !important;
                        min-width: 100vw !important;
                        min-height: 100vh !important;
                        box-sizing: border-box !important;
                        z-index: 10000 !important;
                    `;

                    console.log(`🔥 AFTER: canvas ${this.canvas.width}x${this.canvas.height}, style ${this.canvas.style.width}x${this.canvas.style.height}`);

                    console.log(`🎨 Exhibition mode activated! Full grid: ${this.gridSizeX}x${this.gridSizeY}`);
                }).catch(err => {
                    console.error('Failed to enter fullscreen:', err);
                });
            }
        } else {
            // Exit exhibition mode
            const exitFullscreen = document.exitFullscreen ||
                                 document.webkitExitFullscreen ||
                                 document.mozCancelFullScreen ||
                                 document.msExitFullscreen;

            if (exitFullscreen) {
                exitFullscreen.call(document);
            }
        }
    }
}

class Lifeform {
    constructor(id, x, y, session, dna = null) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.alive = true;
        
        // Generate or use provided DNA
        this.lifeSeed1 = dna?.seed1 || Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        this.lifeSeed2 = dna?.seed2 || Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        this.lifeSeed3 = dna?.seed3 || Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        
        // Initialize properties from DNA
        this.initializeFromDna(session);
    }
    
    initializeFromDna(session) {
        const rng1 = this.seededRandom(this.lifeSeed1);
        const rng2 = this.seededRandom(this.lifeSeed2);
        const rng3 = this.seededRandom(this.lifeSeed3);
        
        // From seed 1
        this.redColor = rng1();
        this.aggressionFactor = Math.floor(session.maxAttribute * rng1());
        this.friendFactor = Math.floor(session.maxEnemyFactor * rng1());
        this.weight = Math.floor(session.maxAttribute * rng1());
        this.momentum = Math.floor(100 * rng1());
        
        // From seed 2
        this.greenColor = rng2();
        this.breedThreshold = this.friendFactor === 0 ? 
            Math.floor(session.maxAttribute * rng2()) : 
            Math.floor(session.maxAttribute * rng2()) / this.friendFactor;
        this.timeToMove = Math.floor(100 * rng2());
        this.timeToMoveCount = this.timeToMove;
        
        // From seed 3
        this.blueColor = rng3();
        this.timeToLive = Math.floor(session.maxAttribute * rng3());
        this.timeToLiveCount = this.timeToLive;
        this.strength = Math.floor(session.maxAttribute * rng3());
        
        // Direction
        const directions = ['move_up', 'move_down', 'move_left', 'move_right', 
                          'move_up_and_right', 'move_down_and_left', 
                          'move_up_and_left', 'move_down_and_right', 'still'];
        this.direction = directions[Math.floor(rng3() * directions.length)];
        this.preferredDirection = this.direction;
        
        // Breeding state
        this.waitingToSpawn = false;
        this.waitingSeed1 = null;
        this.waitingSeed2 = null;
        this.waitingSeed3 = null;
    }
    
    seededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }
    
    changeDirection() {
        const directions = ['move_up', 'move_down', 'move_left', 'move_right', 
                          'move_up_and_right', 'move_down_and_left', 
                          'move_up_and_left', 'move_down_and_right', 'still'];
        
        if (this.direction !== this.preferredDirection && Math.random() < 0.5) {
            this.direction = this.preferredDirection;
        } else {
            this.direction = directions[Math.floor(Math.random() * directions.length)];
        }
    }
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
    const alife = new ArtificialLife();
    // Make globally accessible for debugging
    window.alife = alife;
});