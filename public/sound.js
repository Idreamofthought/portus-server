export const Sound = {
    enabled: true,
    context: null,

    init() {
        this.context = null;
    },

    playBuilding(buildingId) {
        if (!this.enabled) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        if (!this.context) this.context = new AudioContext();
        if (this.context.state === "suspended") this.context.resume();

        const now = this.context.currentTime;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        const hash = [...buildingId].reduce((total, char) => total + char.charCodeAt(0), 0);
        const frequency = 180 + (hash % 11) * 27;

        oscillator.type = hash % 3 === 0 ? "triangle" : hash % 3 === 1 ? "sine" : "square";
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.35, now + 0.16);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        oscillator.connect(gain);
        gain.connect(this.context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.24);
    }
};
