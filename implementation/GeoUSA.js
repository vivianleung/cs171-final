/**
 * Created by hen on 3/8/14.
 */

var margin = {
    top: -200,
    right: 50,
    bottom: 50,
    left: 50
};

var bbDetail = {
    x: 300,
    y: 0,
    w: 250,
    h: 150
};

var loadedGraph = false;

var width = 960 - margin.left - margin.right;
var height = 800 - margin.bottom - margin.top;
var centered;

var bbVis = {
    x: 100,
    y: 10,
    w: width - 100,
    h: 300
};

var detailVis = d3.select("#detailVis").append("svg").attr({
    width:400,
    height:250,
})

var canvas = d3.select("#vis").append("svg").attr({
    width: width + margin.left + margin.right,
    height: height + margin.top + margin.bottom
    })

var svg = canvas.append("g").attr({
        transform: "translate(" + margin.left + "," + margin.top + ")"
    });


var projection = d3.geo.albersUsa().translate([width / 2, height / 2]);//.precision(.1);
var path = d3.geo.path().projection(projection);

var dataSet = {};

function loadStations(sums, radiusScale) {
    d3.csv("../data/NSRDB_StationsMeta.csv",function(error,data){
        var constant = 3.5;

        var stations = svg.selectAll(".station")
            .data(data)
            .enter()
            .append("circle")
            .attr("display", function(d) {
                if(projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]]))
                    return "block";
                else
                    return "none";
            })
            .attr("r", function(d) {
                var radius = radiusScale(sums[d["USAF"]]);
                return radius ? radius : 2;
            })
            .attr("class", function(d) {
                return (sums[d["USAF"]]) ? "hasData" : "station";
            })
            .attr("cx", function(d) {
                if(projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]]))
                    return projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]])[0];
            })
            .attr("cy", function(d) {
                if(projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]]))
                    return projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]])[1];
            })
            .on("click", function(d) {
                if(!loadedGraph)
                    createDetailVis(d);
                else
                    updateDetailVis(d);
            })
            .on("mouseover", function(node, i) {
                d3.select(this)
                    .style("fill", "red");
                // show tooltip
                tooltips.style("display", function(tip, j) {
                  if(i == j)
                    return "block";
                  else
                    return "none";
                });
                boxes.style("display", function(box, j) {
                  if(i == j)
                    return "block";
                  else
                    return "none";
                });
                trigs.style("display", function(trig, j) {
                  if(i == j)
                    return "block";
                  else
                    return "none";
                });
            })
            .on("mouseout", function(node, i) {
                d3.select(this)
                    .style("fill", "teal");
                // hide tooltip
                tooltips.style("display", function(tip, j) {
                  if(i == j)
                    return "none";
                });
                boxes.style("display", function(box, j) {
                  if(i == j)
                    return "none";
                });  
                trigs.style("display", function(trig, j) {
                  if(i == j)
                    return "none";
                });  
            });
        // tooltip boxes
        var boxes = svg.selectAll("rect")
          .data(data)
          .enter()
          .append("rect");

        var tooltipBoxes = boxes
          .attr("x", function(d) {
            if(projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]])) {
                return parseInt(projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]])[0]) - ("Station: " + d["STATION"]).length * constant;

            }

          })
          .attr("y", function(d) {
            if(projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]]))
                return parseInt(projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]])[1]) - 69.5;

          })
          .attr("text-anchor", "middle")
          .attr("width", function(d) {
            return 2 * constant * ("Station: " + d["STATION"]).length;
          })
          .attr("height", 50)
          .attr("fill", "#2f8e89")
          .attr("opacity", 0.8)
          .attr("display", "none");

        // tooltip triangle
        var trigs = svg.selectAll(".path")
          .data(data)
          .enter()
          .append("path");

        var trigPath = trigs
           .attr("transform", function(d) {
             if(projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]]))
                     return "translate("+(parseInt(projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]])[0]) - 10)+","+(parseInt(projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]])[1]) - 25)+")"; 

           })
          .attr("d", "M 5 5 L 15 5 L 10 15 Z")
          .attr("fill", "#2f8e89")
          .attr("opacity", 0.8)
          .attr("display", "none");

        // tooltips
        var tooltips = svg.selectAll("text")
          .data(data)
          .enter()
          .append("text");

        var tooltipLabels = tooltips
          .attr("text-anchor", "middle")
          .attr("id", "tooltip")
          .attr("fill", "white")
          .attr("display", "none")
          .attr("font-size", 10)
          .attr("x", function(d) {
            if(projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]]))
                    return projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]])[0];    

          })
          .attr("y", function(d) {
            if(projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]]))
                    return projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]])[1] - 50; 

          })
          .append("tspan")
          .style("font-weight", "bold")
          .text("Station: ");

        // station name
        tooltips.append("tspan")
          .style("text-transform", "capitalize")
          .text(function(d) {
            return d["STATION"].toLowerCase();
          });

        // aggregated value
        tooltips.append("tspan")
          .attr("x", function(d) {
            if(projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]]))
                    return projection([d["NSRDB_LON(dd)"], d["NSRDB_LAT (dd)"]])[0];    

          })
          .attr("dy", 20)
          .style("font-weight", "bold")
          .text("Value: ");

        tooltips.append("tspan")
          .text(function(d) {
            return sums[d["USAF"]] ? sums[d["USAF"]] : "NA";
          })
    });
}

