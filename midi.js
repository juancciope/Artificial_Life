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
        // Map CC numbers to controls (adjust based on your MIDI controller)
        const normalizedValue = value / 127; // Convert 0-127 to 0-1
        
        switch(ccNumber) {
            case 1: // Modulation wheel or first knob
                this.alife.session.radiation = Math.floor(value * 100 / 127);
                document.getElementById('radiationSlider').value = this.alife.session.radiation;
                document.getElementById('radiationValue').textContent = this.alife.session.radiation;
                break;
                
            case 7: // Volume fader - control population limit
                this.alife.session.populationLimit = Math.floor(20 + (value * 80 / 127)); // 20-100 range
                break;
                
            case 10: // Pan - control DNA chaos chance
                this.alife.session.dnaChaosChance = Math.floor(value * 50 / 127); // 0-50%
                break;
                
            case 16: // First knob on many controllers
                // Control grid size
                const newGridSize = Math.floor(32 + (value * 32 / 127)); // 32-64 range
                if (newGridSize !== this.alife.gridSize) {
                    this.alife.gridSize = newGridSize;
                    this.alife.canvas.width = this.alife.gridSize * this.alife.cellSize;
                    this.alife.canvas.height = this.alife.gridSize * this.alife.cellSize;
                }
                break;
                
            default:
                console.log(`Unmapped CC: ${ccNumber}, Value: ${value}`);
        }
    }

    handleNoteOn(note, velocity) {
        // Map MIDI notes to actions
        switch(note) {
            case 36: // C1 - Start Life
                this.alife.startLife();
                break;
                
            case 37: // C#1 - Pause
                this.alife.pauseLife();
                break;
                
            case 38: // D1 - Reset
                this.alife.resetLife();
                break;
                
            case 39: // D#1 - Thanos Snap
                this.alife.thanosSnap();
                break;
                
            case 40: // E1 - Toggle Gravity
                this.alife.session.gravityOn = !this.alife.session.gravityOn;
                document.getElementById('gravityToggle').checked = this.alife.session.gravityOn;
                break;
                
            case 41: // F1 - Toggle Trails
                this.alife.session.drawTrails = !this.alife.session.drawTrails;
                document.getElementById('trailsToggle').checked = this.alife.session.drawTrails;
                break;
                
            case 42: // F#1 - Spawn random lifeforms
                for (let i = 0; i < 5; i++) {
                    this.alife.createLifeform();
                }
                break;
                
            case 43: // G1 - Kill random lifeforms
                const lifeforms = Array.from(this.alife.lifeforms.values());
                const toRemove = Math.min(5, lifeforms.length);
                for (let i = 0; i < toRemove; i++) {
                    const randomLifeform = lifeforms[Math.floor(Math.random() * lifeforms.length)];
                    this.alife.removeLifeform(randomLifeform.id);
                    lifeforms.splice(lifeforms.indexOf(randomLifeform), 1);
                }
                break;
                
            default:
                console.log(`Unmapped Note: ${note}, Velocity: ${velocity}`);
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

    // Method to get MIDI mapping info
    getMIDIMapping() {
        return {
            knobs: {
                'CC 1': 'Radiation Level (0-100)',
                'CC 7': 'Population Limit (20-100)',
                'CC 10': 'DNA Chaos Chance (0-50%)',
                'CC 16': 'Grid Size (32-64)'
            },
            pads: {
                'C1 (36)': 'Start Life',
                'C#1 (37)': 'Pause',
                'D1 (38)': 'Reset',
                'D#1 (39)': 'Thanos Snap',
                'E1 (40)': 'Toggle Gravity',
                'F1 (41)': 'Toggle Trails',
                'F#1 (42)': 'Spawn 5 Lifeforms',
                'G1 (43)': 'Kill 5 Random Lifeforms'
            }
        };
    }
}

// Export for use in main app
window.MIDIController = MIDIController;