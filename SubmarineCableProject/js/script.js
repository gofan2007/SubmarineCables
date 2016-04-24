//Global Variables
var width = window.innerWidth;
var height = window.innerHeight;
var projection = d3.geo.mercator()
  .translate([width / 2, (3 * height) / 4.5])
  .scale((width ) / 2 / Math.PI);
var projection2 = d3.geo.mercator()
  .translate([(width *1.5) , (3 * height) / 4.5])
  .scale((width ) / 2 / Math.PI); // Line taken from Mike Bostock's Block 3757132 http://www.blocks.org/mbostock/3757132

var path = d3.geo.path().projection(projection);
var path2 = d3.geo.path().projection(projection2);

//allow to double click and zoom out

var svg = d3.select("#worldSVG")
  .attr("width",  width * 2)
  .attr("height", height)
  .attr("id", "worldmap");

var g = d3.select("#group");
var graphDiv = d3.select("#graph-div");
graphDiv.style("height", height)
  .style("width", width / 2)
  .style("display", "none")
  .style("background-color", "gray")
  .style("opacity", 0.95)
  .style("position", "absolute")
  .style("left", width / 2);

var graphToggled = false;
var mapColor = "#5abfa8";
var mapOceanColor = "white`"
var mapHover = "#edf8b1";
var clickToggle = true;

var globalCables;
var globalLandings;
var cableIDtoCable = {};
var countryToCableID = {};
var cableIDToLandings = {};
var opacityScale = d3.scale.linear().domain([0,1]).range([0.1,1]);
var countryGDPs = {};

var penetrationData;

fetchInternetPenData();
fetchGDPs();

function resetMap(){
    g.transition().duration(500).attr("transform", "translate("+ 0+"," + 0 +")");
    d3.selectAll(".map1").style("fill", mapColor);
}

svg.on("dblclick", function() {
  if(graphToggled) {
    toggleGraphDiv();
    clickToggle = !clickToggle;
  }
  else
  {
    resetMap();
  }
})

function fetchGDPs() {
  d3.json("data/gdps.json", function(error, data) {
    //create dictionary mapping country name to country dictionary for fast lookup
    data.forEach(function(country) {
      countryGDPs[country["Country Name"]] = country;
    })
  });
}

function fetchInternetPenData() {
  d3.json("data/internet-users.json", function(error1, userData) {
    if (error1) {
      return console.log(error1);
    } else {
      penetrationData = userData;
      generateWorldMap();
    }
  });
}

function calcOpacity(d){
  var internet_user_data = penetrationData.find(function(data) {
    return data.Country == d.properties.name;
  });
  if (internet_user_data == null) {
    internet_user_data = { "Internet" : 0};
  }
  return opacityScale(internet_user_data.Internet);
}

function worldMapClicked(c, isSingleClick) {
  if (!graphToggled) {
    toggleGraphDiv();
  }
  clickToggle = !clickToggle;
  if (clickToggle) {
    toggleGraphDiv();
  }
  if (isSingleClick) {
    //Position calculations
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
    } else {
      k = k;
    }

    if (c.properties.name == "France") {
      k = 7;
    } else if (c.properties.name == "United States") {
      k = 1.5;
    }

    d3.selectAll("path").style("fill", mapColor);
    var countryPath = d3.selectAll("#country" + c.id)[0][0];
    countryPath.style.fill = mapColor;
    g.transition().duration(800)
     .attr("transform", "translate(" + width / 4 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
     .style("stroke-width", 1.5 / k + "px");
    generateCountryGraph(c.properties.name);
  } else {
    resetMap();
  }
};

