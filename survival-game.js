/**
 * Survival Game Mode for Artificial Life
 * Pac-Man style survival game controlled with PS4 DualShock 4
 *
 * Rules:
 * - You are the YELLOW lifeform (strong)
 * - Other lifeforms are RED (enemies)
 * - Get hit by 3 enemies at once = DEATH
 * - Survive as long as possible
 *
 * Controls:
 * - Left Stick / D-Pad: Move
 * - X (Cross): Shield (temporary invincibility)
 * - O (Circle): Shoot projectile
 * - Triangle: Instant death (restart)
 * - Square: Speed boost
 */

class SurvivalGame {
    constructor(alife) {
        this.alife = alife;
        this.isActive = false;
        this.isGameOver = false;

        // Player properties
        this.player = null;
        this.playerSpeed = 0.3;
        this.playerBaseSpeed = 0.3;
        this.playerColor = '#FFFF00'; // Yellow - Pac-Man style
        this.playerHealth = 100;
        this.playerMaxHealth = 100;

        // Shield system
        this.hasShield = false;
        this.shieldDuration = 3000; // 3 seconds
        this.shieldCooldown = 5000; // 5 second cooldown
        this.shieldAvailable = true;
        this.shieldColor = '#00FFFF'; // Cyan

        // Speed boost system
        this.isSpeedBoosted = false;
        this.speedBoostMultiplier = 2.0;
        this.speedBoostDuration = 2000; // 2 seconds
        this.speedBoostCooldown = 4000; // 4 second cooldown
        this.speedBoostAvailable = true;

        // Shooting system
        this.projectiles = [];
        this.shootCooldown = 500; // 0.5 second between shots
        this.canShoot = true;
        this.projectileSpeed = 0.8;
        this.projectileColor = '#00FF00'; // Green

        // Enemy collision tracking
        this.collidingEnemies = new Set();
        this.hitCooldown = 1000; // 1 second invincibility after hit
        this.lastHitTime = 0;

        // Game stats
        this.score = 0;
        this.startTime = 0;
        this.survivalTime = 0;
        this.enemiesKilled = 0;

        // Movement
        this.playerDirection = { x: 0, y: 0 };
    }

    start() {
        console.log('🎮 Starting Survival Game Mode...');
        this.isActive = true;
        this.isGameOver = false;
        this.startTime = Date.now();

        // Clear existing lifeforms
        this.alife.lifeforms.clear();
        this.alife.grid = {};

        // Create player at center
        this.createPlayer();

        // Spawn initial enemies
        this.spawnEnemies(10);

        // Reset stats
        this.score = 0;
        this.enemiesKilled = 0;
        this.playerHealth = this.playerMaxHealth;

        // Show game UI
        this.showGameUI();

        console.log('✅ Survival Game Started!');
    }

    stop() {
        this.isActive = false;
        this.hideGameUI();
        console.log('🛑 Survival Game Stopped');
    }

    restart() {
        console.log('🔄 Restarting Survival Game...');
        this.projectiles = [];
        this.collidingEnemies.clear();
        this.hasShield = false;
        this.isSpeedBoosted = false;
        this.shieldAvailable = true;
        this.speedBoostAvailable = true;
        this.canShoot = true;
        this.start();
    }

    createPlayer() {
        // Create player lifeform at center
        const centerX = Math.floor(this.alife.gridSizeX / 2);
        const centerY = Math.floor(this.alife.gridSizeY / 2);

        this.player = {
            id: 'PLAYER',
            x: centerX,
            y: centerY,
            vx: 0,
            vy: 0,
            isPlayer: true,
            energy: 1000,
            age: 0,
            dna: {
                color: this.playerColor,
                speed: this.playerSpeed,
                strength: 100, // Super strong
                size: 1.5 // Bigger than normal
            }
        };

        // Add to lifeforms
        this.alife.lifeforms.set('PLAYER', this.player);
        const key = `${centerX},${centerY}`;
        this.alife.grid[key] = 'PLAYER';
    }

