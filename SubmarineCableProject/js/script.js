//Global Variables
var width = window.innerWidth;
var height = window.innerHeight*.9;
var zoomedIn = false;
var svg = d3.select("#worldSVG")
  .attr("width",  width * 1.5)
  .attr("height", height)
  .attr("id", "worldmap");

var transparentOverlay = d3.select("#transparentOverlay")
  .on("click", function() {
    if (graphToggled) {
      toggleGraphDiv();
    }
    resetMap();
  });

var projection = d3.geo.mercator()
  .translate([width / 2, (3 * height) / 4.5])
  .scale((width ) / 2 / Math.PI);
var projection2 = d3.geo.mercator()
  .translate([(width * 1.5) , (3 * height) / 4.5])
  .scale((width ) / 2 / Math.PI); // Line taken from Mike Bostock's Block 3757132 http://www.blocks.org/mbostock/3757132
var projection3 = d3.geo.mercator()
  .translate([(-width / 2 ), (3 * height) / 4.5])
  .scale((width ) / 2 / Math.PI);

var path = d3.geo.path().projection(projection);
var path2 = d3.geo.path().projection(projection2);
var path3 = d3.geo.path().projection(projection3);

var graphToggled = false;
var mapColor = "#7FB800";
var mapOceanColor = "white";
var mapHoverColor = "#737373";
var graphBackgroundColor = "#b3b3b3";
var g = d3.select("#group");
var graphDiv = d3.select("#graph-div");
graphDiv.style("height", height)
  .style("width", width / 2)
  .style("display", "none")
  .style("background-color", graphBackgroundColor)
  .style("opacity", 0.95)
  .style("position", "absolute")
  .style("left", width / 2);

var globalCables;
var globalLandings;
var cableIDtoCable = {};
var countryToCableID = {};
var cableIDToLandings = {};
var opacityScale = d3.scale.linear().domain([0, 3]).range([0.1, 1]);
var countryGDPs = {};

var hdiData;

var toolTip;
var toolTipOffset = -5;
var selectedCableClass = "";
var k = 1;

fetchGDPs();

function resetMap(){
  console.log("resetting");
  g.transition().duration(500).attr("transform", "translate(" + 0 + "," + 0 + ")");
  d3.selectAll(".map1").style("fill", mapColor);
  d3.selectAll("circle").remove();
  d3.selectAll("polyline").style("stroke-width", 2);
  selectedCableClass = "";
  k = 1;
}

function fetchGDPs() {
  d3.json("data/gdps.json", function(error, data) {
    //create dictionary mapping country name to country dictionary for fast lookup
    data.forEach(function(country) {
      countryGDPs[country["Country Name"]] = country;
    })
    fetchCableData();
  });
}

// function fetchHDI() {
//   d3.json("data/hdi.json", function(error1, userData) {
//     if (error1) {
//       return console.log(error1);
//     } else {
//       hdiData = userData;
//       generateWorldMap();
//     }
//   });
// }

function calcOpacity(d){
  // var countryQOL = hdiData.find(function(data) {
  //   return data.Location == d.properties.name;
  // });
  // if (countryQOL == null) {
  //   d["HDI"] = 0;
  // } else {
  //   d["HDI"] = countryQOL["Human Development Index (HDI)"];
  // }
  // return opacityScale(d["HDI"]);
  var desiredCountry = countryGDPs[d.properties.name];
  var numCables = countryToCableID[d.properties.name];
  if (desiredCountry != null) {
    var earliestGDP = findEarliestGDP(desiredCountry);
    var latestGDP = findLatestGDP(desiredCountry);
    d.percentChange = (latestGDP - earliestGDP) / earliestGDP;
    //console.log(d.properties.name + " " + percentChange / numCables.length);
    return opacityScale(d.percentChange);
  } else {
    return 0;
  }
}

function calcCableColor(c){
  //var colorScale = d3.scale.log().domain([1, 2]).range(["#feb24c","#f03b20"]);
  // if(c.cost/4000000000 < 0.3) {
  //   return ("#525252");
  // } else if(c.cost/4000000000 < 0.6) {
  //   return("#ec7014");
  // }
  // else {
  //   return("#ae017e")
  // }
//  return colorScale(c.cost/4000000000 + 1);
  if(c.year < 2010) {
    return "orange";
  } else {
    return "purple";
  }
}

function findEarliestGDP(country) {
  var nextKey = "1989 [YR1989]";
  var key;
  for (var i = 1989; i < 2015; i++) {
    var nextDateString = (i + 1).toString();
    key = nextKey;
    nextKey = nextDateString + " [YR" + nextDateString + "]";

    if(country[key] != "..") {
      return country[key];
    }
  }
}

