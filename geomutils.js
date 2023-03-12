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
        let buttons = ["onionsButton", "clearPoints", "selectPoints"];
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
    while (layer.length > 3) {
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



//////////////////////////////////////////////////////////
//////////////       Onions Code      ////////////////////
//////////////////////////////////////////////////////////

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
        this.L = L;
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
        this.LPoints = []; // Quick lookup of drawn points
        this.LLines = []; // Quick lookup of drawn lines
        this.MCanvas = canvas.append("g").attr("class", "M"+this.idx);
        this.MPoints = [];
        this.MLines = [];
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
            const drawnPoint = this.LCanvas.append("circle")
            .attr("r", 5).attr("fill", color)
            .attr("cx", point[0]).attr("cy", point[1]);
            this.LPoints.push(drawnPoint);
        }

        for (let i = 0; i < this.L.length; i++) {
            const P1 = this.Ps[this.L[i]];
            const P2 = this.Ps[(this.L[(i+1)%this.L.length])];
            const drawnLine = this.LCanvas.append("line")
            .attr("x1", P1[0]).attr("y1", P1[1])
            .attr("x2", P2[0]).attr("y2", P2[1])
            .attr("stroke", color).attr("stroke-width", 1);
            this.LLines.push(drawnLine);
        }
    }

    /**
     * Add and draw the corresponding M list for this layer
     * 
     * @param {[[OnionLayer, int], int, int]} M
     * [OnionLayer, int]: The layer and index that this point actually comes from
     * int: The index in this M of searching for the point
     * int: The index in M+1 of searching for the point
     * 
     */
    addM(M) {
        this.M = M;
        for (let i = 0; i < M.length; i++) {
            const layer = M[i][0];
            const idx = M[i][1];
            let point = this.Ps[layer.L[idx]];
            const color = d3.rgb(this.colorInterpolator((layer.idx+1)/(this.N)));
            const drawnPoint = this.MCanvas.append("circle")
            .attr("r", 5).attr("fill", color)
            .attr("cx", point[0]).attr("cy", point[1]);
            this.MPoints.push(drawnPoint);
        }

        for (let i = 0; i < this.M.length; i++) {
            const layer = M[i][0];
            const idx = M[i][1];
            const P1 = this.Ps[layer.L[idx]];
            const P2 = this.Ps[(layer.L[(idx+1)%layer.L.length])];
            const color = d3.rgb(this.colorInterpolator((layer.idx+1)/(this.N)));
            const line = this.MLines.append("line")
            .attr("x1", P1[0]).attr("y1", P1[1])
            .attr("x2", P2[0]).attr("y2", P2[1])
            .attr("stroke", color).attr("stroke-width", 1);
            this.MLines.push(line);
        }
    }
}

/**
 * Merge every other element of an M list with the 
 * elements of an L list, sorted by slope
 * @param {[[OnionLayer, int], int, int]} M M of the last layer
 * @param {list of int} L Indices into Ps of a layer
 * @param {list of [x, y]} Ps Coordinates of points
 */
function mergeBySlope(M, L, Ps) {
    // Step 1: Replace M with every other element of M
    M = M.filter((_, i) => i%2 == 0);
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
    }

    async makeOnions() {
        // Step 1: Setup the onion layers
        this.canvas.freeze();
        updateInfo("Okay let's do it!  The first step is to compute each layer of the onion by computing the convex hulls from the outside to the inside.");
        await nextButton(); if(this.finished) {return;}
        let layersIdxs = getOnions(this.canvas.getPoints());
        this.layers = [];
        let Ps = this.canvas.getPoints();
        for (let i = 0; i < layersIdxs.length; i++) {
            let layer = new OnionLayer(this.canvas, i, layersIdxs.length, Ps, layersIdxs[i]);
            this.layers.push(layer);
            let info = "Here's layer <b><span style=\"color:" + layer.getColor() + "\">";
            info += "L<SUB>" + i + "<SUB></span></b>";
            updateInfo(info);
            await nextButton(); if(this.finished) {return;}
        }

        // Step 2: Setup the M layers from the inside out
        updateInfo("Now we need to compute the \"helper layers\" <b>M<SUB>i</SUB></b> for each layer.  This is where <a href = \"https://en.wikipedia.org/wiki/Fractional_cascading\">fractional cascading</a> comes in; each helper layer <b>M<SUB>i</SUB></b> will be a merging of the layer <b>L<SUB>i</b> and <i>every other element</i> of <b>M<SUB>i-1</SUB></b>, sorted by slope");
        if (this.layers.length > 0) {
            let idx = this.layers.length-1;
            const inner = this.layers[idx];
            let M = inner.L.map((_, i)=>[[inner, i], i, 0]);
            let lastM = M;
            while (idx > 0) {
                idx--;
                // Take every other element from lastM and merge with
                // the points at this layer.  Then sort by slope
            }
        }

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
    }
}