    spawnEnemies(count) {
        for (let i = 0; i < count; i++) {
            // Spawn away from player
            let x, y;
            do {
                x = Math.floor(Math.random() * this.alife.gridSizeX);
                y = Math.floor(Math.random() * this.alife.gridSizeY);
            } while (this.distanceToPlayer(x, y) < 10); // Not too close

            this.alife.createLifeformAt(x, y);
        }
    }

    distanceToPlayer(x, y) {
        if (!this.player) return 0;
        const dx = x - this.player.x;
        const dy = y - this.player.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    update() {
        if (!this.isActive || this.isGameOver) return;

        // Update survival time
        this.survivalTime = Math.floor((Date.now() - this.startTime) / 1000);

        // Update player movement
        this.updatePlayerMovement();

        // Update projectiles
        this.updateProjectiles();

        // Check collisions
        this.checkCollisions();

        // Update UI
        this.updateGameUI();

        // Spawn more enemies over time
        if (this.alife.lifeforms.size < 20 && Math.random() < 0.02) {
            this.spawnEnemies(1);
        }
    }

    updatePlayerMovement() {
        if (!this.player) return;

        // Apply direction
        const speed = this.isSpeedBoosted ? this.playerSpeed * this.speedBoostMultiplier : this.playerSpeed;

        const oldKey = `${Math.floor(this.player.x)},${Math.floor(this.player.y)}`;

        this.player.x += this.playerDirection.x * speed;
        this.player.y += this.playerDirection.y * speed;

        // Wrap around edges (Pac-Man style)
        if (this.player.x < 0) this.player.x = this.alife.gridSizeX - 1;
        if (this.player.x >= this.alife.gridSizeX) this.player.x = 0;
        if (this.player.y < 0) this.player.y = this.alife.gridSizeY - 1;
        if (this.player.y >= this.alife.gridSizeY) this.player.y = 0;

        // Update grid
        const newKey = `${Math.floor(this.player.x)},${Math.floor(this.player.y)}`;
        if (oldKey !== newKey) {
            delete this.alife.grid[oldKey];
            this.alife.grid[newKey] = 'PLAYER';
        }
    }

    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];

            proj.x += proj.vx * this.projectileSpeed;
            proj.y += proj.vy * this.projectileSpeed;

            // Remove if out of bounds
            if (proj.x < 0 || proj.x >= this.alife.gridSizeX ||
                proj.y < 0 || proj.y >= this.alife.gridSizeY) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Check hit with enemies
            const key = `${Math.floor(proj.x)},${Math.floor(proj.y)}`;
            const enemyId = this.alife.grid[key];

