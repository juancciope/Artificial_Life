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
            
        } catch (error) {
            console.warn('MIDI not supported or access denied:', error);
            this.updateMIDIStatus('MIDI not available - browser or device limitation');
        }
    }

    connectMIDIDevice(input) {
        console.log(`Connected to MIDI device: ${input.name}`);
        this.connectedDevices.set(input.id, input);
        
        // Set up message handler
        input.onmidimessage = (message) => this.handleMIDIMessage(message);
        
        this.updateMIDIStatus(`🎹 Connected: ${input.name}`);
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
        const channel = status & 0x0F;
        const command = status & 0xF0;

        // Control Change (CC) messages - for knobs and faders
        if (command === 0xB0) {
            this.handleControlChange(data1, data2);
        }
        
        // Note On messages - for pads and keys
        else if (command === 0x90 && data2 > 0) {
            this.handleNoteOn(data1, data2);
        }
        
        // Note Off messages
        else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
            this.handleNoteOff(data1);
        }
    }

    handleControlChange(ccNumber, value) {
        // Arturia MiniLab MkII specific mappings
        const normalizedValue = value / 127; // Convert 0-127 to 0-1
        
        switch(ccNumber) {
            // Top row knobs (Knob 1-8)
            case 74: // Knob 1 - Radiation Level
                this.alife.session.radiation = Math.floor(value * 100 / 127);
                document.getElementById('radiationSlider').value = this.alife.session.radiation;
                document.getElementById('radiationValue').textContent = this.alife.session.radiation;
                break;
                
            case 71: // Knob 2 - Population Limit
                this.alife.session.populationLimit = Math.floor(20 + (value * 80 / 127)); // 20-100 range
                break;
                
            case 76: // Knob 3 - DNA Chaos Chance
                this.alife.session.dnaChaosChance = Math.floor(value * 50 / 127); // 0-50%
                break;
                
            case 77: // Knob 4 - Grid Size
                const newGridSize = Math.floor(32 + (value * 32 / 127)); // 32-64 range
                if (newGridSize !== this.alife.gridSize) {
                    this.alife.gridSize = newGridSize;
                    this.alife.canvas.width = this.alife.gridSize * this.alife.cellSize;
                    this.alife.canvas.height = this.alife.gridSize * this.alife.cellSize;
                }
                break;
                
            case 93: // Knob 5 - Cell Size
                this.alife.cellSize = Math.floor(4 + (value * 12 / 127)); // 4-16 pixel range
                this.alife.canvas.width = this.alife.gridSize * this.alife.cellSize;
                this.alife.canvas.height = this.alife.gridSize * this.alife.cellSize;
                break;
                
            case 73: // Knob 6 - Animation Speed
                // Control frame rate delay (lower value = faster)
                this.alife.frameDelay = Math.floor(10 + (value * 90 / 127)); // 10-100ms delay
                break;
                
            case 75: // Knob 7 - Spawn Rate
                this.alife.autoSpawnRate = Math.floor(value / 12.7); // 0-10 lifeforms per auto-spawn
                break;
                
            case 114: // Knob 8 - Visual Intensity
                // Control shadow blur for visual effect
                this.alife.visualIntensity = Math.floor(2 + (value * 18 / 127)); // 2-20 blur
                break;
                
            // Bottom row knobs (Knob 9-16)
            case 18: // Knob 9
            case 19: // Knob 10
            case 16: // Knob 11
            case 17: // Knob 12
            case 91: // Knob 13
            case 79: // Knob 14
            case 72: // Knob 15
            case 92: // Knob 16
                // Reserved for future features
                console.log(`Reserved knob CC ${ccNumber}: ${value}`);
                break;
                
            // Mod Wheel
            case 1: // Modulation wheel - Global chaos
                if (value > 100) {
                    // High mod wheel = chaos mode
                    this.alife.chaosMode = true;
                    this.alife.session.dnaChaosChance = Math.floor(30 + (value - 100) * 20 / 27); // 30-50%
                } else {
                    this.alife.chaosMode = false;
                }
                break;
                
            // Pitch Bend (if implemented)
            case 224: // Pitch bend - time dilation effect
                // Could be used for slow-motion/fast-forward
                break;
                
            default:
                console.log(`Unmapped CC: ${ccNumber}, Value: ${value}`);
        }
    }

    handleNoteOn(note, velocity) {
        // Arturia MiniLab MkII pads mapping (8 velocity-sensitive pads)
        switch(note) {
            // Pad Bank A (default)
            case 36: // Pad 1 - Start Life
                this.alife.startLife();
                break;
                
            case 37: // Pad 2 - Pause/Resume
                if (this.alife.isRunning) {
                    this.alife.pauseLife();
                } else {
                    this.alife.startLife();
                }
                break;
                
            case 38: // Pad 3 - Reset Everything
                this.alife.resetLife();
                break;
                
            case 39: // Pad 4 - Thanos Snap (velocity sensitive)
                if (velocity > 100) {
                    // Hard hit = kill 75%
                    this.thanosSnapIntense();
                } else {
                    // Soft hit = normal 50%
                    this.alife.thanosSnap();
                }
                break;
                
            case 40: // Pad 5 - Toggle Gravity
                this.alife.session.gravityOn = !this.alife.session.gravityOn;
                document.getElementById('gravityToggle').checked = this.alife.session.gravityOn;
                break;
                
            case 41: // Pad 6 - Toggle Trails
                this.alife.session.drawTrails = !this.alife.session.drawTrails;
                document.getElementById('trailsToggle').checked = this.alife.session.drawTrails;
                break;
                
            case 42: // Pad 7 - Spawn Burst (velocity sensitive)
                const spawnCount = Math.floor(velocity / 16) + 1; // 1-8 based on velocity
                for (let i = 0; i < spawnCount; i++) {
                    this.alife.createLifeform();
                }
                break;
                
            case 43: // Pad 8 - Population Control (velocity sensitive)
                const killCount = Math.floor(velocity / 25) + 1; // 1-5 based on velocity
                this.killRandomLifeforms(killCount);
                break;
                
            // Keyboard notes for precise control
            case 48: // C2 - Emergency stop
                this.alife.pauseLife();
                break;
                
            case 50: // D2 - Radiation burst
                this.radiationBurst();
                break;
                
            case 52: // E2 - Spawn at cursor (if implemented)
                break;
                
            case 53: // F2 - Clear all
                this.alife.resetLife();
                break;
                
            default:
                console.log(`Unmapped Note: ${note}, Velocity: ${velocity}`);
        }
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
        
        // Reset after 2 seconds
        setTimeout(() => {
            this.alife.session.radiation = originalRadiation;
        }, 2000);
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

    // Method to get MiniLab MkII MIDI mapping info
    getMIDIMapping() {
        return {
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
                'Mod Wheel': 'Chaos Mode (>100 = Extreme mutations)'
            },
            keyboard: {
                'C2': 'Emergency Stop',
                'D2': 'Radiation Burst (2 sec)',
                'F2': 'Clear All'
            }
        };
    }
}

// Export for use in main app
window.MIDIController = MIDIController;