const DEFAULT_STROKE_WIDTH = 1;
const SLIGHT_BOLD_STROKE_WIDTH = 3;
const BOLD_STROKE_WIDTH = 4;
const EXTRA_BOLD_STROKE_WIDTH = 6;
const POINT_SIZE = 5;
const POINT_BOLD_SIZE = 10;

//////////////////////////////////////////////////////////
//////////////   Animation Utilities  ////////////////////
//////////////////////////////////////////////////////////

/**
 * If any of the buttons are pressed, we unblock the blocked code
 * in the animation.  It either continues to the next step, or it
 * returns from the method early if it's finished
 * @returns Promise waiting for a button press
 */
function nextButton() {
    return new Promise(resolve => {
        let buttons = ["animButton", "clearPoints", "selectPoints"];
        for (let i = 0; i < buttons.length; i++) {
            const button = document.getElementById(buttons[i]);
            button.addEventListener("click", function(e) {
                resolve();
            }, {"once":true});
        }
    })
}

function updateInfo(s) {
    const info = document.getElementById("info");
    info.innerHTML = s;
}



//////////////////////////////////////////////////////////
//////////////   Geometry Utilities   ////////////////////
//////////////////////////////////////////////////////////

/**
 * Find the indices of subset in the list Ps
 * 
 * @param {list of [x, y]} Ps Larger points list
 * @param {list of [x, y]} subset List of points which coincide 
 *                                with a subset of Ps
 * @return List of indices
 */
function getSubsetIdxs(Ps, subset) {
    // Step 1: Setup a dictionary to quickly look up indices
    let ps2idx = {};
    for (let i = 0; i < Ps.length; i++) {
        ps2idx[Ps[i][0]+"_"+Ps[i][1]] = i;
    }
    // Step 2: Look up point indices
    let indices = [];
    for (let i = 0; i < subset.length; i++) {
        indices.push(ps2idx[subset[i][0]+"_"+subset[i][1]]);
    }
    return indices;
}

/**
 * Implement a naive method to get the onions by 
 * performing convex hulls from scratch after removing
 * each layer
 * @param {list of [x, y]} Ps Points
 * @returns list of list of indices in layers
 */
function getOnions(Ps) {
    let layer = getSubsetIdxs(Ps, d3.polygonHull(Ps));
    let layers = [layer];
    let layerSet = new Set();
    while (layer.length >= 3) {
        for (let i = 0; i < layer.length; i++) {
            layerSet.add(layer[i]);
        }
        // Remove the last layer
        let PsSub = Ps.filter((_, i) => !layerSet.has(i));
        // Recompute the convex hull
        hull = PsSub;
        if (PsSub.length >= 3) {
            hull = d3.polygonHull(PsSub);
        }
        layer = getSubsetIdxs(Ps, hull);
        if (layer.length > 0) {
            layers.push(layer);
        }
    }
    return layers;
}

/**
 * Return the points on a line segment in a particular layer
 * NOTE: The slope is done in clockwise order instead of 
 * counterclockwise order since the svg is flipped, but we 
 * want it to look canonically CCW
 * 
 * @param {list of [x, y]} Ps Full list of points
 * @param {list of int} L List of indices into Ps of points on this layer
 * @param {int} idx Index of point in this layer
 * @returns [a, b]
 */
function getSegment(Ps, L, idx) {
    const P1 = Ps[L[idx]];
    const P2 = Ps[(L[(idx+1)%L.length])];
    return [P1, P2];
}

/**
 * Return the slope of a point in a particular layer
 * NOTE: The slope is done in clockwise order instead of 
 * counterclockwise order since the svg is flipped, but we 
 * want it to look canonically CCW
 * 
 * @param {list of [x, y]} Ps Full list of points
 * @param {list of int} L List of indices into Ps of points on this layer
 * @param {int} idx Index of point in this layer
 * @returns Slope between layer[idx] and layer[(idx+1)%layer length]
 */
function getSlopeCW(Ps, L, idx) {
    const P1 = Ps[L[idx]];
    const P2 = Ps[(L[(idx+1)%L.length])];
    let diff = [P1[0]-P2[0], P2[1]-P1[1]];
    let ret = Math.atan2(diff[1], diff[0]);
    return ret;
}


/**
 * Run CCW between the vectors ab and cd
 * @param {list} a First point on first line
 * @param {list} b Second point on first line
 * @param {list} c First point on second line
 * @param {list} d Second point on second line
 */
function ccwLines(a, b, c, d) {
    const ax = b[0] - a[0];
    const ay = b[1] - a[1];
    const bx = d[0] - c[0];
    const by = d[1] - c[1];
    return Math.sign(ax*by - ay*bx); 
}