            if (enemyId && enemyId !== 'PLAYER') {
                // Hit enemy
                this.alife.lifeforms.delete(enemyId);
                delete this.alife.grid[key];
                this.projectiles.splice(i, 1);
                this.enemiesKilled++;
                this.score += 10;
            }
        }
    }

    checkCollisions() {
        if (!this.player || this.hasShield) return;

        // Check if hit cooldown is active
        if (Date.now() - this.lastHitTime < this.hitCooldown) return;

        // Find nearby enemies
        const playerGridX = Math.floor(this.player.x);
        const playerGridY = Math.floor(this.player.y);

        this.collidingEnemies.clear();

        // Check 3x3 area around player
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const checkX = playerGridX + dx;
                const checkY = playerGridY + dy;
                const key = `${checkX},${checkY}`;
                const enemyId = this.alife.grid[key];

                if (enemyId && enemyId !== 'PLAYER') {
                    this.collidingEnemies.add(enemyId);
                }
            }
        }

        // Take damage if 3+ enemies nearby
        if (this.collidingEnemies.size >= 3) {
            this.takeDamage(20);
        } else if (this.collidingEnemies.size > 0) {
            // Light damage from 1-2 enemies
            this.takeDamage(5);
        }
    }

    takeDamage(amount) {
        this.playerHealth -= amount;
        this.lastHitTime = Date.now();

        if (this.alife.audioSystem) {
            this.alife.audioSystem.playSfx('combat');
        }

        if (this.playerHealth <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        this.isGameOver = true;
        console.log('💀 GAME OVER!');
        console.log(`   Survival Time: ${this.survivalTime}s`);
        console.log(`   Score: ${this.score}`);
        console.log(`   Enemies Killed: ${this.enemiesKilled}`);

        this.showGameOverScreen();
    }

    // PS4 Controller Input
    movePlayer(x, y) {
        this.playerDirection.x = x;
        this.playerDirection.y = y;
    }

    activateShield() {
        if (!this.shieldAvailable || !this.isActive || this.isGameOver) return;

        this.hasShield = true;
        this.shieldAvailable = false;

        console.log('🛡️ Shield activated!');

        setTimeout(() => {
            this.hasShield = false;
            console.log('🛡️ Shield expired');

            setTimeout(() => {
                this.shieldAvailable = true;
                console.log('🛡️ Shield ready');
            }, this.shieldCooldown);
        }, this.shieldDuration);
    }

    shoot(directionX, directionY) {
        if (!this.canShoot || !this.isActive || this.isGameOver) return;

        // Use current movement direction or default forward
        let vx = directionX || this.playerDirection.x || 0;
        let vy = directionY || this.playerDirection.y || -1; // Default up

        // Normalize direction
        const mag = Math.sqrt(vx * vx + vy * vy);
        if (mag > 0) {
            vx /= mag;
            vy /= mag;
        }

        this.projectiles.push({
            x: this.player.x,
            y: this.player.y,
            vx: vx,
            vy: vy
        });

        this.canShoot = false;

        if (this.alife.audioSystem) {
            this.alife.audioSystem.playSfx('spawn');
        }

        setTimeout(() => {
            this.canShoot = true;
        }, this.shootCooldown);
    }

    activateSpeedBoost() {
        if (!this.speedBoostAvailable || !this.isActive || this.isGameOver) return;

        this.isSpeedBoosted = true;
        this.speedBoostAvailable = false;

        console.log('⚡ Speed boost activated!');

        setTimeout(() => {
            this.isSpeedBoosted = false;
            console.log('⚡ Speed boost expired');

            setTimeout(() => {
                this.speedBoostAvailable = true;
                console.log('⚡ Speed boost ready');
            }, this.speedBoostCooldown);
        }, this.speedBoostDuration);
    }

    instantDeath() {
        if (!this.isActive || this.isGameOver) return;
        console.log('☠️ Instant death triggered!');
        this.playerHealth = 0;
        this.gameOver();
    }

    render(ctx) {
        if (!this.isActive) return;

        // Render player with special color
        if (this.player) {
            const x = this.player.x * this.alife.cellSize;
            const y = this.player.y * this.alife.cellSize;

            // Shield effect
            if (this.hasShield) {
                ctx.fillStyle = this.shieldColor;
                ctx.globalAlpha = 0.5;
                ctx.fillRect(
                    x - this.alife.cellSize * 0.5,
                    y - this.alife.cellSize * 0.5,
                    this.alife.cellSize * 2,
                    this.alife.cellSize * 2
                );
                ctx.globalAlpha = 1.0;
            }

            // Player
            ctx.fillStyle = this.playerColor;
            if (this.isSpeedBoosted) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = this.playerColor;
            }
            ctx.fillRect(x, y, this.alife.cellSize, this.alife.cellSize);
            ctx.shadowBlur = 0;
        }

        // Render projectiles
        ctx.fillStyle = this.projectileColor;
        for (const proj of this.projectiles) {
            const x = proj.x * this.alife.cellSize;
            const y = proj.y * this.alife.cellSize;
            ctx.beginPath();
            ctx.arc(x + this.alife.cellSize / 2, y + this.alife.cellSize / 2, this.alife.cellSize / 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    showGameUI() {
        let ui = document.getElementById('survivalGameUI');
        if (!ui) {
            ui = document.createElement('div');
            ui.id = 'survivalGameUI';
            ui.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px;
                border-radius: 10px;
                font-family: 'JetBrains Mono', monospace;
                font-size: 14px;
                z-index: 1000;
                min-width: 200px;
            `;
            document.body.appendChild(ui);
        }
        ui.style.display = 'block';
    }

    hideGameUI() {
        const ui = document.getElementById('survivalGameUI');
        if (ui) ui.style.display = 'none';
    }

    updateGameUI() {
        const ui = document.getElementById('survivalGameUI');
        if (!ui) return;

        const healthBar = Math.floor((this.playerHealth / this.playerMaxHealth) * 20);
        const healthColor = this.playerHealth > 60 ? '#00FF00' : this.playerHealth > 30 ? '#FFFF00' : '#FF0000';

        ui.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #FFFF00;">🎮 SURVIVAL MODE</h3>
            <div style="margin: 5px 0;">Time: <span style="color: #00FFFF;">${this.survivalTime}s</span></div>
            <div style="margin: 5px 0;">Score: <span style="color: #00FF00;">${this.score}</span></div>
            <div style="margin: 5px 0;">Kills: <span style="color: #FF6666;">${this.enemiesKilled}</span></div>
            <div style="margin: 10px 0 5px 0;">Health:</div>
            <div style="background: #333; height: 20px; border-radius: 3px; overflow: hidden;">
                <div style="width: ${(this.playerHealth / this.playerMaxHealth) * 100}%; height: 100%; background: ${healthColor}; transition: width 0.3s;"></div>
            </div>
            <div style="margin: 10px 0 5px 0; font-size: 11px; color: #888;">
                🛡️ Shield: ${this.shieldAvailable ? '✓' : '⌛'}<br>
                ⚡ Speed: ${this.speedBoostAvailable ? '✓' : '⌛'}<br>
                🔫 Shoot: ${this.canShoot ? '✓' : '⌛'}
            </div>
        `;
    }

    showGameOverScreen() {
        const overlay = document.createElement('div');
        overlay.id = 'gameOverOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: 'JetBrains Mono', monospace;
            color: white;
        `;

        overlay.innerHTML = `
            <div style="text-align: center;">
                <h1 style="font-size: 60px; color: #FF0000; margin: 0;">GAME OVER</h1>
                <div style="font-size: 24px; margin: 30px 0;">
                    <div>Survival Time: <span style="color: #00FFFF;">${this.survivalTime}s</span></div>
                    <div>Final Score: <span style="color: #00FF00;">${this.score}</span></div>
                    <div>Enemies Killed: <span style="color: #FF6666;">${this.enemiesKilled}</span></div>
                </div>
                <button id="restartGameBtn" style="
                    background: #FFFF00;
                    color: black;
                    border: none;
                    padding: 15px 40px;
                    font-size: 20px;
                    font-family: 'JetBrains Mono', monospace;
                    border-radius: 5px;
                    cursor: pointer;
                    margin: 10px;
                ">RESTART (Triangle)</button>
                <button id="exitGameBtn" style="
                    background: #666;
                    color: white;
                    border: none;
                    padding: 15px 40px;
                    font-size: 20px;
                    font-family: 'JetBrains Mono', monospace;
                    border-radius: 5px;
                    cursor: pointer;
                    margin: 10px;
                ">EXIT</button>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('restartGameBtn').addEventListener('click', () => {
            overlay.remove();
            this.restart();
        });

        document.getElementById('exitGameBtn').addEventListener('click', () => {
            overlay.remove();
            this.stop();
        });
    }
}
