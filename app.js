/* ═══════════════════════════════════════════════
   NIREX BIO — Main Application Logic
   guns.lol / ezbio / crime.lol style
   ═══════════════════════════════════════════════ */

(() => {
    'use strict';

    // ─── DOM Elements ───
    const overlay = document.getElementById('overlay');
    const profileWrapper = document.getElementById('profileWrapper');
    const audioToggle = document.getElementById('audioToggle');
    const audioIcon = document.getElementById('audioIcon');
    const bgAudio = document.getElementById('bgAudio');
    const bgVideo = document.getElementById('bg-video');
    const particlesCanvas = document.getElementById('particles');
    const viewCountEl = document.getElementById('viewCount');
    const bioElement = document.getElementById('bio');

    // ─── State ───
    let isAudioPlaying = false;
    let useVideoAudio = false; // true if audio file failed, using video sound instead
    let particlesCtx = null;
    let particles = [];
    let animFrameId = null;
    let tiltEnabled = false;

    // ─── Configuration ───
    const PARTICLE_COUNT = 60;
    const AUDIO_VOLUME = 0.5;

    // ═══════════════════════════════════════════
    // MEDIA INIT — Load video/audio sources from config
    // ═══════════════════════════════════════════
    function initMedia() {
        const media = (typeof siteConfig !== 'undefined' && siteConfig.media) || {};
        const videoSrc = media.backgroundVideo || 'background.mp4';
        const audioSrc = media.backgroundAudio || 'audio.mp3';

        // Set video sources
        if (bgVideo) bgVideo.src = videoSrc;
        const overlayVideo = document.getElementById('overlay-video');
        if (overlayVideo) overlayVideo.src = videoSrc;

        // Set audio source with fallback to video sound
        if (bgAudio) {
            bgAudio.src = audioSrc;

            // If audio file fails to load, use video sound instead
            bgAudio.addEventListener('error', () => {
                console.log(`Audio file "${audioSrc}" not found, using video sound`);
                useVideoAudio = true;
            });
        }
    }

    // Run media init immediately (before overlay click)
    initMedia();

    // ─── 3D Tilt Configuration ───
    const TILT_MAX_X = 40;        // Max rotation deg on X axis
    const TILT_MAX_Y = 30;        // Max rotation deg on Y axis
    const TILT_SPEED = 0.07;      // Smoothing factor (lower = smoother)
    const TILT_PROXIMITY = 500;   // Distance in px from center to start tilt

    // Tilt state
    let currentRotX = 0;
    let currentRotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let tiltRafId = null;

    // ═══════════════════════════════════════════
    // OVERLAY — Click to Enter
    // ═══════════════════════════════════════════
    function dismissOverlay() {
        overlay.classList.add('hidden');
        document.body.classList.add('particles-active');

        // Show profile with slight delay
        setTimeout(() => {
            profileWrapper.classList.add('visible');
        }, 200);

        // Show audio button
        setTimeout(() => {
            audioToggle.classList.add('visible');
        }, 600);

        // CRITICAL: After CSS fade-in transition completes,
        // KILL CSS transitions so JS can control transform directly at 60fps
        setTimeout(() => {
            if (profileWrapper) {
                // Remove CSS transition — JS takes over transform
                profileWrapper.style.transition = 'none';
                // Force a reflow to apply immediately
                profileWrapper.offsetHeight;
                // Now enable tilt
                tiltEnabled = true;
                startTiltLoop();
            }
        }, 1500); // 200ms delay + ~900ms transition + buffer

        // Start audio
        startAudio();

        // Start particles
        initParticles();

        // Init view counter
        updateViewCount();

        // Load Discord presence (avatar, display_name, status) or local avatar
        loadDiscordPresence();

        // Start typewriter
        setTimeout(() => {
            startTypewriter();
        }, 900);
    }

    overlay.addEventListener('click', dismissOverlay);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            if (!overlay.classList.contains('hidden')) {
                e.preventDefault();
                dismissOverlay();
            }
        }
    });

    // ═══════════════════════════════════════════
    // 3D TILT EFFECT — Profile Container
    // ═══════════════════════════════════════════
    document.addEventListener('mousemove', (e) => {
        if (!tiltEnabled || !profileWrapper) return;

        const rect = profileWrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < TILT_PROXIMITY) {
            const intensity = 1 - (distance / TILT_PROXIMITY);
            const normX = dx / TILT_PROXIMITY;
            const normY = dy / TILT_PROXIMITY;

            targetRotY = normX * TILT_MAX_Y * intensity;
            targetRotX = -normY * TILT_MAX_X * intensity;
        } else {
            targetRotX = 0;
            targetRotY = 0;
        }
    });

    document.addEventListener('mouseleave', () => {
        targetRotX = 0;
        targetRotY = 0;
    });

    function startTiltLoop() {
        function tiltStep() {
            // Smooth lerp interpolation
            currentRotX += (targetRotX - currentRotX) * TILT_SPEED;
            currentRotY += (targetRotY - currentRotY) * TILT_SPEED;

            // Snap to 0 if close enough
            if (Math.abs(currentRotX) < 0.01) currentRotX = 0;
            if (Math.abs(currentRotY) < 0.01) currentRotY = 0;

            // Apply 3D transform DIRECTLY on the profile wrapper
            // CSS transition is already killed, so this updates instantly
            if (profileWrapper) {
                profileWrapper.style.transform =
                    `perspective(800px) rotateX(${currentRotX}deg) rotateY(${currentRotY}deg)`;
            }

            tiltRafId = requestAnimationFrame(tiltStep);
        }
        tiltStep();
    }

    // ═══════════════════════════════════════════
    // AUDIO — Background Music (with video fallback)
    // ═══════════════════════════════════════════
    function startAudio() {
        const volume = (typeof siteConfig !== 'undefined' && siteConfig.media?.audioVolume) || AUDIO_VOLUME;

        if (useVideoAudio) {
            // Audio file failed — unmute video instead
            if (bgVideo) {
                bgVideo.muted = false;
                bgVideo.volume = volume;
                isAudioPlaying = true;
                audioToggle.classList.add('playing');
                updateAudioIcon();
                console.log('Playing audio from video background');
            }
            return;
        }

        if (!bgAudio) return;
        bgAudio.volume = volume;

        bgAudio.play().then(() => {
            isAudioPlaying = true;
            audioToggle.classList.add('playing');
            updateAudioIcon();
        }).catch(err => {
            console.log('Audio autoplay blocked:', err.message);
        });
    }

    function toggleAudio() {
        if (useVideoAudio) {
            // Toggle video mute
            if (!bgVideo) return;
            if (isAudioPlaying) {
                bgVideo.muted = true;
                isAudioPlaying = false;
                audioToggle.classList.remove('playing');
            } else {
                bgVideo.muted = false;
                isAudioPlaying = true;
                audioToggle.classList.add('playing');
            }
            updateAudioIcon();
            return;
        }

        if (!bgAudio) return;
        if (isAudioPlaying) {
            bgAudio.pause();
            isAudioPlaying = false;
            audioToggle.classList.remove('playing');
        } else {
            bgAudio.play().then(() => {
                isAudioPlaying = true;
                audioToggle.classList.add('playing');
            }).catch(() => { });
        }
        updateAudioIcon();
    }

    function updateAudioIcon() {
        if (!audioIcon) return;
        if (isAudioPlaying) {
            audioIcon.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
        } else {
            audioIcon.innerHTML = `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`;
        }
    }

    audioToggle.addEventListener('click', toggleAudio);

    // ═══════════════════════════════════════════
    // PARTICLES — Floating Snow/Dust Effect
    // ═══════════════════════════════════════════
    function initParticles() {
        if (!particlesCanvas) return;

        particlesCtx = particlesCanvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Create particles
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(createParticle());
        }

        // Start animation
        animateParticles();
    }

    function resizeCanvas() {
        if (!particlesCanvas) return;
        particlesCanvas.width = window.innerWidth;
        particlesCanvas.height = window.innerHeight;
    }

    function createParticle() {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: Math.random() * 2.2 + 0.4,
            speedX: (Math.random() - 0.5) * 0.35,
            speedY: Math.random() * 0.4 + 0.12,
            opacity: Math.random() * 0.4 + 0.08,
            opacityDir: Math.random() > 0.5 ? 1 : -1,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: Math.random() * 0.008 + 0.002
        };
    }

    function animateParticles() {
        if (!particlesCtx) return;

        particlesCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);

        particles.forEach(p => {
            p.x += p.speedX + Math.sin(p.wobble) * 0.15;
            p.y += p.speedY;
            p.wobble += p.wobbleSpeed;

            // Fade in/out
            p.opacity += p.opacityDir * 0.002;
            if (p.opacity > 0.5) { p.opacityDir = -1; }
            if (p.opacity < 0.04) { p.opacityDir = 1; }

            // Wrap around screen
            if (p.y > window.innerHeight + 10) {
                p.y = -10;
                p.x = Math.random() * window.innerWidth;
            }
            if (p.x > window.innerWidth + 10) p.x = -10;
            if (p.x < -10) p.x = window.innerWidth + 10;

            // Draw particle
            particlesCtx.beginPath();
            particlesCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            particlesCtx.fillStyle = `rgba(210, 215, 225, ${p.opacity})`;
            particlesCtx.fill();
        });

        animFrameId = requestAnimationFrame(animateParticles);
    }

    // ═══════════════════════════════════════════
    // VIEW COUNTER — Using JSONBlob API
    // ═══════════════════════════════════════════
    async function updateViewCount() {
        const blobId = '019c5822-5429-7c76-b920-341d6a973ef5';
        const apiUrl = `https://api.jsonblob.com/api/jsonBlob/${blobId}`;

        try {
            // Get current count
            const res = await fetch(apiUrl);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            let count = (data.views || 0) + 1;

            // Update count
            await fetch(apiUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ views: count })
            });

            // Animate counter
            animateCounter(count);
        } catch (err) {
            console.log('View counter unavailable:', err.message);
            if (viewCountEl) viewCountEl.textContent = '—';
        }
    }

    function animateCounter(target) {
        if (!viewCountEl) return;
        let current = 0;
        const duration = 1200;
        const start = performance.now();

        function step(timestamp) {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - (1 - progress) * (1 - progress);
            current = Math.floor(eased * target);
            viewCountEl.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                viewCountEl.textContent = target.toLocaleString();
            }
        }

        requestAnimationFrame(step);
    }

    // ═══════════════════════════════════════════
    // DISCORD PRESENCE — Avatar, Display Name, Status
    // ═══════════════════════════════════════════
    const avatarEl = document.getElementById('avatar');
    const usernameEl = document.getElementById('username');
    let presenceInterval = null;

    async function loadDiscordPresence() {
        const discordConfig = typeof siteConfig !== 'undefined' && siteConfig.useDiscordAppearance;

        if (discordConfig && discordConfig.enabled && discordConfig.userId) {
            await fetchLanyardData(discordConfig.userId);

            // Auto-refresh status every 60 seconds
            presenceInterval = setInterval(() => {
                fetchLanyardData(discordConfig.userId, true); // silent = true
            }, 60000);
        } else {
            // Local mode
            loadLocalAvatar();
        }
    }

    async function fetchLanyardData(userId, silent = false) {
        try {
            const res = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();

            if (!json.success || !json.data) throw new Error('Invalid response');

            const data = json.data;
            const user = data.discord_user;

            // ─── 1. Avatar ───
            if (user.avatar && avatarEl) {
                const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
                avatarEl.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
                if (!silent) console.log('Avatar loaded from Lanyard');
            }

            // ─── 2. Display Name ───
            const displayName = user.display_name || user.global_name || user.username;
            if (displayName && usernameEl) {
                usernameEl.textContent = displayName;
                if (!silent) console.log('Display name set:', displayName);
            }

            // ─── 3. Status Indicator ───
            updateStatusIndicator(data.discord_status);
            if (!silent) console.log('Discord status:', data.discord_status);

        } catch (err) {
            if (!silent) {
                console.log('Lanyard failed:', err.message);
                // Fallback: try DCDN proxy for avatar only
                const dcdnLoaded = await tryImageUrl(
                    `https://dcdn.dstn.to/avatars/${userId}`, 'DCDN'
                );
                if (!dcdnLoaded) {
                    // Default Discord avatar
                    const idx = (BigInt(userId) >> 22n) % 6n;
                    const defLoaded = await tryImageUrl(
                        `https://cdn.discordapp.com/embed/avatars/${idx}.png`, 'Discord Default'
                    );
                    if (!defLoaded) loadLocalAvatar();
                }
            }
        }
    }

    function updateStatusIndicator(status) {
        // Remove existing indicator
        const existing = document.querySelector('.status-indicator');
        if (existing) existing.remove();

        if (!status || status === 'offline') {
            // Create offline indicator (gray)
            createStatusDot('offline');
            return;
        }

        createStatusDot(status);
    }

    function createStatusDot(status) {
        const dot = document.createElement('div');
        dot.className = `status-indicator status-${status}`;
        dot.title = status.charAt(0).toUpperCase() + status.slice(1);

        const avatarContainer = document.getElementById('avatarContainer');
        if (avatarContainer) {
            avatarContainer.appendChild(dot);
        }
    }

    function tryImageUrl(url, label) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                if (avatarEl) avatarEl.src = url;
                console.log(`Avatar loaded via ${label}`);
                resolve(true);
            };
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    function loadLocalAvatar() {
        if (!avatarEl) return;

        const testPng = new Image();
        testPng.onload = () => {
            avatarEl.src = 'avatar.png';
            console.log('Avatar loaded: avatar.png');
        };
        testPng.onerror = () => {
            const testJpg = new Image();
            testJpg.onload = () => {
                avatarEl.src = 'avatar.jpg';
                console.log('Avatar loaded: avatar.jpg');
            };
            testJpg.onerror = () => {
                const fallback = (typeof siteConfig !== 'undefined' && siteConfig.profile?.avatar)
                    || 'https://files.catbox.moe/ho2df9.png';
                avatarEl.src = fallback;
                console.log('Avatar fallback:', fallback);
            };
            testJpg.src = 'avatar.jpg';
        };
        testPng.src = 'avatar.png';
    }

    // ═══════════════════════════════════════════
    // TYPEWRITER — Bio Text Effect
    // ═══════════════════════════════════════════
    const bioTexts = [
        "yeah i coder mate | Python Developer, C#, JS, Front-End | Design - Graphical Designer",
        "building cool things 🔥 | always learning something new",
    ];
    let currentBioIndex = 0;
    let bioCharIndex = 0;
    let isBioTyping = true;
    let bioTimeout = null;

    function startTypewriter() {
        if (!bioElement) return;
        bioElement.textContent = '';
        typeBio();
    }

    function typeBio() {
        if (!bioElement) return;
        const text = bioTexts[currentBioIndex];

        if (isBioTyping) {
            if (bioCharIndex <= text.length) {
                bioElement.textContent = text.substring(0, bioCharIndex);
                bioCharIndex++;
                bioTimeout = setTimeout(typeBio, 35);
            } else {
                // Pause at full text
                bioTimeout = setTimeout(() => {
                    isBioTyping = false;
                    typeBio();
                }, 4000);
            }
        } else {
            if (bioCharIndex > 0) {
                bioCharIndex--;
                bioElement.textContent = text.substring(0, bioCharIndex);
                bioTimeout = setTimeout(typeBio, 20);
            } else {
                // Move to next text
                currentBioIndex = (currentBioIndex + 1) % bioTexts.length;
                isBioTyping = true;
                bioTimeout = setTimeout(typeBio, 600);
            }
        }
    }

    // ═══════════════════════════════════════════
    // SOCIAL LINKS — 3D Micro-tilt on hover
    // ═══════════════════════════════════════════
    const socialLinks = document.querySelectorAll('.social-link');

    socialLinks.forEach(link => {
        link.addEventListener('mousemove', (e) => {
            const rect = link.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            link.style.transform = `translateY(-4px) scale(1.05) rotateX(${-y * 0.4}deg) rotateY(${x * 0.4}deg)`;
        });

        link.addEventListener('mouseleave', () => {
            link.style.transform = '';
        });
    });

    // ═══════════════════════════════════════════
    // PREVENT RIGHT-CLICK & DEVTOOLS
    // ═══════════════════════════════════════════
    document.addEventListener('contextmenu', e => e.preventDefault());

    // document.addEventListener('keydown', (e) => {
    //     if (e.key === 'F12') e.preventDefault();
    //     if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) e.preventDefault();
    //     if (e.ctrlKey && e.key === 'u') e.preventDefault();
    // });

    // ═══════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════
    window.addEventListener('beforeunload', () => {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (tiltRafId) cancelAnimationFrame(tiltRafId);
        if (bioTimeout) clearTimeout(bioTimeout);
        if (bgAudio) {
            bgAudio.pause();
            bgAudio.currentTime = 0;
        }
    });

})();
