// ============================================================
// SOUND MANAGER — Portus
// ============================================================

export const Sound = {
    musicEnabled: true,
    sfxEnabled: true,

    tracks: {
        ambient: new Audio("/sounds/ambient.mp3")
    },

    sfx: {
        build: new Audio("/sounds/build.mp3"),
        harvest: new Audio("/sounds/harvest.mp3"),
        fish: new Audio("/sounds/fish.mp3"),
        temple: new Audio("/sounds/temple.mp3"),
        research: new Audio("/sounds/research.mp3"),
        warning: new Audio("/sounds/warning.mp3"),
        disaster: new Audio("/sounds/disaster.mp3"),
        raid: new Audio("/sounds/raid.mp3"),
        favour: new Audio("/sounds/favour.mp3"),
        awakening: new Audio("/sounds/awakening.mp3")
    },

    init() {
        // Ambient loop
        this.tracks.ambient.loop = true;
        this.tracks.ambient.volume = 0.25;
        this.tracks.ambient.play();

        // UI toggles
        document.getElementById("toggle-music").onchange = (e) => {
            this.musicEnabled = e.target.checked;
            this.updateMusicState();
        };

        document.getElementById("toggle-sfx").onchange = (e) => {
            this.sfxEnabled = e.target.checked;
        };
    },

    updateMusicState() {
        if (this.musicEnabled) {
            this.tracks.ambient.play();
        } else {
            this.tracks.ambient.pause();
        }
    },

    play(name) {
        if (!this.sfxEnabled) return;
        const sound = this.sfx[name];
        if (sound) {
            sound.currentTime = 0;
            sound.play();
        }
    }
};
