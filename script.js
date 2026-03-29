document.addEventListener("DOMContentLoaded", () => {

    /* ==========================================================================
       1. Intersection Observer for standard fade-ups
       ========================================================================== */
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.15 };
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-up').forEach(element => {
        observer.observe(element);
    });

    /* ==========================================================================
       2. Asteroid Canvas Gravity System
       ========================================================================== */
    const canvas = document.getElementById('particles-canvas');
    const ctx = canvas.getContext('2d');
    
    let width, height;
    let asteroids = [];

    function resizeCanvas() {
        // Only run canvas in act 1 to save memory
        const act1 = document.getElementById('act-1-asteroids');
        width = act1.clientWidth;
        height = act1.clientHeight;
        canvas.width = width;
        canvas.height = height;
    }

    class Asteroid {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5; // Slow drift
            this.vy = (Math.random() - 0.5) * 0.5;
            this.radius = Math.random() * 2 + 1;
            // Asteroid color matching alpha mocha styling
            this.color = `rgba(192, 132, 252, ${Math.random() * 0.5 + 0.1})`; 
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Bounce off walls smoothly
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    function initAsteroids() {
        resizeCanvas();
        asteroids = [];
        const numAsteroids = window.innerWidth > 768 ? 100 : 40;
        for (let i = 0; i < numAsteroids; i++) {
            asteroids.push(new Asteroid());
        }
    }

    function animateAsteroids() {
        ctx.clearRect(0, 0, width, height);

        // Draw connections (gravity lines)
        for (let i = 0; i < asteroids.length; i++) {
            for (let j = i + 1; j < asteroids.length; j++) {
                const dx = asteroids[i].x - asteroids[j].x;
                const dy = asteroids[i].y - asteroids[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(asteroids[i].x, asteroids[i].y);
                    ctx.lineTo(asteroids[j].x, asteroids[j].y);
                    ctx.strokeStyle = `rgba(96, 165, 250, ${0.15 - dist/800})`; // Light blue gravity webs
                    ctx.stroke();
                }
            }
        }

        asteroids.forEach(a => {
            a.update();
            a.draw();
        });

        requestAnimationFrame(animateAsteroids);
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        // Re-init on significant resize to prevent stretching
        if(asteroids.length === 0) initAsteroids();
    });

    initAsteroids();
    animateAsteroids();

    /* ==========================================================================
       3. Three-Act Scroll Math (Photo Shrink/Fly)
       ========================================================================== */
    const runway = document.getElementById('scroll-sequence');
    const avatarContainer = document.getElementById('avatar-container');
    const logoSlot = document.getElementById('logo-slot');
    const greetingText = document.getElementById('photo-greeting');
    const navbar = document.getElementById('main-nav');

    // Default sizing variables based on CSS
    const mobileQuery = window.matchMedia("(max-width: 768px)");
    let avatarOriginalSize = mobileQuery.matches ? 250 : 350;
    
    mobileQuery.addEventListener('change', (e) => {
        avatarOriginalSize = e.matches ? 250 : 350;
    });

    // Helper to calculate bounded layout
    function calculateFlight() {
        const runwayStart = runway.offsetTop;
        const runwayEnd = runwayStart + runway.offsetHeight - window.innerHeight;
        
        // Progress from 0.0 to 1.0 along the runway
        let rawProgress = (window.scrollY - runwayStart) / (runwayEnd - runwayStart);
        let progress = Math.max(0, Math.min(1, rawProgress));

        // Let's modify the navbar transparency based on scroll
        // Hide navbar in Act 1, show in Act 2/3
        if (window.scrollY < runwayStart / 2) {
            navbar.style.opacity = '0';
            navbar.style.pointerEvents = 'none';
        } else {
            navbar.style.opacity = '1';
            navbar.style.pointerEvents = 'auto';
        }

        // Get live target coordinates every frame to ensure resize safety
        const slotRect = logoSlot.getBoundingClientRect();
        
        /* 
           STARTING POSITION (progress = 0):
           Centered in screen.
           X = 50vw - (size/2)
           Y = 50vh - (size/2)
           Scale = 1

           ENDING POSITION (progress = 1):
           Inside the logo slot.
           X = slotRect.left
           Y = slotRect.top
           Scale = slotWidth / originalSize
        */
        
        const startX = (window.innerWidth / 2) - (avatarOriginalSize / 2);
        const startY = (window.innerHeight / 2) - (avatarOriginalSize / 2);
        
        // The slot might move, but it's fixed in the viewport context
        const endX = slotRect.left;
        const endY = slotRect.top;

        const targetScale = slotRect.width / avatarOriginalSize;
        
        // Use an easing function for a smoother, premium feel at the end
        // Easing: easeOutCubic (progress goes from 0 to 1 fast, then slows)
        // Actually, linear scroll binding feels tighter, let's keep it 1:1 with scroll.
        const easedProgress = Math.sin(progress * Math.PI / 2); // Sine ease-out feels slightly better

        const currentX = startX + (endX - startX) * easedProgress;
        const currentY = startY + (endY - startY) * easedProgress;
        const currentScale = 1 + (targetScale - 1) * easedProgress;

        // Apply hardware-accelerated transform
        avatarContainer.style.position = 'fixed';
        avatarContainer.style.top = '0px';
        avatarContainer.style.left = '0px';
        avatarContainer.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
        // The transform origin must be top-left so the math maps directly to bounding box
        avatarContainer.style.transformOrigin = 'top left';
        
        // Fade out the greeting text quickly (in the first 30% of scroll)
        greetingText.style.opacity = 1 - (Math.min(1, progress * 3));
        
        // Handle native vs flying avatar persistence for layout safety
        const navAvatar = document.getElementById('nav-avatar-img');
        const navName = document.querySelector('.nav-name');

        if (progress >= 0.99) {
            // Once the flight fully lands, show the native persistent navbar elements
            navAvatar.style.opacity = '1';
            navName.style.opacity = '1';
            avatarContainer.style.opacity = '0';
        } else {
            // While flying, make native items invisible so the flying container is strictly visible
            navAvatar.style.opacity = '0';
            navName.style.opacity = Math.max(0, (progress - 0.7) * 3.33); // Fade name in nicely late in flight
            avatarContainer.style.opacity = '1';
        }

        // Optional: fade the background color or shadow down to nothing when nested
        if(progress >= 0.99) {
            avatarContainer.style.boxShadow = 'none';
            avatarContainer.style.borderWidth = '2px';
        } else {
            avatarContainer.style.boxShadow = `0 ${20 * (1-progress)}px ${50 * (1-progress)}px rgba(0,0,0,0.5)`;
            avatarContainer.style.borderWidth = `${4 * (1-progress)}px`;
        }

        // Handle case if they scroll way up (Act 1) - reset to centered relative
        if (window.scrollY < runwayStart) {
            avatarContainer.style.position = 'absolute';
            avatarContainer.style.top = '50%';
            avatarContainer.style.left = '50%';
            avatarContainer.style.transform = 'translate(-50%, -50%) scale(1)';
            avatarContainer.style.boxShadow = '0 20px 50px rgba(0,0,0,0.5)';
            avatarContainer.style.borderWidth = '4px';
        }
    }

    // Attach to scroll and fire once immediately
    window.addEventListener('scroll', () => {
        requestAnimationFrame(calculateFlight);
    });
    
    window.addEventListener('resize', () => {
        requestAnimationFrame(calculateFlight);
    });

    // Initialize layout positions
    setTimeout(calculateFlight, 100);

});
