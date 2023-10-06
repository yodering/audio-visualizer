var song
var fft
var img
var particles = []
var db
var audioInput
var imageInput


function setup() {
  createCanvas(windowWidth, windowHeight)
  angleMode(DEGREES)
  fft = new p5.FFT()
  audioInput = document.getElementById('audioInput')
  imageInput = document.getElementById('imageInput')
  imageMode(CENTER)
  rectMode(CENTER)
}

function draw() {
  background(0)
  stroke(255)
  strokeWeight(3)
  noFill()

  translate(width / 2, height / 2)
  fft.analyze()
  amp = fft.getEnergy(20, 200)

  push()
  if (amp > 230) {
    rotate(random(-0.5, 0.5))
  }
  if (img) {
    image(img, 0, 0, width, height); // or your desired coordinates and dimensions
  }
  

  pop()

  var alpha = map(amp, 0, 255, 180, 150)
  fill(0, alpha)
  noStroke()
  rect(0, 0, width, height)

  stroke(255)
  strokeWeight(3)
  noFill()


  var wave = fft.waveform()


  for (var t = -1; t <= 1;  t+= 2) {
    beginShape()
    for (var i = 0; i <= 180; i += 0.5) {
      var index = floor(map(i, 0, 180, 0, wave.length - 1))
      var r = map(wave[index], -1, 1, 150, 350)
      var x = r * sin(i) * t 
      var y = r * cos(i)
      vertex(x, y)
    }
  endShape()
  }

  var p = new Particle()
  particles.push(p)

  for (var i = particles.length - 1; i >= 0; i--) {
    if (!particles[i].edges()){
      particles[i].update(amp > 230)
      particles[i].show()
    }
    else {
      particles.splice(i, 1)
    }
  }
}


class Particle {
  constructor() {
    this.pos = p5.Vector.random2D().mult(250)
    this.vel = createVector(0, 0)
    this.acc = this.pos.copy().mult(random(0.0001, 0.00001))

    this.w = random(3, 5)

    this.color = [random(200, 255), random(200, 255), random(200, 255)]
  }
  update(cond) {
    this.vel.add(this.acc)
    this.pos.add(this.vel)
    if (cond) {
      this.pos.add(this.vel)
      this.pos.add(this.vel)
      this.pos.add(this.vel)
    }
  }
  edges() {
    if (this.pos.x < -width / 2 || this.pos.x > width / 2 || this.pos.y < -height / 2 || this.pos.y > height / 2) {
      return true
    }
    else {
      return false
    }
  }

  show() {
    noStroke()
    fill(this.color)
    ellipse(this.pos.x, this.pos.y, this.w)
  }
}

function storeImage() {
  const file = imageInput.files[0];
  if (!file) return alert('Please select an image file');

  const reader = new FileReader();
  reader.readAsArrayBuffer(file);
  reader.onload = (event) => {
    const imageData = event.target.result;
    openDB().then(db => {
      const transaction = db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      store.add(imageData);
    }).catch(err => {
      console.error('Error storing image:', err);
    });
  };
}


function loadAndDisplayImage() {
  openDB().then(db => {
    const transaction = db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');
    const getRequest = store.getAll();

    getRequest.onsuccess = (event) => {
      const imageData = event.target.result[0];
      if (!imageData) return alert('No image found');

      const imageBlob = new Blob([imageData]);
      const imageUrl = URL.createObjectURL(imageBlob);
      loadImage(imageUrl, function(loadedImg) {
        loadedImg.filter(BLUR, 12);
        img = loadedImg;
      });
    };

    getRequest.onerror = (event) => {
      console.error('Error retrieving data:', event);
    };
  }).catch(err => {
    console.error('Error opening DB for image retrieval:', err);
  });
}


function clearImage() {
  openDB().then(db => {
    clearImageData(db, 'images');
    img = null; // Set img to null
  }).catch(err => {
    console.error('Error clearing image:', err);
  });
}

function clearImageData(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const clearRequest = store.clear(); // This will clear all records in the object store
    
    clearRequest.onsuccess = (event) => {
      resolve(); // Resolve the promise since the clear operation was successful
    };
    
    clearRequest.onerror = (event) => {
      reject('Error clearing data'); // Reject the promise with an error message
    };
  });
}






function storeAudio() {
  const file = audioInput.files[0]
  if (!file) return alert('Please select a file')

  const reader = new FileReader()
  reader.readAsArrayBuffer(file)
  reader.onload = (event) => {
    const audioData = event.target.result;
    openDB().then(db => {
      addData(db, 'audio', audioData)
    })
  }
}


function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('audioDB', 2); // You might need to increase the version number

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains('audio')) {
        db.createObjectStore('audio', { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject('Error opening DB');
    };
  });
}


function addData(db, storeName, data) {
  const transaction = db.transaction([storeName], 'readwrite')
  const store = transaction.objectStore(storeName)
  store.add(data)
}

function retrieveData(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const getRequest = store.getAll()

    getRequest.onsuccess = (event) => {
      resolve(event.target.result[0]) // Gets the first audio data found, adjust as needed
    }

    getRequest.onerror = (event) => {
      reject('Error retrieving data')
    }
  })
}

function clearAudio() {
  openDB().then(db => {
    clearData(db, 'audio')
    if (song) {
      song.stop() // Stop the current song if it is playing
      song.dispose() // Dispose of the song to free up memory
      song = null // Set song to null
    }
    alert('Audio cleared successfully')
  }).catch(err => {
    console.error('Error clearing audio:', err)
  })
}

function clearData(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const clearRequest = store.clear(); // This will clear all records in the object store
    
    clearRequest.onsuccess = (event) => {
      resolve(); // Resolve the promise since the clear operation was successful
    };
    
    clearRequest.onerror = (event) => {
      reject('Error clearing data') // Reject the promise with an error message
    }
  })
}

function loadAudio() {
  openDB().then(db => {
    retrieveData(db, 'audio').then(audioData => {
      if (!audioData) return alert('No audio found')

      const audioBlob = new Blob([audioData])
      const audioUrl = URL.createObjectURL(audioBlob)
      if (song) song.dispose() // Dispose of previous song
      song = loadSound(audioUrl) // Load the new song without playing
    })
  }).catch(err => {
    console.error('Error loading audio:', err)
  });
}

function playAudio() {
  if (song && !song.isPlaying()) {
    song.play() // Play the song if it is not already playing
  } else {
    alert('No audio is loaded or it is already playing')
  }
}

function pauseAudio() {
  if (song && song.isPlaying()) {
    song.pause() // Pause the song if it is playing
  } else {
    alert('No audio is loaded or it is already paused')
  }
}

document.addEventListener('keydown', function(event) {
  if (event.key.toLowerCase() === 's') {
    toggleMenu()
  }
})

function toggleMenu() {
  const menu = document.getElementById('menu')
  if (menu.style.display === 'none' || menu.style.display === '') {
    menu.style.display = 'block'
  } else {
    menu.style.display = 'none'
  }
}





