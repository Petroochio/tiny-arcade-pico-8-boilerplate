// this is the js file to edit to change the control code
const Beholder = window['beholder-detection'].default;
let sliderMarker; // Global reference for our marker
let leftM, rightM, shootM, overlayCanvas, overlayCtx;

let beholderConfig = {
  camera_params: {
    videoSize: 0, // The video size values map to the following [320 x 240, 640 x 480, 1280 x 720, 1920 x 1080]
    rearCamera: true, // Boolean value for defaulting to the rear facing camera. Only works on mobile
    torch: false, // Boolean value for if torch/flashlight is on. Only works for rear facing mobile cameras. Can only be set from init
  },
  detection_params: {
    minMarkerDistance: 2,
    minMarkerPerimeter: 0.01,
    maxMarkerPerimeter: 1,
    sizeAfterPerspectiveRemoval: 49,
    area: {
      start: { x: 0.30, y: 0.14 },
      end:   { x: 1, y: 0.55 },
    },
  },
  feed_params: {
    contrast: 0,
    brightness: 0,
    grayscale: 0,
    flip: false,
  },
  overlay_params: {
    present: true, // Determines if the Beholder overlay will display or be invisible entirely via display: none
    hide: true, // Determines if the overlay should be hidden on the left of the screen or visible
  },
};

function renderOverlay() {
  overlayCtx.clearRect(0,0, 640, 480);

  const v = Beholder.getVideo();

  // const areaWidth = detectionParams.area.end.x - detectionParams.area.start.x;
  // const areaHeight = detectionParams.area.end.y - detectionParams.area.start.y;
  const areaWidth = beholderConfig.detection_params.area.end.x - beholderConfig.detection_params.area.start.x;
  const areaHeight = beholderConfig.detection_params.area.end.y - beholderConfig.detection_params.area.start.y;

  if (v.width > 20 && overlayCanvas.width !== v.width * areaWidth) {
    // base it off of the actual area
    overlayCanvas.width = v.width * areaWidth;
    overlayCanvas.height = v.height * areaHeight;
  }
  
  overlayCtx.drawImage(v,
    beholderConfig.detection_params.area.start.x * v.width,
    beholderConfig.detection_params.area.start.y * v.height,
    overlayCanvas.width, overlayCanvas.height,
    0, 0,
    overlayCanvas.width, overlayCanvas.height);
  
  Beholder.getAllMarkers().forEach(m => {
    if (!m.present) return;

    const center = m.center;
    const corners = m.corners;
    const angle = m.rotation;
  
    overlayCtx.strokeStyle = "#FF00AA";
    overlayCtx.lineWidth = 5;
    overlayCtx.beginPath();
  
    corners.forEach((c, i) => {
      overlayCtx.moveTo(c.x, c.y);
      let c2 = corners[(i + 1) % corners.length];
      overlayCtx.lineTo(c2.x, c2.y);
    });
  
    overlayCtx.stroke();
    overlayCtx.closePath();
  
    // draw first corner
    overlayCtx.strokeStyle = "blue";
    overlayCtx.strokeRect(corners[0].x - 2, corners[0].y - 2, 4, 4);
  
    overlayCtx.strokeStyle = "#FF00AA";
    overlayCtx.strokeRect(center.x - 1, center.y - 1, 2, 2);

    overlayCtx.font = "12px monospace";
    overlayCtx.textAlign = "center";
    overlayCtx.fillStyle = "#FF55AA";
    overlayCtx.fillText(`ID=${m.id}`, center.x, center.y - 7);
    overlayCtx.fillText(angle.toFixed(2), center.x, center.y + 15);
  });
}

let prevTime = Date.now();
let dt, currTime;
const UPDATE_RATE = 1000 / 30;
let updateTime = UPDATE_RATE;
let currx = 0;
let refLeft, refRight;
// Update function for the Beholder detection. This causes the markers to update, all input code should be done here
function bUpdate() {
  // Queue up the next update iteration for the next frame
  requestAnimationFrame(bUpdate);

  currTime = Date.now();
  dt = currTime - prevTime;
  prevTime = currTime;
  
  updateTime -= dt;
  
  if (updateTime > 0) return;
  updateTime = UPDATE_RATE;
  // This updates Beholder and makes sure the computer vision code is run every frame.
  Beholder.update(); // 90 - 313
  renderOverlay();
  // console.log((sliderMarker.center.x - refLeft.center.x - 45) / 162) /// (refRight.center.x - refLeft.center.x);
  
  // If marker 0 is present, lerp it's position from a pre-determined range to fit within 0-128 for pico 8
  if (sliderMarker.center.x !== NaN && sliderMarker.center.x !== 0 && pico8_gpio) {
    let newTarget = (sliderMarker.center.x - refLeft.center.x - 45) / 70 * 128;
    // let newTarget = (sliderMarker.center.x - refLeft.center.x -100) / (refRight.center.x - refLeft.center.x - 100) * 128
    currx = currx + (newTarget - currx) * 0.4;

    // This sets data inside of the pico8_gpio array.
    // This value can be read from within the cart with   PEEK(0x5f80)
    pico8_gpio[0] = currx;

    // If you want to push a value to another spot in pico 8 memory just use another index in the array
    // You should only push numbers to this array :)
    // pico8_gpio[1] = 42;

    // To access this use PEEK(0x5f81), or PEEK(0x5f80 + 1) this can be usefull if you are looping through memory
  }

  // pico8_gpio[0] = leftM.present ? 1 : 0;
  // pico8_gpio[1] = rightM.present ? 1 : 0;
  // pico8_gpio[0] = sliderMarker.center.x < 115 ? 1 : 0;
  // pico8_gpio[1] = sliderMarker.center.x > 120 ? 1 : 0;

  // pico8_gpio[2] = shootM.present ? 0 : 1; // Old
  pico8_gpio[2] = shootM.present ? 1 : 0;
}

window.onload = () => {
  // Initialize the beholder detection library
  // console.log('lol what');

  // This will not work on desktop, comment it out if you wish to test on desktop first for whatever reason
  Beholder.init('#tinycade-div', beholderConfig);

  overlayCanvas = document.querySelector('#example-canvas');
  overlayCtx = overlayCanvas.getContext('2d');

  overlayCanvas.addEventListener('click', () => {
    overlayCanvas.classList.toggle('big-canvas');
  })

  // For desktop testing only use this line
  // Beholder.init('#tinycade-div', { overlay_params: { present: true }, camera_params: { rearCamera: false, torch: false, videoSize: 0 } });

  // Get a reference to the marker with the id 0
  // leftM = Beholder.getMarker(4)
  // rightM = Beholder.getMarker(3);
  // leftM.timeout = 150
  shootM = Beholder.getMarker(1);
  refLeft = Beholder.getMarker(4);
  refLeft.timeout = 300;
  refRight = Beholder.getMarker(3); 
  refRight.timeout = 300;
  sliderMarker = Beholder.getMarker(0);
  sliderMarker.timeout = 300;
  shootM.timeout = 120;
  bUpdate()
}
