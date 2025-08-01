class ArtificialLife {
    constructor() {
        this.canvas = document.getElementById('lifeCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 64;
        this.cellSize = 10;
        
        this.canvas.width = this.gridSize * this.cellSize;
        this.canvas.height = this.gridSize * this.cellSize;
        
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
        
        this.initializeControls();
        this.initializeMIDI();
        this.initializeAudio();
        this.initializeAudioInput();
        this.initializeDanceController();
        this.startLife();
        this.startVisualizationUpdate();
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
                this.danceController.setDanceMode(e.target.value);
            }
        });
        
        document.getElementById('formationSelect').addEventListener('change', (e) => {
            if (this.danceController) {
                this.danceController.currentFormation = e.target.value;
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
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
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
        if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
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
            
            if (newX >= 0 && newX < this.gridSize && newY >= 0 && newY < this.gridSize) {
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
                
                // Add extra glow for special beat types
                if (lifeform.lastKickTime && Date.now() - lifeform.lastKickTime < 100) {
                    this.ctx.shadowColor = '#FF3030';
                    this.ctx.shadowBlur = shadowBlur * 1.5;
                    this.ctx.fillRect(x - offset, y - offset, size, size);
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
    
    toggleExhibitionMode() {
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        const btn = document.getElementById('exhibitionToggle');
        
        if (!document.fullscreenElement) {
            // Enter exhibition mode
            mainContent.requestFullscreen().then(() => {
                sidebar.style.display = 'none';
                mainContent.style.width = '100vw';
                btn.textContent = 'Exit Exhibition';
                
                // Auto-enable dance mode in exhibition
                if (this.danceController && !this.danceController.isEnabled) {
                    document.getElementById('danceToggle').click();
                }
                
                // Increase canvas size for exhibition
                this.cellSize = 15;
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
                this.gridSize = Math.floor(Math.min(window.innerWidth / this.cellSize, window.innerHeight / this.cellSize));
                
                console.log('🎨 Exhibition mode activated!');
            });
        } else {
            // Exit exhibition mode
            document.exitFullscreen().then(() => {
                sidebar.style.display = 'flex';
                mainContent.style.width = '';
                btn.textContent = 'Exhibition Mode';
                
                // Restore normal canvas size
                this.cellSize = 10;
                this.gridSize = 64;
                this.canvas.width = this.gridSize * this.cellSize;
                this.canvas.height = this.gridSize * this.cellSize;
                
                console.log('🎨 Exhibition mode deactivated');
            });
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
});