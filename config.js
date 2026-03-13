/* ═══════════════════════════════════════════════
   NIREX BIO — Configuration
   Edit these values to customize your profile
   ═══════════════════════════════════════════════ */

const siteConfig = {
    // ─── General ───
    title: "nirex",

    // ─── Profile ───
    profile: {
        avatar: "https://files.catbox.moe/ho2df9.png",  // fallback avatar URL
        username: "nirex",
        bio: [
            "yeah i coder mate | Python Developer, C#, JS, Front-End | Design - Graphical Designer",
            "building cool things - always learning something new",
        ],
        location: "New York",
        badges: [
            { name: "Developer", icon: "code" },
            { name: "Verified", icon: "verified" },
        ]
    },

    // ─── Discord Appearance ───
    // If enabled: fetches avatar from Discord via user ID (tries multiple APIs)
    // If disabled: loads local avatar.png / avatar.jpg from project directory
    useDiscordAppearance: {
        enabled: true,
        userId: "744990694887653427"   // Your Discord User ID
    },

    // ─── Social Links ───
    socials: [
        { name: "GitHub", url: "https://github.com/KrgLxx1", icon: "github" },
        { name: "Telegram", url: "https://t.me/nirex_design", icon: "telegram" },
        { name: "TikTok", url: "https://www.tiktok.com/@nirex_main", icon: "tiktok" }
    ],

    // ─── Media ───
    media: {
        backgroundVideo: "background.mp4",
        backgroundAudio: "audio2.mp3",
        audioVolume: 0.5,
    },

    // ─── View Counter (JSONBlob) ───
    viewCounter: {
        enabled: true,
        blobId: "019c5822-5429-7c76-b920-341d6a973ef5"
    },

    // ─── Theme ───
    theme: {
        accentColor: "#131414ff",
        particleCount: 60,
    }
};
