Promise.all([
  d3.json("data/unemployment_2001_2020.json"),
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-albers-10m.json"),
]).then(([unemploymentData, us]) => {
  const {
    stateFeatureCollection,
    countyFeatureCollection,
    yearExtent,
    valueExtent,
  } = processData(unemploymentData, us);
  console.log({
    stateFeatureCollection,
    countyFeatureCollection,
    yearExtent,
    valueExtent,
  });

  d3.select(".loader-container").remove();

  const color = d3
    .scaleQuantize()
    .domain(valueExtent)
    .range(d3.schemeBlues[8])
    .nice();
  Legend(document.getElementById("legend"), color, {
    title: "Unemployment %",
    height: 54,
    marginTop: 24,
  });

  const years = d3.range(yearExtent[0], yearExtent[1] + 1);
  const initialYear = years[years.length - 1];
  const choropleth = new Choropleth({
    el: document.getElementById("choropleth"),
    stateFeatureCollection,
    countyFeatureCollection,
    color,
    years,
    year: initialYear,
  });

  const yearControl = Scrubber(document.getElementById("year-control"), years, {
    initial: years[years.length - 1],
    delay: 2000,
  });
  yearControl.addEventListener("input", (event) => {
    const yearIndex = event.target.valueAsNumber;
    const year = years[yearIndex];
    choropleth.updateYear(year);
  });
});
