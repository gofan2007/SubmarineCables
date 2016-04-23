var width = window.innerWidth,
height = window.innerHeight;
// A projection is a particular type of scale, that maps
// a pair of LONGITUDE, LATITUDE coordinates (NOT the other
// way around) to a point in pixel space.
var projection = d3.geo.mercator()
  .translate([width / 2, (3 * height) / 4.5])
  .scale((width ) / 2 / Math.PI);
var projection2 = d3.geo.mercator()
  .translate([(width *1.5) , (3 * height) / 4.5])
  .scale((width ) / 2 / Math.PI); // Line taken from Mike Bostock's Block 3757132 http://www.blocks.org/mbostock/3757132

var path = d3.geo.path().projection(projection);
var path2 = d3.geo.path().projection(projection2);

var svg = d3.select("#worldSVG")
  .attr("width",  width * 2)
  .attr("height", height)
  .attr("id", "worldmap");

var g = d3.select("#group");

//var g2 = svg.append("g");
var graphDiv = d3.select("#graph-div");
// console.log(svg.getBoundClientRect().height);
graphDiv.style("height", height)
  .style("width", width / 2)
  .style("display", "none")
  .style("background-color", "gray")
  .style("opacity", 0.95)
  .style("position", "absolute")
  .style("left", width / 2);
var graphToggled = false;
var mapColor = "#5abfa8";
var mapOceanColor = "white"
var mapHover = "#edf8b1";

function resetMap(){
    g.transition().duration(500).attr("transform", "translate("+ 0+"," + 0 +")");
    //g2.transition().duration(800).attr("transform", "translate("+ 0+"," + 0 +")");
    d3.selectAll("path").style("fill", mapColor);
}

//allow to double click and zoom out
svg.on("dblclick",function() {
  if (graphToggled) {
    toggleGraphDiv();
  }
  resetMap();
});

var opacityScale = d3.scale.linear().domain([0,1]).range([0.1,1]);
var countryGDPs = {};

d3.json("data/gdps.json", function(error, data) {
  //create dictionary mapping country name to country dictionary for fast lookup
  data.forEach(function(country) {
    countryGDPs[country["Country Name"]] = country;
  })
  //console.log(countryGDPs);
  //generateGraph("United States");
});

