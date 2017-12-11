/* jshint esversion: 6 */

/////////////////////////////////////////////////////////////////
//// Initial Set Up /////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
// Global variables
let zoomedScale, // Track the zoom scale for adjusting county border stroke-width
		currentYear = 2016, // Track current year for slider
		playing = false, // Track map animation
		timer, // Track map animation
		tooltipCounty; // Track the countypolygon where tooltip is on
const mousemoveEvent = new Event("mousemove"); // Manually trigger mousemover event to update tooltip when anmiation is playing

const width = 960,
			height = 600;

const path = d3.geoPath();

const zoom = d3.zoom()
	.scaleExtent([1, 8])
	.on("zoom", zoomed);

/////////////////////////////////////////////////////////////////
// Scales

// X scale for legend
const x = d3.scaleLinear()
		.domain([1, 15])
		.rangeRound([600, 860]);

// Color scale for legend and map
const thresholds = d3.range(3, 14, 2);
const color = d3.scaleThreshold()
		.domain(thresholds)
		.range(d3.schemeBlues[thresholds.length + 1]);

// X scale for slider
const t = d3.scaleLinear()
		.domain([2010, 2016])
		.rangeRound([600, 860])
		.clamp(true);

/////////////////////////////////////////////////////////////////
// SVG containers

const svg = d3.select("body")
	.append("svg")
		.attr("width", width)
		.attr("height", height);

// Background rect to collect pointer events
svg.append("rect")
		.attr("class", "background")
		.attr("width", width)
		.attr("height", height)
		.on("click", reset);

// Map container for zoom
const map = svg.append("g")
		.attr("class", "map");

// Tooltip
const tooltip = d3.select("body")
		.append("div")
		.attr("id", "tooltip");

// Statetitle (for after zooming in)
svg.append("g")
		.attr("transform", "translate(40, 60)")
	.append("text")
		.attr("id", "statetitle")
		.attr("x", 0)
		.attr("y", 0)
		.attr("text-anchor", "start");

/////////////////////////////////////////////////////////////////
//// Draw Legend ////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
const legend = svg.append("g")
		.attr("class", "key")
		.attr("transform", "translate(0, 60)");

legend.selectAll("rect")
		.data(color.range().map(d => {
			d = color.invertExtent(d);
			if (d[0] === undefined) d[0] = x.domain()[0];
			if (d[1] === undefined) d[1] = x.domain()[1];
			return d;
		}))
		.enter().append("rect")
			.attr("x", d => x(d[0]))
			.attr("height", 8)
			.attr("width", d => x(d[1]) - x(d[0]))
			.attr("fill", d => color(d[0]));

legend.append("text")
		.attr("class", "caption")
		.attr("x", x.range()[0])
		.attr("y", -6)
		.text("Unemployment rate");

const xAxis = d3.axisBottom(x)
		.tickSize(13)
		.tickFormat((x, i) => i ? x : x + "%")
		.tickValues(color.domain());

legend.call(xAxis)
	.select(".domain")
		.remove();

/////////////////////////////////////////////////////////////////
//// Draw Slider ////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////

const slider = svg.append("g")
		.attr("class", "slider")
		.attr("transform", "translate(0, 20)");

slider.append("rect")
		.attr("class", "track")
		.attr("x", t.range()[0])
		.attr("height", 8)
		.attr("width", t.range()[1] - t.range()[0])
	.select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
		.attr("class", "track-overlay")
		.call(d3.drag()
			.on("start drag", dragging)
			.on("end", updateMap));

slider.insert("text", ".track-overlay")
		.attr("class", "caption")
		.attr("x", t.range()[0])
		.attr("y", -6)
		.text("Year");

const tAxis = d3.axisBottom(t)
		.tickSize(13)
		.tickFormat(d3.format("d"))
		.tickValues(d3.range(2010, 2017));

slider.insert("g", ".track-overlay")
		.call(tAxis)
	.select(".domain")
		.remove();

const handle = slider.insert("circle", ".track-overlay")
		.attr("class", "handle")
		.attr("cx", t(currentYear))
		.attr("cy", 4)
		.attr("r", 8);

/////////////////////////////////////////////////////////////////
//// Load And Process Data //////////////////////////////////////
/////////////////////////////////////////////////////////////////
d3.queue()
		.defer(d3.json, "https://d3js.org/us-10m.v1.json")
		.defer(d3.json, "../data/stateid2statename.json")
		.defer(d3.json, "../data/unemployment.json")
		.await(processData);

