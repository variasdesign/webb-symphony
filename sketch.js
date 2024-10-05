let img;
let hueCounts = {};
let rankedHues = [];
const similarityThreshold = 10; // Threshold for neighboring pixel similarity
const hueDistanceThreshold = 15; // Threshold for hue ranking exclusion
const synths = [];
// Base notes from C2 to C6
const baseNotes = [
  'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
  'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
  'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'
];

function preload() {
  // Load the image
  img = loadImage('img/2.png'); 
}

function setup() {
  createCanvas(img.width, img.height);
  img.loadPixels();

  // Switch to HSB color mode
  colorMode(HSB, 360, 100, 100);

  // Process the image to gather hue data
  processImageForHues(20);

  // Display the original image
  image(img, 0, 0);
}

function mousePressed() {
  // Play sounds for the ranked hues when the user clicks the image
  playSoundsForRankedHues();
}

function processImageForHues(rankNum) {
  hueCounts = {}; // Reset hueCounts for new analysis

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let i = (y * img.width + x) * 4; // Pixel index in the pixel array
      let r = img.pixels[i];
      let g = img.pixels[i + 1];
      let b = img.pixels[i + 2];

      // Convert RGB to HSB
      let hsbColor = color(r, g, b);
      let hueValue = hue(hsbColor);
      let saturationValue = saturation(hsbColor);
      let brightnessValue = brightness(hsbColor);

      // Check if pixel meets the brightness threshold
      if (brightnessValue >= 25) {
        // Check neighboring pixels for similarity
        if (isSimilarToNeighbors(x, y, hueValue)) {
          // Add the hue if it doesn't conflict with existing hues in the ranking
          addHueIfUnique(hueValue, saturationValue, brightnessValue);
        }
      }
    }
  }

  // Rank hues by frequency
  rankedHues = Object.entries(hueCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, rankNum); // Get the top 5 hues

  // Output the results to console
  console.log(`Top ${rankNum} hues:`);
  rankedHues.forEach(hueEntry => {
    const hueData = hueEntry[1];
    console.log(`Hue: ${hueData.hue}, Saturation: ${hueData.saturation}, Brightness: ${hueData.brightness}, Count: ${hueData.count}`);
  });
}

function isSimilarToNeighbors(x, y, hueValue) {
  const neighbors = [
    [-1, 0], [1, 0], [0, -1], [0, 1] // Left, Right, Up, Down
  ];

  for (let [dx, dy] of neighbors) {
    let nx = x + dx;
    let ny = y + dy;

    // Ensure we're within bounds
    if (nx >= 0 && nx < img.width && ny >= 0 && ny < img.height) {
      let neighborIndex = (ny * img.width + nx) * 4;
      let nr = img.pixels[neighborIndex];
      let ng = img.pixels[neighborIndex + 1];
      let nb = img.pixels[neighborIndex + 2];

      let neighborHsbColor = color(nr, ng, nb);
      let neighborHue = hue(neighborHsbColor);

      // Check for similarity
      if (abs(neighborHue - hueValue) > similarityThreshold) {
        return false; // Not similar
      }
    }
  }
  return true; // All neighbors are similar
}

function addHueIfUnique(hueValue, saturationValue, brightnessValue) {
  let isUnique = true;

  // Check existing hues in hueCounts
  for (let existingHue in hueCounts) {
    if (abs(existingHue - hueValue) <= hueDistanceThreshold) {
      isUnique = false; // Found a similar hue
      break;
    }
  }

  // Add to hueCounts if unique
  if (isUnique) {
    // Count the hue along with saturation and brightness
    hueCounts[hueValue] = {
      hue: hueValue,
      saturation: saturationValue,
      brightness: brightnessValue,
      count: (hueCounts[hueValue]?.count || 0) + 1
    };
  }
}

function playSoundsForRankedHues() {
  const delayBetweenNotes = 2000; // 500 milliseconds delay between notes
  const synth = new p5.PolySynth(); // Use a single synth for all notes
  reverb = new p5.Reverb();
  cmp = new p5.Compressor();
  filter = new p5.LowPass();


  rankedHues.forEach((hueEntry, index) => {
    const hueData = hueEntry[1];
    let hueValue = hueData.hue;

    // Calculate the note, octave, and duration
    let noteIndex = Math.floor(map(hueValue, 0, 360, 0, baseNotes.length)); // Map hue to note
    let note = baseNotes[noteIndex % baseNotes.length]; // Get note from baseNotes array

    // Extract the base note and current octave
    let noteName = note.slice(0, -1); // Get the note without the octave number (e.g., "C#", "D")
    let currentOctave = parseInt(note.slice(-1)); // Extract the current octave number

    // Adjust the octave based on brightness
    let octaveAdjustment = Math.floor(map(hueData.brightness, 0, 100, 0, 0)); // Adjust octave based on brightness
    let adjustedOctave = currentOctave + octaveAdjustment;

    // Construct the final note with the adjusted octave
    let finalNote = noteName + adjustedOctave;

    // Calculate duration based on saturation
    let duration = map(hueData.saturation, 0, 100, 2, 5); // Adjust duration based on saturation (in seconds)

    // Print the note and corresponding hue details
    console.log(`Playing Note: ${finalNote}, Hue: ${hueValue}, Saturation: ${hueData.saturation}, Brightness: ${hueData.brightness}, Duration: ${duration}`);

    // Play the note with the appropriate duration
    synth.setADSR(5, 1, 0.4, 3);
    synth.play(finalNote, 1, index / 2, duration); // Play the note with delay and duration
    reverb.process(synth, 3, 2);
    cmp.process(synth, 0.5, 4, 4, -12);
    synth.disconnect();
    synth.connect(filter);
    filter.freq(500);
    filter.res(50);
  });
}
