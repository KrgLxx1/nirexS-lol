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
    // SOCIAL LINKS — Generate from config
    // ═══════════════════════════════════════════
    const SOCIAL_ICONS = {
        github: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z',
        telegram: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.697.064-1.225-.461-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
        tiktok: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.77 1.52V6.79a4.85 4.85 0 0 1-1.01-.1z',
        discord: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561 19.9312 19.9312 0 005.9932 3.0394.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286 19.8975 19.8975 0 006.0023-3.0395.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z',
        spotify: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z',
        twitter: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
        x: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
        youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
        instagram: 'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 1 0 0-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 1 1-2.882 0 1.441 1.441 0 0 1 2.882 0z',
        twitch: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z',
        steam: 'M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z',
        website: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    };

    function buildSocialLinks() {
        const container = document.getElementById('socialLinks');
        if (!container) return;

        const socials = (typeof siteConfig !== 'undefined' && siteConfig.socials) || [];
        container.innerHTML = '';

        socials.forEach(social => {
            const iconPath = SOCIAL_ICONS[social.icon.toLowerCase()];
            if (!iconPath) return;

            const a = document.createElement('a');
            a.href = social.url;
            a.target = '_blank';
            a.className = 'social-link';
            a.title = social.name;
            a.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="${iconPath}"/></svg>`;
            container.appendChild(a);
        });

        console.log(`Social links built: ${socials.length} items`);
    }

    // Build social links immediately
    buildSocialLinks();

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