function processData(error, us, stateid2statename, unemployment) {
	if (error) throw error;

	id2state = stateid2statename;

	const countiesGeo = us.objects.counties.geometries; // Store path in variable for ease
	const statesGeo = us.objects.states.geometries;

	// Add statename to statesGeo
	for (const i in stateid2statename) { // Loop through stateid2statename stateids
		for (const j in statesGeo) { // Loop through statesGeo
			if (stateid2statename[i].stateid === statesGeo[j].id) { // If ids match
				statesGeo[j].properties = {};
				statesGeo[j].properties.statename = stateid2statename[i].statename; // Add name property to statesGeo
				break; // Stop looping through statesGeo since match has been made
			}
		}
	}

	// Add unemployment rates and countyname to countiesGeo
	for (const i in unemployment) { // Loop through unemployment countyid
		for (const j in countiesGeo) { // Loop through countiesGeo
			if (unemployment[i].countyid === countiesGeo[j].id) { // If ids match
				countiesGeo[j].properties = {};
				for (const k in unemployment[i]) {
					if (k !== "countyid") { // No need to add countyid
						countiesGeo[j].properties[k] = unemployment[i][k];
					}
				}
				break;
			}
		}
	}

	drawMap(us);
}

/////////////////////////////////////////////////////////////////
//// Draw Map And Data Binding //////////////////////////////////
/////////////////////////////////////////////////////////////////
function drawMap(us) {

	// Counties
	// Countypolygons
	map.append("g")
			.attr("id", "counties-container")
			.style("pointer-events", "none")
		.selectAll("path")
		.data(topojson.feature(us, us.objects.counties).features)
		.enter().append("path")
			.attr("class", d => "countypolygons states-" + d.id.slice(0, 2))
			.attr("fill", d => color(d.properties[currentYear]))
			.attr("d", path)
			.attr("stroke-width", 0) // No county borders when zommed out
			.on("mouseover", showTooltip)
			.on("mousemove", moveTooltip)
			.on("mouseout", hideTooltip)
			.on("click", reset);

	///////////////////////////////////////////////////////////////

	// States
	const states = map.append("g")
			.attr("id", "states-container");
	// Statepolygons
	states.selectAll("path")
		.data(topojson.feature(us, us.objects.states).features)
		.enter().append("path")
			.attr("class", d => "statepolygons states-" + d.id)
			.attr("d", path)
			.attr("opacity", 0)
			.on("mouseover", mouseover)
			.on("mouseout", mouseout)
			.on("click", clicked);

	// Stateborders
	states.append("path")
		.datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
			.attr("id", "stateborders")
			.attr("d", path);

	// Statenames (for hover effect)
	const statenames = states.append("g")
			.attr("id", "statenames-container")
		.selectAll("path")
		.data(topojson.feature(us, us.objects.states).features)
		.enter();
	statenames.append("text")
			.attr("class", d => "statenames-bg states-" + d.id)
			.text(d => d.properties.statename)
			.attr("x", d => path.centroid(d)[0])
			.attr("y", d => path.centroid(d)[1])
			.attr("opacity", 0)
			.attr("text-anchor", "middle");
	statenames.append("text")
			.attr("class", d => "statenames states-" + d.id)
			.text(d => d.properties.statename)
			.attr("x", d => path.centroid(d)[0])
			.attr("y", d => path.centroid(d)[1])
			.attr("opacity", 0)
			.attr("text-anchor", "middle");
}

/////////////////////////////////////////////////////////////////
//// Event Listeners ////////////////////////////////////////////
/////////////////////////////////////////////////////////////////

// When click a state, zoom to state level
function clicked(d) {
	const stateid = d.id;
	const statename = d.properties.statename;
	const stateClass = ".states-" + stateid;

	const bounds = path.bounds(d),
				dx = bounds[1][0] - bounds[0][0],
				dy = bounds[1][1] - bounds[0][1],
				x = (bounds[0][0] + bounds[1][0]) / 2,
				y = (bounds[0][1] + bounds[1][1]) / 2,
				maxZoomHeight = height - 100,
				scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / maxZoomHeight))),
				translate = [width / 2 - scale * x, maxZoomHeight / 2 - scale * y + 100];

	svg.transition()
			.duration(750)
			.call(zoom.transform,
						d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale))
			.on("start", () => {
				// Hide statenames
				d3.select("#statenames-container")
						.style("display", "none");
				// Hide statepolygons
				d3.selectAll(".statepolygons")
						.style("display", "none");
			})
			.on("end", () => {
				// Hide stateborders
				d3.select("#stateborders")
						.style("display", "none");
				// Hide countypolygons except ones in selected state
				d3.selectAll(".countypolygons")
						.style("display", "none");
				d3.selectAll(".countypolygons" + stateClass)
						.style("display", "inline");

				// Show county borders when zoomed in
				d3.selectAll(".countypolygons")
					.transition()
						.duration(500)
						.attr("stroke-width", 1 / zoomedScale);

				// Enable counties pointer-events to show tooltip
				d3.select("#counties-container")
						.style("pointer-events", "all");

				// Show statetitle
				d3.select("#statetitle")
						.style("display", "inline")
						.text(statename);
			});
}