function findLatestGDP(country) {
  var prevKey = "2014 [YR2014]";
  var key;
  for (var i = 2014; i > 1988; i--) {
    var prevDateString = (i - 1).toString();
    key = prevKey;
    prevKey = prevDateString + " [YR" + prevDateString + "]";

    if (country[key] != "..") {
      return country[key];
    }
  }
}

function worldMapClicked(c, isSingleClick) {
  if (!graphToggled) {
    toggleGraphDiv();
  }
  var centroid = path.centroid(c),
    [x, y] = centroid,
    [[left, top], [right, bottom]] = path.bounds(c),
    cHeight = bottom - top,
    cWidth = right - left,
    k = 1;

  if (cHeight > cWidth){
    k = (height / cHeight) / 1.6;
  } else {
    k = width / 2 / cWidth / 2.3;
  }

  if (k < 0.5) {
    k = 1;
  } else if (k < 1.5) {
    k = 1.8;
  }

  if (c.properties.name == "France") {
    k = 7;
  } else if (c.properties.name == "United States") {
    k = 1.5;
  }
  var countryPath = d3.selectAll("#country" + c.id)[0][0];
  g.transition().duration(800)
   .attr("transform", "translate(" + width / 4 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")");
  resizeCables(k);
  generateCountryGraph(c.properties.name);
};

function resizeCables(zoom) {
  console.log("resizing cables");
  console.log(zoom);
  k = zoom;
  d3.selectAll("polyline").style("stroke-width", 2 / zoom);
}

var introHeight = d3.select("#intro")[0][0].clientHeight;
var headerHeight = d3.select("#header-div")[0][0].clientHeight;

function generateWorldMap() {
  d3.json("data/world-topo-min.json", function(error2, world) {
      if (error2) { return console.log(error2); }
      var countries = topojson.feature(world, world.objects.countries).features;
      var isMouseDown = false;
      svg.style("background", mapOceanColor);
      // var introHeight = d3.select("#intro")[0][0].clientHeight;
      // var headerHeight = d3.select("#header-div")[0][0].clientHeight;
      g.selectAll("map1")
        .data(countries)
        .enter().append("path")
        .attr("d",path)
        .attr("class","map1")
        .style("fill", mapColor)
        .style("stroke", "#888")
        .style("fill-opacity", function(d){
          return calcOpacity(d);
        })
        .attr("id", function(d){return "country" + d.id;})
        .on("click", function(d){ worldMapClicked(d) })
        .on("mouseover", function(d) {
          d3.select("#country" + d.id)
            .style("fill", mapHoverColor)
            .style("fill-opacity", 1);
          if (d.HDI == 0) {
            showPopupWithLatency(d.properties.name, "NA", "GDP per capita growth: ");
          } else {
            showPopupWithLatency(d.properties.name, (d.percentChange * 100).toFixed(2) + "%", "GDP per capita growth: ");
          }
        })
        .on("mousemove",function(d){
          trackMouseMovements();
        })
        .on("mouseout", function(d) {
            clearInterval(toolTip);
            d3.select("#country" + d.id)
            .style("fill", mapColor)
            .style("fill-opacity", function(d){
              return calcOpacity(d);
            });
            var popup = d3.select("#popup");
            popup.selectAll("*").remove();
            d3.select("#popup").style("display", "none");

        });
      g.selectAll("map2")
        .data(countries)
        .enter().append("path")
        .attr("d", path2)
        .attr("class","map2")
        .style("fill", mapColor)
        .style("stroke", "#888")
        .style("fill-opacity", function(d){ return calcOpacity(d) })
        .attr("id", function(d){ return "country"+d.id; })
        .on("click", function(d){ worldMapClicked(d); })
        .on("mouseover", function(d) {
            d3.select("#country" + d.id).style("fill", mapHoverColor);
        })
        .on("mouseout", function(d) {
            d3.select("#country" + d.id).style("fill", mapColor);
        });
       g.selectAll("map3")
        .data(countries)
        .enter().append("path")
        .attr("d", path3)
        .attr("class","map3")
        .style("fill", mapColor)
        .style("stroke", "#888")
        .style("fill-opacity", function(d){ return calcOpacity(d) })
        .attr("id", function(d){ return "country"+d.id; })
        .on("click", function(d){ worldMapClicked(d); })
        .on("mouseover", function(d) {
            d3.select("#country" + d.id).style("fill", mapHoverColor);
        })
        .on("mouseout", function(d) {
            d3.select("#country" + d.id).style("fill", mapColor);
        });
  });
};

