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
  .attr("width",  width*2)
  .attr("height", height)
  .attr("id","worldmap");

var g = d3.select("#group");

var g2 = svg.append("g");

function resetMap(){
    g.transition().duration(800).attr("transform", "translate("+ 0+"," + 0 +")");
    g2.transition().duration(800).attr("transform", "translate("+ 0+"," + 0 +")");
    d3.selectAll("path").style("fill","purple");
}

//allow to double click and zoom out
svg.on("dblclick",function(){ 
   resetMap();
});

var opacityScale = d3.scale.log().domain([1,2]).range([0.05,1]);

d3.json("data/internet-users.json", function(error1, userData) {
  if (error1) { return console.log(error1); }     
  d3.json("data/world-topo-min.json", function(error2, world) {
      if (error2) { return console.log(error2); }     
      var countries = topojson.feature(world, world.objects.countries).features;
      var isMouseDown = false;

      g.selectAll("path")
        .data(countries)
        .enter().append("path")
        .attr("d",path)
        .style("fill", "purple")
        .style("stroke", "#888")
        .style("fill-opacity", function(d){return calcOpacity(d)})
        .attr("title", function(d){return d.properties.name})
        .attr("id", function(d){return "country" + d.id;})
        .on("click", function(d){ worldMapClicked(d,true) })
        .on("dblclick", function(d){ worldMapClicked(d,false) })
        .on("mouseover", function(d) {
          console.log("hover");
          d3.select("#country" + d.id).style("stroke", "black");
        })
        .on("mouseout", function(d) {
          d3.select("#country" + d.id).style("stroke", "#888");
        });

      g2.selectAll("path")
       .data(countries)
       .enter().append("path")
       .attr("d", path2)
       .style("fill", "purple")
       .style("stroke", "#888")
       .style("fill-opacity", function(d){ return calcOpacity(d) })
       .attr("title", function(d){ return d.properties.name; })
       .attr("id", function(d){ return "country"+d.id; })
       .on("click", function(d){ worldMapClicked(d,true); })
       .on("dblclick", function(d){ worldMapClicked(d,false); })
       .on("mouseover", function(d) {
          console.log("hover");
          d3.select("#country" + d.id).style("stroke", "black");
        })
        .on("mouseout", function(d) {
          d3.select("#country" + d.id).style("stroke", "#888");
        });

      function calcOpacity(d){
        var internet_user_data = userData.find(function(data) {
          return data.Country == d.properties.name; 
        });
        if (internet_user_data == null) {
          internet_user_data = { "Internet" : 0};
        }
        return internet_user_data.Internet;
      }

      function worldMapClicked(c,isSingleClick) {
        if (isSingleClick) {
          var centroid = path.centroid(c),
              [x,y] = centroid,
              [[left, top],[right, bottom]]=path.bounds(c),
              cHeight = bottom-top,
              cWidth = right - left,
               k = 1;
               x = x;
          if (cHeight > cWidth){
            k = (height / cHeight) / 1.6;
          }
          else {
            k = width / 2 / cWidth / 2.3;
          }

          if (k < 0.5) { k=1; }
          else if (k < 1.5) { k = 1.8; }
          else { k = k; }
          //console.log("width  :"+cWidth + "  height   :"+cHeight +"  K   :"+k)
          //data anomoly in France
          if(c.properties.name == "France"){ k = 7; }

          d3.selectAll("path").style("fill","grey");

          //g.append("circle").attr("cx",x).attr("cy",y).attr("r",5);
          var countryPath = d3.selectAll("#country"+c.id)[0][0];
          countryPath.style.fill = "purple";
          //console.log(d3.selectAll("#country"+c.id))
          g.transition().duration(800)
           .attr("transform", "translate(" + width / 4 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
           .style("stroke-width", 1.5 / k + "px");
          g2.transition().duration(800)
           .attr("transform", "translate(" + width / 4 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
           .style("stroke-width", 1.5 / k + "px");
        } else {
          resetMap();
        }
      };
  });               
});

d3.json("data/cable_data.json", function(error, cables) {
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
        pathString += lon+","+lat+" ";
      });
      result.push(pathString);
    });

    [lonMinOri, lonMaxOri, latMinOri, latMaxOri] = [d3.min(lonArray), d3.max(lonArray), d3.min(latArray), d3.max(latArray)];

    var dist1 = lonMax-lonMin;
    var dist2 = projection2([lonMinOri,0])[0] - lonMax;
    if (dist1 < dist2) {
      center = [lonMin + dist1 / 2,latMin + (latMax - latMin) / 2]; 
      cableWidth = dist1;
    }
    else {
      center = [lonMax + (dist2 / 7),latMin + (latMax - latMin) / 2]; 
      cableWidth = dist2 / 0.9;
    }

    cableHeight = height / (latMax - latMin) / 1.5;
    cableWidth = width / 1.5 / cableWidth / 2.2;
    min = cableWidth;
    if (cableHeight<cableWidth){
      min = cableHeight;
    }

    return {"coords": result,"height": cableHeight,"width": cableWidth,"min":min,"center": center};
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
    coordToStringResult.coords.forEach(function(paths) {
      g.append("polyline")
      .attr("style","fill:none;stroke:"+color+";stroke-width:1.6")
      .attr("points",paths)
      .attr("id","cable"+cable.cable_id)
      .attr("title",cable.id)
      .on("click",function(){
        var k = coordToStringResult.min;
        //console.log(coordToStringResult)
        var[x,y] = coordToStringResult.center;
        g.transition().duration(800)
        .attr("transform", "translate(" + width/4 + "," + height / 2 + ") scale(" + k + ")translate(" + + -x + "," + -y + ")");  
        g2.transition().duration(800)
        .attr("transform", "translate(" + width/4 + "," + height / 2 + ") scale(" + k + ")translate(" + + -x + "," + -y + ")");
        d3.selectAll("circle").remove();
        g.append("circle").attr("cx",x).attr("cy",y).attr("r",10)  ;          
        d3.selectAll("polyline").attr("style","opacity:0.5;fill:none;stroke:" + "grey" + ";stroke-width:1");
        d3.selectAll("#cable"+cable.cable_id).attr("style","fill:none;stroke:" + color + ";stroke-width:6");
      })
      .on("mouseover", function() {
          d3.selectAll("#cable"+cable.cable_id).style("stroke-width", "6");
      })
      .on("mouseout", function() {
          d3.selectAll("#cable"+cable.cable_id).style("stroke-width", "1.6");
      });
    });

    var coordToStringResult2 = coordToString(cable.coordinates,projection2);

    coordToStringResult2.coords.forEach(function(paths) {
    g.append("polyline")
      .attr("style", "fill:none;stroke:" + color + ";stroke-width:1.6")
      .attr("points",paths)
      .attr("id","cable" + cable.cable_id)
      .on("click",function(){
        var k = coordToStringResult.min;
        //console.log(coordToStringResult)
        var[x,y] = coordToStringResult.center;

        g.transition().duration(800)
        .attr("transform", "translate(" + width/4 + "," + height / 2 + ") scale(" + k + ")translate(" + -x + "," + -y + ")");  
        g2.transition().duration(800)
        .attr("transform", "translate(" + width/4 + "," + height / 2 + ") scale(" + k + ")translate(" + -x + "," + -y + ")");
        d3.selectAll("circle").remove();
        g.append("circle").attr("cx",x).attr("cy",y).attr("r",10)  ;          

        d3.selectAll("polyline").attr("style","opacity:0.5;fill:none;stroke:" + "grey" + ";stroke-width:1");
        d3.selectAll("#cable" + cable.cable_id).attr("style","fill:none;stroke:" + color + ";stroke-width:6");
      })
      .on("mouseover", function() {
          d3.selectAll("#cable" + cable.cable_id).style("stroke-width", "6");
      })
      .on("mouseout", function() {
          d3.selectAll("#cable" + cable.cable_id).style("stroke-width", "1.6");
      });
    });
  });
});

svg.append("rect").attr("x", 0).attr("y", 0).attr("width", width/2).attr("height",height).attr("stroke", "black").attr("fill", "none");