/////////////////////////////////////////////////////////////////

// Reset zoom when click background or countypolygons
function reset() {

	svg.transition()
			.duration(750)
			.call(zoom.transform, d3.zoomIdentity)
			.on("start", () => {
				// Hide county borders
				d3.selectAll(".countypolygons")
					.transition()
						.attr("stroke-width", 0);

				// Disable counties pointer-events to hide tooltip
				d3.select("#counties-container")
						.style("pointer-events", "none");

				// Hide statetitle
				d3.select("#statetitle")
							.style("display", "none");

				// Show stateborders
				d3.select("#stateborders")
						.style("display", "inline");
				// Show countypolygons
				d3.selectAll(".countypolygons")
						.style("display", "inline");
			})
			.on("end", () => {
				// Show statepolygons
				d3.selectAll(".statepolygons")
						.style("display", "inline");
				// Show statenames
				d3.selectAll(".statenames")
						.style("opacity", 0);
				d3.selectAll(".statenames-bg")
						.style("opacity", 0);
				d3.select("#statenames-container")
						.style("display", "inline");
			});
}

/////////////////////////////////////////////////////////////////

// Mouse hover effects
// Color state and show state name when mouseover
function mouseover() {
	const stateClass = "." + d3.select(this).attr("class").split(" ").pop();
	d3.selectAll("#states-container " + stateClass)
		.transition()
			.style("opacity", 0.8);
}
// Hide state color and state name when mouseout
function mouseout() {
	const stateClass = "." + d3.select(this).attr("class").split(" ").pop();
	d3.selectAll("#states-container " + stateClass)
		.transition()
			.style("opacity", 0);
}

/////////////////////////////////////////////////////////////////

// Zoom
function zoomed() {
	map.attr("transform", d3.event.transform);
	zoomedScale = d3.event.transform.k;
}

/////////////////////////////////////////////////////////////////

// Tooltip
function showTooltip(d) {
	tooltip.transition()
			.style("opacity", 1);
	moveTooltip(d);
	tooltipCounty = d3.event.target;
}

function moveTooltip(d) {
	tooltip.style("left", (d3.event.pageX + 10) + "px")
			.style("top", (d3.event.pageY + 10) + "px")
			.html(d.properties.countyname + "<br>" + currentYear +  "<br>" + d.properties[currentYear] + "%");
}

function hideTooltip() {
	tooltip.transition()
			.style("opacity", 0);
}

/////////////////////////////////////////////////////////////////

// Slider
function dragging() {
	currentYear = Math.round(t.invert(d3.event.x));
	handle.transition()
			.duration(50)
			.ease(d3.easeLinear)
			.attr("cx", t(currentYear));
}

/////////////////////////////////////////////////////////////////

// Update map
function updateMap() {
	d3.selectAll(".countypolygons")
		.transition()
			.duration(750)
			.attr("fill", d => color(d.properties[currentYear]));
}

/////////////////////////////////////////////////////////////////
//// Map Animation //////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
d3.select("#play-button")
	.on("click", animateMap);

function animateMap() {
	if (playing === false) { // If map is NOT playing
		timer = setInterval(() => {
			// Increment currentYear
			if (currentYear === 2016) {
				currentYear = 2010;
			} else {
				currentYear++;
			}
			handle.attr("cx", t(currentYear));
			updateMap();
			tooltipCounty.dispatchEvent(mousemoveEvent); // Update tooltip when animation is playing
		}, 2000);

		d3.select("#play-button").html("STOP"); // Change button label to STOP
		playing = true; // Change status of the animation
	} else { // If map is playing
		clearInterval(timer); // Stop the animation

		d3.select("#play-button").html("PLAY"); // Change button label to PLAY
		playing = false; // Change status of the animation
	}
}
