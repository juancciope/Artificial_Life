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
        
        // Enhanced beat detection with frequency analysis
        const totalEnergy = this.bass + this.lowMid + this.mid + this.highMid + this.treble;
        const beatInfo = this.beatDetector.detectBeat(
            totalEnergy, 
            audioData.volume, 
            this.bass, 
            this.mid, 
            this.treble
        );
        
        // Handle different types of beats
        if (beatInfo.beat) {
            this.onBeat(beatInfo);
        }
        
        // Update rhythmic movement for all lifeforms
        this.updateRhythmicMovement(beatInfo);
        
        // Update flow field based on audio
        this.updateFlowField(audioData);
        
        // Create particles based on beat strength and type
        if (beatInfo.beat && beatInfo.strength > 0.8) {
            this.createBurstParticles(beatInfo.strength, beatInfo.type);
        } else if (audioData.volume > 0.6) {
            this.createBurstParticles(audioData.volume * 0.5);
        }
        
        // Update particles
        this.updateParticles();
        
        // Dynamic formation changes based on music intensity
        const musicIntensity = (this.bass + this.mid + this.treble) / 3;
        if (musicIntensity > 0.7 && beatInfo.confidence > 0.6 && Math.random() < 0.01) {
            this.changeFormation();
        }
        
        // Store current beat info for movement calculations
        this.currentBeatInfo = beatInfo;
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

    onBeat(beatInfo) {
        // Update BPM and timing from enhanced beat detector
        this.currentBPM = beatInfo.bpm;
        this.beatInterval = 60000 / this.currentBPM;
        
        // Visual beat feedback with different intensities
        this.createBeatWave(beatInfo.strength, beatInfo.type);
        
        // Make lifeforms react to different types of beats
        const basePulse = 1.2 + (beatInfo.strength * 0.8);
        
        for (const lifeform of this.alife.lifeforms.values()) {
            // Different reactions for different beat types
            switch (beatInfo.type) {
                case 'kick':
                    lifeform.beatPulse = basePulse * 1.3; // Strong kick reaction
                    lifeform.lastKickTime = Date.now();
                    break;
                case 'snare':
                    lifeform.beatPulse = basePulse * 1.1; // Medium snare reaction
                    lifeform.danceAngle += Math.PI / 4; // Quick turn
                    break;
                case 'hihat':
                    lifeform.beatPulse = basePulse * 0.8; // Subtle hi-hat
                    lifeform.shimmer = 1.5; // Add shimmer effect
                    break;
                case 'offbeat':
                    lifeform.beatPulse = basePulse * 0.6; // Gentle off-beat
                    break;
                default:
                    lifeform.beatPulse = basePulse;
            }
            
            // Add personal variation
            lifeform.beatPulse *= (0.8 + Math.random() * 0.4);
        }
        
        console.log(`🥁 ${beatInfo.type.toUpperCase()} beat detected! BPM: ${Math.round(beatInfo.bpm)} (${Math.round(beatInfo.confidence * 100)}% confidence)`);
    }
    
    updateRhythmicMovement(beatInfo) {
        if (!beatInfo) return;
        
        // Get the current phase within the beat cycle (0-1)
        const beatPhase = this.beatDetector.getSubBeatPhase();
        
        // Update all dancing lifeforms with rhythmic movement
        for (const lifeform of this.alife.lifeforms.values()) {
            if (!lifeform.isDancing) continue;
            
            // Rhythmic breathing effect
            const breathingScale = 1 + Math.sin(beatPhase * Math.PI * 2) * 0.1;
            lifeform.rhythmicScale = breathingScale;
            
            // Rhythmic color intensity
            const colorIntensity = 0.7 + Math.sin(beatPhase * Math.PI * 2) * 0.3;
            lifeform.rhythmicColorIntensity = colorIntensity;
            
            // Beat anticipation - move slightly before the beat
            const anticipation = Math.sin((beatPhase + 0.8) * Math.PI * 2) * 0.5;
            lifeform.beatAnticipation = anticipation;
            
            // Decay effects
            if (lifeform.beatPulse > 1) {
                lifeform.beatPulse *= 0.92; // Smooth decay
            }
            if (lifeform.shimmer > 1) {
                lifeform.shimmer *= 0.85; // Shimmer decay
            }
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
        
        // Calculate dance movement based on current mode with rhythm
        let dx = 0, dy = 0;
        
        // Get beat phase for synchronized movement
        const beatPhase = this.beatDetector ? this.beatDetector.getSubBeatPhase() : 0;
        const rhythmMultiplier = 1 + Math.sin(beatPhase * Math.PI * 2) * 0.3;
        
        // Add beat anticipation to movement
        const anticipationForce = lifeform.beatAnticipation || 0;
        
        switch (this.danceMode) {
            case 'flow':
                dx = flow.x * (1 + this.bass * 2) * rhythmMultiplier;
                dy = flow.y * (1 + this.bass * 2) * rhythmMultiplier;
                // Add kick drum bounce
                if (lifeform.lastKickTime && Date.now() - lifeform.lastKickTime < 200) {
                    dy -= this.bass * 3;
                }
                break;
                
            case 'pulse':
                const angle = Math.atan2(
                    lifeform.y - this.alife.gridSize / 2,
                    lifeform.x - this.alife.gridSize / 2
                );
                // Synchronized pulsing to BPM
                const pulseForce = Math.sin(beatPhase * Math.PI * 2) * this.bass * rhythmMultiplier;
                dx = Math.cos(angle) * pulseForce * 3;
                dy = Math.sin(angle) * pulseForce * 3;
                break;
                
            case 'spiral':
                // Rhythm-synced spiral rotation
                const spiralSpeed = (this.currentBPM / 120) * 0.1 * rhythmMultiplier;
                const spiralAngle = (lifeform.danceAngle || 0) + spiralSpeed;
                const spiralRadius = (20 + this.bass * 30) * rhythmMultiplier;
                dx = Math.cos(spiralAngle) * spiralRadius * 0.05;
                dy = Math.sin(spiralAngle) * spiralRadius * 0.05;
                lifeform.danceAngle = spiralAngle;
                break;
                
            case 'wave':
                const wavePhase = (lifeform.x / this.alife.gridSize) * Math.PI * 2;
                // Wave synchronized to beat
                const waveSpeed = (this.currentBPM / 60) * 0.001;
                dy = Math.sin(Date.now() * waveSpeed + wavePhase) * this.bass * 4 * rhythmMultiplier;
                dx = (this.mid * 2 - 1) * rhythmMultiplier;
                break;
                
            case 'constellation':
                // Move towards formation position with rhythm
                const targetPos = this.getFormationPosition(lifeform);
                dx = (targetPos.x - lifeform.x) * 0.1 * rhythmMultiplier;
                dy = (targetPos.y - lifeform.y) * 0.1 * rhythmMultiplier;
                // Rhythmic shimmer
                const shimmerIntensity = (lifeform.shimmer || 1) * this.treble;
                dx += (Math.random() - 0.5) * shimmerIntensity * 2;
                dy += (Math.random() - 0.5) * shimmerIntensity * 2;
                break;
        }
        
        // Apply beat anticipation
        dx += anticipationForce * 0.5;
        dy += anticipationForce * 0.5;
        
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

    createBeatWave(strength = 1, beatType = 'general') {
        // Create expanding wave effect from center with beat-specific properties
        const wave = {
            x: this.alife.gridSize / 2,
            y: this.alife.gridSize / 2,
            radius: 0,
            maxRadius: (this.alife.gridSize / 2) * strength,
            opacity: Math.min(1, strength),
            type: beatType,
            speed: 0.3 + (strength * 0.7)
        };
        
        // Different colors for different beat types
        switch (beatType) {
            case 'kick':
                wave.color = '#FF3030'; // Red for kick drums
                break;
            case 'snare':
                wave.color = '#30FF30'; // Green for snares
                break;
            case 'hihat':
                wave.color = '#3030FF'; // Blue for hi-hats
                break;
            case 'offbeat':
                wave.color = '#FFFF30'; // Yellow for off-beats
                break;
            default:
                wave.color = '#FFFFFF'; // White for general beats
        }
        
        // Store wave for rendering
        if (!this.beatWaves) this.beatWaves = [];
        this.beatWaves.push(wave);
        
        // Clean old waves
        this.beatWaves = this.beatWaves.filter(w => w.opacity > 0);
    }

    createBurstParticles(intensity, beatType = 'general') {
        const baseCount = Math.floor(intensity * 8);
        let count = baseCount;
        
        // Different particle counts for different beat types
        switch (beatType) {
            case 'kick':
                count = baseCount * 1.5; // More particles for kicks
                break;
            case 'snare':
                count = baseCount * 1.2; // Moderate particles for snares
                break;
            case 'hihat':
                count = baseCount * 0.6; // Fewer, more subtle particles
                break;
        }
        
        count = Math.min(count, 20); // Cap particle count
        
        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (2 + Math.random() * 4) * intensity;
            
            // Beat-specific particle properties
            let particleColor = this.getRandomColor();
            let particleLife = 1;
            
            if (beatType === 'kick') {
                particleColor = '#FF6B6B'; // Red-ish for kicks
                particleLife = 1.2;
            } else if (beatType === 'snare') {
                particleColor = '#4ECDC4'; // Teal-ish for snares
                particleLife = 0.8;
            } else if (beatType === 'hihat') {
                particleColor = '#FFE66D'; // Yellow-ish for hi-hats
                particleLife = 0.6;
            }
            
            this.particles.push({
                x: Math.random() * this.alife.canvas.width,
                y: Math.random() * this.alife.canvas.height,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: particleLife,
                maxLife: particleLife,
                color: particleColor,
                beatType: beatType
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
        
        // Render beat waves with enhanced visuals
        if (this.beatWaves) {
            ctx.save();
            this.beatWaves.forEach(wave => {
                // Use beat-specific colors
                const alpha = wave.opacity * 0.4;
                ctx.strokeStyle = wave.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba').replace('#', 'rgba(') || `rgba(255, 255, 255, ${alpha})`;
                ctx.lineWidth = 2 + (wave.opacity * 2);
                ctx.beginPath();
                ctx.arc(
                    wave.x * this.alife.cellSize,
                    wave.y * this.alife.cellSize,
                    wave.radius * this.alife.cellSize,
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
                
                // Beat-specific expansion speeds
                wave.radius += wave.speed || 0.5;
                wave.opacity -= 0.015;
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

// Enhanced beat detection and rhythm analysis
class BeatDetector {
    constructor() {
        this.energyHistory = [];
        this.historySize = 43; // ~1 second at 43fps
        this.threshold = 1.2; // Lowered for more sensitive detection
        this.lastBeatTime = 0;
        this.minBeatInterval = 200; // Minimum ms between beats (max 300 BPM)
        this.maxBeatInterval = 2000; // Maximum ms between beats (min 30 BPM)
        
        // BPM tracking
        this.beatIntervals = [];
        this.intervalHistorySize = 8;
        this.averageBPM = 120;
        this.confidence = 0;
        
        // Sub-beat detection for more precise dancing
        this.subBeatCounter = 0;
        this.expectedBeatTime = 0;
        
        // Different energy thresholds for different types of beats
        this.kickThreshold = 1.4;  // Strong kicks
        this.snareThreshold = 1.2; // Snare hits
        this.hihatThreshold = 1.1; // Hi-hat patterns
    }

    detectBeat(currentEnergy, volume, bassEnergy = 0, midEnergy = 0, trebleEnergy = 0) {
        this.energyHistory.push(currentEnergy);
        if (this.energyHistory.length > this.historySize) {
            this.energyHistory.shift();
        }
        
        if (this.energyHistory.length < 10) return { beat: false, type: 'none', strength: 0 };
        
        const averageEnergy = this.energyHistory.reduce((a, b) => a + b) / this.energyHistory.length;
        const now = Date.now();
        
        // Check for different types of beats
        let beatType = 'none';
        let beatStrength = 0;
        let isBeat = false;
        
        // Strong kick drum detection (bass-heavy)
        if (bassEnergy > averageEnergy * this.kickThreshold && 
            currentEnergy > averageEnergy * this.threshold &&
            volume > 0.4) {
            beatType = 'kick';
            beatStrength = Math.min((bassEnergy / averageEnergy) / this.kickThreshold, 2.0);
            isBeat = true;
        }
        // Snare detection (mid-range)
        else if (midEnergy > averageEnergy * this.snareThreshold && 
                 currentEnergy > averageEnergy * (this.threshold * 0.9) &&
                 volume > 0.3) {
            beatType = 'snare';
            beatStrength = Math.min((midEnergy / averageEnergy) / this.snareThreshold, 1.5);
            isBeat = true;
        }
        // Hi-hat or subtle beats (treble)
        else if (trebleEnergy > averageEnergy * this.hihatThreshold && 
                 volume > 0.2) {
            beatType = 'hihat';
            beatStrength = Math.min((trebleEnergy / averageEnergy) / this.hihatThreshold, 1.2);
            isBeat = true;
        }
        // General energy spike
        else if (currentEnergy > averageEnergy * this.threshold && volume > 0.25) {
            beatType = 'general';
            beatStrength = Math.min((currentEnergy / averageEnergy) / this.threshold, 1.8);
            isBeat = true;
        }
        
        // Timing validation
        if (isBeat && now - this.lastBeatTime > this.minBeatInterval) {
            const interval = now - this.lastBeatTime;
            
            // Only accept beats within reasonable BPM range
            if (interval < this.maxBeatInterval) {
                this.updateBPMTracking(interval);
                this.lastBeatTime = now;
                this.expectedBeatTime = now + this.getExpectedInterval();
                
                return { 
                    beat: true, 
                    type: beatType, 
                    strength: beatStrength,
                    bpm: this.averageBPM,
                    confidence: this.confidence
                };
            }
        }
        
        // Check for expected sub-beats (off-beat detection)
        const timeSinceLastBeat = now - this.lastBeatTime;
        const expectedInterval = this.getExpectedInterval();
        
        if (timeSinceLastBeat > expectedInterval * 0.4 && 
            timeSinceLastBeat < expectedInterval * 0.6 &&
            volume > 0.15) {
            return {
                beat: true,
                type: 'offbeat',
                strength: 0.6,
                bpm: this.averageBPM,
                confidence: this.confidence
            };
        }
        
        return { beat: false, type: 'none', strength: 0, bpm: this.averageBPM };
    }
    
    updateBPMTracking(interval) {
        this.beatIntervals.push(interval);
        if (this.beatIntervals.length > this.intervalHistorySize) {
            this.beatIntervals.shift();
        }
        
        // Calculate average BPM
        if (this.beatIntervals.length >= 3) {
            const avgInterval = this.beatIntervals.reduce((a, b) => a + b) / this.beatIntervals.length;
            this.averageBPM = 60000 / avgInterval;
            
            // Calculate confidence based on consistency
            const variance = this.beatIntervals.reduce((sum, interval) => {
                return sum + Math.pow(interval - avgInterval, 2);
            }, 0) / this.beatIntervals.length;
            
            const standardDeviation = Math.sqrt(variance);
            this.confidence = Math.max(0, 1 - (standardDeviation / avgInterval));
        }
    }
    
    getExpectedInterval() {
        return this.beatIntervals.length > 0 ? 
            this.beatIntervals.reduce((a, b) => a + b) / this.beatIntervals.length : 
            60000 / this.averageBPM;
    }
    
    // Get rhythmic subdivisions for more complex dancing
    getSubBeatPhase() {
        const timeSinceLastBeat = Date.now() - this.lastBeatTime;
        const expectedInterval = this.getExpectedInterval();
        return (timeSinceLastBeat % expectedInterval) / expectedInterval;
    }
}

// Export for use in main app
window.DanceController = DanceController;