/**
 * Return the angle between two lines
 * @param {list} a First point on first line
 * @param {list} b Second point on first line
 * @param {list} c First point on second line
 * @param {list} d Second point on second line
 */
function getAngle(a, b, c, d) {
    let ax = b[0] - a[0];
    let ay = b[1] - a[1];
    let bx = d[0] - c[0];
    let by = d[1] - c[1];
    const aMag = Math.sqrt(ax*ax + ay*ay);
    const bMag = Math.sqrt(bx*bx + by*by);
    let dot = ax*bx + ay*by;
    let arg = dot/(aMag*bMag);
    if (arg < -1) {
        arg = -1;
    }
    if (arg > 1) {
        arg = 1;
    }
    return Math.acos(arg); 
}


/**
 * Return true if the point p is above line line from P1 to P2,
 * using the CCW convention for the normal
 * 
 * @param {[x, y]} P1 First point on line
 * @param {[x, y]} P2 Second point on line
 * @param {[x, y]} p Query point
 * 
 * @returns true if p is above P1P2, or false otherwise
 */
function isAboveLine(P1, P2, p) {
    const x = p[0];
    const y = p[1];
    const vx = P2[0]-P1[0];
    const vy = P2[1]-P1[1];
    return vy*(P1[0]-x) + vx*(y-P1[1]) > 0;
}

//////////////////////////////////////////////////////////
//////////////       Onions Code      ////////////////////
//////////////////////////////////////////////////////////

/**
 * A helper method for drawing M layers
 * @param {OnionLayer} layer The L layer this is associated to
 * @param { {layer:OnionLayer, idx:int, Lidx, Midx} } M
     * layer: The layer that this point comes from
     * idx: The index of the point in the layer that it comes from
     * LIdx: Pointer to the nearest slope index in the L layer associated to this M
     * MIdx: Pointer to the nearest slope index in the M layer one above this M
 * @param {svg element} drawArea The area to which to draw this M
 */
function drawM(layer, M, drawArea) {
    const Ps = layer.Ps;
    const N = layer.N;
    for (let i = 0; i < M.length; i++) {
        const layer = M[i].layer;
        const idx = M[i].idx;
        let point = Ps[layer.L[idx]];
        const color = d3.rgb(layer.getColor());
        drawArea.append("circle")
        .attr("r", POINT_SIZE).attr("fill", color)
        .attr("cx", point[0]).attr("cy", point[1]);
    }

    for (let i = 0; i < M.length; i++) {
        const layer = M[i].layer;
        const idx = M[i].idx;
        const P1 = Ps[layer.L[idx]];
        const P2 = Ps[(layer.L[(idx+1)%layer.L.length])];
        const color = d3.rgb(layer.getColor());
        drawArea.append("line")
        .attr("x1", P1[0]).attr("y1", P1[1])
        .attr("x2", P2[0]).attr("y2", P2[1])
        .attr("stroke", color).attr("stroke-width", DEFAULT_STROKE_WIDTH);
    }
}

class OnionLayer {
    /**
     * @param {Canvas2D} canvas Canvas to which to draw points/lines
     * @param {int} idx Index of layer (Used to color)
     * @param {int} N Total number of layers
     * @param {List of [x, y]} Ps Points
     * @param {list of int} L Indices into Ps of this layer
     * 
     * @attribute {list of (OnionLayer pointer, int)} M
     * The corresponding M list for this layer
     */
    constructor(canvas, idx, N, Ps, L, colormap) {
        if (colormap === undefined) {
            colormap = `interpolateOrRd`;
        }
        this.colorInterpolator = d3[colormap];
        this.canvas = canvas;
        this.Ps = Ps;
        this.idx = idx;
        this.N = N;
        // Sort L with getSlopeCW(Ps, L, idx)
        let LAux = L.map((idx, i) => {
            return {"idx":idx, "slope":getSlopeCW(Ps, L, i), "segment":getSegment(Ps, L, i)};
        });
        LAux.sort((a, b)=> a.slope - b.slope);
        this.L = LAux.map(v => v.idx);
        this.LSlopes = LAux.map(v => v.slope);
        this.LSegments = LAux.map(v => v.segment);
        this.initPointsLines();
        this.drawL();
        this.finished = false;
    }

    /**
     * Setup SVG structures for points and lines for L and M
     */
    initPointsLines() {
        const canvas = this.canvas.canvas;
        this.LCanvas = canvas.append("g").attr("class", "L"+this.idx);
        this.MCanvas = canvas.append("g").attr("class", "M"+this.idx);
    }