function loadStats() {

    d3.json("../data/reducedMonthStationHour2003_2004.json", function(error,data){
        completeDataSet = data;
        dataSet = data;
        
        // compile sums for each station
        var sums = {};
        for(var month = 0; month < 12; month++) {
            Object.keys(completeDataSet[month]).forEach(function(id) {
                if(!sums[id]){
                    sums[id] = completeDataSet[month][id]["sum"];
                }

                else {
                    sums[id] += completeDataSet[month][id]["sum"];
                }
            });
        }
        
        // find min and max
        var min;
        var max;

        Object.keys(sums).forEach(function(id) {
            if(!min || sums[id] < min)
                min = sums[id]
            if(!max || sums[id] > max)
                max = sums[id];
        });

        // create scale
        var radiusScale = d3.scale.linear()
            .domain([min, max])
            .range([2, 7]);

        loadStations(sums, radiusScale);
    })

}


d3.json("../data/us-named.json", function(error, data) {
    var usMap = topojson.feature(data,data.objects.states).features
    
    svg.selectAll(".country").data(usMap).enter().append("path").attr("d", path).attr("class","state").on("click", clicked);
    loadStats();
});

function clicked(d) {
  var x, y, k;

  if (d && centered !== d) {
    var centroid = path.centroid(d);
    x = centroid[0];
    y = centroid[1];
    k = 4;
    centered = d;
  } else {
    x = width / 2;
    y = height / 2;
    k = 1;
    centered = null;
  }

  svg.selectAll("path")
      .classed("active", centered && function(d) { return d === centered; });

  svg.transition()
      .duration(750)
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
      .style("stroke-width", 1.5 / k + "px");
}


