/**
 * PS4 DualShock 4 Gamepad Controller for Artificial Life
 * Uses the standard Gamepad API - works in all modern browsers
 * Just plug in your PS4 controller via USB and it works!
 */

class GamepadController {
    constructor(alife) {
        this.alife = alife;
        this.gamepad = null;
        this.isConnected = false;
        this.previousButtonStates = [];
        this.previousAxisStates = [];
        this.animationFrameId = null;

        // PS4 DualShock 4 Standard Mapping
        this.buttons = {
            CROSS: 0,      // ✖ (X)
            CIRCLE: 1,     // ○
            SQUARE: 2,     // ☐
            TRIANGLE: 3,   // △
            L1: 4,
            R1: 5,
            L2: 6,
            R2: 7,
            SHARE: 8,
            OPTIONS: 9,
            L3: 10,        // Left stick button
            R3: 11,        // Right stick button
            DPAD_UP: 12,
            DPAD_DOWN: 13,
            DPAD_LEFT: 14,
            DPAD_RIGHT: 15,
            PS: 16         // PS button
        };

        // Axes mapping
        this.axes = {
            LEFT_STICK_X: 0,
            LEFT_STICK_Y: 1,
            RIGHT_STICK_X: 2,
            RIGHT_STICK_Y: 3
        };

        // Analog trigger threshold
        this.triggerThreshold = 0.1;
        this.stickDeadzone = 0.15;

        // Initialize
        this.setupEventListeners();
        console.log('🎮 Gamepad Controller initialized - Connect PS4 controller via USB');
    }

    setupEventListeners() {
        window.addEventListener('gamepadconnected', (e) => this.onConnect(e));
        window.addEventListener('gamepaddisconnected', (e) => this.onDisconnect(e));
    }

    onConnect(event) {
        this.gamepad = event.gamepad;
        this.isConnected = true;

        // Initialize button states
        this.previousButtonStates = new Array(this.gamepad.buttons.length).fill(false);
        this.previousAxisStates = new Array(this.gamepad.axes.length).fill(0);

        console.log(`🎮 Gamepad connected: ${this.gamepad.id}`);
        console.log(`   Index: ${this.gamepad.index}`);
        console.log(`   Buttons: ${this.gamepad.buttons.length}`);
        console.log(`   Axes: ${this.gamepad.axes.length}`);

        // Update UI
        this.updateStatus('Connected', '#00FF00');
        this.updateGamepadInfo();

        // Start polling
        this.startPolling();

        // Show feedback
        this.createFeedbackMessage('PS4 CONTROLLER CONNECTED', 'gamepad-feedback-connect');
    }

    onDisconnect(event) {
        console.log(`🎮 Gamepad disconnected: ${event.gamepad.id}`);
        this.isConnected = false;
        this.gamepad = null;

        // Update UI
        this.updateStatus('Disconnected', '#FF6666');

        // Stop polling
        this.stopPolling();
    }

    startPolling() {
        // Poll gamepad state at ~60fps using requestAnimationFrame
        const poll = () => {
            if (this.isConnected) {
                this.updateGamepadState();
                this.animationFrameId = requestAnimationFrame(poll);
            }
        };
        poll();
    }

    stopPolling() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    updateGamepadState() {
        // Get fresh gamepad state
        const gamepads = navigator.getGamepads();
        if (!gamepads[this.gamepad.index]) return;

        this.gamepad = gamepads[this.gamepad.index];

        // Check buttons
        this.checkButtons();

        // Check analog sticks
        this.checkAnalogSticks();

        // Check analog triggers
        this.checkAnalogTriggers();
    }

    checkButtons() {
        for (let i = 0; i < this.gamepad.buttons.length; i++) {
            const button = this.gamepad.buttons[i];
            const wasPressed = this.previousButtonStates[i];
            const isPressed = button.pressed;

            // Button just pressed (edge detection)
            if (isPressed && !wasPressed) {
                this.handleButtonPress(i);
            }

            // Update state
            this.previousButtonStates[i] = isPressed;
        }
    }

