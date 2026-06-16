const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
const rootStyles = getComputedStyle(document.documentElement);
const loader = document.getElementById('loader');
const terminalText = document.getElementById('terminal-text');
const connectionStatus = document.getElementById('connection-status');

let width, height;
let particles = [];
let hoverParticle = null;

function updateLoaderLine(message) {
    if (terminalText) {
        terminalText.textContent = message;
    }
}

function updateLoaderStatus(message) {
    if (connectionStatus) {
        connectionStatus.textContent = message;
    }
}

function hideLoader() {
    if (!loader) return;
    loader.classList.add('fade-out');
    setTimeout(() => {
        if (loader.parentNode) {
            loader.parentNode.removeChild(loader);
        }
    }, 500);
}

function timeoutPromise(ms, promise) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), ms);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            }
        );
    });
}

async function checkInternetConnection() {
    if (!navigator.onLine) {
        return false;
    }

    try {
        await timeoutPromise(
            2000,
            fetch('https://example.com/', {
                mode: 'no-cors'
            })
        );
        return true;
    } catch {
        return false;
    }
}

async function runTerminalLoader() {
    updateLoaderLine('Checking connection...');
    updateLoaderStatus(`Network: ${navigator.onLine ? 'Online' : 'Offline'}`);

    const online = await checkInternetConnection();
    if (!online) {
        updateLoaderStatus('Network: Offline');
        updateLoaderLine('Retrying connection...');
        for (let attempt = 1; attempt <= 3; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            if (navigator.onLine && (await checkInternetConnection())) {
                updateLoaderStatus('Network: Online');
                updateLoaderLine('Connection restored.');
                break;
            }
            updateLoaderStatus(`Network: retrying (${attempt}/3)`);
        }
    } else {
        updateLoaderStatus('Network: Online');
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
    updateLoaderLine('Loading remote resources...');
    updateLoaderStatus('Preparing interface...');
    await new Promise((resolve) => setTimeout(resolve, 700));
    hideLoader();
}

window.addEventListener('load', runTerminalLoader);
window.addEventListener('online', () => updateLoaderStatus('Network: Online'));
window.addEventListener('offline', () => updateLoaderStatus('Network: Offline'));

setTimeout(() => {
    if (loader && loader.parentNode) {
        hideLoader();
    }
}, 5000);

// Configuration
const config = {
    particleCount: 100, // Reduced for better performance on average devices
    connectionDistance: 120, // Distance to draw lines
    mouseDistance: 150, // Distance for mouse interaction
    baseSpeed: 0.5,
    colors: ['#00d9ff', '#7d2ae8', '#ffffff'] // Cyan, Purple, White
};

// Resize Handling
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

// Mouse Interaction
const mouse = { x: null, y: null };
window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
});

window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
});

// Particle Class
class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * config.baseSpeed;
        this.vy = (Math.random() - 0.5) * config.baseSpeed;
        this.size = Math.random() * 2 + 1;
        this.color = config.colors[Math.floor(Math.random() * config.colors.length)];
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse interaction (repel)
        if (mouse.x != null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < config.mouseDistance) {
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const force = (config.mouseDistance - distance) / config.mouseDistance;
                const directionX = forceDirectionX * force * 3;
                const directionY = forceDirectionY * force * 3;

                this.x -= directionX;
                this.y -= directionY;
            }
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

// Initialize Particles
function initParticles() {
    particles = [];
    for (let i = 0; i < config.particleCount; i++) {
        particles.push(new Particle());
    }
}

// Animation Loop
function animate() {
    ctx.clearRect(0, 0, width, height);

    // Only animate if we are in the home section (or close to top)
    const homeSection = document.getElementById('home');
    const homeBottom = homeSection.getBoundingClientRect().bottom;

    if (homeBottom > 0) {
        // Update and Draw Particles
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        // Draw Connections
        connectParticles();
    }

    requestAnimationFrame(animate);
}

// Connect Particles
function connectParticles() {
    const maxDistanceSq = config.connectionDistance * config.connectionDistance;
    const maxMouseDistanceSq = config.mouseDistance * config.mouseDistance;

    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq < maxDistanceSq) {
                const distance = Math.sqrt(distanceSq);
                ctx.beginPath();
                ctx.strokeStyle = `rgba(0, 217, 255, ${1 - distance / config.connectionDistance})`;
                ctx.lineWidth = 1;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }

        if (mouse.x != null) {
            const dx = particles[i].x - mouse.x;
            const dy = particles[i].y - mouse.y;
            const distanceSq = dx * dx + dy * dy;

            if (distanceSq < maxMouseDistanceSq) {
                const distance = Math.sqrt(distanceSq);
                ctx.beginPath();
                ctx.strokeStyle = `rgba(255, 255, 255, ${1 - distance / config.mouseDistance})`;
                ctx.lineWidth = 1;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }
    }
}

// Start
initParticles();
animate();

// Re-init on significant resize to maintain density
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(initParticles, 100);
});