// ALL THESE FUNCTIONS are just a RECOMMENDATION !!!!
function createDetailVis(d){
    var xDetailAxis, xDetailAxis, yDetailAxis, yDetailScale;

    xDetailScale = d3.scale.linear().domain([0, 24]).range([0, bbDetail.w]);
    
    detailVis.append("rect");

    // data by hour
    hours = {};
    for(var month = 0; month < 12; month++) {
        if(dataSet[month][d["USAF"]]) {
            for(hour in dataSet[month][d["USAF"]]["hourly"]){
                if(!hours[hour]) {
                    hours[hour] = dataSet[month][d["USAF"]]["hourly"][hour];
                }
                else {
                    hours[hour] += dataSet[month][d["USAF"]]["hourly"][hour];
                }
            }
        }
    }

    hoursArray = [];
    for(var hour = 0; hour < 24; hour++) {
        if(hours[hour])
            hoursArray.push(hours[hour])
        else
            hoursArray.push(0);
    }

    // find min and max
    var min;
    var max;

    Object.keys(hours).forEach(function(id) {
        if(!min || hours[id] < min)
            min = hours[id]
        if(!max || hours[id] > max)
            max = hours[id];
    });

    yDetailScale = d3.scale.linear().domain([max,min]).range([0, bbDetail.h]);

    xDetailAxis = d3.svg.axis()
        .scale(xDetailScale)
        .orient("bottom")
        .ticks(25)
        .tickFormat(function(d) {
            return d + ":00"
        });

    yDetailAxis = d3.svg.axis()
        .scale(yDetailScale)
        .orient("right")
        .ticks(6);

    /*var line = d3.svg.line()
        .interpolate("linear")
        .x(function(d) { return xOverviewScale(new Date(d.date)) })
        .y(function(d) { return yOverviewScale(parseInt(d.value)) })

    var line2 = d3.svg.line()
        .interpolate("linear")
        .x(function(d) { return xDetailScale(new Date(d.date)) })
        .y(function(d) { return bbOverview.h + 50 + yDetailScale(parseInt(d.value)) })*/

    // add x axis
    detailVis.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(70," + (bbDetail.h + 30) + ")")
          .call(xDetailAxis)
          .selectAll("text")  
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", function(d) {
                return "rotate(-65)" 
                });

    // add y axis
    detailVis.append("g")
          .attr("class", "y axis")
          .attr("transform", "translate(" + (70+bbDetail.w) + ",30)")
          .call(yDetailAxis);

    // add bars
    var bars = detailVis.selectAll("rect")
       .data(hoursArray)
       .enter()
       .append("rect")
       .attr("fill", "teal")
       .attr("x", function(d,i) {
            return 60 + i * bbDetail.w / 24;
       })
       .attr("y", function(d,i) {
            return 30 + bbDetail.h - yDetailScale(max - hoursArray[i]);
       })
       .attr("width", 5)
       .attr("height", function(d,i) {
            return yDetailScale(max - hoursArray[i]);
       });

    // add title
    detailVis.append("text")
       .text(d["STATION"])
       .attr("fill", "teal")
       .attr("dy", 10)
       .attr("dx", 50)

    loadedGraph = true;
}


function updateDetailVis(d){
    // data by hour
    hours = {};
    for(var month = 0; month < 12; month++) {
        if(dataSet[month][d["USAF"]]) {
            for(hour in dataSet[month][d["USAF"]]["hourly"]){
                if(!hours[hour]) {
                    hours[hour] = dataSet[month][d["USAF"]]["hourly"][hour];
                }
                else {
                    hours[hour] += dataSet[month][d["USAF"]]["hourly"][hour];
                }
            }
        }
    }

    hoursArray = [];
    for(var hour = 0; hour < 24; hour++) {
        if(hours[hour])
            hoursArray.push(hours[hour])
        else
            hoursArray.push(0);
    }

    // find min and max
    var min;
    var max;

    Object.keys(hours).forEach(function(id) {
        if(!min || hours[id] < min)
            min = hours[id]
        if(!max || hours[id] > max)
            max = hours[id];
    });

    yDetailScale = d3.scale.linear().domain([max,min]).range([0, bbDetail.h]);

    // add bars
    var bars = detailVis.selectAll("rect")
       .attr("x", function(d,i) {
            return 60 + i * bbDetail.w / 24;
       })
       .attr("y", function(d,i) {
            return 30 + bbDetail.h - yDetailScale(max - hoursArray[i]);
       })
       .attr("width", 5)
       .attr("height", function(d,i) {
            return yDetailScale(max - hoursArray[i]);
       });
}



// ZOOMING
function zoomToBB() {


}

function resetZoom() {
    
}


