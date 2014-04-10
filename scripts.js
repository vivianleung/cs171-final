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
    w: 400,
    h: 300
};

var loadedGraph = false;

var width = 960 - margin.left - margin.right;
var height = 800 - margin.bottom - margin.top;
var selected;

var bbVis = {
    x: 100,
    y: 10,
    w: width - 100,
    h: 300
};

var detailVis = d3.select("#detailVis").append("svg").attr({
    width:500,
    height:500,
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
var colors = {};
var colorDomains = {};
var factors = {};
var mins = {};
var maxs = {};

function loadFactor(factor) {
    svg.selectAll("path")
      .style("fill", function(d) {
        if(d["properties"]["name"] in factors[factor]) {
          // save most recent color
          colors[d["properties"]["name"]] = colorDomains[factor](factors[factor][d["properties"]["name"]]["rate_per_pop"]);
          return colors[d["properties"]["name"]];
        }
      })
      .style("stroke", "white");
}

function loadStats() {
  // file names for each of the factors
  var dataFiles = ["cly", "gon", "teen", "creampie", "teen-tag"];

  // iterate over all factors
  dataFiles.forEach(function(factor) {
    var filePath = "../data/" + factor + "_data.csv";

    d3.csv(filePath, function(error,data){
      // find min and max
      var min;
      var max;

      // create factor array
      factors[factor] = {}

      Object.keys(data).forEach(function(id) {
          factors[factor][data[id]["state"]] = data[id];

          // update min and max
          if(!min || data[id]["rate_per_pop"] < min)
              min = data[id]["rate_per_pop"];
          if(!max || data[id]["rate_per_pop"] > max)
              max = data[id]["rate_per_pop"];
      });

      // save min and max
      mins[factor] = min;
      maxs[factor] = max;

      // create color scale
      colorDomains[factor] = d3.scale.linear()
          .domain([min, max])
          .range(["green", "red"]);
    });
  });

  // set radio button toggle
  d3.select("input[value=\"cly\"]").
    on("click", function() {
      createDetailVis("cly");
      loadFactor("cly");
    });
  d3.select("input[value=\"gon\"]").
    on("click", function() {
      loadFactor("gon");
    });
  d3.select("input[value=\"teen\"]").
    on("click", function() {
      loadFactor("teen");
    });
  d3.select("input[value=\"creampie\"]").
    on("click", function() {
      loadFactor("creampie");
    });
  d3.select("input[value=\"teen-tag\"]").
    on("click", function() {
      loadFactor("teen-tag");
    });
}


d3.json("../data/us-named.json", function(error, data) {
    var usMap = topojson.feature(data,data.objects.states).features
    
    svg.selectAll(".country").data(usMap).enter().append("path").attr("d", path).attr("class","state")
      .on("mouseover", hover)
      .on("mouseout", hover);

    loadStats();
});

function hover(d) {
  selected = (d && selected !== d) ? d : null;

  svg.selectAll("path")
      .style("fill", function(d) {
        return (selected && d === selected) ? "orange" : colors[d["properties"]["name"]];
      });
}


function createDetailVis(factor){
    var xDetailAxis, xDetailAxis, yDetailAxis, yDetailScale;

    xDetailScale = d3.scale.linear().domain([mins["creampie"], parseInt(maxs["creampie"]) + 1]).range([10, bbDetail.w]);
    
    detailVis.append("rect");

    yDetailScale = d3.scale.linear().domain([maxs[factor],mins[factor]]).range([10, bbDetail.h]);

    xDetailAxis = d3.svg.axis()
        .scale(xDetailScale)
        .orient("bottom")
        .ticks(5);

    yDetailAxis = d3.svg.axis()
        .scale(yDetailScale)
        .orient("right")
        .ticks(6);

    // add x axis
    detailVis.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + bbDetail.h + ")")
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
          .attr("transform", "translate(10,0)")
          .call(yDetailAxis);

    var dataSet = []
    Object.keys(factors[factor]).forEach(function(id) {
      dataSet.push(factors[factor][id]);
    });

    // add bars
    var bars = detailVis.selectAll("circle")
       .data(dataSet)
       .enter()
       .append("circle")
       .attr("fill", "teal")
       .attr("cx", function(d) {
          return xDetailScale(factors["creampie"][d["state"]]["rate_per_pop"]);
       })
       .attr("cy", function(d) {
          return yDetailScale(d["rate_per_pop"]);
       })
       .attr("r", 5);

    // add title
    detailVis.append("text")
       .text(factor)
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