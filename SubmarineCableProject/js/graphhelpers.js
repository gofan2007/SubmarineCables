function generateCountryGraph(countryName) {
  var graphSVG = d3.select("#graphSVG");
  graphSVG.selectAll("*").remove();
  var desiredCountry = countryGDPs[countryName];
  if (desiredCountry ==  null) {
    console.log("caught error");
    graphSVG.append("text")
    .text("Data N/A")
    .attr("x", "50%")
    .attr("y", "50%")
    .style("fill", "black")
    .style("text-anchor", "middle")
    .style("alignment-baseline", "center")
    .style("font-size", 20);
    return;
  }

  var nextKey = "1989 [YR1989]";
  var key;
  var gdpval = [];

  for (var i = 1989; i < 2015; i++) {
    var nextDateString = (i + 1).toString();
    key = nextKey;
    nextKey = nextDateString + " [YR" + nextDateString + "]";

    if(desiredCountry[key] != ".."){
      gdpval.push(desiredCountry[key]);
    }
  }
  var maxValue = Math.max.apply(Math, gdpval);
  console.log(gdpval);
  console.log(maxValue);

  var xPadding = 100;
  var yPadding = 100;
  var xScale = d3.scale.linear().domain([1989, 2014]).range([xPadding, width / 2 - xPadding]);
  var yScale = d3.scale.linear().domain([0, maxValue]).range([height - yPadding, yPadding]);
  var xAxis = d3.svg.axis().scale(xScale)
    .orient("bottom")
    .tickFormat(d3.format("d"));
  var yAxis = d3.svg.axis().scale(yScale)
    .orient("left");
  graphSVG.append("g").attr("class", "axis")
    .attr("transform", "translate(0," + (height - yPadding) + ")")
    .call(xAxis);
  graphSVG.append("g").attr("class", "axis")
    .attr("transform", "translate(" + xPadding + ", 0)")
    .call(yAxis);

  for (var i = 1989; i < 2015; i++) {
    var nextDateString = (i + 1).toString();
    key = nextKey;
    nextKey = nextDateString + " [YR" + nextDateString + "]";
    if (desiredCountry[key] != "..") {
      //console.log(desiredCountry[key]);
      graphSVG.append("circle")
        .attr("cx", xScale(i))
        .attr("cy", yScale(desiredCountry[key]))
        .attr("r", 3)
        .style("fill", "black");
      if (i != 2014) {
        graphSVG.append("line")
          .attr("x1", xScale(i))
          .attr("y1", yScale(desiredCountry[key]))
          .attr("x2", xScale(i + 1))
          .attr("y2", yScale(desiredCountry[nextKey]))
          .style("stroke", "black");
      }
    }
  }

  console.log(countryName);
  if (countryToCableID[countryName] != null) {
    var yearToNumberOfCables = {};
    countryToCableID[countryName].forEach(function(cableID) {
      //console.log(cableIDtoCable[cableID].name);
      var year = cableIDtoCable[cableID].year;
      if (year != 0 && year <= 2014) {
        if (yearToNumberOfCables[year] == null) {
          yearToNumberOfCables[year] = 1;
        } else {
          yearToNumberOfCables[year] += 1;
        }
      }
    });

    for (var key in yearToNumberOfCables) {
      graphSVG.append("line")
          .attr("x1", xScale(key))
          .attr("x2", xScale(key))
          .attr("y1", yScale(0))
          .attr("y2", yScale(maxValue))
          .style("stroke", "black")
          .style("stroke-width", yearToNumberOfCables[key])
          .style("stroke-opacity", 0.5);
    }
  }

  graphSVG.append("text")
    .text(countryName)
    .attr("x", "50%")
    .attr("y", "7%")
    .style("fill", "black")
    .style("text-anchor", "middle")
    .style("alignment-baseline", "center")
    .style("font-size", 30)
    .style("font-weight", 100);
  graphSVG.append("text")
    .text("GDP per capita (thousands of $)")
    .attr("x", "-50%")
    .attr("y", xScale(1989) - 80)
    .style("fill", "black")
    .style("text-anchor", "middle")
    .style("alignment-baseline", "center")
    .style("font-size", 18)
    .style("font-weight", 100)
    .attr("transform", "rotate(270)");
  graphSVG.append("text")
    .text("Year")
    .attr("x", "50%")
    .attr("y", yScale(0) + 45)
    .style("fill", "black")
    .style("text-anchor", "middle")
    .style("alignment-baseline", "center")
    .style("font-size", 18);
}