function correctLandingNames(landingPoint) {
  if (landingPoint.country == "Tanzania") {
    landingPoint.country = "Tanzania, United Republic of"
  } else if (landingPoint.country == "Bolivia") {
    landingPoint.country = "Bolivia, Plurinational State of"
  } else if (landingPoint.country == "Federated States of Micronesia") {
    landingPoint.country = "Micronesia, Federated States of"
  } else if (landingPoint.country == "Iran") {
    landingPoint.country = "Iran, Islamic Republic of"
  } else if (landingPoint.country == "Rep.") {
    landingPoint.country = "Korea, Republic of"
  } else if (landingPoint.country == "Venezuela") {
    landingPoint.country = "Venezuela, Bolivarian Republic of"
  } else if (landingPoint.country == "Côte d'Ivoire") {
    landingPoint.country = "Cote d'Ivoire"
  }
}

function populateDictionaries(landingPoint) {
  if (countryToCableID[landingPoint.country] == null) {
    countryToCableID[landingPoint.country] = [landingPoint.cable_id];
  } else {
    if (countryToCableID[landingPoint.country].indexOf(landingPoint.cable_id) == -1) {
      //check to see we don't duplicate cables
      countryToCableID[landingPoint.country].push(landingPoint.cable_id);
    }
  }
  if (cableIDToLandings[landingPoint.cable_id] == null) {
    cableIDToLandings[landingPoint.cable_id] = [landingPoint];
  } else {
    cableIDToLandings[landingPoint.cable_id].push(landingPoint);
  }
}

function coordToString(coordinates,projection) {
  var result = [];
  var lonMin = Math.min(), lonMax = Math.max(), latMin = Math.min(), latMax = Math.max(),
    cableHeight, cableWidth, min, center, lonArray = [],
    latArray = [];
  coordinates.forEach(function(path) {
    var pathString = "";
    var pathCords = path.split(" ");
    pathCords.forEach(function(points){
      [lon, lat, alt] = points.split(",");
      //no projection lon lat
      lonArray.push(lon);latArray.push(lat);
      [lon,lat] = projection([lon,lat]);
      if (lon > lonMax) { lonMax = lon; }
      if (lon < lonMin) { lonMin = lon; }
      if (lat > latMax) { latMax = lat; }
      if (lat < latMin) { latMin = lat; }
      pathString += lon + "," + lat + " ";
    });
    result.push(pathString);
  });

  [lonMinOri, lonMaxOri, latMinOri, latMaxOri] = [d3.min(lonArray), d3.max(lonArray), d3.min(latArray), d3.max(latArray)];

  var dist1 = lonMax - lonMin;
  var dist2 = projection2([lonMinOri, 0])[0] - lonMax;
  if (dist1 < dist2) {
    center = [lonMin + dist1 / 2, latMin + (latMax - latMin) / 2];
    cableWidth = dist1;
  } else {
    center = [lonMax ,latMin + (latMax - latMin) / 2];
    cableWidth = dist2 / 0.7;
  }

  cableHeight = height / (latMax - latMin) / 1.5;
  cableWidth = width / 1.5 / cableWidth / 2.2;
  min = cableWidth;
  if (cableHeight < cableWidth){
    min = cableHeight;
  }
  return {"coords": result, "height": cableHeight, "width": cableWidth, "min": min, "center": center};
}

function fetchCableData() {
  d3.json("data/cable_data_final.json", function(error, cables) {
    globalCables = cables;
    fetchLandingPoints();
  });
}

