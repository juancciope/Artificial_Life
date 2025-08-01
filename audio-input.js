class AudioInputController {
    constructor(alife) {
        this.alife = alife;
        this.audioContext = null;
        this.mediaStream = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.frequencyData = null;
        
        // Audio analysis parameters
        this.fftSize = 2048;
        this.smoothingTimeConstant = 0.8;
        this.minDecibels = -90;
        this.maxDecibels = -10;
        
        // Control mappings
        this.isEnabled = false;
        this.isAnalyzing = false;
        this.sensitivity = 0.7;
        this.pitchSensitivity = 0.5;
        
        // Analysis data
        this.currentVolume = 0;
        this.currentPitch = 0;
        this.currentFrequency = 0;
        this.spectralCentroid = 0;
        this.spectralRolloff = 0;
        
        // Performance optimization
        this.analysisInterval = null;
        this.frameSkip = 0;
        this.maxFrameSkip = 2; // Analyze every 3rd frame for performance
        
        this.initializeAudioInput();
    }

    async initializeAudioInput() {
        try {
            console.log('🎤 Initializing audio input system...');
            
            // Check if getUserMedia is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia not supported in this browser');
            }
            
            console.log('✅ Audio input API available');
            this.updateAudioStatus('Audio input ready - Click "Enable Audio Input" to start');
            
        } catch (error) {
            console.error('❌ Audio input initialization failed:', error);
            this.updateAudioStatus('Audio input not available in this browser');
        }
    }

    async enableAudioInput() {
        try {
            console.log('🎤 Requesting audio input access...');
            
            // Request microphone/audio input access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100
                }
            });

            console.log('✅ Audio input access granted!');
            
            // Create audio context if not exists
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.fftSize;
            this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
            this.analyser.minDecibels = this.minDecibels;
            this.analyser.maxDecibels = this.maxDecibels;
            
            // Create microphone source
            this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.microphone.connect(this.analyser);
            
            // Initialize data arrays
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
            
            // Debug: Check audio stream
            const audioTracks = this.mediaStream.getAudioTracks();
            console.log(`🎵 Audio tracks found: ${audioTracks.length}`);
            audioTracks.forEach(track => {
                console.log(`  - Track: ${track.label}, Enabled: ${track.enabled}, Muted: ${track.muted}`);
            });
            
            console.log(`🎵 Audio analysis setup complete:
- Sample Rate: ${this.audioContext.sampleRate}Hz
- FFT Size: ${this.fftSize}
- Frequency Bins: ${this.analyser.frequencyBinCount}
- Audio Context State: ${this.audioContext.state}`);
            
            // Test the analyser immediately
            setTimeout(() => {
                const testData = new Uint8Array(this.analyser.frequencyBinCount);
                this.analyser.getByteFrequencyData(testData);
                const testMax = Math.max(...testData);
                console.log(`🔍 Initial signal test: Max value = ${testMax}`);
                if (testMax === 0) {
                    console.warn('⚠️ No signal detected on initial test - check microphone input');
                }
            }, 500);
            
            this.isEnabled = true;
            this.startAnalysis();
            this.updateAudioStatus('🎤 Audio input active - Play your instrument!');
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to enable audio input:', error);
            this.updateAudioStatus('Audio input access denied or failed');
            return false;
        }
    }

    disableAudioInput() {
        console.log('🔇 Disabling audio input...');
        
        this.stopAnalysis();
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        
        this.isEnabled = false;
        this.updateAudioStatus('Audio input disabled');
    }

    startAnalysis() {
        if (this.isAnalyzing) return;
        
        console.log('🔍 Starting real-time audio analysis...');
        this.isAnalyzing = true;
        
        // Start analysis loop
        this.analysisInterval = requestAnimationFrame(() => this.analyzeAudio());
    }

    stopAnalysis() {
        if (this.analysisInterval) {
            cancelAnimationFrame(this.analysisInterval);
            this.analysisInterval = null;
        }
        this.isAnalyzing = false;
        console.log('⏹️ Audio analysis stopped');
    }

    analyzeAudio() {
        if (!this.isEnabled || !this.analyser) return;
        
        // Performance optimization - skip frames
        this.frameSkip++;
        if (this.frameSkip < this.maxFrameSkip) {
            this.analysisInterval = requestAnimationFrame(() => this.analyzeAudio());
            return;
        }
        this.frameSkip = 0;
        
        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);
        this.analyser.getFloatFrequencyData(this.frequencyData);
        
        // Debug: Check if we're getting any data
        const maxValue = Math.max(...this.dataArray);
        if (maxValue > 0 && !this.hasSignal) {
            console.log('🎤 Signal detected! Max value:', maxValue);
            this.hasSignal = true;
        }
        
        // Calculate audio features
        this.calculateVolume();
        this.calculatePitch();
        this.calculateSpectralFeatures();
        
        // Map to artificial life controls
        this.mapAudioToControls();
        
        // Continue analysis loop
        this.analysisInterval = requestAnimationFrame(() => this.analyzeAudio());
    }

    calculateVolume() {
        // Calculate RMS volume
        let sum = 0;
        let maxVal = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i] * this.dataArray[i];
            maxVal = Math.max(maxVal, this.dataArray[i]);
        }
        
        // Use both RMS and peak for better detection
        const rms = Math.sqrt(sum / this.dataArray.length) / 255;
        const peak = maxVal / 255;
        
        // Use the higher value for better sensitivity
        this.currentVolume = Math.max(rms * 2, peak); // Boost RMS by 2x for better response
        
        // Debug every 30 frames (about 1 second)
        if (!this.debugCounter) this.debugCounter = 0;
        this.debugCounter++;
        if (this.debugCounter % 30 === 0) {
            console.log(`📊 Audio levels - RMS: ${(rms * 100).toFixed(1)}%, Peak: ${(peak * 100).toFixed(1)}%, Volume: ${(this.currentVolume * 100).toFixed(1)}%`);
        }
    }

    calculatePitch() {
        // Simple pitch detection using autocorrelation
        const bufferLength = this.analyser.fftSize;
        const buffer = new Float32Array(bufferLength);
        this.analyser.getFloatTimeDomainData(buffer);
        
        // Find fundamental frequency using autocorrelation
        let bestCorrelation = 0;
        let bestOffset = -1;
        let rms = 0;
        
        // Calculate RMS
        for (let i = 0; i < buffer.length; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / buffer.length);
        
        // Only analyze if signal is strong enough
        if (rms < 0.01) {
            this.currentPitch = 0;
            return;
        }
        
        // Autocorrelation
        for (let offset = 1; offset < bufferLength / 2; offset++) {
            let correlation = 0;
            for (let i = 0; i < bufferLength - offset; i++) {
                correlation += Math.abs(buffer[i] - buffer[i + offset]);
            }
            correlation = 1 - (correlation / (bufferLength - offset));
            
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestOffset = offset;
            }
        }
        
        if (bestOffset !== -1 && bestCorrelation > 0.3) {
            this.currentFrequency = this.audioContext.sampleRate / bestOffset;
            this.currentPitch = this.frequencyToMidiNote(this.currentFrequency);
        } else {
            this.currentPitch = 0;
        }
    }

    calculateSpectralFeatures() {
        // Calculate spectral centroid (brightness)
        let weightedSum = 0;
        let magnitudeSum = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            const magnitude = this.dataArray[i];
            const frequency = (i * this.audioContext.sampleRate) / (2 * this.dataArray.length);
            
            weightedSum += frequency * magnitude;
            magnitudeSum += magnitude;
        }
        
        this.spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
        
        // Calculate spectral rolloff (90% of energy)
        const totalEnergy = magnitudeSum;
        const rolloffThreshold = totalEnergy * 0.9;
        let cumulativeEnergy = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            cumulativeEnergy += this.dataArray[i];
            if (cumulativeEnergy >= rolloffThreshold) {
                this.spectralRolloff = (i * this.audioContext.sampleRate) / (2 * this.dataArray.length);
                break;
            }
        }
    }

    mapAudioToControls() {
        if (!this.alife || this.currentVolume < 0.01) return; // Lower noise gate for better sensitivity
        
        // Volume -> Radiation (loud sounds increase radiation)
        const volumeRadiation = Math.floor(this.currentVolume * 100 * this.sensitivity);
        if (volumeRadiation !== this.alife.session.radiation) {
            this.alife.session.radiation = Math.min(100, volumeRadiation);
            document.getElementById('radiationSlider').value = this.alife.session.radiation;
            document.getElementById('radiationValue').textContent = this.alife.session.radiation;
            
            if (this.currentVolume > 0.8) {
                console.log(`🔊 HIGH VOLUME: Radiation spike to ${this.alife.session.radiation}%`);
            }
        }
        
        // Pitch -> Population spawning (musical notes spawn lifeforms)
        if (this.currentPitch > 0 && this.currentVolume > 0.3) {
            const spawnCount = Math.floor(this.currentVolume * 5 * this.pitchSensitivity);
            for (let i = 0; i < spawnCount; i++) {
                this.alife.createLifeform();
            }
            
            console.log(`🎵 Pitch ${this.currentFrequency.toFixed(1)}Hz (${this.midiNoteToName(this.currentPitch)}): Spawned ${spawnCount} lifeforms`);
        }
        
        // Spectral centroid -> DNA chaos (brightness affects mutations)
        if (this.spectralCentroid > 1000) {
            const chaosAmount = Math.floor(((this.spectralCentroid - 1000) / 3000) * 50);
            this.alife.session.dnaChaosChance = Math.min(50, chaosAmount);
            
            if (chaosAmount > 30) {
                console.log(`✨ BRIGHT SOUND: DNA chaos increased to ${this.alife.session.dnaChaosChance}%`);
            }
        }
        
        // Low frequencies -> Gravity toggle
        const lowFreqEnergy = this.getLowFrequencyEnergy();
        if (lowFreqEnergy > 0.7 && !this.alife.session.gravityOn) {
            this.alife.session.gravityOn = true;
            document.getElementById('gravityToggle').checked = true;
            console.log('🌍 LOW FREQUENCIES: Gravity enabled');
        } else if (lowFreqEnergy < 0.3 && this.alife.session.gravityOn) {
            this.alife.session.gravityOn = false;
            document.getElementById('gravityToggle').checked = false;
            console.log('🌍 Gravity disabled');
        }
        
        // Very loud sounds -> Thanos snap
        if (this.currentVolume > 0.95) {
            if (!this.lastThanosTime || Date.now() - this.lastThanosTime > 3000) {
                this.alife.thanosSnap();
                this.lastThanosTime = Date.now();
                console.log('💀 MAXIMUM VOLUME: Thanos snap triggered!');
                
                // Visual feedback
                this.showAudioFeedback('💥 THANOS SNAP!', 'thanos');
            }
        }
    }

    getLowFrequencyEnergy() {
        // Calculate energy in low frequency range (20Hz - 200Hz)
        const lowFreqBins = Math.floor((200 * this.dataArray.length * 2) / this.audioContext.sampleRate);
        let lowEnergy = 0;
        
        for (let i = 1; i < Math.min(lowFreqBins, this.dataArray.length); i++) {
            lowEnergy += this.dataArray[i];
        }
        
        return lowEnergy / (lowFreqBins * 255);
    }

    frequencyToMidiNote(frequency) {
        return 12 * Math.log2(frequency / 440) + 69;
    }

    midiNoteToName(midiNote) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor((midiNote - 12) / 12);
        const noteIndex = Math.round(midiNote) % 12;
        return `${noteNames[noteIndex]}${octave}`;
    }

    showAudioFeedback(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `audio-feedback audio-feedback-${type}`;
        messageDiv.textContent = message;
        
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer) {
            canvasContainer.appendChild(messageDiv);
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 2000);
        }
    }

    updateAudioStatus(message) {
        const statusElement = document.querySelector('.audio-input-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
        console.log(`🎤 ${message}`);
    }

    // Sensitivity controls
    setSensitivity(value) {
        this.sensitivity = Math.max(0.1, Math.min(2.0, value));
        console.log(`🎚️ Audio sensitivity: ${this.sensitivity}`);
    }

    setPitchSensitivity(value) {
        this.pitchSensitivity = Math.max(0.1, Math.min(2.0, value));
        console.log(`🎵 Pitch sensitivity: ${this.pitchSensitivity}`);
    }

    // Get current audio data for visualization
    getVisualizationData() {
        return {
            volume: this.currentVolume,
            pitch: this.currentPitch,
            frequency: this.currentFrequency,
            spectralCentroid: this.spectralCentroid,
            frequencyData: this.dataArray,
            isEnabled: this.isEnabled,
            isAnalyzing: this.isAnalyzing
        };
    }
    
    // Manual test function to diagnose audio issues
    testAudioInput() {
        console.log('🧪 Audio Input Diagnostic Test:');
        console.log(`- Controller Enabled: ${this.isEnabled}`);
        console.log(`- Analyzing: ${this.isAnalyzing}`);
        console.log(`- Audio Context State: ${this.audioContext?.state || 'No context'}`);
        console.log(`- Media Stream Active: ${this.mediaStream?.active || false}`);
        
        if (this.analyser && this.dataArray) {
            // Get fresh data
            this.analyser.getByteFrequencyData(this.dataArray);
            const max = Math.max(...this.dataArray);
            const avg = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length;
            
            console.log(`- Frequency Data Max: ${max}`);
            console.log(`- Frequency Data Average: ${avg.toFixed(2)}`);
            
            // Get time domain data
            const timeData = new Float32Array(this.analyser.fftSize);
            this.analyser.getFloatTimeDomainData(timeData);
            const timeMax = Math.max(...timeData.map(Math.abs));
            
            console.log(`- Time Domain Max: ${timeMax.toFixed(4)}`);
            console.log(`- Current Volume: ${(this.currentVolume * 100).toFixed(2)}%`);
            
            if (max === 0 && timeMax < 0.001) {
                console.warn('⚠️ No signal detected! Check:');
                console.log('  1. Is your microphone selected in browser?');
                console.log('  2. Is microphone muted in OS?');
                console.log('  3. Try making loud sounds or tapping mic');
            }
        } else {
            console.error('❌ Analyser not initialized!');
        }
    }
}

// Export for use in main app
window.AudioInputController = AudioInputController;