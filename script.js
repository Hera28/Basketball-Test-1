// --- Game State Variables ---
let isPowering = false;
let gameActive = true;
let power = 0; // 0 to 100
let animationFrameId = null;
let score = 0;
let shotCount = 1;
const MAX_SHOTS = 10;
const POWER_SPEED = 2; // Speed of power bar movement
const START_BALL_X = 285; // Initial X position of the ball (center)

// --- DOM Elements ---
const powerBar = document.getElementById('powerBar');
const ball = document.getElementById('ball');
const message = document.getElementById('message');
const scoreDisplay = document.getElementById('score');
const shotCountDisplay = document.getElementById('shot-count');

// --- Game Logic Functions ---

// 1. Animation Loop for the Power Bar
function updatePower() {
    if (!gameActive || !isPowering) return;

    // Ping-pong effect: power goes up, then down, then up...
    let powerDirection = 1;
    if (power >= 100) {
        powerDirection = -1;
    } else if (power <= 0) {
        powerDirection = 1;
    }
    
    // Simple way to make it loop back and forth
    power = (power + POWER_SPEED * powerDirection) % 200; 
    // If power is > 100, we treat it as 200 - current value (e.g., 110 becomes 90)
    let displayPower = power > 100 ? 200 - power : power;

    powerBar.style.width = displayPower + '%';
    
    // Set color based on power for visual feedback
    if (displayPower >= 45 && displayPower <= 55) {
        powerBar.style.backgroundColor = 'gold'; // Sweet spot
    } else if (displayPower > 30 && displayPower < 70) {
        powerBar.style.backgroundColor = 'limegreen'; // Good
    } else {
        powerBar.style.backgroundColor = 'red'; // Bad
    }

    animationFrameId = requestAnimationFrame(updatePower);
}

// 2. Shot Logic
function shoot(shotPower) {
    if (shotCount > MAX_SHOTS) return;

    // The 'Sweet Spot' is 45-55. 50 is perfect.
    const PERFECT_POWER = 50;
    const powerDifference = Math.abs(shotPower - PERFECT_POWER);
    
    // Decide if the shot is a 'Make'
    let isMake = powerDifference <= 10; // 40-60 is a make

    // --- Visual Animation (Simple Arc) ---
    // Note: The transition is defined in CSS
    
    // Reset ball position
    ball.style.transform = `translate(-50%, 0)`; 
    ball.style.transition = 'none';
    
    // Force reflow to reset transition
    void ball.offsetWidth; 
    
    // Set transition back and trigger the shot arc
    ball.style.transition = `transform 1s ease-out, top 1s ease-out`;

    if (isMake) {
        message.textContent = `SWISH! Power: ${shotPower.toFixed(0)}%`;
        score++;
        // Move ball to the hoop's center
        ball.style.transform = `translate(-50%, -300px) rotate(360deg)`; // Example arc/move
    } else {
        message.textContent = `MISS! Too ${shotPower < PERFECT_POWER ? 'short' : 'long'}. Power: ${shotPower.toFixed(0)}%`;
        // Move ball to a point near the hoop but miss
        const missY = -200 + (powerDifference * 2); // Higher/lower miss based on power
        const missX = (shotPower > 50 ? 50 : -50); // Miss left or right
        ball.style.transform = `translate(${missX}px, ${missY}px) rotate(180deg)`; 
    }

    // --- Update Score ---
    scoreDisplay.textContent = score;
    shotCount++;
    shotCountDisplay.textContent = `${shotCount}/${MAX_SHOTS}`;
    
    // --- Check Game End ---
    if (shotCount > MAX_SHOTS) {
        gameActive = false;
        setTimeout(() => {
            message.textContent = `GAME OVER! Final Score: ${score}/${MAX_SHOTS}`;
        }, 1200);
    } else {
        // Reset for next shot
        setTimeout(resetShot, 1500);
    }
}

// 3. Reset Function
function resetShot() {
    isPowering = false;
    power = 0;
    powerBar.style.width = '0%';
    message.textContent = "Press SPACE to Start";
    
    // Reset ball to starting position
    ball.style.transition = 'none';
    ball.style.transform = `translate(-50%, 0)`;
}

// 4. Input Handler
document.addEventListener('keydown', (e) => {
    if (!gameActive || e.code !== 'Space') return;

    if (!isPowering) {
        // Start the power meter
        isPowering = true;
        message.textContent = "Press SPACE to Shoot!";
        updatePower();
    } else {
        // Lock in the power and shoot
        cancelAnimationFrame(animationFrameId);
        
        // Calculate the locked-in power (0-100)
        let lockedPower = power > 100 ? 200 - power : power;
        
        // Hide the power bar while shooting
        powerBar.style.width = '0%';
        
        shoot(lockedPower);
    }
});

// Initialize the game state
resetShot();