function generateCableGraph(cable) {
  var graphSVG = d3.select("#graphSVG");
  graphSVG.selectAll("*").remove();
  var desiredLandings = cableIDToLandings[cable.cable_id];
  if (desiredLandings.length == 0) {
    graphSVG.append("text")
    .text("Data N/A")
    .attr("x", "50%")
    .attr("y", "50%")
    .style("fill", "black")
    .style("text-anchor", "middle")
    .style("alignment-baseline", "center")
    .style("font-size", 20);
    return;
  }

  var xPadding = 100;
  var yPadding = 100;
  var xScale = d3.scale.linear().domain([1989, 2014]).range([xPadding, width / 2 - xPadding]);
  var yScale = d3.scale.linear().domain([0, 100000]).range([height - yPadding, yPadding]);
  var xAxis = d3.svg.axis().scale(xScale)
    .orient("bottom");
  var yAxis = d3.svg.axis().scale(yScale)
    .orient("left");
  graphSVG.append("g").attr("class", "axis")
    .attr("transform", "translate(0," + (height - yPadding) + ")")
    .call(xAxis);
  graphSVG.append("g").attr("class", "axis")
    .attr("transform", "translate(" + xPadding + ", 0)")
    .call(yAxis);

  desiredLandings.forEach(function(landing) {
    var desiredCountry = countryGDPs[landing.country];
    if (desiredCountry != null) {
      var nextKey = "1989 [YR1989]";
      var key;
      for (var i = 1989; i < 2015; i++) {
        var nextDateString = (i + 1).toString();
        key = nextKey;
        nextKey = nextDateString + " [YR" + nextDateString + "]";
        if (desiredCountry[key] != "..") {
          //console.log(desiredCountry[key]);
          graphSVG.append("circle")
            .attr("cx", xScale(i))
            .attr("cy", yScale(desiredCountry[key]))
            .attr("r", 3)
            .style("fill", "black");
          if (i != 2014) {
            graphSVG.append("line")
              .attr("x1", xScale(i))
              .attr("y1", yScale(desiredCountry[key]))
              .attr("x2", xScale(i + 1))
              .attr("y2", yScale(desiredCountry[nextKey]))
              .style("stroke", "black");
          }
        }
      }
    }
  });

  var year = cable.year;
  if (year != 0 && year <= 2014) {
    graphSVG.append("line")
      .attr("x1", xScale(year))
      .attr("x2", xScale(year))
      .attr("y1", yScale(0))
      .attr("y2", yScale(100000))
      .style("stroke", "purple");
  }

  graphSVG.append("text")
    .text(cable.name)
    .attr("x", "50%")
    .attr("y", "7%")
    .style("fill", "black")
    .style("text-anchor", "middle")
    .style("alignment-baseline", "center")
    .style("font-size", 30)
    .style("font-weight", 100);
  graphSVG.append("text")
    .text("GDP per capita (thousands of $)")
    .attr("x", "-50%")
    .attr("y", xScale(1989) - 80)
    .style("fill", "black")
    .style("text-anchor", "middle")
    .style("alignment-baseline", "center")
    .style("font-size", 18)
    .style("font-weight", 100)
    .attr("transform", "rotate(270)");
  graphSVG.append("text")
    .text("Year")
    .attr("x", "50%")
    .attr("y", yScale(0) + 45)
    .style("fill", "black")
    .style("text-anchor", "middle")
    .style("alignment-baseline", "center")
    .style("font-size", 18);
}
