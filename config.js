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
            "Created to Create",
            "Built by Code, Driven by Vision",
            "Work. Build. Repeat.",
            "Born to Develop",
            "Keep Building",
            "Evolve or Stay Behind",
            "Dream it. Code it.",
            "No Limits, Just Logic",
            "Create. Break. Improve.",
            "Innovation Never Sleeps",
            "Code is the Art of Thinking",
            "Discipline > Motivation",
            "Think. Build. Ship.",
            "Stay Focused, Keep Coding",
            "Write Code. Make Impact.",
            "One Line at a Time",
            "Hard Work Beats Talent",
            "Live to Build",
            "Push Boundaries, Not Excuses",
            "Code Today, Lead Tomorrow",
        ],

        location: "NY",
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
        backgroundVideo: "bg3.mp4",
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
