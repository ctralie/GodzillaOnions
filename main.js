let canvas = new Canvas2D();
const info = document.getElementById("info");
let onionsAnim = new OnionsAnimation(canvas);

function resetDirections() {
    document.getElementById("info").innerHTML = "Select some points in the left box to get started!";
}

function animationStarter() {
    if (canvas.getPoints().length > 0) {
        const onions = document.getElementById("onionsButton");
        onions.innerHTML = "Next step";
        onionsAnim.makeOnions();
    }
    else {
        info.innerHTML = "Need to select some points first!";
    }
}

/**
 * Clear any onion computation in progress
 */
function resetOnions() {
    const onionsButton = document.getElementById("onionsButton");
    onionsButton.innerHTML = "Compute Onions";
    onionsAnim.clear();
    onionsAnim = new OnionsAnimation(canvas);
    onionsButton.addEventListener("click", animationStarter, {"once":true});
}

function selectPoints() {
    canvas.unfreeze();
    resetOnions();
    resetDirections();
}

function clearPoints() {
    canvas.clear();
    canvas.unfreeze();
    resetOnions();
    resetDirections();
}


resetOnions();
resetDirections();

let points = [
  [
    113,
    54.56666564941406
  ],
  [
    348,
    93.56666564941406
  ],
  [
    209,
    294.48333740234375
  ],
  [
    72,
    317.566650390625
  ],
  [
    265,
    492.566650390625
  ],
  [
    402,
    275.566650390625
  ],
  [
    352,
    270.566650390625
  ],
  [
    120,
    504.566650390625
  ],
  [
    495,
    548.566650390625
  ],
  [
    335,
    343.566650390625
  ],
  [
    103,
    167.56666564941406
  ],
  [
    253,
    452.566650390625
  ],
  [
    480,
    174.56666564941406
  ],
  [
    313,
    201.48333740234375
  ],
  [
    262,
    176.48333740234375
  ],
  [
    194,
    167.48333740234375
  ],
  [
    150,
    208.48333740234375
  ],
  [
    277,
    289.48333740234375
  ],
  [
    288,
    378.48333740234375
  ],
  [
    237,
    256.48333740234375
  ],
  [
    323,
    424.48333740234375
  ],
  [
    171,
    374.48333740234375
  ],
  [
    137,
    293.48333740234375
  ],
  [
    226,
    66.48333740234375
  ],
  [
    517,
    408.48333740234375
  ],
  [
    321,
    564.4833374023438
  ],
  [
    186,
    100.48333740234375
  ],
  [
    390,
    153.48333740234375
  ],
  [
    468,
    258.48333740234375
  ],
  [
    475,
    417.48333740234375
  ],
  [
    360,
    520.4833374023438
  ],
  [
    388,
    408.48333740234375
  ],
  [
    424,
    328.48333740234375
  ],
  [
    428,
    221.48333740234375
  ],
  [
    298,
    124.48333740234375
  ],
  [
    178,
    479.48333740234375
  ],
  [
    226,
    547.4833374023438
  ],
  [
    103,
    393.48333740234375
  ],
  [
    80,
    244.48333740234375
  ],
  [
    206,
    341.48333740234375
  ],
  [
    244,
    397.48333740234375
  ]
];
for (let i = 0; i < points.length; i++) {
  canvas.addPoint(points[i]);
}