function generateWorldMap() {
  d3.json("data/world-topo-min.json", function(error2, world) {
      if (error2) { return console.log(error2); }
      var countries = topojson.feature(world, world.objects.countries).features;
      var isMouseDown = false;
      svg.style("background", mapOceanColor);
      var toolTip = setTimeout;
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
        .on("click", function(d){ worldMapClicked(d, clickToggle) })
        //.on("dblclick", function(d){ worldMapClicked(d, false) })
        .on("mouseover", function(d) {
            d3.select("#country" + d.id)
            .style("fill", mapHover)
            .style("fill-opacity", 1);
            var coordinates = d3.mouse(this);
            var introHeight = d3.select("#intro")[0][0].clientHeight;
            var headerHeight = d3.select("#header-div")[0][0].clientHeight;
            console.log(coordinates);
            toolTip(function(){ d3.select("#popup").style("display","block")
              .text(d.properties.name)
              .style("left", coordinates[0]+5)
              .style("top",introHeight+headerHeight+coordinates[1]+10); }, 1000);
        })
        .on("mouseout", function(d) {
            clearInterval(toolTip);
            d3.select("#country" + d.id)
            .style("fill", mapColor)
            .style("fill-opacity", function(d){
              return calcOpacity(d);
            });
            d3.select("#popup").style("display","none");
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
        .on("click", function(d){ worldMapClicked(d, clickToggle); })
        //.on("dblclick", function(d){ worldMapClicked(d,false); })
        .on("mouseover", function(d) {
            d3.select("#country" + d.id).style("fill", mapHover);
        })
        .on("mouseout", function(d) {
            d3.select("#country" + d.id).style("fill", mapColor);
        });
      fetchCableData();
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
  d3.json("data/cable_data.json", function(error, cables) {
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
      if (cable.year < 2010) {
        color = "orange";
        opacity = 0.8;
      } else {
        color = "#00B24C";
        opacity = 0.7;
      }
      var coordToStringResult = coordToString(cable.coordinates,projection);
      var coordToStringResult2 = coordToString(cable.coordinates,projection2);
      (coordToStringResult.coords).concat(coordToStringResult2.coords).forEach(function(paths) {
        g.append("polyline")
        .attr("style","fill:none;stroke:" + color + ";stroke-width:1")
        .attr("points",paths)
        .attr("id","cable"+cable.cable_id)
        .on("click", function() {
          var k = coordToStringResult.min;

          var[x,y] = coordToStringResult.center;
          g.transition().duration(800)
          .attr("transform", "translate(" + width/4 + "," + height / 2 + ") scale(" + k + ")translate(" + + -x + "," + -y + ")");
          var cableLandingPoints = landingPoints.filter(function(d){return d.cable_id == cable.cable_id});

          d3.selectAll("circle").remove();
          cableLandingPoints.forEach(function(d){
            var coord1 = projection(d.coordinates);
            var coord2 = projection2(d.coordinates);
            g.append("circle")
             .attr("cx",coord1[0])
             .attr("cy",coord1[1])
             .attr("r",8);
            g.append("circle")
             .attr("cx",coord2[0])
             .attr("cy",coord2[1])
             .attr("r",8);
          });
          //d3.selectAll("polyline").attr("style","opacity:" + opacity + ";fill:none;stroke:" + "grey" + ";stroke-width:1");
          d3.selectAll("#cable" + cable.cable_id).attr("style","fill:none;stroke:" + "black" + ";stroke-width:6");
          if (clickToggle) {
            toggleGraphDiv();
            clickToggle = !clickToggle;
          }
          else if(!clickToggle) {
            toggleGraphDiv();
            resetMap();
            clickToggle = !clickToggle;
            if (cable.year < 2010) {
              color = "orange";
              opacity = 0.8;
            } else {
              color = "#00B24C";
              opacity = 0.7;
            }
            d3.selectAll("#cable" + cable.cable_id).attr("style","fill:none;stroke:" + "black" + ";stroke-width:6");
          }
          generateCableGraph(cable);
        })
        .on("mouseover", function() {
            d3.selectAll("#cable" + cable.cable_id).attr("style","fill:none;stroke:" + "black" + ";stroke-width:6");
        })
        .on("mouseout", function() {
          if (cable.year < 2010) {
            color = "orange";
            opacity = 0.8;
          } else {
            color = "#00B24C";
            opacity = 0.7;
          }
            d3.selectAll("#cable" + cable.cable_id).style("stroke-width", "1");
            d3.selectAll("#cable" + cable.cable_id).attr("style","fill:none;stroke:" + color + ";stroke-width:1");
        });
      });
        var coordToStringResult2 = coordToString(cable.coordinates,projection2);
    });
  });
}

function toggleGraphDiv() {
  $("#graph-div").slideToggle(500);
  graphToggled = !graphToggled;
}
