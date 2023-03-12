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
      230,
      317.566650390625
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
    ]
  ];