    handleButtonPress(buttonIndex) {
        console.log(`🎮 Button ${buttonIndex} pressed`);

        // Check if survival game is active - different controls
        if (this.alife.survivalGame && this.alife.survivalGame.isActive) {
            this.handleSurvivalGameButton(buttonIndex);
            return;
        }

        switch(buttonIndex) {
            // Face Buttons
            case this.buttons.CROSS:
                // Spawn lifeforms
                const spawnCount = 5;
                for (let i = 0; i < spawnCount; i++) {
                    this.alife.createLifeform();
                }
                this.createFeedbackMessage(`SPAWN +${spawnCount}`, 'gamepad-feedback-spawn');
                break;

            case this.buttons.CIRCLE:
                // Thanos Snap
                this.alife.thanosSnap();
                this.createFeedbackMessage('THANOS SNAP!', 'gamepad-feedback-kill');
                if (this.alife.audioSystem) {
                    this.alife.audioSystem.playThanosSfx('intense');
                }
                break;

            case this.buttons.SQUARE:
                // Reset Life
                this.flashButton('resetBtn');
                this.alife.resetLife();
                this.createFeedbackMessage('RESET LIFE', 'gamepad-feedback');
                break;

            case this.buttons.TRIANGLE:
                // Toggle Dance Mode
                if (this.alife.danceController) {
                    const btn = document.getElementById('danceToggle');
                    if (!this.alife.danceController.isEnabled) {
                        this.alife.danceController.enable();
                        btn.textContent = 'Disable Dance Mode';
                        this.createFeedbackMessage('DANCE MODE ON', 'gamepad-feedback-spawn');
                    } else {
                        this.alife.danceController.disable();
                        btn.textContent = 'Enable Dance Mode';
                        this.createFeedbackMessage('DANCE MODE OFF', 'gamepad-feedback');
                    }
                }
                break;

            // Shoulder Buttons
            case this.buttons.L1:
                // Toggle Gravity
                this.alife.session.gravityOn = !this.alife.session.gravityOn;
                document.getElementById('gravityToggle').checked = this.alife.session.gravityOn;
                this.createFeedbackMessage(`GRAVITY ${this.alife.session.gravityOn ? 'ON' : 'OFF'}`, 'gamepad-feedback');
                break;

            case this.buttons.R1:
                // Toggle Trails
                this.alife.session.drawTrails = !this.alife.session.drawTrails;
                document.getElementById('trailsToggle').checked = this.alife.session.drawTrails;
                this.createFeedbackMessage(`TRAILS ${this.alife.session.drawTrails ? 'ON' : 'OFF'}`, 'gamepad-feedback');
                break;

            // Center Buttons
            case this.buttons.SHARE:
                // Pause/Resume
                if (this.alife.isRunning) {
                    this.flashButton('pauseBtn');
                    this.alife.pauseLife();
                    this.createFeedbackMessage('PAUSED', 'gamepad-feedback');
                } else {
                    this.flashButton('startBtn');
                    this.alife.startLife();
                    this.createFeedbackMessage('RESUMED', 'gamepad-feedback-spawn');
                }
                break;

            case this.buttons.OPTIONS:
                // Start Life
                this.flashButton('startBtn');
                this.alife.startLife();
                this.createFeedbackMessage('START LIFE', 'gamepad-feedback-spawn');
                break;

            case this.buttons.PS:
                // Start Survival Game
                if (this.alife.survivalGame) {
                    this.alife.survivalGame.start();
                    this.createFeedbackMessage('SURVIVAL GAME STARTED', 'gamepad-feedback-spawn');
                }
                break;

            // D-Pad
            case this.buttons.DPAD_UP:
                // Increase Radiation
                this.adjustRadiation(10);
                break;

            case this.buttons.DPAD_DOWN:
                // Decrease Radiation
                this.adjustRadiation(-10);
                break;

            case this.buttons.DPAD_LEFT:
                // Previous Formation
                this.cycleFormation(-1);
                break;

            case this.buttons.DPAD_RIGHT:
                // Next Formation
                this.cycleFormation(1);
                break;

            // Stick Buttons
            case this.buttons.L3:
                // Toggle Audio
                document.getElementById('audioToggle').click();
                break;

            case this.buttons.R3:
                // Cycle Color Palette
                this.cycleColorPalette();
                break;
        }
    }

