function processData(data, us) {
  const stateFeatureCollection = topojson.feature(us, us.objects.states);
  const countyFeatureCollection = topojson.feature(us, us.objects.counties);

  const countyFeatureMap = new Map(
    countyFeatureCollection.features.map((countyFeature) => [
      countyFeature.id,
      countyFeature,
    ])
  );

  data.forEach((d) => {
    d.countyCode = `${d.stateCode}${d.countyCode}`;
    const countyFeature = countyFeatureMap.get(d.countyCode);
    if (countyFeature) {
      d.values = new Map(d.values.map((e) => [e.year, e.value]));
      countyFeature.properties = d;
    }
  });

  const yearExtent = [2001, 2020];

  const values = d3
    .merge(data.map((d) => [...d.values.values()]))
    .filter((d) => d !== null)
    .sort(d3.ascending);
  const valueLow = d3.min(values);
  const valueHigh = d3.quantile(values, 0.995);
  const valueExtent = [valueLow, valueHigh];

  return {
    stateFeatureCollection,
    countyFeatureCollection,
    yearExtent,
    valueExtent,
  };
}
