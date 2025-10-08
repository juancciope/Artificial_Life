/**
 * Kinect Controller for Artificial Life Shadow Interaction
 * Connects to the Python Kinect WebSocket server and manages shadow mask data
 */

class KinectController {
    constructor(alife) {
        this.alife = alife;
        this.socket = null;
        this.isConnected = false;
        this.isEnabled = false;
        this.shadowMask = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // ms

        // Stats
        this.framesReceived = 0;
        this.shadowCellCount = 0;
        this.lastFrameTime = 0;
        this.fps = 0;
    }

    connect(host = '127.0.0.1', port = 8181) {
        if (this.socket) {
            console.log('⚠️  Already connected or connecting');
            return;
        }

        const url = `ws://${host}:${port}`;
        console.log(`🎮 Connecting to Kinect server at ${url}...`);
        this.updateStatus('Connecting...', '#FFAA00');

        try {
            this.socket = new WebSocket(url);

            this.socket.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('✅ Connected to Kinect server');
                this.updateStatus('Connected', '#00FF00');

                // Send initial grid size to server
                this.sendGridSize();
            };

            this.socket.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            this.socket.onerror = (error) => {
                console.error('❌ Kinect WebSocket error:', error);
                this.updateStatus('Error', '#FF0000');
            };

            this.socket.onclose = () => {
                this.isConnected = false;
                this.socket = null;
                console.log('❌ Disconnected from Kinect server');
                this.updateStatus('Disconnected', '#FF6666');

                // Attempt reconnection
                if (this.isEnabled && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    setTimeout(() => this.connect(host, port), this.reconnectDelay);
                }
            };

        } catch (error) {
            console.error('❌ Failed to create WebSocket:', error);
            this.updateStatus('Failed', '#FF0000');
        }
    }

    disconnect() {
        if (this.socket) {
            console.log('🛑 Disconnecting from Kinect server');
            this.isEnabled = false;
            this.socket.close();
            this.socket = null;
        }
        this.shadowMask = null;
        this.alife.shadowMask = null;
        this.updateStatus('Disconnected', '#666666');
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data);

            if (message.type === 'shadow_mask') {
                // Update shadow mask
                this.shadowMask = message.data;
                this.alife.shadowMask = this.shadowMask;

                // Update stats
                this.framesReceived++;
                if (message.metadata) {
                    this.shadowCellCount = message.metadata.shadow_cells;
                }

                // Calculate FPS
                const now = Date.now();
                if (this.lastFrameTime) {
                    const deltaTime = (now - this.lastFrameTime) / 1000;
                    this.fps = Math.round(1 / deltaTime);
                }
                this.lastFrameTime = now;

                // Update UI stats
                this.updateStats();
            }

        } catch (error) {
            console.error('Error parsing Kinect message:', error);
        }
    }

    sendGridSize() {
        if (this.socket && this.isConnected) {
            const message = JSON.stringify({
                grid_size: {
                    width: this.alife.gridSizeX,
                    height: this.alife.gridSizeY
                }
            });
            this.socket.send(message);
            console.log(`📐 Sent grid size: ${this.alife.gridSizeX}x${this.alife.gridSizeY}`);
        }
    }

    setThreshold(threshold) {
        if (this.socket && this.isConnected) {
            const message = JSON.stringify({ threshold: parseInt(threshold) });
            this.socket.send(message);
            console.log(`📏 Set depth threshold: ${threshold}mm`);
        }
    }

    enable() {
        this.isEnabled = true;
        console.log('👁️  Kinect shadow mode ENABLED');
    }

    disable() {
        this.isEnabled = false;
        this.shadowMask = null;
        this.alife.shadowMask = null;
        console.log('👁️  Kinect shadow mode DISABLED');
    }

    updateStatus(text, color) {
        const statusEl = document.getElementById('kinectStatus');
        if (statusEl) {
            statusEl.textContent = text;
            statusEl.style.color = color;
        }
    }

    updateStats() {
        // Update frames received
        const framesEl = document.getElementById('kinectFrames');
        if (framesEl) {
            framesEl.textContent = this.framesReceived;
        }

        // Update FPS
        const fpsEl = document.getElementById('kinectFPS');
        if (fpsEl) {
            fpsEl.textContent = this.fps;
        }

        // Update shadow cell count
        const shadowEl = document.getElementById('kinectShadow');
        if (shadowEl) {
            shadowEl.textContent = this.shadowCellCount;
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            enabled: this.isEnabled,
            framesReceived: this.framesReceived,
            fps: this.fps,
            shadowCells: this.shadowCellCount
        };
    }
}