    /**
     * Clear the SVG structures for points and lines for L and M
     * and mark this as finished
     */
    clear() {
        this.LCanvas.remove();
        this.MCanvas.remove();
        this.finished = true;
    }
    
    /**
     * Get the color for this layer
     * @returns rgb(int, int, int)
     */
    getColor() {
        return this.colorInterpolator((this.idx+1)/this.N);
    }

    /**
     * Draw the points and lines for this layer
     */
    drawL() {
        const color = d3.rgb(this.getColor());
        for (let i = 0; i < this.L.length; i++) {
            const point = this.Ps[this.L[i]];
            this.LCanvas.append("circle")
            .attr("r", POINT_SIZE).attr("fill", color)
            .attr("cx", point[0]).attr("cy", point[1]);
        }

        for (let i = 0; i < this.L.length; i++) {
            const P1 = this.Ps[this.L[i]];
            const P2 = this.Ps[(this.L[(i+1)%this.L.length])];
            this.LCanvas.append("line")
            .attr("x1", P1[0]).attr("y1", P1[1])
            .attr("x2", P2[0]).attr("y2", P2[1])
            .attr("stroke", color).attr("stroke-width", DEFAULT_STROKE_WIDTH);
        }
    }

    /**
     * Add and draw the corresponding M list for this layer
     * 
     * @param { {layer:OnionLayer, idx:int, Lidx, Midx} } M
     * layer: The layer that this point comes from
     * idx: The index of the point in the layer that it comes from
     * LIdx: Pointer to the nearest slope index in the L layer associated to this M
     * MIdx: Pointer to the nearest slope index in the M layer one above this M
     * 
     * @param {list of float} MSlopes of each point in M with respect to the following
     * point in the layer it's a part of
     * 
     * @param {list of [[x1, y1], [x2, y2]]} MSegments List of segments corresponding
     * to each part of M
     * 
     */
    setM(M, MSlopes, MSegments) {
        this.M = M;
        this.MSlopes = MSlopes;
        this.MSegments = MSegments;
        drawM(this, M, this.MCanvas);
    }
}

/**
 * Return the index in a list of numbers of the
 * greatest number that's <= a target number
 * 
 * @param {list} arr A sorted array of numbers
 * @param {float} target A target number
 * 
 * @returns Index of greatest number <= a target number
 */
function binarySearch(arr, target) {
    low = 0
    high = arr.length-1;
    while (low != high) {
        let mid = Math.floor((low+high)/2);
        if (arr[mid] < target) {
            low = mid+1;
        }
        else {
            high = mid; // Could be equal
        }
    }
    return low;
}

/**
 * Cheat and do a linear search to find the index
 * of the line segment L in arr so that CCW(L, target) <= 0
 * and getAngle(L, target) is as small as possible
 * (NOTE: Can also implement circular binary search, but this is
 * quicker to code and less error prone for now)
 * 
 * @param {list of [x, y]} arr List of line segments
 * @param {[x, y]} target Target line segment
 */
function circularCWSearch(arr, target) {
    let minIdx = 0;
    let smallestAngle = 2*Math.PI;
    const c = target[0];
    const d = target[1];
    for (let i = 0; i < arr.length; i++) {
        const a = arr[i][0];
        const b = arr[i][1];
        if (ccwLines(a, b, c, d) <= 0) {
            const angle = getAngle(a, b, c, d);
            if (angle < smallestAngle) {
                smallestAngle = angle;
                minIdx = i;
            }
        }
    }
    return minIdx;
}



