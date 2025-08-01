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
            
            // Enhanced device detection logging
            console.log('🔍 Scanning for MIDI devices...');
            console.log('📊 Available MIDI inputs:', this.midiAccess.inputs.size);
            console.log('📊 Available MIDI outputs:', this.midiAccess.outputs.size);
            
            // List all available MIDI devices for debugging
            let deviceCount = 0;
            for (let input of this.midiAccess.inputs.values()) {
                deviceCount++;
                console.log(`📱 Input ${deviceCount}: "${input.name}" (ID: ${input.id})`);
                console.log(`   State: ${input.state}, Connection: ${input.connection}`);
            }
            
            if (deviceCount === 0) {
                console.log('⚠️ No MIDI devices found!');
                console.log('💡 Troubleshooting steps:');
                console.log('   1. Make sure your M-Audio Oxygen is connected via USB');
                console.log('   2. Check if drivers are installed (Windows/Mac)');
                console.log('   3. Try refreshing the page after connecting');
                console.log('   4. Check if other MIDI software is using the device');
            }
            
            // Set up MIDI device listeners
            this.midiAccess.onstatechange = (event) => this.onMIDIStateChange(event);
            
            // Connect to existing devices
            for (let input of this.midiAccess.inputs.values()) {
                this.connectMIDIDevice(input);
            }
            
            this.updateMIDIStatus(deviceCount > 0 ? 'MIDI Ready - Controllers connected!' : 'MIDI Ready - No devices found');
            
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
        } else if (deviceName.includes('oxygen') || deviceName.includes('m-audio') || 
                   deviceName.includes('maudio') || deviceName.includes('m audio')) {
            console.log('🎹 M-Audio Oxygen detected! Full studio controller activated.');
            console.log('💡 Pads 1-8: Clean control mapping (Start/Pause/Reset/Thanos/etc.)');
            console.log('💡 Keyboard C3+: Musical performance - spawns lifeforms only');
            console.log('💡 Faders/Knobs: Audio mixing and visual parameters');
            console.log(`💡 Device detected as: "${input.name}"`);
        } else if (deviceName.includes('minilab')) {
            console.log('🎹 MiniLab MkII detected! Full control surface activated.');
            console.log('💡 8 knobs, 8 pads, and full keyboard mapping available');
        } else {
            console.log(`🎹 Generic MIDI controller detected: "${input.name}"`);
            console.log('💡 Basic keyboard mapping active - all controllers supported');
            console.log('💡 If this is an M-Audio Oxygen, faders (CC 7,71-77) and knobs (CC 78,80-86) should work');
        }
        
        // Set up message handler
        input.onmidimessage = (message) => this.handleMIDIMessage(message);
        
        this.updateMIDIStatus(`🎹 Connected: ${input.name}`);
    }

    onMIDIStateChange(event) {
        const device = event.port;
        console.log(`🔄 MIDI State Change: "${device.name}" - State: ${device.state}, Type: ${device.type}`);
        console.log(`   Connection: ${device.connection}, ID: ${device.id}`);
        
        if (device.type === 'input') {
            if (device.state === 'connected') {
                console.log(`✅ New device connected! Attempting to initialize...`);
                this.connectMIDIDevice(device);
            } else if (device.state === 'disconnected') {
                this.connectedDevices.delete(device.id);
                console.log(`❌ Device disconnected: ${device.name}`);
                this.updateMIDIStatus('🎹 MIDI Ready - Connect your controller');
            }
        }
        
        // Update device count
        const deviceCount = this.midiAccess.inputs.size;
        console.log(`📊 Total MIDI devices available: ${deviceCount}`);
    }
    
    // Manual device refresh function (can be called from console)
    refreshMIDIDevices() {
        console.log('🔄 Manually refreshing MIDI devices...');
        console.log('📊 Available MIDI inputs:', this.midiAccess.inputs.size);
        
        let deviceCount = 0;
        for (let input of this.midiAccess.inputs.values()) {
            deviceCount++;
            console.log(`📱 Input ${deviceCount}: "${input.name}" (State: ${input.state})`);
            
            if (input.state === 'connected' && !this.connectedDevices.has(input.id)) {
                console.log(`   ➡️ Connecting to: ${input.name}`);
                this.connectMIDIDevice(input);
            }
        }
        
        if (deviceCount === 0) {
            console.log('⚠️ Still no MIDI devices found after refresh');
            console.log('💡 Try: 1) Unplug and replug your Oxygen 2) Close other MIDI software');
        }
        
        return deviceCount;
    }

    handleMIDIMessage(message) {
        const [status, data1, data2] = message.data;
        const channel = (status & 0x0F) + 1;
        const command = status & 0xF0;

        // Handle pitch bend first (before channel filtering)
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
        }
        
        // Note Off messages
        else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
            this.handleNoteOff(data1, data2);
        }
    }

    // CLEAN NOTE MAPPING FOR M-AUDIO OXYGEN
    handleNoteOn(note, velocity) {
        console.log(`🎹 Note: ${note}, Velocity: ${velocity} (${this.getNoteNameFromMIDI(note)})`);
        
        // M-Audio Oxygen Pad Controls (36-43) - Map to 8 main control buttons
        // Handle pads FIRST, then keyboard notes for music
        if (note >= 36 && note <= 43) {
            // This is a pad - handle control functions
        } else {
            // This is a keyboard note - handle musical performance only
            this.handleMusicalPerformance(note, velocity);
            return;
        }
        
        // Pad control mapping
        switch(note) {
            case 36: // Pad 1 - Start Life
                this.flashButton('startBtn');
                this.alife.startLife();
                console.log('🚀 Pad 1: Start Life');
                this.createFeedbackMessage('START LIFE', 'midi-feedback-spawn');
                break;
                
            case 37: // Pad 2 - Pause Life
                this.flashButton('pauseBtn');
                this.alife.pauseLife();
                console.log('⏸️ Pad 2: Pause Life');
                this.createFeedbackMessage('PAUSE LIFE', 'midi-feedback');
                break;
                
            case 38: // Pad 3 - Reset Life
                this.flashButton('resetBtn');
                this.alife.resetLife();
                console.log('🔄 Pad 3: Reset Life');
                this.createFeedbackMessage('RESET LIFE', 'midi-feedback');
                break;
                
            case 39: // Pad 4 - Thanos Snap
                this.flashButton('thanosBtn');
                this.alife.thanosSnap();
                console.log('💀 Pad 4: Thanos Snap');
                this.createFeedbackMessage('THANOS SNAP!', 'midi-feedback-kill');
                if (this.alife.audioSystem) {
                    this.alife.audioSystem.playThanosSfx('intense');
                }
                break;
                
            case 40: // Pad 5 - Enable/Disable Audio
                const audioBtn = document.getElementById('audioToggle');
                if (this.alife.audioSystem) {
                    this.alife.audioSystem.toggle();
                    audioBtn.textContent = this.alife.audioSystem.isEnabled ? 'Disable Audio' : 'Enable Audio';
                    console.log(`🔊 Pad 5: Audio ${this.alife.audioSystem.isEnabled ? 'ON' : 'OFF'}`);
                    this.createFeedbackMessage(`AUDIO ${this.alife.audioSystem.isEnabled ? 'ON' : 'OFF'}`, 'midi-feedback');
                }
                break;
                
            case 41: // Pad 6 - Toggle Gravity
                this.alife.session.gravityOn = !this.alife.session.gravityOn;
                document.getElementById('gravityToggle').checked = this.alife.session.gravityOn;
                console.log(`🌍 Pad 6: Gravity ${this.alife.session.gravityOn ? 'ON' : 'OFF'}`);
                this.createFeedbackMessage(`GRAVITY ${this.alife.session.gravityOn ? 'ON' : 'OFF'}`, 'midi-feedback');
                break;
                
            case 42: // Pad 7 - Toggle Trails
                this.alife.session.drawTrails = !this.alife.session.drawTrails;
                document.getElementById('trailsToggle').checked = this.alife.session.drawTrails;
                console.log(`✨ Pad 7: Trails ${this.alife.session.drawTrails ? 'ON' : 'OFF'}`);
                this.createFeedbackMessage(`TRAILS ${this.alife.session.drawTrails ? 'ON' : 'OFF'}`, 'midi-feedback');
                break;
                
            case 43: // Pad 8 - Toggle Dance Mode
                if (this.alife.danceController) {
                    const btn = document.getElementById('danceToggle');
                    if (!this.alife.danceController.isEnabled) {
                        this.alife.danceController.enable();
                        btn.textContent = 'Disable Dance Mode';
                        console.log('💃 Pad 8: Dance Mode ON');
                        this.createFeedbackMessage('DANCE MODE ON', 'midi-feedback-spawn');
                    } else {
                        this.alife.danceController.disable();
                        btn.textContent = 'Enable Dance Mode';
                        console.log('🛑 Pad 8: Dance Mode OFF');
                        this.createFeedbackMessage('DANCE MODE OFF', 'midi-feedback');
                    }
                }
                break;
                
            // Unmapped pad/control notes
            default:
                console.log(`🎛️ Unmapped pad/control note: ${this.getNoteNameFromMIDI(note)} (${note})`);
                console.log('💡 M-Audio Oxygen: Pads 1-8 control buttons, keyboard plays music');
                break;
        }
    }
    
    // Musical performance handler - ONLY spawns lifeforms, doesn't change canvas
    handleMusicalPerformance(note, velocity) {
        // Musical notes (C3 and above) spawn lifeforms based on velocity
        const intensityLevel = Math.floor(velocity / 32) + 1; // 1-4 lifeforms
        
        for (let i = 0; i < intensityLevel; i++) {
            this.alife.createLifeform();
        }
        
        console.log(`🎵 Musical: ${this.getNoteNameFromMIDI(note)} → ${intensityLevel} lifeforms`);
        this.createFeedbackMessage(`♪ ${this.getNoteNameFromMIDI(note)} ♪`, 'midi-feedback-spawn');
        
        // Send to audio system for sound
        if (this.alife.audioSystem) {
            this.alife.audioSystem.handleMusicMIDI(0x90, note, velocity, 1);
        }
        
        // Enhanced effects for dance mode
        if (this.alife.danceController && this.alife.danceController.isEnabled) {
            for (const lifeform of this.alife.lifeforms.values()) {
                if (note >= 84) { // High notes - shimmer effect
                    lifeform.shimmer = 1.5 + (velocity / 127);
                } else if (note <= 36) { // Very low notes - bass boost
                    lifeform.beatPulse = 1.3 + (velocity / 127) * 0.5;
                    lifeform.lastKickTime = Date.now();
                }
            }
        }
    }

    handleNoteOff(note, velocity) {
        // Send to audio system for sound
        if (this.alife.audioSystem) {
            this.alife.audioSystem.handleMusicMIDI(0x80, note, velocity, 1);
        }
    }

    handleControlChange(ccNumber, value) {
        console.log(`🎛️ CC ${ccNumber} = ${value}`);
        
        switch(ccNumber) {
            // === MICROLAB SMART & COMMON CONTROLLERS ===
            case 1: // Mod Wheel - Primary Radiation Control (MicroLab Smart, MiniLab MkII)
                this.alife.session.radiation = Math.floor(value * 100 / 127);
                document.getElementById('radiationSlider').value = this.alife.session.radiation;
                document.getElementById('radiationValue').textContent = this.alife.session.radiation;
                console.log(`☢️ Radiation: ${this.alife.session.radiation}%`);
                break;
                
            // === MINILAB MKII KNOBS ===
            case 74: // Knob 1 - Radiation (MiniLab MkII)
                this.alife.session.radiation = Math.floor(value * 100 / 127);
                document.getElementById('radiationSlider').value = this.alife.session.radiation;
                document.getElementById('radiationValue').textContent = this.alife.session.radiation;
                console.log(`☢️ Radiation: ${this.alife.session.radiation}%`);
                break;
                
            case 71: // Knob 2 - Population Limit (MiniLab MkII / M-Audio Oxygen Fader 2)
                this.alife.session.populationLimit = Math.floor(10 + (value * 90 / 127));
                console.log(`👥 Population limit: ${this.alife.session.populationLimit}`);
                break;
                
            case 76: // Knob 3 - DNA Chaos Chance (MiniLab MkII / M-Audio Oxygen Fader 7)
                this.alife.session.dnaChaosChance = Math.floor(value * 50 / 127);
                console.log(`🧬 DNA Chaos: ${this.alife.session.dnaChaosChance}%`);
                break;
                
            case 77: // Knob 4 - Grid Size (MiniLab MkII / M-Audio Oxygen Fader 8)
                const gridSize = Math.floor(32 + (value * 32 / 127));
                if (gridSize !== this.alife.gridSize) {
                    this.alife.gridSize = gridSize;
                    this.alife.canvas.width = this.alife.gridSize * this.alife.cellSize;
                    this.alife.canvas.height = this.alife.gridSize * this.alife.cellSize;
                    console.log(`📐 Grid size: ${this.alife.gridSize}x${this.alife.gridSize}`);
                }
                break;
                
            case 93: // Knob 5 - Cell Size (MiniLab MkII)
                this.alife.cellSize = Math.floor(4 + (value * 12 / 127));
                this.alife.canvas.width = this.alife.gridSize * this.alife.cellSize;
                this.alife.canvas.height = this.alife.gridSize * this.alife.cellSize;
                console.log(`🔳 Cell size: ${this.alife.cellSize}px`);
                break;
                
            case 73: // Knob 6 - Animation Speed (MiniLab MkII)
                this.alife.frameDelay = Math.floor(10 + (value * 90 / 127));
                console.log(`⏱️ Frame delay: ${this.alife.frameDelay}ms`);
                break;
                
            case 75: // Knob 7 - Auto Spawn Rate (MiniLab MkII)
                this.alife.autoSpawnRate = Math.floor(value / 12.7);
                console.log(`🌱 Auto spawn rate: ${this.alife.autoSpawnRate}`);
                break;
                
            case 114: // Knob 8 - Visual Intensity (MiniLab MkII)
                this.alife.visualIntensity = Math.floor(2 + (value * 18 / 127));
                console.log(`✨ Visual intensity: ${this.alife.visualIntensity}`);
                break;
                
            // === SUSTAIN & EXPRESSION PEDALS ===
            case 64: // Sustain Pedal
                if (value >= 64) {
                    console.log('🦶 Sustain pedal pressed - THANOS SNAP! 💀');
                    this.alife.thanosSnap();
                    this.createFeedbackMessage('THANOS SNAP! 💀', 'midi-feedback-kill');
                    if (this.alife.audioSystem) {
                        this.alife.audioSystem.playThanosSfx('intense');
                    }
                } else {
                    console.log('🦶 Sustain pedal released');
                }
                break;
                
            case 11: // Expression Pedal
                this.alife.session.populationLimit = Math.floor(10 + (value * 90 / 127));
                console.log(`👥 Population limit: ${this.alife.session.populationLimit}`);
                break;
                
            // === M-AUDIO OXYGEN FADERS ===
            case 7: // Master Volume
                if (this.alife.audioSystem) {
                    this.alife.audioSystem.setMasterVolume(value / 127);
                    console.log(`🔊 Master volume: ${Math.round(value / 127 * 100)}%`);
                }
                break;
                
            case 72: // Fader 3 - SFX Volume  
                if (this.alife.audioSystem) {
                    this.alife.audioSystem.setSfxVolume(value / 127);
                    console.log(`🔊 SFX volume: ${Math.round(value / 127 * 100)}%`);
                }
                break;
                
            case 74: // Fader 5 - Radiation Level
                this.alife.session.radiation = Math.floor(value * 100 / 127);
                document.getElementById('radiationSlider').value = this.alife.session.radiation;
                document.getElementById('radiationValue').textContent = this.alife.session.radiation;
                console.log(`☢️ Radiation: ${this.alife.session.radiation}%`);
                break;
                
            // === M-AUDIO OXYGEN KNOBS ===
            case 78: // Knob 1 - Radiation Slider
                const radiationValue = Math.floor(value * 100 / 127);
                this.alife.session.radiation = radiationValue;
                document.getElementById('radiationSlider').value = radiationValue;
                document.getElementById('radiationValue').textContent = radiationValue;
                console.log(`☢️ Knob 1: Radiation = ${radiationValue}%`);
                break;
                
            case 80: // Knob 2 - Music Volume Slider
                const musicVolume = Math.floor(value * 100 / 127);
                document.getElementById('musicVolume').value = musicVolume;
                if (this.alife.audioSystem) {
                    this.alife.audioSystem.setMusicVolume(musicVolume / 100);
                }
                console.log(`🎵 Knob 2: Music Volume = ${musicVolume}%`);
                break;
                
            case 81: // Knob 3 - SFX Volume Slider
                const sfxVolume = Math.floor(value * 100 / 127);
                document.getElementById('sfxVolume').value = sfxVolume;
                if (this.alife.audioSystem) {
                    this.alife.audioSystem.setSfxVolume(sfxVolume / 100);
                }
                console.log(`🔊 Knob 3: SFX Volume = ${sfxVolume}%`);
                break;
                
            case 82: // Knob 4 - Ambient Volume Slider
                const ambientVolume = Math.floor(value * 100 / 127);
                document.getElementById('ambientVolume').value = ambientVolume;
                if (this.alife.audioSystem) {
                    this.alife.audioSystem.setAmbientVolume(ambientVolume / 100);
                }
                console.log(`🌊 Knob 4: Ambient Volume = ${ambientVolume}%`);
                break;
                
            case 83: // Knob 5 - Audio Sensitivity Slider
                const audioSensitivity = (0.1 + (value * 1.9 / 127)).toFixed(1);
                document.getElementById('audioSensitivity').value = audioSensitivity;
                if (this.alife.audioInputController) {
                    this.alife.audioInputController.setSensitivity(parseFloat(audioSensitivity));
                }
                console.log(`🎤 Knob 5: Audio Sensitivity = ${audioSensitivity}`);
                break;
                
            case 84: // Knob 6 - Pitch Sensitivity Slider
                const pitchSensitivity = (0.1 + (value * 1.9 / 127)).toFixed(1);
                document.getElementById('pitchSensitivity').value = pitchSensitivity;
                if (this.alife.audioInputController) {
                    this.alife.audioInputController.setPitchSensitivity(parseFloat(pitchSensitivity));
                }
                console.log(`🎹 Knob 6: Pitch Sensitivity = ${pitchSensitivity}`);
                break;
                
            case 85: // Knob 7 - Population Limit (simulated slider)
                const populationLimit = Math.floor(10 + (value * 90 / 127));
                this.alife.session.populationLimit = populationLimit;
                console.log(`👥 Knob 7: Population Limit = ${populationLimit}`);
                break;
                
            case 86: // Knob 8 - DNA Chaos (simulated slider)
                const dnaChaos = Math.floor(value * 50 / 127);
                this.alife.session.dnaChaosChance = dnaChaos;
                console.log(`🧬 Knob 8: DNA Chaos = ${dnaChaos}%`);
                break;
                
            // === M-AUDIO OXYGEN TRANSPORT CONTROLS ===
            case 87: // Transport Play Button
                console.log('▶️ Transport Play - Starting Life!');
                this.flashButton('startBtn');
                this.alife.startLife();
                break;
                
            case 88: // Transport Stop Button
                console.log('⏹️ Transport Stop - Pausing Life!');
                this.flashButton('pauseBtn');
                this.alife.pauseLife();
                break;
                
            case 89: // Transport Record Button
                console.log('⏺️ Transport Record - THANOS SNAP!');
                this.alife.thanosSnap();
                this.createFeedbackMessage('TRANSPORT THANOS! 💀', 'midi-feedback-kill');
                if (this.alife.audioSystem) {
                    this.alife.audioSystem.playThanosSfx('intense');
                }
                break;
                
            case 90: // Transport Fast Forward
                this.alife.frameDelay = Math.max(1, this.alife.frameDelay - 10);
                console.log(`⏩ Fast Forward - Speed: ${this.alife.frameDelay}ms`);
                break;
                
            case 91: // Transport Rewind
                this.alife.frameDelay = Math.min(100, this.alife.frameDelay + 10);
                console.log(`⏪ Rewind - Speed: ${this.alife.frameDelay}ms`);
                break;
                
            // Unmapped controls
            default:
                console.log(`🔍 UNMAPPED CC ${ccNumber} = ${value}`);
                if (ccNumber >= 70 && ccNumber <= 79) {
                    console.log(`🎛️ DETECTED: This looks like an M-Audio Oxygen fader/knob!`);
                    console.log(`💡 CC ${ccNumber} in Oxygen range - you can manually map this`);
                }
                break;
        }
    }

    // Utility methods
    getNoteNameFromMIDI(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor((midiNote - 12) / 12);
        const noteIndex = midiNote % 12;
        return `${noteNames[noteIndex]}${octave}`;
    }

    flashButton(buttonId, intensity = 'normal') {
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.add(intensity === 'intense' ? 'midi-flash-intense' : 'midi-flash');
            setTimeout(() => {
                button.classList.remove('midi-flash', 'midi-flash-intense');
            }, intensity === 'intense' ? 500 : 300);
        }
    }

    createFeedbackMessage(message, className = 'midi-feedback') {
        const feedback = document.createElement('div');
        feedback.className = className;
        feedback.textContent = message;
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 1500);
    }

    updateMIDIStatus(message) {
        console.log(message);
    }

    testMIDIConnectivity() {
        console.log('🧪 MIDI Connectivity Test:');
        console.log('- MIDI Access: ✅ Available');
        console.log('- Connected Devices:', this.connectedDevices.size);
        console.log('- Audio System:', this.alife.audioSystem ? '✅ Ready' : '❌ Not available');
        
        if (this.alife.audioSystem) {
            console.log('- Audio Context State:', this.alife.audioSystem.audioContext?.state || 'unknown');
        }
        
        console.log('💡 Test your controller by pressing any key or moving a fader...');
    }

    handlePitchBend(lsb, msb) {
        const value = msb;
        this.alife.frameDelay = Math.floor(5 + (value * 95 / 127));
        console.log(`🎚️ Pitch Bend: Animation speed = ${this.alife.frameDelay}ms`);
    }
}

// Export for use in main app
window.MIDIController = MIDIController;

// Global helper function for debugging MIDI issues
window.refreshMIDI = function() {
    if (window.alife && window.alife.midiController) {
        return window.alife.midiController.refreshMIDIDevices();
    } else {
        console.log('❌ MIDI controller not initialized yet');
        return 0;
    }
};