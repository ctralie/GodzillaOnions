class Canvas2D {
	constructor() {
		const container = document.getElementById("Canvas2DContainer");
		// Fix the width and height up front
		this.width = window.innerWidth * 0.9;
		this.height = window.innerHeight * 0.7;
		document.getElementById("info").width = this.width;
		this.container = container;
		this.canvas = d3.select("#Canvas2DContainer")
		.append("svg")
		.attr("width", this.width)
		.attr("height", this.height)
		.attr("style", "border-style: dotted;");
		this.canvas.on("mousedown", this.mouseDown.bind(this));

		// Clear all graph elements if any exist
		this.canvas.selectAll("*").remove();
		this.frozen = false;
		this.clear();

		this.canvas.call(d3.zoom()
			.scaleExtent([1/4, 8])
			.on("zoom", this.zoomed.bind(this))
			.filter(function () {
				return d3.event.ctrlKey;
		}));
	}

	/**
	  * Return a list of points as a 2D array
	  * @return A 2d array of the form [[x1, y1], [x2, y2], ...]
	  */
	getPoints() {
		return this.points;
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
		this.points = [];
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

	/**
	 * React to a mouse down event by adding a node
	 */
	mouseDown() {
		if (!this.frozen) {
			let point = d3.mouse(d3.event.currentTarget);
			if (point[0] < this.width/2) {
				this.points.push(point);
				this.linesPointsCollection.append("circle")
					.attr("r", 5)
					.attr("fill", d3.rgb(0, 0, 0))
					.attr("cx", point[0]).attr("cy", point[1])
					.call(d3.drag().on("drag", this.dragNode))
					.on("dblclick", this.removeNode)
			}
		}
	}

	/** A callback function to handle dragging on a node */
	dragNode() {
		if (!this.frozen) {
			d3.select(this).attr("cx", d3.event.x);
			d3.select(this).attr("cy", d3.event.y);
		}
	}

	/** A callback function to handle zooming/panning */
	zoomed() {
		if (!this.frozen) {
			this.points.attr("transform", d3.event.transform);
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
}
