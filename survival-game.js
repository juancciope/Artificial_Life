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
        this.blocksCollected = 0;

        // Timer system
        this.gameTime = 120; // 2 minutes in seconds
        this.timeRemaining = this.gameTime;
        this.timerInterval = null;

        // Collectible blocks
        this.collectibles = [];
        this.maxCollectibles = 8;
        this.collectibleColors = [
            { color: '#FF00FF', name: 'MAGENTA', points: 10 },    // Magenta
            { color: '#00FFFF', name: 'CYAN', points: 15 },       // Cyan
            { color: '#FFA500', name: 'ORANGE', points: 20 },     // Orange
            { color: '#00FF7F', name: 'SPRING', points: 25 },     // Spring Green
            { color: '#FF1493', name: 'PINK', points: 30 },       // Deep Pink
            { color: '#7FFF00', name: 'CHARTREUSE', points: 35 }, // Chartreuse
            { color: '#9370DB', name: 'PURPLE', points: 40 },     // Medium Purple
            { color: '#FFD700', name: 'GOLD', points: 50 }        // Gold - rare
        ];
        this.collectibleSpawnInterval = 3000; // Spawn new collectible every 3 seconds
        this.lastCollectibleSpawn = 0;

        // Movement
        this.playerDirection = { x: 0, y: 0 };
    }

    start() {
        console.log('🎮 Starting Survival Game Mode...');
        this.isActive = true;
        this.isGameOver = false;
        this.startTime = Date.now();

        // Ensure animation loop is running
        if (!this.alife.isRunning) {
            this.alife.startLife();
        }

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
        this.blocksCollected = 0;
        this.playerHealth = this.playerMaxHealth;
        this.timeRemaining = this.gameTime;

        // Clear collectibles
        this.collectibles = [];
        this.lastCollectibleSpawn = Date.now();

        // Spawn initial collectibles
        for (let i = 0; i < 3; i++) {
            this.spawnCollectible();
        }

        // Start timer
        this.startTimer();

        // Show game UI
        this.showGameUI();

        console.log('✅ Survival Game Started!');
    }

    stop() {
        this.isActive = false;
        this.stopTimer();
        this.hideGameUI();
        console.log('🛑 Survival Game Stopped');
    }

    restart() {
        console.log('🔄 Restarting Survival Game...');

        // Remove game over screen if it exists
        const overlay = document.getElementById('gameOverOverlay');
        if (overlay) {
            overlay.remove();
        }

        this.stopTimer();
        this.projectiles = [];
        this.collectibles = [];
        this.collidingEnemies.clear();
        this.hasShield = false;
        this.isSpeedBoosted = false;
        this.shieldAvailable = true;
        this.speedBoostAvailable = true;
        this.canShoot = true;
        this.start();
    }

    startTimer() {
        this.stopTimer(); // Clear any existing timer
        this.timerInterval = setInterval(() => {
            if (this.isActive && !this.isGameOver) {
                this.timeRemaining--;

                if (this.timeRemaining <= 0) {
                    this.timeUp();
                }
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    timeUp() {
        console.log('⏱️ TIME UP!');
        this.isGameOver = true;
        this.stopTimer();
        this.showTimeUpScreen();
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
            },
            // Grid-based movement
            moveStepCounter: 0,
            moveStepDelay: 3 // Move every N frames for grid-based feel
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

            this.alife.createLifeform(x, y);
        }
    }

    distanceToPlayer(x, y) {
        if (!this.player) return 0;
        const dx = x - this.player.x;
        const dy = y - this.player.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    spawnCollectible() {
        if (this.collectibles.length >= this.maxCollectibles) return;

        // Spawn collectible away from player
        let x, y;
        let attempts = 0;
        do {
            x = Math.floor(Math.random() * this.alife.gridSizeX);
            y = Math.floor(Math.random() * this.alife.gridSizeY);
            attempts++;
        } while (this.distanceToPlayer(x, y) < 5 && attempts < 50); // Not too close to player

        // Random collectible type (weighted - rarer colors less common)
        const rand = Math.random();
        let colorIndex;
        if (rand < 0.05) colorIndex = 7; // Gold 5%
        else if (rand < 0.15) colorIndex = 6; // Purple 10%
        else if (rand < 0.30) colorIndex = 5; // Chartreuse 15%
        else if (rand < 0.50) colorIndex = 4; // Pink 20%
        else if (rand < 0.70) colorIndex = 3; // Spring 20%
        else if (rand < 0.85) colorIndex = 2; // Orange 15%
        else if (rand < 0.95) colorIndex = 1; // Cyan 10%
        else colorIndex = 0; // Magenta 5%

        const colorData = this.collectibleColors[colorIndex];

        this.collectibles.push({
            x: x,
            y: y,
            color: colorData.color,
            name: colorData.name,
            points: colorData.points,
            pulsePhase: Math.random() * Math.PI * 2 // Random start for animation
        });

        console.log(`✨ Spawned ${colorData.name} collectible (+${colorData.points} pts) at (${x}, ${y})`);
    }

    checkCollectibleCollection() {
        if (!this.player) return;

        const playerGridX = Math.floor(this.player.x);
        const playerGridY = Math.floor(this.player.y);

        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const collectible = this.collectibles[i];

            // Check if player is on collectible (within 1 cell)
            const dist = Math.sqrt(
                Math.pow(playerGridX - collectible.x, 2) +
                Math.pow(playerGridY - collectible.y, 2)
            );

            if (dist < 1.5) {
                // Collect it!
                this.score += collectible.points;
                this.blocksCollected++;

                console.log(`🎯 Collected ${collectible.name} +${collectible.points} pts! Total: ${this.score}`);

                // Visual feedback
                this.createCollectFeedback(collectible);

                // Remove collectible
                this.collectibles.splice(i, 1);
            }
        }
    }

    createCollectFeedback(collectible) {
        const overlay = document.createElement('div');
        overlay.className = 'collect-feedback';
        overlay.textContent = `+${collectible.points}`;
        overlay.style.cssText = `
            position: fixed;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: ${collectible.color};
            font-family: 'JetBrains Mono', monospace;
            font-size: 48px;
            font-weight: bold;
            pointer-events: none;
            z-index: 9998;
            text-shadow: 0 0 10px ${collectible.color};
            animation: collectFeedbackFloat 1s ease-out forwards;
        `;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 1000);
    }

    update() {
        if (!this.isActive || this.isGameOver) return;

        // Update survival time
        this.survivalTime = Math.floor((Date.now() - this.startTime) / 1000);

        // Spawn new collectibles periodically
        if (Date.now() - this.lastCollectibleSpawn > this.collectibleSpawnInterval) {
            this.spawnCollectible();
            this.lastCollectibleSpawn = Date.now();
        }

        // Update player movement
        this.updatePlayerMovement();

        // Check collectible collection
        this.checkCollectibleCollection();

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

        // Grid-based movement - only move every N frames
        this.player.moveStepCounter++;
        const moveDelay = this.isSpeedBoosted ? 1 : this.player.moveStepDelay;

        if (this.player.moveStepCounter >= moveDelay &&
            (this.playerDirection.x !== 0 || this.playerDirection.y !== 0)) {
            this.player.moveStepCounter = 0;

            const oldKey = `${Math.floor(this.player.x)},${Math.floor(this.player.y)}`;

            // Move one grid cell at a time (integer movement)
            this.player.x += Math.sign(this.playerDirection.x);
            this.player.y += Math.sign(this.playerDirection.y);

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

            // Check hit with enemies - check all lifeforms directly
            let hitEnemy = false;
            const projGridX = Math.floor(proj.x);
            const projGridY = Math.floor(proj.y);

            for (const [enemyId, enemy] of this.alife.lifeforms.entries()) {
                // Skip player
                if (enemy.isPlayer) continue;

                const enemyGridX = Math.floor(enemy.x);
                const enemyGridY = Math.floor(enemy.y);

                // Check if projectile is on same grid cell as enemy
                const distance = Math.sqrt(
                    Math.pow(projGridX - enemyGridX, 2) +
                    Math.pow(projGridY - enemyGridY, 2)
                );

                if (distance < 1.5) {
                    // Hit enemy!
                    const key = `${enemyGridX},${enemyGridY}`;
                    this.alife.lifeforms.delete(enemyId);
                    delete this.alife.grid[key];
                    this.enemiesKilled++;
                    this.score += 10;
                    console.log(`💥 Enemy killed at (${enemyGridX},${enemyGridY})! Total: ${this.enemiesKilled}, Score: ${this.score}`);
                    hitEnemy = true;
                    break;
                }
            }

            if (hitEnemy) {
                this.projectiles.splice(i, 1);
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

        // Check if player is on same cell as any enemy
        let hitByEnemy = false;
        for (const [enemyId, enemy] of this.alife.lifeforms.entries()) {
            if (enemy.isPlayer) continue;

            const enemyGridX = Math.floor(enemy.x);
            const enemyGridY = Math.floor(enemy.y);

            // Check if on same grid cell
            if (enemyGridX === playerGridX && enemyGridY === playerGridY) {
                hitByEnemy = true;
                console.log(`💥 Hit by enemy! Health: ${this.playerHealth}%`);
                break;
            }
        }

        // Take 50% damage per hit (2 hits = death)
        if (hitByEnemy) {
            this.takeDamage(50);
        }
    }

    takeDamage(amount) {
        this.playerHealth -= amount;
        this.lastHitTime = Date.now();

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

        // Render collectibles (pulsing animation)
        const pulseTime = Date.now() * 0.003;
        for (const collectible of this.collectibles) {
            const x = collectible.x * this.alife.cellSize;
            const y = collectible.y * this.alife.cellSize;

            // Pulsing effect
            const pulse = Math.sin(pulseTime + collectible.pulsePhase) * 0.3 + 1.0;
            const size = this.alife.cellSize * pulse;
            const offset = (this.alife.cellSize - size) / 2;

            ctx.fillStyle = collectible.color;
            ctx.shadowBlur = 15;
            ctx.shadowColor = collectible.color;
            ctx.fillRect(x + offset, y + offset, size, size);
            ctx.shadowBlur = 0;

            // Draw border for visibility
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + offset, y + offset, size, size);
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
                top: 0;
                left: 0;
                right: 0;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 10px 20px;
                font-family: 'JetBrains Mono', monospace;
                font-size: 12px;
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 20px;
                border-bottom: 2px solid #FFFF00;
                box-shadow: 0 2px 10px rgba(0,0,0,0.5);
            `;
            document.body.appendChild(ui);
        }
        ui.style.display = 'flex';
    }

    hideGameUI() {
        const ui = document.getElementById('survivalGameUI');
        if (ui) ui.style.display = 'none';
    }

    updateGameUI() {
        const ui = document.getElementById('survivalGameUI');
        if (!ui) return;

        const healthColor = this.playerHealth > 60 ? '#00FF00' : this.playerHealth > 30 ? '#FFFF00' : '#FF0000';
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        const timeColor = this.timeRemaining > 30 ? '#00FFFF' : this.timeRemaining > 10 ? '#FFFF00' : '#FF0000';

        ui.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                <div style="font-size: 16px; font-weight: bold; color: #FFFF00;">🎮 SURVIVAL</div>
                <div style="font-size: 18px; font-weight: bold; color: ${timeColor};">⏱️ ${timeStr}</div>
                <div style="font-size: 14px;">Score: <span style="color: #00FF00; font-weight: bold;">${this.score}</span></div>
                <div style="font-size: 14px;">Blocks: <span style="color: #FF00FF; font-weight: bold;">${this.blocksCollected}</span></div>
                <div style="font-size: 14px;">Kills: <span style="color: #FF6666; font-weight: bold;">${this.enemiesKilled}</span></div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                    <span style="color: ${this.shieldAvailable ? '#00FFFF' : '#666'};">🛡️${this.shieldAvailable ? '✓' : '⌛'}</span>
                    <span style="color: ${this.speedBoostAvailable ? '#00FF00' : '#666'};">⚡${this.speedBoostAvailable ? '✓' : '⌛'}</span>
                    <span style="color: ${this.canShoot ? '#00FF00' : '#666'};">🔫${this.canShoot ? '✓' : '⌛'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 11px; color: #AAA;">Health:</span>
                    <div style="background: #333; width: 120px; height: 16px; border-radius: 3px; overflow: hidden; border: 1px solid #555;">
                        <div style="width: ${(this.playerHealth / this.playerMaxHealth) * 100}%; height: 100%; background: ${healthColor}; transition: width 0.3s;"></div>
                    </div>
                    <span style="font-size: 11px; color: ${healthColor}; font-weight: bold; min-width: 35px;">${this.playerHealth}%</span>
                </div>
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
                    <div>Blocks Collected: <span style="color: #FF00FF;">${this.blocksCollected}</span></div>
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
                ">RESTART (PS Button)</button>
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

    showTimeUpScreen() {
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
                <h1 style="font-size: 60px; color: #FFD700; margin: 0;">TIME'S UP!</h1>
                <h2 style="font-size: 36px; color: #00FF00; margin: 20px 0;">YOU SURVIVED!</h2>
                <div style="font-size: 24px; margin: 30px 0;">
                    <div>Final Score: <span style="color: #00FF00;">${this.score}</span></div>
                    <div>Blocks Collected: <span style="color: #FF00FF;">${this.blocksCollected}</span></div>
                    <div>Enemies Killed: <span style="color: #FF6666;">${this.enemiesKilled}</span></div>
                    <div style="margin-top: 20px; color: #00FFFF;">Health Remaining: ${this.playerHealth}%</div>
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
                ">PLAY AGAIN (PS Button)</button>
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
