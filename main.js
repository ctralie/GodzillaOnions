let canvas = new Canvas2D();
let onionsAnim = new OnionsAnimation(canvas);
const info = document.getElementById("info");

function resetOnionsButton() {
    const onions = document.getElementById("onionsButton");
    onions.innerHTML = "Compute Onions";
}

function selectPoints() {
    canvas.unfreeze();
    onionsAnim.clear();
    resetOnionsButton();
}

function clearPoints() {
    canvas.clear();
    onionsAnim.clear();
    canvas.unfreeze();
    resetOnionsButton();
}

function makeOnions() {
    if (canvas.getPoints().length > 0) {
        const onions = document.getElementById("onionsButton");
        onions.innerHTML = "Next step";
        onionsAnim.makeOnions();
    }
    else {
        info.innerHTML = "Need to select some points first!";
    }

}