d3.json("data/internet-users.json", function(error1, userData) {
  if (error1) { return console.log(error1); }
  d3.json("data/world-topo-min.json", function(error2, world) {
      if (error2) { return console.log(error2); }
      var countries = topojson.feature(world, world.objects.countries).features;
      var isMouseDown = false;

      svg.style("background", mapOceanColor);

      countries.forEach(function(d){
        var countryName=d.properties.name;
        if(countryGDPs[countryName]==null)
          {console.log(countryName)}
      });

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
        .attr("title", function(d){return d.properties.name})
        .attr("id", function(d){return "country" + d.id;})
        .on("click", function(d){ worldMapClicked(d, true) })
        .on("dblclick", function(d){ worldMapClicked(d, false) })
        .on("mouseover", function(d) {
            d3.select("#country" + d.id)
            .style("fill", mapHover)
            .style("fill-opacity", 1);
        })
        .on("mouseout", function(d) {
            d3.select("#country" + d.id)
            .style("fill", mapColor)
            .style("fill-opacity", function(d){
              return calcOpacity(d);
            });
        });


      g.selectAll("map2")
       .data(countries)
       .enter().append("path")
       .attr("d", path2)
       .attr("class","map2")
       .style("fill", mapColor)
       .style("stroke", "#888")
       .style("fill-opacity", function(d){ return calcOpacity(d) })
       .attr("title", function(d){ return d.properties.name; })
       .attr("id", function(d){ return "country"+d.id; })
       .on("click", function(d){ worldMapClicked(d,true); })
       .on("dblclick", function(d){ worldMapClicked(d,false); })
       .on("mouseover", function(d) {
            d3.select("#country" + d.id).style("fill", mapHover);
        })
        .on("mouseout", function(d) {
            d3.select("#country" + d.id).style("fill", mapColor);

        });

      function calcOpacity(d){
        var internet_user_data = userData.find(function(data) {
          return data.Country == d.properties.name;
        });
        if (internet_user_data == null) {
          //console.log(d.properties.name)
          internet_user_data = { "Internet" : 0};
        }
        return opacityScale(internet_user_data.Internet);
      }

      function worldMapClicked(c, isSingleClick) {
        if (!graphToggled) {
          toggleGraphDiv();
        }
        if (isSingleClick) {
          var centroid = path.centroid(c),
              [x,y] = centroid,
              [[left, top], [right, bottom]] = path.bounds(c),
              cHeight = bottom - top,
              cWidth = right - left,
              k = 1;
          if (cHeight > cWidth){
            k = (height / cHeight) / 1.6;
          } else {
            k = width / 2 / cWidth / 2.3;
          }

          if (k < 0.5) { k = 1; }
          else if (k < 1.5) { k = 1.8; }
          else { k = k; }
          //console.log("width  :"+cWidth + "  height   :"+cHeight +"  K   :"+k)
          //data anomoly in France
          if(c.properties.name == "France"){ k = 7; }
          else if (c.properties.name == "United States") { k = 1.5; }

          d3.selectAll("path").style("fill", mapColor);

          //g.append("circle").attr("cx",x).attr("cy",y).attr("r",5);
          var countryPath = d3.selectAll("#country" + c.id)[0][0];
          countryPath.style.fill = mapColor;
          //console.log(d3.selectAll("#country"+c.id))
          g.transition().duration(800)
           .attr("transform", "translate(" + width / 4 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
           .style("stroke-width", 1.5 / k + "px");
          // g2.transition().duration(800)
          //  .attr("transform", "translate(" + width / 4 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
          //  .style("stroke-width", 1.5 / k + "px");
          generateGraph(c.properties.name);
        } else {
          resetMap();
        }
      };
  });
});

d3.json("data/cable_data.json", function(error, cables) {
  d3.json("data/landing_points.json", function(error3, landingPoints) {
    landingPoints.forEach(function(landingPoint){
    var name = landingPoint.name;
    name = name.split(", ");
    landingPoint.country = name[name.length-1];
    var[lon,lat,alt] = landingPoint.coordinates
                                .replace("<Point><coordinates>","")
                                .replace("</coordinates></Point>","")
                                .split(",");
    landingPoint.coordinates=[lon,lat];
    });

  var cables_global = cables;
  if (error) { return console.log(error); }
  cables.forEach(function(cable) {
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
    //console.log(cable.coordinates)
  });

  function coordToString(coordinates,projection) {
    var result =[];
    var lonMin = Math.min(), lonMax = Math.max(), latMin = Math.min(), latMax = Math.max(),
      cableHeight, cableWidth, min, center, lonArray = [],
      latArray=[];
    coordinates.forEach(function(path) {
      var pathString = "";
      var pathCords = path.split(" ");
      pathCords.forEach(function(points){
        [lon,lat,alt] = points.split(",");
        //no projection lon lat
        lonArray.push(lon);latArray.push(lat);
        [lon,lat] = projection([lon,lat]);
        if(lon>lonMax){lonMax = lon;}
        if(lon<lonMin){lonMin = lon;}
        if(lat>latMax){latMax = lat;}
        if(lat<latMin){latMin = lat;}
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
      center = [lonMax + (dist2 / 7),latMin + (latMax - latMin) / 2];
      cableWidth = dist2 / 0.9;
    }

    cableHeight = height / (latMax - latMin) / 1.5;
    cableWidth = width / 1.5 / cableWidth / 2.2;
    min = cableWidth;
    if (cableHeight < cableWidth){
      min = cableHeight;
    }

    return {"coords": result, "height": cableHeight, "width": cableWidth, "min": min, "center": center};
  }
      //add polylines
  var color = "black",
  color2 = "black",
  stroke_width,
  opacity = 0;
  cables.forEach(function(cable) {
    if (cable.year < 2010) {
      color = "orange";
      color2 = "orange";
      opacity = 0.8;
    } else {
      color = "#00B24C";
      color2 = "#00B24C";
      opacity = 0.7;
    }

    var coordToStringResult = coordToString(cable.coordinates,projection);
    var coordToStringResult2 = coordToString(cable.coordinates,projection2);


    (coordToStringResult.coords).concat(coordToStringResult2.coords).forEach(function(paths) {
      g.append("polyline")
      .attr("style","fill:none;stroke:"+color+";stroke-width:1.6")
      .attr("points",paths)
      .attr("id","cable"+cable.cable_id)
      .attr("title",cable.id)
      .on("click", function() {
        var k = coordToStringResult.min;
        //console.log(coordToStringResult)
        var[x,y] = coordToStringResult.center;
        g.transition().duration(800)
        .attr("transform", "translate(" + width/4 + "," + height / 2 + ") scale(" + k + ")translate(" + + -x + "," + -y + ")");
        var cableLandingPoints = landingPoints.filter(function(d){return d.cable_id == cable.cable_id});

        d3.selectAll("circle").remove();
        cableLandingPoints.forEach(function(d){
          var coord1 = projection(d.coordinates),
              coord2 = projection2(d.coordinates);

          g.append("circle")
           .attr("cx",coord1[0])
           .attr("cy",coord1[1])
           .attr("r",8);

          g.append("circle")
           .attr("cx",coord2[0])
           .attr("cy",coord2[1])
           .attr("r",8);
        });


        d3.selectAll("polyline").attr("style","opacity:0.5;fill:none;stroke:" + "grey" + ";stroke-width:1");
        d3.selectAll("#cable" + cable.cable_id).attr("style","fill:none;stroke:" + color + ";stroke-width:6");
        if (!graphToggled) {
          toggleGraphDiv();
        }

      })
      .on("mouseover", function() {
          d3.selectAll("#cable" + cable.cable_id).style("stroke-width", "6");
      })
      .on("mouseout", function() {
          d3.selectAll("#cable" + cable.cable_id).style("stroke-width", "1.6");
      });
    });

    var coordToStringResult2 = coordToString(cable.coordinates,projection2);


  });
  });
});

function toggleGraphDiv() {
  //console.log("toggling graph");
  $("#graph-div").slideToggle(500);
  graphToggled = !graphToggled;
}

function generateGraph(countryName) {
  var graphSVG = d3.select("#graphSVG");
  graphSVG.selectAll("*").remove();
  var desiredCountry = countryGDPs[countryName];
  if (desiredCountry ==  null) {
    console.log("caught error");
    graphSVG.append("text")
    .text("Data N/A")
    .attr("x", "50%")
    .attr("y", "50%")
    .style("fill", "white")
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
  var maxvalue = Math.max.apply(Math, gdpval);
  console.log(gdpval);
  console.log(maxvalue);

  var xPadding = 100;
  var yPadding = 100;
  var xScale = d3.scale.linear().domain([1989, 2014]).range([xPadding, width / 2 - xPadding]);
  var yScale = d3.scale.linear().domain([0, maxvalue]).range([height - yPadding, yPadding]);
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
  graphSVG.append("text")
    .text(countryName)
    .attr("x", "50%")
    .attr("y", "7%")
    .style("fill", "white")
    .style("text-anchor", "middle")
    .style("alignment-baseline", "center")
    .style("font-size", 30)
    .style("font-weight", 100);
  graphSVG.append("text")
    .text("GDP per capita (thousands of $)")
    .attr("x", "-50%")
    .attr("y", xScale(1989) - 80)
    .style("fill", "white")
    .style("text-anchor", "middle")
    .style("alignment-baseline", "center")
    .style("font-size", 18)
    .style("font-weight", 100)
    .attr("transform", "rotate(270)");
  graphSVG.append("text")
    .text("Year")
    .attr("x", "50%")
    .attr("y", yScale(0) + 45)
    .style("fill", "white")
    .style("text-anchor", "middle")
    .style("alignment-baseline", "center")
    .style("font-size", 18);
}

svg.append("rect").attr("x", 0).attr("y", 0).attr("width", width/2).attr("height",height).attr("stroke", "black").attr("fill", "none");