class OnionsAnimation {
    /**
     * 
     * @param {Canvas2D} canvas Canvas to which to draw points/lines
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.layers = [];
        this.finished = false;
        this.tempCanvas = canvas.canvas.append("g");
        this.resultCanvas = canvas.canvas.append("g");
        this.moveTime = 500; // Animation delay
        this.preprocessingFinished = false;
    }

    clearTempCanvas() {
        this.tempCanvas.remove();
        this.tempCanvas = this.canvas.canvas.append("g");
        this.tempCanvas.attr("class", "tempCanvas");
        return this.tempCanvas;
    }

    clearResultCanvas() {
        this.resultCanvas.remove();
        this.resultCanvas = this.canvas.canvas.append("g");
        this.resultCanvas.attr("class", "resultCanvas");
        return this.resultCanvas;
    }

    /**
     * Walk through the preprocessing steps to setup the onion layers
     * @param {boolean} fastForward A checkbox DOM element. 
     * If checked, go through all of the preprocessing steps without waiting for user input
     * @returns 
     */
    async makeOnions(fastForward) {
        const moveTime = this.moveTime;
        const halfWidth = this.canvas.width/2;
        let tempCanvas = this.clearTempCanvas();
        //////////////// Step 1: Setup the onion layers //////////////// 
        updateInfo("Okay let's do it!  The first step is to compute each layer of the onion by computing the convex hulls from the outside to the inside.");
        if (!fastForward.checked) {await nextButton(); if(this.finished) {return;}}
        let layersIdxs = getOnions(this.canvas.getPoints());
        this.layers = [];
        const Ps = this.canvas.getPoints();
        for (let i = 0; i < layersIdxs.length; i++) {
            let layer = new OnionLayer(this.canvas, i, layersIdxs.length, Ps, layersIdxs[i]);
            this.layers.push(layer);
            let info = "Here's layer <b><span style=\"color:" + layer.getColor() + "\">";
            info += "L<SUB>" + i + "<SUB></span></b>";
            updateInfo(info);
            if (!fastForward.checked) {await nextButton(); if(this.finished) {return;}}
        }

        ////////////////  Step 2: Setup the M layers from the inside out //////////////// 
        updateInfo("Now we need to compute the \"helper layers\" <b>M<SUB>i</SUB></b> for each layer.  This is where <a href = \"https://en.wikipedia.org/wiki/Fractional_cascading\">fractional cascading</a> comes in; each helper layer <b>M<SUB>i</SUB></b> will be a merging of the layer <b>L<SUB>i</b> and <i>every other element</i> of <b>M<SUB>i-1</SUB></b>, sorted by slope");
        if (this.layers.length > 0) {
            if (!fastForward.checked) {await nextButton(); if(this.finished) {return;}}

            // Step 2a: Setup the first M layer
            let idx = this.layers.length-1;

            let info = "The innermost layer gets copied as is; that is, ";
            info += "<b><span style=\"color:" + this.layers[idx].getColor() + "\">M<SUB>" + idx + "<SUB></span></b> = ";
            info += "<b><span style=\"color:" + this.layers[idx].getColor() + "\">L<SUB>" + idx + "<SUB></span></b>.";
            updateInfo(info);

            const inner = this.layers[idx];
            let M = inner.L.map((_, i)=>{return {"layer":inner, "idx":i, "LIdx":i, "MIdx":0};});
            this.layers[idx].setM(M, inner.LSlopes, inner.LSegments);

            // Pull this M out to look at it
            if (!fastForward.checked) {
                this.layers[idx].MCanvas.transition().duration(moveTime)
                .attr("transform", "translate(" + halfWidth + ",0)");
                if (!fastForward.checked) {await nextButton(); if(this.finished) {return;}}
                // Put this M back
                this.layers[idx].MCanvas.transition().duration(moveTime)
                .attr("transform", "translate(0,0)");
                await new Promise(resolve => {setTimeout(() => resolve(), moveTime)});
            }
            // Setup each subsequent M layer
            while (idx > 0) {
                idx--;
                let info = "";
                if (idx == 0) {
                    info = "Finally";
                }
                else {
                    info = "Now";
                }
                info += ", we create ";
                info += "<b><span style=\"color:" + this.layers[idx].getColor() + "\">M<SUB>" + idx + "<SUB></span></b> ";
                info += "by merging all of the points in "
                info += "<b><span style=\"color:" + this.layers[idx].getColor() + "\">L<SUB>" + idx + "<SUB></span></b>.";
                info += " and every other point from "
                info += "<b><span style=\"color:" + this.layers[idx+1].getColor() + "\">M<SUB>" + (idx+1) + "<SUB></span></b>";
                info += " in counter-clockwise sorted order <i>by slope</i> to allow quick lookup later with binary search.";
                updateInfo(info);
                // Bold M_{i+1} and L_i to show they're about to be active
                this.layers[idx].LCanvas.selectAll("line").attr("stroke-width", BOLD_STROKE_WIDTH);
                this.layers[idx+1].MCanvas.selectAll("line").attr("stroke-width", BOLD_STROKE_WIDTH);
                if (!fastForward.checked) {await nextButton(); if(this.finished) {return;}}
                
                // Take every other element from M_{i+1} and merge with L_i
                let M = this.layers[idx].L.map((_, i)=>{return {"layer":this.layers[idx], "idx":i, "LIdx":i, "MIdx":0};});
                for (let k = 0; k < this.layers[idx+1].M.length; k += 2) {
                    let data = {};
                    data.layer = this.layers[idx+1].M[k].layer;
                    data.idx   = this.layers[idx+1].M[k].idx;
                    data.LIdx = M.length;
                    data.MIdx = k;
                    M.push(data);
                }
                // Now sort by slope (cheating a little bit since this could be done with a linear merge step)
                let MAux = M.map(v => {return {"v":v, "slope":getSlopeCW(Ps, v.layer.L, v.idx),
                                                "segment":getSegment(Ps, v.layer.L, v.idx)}});
                MAux.sort((a, b)=> a.slope - b.slope);
                let MSlopes = MAux.map(v => v.slope);
                let MSegments = MAux.map(v => v.segment);
                M = MAux.map(v => v.v);
                // Update indices into L_i and M_{i+1}
                for (let k = 0; k < M.length; k++) {
                    M[k].LIdx = circularCWSearch(this.layers[idx].LSegments, MSegments[k]);
                    M[k].MIdx = circularCWSearch(this.layers[idx+1].MSegments, MSegments[k]);
                }
                
                // Show each sorted line segment flying over one by one
                if (!fastForward.checked) {
                    tempCanvas = this.clearTempCanvas();
                    for (let k = 0; k < M.length; k++) {
                        let drawArea = tempCanvas.append("g");

                        const P1 = MSegments[k][0];
                        const P2 = MSegments[k][1];
                        let color = d3.rgb(M[k].layer.getColor());
    
                        drawArea.append("circle")
                        .attr("r", POINT_SIZE).attr("fill", color)
                        .attr("cx", P1[0]).attr("cy", P1[1]);
    
                        drawArea.append("line")
                        .attr("x1", P1[0]).attr("y1", P1[1])
                        .attr("x2", P2[0]).attr("y2", P2[1])
                        .attr("stroke", color).attr("stroke-width", DEFAULT_STROKE_WIDTH);
    
                        drawArea.transition().duration(moveTime/4)
                        .attr("transform", "translate(" + halfWidth + ",0)");
                        await new Promise(resolve => {setTimeout(() => resolve(), moveTime/4)});
    
                    }
                }
                if (!fastForward.checked) {await nextButton(); if(this.finished) {return;}}
                if (!fastForward.checked) {
                    tempCanvas.transition().duration(moveTime)
                    .attr("transform", "translate("+-halfWidth + ",0)");
                    await new Promise(resolve => {setTimeout(() => resolve(), moveTime)});
                    tempCanvas.remove();
                }
                this.layers[idx].setM(M, MSlopes, MSegments);
                // Unbold Li and M_{i+1}
                this.layers[idx].LCanvas.selectAll("line").attr("stroke-width", DEFAULT_STROKE_WIDTH);
                this.layers[idx+1].MCanvas.selectAll("line").attr("stroke-width", DEFAULT_STROKE_WIDTH);
            }
        }

        //////////////// Step 3: Show a few examples of pointers //////////////// 
        if (this.layers.length > 1) {
            updateInfo("To allow quick searching later, we also store pointers from each point <b>p</b> in <b>M<SUB>i</SUB></b> to the points in <b>L<SUB>i</SUB></b> and <b>M<SUB>i+1</SUB></b> with the greatest slopes less than or equal <b>p</b>.  Click <code>Next step</code> to see a few examples of pointers from points in <b><span style=\"color:" + this.layers[0].getColor() + "\">M<SUB>0<SUB></span></b> to points in <b><span style=\"color:" + this.layers[0].getColor() + "\">L<SUB>0<SUB></span></b> and points in <b><span style=\"color:" + this.layers[1].getColor() + "\">M<SUB>1<SUB></span></b>");
            if (!fastForward.checked) {await nextButton(); if(this.finished) {return;}}

            const L0 = this.layers[0];
            const L1 = this.layers[1];
            L0.MCanvas.selectAll("line").attr("stroke-width", SLIGHT_BOLD_STROKE_WIDTH);

            // Fly over L0 and M1
            // Pull this M out to look at it
            if (!fastForward.checked) {
                L0.LCanvas.transition().duration(moveTime)
                .attr("transform", "translate(" + halfWidth + ",0)");
                await new Promise(resolve => {setTimeout(() => resolve(), moveTime)});
                // Put this M back
                L1.MCanvas.transition().duration(moveTime)
                .attr("transform", "translate(" + halfWidth + ",0)");
                await new Promise(resolve => {setTimeout(() => resolve(), moveTime)});
            }
            const nExamples = Math.min(5, L0.M.length);
            if (!fastForward.checked) {await nextButton(); if(this.finished) {return;}}
            // Pick a few random points to look at in M0
            let shuffleIdx = L0.M.map((_, i) => {return {"i":i, "v":Math.random()};});
            shuffleIdx.sort((a, b) => a.v - b.v);
            shuffleIdx = shuffleIdx.map(v => v.i);
            for (let kidx = 0; kidx < nExamples; kidx++) {
                let k = shuffleIdx[kidx];
                tempCanvas = this.clearTempCanvas();
                let drawArea = tempCanvas.append("g");
                let Mk = L0.M[k];
                let x1 = Ps[Mk.layer.L[Mk.idx]];
                let x12 = Ps[Mk.layer.L[(Mk.idx+1)%Mk.layer.L.length]];
                
                let x2 = Ps[L0.L[Mk.LIdx]];
                let x22 = Ps[L0.L[(Mk.LIdx+1)%L0.L.length]];
                
                let Mk1 = L1.M[Mk.MIdx];
                let x3 = Ps[Mk1.layer.L[Mk1.idx]];
                let x32 = Ps[Mk1.layer.L[(Mk1.idx+1)%Mk1.layer.L.length]];

                // Draw dotted lines to show pointers
                drawArea.append("line")
                .attr("x1", x1[0]).attr("y1", x1[1])
                .attr("x2", x2[0]+halfWidth).attr("y2", x2[1])
                .attr("stroke", d3.rgb(0, 0, 0))
                .attr("stroke-dasharray", "5,5")
                .attr("stroke-width", DEFAULT_STROKE_WIDTH);

                drawArea.append("line")
                .attr("x1", x1[0]).attr("y1", x1[1])
                .attr("x2", x3[0]+halfWidth).attr("y2", x3[1])
                .attr("stroke", d3.rgb(0, 0, 0))
                .attr("stroke-dasharray", "5,5")
                .attr("stroke-width", DEFAULT_STROKE_WIDTH);

                // Bold slopes that are involved
                let color = Mk.layer.getColor();
                drawArea.append("circle")
                .attr("r", POINT_SIZE).attr("fill", color)
                .attr("cx", x1[0]).attr("cy", x1[1]);
                drawArea.append("line")
                .attr("x1", x1[0]).attr("y1", x1[1])
                .attr("x2", x12[0]).attr("y2", x12[1])
                .attr("stroke", color).attr("stroke-width", EXTRA_BOLD_STROKE_WIDTH);

                color = L0.getColor();
                drawArea.append("circle")
                .attr("r", POINT_SIZE).attr("fill", color)
                .attr("cx", x2[0]+halfWidth).attr("cy", x2[1]);
                drawArea.append("line")
                .attr("x1", x2[0]+halfWidth).attr("y1", x2[1])
                .attr("x2", x22[0]+halfWidth).attr("y2", x22[1])
                .attr("stroke", color).attr("stroke-width", BOLD_STROKE_WIDTH);

                color = Mk1.layer.getColor();
                drawArea.append("circle")
                .attr("r", POINT_SIZE).attr("fill", color)
                .attr("cx", x3[0]+halfWidth).attr("cy", x3[1]);
                drawArea.append("line")
                .attr("x1", x3[0]+halfWidth).attr("y1", x3[1])
                .attr("x2", x32[0]+halfWidth).attr("y2", x32[1])
                .attr("stroke", color).attr("stroke-width", BOLD_STROKE_WIDTH);

                if (!fastForward.checked) {await nextButton(); if(this.finished) {return;}}
            }
            if (!fastForward.checked) {
                // Put L0 and M1 back
                L0.LCanvas.transition().duration(moveTime)
                .attr("transform", "translate(0,0)");
                await new Promise(resolve => {setTimeout(() => resolve(), moveTime)});
                L1.MCanvas.transition().duration(moveTime)
                .attr("transform", "translate(0,0)");
                await new Promise(resolve => {setTimeout(() => resolve(), moveTime)});
            }
            this.tempCanvas.remove();
            L0.MCanvas.selectAll("line").attr("stroke-width", DEFAULT_STROKE_WIDTH);
        }
        this.tempCanvas.remove();
        this.preprocessingFinished = true;
    }

