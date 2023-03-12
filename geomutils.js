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
    constructor(canvas, idx, N, Ps, L) {
        this.canvas = canvas;
        this.Ps = Ps;
        this.idx = idx;
        this.N = N;
        this.L = L;
        this.initPointsLines();
        this.drawL();
    }

    initPointsLines() {
        const canvas = this.canvas.canvas;
        this.LPoints = canvas.append("g").attr("class", "points");
        this.LLines = canvas.append("g").attr("class", "lines");
        this.MPoints = canvas.append("g").attr("class", "points");
        this.MLines = canvas.append("g").attr("class", "lines");
    }

    drawL() {
        const interpolate = d3[`interpolateOrRd`];
        const color = d3.rgb(interpolate((this.idx+1)/(this.N)));
        
        for (let i = 0; i < this.L.length; i++) {
            let point = this.Ps[this.L[i]];
            this.LPoints.append("circle")
            .attr("r", 5)
            .attr("fill", color)
            .attr("cx", point[0])
            .attr("cy", point[1]);
        }

        for (let i = 0; i < this.L.length; i++) {
            const P1 = this.Ps[this.L[i]];
            const P2 = this.Ps[(this.L[(i+1)%this.L.length])];
            this.LLines.append("line")
            .attr("x1", P1[0])
            .attr("y1", P1[1])
            .attr("x2", P2[0])
            .attr("y2", P2[1])
            .attr("stroke", color)
            .attr("stroke-width", 1);
        }
    }

    clear() {
        this.LPoints.remove();
        this.LLines.remove();
        this.MPoints.remove();
        this.MLines.remove();
        this.initPointsLines();
    }
}

class OnionsAnimation {
    /**
     * 
     * @param {Canvas2D} canvas Canvas to which to draw points/lines
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.layers = [];
    }

    makeOnions() {
        // Step 1: Setup the onion layers
        this.canvas.freeze();
        let layersIdxs = getOnions(this.canvas.getPoints());
        this.layers = [];
        let Ps = this.canvas.getPoints();
        for (let i = 0; i < layersIdxs.length; i++) {
            let layer = new OnionLayer(this.canvas, i, layersIdxs.length, Ps, layersIdxs[i]);
            this.layers.push(layer);
        }

        // Step 2: Setup the M layers from the inside out
        // @attribute {list of (OnionLayer pointer, int)} M
        if (this.layers.length > 0) {
            const inner = this.layers[this.layers.length-1];
            let M = inner.L.map((_, i)=>[inner, i]);
            console.log(inner.L);
            console.log(M);
        }

    }

    clear() {
        for (let i = 0; i < this.layers.length; i++) {
            this.layers[i].clear();
        }
        this.layers = [];
    }
}