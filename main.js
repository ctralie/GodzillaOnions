let canvas = new Canvas2D();
let onionsAnim = new OnionsAnimation(canvas);
const info = document.getElementById("info");

function selectPoints() {
    canvas.unfreeze();
    onionsAnim.clear();
}

function clearPoints() {
    canvas.clearPoints();
    canvas.clearLines();
    onionsAnim.clear();
    canvas.unfreeze();
}

function makeOnions() {
    onionsAnim.makeOnions();
}