function fetchLandingPoints() {
  d3.json("data/landing_points.json", function(error, landingPoints) {
    if (error) { return console.log(error); }
    globalLandings = landingPoints;
    landingPoints.forEach(function(landingPoint) {
      var name = landingPoint.name;
      name = name.split(", ");
      landingPoint.country = name[name.length - 1];
      correctLandingNames(landingPoint);
      var[lon,lat,alt] = landingPoint.coordinates
        .replace("<Point><coordinates>","")
        .replace("</coordinates></Point>","")
        .split(",");
      landingPoint.coordinates=[lon, lat];
      populateDictionaries(landingPoint);
    });
    globalCables.forEach(function(cable) {
      var coordinates = cable.coordinates;
      var temp =[];
      var temp2 =[];
      coordinates = coordinates
        .replace(/<LineString><coordinates>/g,"")
        .replace("</MultiGeometry>",'')
        .replace("<MultiGeometry>",'')
        .split("</coordinates></LineString>");
      coordinates.pop();
      cable.coordinates = coordinates;
      cableIDtoCable[cable.cable_id] = cable;
    });

    var color = "black";
    var opacity = 0;
    globalCables.forEach(function(cable) {
      color = calcCableColor(cable);
      var coordToStringResult = coordToString(cable.coordinates, projection);
      var coordToStringResult2 = coordToString(cable.coordinates, projection2);
      var coordToStringResult3 = coordToString(cable.coordinates, projection3);
      (coordToStringResult.coords).concat(coordToStringResult2.coords).concat(coordToStringResult3.coords).forEach(function(paths) {
        g.append("polyline")
        .style("fill", "none")
        .style("stroke", color)
        .style("stroke-width", 2/k)
        .style("stroke-opacity", 0.8)
        .attr("points",paths)
        .attr("id","cable" + cable.cable_id)
        .on("click", function() {
          k = coordToStringResult.min;
          var[x,y] = coordToStringResult.center;
          //try to hard code to make this cable show ACE
          if (cable.cable_id == 1629) {
            y = y * 0.85;
            k = k / 1.8;
          }
          resizeCables(k);
          g.transition().duration(800)
          .attr("transform", "translate(" + width/4 + "," + height / 2 + ") scale(" + k + ")translate(" + -x + "," + -y + ")");
          var cableLandingPoints = landingPoints.filter(function(d){ return d.cable_id == cable.cable_id });
          d3.selectAll("circle").remove();
          cableLandingPoints.forEach(function(d){
            var coord1 = projection(d.coordinates);
            var coord2 = projection2(d.coordinates);
            g.append("circle")
             .attr("cx",coord1[0])
             .attr("cy",coord1[1])
             .attr("r", 3)
             .on("mouseover",function(){ showPopupWithLatency(d.name, "", "") })
             .on("mouseout",function(){
              popup.selectAll("*").remove();
              d3.select("#popup").style("display","none");
             });
            g.append("circle")
             .attr("cx", coord2[0])
             .attr("cy", coord2[1])
             .attr("r", 3)
             .on("mouseover",function() {
                showPopupWithLatency(d.name);
              })
             .on("mouseout",function() {
                popup.selectAll("*").remove();
                d3.select("#popup").style("display","none");
             });
          });
          if (!graphToggled) {
            toggleGraphDiv();
          }
          if (selectedCableClass != "") {
            d3.selectAll(selectedCableClass).style("stroke-width", 2/k);
          }
          d3.selectAll("polyline").style("stroke-width", 2/k);
          selectedCableClass = "#cable" + cable.cable_id;
          d3.selectAll(selectedCableClass)
            .style("stroke-width", 8/k)
            .style("stroke-opacity", 1);
          generateCableGraph(cable);
        })
        .on("mouseover", function() {
          d3.selectAll("#cable" + cable.cable_id)
            .style("stroke-width", 8/k);
          if (cable.cost == 0) {
            showPopupWithLatency(cable.name, "NA", "Cable Cost: $");
          } else {
            showPopupWithLatency(cable.name, cable.cost.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","), "Cable Cost: $");
          }
        })
        .on("mouseout", function() {
          clearInterval(toolTip);
          var cableClass = "#cable" + cable.cable_id;
          if (cableClass != selectedCableClass) {
            d3.selectAll("#cable" + cable.cable_id)
              .style("stroke-width", 2/k)
              .style("stroke-opacity", 0.8);
          }
          var popup = d3.select("#popup");
          popup.selectAll("*").remove();
          d3.select("#popup").style("display","none");
        })
        .on("mousemove", function() {
          trackMouseMovements();
        });
      });
    });
    generateWorldMap();
  });
}

function toggleGraphDiv() {
  $("#graph-div").slideToggle(500);
  graphToggled = !graphToggled;
}

function trackMouseMovements() {
  var coordinates = d3.mouse(svg[0][0]);
  d3.select("#popup").style("left", coordinates[0] + toolTipOffset)
    .style("top", introHeight + headerHeight + coordinates[1] + toolTipOffset);
}

function showPopupWithLatency(text, secondaryText, secondaryTextLabel) {
  var coordinates = d3.mouse(svg[0][0]);
  toolTip = setTimeout(function () {
    var popup = d3.select("#popup");
    popup.append("p").text(text);
    popup.append("p").text(secondaryTextLabel + secondaryText);
    popup.style("display", "block");
    var introHeight = d3.select("#intro")[0][0].clientHeight;
    var headerHeight = d3.select("#header-div")[0][0].clientHeight;
  }, 250);
}
