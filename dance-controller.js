class DanceController {
    constructor(alife) {
        this.alife = alife;
        this.isEnabled = false;
        
        // Dance parameters
        this.danceMode = 'flow'; // flow, pulse, spiral, wave, constellation
        this.beatDetector = new BeatDetector();
        this.lastBeatTime = 0;
        this.beatInterval = 0;
        this.currentBPM = 0;
        
        // Frequency bands for different dance behaviors
        this.bass = 0;      // 20-250 Hz - drives main movement
        this.lowMid = 0;    // 250-500 Hz - affects grouping
        this.mid = 0;       // 500-2000 Hz - affects speed
        this.highMid = 0;   // 2000-4000 Hz - affects rotation
        this.treble = 0;    // 4000-20000 Hz - affects shimmer/vibration
        
        // Choreography state
        this.formations = ['circle', 'spiral', 'grid', 'heart', 'star', 'random'];
        this.currentFormation = 'random';
        this.formationCenter = { x: 0.5, y: 0.5 };
        this.formationRadius = 0.3;
        
        // Visual effects
        this.colorPalettes = {
            'sunset': ['#FF6B6B', '#FF8E53', '#FE6B8B', '#FF8E53', '#FFA726'],
            'ocean': ['#00B4D8', '#0077B6', '#03045E', '#00B4D8', '#48CAE4'],
            'neon': ['#FF006E', '#8338EC', '#3A86FF', '#06FFB4', '#FFBE0B'],
            'aurora': ['#00FF41', '#00D9FF', '#7209B7', '#F72585', '#00FF41'],
            'monochrome': ['#FF0000', '#CC0000', '#990000', '#FF3333', '#FF6666']
        };
        this.currentPalette = 'neon';
        
        // Particle effects
        this.particles = [];
        this.maxParticles = 100;
        
        // Flow field for organic movement
        this.flowField = [];
        this.flowFieldResolution = 20;
        this.flowFieldTime = 0;
        this.initFlowField();
    }

    enable() {
        this.isEnabled = true;
        console.log('💃 Dance mode activated!');
        this.applyDancePhysics();
    }

    disable() {
        this.isEnabled = false;
        console.log('🛑 Dance mode deactivated');
        this.restoreNormalPhysics();
    }

    applyDancePhysics() {
        // Override normal lifeform behavior for dancing
        if (!this.originalMove) {
            this.originalMove = this.alife.moveLifeform.bind(this.alife);
            this.alife.moveLifeform = this.danceMove.bind(this);
        }
        
        // Disable gravity and combat for pure dance
        this.alife.session.gravityOn = false;
        
        // Set all lifeforms to non-aggressive for peaceful dancing
        for (const lifeform of this.alife.lifeforms.values()) {
            lifeform.isDancing = true;
            lifeform.danceVelocity = { x: 0, y: 0 };
            lifeform.danceAngle = Math.random() * Math.PI * 2;
            lifeform.personalRhythm = 0.8 + Math.random() * 0.4; // Personal dance style
        }
    }

    restoreNormalPhysics() {
        if (this.originalMove) {
            this.alife.moveLifeform = this.originalMove;
            this.originalMove = null;
        }
        
        for (const lifeform of this.alife.lifeforms.values()) {
            lifeform.isDancing = false;
        }
    }

    updateFromAudioData(audioData) {
        if (!this.isEnabled) return;
        
        // Extract frequency bands from audio data
        this.analyzeFrequencyBands(audioData.frequencyData);
        
        // Detect beats
        if (this.beatDetector.detectBeat(this.bass, audioData.volume)) {
            this.onBeat();
        }
        
        // Update flow field based on audio
        this.updateFlowField(audioData);
        
        // Create particles on loud moments
        if (audioData.volume > 0.7) {
            this.createBurstParticles(audioData.volume);
        }
        
        // Update particles
        this.updateParticles();
        
        // Change formation on significant audio events
        if (audioData.spectralCentroid > 2000 && Math.random() < 0.02) {
            this.changeFormation();
        }
    }

    analyzeFrequencyBands(frequencyData) {
        if (!frequencyData || frequencyData.length === 0) return;
        
        const nyquist = 22050; // Half of 44100 Hz sample rate
        const binWidth = nyquist / frequencyData.length;
        
        // Calculate band indices
        const bassEnd = Math.floor(250 / binWidth);
        const lowMidEnd = Math.floor(500 / binWidth);
        const midEnd = Math.floor(2000 / binWidth);
        const highMidEnd = Math.floor(4000 / binWidth);
        
        // Calculate average energy in each band
        this.bass = this.calculateBandEnergy(frequencyData, 1, bassEnd);
        this.lowMid = this.calculateBandEnergy(frequencyData, bassEnd, lowMidEnd);
        this.mid = this.calculateBandEnergy(frequencyData, lowMidEnd, midEnd);
        this.highMid = this.calculateBandEnergy(frequencyData, midEnd, highMidEnd);
        this.treble = this.calculateBandEnergy(frequencyData, highMidEnd, frequencyData.length);
    }

    calculateBandEnergy(data, start, end) {
        let sum = 0;
        for (let i = start; i < end && i < data.length; i++) {
            sum += data[i];
        }
        return sum / (end - start) / 255; // Normalize to 0-1
    }

    onBeat() {
        const now = Date.now();
        if (this.lastBeatTime > 0) {
            this.beatInterval = now - this.lastBeatTime;
            this.currentBPM = 60000 / this.beatInterval;
        }
        this.lastBeatTime = now;
        
        // Visual beat feedback
        this.createBeatWave();
        
        // Make lifeforms pulse on beat
        for (const lifeform of this.alife.lifeforms.values()) {
            lifeform.beatPulse = 1.5; // Will decay over time
        }
    }

    danceMove(lifeform) {
        if (!lifeform.isDancing) {
            this.originalMove(lifeform);
            return;
        }
        
        const oldX = lifeform.x;
        const oldY = lifeform.y;
        
        // Get flow field influence
        const flow = this.getFlowVector(lifeform.x, lifeform.y);
        
        // Calculate dance movement based on current mode
        let dx = 0, dy = 0;
        
        switch (this.danceMode) {
            case 'flow':
                dx = flow.x * (1 + this.bass * 2);
                dy = flow.y * (1 + this.bass * 2);
                break;
                
            case 'pulse':
                const angle = Math.atan2(
                    lifeform.y - this.alife.gridSize / 2,
                    lifeform.x - this.alife.gridSize / 2
                );
                const pulseForce = Math.sin(Date.now() * 0.001 * this.currentBPM / 60) * this.bass;
                dx = Math.cos(angle) * pulseForce * 2;
                dy = Math.sin(angle) * pulseForce * 2;
                break;
                
            case 'spiral':
                const spiralAngle = lifeform.danceAngle + (this.mid * 0.1);
                const spiralRadius = 20 + this.bass * 30;
                dx = Math.cos(spiralAngle) * spiralRadius * 0.05;
                dy = Math.sin(spiralAngle) * spiralRadius * 0.05;
                lifeform.danceAngle = spiralAngle;
                break;
                
            case 'wave':
                const wavePhase = (lifeform.x / this.alife.gridSize) * Math.PI * 2;
                dy = Math.sin(Date.now() * 0.001 + wavePhase) * this.bass * 3;
                dx = this.mid * 2 - 1; // Drift based on mid frequencies
                break;
                
            case 'constellation':
                // Move towards formation position
                const targetPos = this.getFormationPosition(lifeform);
                dx = (targetPos.x - lifeform.x) * 0.1;
                dy = (targetPos.y - lifeform.y) * 0.1;
                // Add shimmer based on treble
                dx += (Math.random() - 0.5) * this.treble * 2;
                dy += (Math.random() - 0.5) * this.treble * 2;
                break;
        }
        
        // Add personal rhythm variation
        dx *= lifeform.personalRhythm;
        dy *= lifeform.personalRhythm;
        
        // Apply beat pulse if active
        if (lifeform.beatPulse > 1) {
            dx *= lifeform.beatPulse;
            dy *= lifeform.beatPulse;
            lifeform.beatPulse *= 0.9; // Decay
        }
        
        // Update velocity with smoothing
        lifeform.danceVelocity.x = lifeform.danceVelocity.x * 0.8 + dx * 0.2;
        lifeform.danceVelocity.y = lifeform.danceVelocity.y * 0.8 + dy * 0.2;
        
        // Apply movement
        let newX = lifeform.x + lifeform.danceVelocity.x;
        let newY = lifeform.y + lifeform.danceVelocity.y;
        
        // Wrap around edges for continuous flow
        if (newX < 0) newX = this.alife.gridSize - 1;
        if (newX >= this.alife.gridSize) newX = 0;
        if (newY < 0) newY = this.alife.gridSize - 1;
        if (newY >= this.alife.gridSize) newY = 0;
        
        // Update position
        const oldKey = `${oldX},${oldY}`;
        const newKey = `${Math.floor(newX)},${Math.floor(newY)}`;
        
        if (!this.alife.worldSpace.has(newKey) || oldKey === newKey) {
            this.alife.worldSpace.delete(oldKey);
            lifeform.x = newX;
            lifeform.y = newY;
            this.alife.worldSpace.set(newKey, lifeform.id);
        }
    }

    initFlowField() {
        const cols = this.flowFieldResolution;
        const rows = this.flowFieldResolution;
        
        for (let y = 0; y < rows; y++) {
            this.flowField[y] = [];
            for (let x = 0; x < cols; x++) {
                this.flowField[y][x] = { x: 0, y: 0 };
            }
        }
    }

    updateFlowField(audioData) {
        this.flowFieldTime += 0.01 * (1 + audioData.volume);
        
        const cols = this.flowFieldResolution;
        const rows = this.flowFieldResolution;
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // Perlin noise-like flow
                const angle = (
                    Math.sin(x * 0.1 + this.flowFieldTime) * 
                    Math.cos(y * 0.1 + this.flowFieldTime * 0.7) +
                    audioData.pitch * 0.01
                ) * Math.PI * 2;
                
                this.flowField[y][x] = {
                    x: Math.cos(angle) * (0.5 + this.bass),
                    y: Math.sin(angle) * (0.5 + this.bass)
                };
            }
        }
    }

    getFlowVector(x, y) {
        const col = Math.floor(x / this.alife.gridSize * this.flowFieldResolution);
        const row = Math.floor(y / this.alife.gridSize * this.flowFieldResolution);
        
        if (row >= 0 && row < this.flowFieldResolution && 
            col >= 0 && col < this.flowFieldResolution) {
            return this.flowField[row][col];
        }
        
        return { x: 0, y: 0 };
    }

    getFormationPosition(lifeform) {
        const center = {
            x: this.alife.gridSize * this.formationCenter.x,
            y: this.alife.gridSize * this.formationCenter.y
        };
        const radius = this.alife.gridSize * this.formationRadius;
        
        switch (this.currentFormation) {
            case 'circle':
                const angle = (lifeform.id / this.alife.lifeforms.size) * Math.PI * 2;
                return {
                    x: center.x + Math.cos(angle) * radius,
                    y: center.y + Math.sin(angle) * radius
                };
                
            case 'spiral':
                const spiralAngle = (lifeform.id / this.alife.lifeforms.size) * Math.PI * 4;
                const spiralRadius = radius * (lifeform.id / this.alife.lifeforms.size);
                return {
                    x: center.x + Math.cos(spiralAngle) * spiralRadius,
                    y: center.y + Math.sin(spiralAngle) * spiralRadius
                };
                
            case 'grid':
                const gridSize = Math.ceil(Math.sqrt(this.alife.lifeforms.size));
                const gridX = lifeform.id % gridSize;
                const gridY = Math.floor(lifeform.id / gridSize);
                return {
                    x: center.x - radius + (gridX / gridSize) * radius * 2,
                    y: center.y - radius + (gridY / gridSize) * radius * 2
                };
                
            case 'heart':
                const t = (lifeform.id / this.alife.lifeforms.size) * Math.PI * 2;
                const heartX = 16 * Math.pow(Math.sin(t), 3);
                const heartY = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
                return {
                    x: center.x + heartX * radius / 16,
                    y: center.y + heartY * radius / 16
                };
                
            case 'star':
                const starAngle = (lifeform.id / this.alife.lifeforms.size) * Math.PI * 10;
                const starRadius = radius * (0.5 + 0.5 * Math.cos(starAngle * 5));
                return {
                    x: center.x + Math.cos(starAngle) * starRadius,
                    y: center.y + Math.sin(starAngle) * starRadius
                };
                
            default:
                return { x: lifeform.x, y: lifeform.y };
        }
    }

    changeFormation() {
        const currentIndex = this.formations.indexOf(this.currentFormation);
        this.currentFormation = this.formations[(currentIndex + 1) % this.formations.length];
        console.log(`✨ Formation changed to: ${this.currentFormation}`);
    }

    createBeatWave() {
        // Create expanding wave effect from center
        const wave = {
            x: this.alife.gridSize / 2,
            y: this.alife.gridSize / 2,
            radius: 0,
            maxRadius: this.alife.gridSize / 2,
            opacity: 1
        };
        
        // Store wave for rendering
        if (!this.beatWaves) this.beatWaves = [];
        this.beatWaves.push(wave);
        
        // Clean old waves
        this.beatWaves = this.beatWaves.filter(w => w.opacity > 0);
    }

    createBurstParticles(intensity) {
        const count = Math.floor(intensity * 10);
        
        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            
            this.particles.push({
                x: Math.random() * this.alife.canvas.width,
                y: Math.random() * this.alife.canvas.height,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                color: this.getRandomColor()
            });
        }
    }

    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.02;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            
            return particle.life > 0;
        });
    }

    getRandomColor() {
        const colors = this.colorPalettes[this.currentPalette];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    renderDanceEffects(ctx) {
        if (!this.isEnabled) return;
        
        // Render beat waves
        if (this.beatWaves) {
            ctx.save();
            this.beatWaves.forEach(wave => {
                ctx.strokeStyle = `rgba(255, 255, 255, ${wave.opacity * 0.3})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(
                    wave.x * this.alife.cellSize,
                    wave.y * this.alife.cellSize,
                    wave.radius * this.alife.cellSize,
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
                
                wave.radius += 0.5;
                wave.opacity -= 0.02;
            });
            ctx.restore();
        }
        
        // Render particles
        ctx.save();
        this.particles.forEach(particle => {
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.life;
            ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
        });
        ctx.restore();
    }

    setDanceMode(mode) {
        if (this.formations.includes(mode)) {
            this.danceMode = 'constellation';
            this.currentFormation = mode;
        } else {
            this.danceMode = mode;
        }
        console.log(`💃 Dance mode set to: ${this.danceMode}`);
    }

    setPalette(paletteName) {
        if (this.colorPalettes[paletteName]) {
            this.currentPalette = paletteName;
            console.log(`🎨 Color palette set to: ${paletteName}`);
        }
    }
}

// Beat detection helper class
class BeatDetector {
    constructor() {
        this.energyHistory = [];
        this.historySize = 43; // ~1 second at 43fps
        this.threshold = 1.3; // Energy must be 30% above average
        this.lastBeatTime = 0;
        this.minBeatInterval = 100; // Minimum ms between beats
    }

    detectBeat(currentEnergy, volume) {
        this.energyHistory.push(currentEnergy);
        if (this.energyHistory.length > this.historySize) {
            this.energyHistory.shift();
        }
        
        if (this.energyHistory.length < 10) return false;
        
        const averageEnergy = this.energyHistory.reduce((a, b) => a + b) / this.energyHistory.length;
        const now = Date.now();
        
        if (currentEnergy > averageEnergy * this.threshold && 
            volume > 0.3 &&
            now - this.lastBeatTime > this.minBeatInterval) {
            this.lastBeatTime = now;
            return true;
        }
        
        return false;
    }
}

// Export for use in main app
window.DanceController = DanceController;