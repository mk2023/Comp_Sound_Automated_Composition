function mod12(n) {
  return ((n % 12) + 12) % 12;
} //making notes wrap at 12

//transposing notes by n semitones:
function transpose(seq, n) {
  const t = mod12(n);
  return seq.map((pc) => mod12(pc + t));
}

//flipping notes around 0:
function invert(seq) {
  return seq.map((pc) => mod12(-pc));
}

//reversing order:
function retrograde(seq) {
  return [...seq].reverse();
}
//list of actions:
const actions = ["Transpose", "Invert", "Retrograde"];

function randomInt(min, maxInclusive) {
  return min + Math.floor(Math.random() * (maxInclusive - min + 1));
}

//how the composition is built:
function generateComposition(initialSeq, numOperations) {
  const log = []; //will store the operations applied
  let current = [...initialSeq]; //holds the current transformed sequence
  const full_output = []; //start + each step

  if (current.length) {
    log.push(`start: [${current.join(", ")}]`);
  }

  //include the first sequence in the full composition output
  if (current.length) {
    full_output.push(...current);
  }
 
  //for each operation, apply a random action to the current sequence
  for (let i = 0; i < numOperations; i++) {
    const op = actions[randomInt(0, actions.length - 1)];
    if (op === "Transpose") {
      const n = randomInt(0, 11); //pick a random offset to transpose by
      current = transpose(current, n);
      log.push(`Transpose${n}: [${current.join(", ")}]`);
    } else if (op === "Invert") {
      current = invert(current);
      log.push(`Invert: [${current.join(", ")}]`);
    } else {
      current = retrograde(current);
      log.push(`Retrograde: [${current.join(", ")}]`);
    }

    full_output.push(...current);
  }

  const final_output = current.length ? [...current] : [];
  if (current.length) {
    log.push(`final: [${current.join(", ")}]`);
  }

  return { pitchClasses: full_output, fullPitchClasses: full_output, finalPitchClasses: final_output, log };
}

//parsing the user input:
function parsePitchClassString(str) {
  return str
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = Number(s);
      if (!Number.isInteger(n) || n < 0 || n > 11) {
        throw new Error(`Invalid pitch class: ${s} (need integers 0–11)`);
      }
      return n;
    });
}

//playing the composition using Web Audio API
//pitchClasses = array of pitch-class #s that will be played
//if whole compsotion: pitchClasses is a long concatenation of all the transformed sequences
function playPitchClasses(pitchClasses, input_val = {}) {
  const noteSeconds = input_val.noteSeconds ?? 0.22;
  const gapSeconds = input_val.gapSeconds ?? 0.04;
  const baseMidi = input_val.baseMidi ?? 60;

  const ctx = new AudioContext(); //creating a new audio context
  const t0 = ctx.currentTime + 0.05;
  let t = t0;

  //going through each pitch class and playing it
  for (let i = 0; i < pitchClasses.length; i++) {
    const pc = mod12(pitchClasses[i]); //keeps it in range 0-11
    const midi = baseMidi + pc; //converts to MIDI note
    const frequency= 440 * Math.pow(2, (midi - 69) / 12); //converts to frequency

    //creating the oscillator and gain envelope
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, t);

    gain.gain.setValueAtTime(0.0001, t); //start almost silent
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02); //quickly become audible
    gain.gain.exponentialRampToValueAtTime(0.0001, t + noteSeconds); //fade out to silence

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + noteSeconds + 0.02);

    t += noteSeconds + gapSeconds;
  }

  const total = t - t0 + 0.1;
  return new Promise((resolve) => {
    setTimeout(() => {
      ctx.close().catch(() => {});
      resolve();
    }, total * 1000);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    mod12,
    transpose,
    invert,
    retrograde,
    generateComposition,
    parsePitchClassString,
    playPitchClasses,
  };
}