    checkAnalogSticks() {
        // Get stick values
        const leftX = this.applyDeadzone(this.gamepad.axes[this.axes.LEFT_STICK_X]);
        const leftY = this.applyDeadzone(this.gamepad.axes[this.axes.LEFT_STICK_Y]);
        const rightX = this.applyDeadzone(this.gamepad.axes[this.axes.RIGHT_STICK_X]);
        const rightY = this.applyDeadzone(this.gamepad.axes[this.axes.RIGHT_STICK_Y]);

        // Survival game mode - use left stick for player movement
        if (this.alife.survivalGame && this.alife.survivalGame.isActive) {
            this.alife.survivalGame.movePlayer(leftX, leftY);
            this.previousAxisStates[this.axes.LEFT_STICK_X] = leftX;
            this.previousAxisStates[this.axes.LEFT_STICK_Y] = leftY;
            this.previousAxisStates[this.axes.RIGHT_STICK_X] = rightX;
            this.previousAxisStates[this.axes.RIGHT_STICK_Y] = rightY;
            return;
        }

        // Normal mode - Left Stick controls grid size
        if (Math.abs(leftX) > 0 || Math.abs(leftY) > 0) {
            // Grid size control - only on significant movement
            if (Math.abs(leftX - this.previousAxisStates[this.axes.LEFT_STICK_X]) > 0.3 ||
                Math.abs(leftY - this.previousAxisStates[this.axes.LEFT_STICK_Y]) > 0.3) {
                this.adjustGridSize(leftX, leftY);
            }
        }

        if (Math.abs(rightX) > 0) {
            // DNA Chaos control (right stick X)
            const dnaChaos = Math.floor((rightX + 1) * 50); // Map -1..1 to 0..100
            this.alife.session.radiationLevel = dnaChaos;
            document.getElementById('radiationSlider').value = dnaChaos;
            document.getElementById('radiationValue').textContent = dnaChaos;
        }

        // Update previous states
        this.previousAxisStates[this.axes.LEFT_STICK_X] = leftX;
        this.previousAxisStates[this.axes.LEFT_STICK_Y] = leftY;
        this.previousAxisStates[this.axes.RIGHT_STICK_X] = rightX;
        this.previousAxisStates[this.axes.RIGHT_STICK_Y] = rightY;
    }

    checkAnalogTriggers() {
        // Disable trigger controls in survival mode
        if (this.alife.survivalGame && this.alife.survivalGame.isActive) {
            return;
        }

        // L2 - Population Limit (0.0 to 1.0)
        const l2Value = this.gamepad.buttons[this.buttons.L2].value;
        if (l2Value > this.triggerThreshold) {
            const population = Math.floor(10 + (l2Value * 90)); // 10-100
            this.alife.session.maxLifeforms = population;
        }

        // R2 - Animation Speed (0.0 to 1.0)
        const r2Value = this.gamepad.buttons[this.buttons.R2].value;
        if (r2Value > this.triggerThreshold) {
            const speed = 50 + (r2Value * 150); // 50-200
            this.alife.animationSpeed = speed;
        }
    }

    applyDeadzone(value) {
        // Apply circular deadzone
        return Math.abs(value) < this.stickDeadzone ? 0 : value;
    }

    adjustRadiation(delta) {
        const current = this.alife.session.radiationLevel;
        const newValue = Math.max(0, Math.min(100, current + delta));
        this.alife.session.radiationLevel = newValue;
        document.getElementById('radiationSlider').value = newValue;
        document.getElementById('radiationValue').textContent = newValue;
        this.createFeedbackMessage(`RADIATION ${newValue}`, 'gamepad-feedback');
    }

    adjustGridSize(x, y) {
        // Adjust grid size based on stick input
        // X controls width, Y controls height
        const deltaX = x > 0.5 ? 5 : x < -0.5 ? -5 : 0;
        const deltaY = y > 0.5 ? 3 : y < -0.5 ? -3 : 0;

        if (deltaX !== 0 || deltaY !== 0) {
            const newX = Math.max(20, Math.min(100, this.alife.gridSizeX + deltaX));
            const newY = Math.max(15, Math.min(60, this.alife.gridSizeY + deltaY));

            if (newX !== this.alife.gridSizeX || newY !== this.alife.gridSizeY) {
                this.alife.gridSizeX = newX;
                this.alife.gridSizeY = newY;
                this.alife.resizeCanvas();
                this.createFeedbackMessage(`GRID ${newX}x${newY}`, 'gamepad-feedback');
            }
        }
    }

