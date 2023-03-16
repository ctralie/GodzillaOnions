GODZILLA_COLOR = d3.rgb(0, 180, 50);

/**
 * Extract the points from an SVG collection
 * @param {svg element} svgCollection 
 * @return A 2d array of the form [[x1, y1], [x2, y2], ...] 
 */
function getSVGPoints(svgCollection) {
	let P = [];
	svgCollection.selectAll("circle").each(function() {
		let sel = d3.select(this);
		const x = parseFloat(sel.attr("cx"));
		const y = parseFloat(sel.attr("cy"))
		P.push([x, y]);
	});
	return P;
}

class Canvas2D {
	constructor() {
		const container = document.getElementById("Canvas2DContainer");
		// Fix the width and height up front
		this.width = window.innerWidth * 0.9;
		this.height = window.innerHeight * 0.75;
		document.getElementById("info").width = this.width;
		this.container = container;
		this.canvas = d3.select("#Canvas2DContainer")
		.append("svg")
		.attr("width", this.width)
		.attr("height", this.height)
		.attr("style", "border-style: dotted;");
		this.canvas.on("mousedown", this.mouseDown.bind(this));
		this.container.obj = this;

		// Clear all graph elements if any exist
		this.canvas.selectAll("*").remove();
		this.frozen = false;
		this.lineFrozen = false;
		this.selectingLine = false; // If true, selecting Godzilla line
		this.clear();
	}

	/**
	  * Return a list of points as a 2D array
	  * @return A 2d array of the form [[x1, y1], [x2, y2], ...]
	  */
	getPoints() {
		return getSVGPoints(this.linesPointsCollection);
	}

	/**
	 * Extract the two points on the Godzilla line
	 * @return A 2d array of the form [[x1, y1], [x2, y2], ...]
	 */
	getGodzillaLine() {
		return getSVGPoints(this.godzillaLineCollection);
	}

	clearGodzillaLine() {
		if (!(this.godzillaLineCollection === undefined)) {
			this.godzillaLineCollection.remove();
		}
		this.godzillaLineCollection = this.canvas.append("g").attr("class", "GodzillaLine");
	}

	updateGodzillaLine() {
		let Ps = this.getGodzillaLine();
		this.godzillaLineCollection.selectAll("line").each(function(){
			let sel = d3.select(this);
			sel.remove();
		});
		if (Ps.length == 2) {
			// Draw a line between the points that goes from one
			// side of the canvas to the other
			const a = Ps[0];
			const b = Ps[1];
			let vx = b[0] - a[0];
			let vy = b[1] - a[1];
			const w = this.width/2;
			let P1 = [0, a[1]+vy*(-a[0])/vx];
			let P2 = [w, a[1]+vy*(w-a[0])/vx];
			

			this.godzillaLineCollection.append("line")
			.attr("x1", P1[0]).attr("y1", P1[1]).attr("x2", P2[0]).attr("y2", P2[1])
			.attr("stroke", GODZILLA_COLOR)
			.attr("stroke-width", 2)
			.attr("stroke-dasharray", "5,5");
			
			let mag = Math.sqrt(vx*vx + vy*vy);
			vx = vx*50/mag;
			vy = vy*50/mag;
			this.godzillaLineCollection.append("line")
			.attr("x1", a[0]).attr("y1", a[1]).attr("x2", a[0]-vy).attr("y2", a[1]+vx)
			.attr("stroke", GODZILLA_COLOR)
			.attr("stroke-width", 2)
			.attr("stroke-dasharray", "5,5");
		}
	}

	/**
	 * 
	 * @param {float} x1 x position of first endpoint
	 * @param {float} y1 y position of first endpoint
	 * @param {float} x2 x position of second endpoint
	 * @param {float} y2 y position of second endpoint
	 * @param {array} color [r, g, b] color spec 
	 * @param {float} width Width of line
	 */
	drawLine(x1, y1, x2, y2, color, width) {
		if (color === undefined) {
			color = [0, 0, 0];
		}
		if (width === undefined) {
			width = 2;
		}
		this.linesPointsCollection.append("line")
		.attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2)
		.attr("stroke", d3.rgb(color[0], color[1], color[2]))
		.attr("stroke-width", width);
		
	}

	/**
	 * Remove all of the points and lines from the canvas
	 */
	clear() {
		if (!(this.linesPointsCollection === undefined)) {
			this.linesPointsCollection.remove();
		}
		this.linesPointsCollection = this.canvas.append("g").attr("class", "UserSelection");
		if (!(this.godzillaLineCollection === undefined)) {
			this.godzillaLineCollection.remove();
		}
		this.godzillaLineCollection = this.canvas.append("g").attr("class", "GodzillaLine");

		// Draw vertical line separating the selection area on the left
		// from the animation area on the right
		this.drawLine(this.width/2, 0, this.width/2, this.height);
	}

	/**
	 * Remove a particular point from the canvas
	 */
	removeNode() {
		d3.select(this).remove();
	}

	addPoint(point) {
		if (point[0] < this.width/2) {
			let color = d3.rgb(0, 0, 0);
			let collection = this.linesPointsCollection;
			let drag = this.dragNode;
			if (this.selectingLine) {
				collection = this.godzillaLineCollection;
				color = GODZILLA_COLOR;
				drag = this.dragLineNode;
			}
			collection.append("circle")
				.attr("r", 5)
				.attr("fill", color)
				.attr("cx", point[0]).attr("cy", point[1])
				.call(d3.drag().on("drag", drag))
				.on("dblclick", this.removeNode);
			if (this.selectingLine) {
				let selection = this.godzillaLineCollection.selectAll("circle");
				let N = selection.size();
				if (N > 2) {
					selection.each(function(x, i) {
						if (i < N-2) {
							d3.select(this).remove();
						}
					});
				}
				this.updateGodzillaLine();
			}
		}
	}

	/**
	 * React to a mouse down event by adding a node
	 */
	mouseDown() {
		if (!this.frozen || (this.selectingLine && !this.lineFrozen)) {
			let point = d3.mouse(d3.event.currentTarget);
			this.addPoint(point);
		}
	}

	/** A callback function to handle dragging on a node */
	dragNode() {
		if (!this.frozen) {
			d3.select(this).attr("cx", d3.event.x);
			d3.select(this).attr("cy", d3.event.y);
		}
	}

	dragLineNode() {
		if (!this.parentNode.parentNode.parentNode.obj.lineFrozen) {
			d3.select(this).attr("cx", d3.event.x);
			d3.select(this).attr("cy", d3.event.y);
			this.parentNode.parentNode.parentNode.obj.updateGodzillaLine();
		}
	}

	/**
	 * A function which toggles all of the visible elements to show
	 */
	show = function() {
		this.container.style("display", "block");
	}

	/**
	 * A function which toggles all of the visible elements to hide
	 */
	hide = function() {
		this.container.style("display", "none");
	}

	/**
	 * Freeze any display changes
	 */
	freeze() {
		this.frozen = true;
	}

	/**
	 * Re-enable display changes if they were disabled
	 */
	unfreeze() {
		this.frozen = false;
	}

	freezeLineSelection() {
		this.lineFrozen = true;
	}

	unfreezeLineSelection() {
		this.lineFrozen = false;
	}
}
