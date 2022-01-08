class LineChart {
  constructor({ el, color, years, year }) {
    this.el = el;
    this.color = color;
    this.years = years;
    this.year = year;
    this.init();
  }

  init() {
    this.margin = {
      top: 8,
      right: 16,
      bottom: 24,
      left: 48,
    };
    this.width = 400;
    this.height = 200;
    this.r = 5;
    this.rActive = 8;

    this.x = d3
      .scaleLinear()
      .domain([this.years[0], this.years[this.years.length - 1]])
      .range([this.margin.left, this.width - this.margin.right]);
    this.y = d3
      .scaleLinear()
      .domain(this.color.domain())
      .range([this.height - this.margin.bottom, this.margin.top]);
    this.line = d3
      .line()
      .x((d) => this.x(d[0]))
      .y((d) => this.y(d[1]))
      .curve(d3.curveMonotoneX);

    this.scaffold();
    this.renderXAxis();
    this.renderYAxis();
  }

  scaffold() {
    this.container = d3.select(this.el).attr("class", "line-chart");

    this.svg = this.container
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("viewBox", [0, 0, this.width, this.height]);
    this.gX = this.svg.append("g").attr("class", "axis axis--x");
    this.gY = this.svg.append("g").attr("class", "axis axis--y");
    this.path = this.svg
      .append("path")
      .attr("class", "line-path")
      .attr("fill", "none")
      .attr("stroke", "currentColor")
      .attr("stroke-width", 1.5);
    this.circles = this.svg.append("g").attr("class", "line-circles");
    this.gXFocus = this.svg
      .append("g")
      .call((g) =>
        g
          .append("line")
          .attr("stroke", "currentColor")
          .attr("stroke-dasharray", "4")
          .attr("y2", this.height - this.margin.bottom + 6)
      )
      .call((g) =>
        g
          .append("rect")
          .attr("fill", "#fff")
          .attr("x", -24)
          .attr("width", 48)
          .attr("y", this.height - this.margin.bottom + 6)
          .attr("height", 16)
      )
      .call((g) =>
        g
          .append("text")
          .attr("fill", "currentColor")
          .attr("text-anchor", "middle")
          .attr("y", this.height - this.margin.bottom + 9)
          .attr("dy", "0.71em")
      );
    this.gYFocus = this.svg
      .append("g")
      .call((g) =>
        g
          .append("line")
          .attr("stroke", "currentColor")
          .attr("stroke-dasharray", "4")
          .attr("x1", this.margin.left - 6)
      )
      .call((g) =>
        g
          .append("rect")
          .attr("fill", "#fff")
          .attr("x", this.margin.left - 36)
          .attr("width", 36 - 6)
          .attr("y", -8)
          .attr("height", 16)
      )
      .call((g) =>
        g
          .append("text")
          .attr("fill", "currentColor")
          .attr("text-anchor", "end")
          .attr("x", this.margin.left - 9)
          .attr("dy", "0.32em")
      );
  }

  renderXAxis() {
    this.gX
      .attr("transform", `translate(0,${this.height - this.margin.bottom})`)
      .call(d3.axisBottom(this.x).ticks(5, "d").tickSizeOuter(0))
      .attr("font-size", null)
      .attr("font-family", null);
  }

  renderYAxis() {
    this.gY
      .attr("transform", `translate(${this.margin.left},0)`)
      .call(d3.axisLeft(this.y).ticks(4))
      .call((g) => g.select(".domain").remove())
      .attr("font-size", null)
      .attr("font-family", null)
      .call((g) =>
        g
          .append("text")
          .attr("class", "axis-title")
          .attr("text-anchor", "middle")
          .attr("dy", "1em")
          .attr("fill", "currentColor")
          .attr(
            "transform",
            `rotate(-90)translate(${
              -(this.margin.top + this.height - this.margin.bottom) / 2
            },${-this.margin.left})`
          )
          .text("Unemployment %")
      );
  }

  renderPath() {
    this.path.datum([...this.data.entries()]).attr("d", this.line);
  }

  renderCircles() {
    this.circle = this.circles
      .selectAll(".line-circle")
      .data([...this.data.entries()])
      .join((enter) =>
        enter
          .append("circle")
          .attr("class", "line-circle")
          .attr("r", this.r)
          .attr("stroke", "#fff")
      )
      .attr("transform", (d) => `translate(${this.x(d[0])},${this.y(d[1])})`)
      .attr("fill", (d) => this.color(d[1]));
  }

  renderFocus() {
    this.circle
      .transition()
      .attr("r", (d) => (d[0] === this.year ? this.rActive : this.r));

    if (this.data.has(this.year)) {
      this.gXFocus
        .attr("opacity", 1)
        .attr("transform", `translate(${this.x(this.year)},0)`)
        .call((g) =>
          g
            .select("line")
            .attr("y1", this.y(this.data.get(this.year)) + this.rActive)
        )
        .call((g) => g.select("text").text(this.year));
      this.gYFocus
        .attr("opacity", 1)
        .attr("transform", `translate(0,${this.y(this.data.get(this.year))})`)
        .call((g) =>
          g.select("line").attr("x2", this.x(this.year) - this.rActive)
        )
        .call((g) => g.select("text").text(this.data.get(this.year)));
    } else {
      this.gXFocus.attr("opacity", 0);
      this.gYFocus.attr("opacity", 0);
    }
  }

  updateData(data) {
    this.data = data;
    this.renderPath();
    this.renderCircles();
    this.renderFocus();
  }

  updateYear(year) {
    this.year = year;
    this.renderFocus();
  }
}
