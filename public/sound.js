export const Sound = {
    enabled: true,
    context: null,
    musicEnabled: true,
    musicGain: null,
    musicNodes: [],
    gestureBound: false,

    init() {
        this.context = null;
        this.musicNodes = [];
        this.gestureBound = false;
        this.bindFirstGesture();
    },

    bindFirstGesture() {
        if (this.gestureBound) return;
        this.gestureBound = true;
        const start = () => {
            this.startMusic();
            window.removeEventListener("pointerdown", start);
            window.removeEventListener("keydown", start);
        };
        window.addEventListener("pointerdown", start, { once: true });
        window.addEventListener("keydown", start, { once: true });
    },

    getContext() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return null;
        if (!this.context) this.context = new AudioContext();
        if (this.context.state === "suspended") this.context.resume();
        return this.context;
    },

    startMusic() {
        if (!this.musicEnabled) return;
        if (this.musicGain) {
            this.musicGain.gain.setTargetAtTime(0.035, this.context.currentTime, 0.08);
            return;
        }
        const context = this.getContext();
        if (!context) return;

        const master = context.createGain();
        master.gain.value = 0.035;
        master.connect(context.destination);
        this.musicGain = master;

        // Slow, non-harmonic tones create atmosphere without a melody.
        [55, 77.3, 109.7].forEach((frequency, index) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = index === 1 ? "triangle" : "sine";
            oscillator.frequency.value = frequency;
            gain.gain.value = index === 0 ? 0.8 : 0.35;
            oscillator.connect(gain);
            gain.connect(master);
            oscillator.start();
            this.musicNodes.push(oscillator);
        });
    },

    setMusicEnabled(enabled) {
        this.musicEnabled = enabled;
        if (enabled) {
            this.startMusic();
        } else if (this.musicGain) {
            this.musicGain.gain.setTargetAtTime(0, this.context.currentTime, 0.08);
        }
    },

    playBuilding(buildingId) {
        if (!this.enabled) return;

        const context = this.getContext();
        if (!context) return;

        const now = context.currentTime;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const hash = [...buildingId].reduce((total, char) => total + char.charCodeAt(0), 0);
        const frequency = 180 + (hash % 11) * 27;

        oscillator.type = hash % 3 === 0 ? "triangle" : hash % 3 === 1 ? "sine" : "square";
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.35, now + 0.16);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.24);
    }
};
