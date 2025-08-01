class MIDIController {
    constructor(alife) {
        this.alife = alife;
        this.midiAccess = null;
        this.connectedDevices = new Map();
        this.initializeMIDI();
    }

    async initializeMIDI() {
        try {
            // Request MIDI access
            this.midiAccess = await navigator.requestMIDIAccess();
            console.log('MIDI Access granted!');
            
            // Set up MIDI device listeners
            this.midiAccess.onstatechange = (event) => this.onMIDIStateChange(event);
            
            // Connect to existing devices
            for (let input of this.midiAccess.inputs.values()) {
                this.connectMIDIDevice(input);
            }
            
            this.updateMIDIStatus('MIDI Ready - Connect your controller!');
            
            // Run connectivity test after 1 second
            setTimeout(() => {
                this.testMIDIConnectivity();
            }, 1000);
            
        } catch (error) {
            console.warn('MIDI not supported or access denied:', error);
            this.updateMIDIStatus('MIDI not available - browser or device limitation');
        }
    }

    connectMIDIDevice(input) {
        console.log(`🔌 Connected to MIDI device: ${input.name} (ID: ${input.id})`);
        this.connectedDevices.set(input.id, input);
        
        // Detect specific MIDI controllers
        const deviceName = input.name.toLowerCase();
        
        if (deviceName.includes('microlab')) {
            console.log('🎹 MicroLab Smart detected! Optimized controls activated.');
            console.log('💡 Use Mod Wheel for Radiation, Pitch Bend for Speed');
            console.log('💡 C1-G1: Basic controls, C2-G2: Advanced, C3+: Musical performance');
        } else if (deviceName.includes('irig') || deviceName.includes('i-rig')) {
            console.log('🎹 iRig Keys detected! Optimized controls activated.');
            console.log('💡 Full 37/49/61-key support with velocity sensitivity');
            console.log('💡 C1-G1: Basic controls, C2-G2: Advanced, C3+: Musical performance');
            console.log('💡 Use sustain pedal for Thanos Snap, if connected');
        } else if (deviceName.includes('oxygen')) {
            console.log('🎹 M-Audio Oxygen detected! Full studio controller activated.');
            console.log('💡 8 Faders + 8 Knobs + Transport controls available');
            console.log('💡 Faders: Visual/Audio mixing | Knobs: Life parameters');
            console.log('💡 Play/Stop: Life control | Record: Thanos Snap');
        } else if (deviceName.includes('minilab')) {
            console.log('🎹 MiniLab MkII detected! Full control surface activated.');
            console.log('💡 8 knobs, 8 pads, and full keyboard mapping available');
        }
        
        // Set up message handler
        input.onmidimessage = (message) => this.handleMIDIMessage(message);
        
        this.updateMIDIStatus(`🎹 Connected: ${input.name}`);
        
        // Provide audio instructions (user must manually enable due to browser policies)
        if (this.alife.audioSystem) {
            if (!this.alife.audioSystem.isEnabled) {
                console.log('🔊 IMPORTANT: Click "Enable Audio" button to hear sounds!');
                console.log('🔊 Browser autoplay policy requires user interaction to start audio');
            } else {
                console.log('🔊 Audio system is enabled and ready!');
            }
        }
    }

    onMIDIStateChange(event) {
        const device = event.port;
        
        if (device.type === 'input') {
            if (device.state === 'connected') {
                this.connectMIDIDevice(device);
            } else if (device.state === 'disconnected') {
                this.connectedDevices.delete(device.id);
                console.log(`Disconnected from: ${device.name}`);
                this.updateMIDIStatus('🎹 MIDI Ready - Connect your controller');
            }
        }
    }

    handleMIDIMessage(message) {
        const [status, data1, data2] = message.data;
        const channel = (status & 0x0F) + 1;
        const command = status & 0xF0;

        console.log(`🎛️ MIDI Input: Status=${status}, Data1=${data1}, Data2=${data2}, Channel=${channel}, Command=${command.toString(16)}`);

        // Handle Pitch Bend (special case - different status byte)
        if (command === 0xE0) {
            this.handlePitchBend(data1, data2);
            return;
        }

        // Route MIDI based on channel for music + control
        if (this.alife.audioSystem) {
            // For MicroLab: Allow all channels to trigger audio AND control
            // This enables musical performance while controlling ALife
            if (channel <= 8) {
                console.log(`🎵 Routing to audio system: Channel ${channel}`);
                this.alife.audioSystem.handleMIDIMessage(message);
                // Don't return - also process as control messages for MicroLab
            }
        }

        // Control Change (CC) messages - for knobs, mod wheel, etc.
        if (command === 0xB0) {
            this.handleControlChange(data1, data2);
        }
        
        // Note On messages - for keyboard and pads
        else if (command === 0x90 && data2 > 0) {
            console.log(`🎹 Note ON: ${data1} (${this.getNoteNameFromMIDI(data1)}), Velocity: ${data2}`);
            this.handleNoteOn(data1, data2);
            
            // Trigger audio effects for control functions
            if (this.alife.audioSystem) {
                this.triggerControlAudio(data1, data2);
            }
        }
        
        // Note Off messages
        else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
            console.log(`🎹 Note OFF: ${data1} (${this.getNoteNameFromMIDI(data1)})`);
            this.handleNoteOff(data1);
        }
    }

    triggerControlAudio(note, velocity) {
        if (!this.alife.audioSystem) return;

        switch(note) {
            case 39: // Thanos Snap
                const intensity = velocity > 100 ? 'intense' : 'normal';
                this.alife.audioSystem.playThanosSfx(intensity);
                break;
            case 50: // Radiation burst
                this.alife.audioSystem.playRadiationBurstSfx();
                break;
        }
    }

    handlePitchBend(lsb, msb) {
        // Pitch bend uses 14-bit resolution (0-16383), but we'll simplify to 0-127
        const value = msb; // Use MSB for simpler control
        this.alife.frameDelay = Math.floor(5 + (value * 95 / 127)); // 5-100ms delay
        console.log(`⏱️ Animation speed set via Pitch Bend: ${this.alife.frameDelay}ms delay (value: ${value})`);
    }

    handleControlChange(ccNumber, value) {
        // Debug: Log ALL CC messages to identify controls
        console.log(`🎛️ MIDI CC: ${ccNumber}, Value: ${value}`);
        
        const normalizedValue = value / 127; // Convert 0-127 to 0-1
        
        switch(ccNumber) {
            // === ARTURIA MICROLAB SMART CONTROLS ===
            
            // Mod Wheel (CC 1) - Primary control for Radiation
            case 1: // Modulation wheel - Radiation Control
                this.alife.session.radiation = Math.floor(value * 100 / 127);
                document.getElementById('radiationSlider').value = this.alife.session.radiation;
                document.getElementById('radiationValue').textContent = this.alife.session.radiation;
                console.log(`☢️ Radiation set to: ${this.alife.session.radiation} via Mod Wheel`);
                break;
                
            // === LEGACY MINILAB MKII SUPPORT (for users who have it) ===
            
            // Top row knobs - MiniLab MkII (kept for compatibility)
            case 74: // Knob 1 - Radiation (MiniLab MkII)
            case 16: // Knob 1 - Alternative mapping
            case 20: // Knob 1 - Some preset configurations
                this.alife.session.radiation = Math.floor(value * 100 / 127);
                document.getElementById('radiationSlider').value = this.alife.session.radiation;
                document.getElementById('radiationValue').textContent = this.alife.session.radiation;
                console.log(`✅ Radiation set to: ${this.alife.session.radiation} via CC ${ccNumber}`);
                break;
                
            case 71: // Knob 2 - Population Limit (MiniLab MkII)
                this.alife.session.populationLimit = Math.floor(20 + (value * 80 / 127)); // 20-100 range
                console.log(`👥 Population limit: ${this.alife.session.populationLimit}`);
                break;
                
            case 76: // Knob 3 - DNA Chaos Chance (MiniLab MkII)
                this.alife.session.dnaChaosChance = Math.floor(value * 50 / 127); // 0-50%
                console.log(`🧬 DNA Chaos: ${this.alife.session.dnaChaosChance}%`);
                break;
                
            case 77: // Knob 4 - Grid Size (MiniLab MkII)
                const newGridSize = Math.floor(32 + (value * 32 / 127)); // 32-64 range
                if (newGridSize !== this.alife.gridSize) {
                    this.alife.gridSize = newGridSize;
                    this.alife.canvas.width = this.alife.gridSize * this.alife.cellSize;
                    this.alife.canvas.height = this.alife.gridSize * this.alife.cellSize;
                    console.log(`📐 Grid size: ${this.alife.gridSize}x${this.alife.gridSize}`);
                }
                break;
                
            case 93: // Knob 5 - Cell Size (MiniLab MkII)
                this.alife.cellSize = Math.floor(4 + (value * 12 / 127)); // 4-16 pixel range
                this.alife.canvas.width = this.alife.gridSize * this.alife.cellSize;
                this.alife.canvas.height = this.alife.gridSize * this.alife.cellSize;
                console.log(`🔳 Cell size: ${this.alife.cellSize}px`);
                break;
                
            case 73: // Knob 6 - Animation Speed (MiniLab MkII)
                this.alife.frameDelay = Math.floor(10 + (value * 90 / 127)); // 10-100ms delay
                console.log(`⏱️ Frame delay: ${this.alife.frameDelay}ms`);
                break;
                
            case 75: // Knob 7 - Auto Spawn Rate (MiniLab MkII)
                this.alife.autoSpawnRate = Math.floor(value / 12.7); // 0-10 lifeforms per auto-spawn
                console.log(`🌱 Auto spawn rate: ${this.alife.autoSpawnRate}`);
                break;
                
            case 114: // Knob 8 - Visual Intensity (MiniLab MkII)
                this.alife.visualIntensity = Math.floor(2 + (value * 18 / 127)); // 2-20 blur
                console.log(`✨ Visual intensity: ${this.alife.visualIntensity}`);
                break;
                
            // Sustain Pedal (CC 64) - Common on iRig Keys and other controllers
            case 64: // Sustain Pedal
                if (value >= 64) { // Pedal pressed
                    console.log('🦶 Sustain pedal pressed - THANOS SNAP! 💀');
                    this.alife.thanosSnap();
                    this.createFeedbackMessage('THANOS SNAP! 💀', 'midi-feedback-kill');
                    if (this.alife.audioSystem) {
                        this.alife.audioSystem.playThanosSfx('intense');
                    }
                } else { // Pedal released
                    console.log('🦶 Sustain pedal released');
                }
                break;
                
            // Expression Pedal (CC 11) - Available on some iRig Keys models
            case 11: // Expression Pedal
                // Map expression pedal to population limit
                this.alife.session.populationLimit = Math.floor(10 + (value * 90 / 127)); // 10-100 range
                console.log(`👥 Population limit: ${this.alife.session.populationLimit}`);
                break;
                
            // Volume Control (CC 7) - Standard MIDI volume / M-Audio Oxygen Fader 1
            case 7: // Volume / Master Fader
                if (this.alife.audioSystem) {
                    this.alife.audioSystem.setMasterVolume(value / 127);
                    console.log(`🔊 Master volume: ${Math.round(value / 127 * 100)}%`);
                }
                break;
                
            // === M-AUDIO OXYGEN SERIES FADERS (CC 71-78) ===
            case 71: // Fader 2 - Music Volume
                if (this.alife.audioSystem) {
                    this.alife.audioSystem.setMusicVolume(value / 127);
                    console.log(`🎵 Music volume: ${Math.round(value / 127 * 100)}%`);
                }
                break;
                
            case 72: // Fader 3 - SFX Volume  
                if (this.alife.audioSystem) {
                    this.alife.audioSystem.setSfxVolume(value / 127);
                    console.log(`🔊 SFX volume: ${Math.round(value / 127 * 100)}%`);
                }
                break;
                
            case 73: // Fader 4 - Ambient Volume
                if (this.alife.audioSystem) {
                    this.alife.audioSystem.setAmbientVolume(value / 127);
                    console.log(`🌊 Ambient volume: ${Math.round(value / 127 * 100)}%`);
                }
                break;
                
            case 74: // Fader 5 - Radiation Level
                this.alife.session.radiation = Math.floor(value * 100 / 127);
                document.getElementById('radiationSlider').value = this.alife.session.radiation;
                document.getElementById('radiationValue').textContent = this.alife.session.radiation;
                this.showRadiationLevel();
                console.log(`☢️ Radiation: ${this.alife.session.radiation}%`);
                break;
                
            case 75: // Fader 6 - Population Limit
                this.alife.session.populationLimit = Math.floor(10 + (value * 90 / 127));
                console.log(`👥 Population limit: ${this.alife.session.populationLimit}`);
                break;
                
            case 76: // Fader 7 - DNA Chaos
                this.alife.session.dnaChaosChance = Math.floor(value * 50 / 127);
                console.log(`🧬 DNA Chaos: ${this.alife.session.dnaChaosChance}%`);
                break;
                
            case 77: // Fader 8 - Animation Speed
                this.alife.frameDelay = Math.floor(5 + (value * 95 / 127));
                console.log(`⏱️ Animation speed: ${this.alife.frameDelay}ms delay`);
                break;
                
            // === M-AUDIO OXYGEN SERIES KNOBS (CC 74-81, avoiding conflicts) ===
            case 78: // Knob 1 - Grid Size
                const newGridSize = Math.floor(32 + (value * 32 / 127));
                if (newGridSize !== this.alife.gridSize) {
                    this.alife.gridSize = newGridSize;
                    this.alife.canvas.width = this.alife.gridSize * this.alife.cellSize;
                    this.alife.canvas.height = this.alife.gridSize * this.alife.cellSize;
                    console.log(`📐 Grid size: ${this.alife.gridSize}x${this.alife.gridSize}`);
                }
                break;
                
            case 80: // Knob 2 - Cell Size
                this.alife.cellSize = Math.floor(4 + (value * 12 / 127));
                this.alife.canvas.width = this.alife.gridSize * this.alife.cellSize;
                this.alife.canvas.height = this.alife.gridSize * this.alife.cellSize;
                console.log(`🔳 Cell size: ${this.alife.cellSize}px`);
                break;
                
            case 81: // Knob 3 - Visual Intensity
                this.alife.visualIntensity = Math.floor(2 + (value * 18 / 127));
                console.log(`✨ Visual intensity: ${this.alife.visualIntensity}`);
                break;
                
            case 82: // Knob 4 - Dance Formation Speed
                if (this.alife.danceController) {
                    this.alife.danceController.formationChangeRate = value / 127;
                    console.log(`💃 Formation change rate: ${Math.round(this.alife.danceController.formationChangeRate * 100)}%`);
                }
                break;
                
            case 83: // Knob 5 - Beat Sensitivity
                if (this.alife.danceController && this.alife.danceController.beatDetector) {
                    this.alife.danceController.beatDetector.threshold = 1.0 + (value / 127);
                    console.log(`🥁 Beat sensitivity: ${this.alife.danceController.beatDetector.threshold.toFixed(2)}`);
                }
                break;
                
            case 84: // Knob 6 - Particle Intensity
                if (this.alife.danceController) {
                    this.alife.danceController.maxParticles = Math.floor(50 + (value * 150 / 127));
                    console.log(`✨ Max particles: ${this.alife.danceController.maxParticles}`);
                }
                break;
                
            case 85: // Knob 7 - Flow Field Speed
                if (this.alife.danceController) {
                    this.alife.danceController.flowFieldSpeed = 0.005 + (value * 0.02 / 127);
                    console.log(`🌊 Flow field speed: ${this.alife.danceController.flowFieldSpeed.toFixed(4)}`);
                }
                break;
                
            case 86: // Knob 8 - Color Intensity
                if (this.alife.danceController) {
                    this.alife.danceController.colorIntensityMultiplier = 0.5 + (value / 127);
                    console.log(`🎨 Color intensity: ${this.alife.danceController.colorIntensityMultiplier.toFixed(2)}`);
                }
                break;
                
            // === M-AUDIO OXYGEN TRANSPORT CONTROLS ===
            case 87: // Transport Play Button (some Oxygen models)
                console.log('▶️ Transport Play - Starting Life!');
                this.flashButton('startBtn');
                this.alife.startLife();
                break;
                
            case 88: // Transport Stop Button (some Oxygen models)
                console.log('⏹️ Transport Stop - Pausing Life!');
                this.flashButton('pauseBtn');
                this.alife.pauseLife();
                break;
                
            case 89: // Transport Record Button (some Oxygen models)
                console.log('⏺️ Transport Record - THANOS SNAP!');
                this.alife.thanosSnap();
                this.createFeedbackMessage('TRANSPORT THANOS! 💀', 'midi-feedback-kill');
                if (this.alife.audioSystem) {
                    this.alife.audioSystem.playThanosSfx('intense');
                }
                break;
                
            case 90: // Transport Fast Forward (some Oxygen models)
                // Speed up animation
                this.alife.frameDelay = Math.max(1, this.alife.frameDelay - 10);
                console.log(`⏩ Fast Forward - Speed: ${this.alife.frameDelay}ms`);
                break;
                
            case 91: // Transport Rewind (some Oxygen models)  
                // Slow down animation
                this.alife.frameDelay = Math.min(100, this.alife.frameDelay + 10);
                console.log(`⏪ Rewind - Speed: ${this.alife.frameDelay}ms`);
                break;
                
            // Other MiniLab MkII knobs (reserved - avoiding Oxygen conflicts)
            case 18: case 19: case 17: case 79:
                console.log(`Reserved MiniLab knob CC ${ccNumber}: ${value}`);
                break;
                
            // Unmapped controls - helpful debugging
            default:
                console.log(`🔍 UNMAPPED CC ${ccNumber} = ${value}`);
                console.log(`💡 MicroLab: Use Mod Wheel (CC 1) for Radiation, Pitch Bend for Speed`);
                console.log(`💡 MiniLab MkII: All knobs supported as before`);
                console.log(`💡 iRig Keys: Use Sustain Pedal (CC 64) for Thanos Snap`);
                console.log(`💡 M-Audio Oxygen: Faders 1-8 (CC 7,71-77), Knobs 1-8 (CC 78,80-86)`);
                break;
        }
    }

    handleNoteOn(note, velocity) {
        // Universal note mapping - optimized for MicroLab, MiniLab MkII, and iRig Keys
        console.log(`🎹 Note: ${note}, Velocity: ${velocity} (${this.getNoteNameFromMIDI(note)})`);
        
        switch(note) {
            // === UNIVERSAL MIDI KEYBOARD MAPPING ===
            // Works with all keyboards: MicroLab Smart (25-key), iRig Keys (37/49/61-key), MiniLab MkII
            // iRig Keys users benefit from extended range and velocity sensitivity
            
            // Lower octave (C1-B1): Basic Life Controls
            case 36: // C1 - Start Life
                this.flashButton('startBtn');
                this.alife.startLife();
                console.log('🚀 Life Started!');
                break;
                
            case 37: // C#1 - Pause/Resume
                if (this.alife.isRunning) {
                    this.flashButton('pauseBtn');
                    this.alife.pauseLife();
                    console.log('⏸️ Life Paused');
                } else {
                    this.flashButton('startBtn');
                    this.alife.startLife();
                    console.log('▶️ Life Resumed');
                }
                break;
                
            case 38: // D1 - Reset Everything
                this.flashButton('resetBtn');
                this.alife.resetLife();
                console.log('🔄 Life Reset');
                break;
                
            case 39: // D#1 - Thanos Snap (velocity sensitive)
                this.flashButton('thanosBtn', velocity > 100 ? 'intense' : 'normal');
                if (velocity > 100) {
                    this.thanosSnapIntense();
                    console.log('💀 Intense Thanos Snap (75% killed)');
                } else {
                    this.alife.thanosSnap();
                    console.log('👆 Thanos Snap (50% killed)');
                }
                break;
                
            case 40: // E1 - Toggle Gravity
                this.alife.session.gravityOn = !this.alife.session.gravityOn;
                document.getElementById('gravityToggle').checked = this.alife.session.gravityOn;
                this.flashToggle('gravityToggle');
                console.log(`🌍 Gravity: ${this.alife.session.gravityOn ? 'ON' : 'OFF'}`);
                break;
                
            case 41: // F1 - Toggle Trails
                this.alife.session.drawTrails = !this.alife.session.drawTrails;
                document.getElementById('trailsToggle').checked = this.alife.session.drawTrails;
                this.flashToggle('trailsToggle');
                console.log(`👻 Trails: ${this.alife.session.drawTrails ? 'ON' : 'OFF'}`);
                break;
                
            case 42: // F#1 - Spawn Burst (velocity sensitive)
                const spawnCount = Math.floor(velocity / 16) + 1; // 1-8 based on velocity
                this.showSpawnFeedback(spawnCount);
                for (let i = 0; i < spawnCount; i++) {
                    this.alife.createLifeform();
                }
                console.log(`🌱 Spawned ${spawnCount} lifeforms`);
                break;
                
            case 43: // G1 - Population Control (velocity sensitive)
                const killCount = Math.floor(velocity / 25) + 1; // 1-5 based on velocity
                this.showKillFeedback(killCount);
                this.killRandomLifeforms(killCount);
                console.log(`💀 Killed ${killCount} lifeforms`);
                break;
                
            // Middle octave (C2-B2): Advanced Controls
            case 48: // C2 - Emergency Stop
                this.flashButton('pauseBtn');
                this.alife.pauseLife();
                console.log('🛑 Emergency Stop');
                break;
                
            case 49: // C#2 - Population Limit Control
                // Velocity controls population limit
                this.alife.session.populationLimit = Math.floor(20 + (velocity * 80 / 127));
                console.log(`👥 Population limit: ${this.alife.session.populationLimit}`);
                break;
                
            case 50: // D2 - Radiation Burst
                this.showRadiationBurst();
                this.radiationBurst();
                console.log('☢️ Radiation Burst!');
                break;
                
            case 51: // D#2 - DNA Chaos Burst
                // Temporary chaos increase
                const originalChaos = this.alife.session.dnaChaosChance;
                this.alife.session.dnaChaosChance = Math.floor(velocity * 50 / 127);
                console.log(`🧬 DNA Chaos burst: ${this.alife.session.dnaChaosChance}%`);
                setTimeout(() => {
                    this.alife.session.dnaChaosChance = originalChaos;
                    console.log(`🧬 DNA Chaos reset to: ${originalChaos}%`);
                }, 3000);
                break;
                
            case 52: // E2 - Grid Size Control
                // Velocity controls grid size
                const newGridSize = Math.floor(32 + (velocity * 32 / 127));
                if (newGridSize !== this.alife.gridSize) {
                    this.alife.gridSize = newGridSize;
                    this.alife.canvas.width = this.alife.gridSize * this.alife.cellSize;
                    this.alife.canvas.height = this.alife.gridSize * this.alife.cellSize;
                    console.log(`📐 Grid size: ${this.alife.gridSize}x${this.alife.gridSize}`);
                }
                break;
                
            case 53: // F2 - Clear All / Reset
                this.flashButton('resetBtn');
                this.alife.resetLife();
                console.log('🧹 All cleared');
                break;
                
            case 54: // F#2 - Visual Intensity Control
                this.alife.visualIntensity = Math.floor(2 + (velocity * 18 / 127));
                console.log(`✨ Visual intensity: ${this.alife.visualIntensity}`);
                break;
                
            case 55: // G2 - Cell Size Control
                this.alife.cellSize = Math.floor(4 + (velocity * 12 / 127));
                this.alife.canvas.width = this.alife.gridSize * this.alife.cellSize;
                this.alife.canvas.height = this.alife.gridSize * this.alife.cellSize;
                console.log(`🔳 Cell size: ${this.alife.cellSize}px`);
                break;
                
            // Higher octave (C3+): Musical Performance + Spawning
            case 60: case 61: case 62: case 63: case 64: case 65: case 66: case 67: // C3-G3
            case 68: case 69: case 70: case 71: case 72: case 73: case 74: case 75: // Ab3-Eb4
                // Higher notes spawn multiple lifeforms based on velocity and pitch
                const noteSpawnCount = Math.floor((velocity / 127) * 5) + 1; // 1-5 spawns
                const pitchFactor = (note - 60) / 12; // Higher notes = more spawns
                const totalSpawns = Math.floor(noteSpawnCount * (1 + pitchFactor));
                
                for (let i = 0; i < totalSpawns; i++) {
                    this.alife.createLifeform();
                }
                console.log(`🎵 Musical spawn: ${totalSpawns} lifeforms (${this.getNoteNameFromMIDI(note)})`);
                break;
                
            // === LEGACY MINILAB MKII PAD SUPPORT ===
            // Keep existing pad mappings for MiniLab MkII compatibility
            // (Pads typically send notes 36-43 but we've already mapped those above)
            
            default:
                // Enhanced performance range for iRig Keys and other full-range controllers
                if (note >= 24 && note <= 108) { // Extended range for 61-key controllers
                    const velocityNormalized = velocity / 127;
                    
                    // iRig Keys enhanced velocity response
                    let performanceSpawns;
                    if (velocity < 32) {
                        performanceSpawns = 1; // Soft touch
                    } else if (velocity < 64) {
                        performanceSpawns = 2; // Medium touch
                    } else if (velocity < 96) {
                        performanceSpawns = 3; // Strong touch
                    } else {
                        performanceSpawns = 4; // Very strong touch
                    }
                    
                    // Create enhanced lifeforms with velocity-based characteristics
                    for (let i = 0; i < performanceSpawns; i++) {
                        const lifeform = this.alife.createLifeform();
                        if (lifeform) {
                            // iRig Keys benefit: Velocity affects lifeform characteristics
                            lifeform.strength = Math.floor(lifeform.strength * (0.5 + velocityNormalized));
                            lifeform.timeToLive = Math.floor(lifeform.timeToLive * (0.7 + velocityNormalized * 0.6));
                            
                            // High/low note special effects for extended range controllers
                            if (note >= 84) { // High notes - shimmer effect
                                lifeform.shimmer = 1.5 + velocityNormalized;
                            } else if (note <= 36) { // Low notes - bass boost
                                lifeform.beatPulse = 1.3 + velocityNormalized * 0.5;
                                lifeform.lastKickTime = Date.now();
                            }
                        }
                    }
                    
                    console.log(`🎹 ${this.getNoteNameFromMIDI(note)} (vel:${velocity}): ${performanceSpawns} enhanced lifeforms`);
                    
                    // Send to audio system for musical performance
                    if (this.alife.audioSystem) {
                        this.alife.audioSystem.handleMusicMIDI(0x90, note, velocity, 1);
                    }
                    
                } else {
                    console.log(`❓ Note outside range: ${note} (${this.getNoteNameFromMIDI(note)}), Velocity: ${velocity}`);
                    console.log(`💡 iRig Keys: Extended 24-108 note range supported!`);
                }
        }
    }
    
    // Helper function to convert MIDI note to readable name
    getNoteNameFromMIDI(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor((midiNote - 12) / 12);
        const noteIndex = midiNote % 12;
        return `${noteNames[noteIndex]}${octave}`;
    }
    
    // Additional MiniLab MkII specific functions
    thanosSnapIntense() {
        const lifeforms = Array.from(this.alife.lifeforms.values());
        const toRemove = Math.floor(lifeforms.length * 0.75); // Kill 75%
        
        for (let i = 0; i < toRemove; i++) {
            if (lifeforms.length > 0) {
                const randomIndex = Math.floor(Math.random() * lifeforms.length);
                const lifeform = lifeforms[randomIndex];
                this.alife.removeLifeform(lifeform.id);
                lifeforms.splice(randomIndex, 1);
            }
        }
    }
    
    killRandomLifeforms(count) {
        const lifeforms = Array.from(this.alife.lifeforms.values());
        const toRemove = Math.min(count, lifeforms.length);
        
        for (let i = 0; i < toRemove; i++) {
            if (lifeforms.length > 0) {
                const randomIndex = Math.floor(Math.random() * lifeforms.length);
                const lifeform = lifeforms[randomIndex];
                this.alife.removeLifeform(lifeform.id);
                lifeforms.splice(randomIndex, 1);
            }
        }
    }
    
    radiationBurst() {
        // Temporary radiation spike
        const originalRadiation = this.alife.session.radiation;
        this.alife.session.radiation = 100;
        document.getElementById('radiationSlider').value = 100;
        document.getElementById('radiationValue').textContent = '100';
        
        // Reset after 2 seconds
        setTimeout(() => {
            this.alife.session.radiation = originalRadiation;
            document.getElementById('radiationSlider').value = originalRadiation;
            document.getElementById('radiationValue').textContent = originalRadiation.toString();
        }, 2000);
    }

    // Visual feedback functions
    flashButton(buttonId, intensity = 'normal') {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        // Add flash class based on intensity
        const flashClass = intensity === 'intense' ? 'midi-flash-intense' : 'midi-flash';
        button.classList.add(flashClass);
        
        // Remove class after animation
        setTimeout(() => {
            button.classList.remove(flashClass);
        }, 300);
    }

    flashToggle(toggleId) {
        const toggle = document.getElementById(toggleId);
        if (!toggle) return;
        
        // Flash the parent label
        const label = toggle.closest('.toggle');
        if (label) {
            label.classList.add('midi-flash');
            setTimeout(() => {
                label.classList.remove('midi-flash');
            }, 300);
        }
    }

    showSpawnFeedback(count) {
        // Flash spawn indication
        this.showTemporaryMessage(`+${count} Lifeforms Spawned!`, 'spawn');
    }

    showKillFeedback(count) {
        // Flash kill indication
        this.showTemporaryMessage(`-${count} Lifeforms Killed!`, 'kill');
    }

    showRadiationBurst() {
        // Show radiation burst effect
        this.showTemporaryMessage('☢️ RADIATION BURST!', 'radiation');
        
        // Flash the radiation slider
        const slider = document.getElementById('radiationSlider');
        if (slider) {
            slider.classList.add('midi-flash-intense');
            setTimeout(() => {
                slider.classList.remove('midi-flash-intense');
            }, 2000);
        }
    }

    showTemporaryMessage(message, type) {
        // Create temporary message overlay
        const messageDiv = document.createElement('div');
        messageDiv.className = `midi-feedback midi-feedback-${type}`;
        messageDiv.textContent = message;
        
        // Position over canvas
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer) {
            canvasContainer.appendChild(messageDiv);
            
            // Remove after animation
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 1500);
        }
    }

    handleNoteOff(note) {
        // Handle note off if needed for sustained effects
    }

    updateMIDIStatus(message) {
        const statusElement = document.querySelector('.midi-ready p');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    // Test function to verify MIDI connectivity
    testMIDIConnectivity() {
        console.log('🧪 MIDI Connectivity Test:');
        console.log(`- MIDI Access: ${this.midiAccess ? '✅ Available' : '❌ Not available'}`);
        console.log(`- Connected Devices: ${this.connectedDevices.size}`);
        
        if (this.connectedDevices.size > 0) {
            for (let [id, device] of this.connectedDevices) {
                console.log(`  📱 ${device.name} (${id})`);
            }
        }
        
        if (this.alife.audioSystem) {
            console.log(`- Audio System: ${this.alife.audioSystem.isEnabled ? '✅ Enabled' : '❌ Disabled - Click "Enable Audio"'}`);
            console.log(`- Audio Context State: ${this.alife.audioSystem.audioContext?.state || 'Not initialized'}`);
        } else {
            console.log('- Audio System: ❌ Not initialized');
        }
        
        console.log('💡 Play any key on your MicroLab to test MIDI input...');
    }

    // Method to get MIDI mapping info for both MicroLab and MiniLab MkII
    getMIDIMapping() {
        return {
            // === ARTURIA MICROLAB SMART MAPPING ===
            microlab: {
                controls: {
                    'Mod Wheel (CC 1)': '☢️ Radiation Level (0-100) - Primary Control',
                    'Pitch Bend (CC 224)': '⏱️ Animation Speed (5-100ms delay)'
                },
                octave1: {
                    'C1 (36)': '🚀 Start Life',
                    'C#1 (37)': '⏸️ Pause/Resume Toggle',
                    'D1 (38)': '🔄 Reset Everything',
                    'D#1 (39)': '👆 Thanos Snap (velocity sensitive)',
                    'E1 (40)': '🌍 Toggle Gravity',
                    'F1 (41)': '👻 Toggle Trails',
                    'F#1 (42)': '🌱 Spawn Burst (velocity = count)',
                    'G1 (43)': '💀 Kill Random (velocity = count)'
                },
                octave2: {
                    'C2 (48)': '🛑 Emergency Stop',
                    'C#2 (49)': '👥 Population Limit (velocity controls)',
                    'D2 (50)': '☢️ Radiation Burst (2 sec)',
                    'D#2 (51)': '🧬 DNA Chaos Burst (velocity = intensity)',
                    'E2 (52)': '📐 Grid Size (velocity controls)',
                    'F2 (53)': '🧹 Clear All',
                    'F#2 (54)': '✨ Visual Intensity (velocity controls)',
                    'G2 (55)': '🔳 Cell Size (velocity controls)'
                },
                performance: {
                    'C3+ (60+)': '🎵 Musical Performance + Lifeform Spawning',
                    'Higher Notes': 'More spawns, pitch-sensitive',
                    'Any Note': 'Velocity-sensitive spawning in performance range'
                }
            },
            
            // === LEGACY MINILAB MKII SUPPORT ===
            minilab: {
                topRowKnobs: {
                    'Knob 1 (CC 74)': 'Radiation Level (0-100)',
                    'Knob 2 (CC 71)': 'Population Limit (20-100)', 
                    'Knob 3 (CC 76)': 'DNA Chaos Chance (0-50%)',
                    'Knob 4 (CC 77)': 'Grid Size (32-64)',
                    'Knob 5 (CC 93)': 'Cell Size (4-16px)',
                    'Knob 6 (CC 73)': 'Animation Speed',
                    'Knob 7 (CC 75)': 'Auto Spawn Rate',
                    'Knob 8 (CC 114)': 'Visual Intensity'
                },
                pads: {
                    'Pad 1': 'Start Life',
                    'Pad 2': 'Pause/Resume (Smart Toggle)',
                    'Pad 3': 'Reset Everything',
                    'Pad 4': 'Thanos Snap (Velocity: Soft=50%, Hard=75%)',
                    'Pad 5': 'Toggle Gravity',
                    'Pad 6': 'Toggle Trails',
                    'Pad 7': 'Spawn Burst (Velocity = Count)',
                    'Pad 8': 'Kill Random (Velocity = Count)'
                },
                modWheel: {
                    'Mod Wheel (CC 1)': 'Radiation Control (same as MicroLab)'
                }
            },
            
            // === UNIVERSAL FEATURES ===
            universal: {
                'Music Channels (1-8)': 'Audio performance + lifeform spawning',
                'Control Channels (9+)': 'ALife control functions',
                'Audio Integration': 'Full Web Audio API support',
                'Visual Feedback': 'Button flashes sync with MIDI input'
            }
        };
    }
}

// Export for use in main app
window.MIDIController = MIDIController;