    cycleFormation(direction) {
        if (!this.alife.danceController) return;

        const formations = ['random', 'circle', 'spiral', 'grid', 'heart', 'star'];
        const current = formations.indexOf(this.alife.danceController.currentFormation);
        const next = (current + direction + formations.length) % formations.length;

        this.alife.danceController.currentFormation = formations[next];
        document.getElementById('formationSelect').value = formations[next];
        this.createFeedbackMessage(`FORMATION: ${formations[next].toUpperCase()}`, 'gamepad-feedback');
    }

    cycleColorPalette() {
        if (!this.alife.danceController) return;

        const palettes = ['neon', 'sunset', 'ocean', 'aurora', 'monochrome'];
        const current = palettes.indexOf(this.alife.danceController.currentPalette);
        const next = (current + 1) % palettes.length;

        this.alife.danceController.currentPalette = palettes[next];
        document.getElementById('colorPalette').value = palettes[next];
        this.createFeedbackMessage(`PALETTE: ${palettes[next].toUpperCase()}`, 'gamepad-feedback');
    }

    flashButton(buttonId) {
        const btn = document.getElementById(buttonId);
        if (btn) {
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = 'scale(1)';
            }, 100);
        }
    }

    createFeedbackMessage(text, className = 'gamepad-feedback') {
        const existing = document.querySelector('.gamepad-feedback-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = `gamepad-feedback-overlay ${className}`;
        overlay.textContent = text;
        document.body.appendChild(overlay);

        setTimeout(() => overlay.remove(), 1500);
    }

    updateStatus(text, color) {
        const statusEl = document.getElementById('gamepadStatus');
        if (statusEl) {
            statusEl.textContent = text;
            statusEl.style.color = color;
        }
    }

    updateGamepadInfo() {
        const nameEl = document.getElementById('gamepadName');
        const buttonsEl = document.getElementById('gamepadButtons');

        if (nameEl && this.gamepad) {
            nameEl.textContent = this.gamepad.id;
        }
        if (buttonsEl && this.gamepad) {
            buttonsEl.textContent = `${this.gamepad.buttons.length} buttons, ${this.gamepad.axes.length} axes`;
        }
    }

    handleSurvivalGameButton(buttonIndex) {
        const game = this.alife.survivalGame;

        switch(buttonIndex) {
            case this.buttons.CROSS:
                // X - Suicide/Break the Seventh Seal
                game.instantDeath();
                this.createFeedbackMessage('SEVENTH SEAL BROKEN!', 'gamepad-feedback-kill');
                break;

            case this.buttons.SQUARE:
                // Square - Speed Boost
                game.activateSpeedBoost();
                break;

            case this.buttons.R1:
                // R1 - Shield
                game.activateShield();
                break;

            case this.buttons.R2:
                // R2 - Shoot
                game.shoot(this.playerDirection?.x, this.playerDirection?.y);
                break;

            // D-Pad also controls movement (alternative to left stick)
            case this.buttons.DPAD_UP:
                game.movePlayer(0, -1);
                break;

            case this.buttons.DPAD_DOWN:
                game.movePlayer(0, 1);
                break;

            case this.buttons.DPAD_LEFT:
                game.movePlayer(-1, 0);
                break;

            case this.buttons.DPAD_RIGHT:
                game.movePlayer(1, 0);
                break;

            // Options/Share - Exit survival game
            case this.buttons.OPTIONS:
            case this.buttons.SHARE:
                game.stop();
                this.createFeedbackMessage('EXITED SURVIVAL MODE', 'gamepad-feedback');
                break;

            // PS Button - Restart game (only when game over)
            case this.buttons.PS:
                if (game.isGameOver) {
                    game.restart();
                    this.createFeedbackMessage('GAME RESTARTED', 'gamepad-feedback-spawn');
                } else {
                    console.log('🎮 PS button only works when game is over');
                }
                break;

            // All other buttons are disabled in survival mode
            case this.buttons.L1:
            case this.buttons.R1:
            case this.buttons.L2:
            case this.buttons.R2:
            case this.buttons.L3:
            case this.buttons.R3:
                // Ignore these buttons during survival mode
                console.log(`🎮 Button ${buttonIndex} disabled in survival mode`);
                break;
        }
    }
}