// Smooth Scroll for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Active Navigation Link on Scroll
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('nav .link a');

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (window.scrollY >= sectionTop - 100 && window.scrollY < sectionTop + sectionHeight - 100) {
            const sectionId = section.getAttribute('id');
            
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

const navbar = document.querySelector('nav');
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('primary-nav');

function setMobileMenuState(isOpen) {
    if (!navbar || !navToggle || !navMenu) {
        return;
    }

    navbar.classList.toggle('menu-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
}

if (navToggle) {
    navToggle.addEventListener('click', () => {
        const isOpen = navbar.classList.contains('menu-open');
        setMobileMenuState(!isOpen);
    });
}

if (navMenu) {
    navMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 786) {
                setMobileMenuState(false);
            }
        });
    });
}

window.addEventListener('resize', () => {
    if (window.innerWidth > 786) {
        setMobileMenuState(false);
    }
});

function updateNavbarState() {
    if (!navbar) {
        return;
    }

    if (window.scrollY > 24) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

window.addEventListener('scroll', () => {
    updateActiveNavLink();
    updateNavbarState();
});

// Set initial active link
updateActiveNavLink();
updateNavbarState();

// Scroll Reveal
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        } else {
            // Optional: Remove class to re-trigger animation when scrolling back up
            // entry.target.classList.remove('show');
        }
    });
});

const hiddenElements = document.querySelectorAll('.hidden');
hiddenElements.forEach((el) => observer.observe(el));

// Skills Filter
const filterButtons = document.querySelectorAll('.filter-btn');
const skillGroups = document.querySelectorAll('.skills-group');
const activeSkillLabel = document.getElementById('active-skill-label');

function updateSkillsDisplay(filter) {
    skillGroups.forEach((group) => {
        const matches = filter === 'all' || group.dataset.skillGroup === filter;
        group.classList.toggle('is-visible', matches);
    });

    if (activeSkillLabel) {
        const labelMap = {
            all: 'All Skills',
            'hard-skills': 'Hard Skills',
            tools: 'Tools',
            'soft-skills': 'Soft Skills'
        };

        activeSkillLabel.textContent = labelMap[filter] || 'All Skills';
    }
}

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const filter = button.dataset.skillFilter;

        filterButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        updateSkillsDisplay(filter);
    });
});

updateSkillsDisplay('all');

// Typing Text Effect
const typingText = document.querySelector('.typing-text');
const words = ['Backend Developer', 'Frontend Developer', 'UX/UI', 'Database Administrator'];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;

const typeEffect = () => {
    const currentWord = words[wordIndex];
    const validationCharIndex = isDeleting ? charIndex-- : charIndex++;

    // Safety check for substring range
    const displayText = currentWord.substring(0, Math.max(0, validationCharIndex));
    typingText.textContent = displayText;
    typingText.style.color = rootStyles.getPropertyValue('--main-color').trim();

    if (!isDeleting && charIndex === currentWord.length + 1) {
        isDeleting = true;
        setTimeout(typeEffect, 2000); // Pause before deleting
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        setTimeout(typeEffect, 500); // Pause before typing next word
    } else {
        setTimeout(typeEffect, isDeleting ? 100 : 200);
    }
}
typeEffect();

// 3D Tilt Effect
const cards = document.querySelectorAll('.skill-card, .project-card');

cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -10; // Max tilt 10deg
        const rotateY = ((x - centerX) / centerX) * 10;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
});

// Theme Toggle
const htmlElement = document.documentElement;
const themeToggleCheckbox = document.getElementById('theme-toggle');
const themeSwitchState = document.getElementById('theme-switch-state');

function setTheme(theme) {
    const isLight = theme === 'light';
    if (isLight) {
        htmlElement.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    } else {
        htmlElement.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
    }
    if (themeToggleCheckbox) {
        themeToggleCheckbox.checked = isLight;
    }
    if (themeSwitchState) {
        themeSwitchState.textContent = isLight ? 'Light' : 'Dark';
    }
}

const savedTheme = localStorage.getItem('theme') || 'dark';
setTheme(savedTheme);

if (themeToggleCheckbox) {
    themeToggleCheckbox.addEventListener('change', () => {
        setTheme(themeToggleCheckbox.checked ? 'light' : 'dark');
    });
}

// Contact form delivery through the local server API
const contactForm = document.querySelector('.contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = contactForm.querySelector('.btn');
        const formData = new FormData(contactForm);
        const name = formData.get('name')?.toString().trim() || '';
        const email = formData.get('email')?.toString().trim() || '';
        const message = formData.get('message')?.toString().trim() || '';

        if (submitButton) {
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;
        }

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    email,
                    message
                })
            });

            const result = await response.json();
            if (!response.ok || !result.ok) {
                throw new Error(result.error || 'Unable to send message.');
            }

            contactForm.reset();

            if (submitButton) {
                submitButton.textContent = 'Message Sent';
            }
        } catch (error) {
            console.error(error);
            alert(error.message || 'Message failed to send.');
            if (submitButton) {
                submitButton.textContent = 'Send Failed';
            }
        }

        setTimeout(() => {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Send Message';
            }
        }, 2500);
    });
}
