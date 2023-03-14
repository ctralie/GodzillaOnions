const DEFAULT_STROKE_WIDTH = 1;

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
function getSlope(Ps, L, idx) {
    const P1 = Ps[L[idx]];
    const P2 = Ps[(L[(idx+1)%L.length])];
    let diff = [P1[0]-P2[0], P2[1]-P1[1]];
    let ret = Math.atan2(diff[1], diff[0]);
    if (ret < 0) {
        ret = ret + 2*Math.PI; // Keep in the range [0, 2*pi]
    }
    return ret;
}


//////////////////////////////////////////////////////////
//////////////       Onions Code      ////////////////////
//////////////////////////////////////////////////////////

/**
 * A helper method for drawing M layers
 * @param {OnionLayer} layer The L layer this is associated to
 * @param {} M The M layer
 * @param {svg element} drawArea The area to which to draw this M
 */
function drawM(layer, M, drawArea) {
    const Ps = layer.Ps;
    const N = layer.N;
    for (let i = 0; i < M.length; i++) {
        const layer = M[i][0][0];
        const idx = M[i][0][1];
        let point = Ps[layer.L[idx]];
        const color = d3.rgb(layer.getColor());
        drawArea.append("circle")
        .attr("r", 5).attr("fill", color)
        .attr("cx", point[0]).attr("cy", point[1]);
    }

    for (let i = 0; i < M.length; i++) {
        const layer = M[i][0][0];
        const idx = M[i][0][1];
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
        // Sort L with getSlope(Ps, L, idx)
        let LSlopes = L.map((idx, i) => {
            return {"idx":idx, "slope":getSlope(Ps, L, i)};
        });
        LSlopes.sort((a, b)=> a.slope - b.slope);
        this.L = LSlopes.map(v => v.idx);
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
            .attr("r", 5).attr("fill", color)
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
     * @param {[[OnionLayer, int], int, int]} M
     * [OnionLayer, int]: The layer and index that this point actually comes from
     * int: The index in this L of searching for the point
     * int: The index in M+1 of searching for the point
     * 
     */
    setM(M) {
        this.M = M;
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
function binarysearch(arr, target) {
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
    }

    clearTempCanvas() {
        this.tempCanvas.remove();
        this.tempCanvas = this.canvas.canvas.append("g");
        return this.tempCanvas;
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
            await nextButton(); if(this.finished) {return;}

            // Step 2a: Setup the first M layer
            let idx = this.layers.length-1;

            let info = "The innermost layer gets copied as is; that is, ";
            info += "<b><span style=\"color:" + this.layers[idx].getColor() + "\">M<SUB>" + idx + "<SUB></span></b> = ";
            info += "<b><span style=\"color:" + this.layers[idx].getColor() + "\">L<SUB>" + idx + "<SUB></span></b>.";
            updateInfo(info);
            
            const moveTime = 1000;
            const inner = this.layers[idx];
            let M = inner.L.map((_, i)=>[[inner, i], i, 0]);
            this.layers[idx].setM(M);

            // Pull this M out to look at it
            this.layers[idx].MCanvas.transition().duration(moveTime)
            .attr("transform", "translate(" + this.canvas.width/2 + ",0)");
            await nextButton(); if(this.finished) {return;}
            // Put this M back
            this.layers[idx].MCanvas.transition().duration(moveTime)
            .attr("transform", "translate(0,0)");
            await new Promise(resolve => {setTimeout(() => resolve(), moveTime)});

            let lastM = M;
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
                this.layers[idx].LCanvas.selectAll("line").attr("stroke-width", 4);
                this.layers[idx+1].MCanvas.selectAll("line").attr("stroke-width", 4);
                await nextButton(); if(this.finished) {return;}
                
                // Take every other element from M_{i+1} and merge with L_i
                let M = this.layers[idx].L.map((_, i)=>[[this.layers[idx], i], i, 0]);
                for (let k = 0; k < lastM.length; k += 2) {
                    M.push([lastM[k][0], M.length, k]);
                }
                // Now sort by slope
                //getSlope(Ps, L, idx)
                M = M.map(v => {return {"v":v, "slope":getSlope(Ps, v[0][0].L, v[0][1])}});
                console.log(M);
                M.sort((a, b)=> a.slope - b.slope);
                M = M.map(v => v.v);
                // Update indices into L_i and M_{i+1}
                
                
                // Show each sorted line segment flying over one by one
                let tempCanvas = this.clearTempCanvas();
                for (let k = 0; k < M.length; k++) {
                    let drawArea = tempCanvas.append("g");

                    const layer = M[k][0][0];
                    const idx = M[k][0][1];
                    const P1 = Ps[layer.L[idx]];
                    const P2 = Ps[(layer.L[(idx+1)%layer.L.length])];
                    let color = d3.rgb(layer.getColor());

                    drawArea.append("circle")
                    .attr("r", 5).attr("fill", color)
                    .attr("cx", P1[0]).attr("cy", P1[1]);

                    drawArea.append("line")
                    .attr("x1", P1[0]).attr("y1", P1[1])
                    .attr("x2", P2[0]).attr("y2", P2[1])
                    .attr("stroke", color).attr("stroke-width", DEFAULT_STROKE_WIDTH);

                    drawArea.transition().duration(moveTime/2)
                    .attr("transform", "translate(" + this.canvas.width/2 + ",0)");
                    await new Promise(resolve => {setTimeout(() => resolve(), moveTime/2)});

                }
                await nextButton(); if(this.finished) {return;}
                tempCanvas.transition().duration(moveTime)
                .attr("transform", "translate("+-this.canvas.width/2 + ",0)");
                await new Promise(resolve => {setTimeout(() => resolve(), moveTime)});
                tempCanvas.remove();

                this.layers[idx].setM(M);
                // Unbold Li and M_{i+1}
                this.layers[idx].LCanvas.selectAll("line").attr("stroke-width", DEFAULT_STROKE_WIDTH);
                this.layers[idx+1].MCanvas.selectAll("line").attr("stroke-width", DEFAULT_STROKE_WIDTH);

                lastM = M;
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
        this.tempCanvas.remove();
    }
}