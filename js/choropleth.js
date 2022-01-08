class Choropleth {
  constructor({
    el,
    stateFeatureCollection,
    countyFeatureCollection,
    color,
    years,
    year,
  }) {
    this.el = el;
    this.stateFeatureCollection = stateFeatureCollection;
    this.countyFeatureCollection = countyFeatureCollection;
    this.color = color;
    this.years = years;
    this.year = year;

    this.zoomed = this.zoomed.bind(this);
    this.movedCounties = this.movedCounties.bind(this);
    this.enteredState = this.enteredState.bind(this);
    this.leftState = this.leftState.bind(this);
    this.clickedState = this.clickedState.bind(this);
    this.clickedReset = this.clickedReset.bind(this);

    this.init();
  }

  init() {
    this.selectedStateId = null;
    this.activeCounty = null;
    this.transform = d3.zoomIdentity;

    this.dpr = Math.min(window.devicePixelRatio, 2) || 1;
    this.width = 975;
    this.height = 610;

    this.zoom = d3.zoom().on("zoom", this.zoomed);

    this.generatePickColors();
    this.scaffold();
    this.renderStates();
    this.renderCounties();
  }

  generatePickColors() {
    const colorStep = 10;
    let nextCol = colorStep;
    const genColor = () => {
      var ret = [];
      // via http://stackoverflow.com/a/15804183
      if (nextCol < 16777215) {
        ret.push(nextCol & 0xff); // R
        ret.push((nextCol & 0xff00) >> 8); // G
        ret.push((nextCol & 0xff0000) >> 16); // B
        nextCol += colorStep;
      }
      var col = "rgb(" + ret.join(",") + ")";
      return col;
    };

    this.countyFeatureCollection.features.forEach((d, i) => {
      d.properties.pickColor = genColor();
    });

    this.pickColorToDataMap = new Map(
      this.countyFeatureCollection.features.map((d) => [
        d.properties.pickColor,
        d,
      ])
    );
  }

  scaffold() {
    this.container = d3
      .select(this.el)
      .append("div")
      .attr("class", "choropleth");

    this.canvasCounties = this.container
      .append("canvas")
      .attr("class", "canvas-counties")
      .attr("width", this.width * this.dpr)
      .attr("height", this.height * this.dpr)
      .on("pointermove", this.movedCounties);
    this.ctx = this.canvasCounties.node().getContext("2d");
    this.ctx.lineJoin = "round";
    this.ctx.lineCap = "round";
    this.ctx.scale(this.dpr, this.dpr);
    this.geoPathCtx = d3.geoPath(null, this.ctx);

    this.canvasCountiesHidden = this.container
      .append("canvas")
      .attr("class", "canvas-counties-hidden")
      .attr("width", this.width * this.dpr)
      .attr("height", this.height * this.dpr)
      .style("display", "none");
    this.ctxHidden = this.canvasCountiesHidden.node().getContext("2d");
    this.ctxHidden.lineJoin = "round";
    this.ctxHidden.lineCap = "round";
    this.ctxHidden.scale(this.dpr, this.dpr);
    this.geoPathCtxHidden = d3.geoPath(null, this.ctxHidden);

    this.svgStates = this.container
      .append("svg")
      .attr("class", "svg-states")
      .attr("viewBox", [0, 0, this.width, this.height]);
    this.geoPath = d3.geoPath();

    this.resetButton = this.container
      .append("button")
      .attr("class", "reset-button")
      .text("Go Back")
      .on("click", this.clickedReset)
      .style("display", "none");

    this.tooltipContainer = this.container.append("div");
    this.tooltipCountyName = this.tooltipContainer.append("div");
    this.lineChart = new LineChart({
      el: this.tooltipContainer.append("div").node(),
      color: this.color,
      years: this.years,
      year: this.year,
    });
    this.tooltip = new Tooltip({
      elParent: this.el,
      el: this.tooltipContainer.node(),
    });
  }

  renderStates() {
    this.renderStatesPaths();
    this.renderStatesNames();
  }

  renderStatesPaths() {
    this.statePath = this.svgStates
      .append("g")
      .attr("class", "state-paths")
      .selectAll(".state-path")
      .data(this.stateFeatureCollection.features, (d) => d.id)
      .join((enter) =>
        enter
          .append("path")
          .attr("class", "state-path")
          .attr("d", this.geoPath)
          .on("pointerenter", this.enteredState)
          .on("pointerleave", this.leftState)
          .on("click", this.clickedState)
      );
  }

  renderStatesNames() {
    this.stateName = this.svgStates
      .append("g")
      .attr("class", "state-names")
      .selectAll(".state-name")
      .data(this.stateFeatureCollection.features, (d) => d.id)
      .join((enter) =>
        enter
          .append("text")
          .attr("class", "state-name")
          .attr("dy", "0.32em")
          .attr("text-anchor", "middle")
          .attr("transform", (d) => `translate(${this.geoPath.centroid(d)})`)
          .text((d) => d.properties.name)
      );
  }

  renderCounties() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();

    this.ctx.translate(this.transform.x, this.transform.y);
    this.ctx.scale(this.transform.k, this.transform.k);

    this.ctx.strokeStyle = "#fff";
    this.ctx.lineWidth = 0.5 / this.transform.k;
    this.countyFeatureCollection.features.forEach((d) => {
      if (
        !this.selectedStateId ||
        (this.selectedStateId &&
          d.properties.stateCode === this.selectedStateId)
      ) {
        if (d.properties.values) {
          const value = d.properties.values.get(this.year);
          if (value) {
            this.ctx.fillStyle = this.color(value);
            this.ctx.beginPath();
            this.geoPathCtx(d);
            this.ctx.fill();
            this.ctx.stroke();
          }
        }
      }
    });

    this.ctx.lineWidth = 1 / this.transform.k;
    this.geoPathCtx(this.stateFeatureCollection);
    this.ctx.stroke();

    this.ctx.restore();
  }

  renderCountiesHidden() {
    this.ctxHidden.clearRect(0, 0, this.width, this.height);

    this.ctxHidden.save();

    this.ctxHidden.translate(this.transform.x, this.transform.y);
    this.ctxHidden.scale(this.transform.k, this.transform.k);

    this.countyFeatureCollection.features.forEach((d) => {
      if (
        this.selectedStateId &&
        d.properties.stateCode === this.selectedStateId
      ) {
        if (d.properties.values) {
          this.ctxHidden.fillStyle = d.properties.pickColor;
          this.ctxHidden.beginPath();
          this.geoPathCtxHidden(d);
          this.ctxHidden.fill();
        }
      }
    });

    this.ctxHidden.restore();
  }

  zoomed({ transform }) {
    this.transform = transform;
    this.renderCounties();
  }

  movedCounties(event) {
    const color = this.ctxHidden.getImageData(
      ...d3.pointer(event, this.canvasCounties.node()).map((d) => d * this.dpr),
      1,
      1
    ).data;
    const colorString = `rgb(${color[0]},${color[1]},${color[2]})`;
    const county = this.pickColorToDataMap.get(colorString);
    if (county) {
      this.activeCounty = county;
      this.tooltipCountyName.text(this.activeCounty.properties.name);
      this.lineChart.updateData(county.properties.values);
      this.tooltip.show();
    } else {
      this.activeCounty = null;
      this.tooltip.hide();
    }
    if (this.tooltip.isVisible) {
      this.tooltip.move(event);
    }
  }

  enteredState(event, d) {
    this.statePath.classed("is-active", (e) => e === d);
    this.stateName.classed("is-active", (e) => e === d);
  }

  leftState(event, d) {
    this.statePath.classed("is-active", false);
    this.stateName.classed("is-active", false);
  }

  clickedState(event, d) {
    const stateBoundsTransform = this.getStateBoundsTransform(d);
    d3.transition()
      .duration(1000)
      .call(
        this.zoom.transform,
        stateBoundsTransform,
        d3.pointer(event, this.svgStates.node())
      )
      .on("start", () => {
        this.svgStates.style("display", "none");
      })
      .on("end", () => {
        this.selectedStateId = d.id;
        this.resetButton.style("display", null);
        this.renderCounties();
        this.renderCountiesHidden();
      });
  }

  clickedReset(event) {
    d3.transition()
      .duration(1000)
      .call(
        this.zoom.transform,
        d3.zoomIdentity,
        d3.pointer(event, this.svgStates.node())
      )
      .on("start", () => {
        this.selectedStateId = null;
        this.resetButton.style("display", "none");
        this.renderCounties();
        this.renderCountiesHidden();
      })
      .on("end", () => {
        this.svgStates.style("display", null);
      });
  }

  getStateBoundsTransform(d) {
    const [[x0, y0], [x1, y1]] = this.geoPath.bounds(d),
      dx = x1 - x0,
      dy = y1 - y0,
      x = (x0 + x1) / 2,
      y = (y0 + y1) / 2,
      scale = Math.max(
        1,
        Math.min(8, 0.9 / Math.max(dx / this.width, dy / this.height))
      ),
      translate = [this.width / 2 - scale * x, this.height / 2 - scale * y + 0];
    return new d3.ZoomTransform(scale, ...translate);
  }

  updateYear(year) {
    this.year = year;
    this.renderCounties();
    if (this.tooltip.isVisible) {
      this.lineChart.updateYear(year);
    }
  }
}