    /**
     * Query the onion structure to see which points are above the line ab
     * @param {list of [x, y]} P1 First point on the line
     * @param {list of [x, y]} P2 Second point on the line
     * @param {boolean} fastForward A checkbox DOM element. 
     * If checked, go through all of the preprocessing steps without waiting for user input
     */
    async query(P1, P2, fastForward) {
        const halfWidth = this.canvas.width/2;
        let resultCanvas = this.clearResultCanvas(); // Canvas for marking points above line
        let tempCanvas = this.clearTempCanvas();
        const Ps = this.canvas.getPoints();
        let layerIdx = 0;

        // Draw a copy of the Godzilla line on the right canvas
        resultCanvas.append("line")
        .attr("x1", P1[0]+halfWidth).attr("y1", P1[1])
        .attr("x2", P2[0]+halfWidth).attr("y2", P2[1])
        .attr("stroke", GODZILLA_COLOR)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");

        let layer = this.layers[layerIdx];
        // Find the closest slope in M0 to querySlope
        let idx = circularCWSearch(layer.MSegments, [P1, P2]);
        while (layerIdx < this.layers.length) {
            const MStr = "<b><span style=\"color:" + layer.getColor() + "\">M<SUB>"+layerIdx+"<SUB></span></b>";
            const LStr = "<b><span style=\"color:" + layer.getColor() + "\">L<SUB>"+layerIdx+"<SUB></span></b>";
            layer.MCanvas.attr("transform", "translate(" + halfWidth + ",0)");
            let drawArea = tempCanvas.append("g");
            layer = this.layers[layerIdx];
            let info = "";
            if (layerIdx == 0) {
                info = "First, do a circular binary search to find the point on <b><span style=\"color:" + this.layers[layerIdx].getColor() + "\">M<SUB>0<SUB></span></b> with the greatest slope less than or equal to the slope of the Godzilla line.  This takes <b>O(log N)</b> time for <b>N</b> overall points in the onion.";
                updateInfo(info);
            }
            else {
                info = "Find the point in " + MStr + " on either side of this point with the greatest slope not exceeding the slope of the query line.";
                info += " This point is guaranteed to have the greatest such slope in " + MStr + ".";
                if (layerIdx == 1) {
                    info += " <b>Note that, unlike the initial binary search, this is a constant time operation</b>";
                }
                updateInfo(info);
                let idxL = (idx-1+layer.M.length)%layer.M.length;
                let idxR = (idx+1)%layer.M.length;
                let segments = [layer.MSegments[idxL], layer.MSegments[idx], layer.MSegments[idxR]];
                idx = [idxL, idx, idxR][circularCWSearch(segments, [P1, P2])];
            }

            // Show the point that was found in Mi, along with its slope
            let a = layer.MSegments[idx][0];
            let b = layer.MSegments[idx][1];
            for (let dx = 0; dx <= halfWidth; dx += halfWidth) {
                let color = d3.rgb(layer.M[idx].layer.getColor());
                drawArea.append("circle")
                .attr("r", POINT_BOLD_SIZE).attr("fill", color)
                .attr("cx", a[0]+dx).attr("cy", a[1]);
                
                drawArea.append("line")
                .attr("x1", a[0]+dx).attr("y1", a[1])
                .attr("x2", b[0]+dx).attr("y2", b[1])
                .attr("stroke", color).attr("stroke-width", BOLD_STROKE_WIDTH);
            }
            if (!fastForward.checked) { await nextButton(); if(this.finished) {return;} }
            layer.MCanvas.attr("transform", "translate(0,0)");

            // Show the associated point in Li as well as the points next to it
            tempCanvas = this.clearTempCanvas();
            drawArea = tempCanvas.append("g");
            info = "Follow the pointer from this point on " + MStr + " to a point in " + LStr + ".";
            updateInfo(info);

            // Show the pointer from the point at Mi to the point on Li
            let Midx = layer.M[idx];
            a = Ps[Midx.layer.L[Midx.idx]];
            b = Ps[layer.L[Midx.LIdx]];

            drawArea.append("circle")
            .attr("r", POINT_BOLD_SIZE).attr("fill", d3.rgb(Midx.layer.getColor()))
            .attr("cx", a[0]).attr("cy", a[1]);
            drawArea.append("circle")
            .attr("r", POINT_BOLD_SIZE).attr("fill", d3.rgb(layer.getColor()))
            .attr("cx", b[0]).attr("cy", b[1]);
            drawArea.append("line")
            .attr("x1", a[0]).attr("y1", a[1])
            .attr("x2", b[0]).attr("y2", b[1])
            .attr("stroke", d3.rgb(0, 0, 0))
            .attr("stroke-dasharray", "5,5")
            if (!fastForward.checked) { await nextButton(); if(this.finished) {return;} }

            updateInfo("If any points on " + LStr + " are above the line, then the point at the tip of this line segment will be the furthest from the line.");
            let lidxAbove = (Midx.LIdx+1)%layer.L.length;
            let P = Ps[layer.L[lidxAbove]];
            drawArea.append("rect")
            .attr("x", P[0]-POINT_BOLD_SIZE).attr("y", P[1]-POINT_BOLD_SIZE)
            .attr("width", POINT_BOLD_SIZE*2)
            .attr("height", POINT_BOLD_SIZE*2)
            .attr("fill", layer.getColor())
            .attr("stroke", d3.rgb(0, 0, 0));
            drawArea.append("line")
            .attr("x1", P[0]).attr("y1", P[1])
            .attr("x2", b[0]).attr("y2", b[1])
            .attr("stroke", d3.rgb(layer.getColor())).attr("stroke-width", BOLD_STROKE_WIDTH);

            if (!fastForward.checked) { await nextButton(); if(this.finished) {return;} }

            // Check to see if this point is actually above the line
            if (!isAboveLine(P1, P2, P)) {
                updateInfo("This point is not above the line, so no points on " + LStr + " are above the line, and we're finished!");
                layerIdx = this.layers.length;
                this.clearTempCanvas();
                await nextButton(); if(this.finished) {
                    layer.MCanvas.attr("transform", "translate(0,0)");
                    return;
                }
            }
            else {
                updateInfo("This point is indeed above the line, so move on either side of it, marking off each point as above the line, until we reach the boundaries.");
                tempCanvas = this.clearTempCanvas();
                drawArea = tempCanvas.append("g");
    
                let isAbove = true;
                let start = lidxAbove;
                let dir = 1;
                let touched = layer.L.map(() => false);
                while (isAbove && !touched[lidxAbove]) {
                    touched[lidxAbove] = true;
                    resultCanvas.append("rect")
                    .attr("x", P[0]-POINT_BOLD_SIZE).attr("y", P[1]-POINT_BOLD_SIZE)
                    .attr("width", POINT_BOLD_SIZE*2)
                    .attr("height", POINT_BOLD_SIZE*2)
                    .attr("fill", layer.getColor())
                    .attr("stroke", d3.rgb(0, 0, 0));
    
                    
                    if (!fastForward.checked) { await nextButton(); if(this.finished) {return;} }
                    lidxAbove = (lidxAbove+dir+layer.L.length)%layer.L.length;
                    P = Ps[layer.L[lidxAbove]];
                    isAbove = isAboveLine(P1, P2, P);
                    if (!isAbove && dir == 1) {
                        dir = -1;
                        lidxAbove = (start+dir+layer.L.length)%layer.L.length;
                        P = Ps[layer.L[lidxAbove]];
                        isAbove = isAboveLine(P1, P2, P);
                    }
                }
    
                
                // Show the pointer from Midx to the point on the next M
                if (layerIdx < this.layers.length-1) {
                    updateInfo("Follow the pointer from this point on <b><span style=\"color:" + layer.getColor() + "\">M<SUB>"+layerIdx+"<SUB></span></b> to the point on <b><span style=\"color:" + this.layers[layerIdx+1].getColor() + "\">M<SUB>"+(layerIdx+1)+"<SUB></span></b> to move to the next layer.");
    
                    tempCanvas = this.clearTempCanvas();
                    let drawArea = tempCanvas.append("g");
    
                    a = Ps[Midx.layer.L[Midx.idx]];
                    drawArea.append("circle")
                    .attr("r", POINT_BOLD_SIZE).attr("fill", Midx.layer.getColor())
                    .attr("cx", a[0]).attr("cy", a[1]);
    
                    layer = this.layers[layerIdx+1];
                    idx = Midx.MIdx;
                    Midx = layer.M[idx];
                    b = Ps[Midx.layer.L[Midx.idx]];
                    drawArea.append("circle")
                    .attr("r", POINT_BOLD_SIZE).attr("fill", Midx.layer.getColor())
                    .attr("cx", b[0]).attr("cy", b[1]);
    
                    drawArea.append("line")
                    .attr("x1", a[0]).attr("y1", a[1])
                    .attr("x2", b[0]).attr("y2", b[1])
                    .attr("stroke", d3.rgb(0, 0, 0))
                    .attr("stroke-dasharray", "5,5");
                    if (!fastForward.checked) { await nextButton(); if(this.finished) {return;} }
                }
                else {
                    updateInfo("This is the last layer, so we're finished!");
                    await nextButton(); if(this.finished) {return;}
                }
                layerIdx++;
            }
        }

        document.getElementById("animButton").innerHTML = "Select Another Query Line";
        if (!fastForward.checked) { await nextButton(); if(this.finished) {return;} }
        resultCanvas.remove();
    }

    /**
     * Clear all of the data and set this to be finished
     */
    clear() {
        this.finished = true;
        for (let i = 0; i < this.layers.length; i++) {
            this.layers[i].clear();
        }
        this.layers = [];
        this.tempCanvas.remove();
        this.resultCanvas.remove();
    }
}