"""Generate Runova's original background music (royalty-free, synthesized).
Upbeat 112 BPM instrumental: pad chords (Am-F-C-G), bass, kick/hats/clap,
and a seeded pentatonic pluck melody. Exactly 180 seconds."""
import numpy as np

SR = 44100
DUR = 180.0
BPM = 112.0
BEAT = 60.0 / BPM
N = int(SR * DUR)
rng = np.random.default_rng(42)
track = np.zeros(N)

def mf(midi):  # midi -> Hz
    return 440.0 * 2 ** ((midi - 69) / 12.0)

def add(start, wave):
    i = int(start * SR)
    j = min(N, i + len(wave))
    if i < N:
        track[i:j] += wave[: j - i]

def env_adsr(n, attack=0.02, release=0.25):
    e = np.ones(n)
    a = min(n, int(attack * SR)); r = min(n, int(release * SR))
    if a: e[:a] = np.linspace(0, 1, a)
    if r: e[-r:] *= np.linspace(1, 0, r)
    return e

CHORDS = [  # (pad midis, bass midi) — Am, F, C, G
    ([57, 60, 64], 33), ([53, 57, 60], 29), ([55, 60, 64], 36), ([55, 59, 62], 31),
]
bar = BEAT * 4
bars = int(DUR / bar) + 1

for b in range(bars):
    t0 = b * bar
    pad, root = CHORDS[b % 4]
    # pad
    n = int(bar * SR)
    t = np.arange(n) / SR
    wave = np.zeros(n)
    for m in pad:
        f = mf(m)
        wave += 0.16 * np.sin(2 * np.pi * f * t) + 0.05 * np.sin(2 * np.pi * f * 2 * t)
    add(t0, wave * env_adsr(n, 0.35, 0.5))
    # bass on beats 0 and 2
    for beat_i in (0, 2):
        n2 = int(BEAT * 1.8 * SR); t2 = np.arange(n2) / SR
        add(t0 + beat_i * BEAT, 0.30 * np.sin(2 * np.pi * mf(root) * t2) * np.exp(-t2 * 3.5))

# drums + melody per beat / 8th
total_beats = int(DUR / BEAT)
for beat_i in range(total_beats):
    t0 = beat_i * BEAT
    # kick every beat
    n = int(0.22 * SR); t = np.arange(n) / SR
    freq = 42 + 70 * np.exp(-t * 28)
    add(t0, 0.55 * np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 14))
    # hats on offbeats
    n = int(0.05 * SR)
    noise = rng.standard_normal(n)
    hat = np.diff(np.concatenate([[0], noise])) * np.exp(-np.arange(n) / SR * 90)
    add(t0 + BEAT / 2, 0.10 * hat)
    # clap on beats 1 and 3
    if beat_i % 4 in (1, 3):
        n = int(0.14 * SR)
        noise = rng.standard_normal(n)
        clap = np.convolve(noise, np.ones(180) / 180)[:n] * np.exp(-np.arange(n) / SR * 26)
        add(t0, 0.16 * clap)

PENTA = [69, 72, 74, 76, 79, 81, 84]
eighth = BEAT / 2
for i in range(int(DUR / eighth)):
    if rng.random() < 0.48:
        m = PENTA[rng.integers(0, len(PENTA))]
        n = int(0.38 * SR); t = np.arange(n) / SR
        pluck = (np.sin(2 * np.pi * mf(m) * t) + 0.35 * np.sin(2 * np.pi * mf(m) * 2 * t)) * np.exp(-t * 7)
        start = i * eighth + (0.02 if i % 2 else 0)
        add(start, 0.14 * pluck)
        add(start + eighth * 3, 0.05 * pluck)  # simple echo

track = np.tanh(track * 1.15)
track /= (np.max(np.abs(track)) + 1e-9)
track *= 0.82
fade_in = int(1.5 * SR); fade_out = int(3.5 * SR)
track[:fade_in] *= np.linspace(0, 1, fade_in)
track[-fade_out:] *= np.linspace(1, 0, fade_out)

stereo = np.column_stack([track, track])
pcm = (stereo * 32767).astype(np.int16)
import wave
with wave.open("public/music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote public/music.wav", DUR, "seconds")
