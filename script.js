// --- Game State Variables ---
let score = 0;
let shotCount = 1;
const MAX_SHOTS = 10;
let gameActive = true;
let isDragging = false;
let startX, startY; // Starting position of the drag (screen coordinates)
let ballRect; // Used to store the ball's dimensions and position on screen
let lineElement = null; // To hold the trajectory line element

// --- DOM Elements ---
const ball = document.getElementById('ball');
const court = document.querySelector('.court');
const message = document.getElementById('message');
const scoreDisplay = document.getElementById('score');
const shotCountDisplay = document.getElementById('shot-count');

// --- Constants (Physical/Visual) ---
// Note: We'll calculate positions dynamically based on screen size (ballRect)
const DRAG_MULTIPLIER = 0.5; // Controls shot power sensitivity
const GRAVITY = 0.003; // Simple gravity factor for the arc
const HOOP_X_OFFSET = 0.85; // Hoop X position (85% from left)
const HOOP_Y_OFFSET = 0.15; // Hoop Y position (15% from top)

// ----------------------------------------------------------------------
// 1. INPUT HANDLERS (Start, Move, End)
// ----------------------------------------------------------------------

function getEventCoords(e) {
    // Determine if it's a mouse event or a touch event
    return e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
}

function handleStart(e) {
    if (!gameActive || isDragging) return;
    
    e.preventDefault(); // Prevent accidental scrolling/default behavior on touch

    // Reset ball position visually before starting drag
    resetBallPosition();

    isDragging = true;
    ball.style.cursor = 'grabbing';
    ballRect = ball.getBoundingClientRect(); // Get fresh position for drag logic

    const coords = getEventCoords(e);
    startX = coords.x;
    startY = coords.y;

    message.textContent = "Lepaskan untuk menembak!";
}

function handleMove(e) {
    if (!isDragging || !gameActive) return;

    e.preventDefault(); 

    const coords = getEventCoords(e);
    const currentX = coords.x;
    const currentY = coords.y;

    // Calculate drag vector
    let dragX = currentX - startX;
    let dragY = currentY - startY;

    // --- Update Ball Visual Position (Drag Feedback) ---
    // The ball follows the finger/cursor *relative* to the starting drag point.
    // We move the ball using its transform property for smooth movement.
    // The 'translate' function applies movement relative to its current (or initial) position.
    
    // We limit the drag forward (Y direction) so the ball doesn't go too far into the court
    dragY = Math.min(0, dragY); // Only allow dragging UP/BACK from the initial position

    ball.style.transform = `translate(calc(-50% + ${dragX}px), ${dragY}px)`;

    // --- Update Trajectory Line (Aiming Visual) ---
    // Remove old line if exists
    if (lineElement) {
        lineElement.remove();
    }

    // Create a new line element
    lineElement = document.createElement('div');
    lineElement.classList.add('trajectory-line');

    // Calculate length (distance of drag) and angle
    const distance = Math.sqrt(dragX * dragX + dragY * dragY) * DRAG_MULTIPLIER;
    const angleRad = Math.atan2(-dragY, -dragX); // Angle from the drag vector
    const angleDeg = angleRad * (180 / Math.PI);

    // Apply styles
    lineElement.style.width = `${distance * 0.5}px`; // Line length is proportional to power
    lineElement.style.transform = `rotate(${angleDeg}deg)`;
    lineElement.style.left = `${ballRect.left + ballRect.width / 2}px`;
    lineElement.style.top = `${ballRect.top + ballRect.height / 2}px`;

    document.body.appendChild(lineElement);
}

function handleEnd(e) {
    if (!isDragging || !gameActive) return;

    isDragging = false;
    ball.style.cursor = 'grab';

    const coords = getEventCoords(e);
    const endX = coords.x;
    const endY = coords.y;

    // Calculate power based on drag distance
    const launchX = endX - startX;
    const launchY = endY - startY;

    // If the drag was too small (a quick tap), don't shoot
    if (Math.abs(launchX) < 5 && Math.abs(launchY) < 5) {
        resetShot();
        return;
    }
    
    // Calculate initial velocity (power) and angle
    // Drag distance determines power. LaunchY controls the height/angle.
    const velocity = Math.sqrt(launchX * launchX + launchY * launchY) * DRAG_MULTIPLIER;
    const angle = Math.atan2(-launchY, -launchX); // Angle relative to the court (0 = horizontal)

    shoot(velocity, angle);
}

// ----------------------------------------------------------------------
// 2. GAME LOGIC & PHYSICS
// ----------------------------------------------------------------------

