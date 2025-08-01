class ALifeAudioSystem {
    constructor(alife) {
        this.alife = alife;
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.ambientGain = null;
        
        // Audio routing
        this.midiChannels = {
            music: 1,      // Channel 1-8 for music
            control: 9     // Channel 9+ for ALife control
        };
        
        // Synthesizers
        this.musicSynth = null;
        this.ambientSynth = null;
        
        // Audio parameters
        this.isEnabled = false;
        this.masterVolume = 0.7;
        this.musicVolume = 0.8;
        this.sfxVolume = 0.6;
        this.ambientVolume = 0.3;
        
        // Lifeform audio mapping
        this.lifeformOscillators = new Map();
        this.backgroundAmbient = null;
        
        this.initializeAudioSystem();
    }

    async initializeAudioSystem() {
        try {
            // Create audio context (but don't start it yet due to autoplay policy)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create gain nodes for mixing
            this.masterGain = this.audioContext.createGain();
            this.musicGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            this.ambientGain = this.audioContext.createGain();
            
            // Connect audio chain
            this.musicGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            this.ambientGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            // Set initial volumes
            this.masterGain.gain.value = this.masterVolume;
            this.musicGain.gain.value = this.musicVolume;
            this.sfxGain.gain.value = this.sfxVolume;
            this.ambientGain.gain.value = this.ambientVolume;
            
            // Initialize synthesizers
            this.initializeSynthesizers();
            
            // Don't start ambient soundscape until user interaction
            // this.startAmbientSoundscape();
            
            console.log('ALife Audio System initialized! (suspended until user interaction)');
            this.isEnabled = false; // Start disabled until user clicks enable
            
        } catch (error) {
            console.warn('Audio system initialization failed:', error);
        }
    }

    initializeSynthesizers() {
        // Music synthesizer for performance
        this.musicSynth = {
            oscillators: new Map(),
            playNote: (note, velocity, channel = 1) => {
                if (channel > 8) return; // Music channels 1-8 only
                
                const freq = this.midiNoteToFrequency(note);
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                const filter = this.audioContext.createBiquadFilter();
                
                // Configure oscillator based on channel
                osc.type = this.getWaveformForChannel(channel);
                osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                
                // Configure filter
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(2000 + (velocity * 50), this.audioContext.currentTime);
                filter.Q.setValueAtTime(5, this.audioContext.currentTime);
                
                // Configure envelope
                const vol = (velocity / 127) * 0.3;
                gain.gain.setValueAtTime(0, this.audioContext.currentTime);
                gain.gain.linearRampToValueAtTime(vol, this.audioContext.currentTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(vol * 0.7, this.audioContext.currentTime + 0.1);
                
                // Connect audio chain
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.musicGain);
                
                // Start oscillator
                osc.start();
                
                // Store for note off
                this.musicSynth.oscillators.set(`${note}_${channel}`, { osc, gain, filter });
            },
            
            stopNote: (note, channel = 1) => {
                const key = `${note}_${channel}`;
                const synth = this.musicSynth.oscillators.get(key);
                if (synth) {
                    synth.gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
                    synth.osc.stop(this.audioContext.currentTime + 0.1);
                    this.musicSynth.oscillators.delete(key);
                }
            }
        };
    }

    getWaveformForChannel(channel) {
        const waveforms = ['sine', 'triangle', 'sawtooth', 'square'];
        return waveforms[(channel - 1) % waveforms.length];
    }

    midiNoteToFrequency(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    // MIDI Integration - Enhanced for Music + Control
    handleMIDIMessage(message) {
        const [status, data1, data2] = message.data;
        const channel = (status & 0x0F) + 1;
        const command = status & 0xF0;

        // Route based on channel
        if (channel <= 8) {
            // Channels 1-8: Musical performance
            this.handleMusicMIDI(command, data1, data2, channel);
        } else {
            // Channels 9+: ALife control (handled by existing MIDI controller)
            // This allows simultaneous music + control
        }
    }

    handleMusicMIDI(command, note, velocity, channel) {
        if (!this.isEnabled || !this.audioContext) return;

        // Resume audio context if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        switch (command) {
            case 0x90: // Note On
                if (velocity > 0) {
                    this.musicSynth.playNote(note, velocity, channel);
                    this.triggerLifeformAudio(note, velocity);
                } else {
                    this.musicSynth.stopNote(note, channel);
                }
                break;
                
            case 0x80: // Note Off
                this.musicSynth.stopNote(note, channel);
                break;
                
            case 0xB0: // Control Change
                this.handleMusicControlChange(note, velocity, channel);
                break;
        }
    }

    handleMusicControlChange(cc, value, channel) {
        switch (cc) {
            case 7: // Volume
                this.musicGain.gain.setValueAtTime(value / 127, this.audioContext.currentTime);
                break;
            case 10: // Pan (could control stereo effects)
                break;
            case 74: // Filter cutoff
                // Apply to active oscillators
                break;
        }
    }

    // Lifeform-based Audio Generation
    triggerLifeformAudio(note, velocity) {
        // Create audio event based on lifeform activities
        const lifeforms = Array.from(this.alife.lifeforms.values());
        if (lifeforms.length === 0) return;

        // Map musical notes to lifeform spawning with audio
        const freq = this.midiNoteToFrequency(note);
        this.createLifeformTone(freq, velocity / 127, 0.2);
        
        // Trigger visual + audio lifeform creation
        for (let i = 0; i < Math.floor(velocity / 32) + 1; i++) {
            this.alife.createLifeform();
        }
    }

    createLifeformTone(frequency, volume, duration) {
        if (!this.audioContext) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Configure lifeform-inspired sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(frequency * 2, this.audioContext.currentTime);
        filter.Q.setValueAtTime(10, this.audioContext.currentTime);
        
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(volume * 0.1, this.audioContext.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }

    // Ambient Soundscape
    startAmbientSoundscape() {
        if (!this.audioContext) return;
        
        // Don't start ambient if context is suspended
        if (this.audioContext.state === 'suspended') {
            console.log('⏸️ Ambient soundscape delayed until audio context resumes');
            return;
        }

        // Create evolving ambient pad
        const createAmbientLayer = (baseFreq, detune = 0) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
            osc.detune.setValueAtTime(detune, this.audioContext.currentTime);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
            
            gain.gain.setValueAtTime(0.02, this.audioContext.currentTime);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ambientGain);
            
            osc.start();
            
            // Slowly modulate filter
            this.modulateAmbient(filter, gain);
            
            return { osc, gain, filter };
        };

        // Create ambient layers
        this.backgroundAmbient = [
            createAmbientLayer(55, 0),    // A1
            createAmbientLayer(82.5, 5),  // E2 slightly detuned
            createAmbientLayer(110, -3),  // A2 slightly detuned
            createAmbientLayer(165, 2)    // E3 slightly detuned
        ];
    }

    modulateAmbient(filter, gain) {
        const modulate = () => {
            if (!this.audioContext) return;
            
            // Modulate based on lifeform activity
            const lifeformCount = this.alife.lifeforms.size;
            const radiation = this.alife.session.radiation;
            
            // Filter frequency based on population
            const filterFreq = 400 + (lifeformCount * 10) + (radiation * 5);
            filter.frequency.exponentialRampToValueAtTime(
                Math.max(100, filterFreq), 
                this.audioContext.currentTime + 2
            );
            
            // Volume based on activity
            const volume = 0.01 + (lifeformCount * 0.001) + (radiation * 0.0002);
            gain.gain.exponentialRampToValueAtTime(
                Math.min(0.05, volume), 
                this.audioContext.currentTime + 2
            );
            
            setTimeout(modulate, 2000 + Math.random() * 3000);
        };
        
        setTimeout(modulate, 1000);
    }

    // Audio Effects for ALife Events
    playThanosSfx(intensity = 'normal') {
        if (!this.audioContext) return;

        const duration = intensity === 'intense' ? 1.5 : 1.0;
        const frequencies = [220, 165, 110, 82.5]; // Descending doom chord
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.createDoomTone(freq, duration - (index * 0.1));
            }, index * 100);
        });
    }

    createDoomTone(frequency, duration) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(frequency * 2, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(frequency * 0.5, this.audioContext.currentTime + duration);
        
        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }

    playRadiationBurstSfx() {
        if (!this.audioContext) return;

        // Geiger counter-like sound
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'square';
                osc.frequency.setValueAtTime(800 + Math.random() * 400, this.audioContext.currentTime);
                
                gain.gain.setValueAtTime(0.05, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);
                
                osc.connect(gain);
                gain.connect(this.sfxGain);
                
                osc.start();
                osc.stop(this.audioContext.currentTime + 0.05);
            }, i * 100 + Math.random() * 50);
        }
    }

    // Volume Controls
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.setValueAtTime(this.musicVolume, this.audioContext.currentTime);
        }
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) {
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.audioContext.currentTime);
        }
    }

    setAmbientVolume(volume) {
        this.ambientVolume = Math.max(0, Math.min(1, volume));
        if (this.ambientGain) {
            this.ambientGain.gain.setValueAtTime(this.ambientVolume, this.audioContext.currentTime);
        }
    }

    // Enable/Disable Audio
    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    enable() {
        this.isEnabled = true;
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('✅ Audio context resumed');
                // Start ambient soundscape after user interaction
                if (!this.backgroundAmbient) {
                    this.startAmbientSoundscape();
                }
            }).catch(error => {
                console.warn('Failed to resume audio context:', error);
            });
        } else if (this.audioContext && this.audioContext.state === 'running') {
            // If context is already running, just start ambient if needed
            if (!this.backgroundAmbient) {
                this.startAmbientSoundscape();
            }
        }
    }

    disable() {
        this.isEnabled = false;
        if (this.audioContext) {
            this.audioContext.suspend();
        }
    }
}

// Export for use in main app
window.ALifeAudioSystem = ALifeAudioSystem;