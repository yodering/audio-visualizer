var song

function preload() {
  song = loadSound('assets/fancypants.mp3')
}

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(0);
}

function mouseClicked() {
  if (song.isPlaying()) {
    song.pause()
  }
  else {
    song.play()
  }
}