function shoot(velocity, angle) {
    if (shotCount > MAX_SHOTS) return;

    // Remove aiming line immediately
    if (lineElement) {
        lineElement.remove();
        lineElement = null;
    }

    // Get COURT dimensions and ball starting coordinates
    const courtRect = court.getBoundingClientRect();
    const courtWidth = courtRect.width;
    const courtHeight = court.outerHeight; // Use outerHeight for full court area

    // Ball starts at the center bottom of the court
    let time = 0;
    let ballX = courtWidth / 2;
    let ballY = courtHeight - BALL_START_BOTTOM_OFFSET - (BALL_SIZE / 2); // Y is from top, so subtract offset

    // Hoop coordinates relative to court (in pixels)
    const hoopX = courtWidth * HOOP_X_OFFSET;
    const hoopY = courtHeight * HOOP_Y_OFFSET;
    const hoopWidth = 50; // from CSS rim width

    let isFlying = true;
    let animationFrame;

    function animateShot() {
        if (!isFlying) return;

        time += 1; // Increment time step

        // --- Kinematics (Parabolic Trajectory) ---
        // X position (horizontal distance)
        ballX += velocity * Math.cos(angle); 
        
        // Y position (vertical distance, adjusting for screen Y-axis direction)
        ballY -= (velocity * Math.sin(angle) - (GRAVITY * time * time)); 

        // Apply new position to the ball element
        ball.style.transition = 'none';
        ball.style.left = `${ballX - (BALL_SIZE / 2)}px`;
        ball.style.top = `${ballY - (BALL_SIZE / 2)}px`;

        // --- Collision/Scoring Check ---

        // 1. Check for Make (Ball center is past the rim line and within hoop width)
        if (ballX >= hoopX && ballX <= hoopX + hoopWidth) {
            // Check if ball is dropping through the rim
            if (ballY > hoopY && ballY < hoopY + RIM_HEIGHT + 20) {
                isFlying = false;
                handleShotResult(true);
                return;
            }
        }
        
        // 2. Check for Miss (Ball goes out of bounds or hits the ground)
        if (ballX > courtWidth || ballX < 0 || ballY > courtHeight) {
            isFlying = false;
            handleShotResult(false);
            return;
        }

        animationFrame = requestAnimationFrame(animateShot);
    }

    animationFrame = requestAnimationFrame(animateShot);
}

function handleShotResult(isMake) {
    if (isMake) {
        score++;
        message.textContent = `SWISH! Score Tambah!`;
    } else {
        message.textContent = `MISS! Coba lagi.`;
    }

    scoreDisplay.textContent = score;
    shotCount++;
    shotCountDisplay.textContent = `${shotCount}/${MAX_SHOTS}`;

    // --- Check Game End ---
    if (shotCount > MAX_SHOTS) {
        gameActive = false;
        showGameOver();
    } else {
        // Reset for next shot
        setTimeout(resetShot, 1500);
    }
}

// ----------------------------------------------------------------------
// 3. UTILITIES & SETUP
// ----------------------------------------------------------------------

function resetBallPosition() {
    // Return the ball to its original CSS position
    ball.style.transition = 'transform 0.3s ease'; 
    ball.style.left = `${BALL_START_LEFT_PERCENT}%`;
    ball.style.top = 'auto'; // Reset top control
    ball.style.bottom = `${BALL_START_BOTTOM_OFFSET}px`;
    ball.style.transform = `translateX(-50%)`; // Keep it centered
}

function resetShot() {
    // Clear the aiming line if it somehow remains
    if (lineElement) {
        lineElement.remove();
        lineElement = null;
    }
    
    resetBallPosition();

    // Reset instruction message
    if (gameActive) {
        message.textContent = "Drag the ball to aim and set power!";
    }
}

function showGameOver() {
    const overlay = document.createElement('div');
    overlay.classList.add('game-over-overlay');
    overlay.innerHTML = `
        <h2>GAME OVER!</h2>
        <p>Skor Akhir Anda: ${score}/${MAX_SHOTS}</p>
        <button class="restart-button" onclick="location.reload()">MAIN LAGI</button>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => {
        overlay.classList.add('visible');
    }, 100);
}


// --- Initialize & Event Listeners ---
function initializeGame() {
    resetShot();

    // Mouse Listeners
    ball.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    // Touch Listeners (for mobile)
    ball.addEventListener('touchstart', handleStart);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);

    message.textContent = "Drag the ball to aim and set power!";
}

initializeGame();
