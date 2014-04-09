/**
 * Created by hen on 3/8/14.
 */

var margin = {
    top: 50,
    right: 50,
    bottom: 50,
    left: 50
};

var width = 1060 - margin.left - margin.right;
var height = 800 - margin.bottom - margin.top;

var bbVis = {
    x: 100,
    y: 10,
    w: width - 100,
    h: 300
};

var detailVis = d3.select("#detailVis").append("svg").attr({
    width:350,
    height:200
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


var completedataSet = {};

var centered;

// because i cannot code and i don't know how to find the max value given everything right now im sorry.
var abritrary = 200000000;

var radius_scale = d3.scale.linear().domain([0, abritrary]).range([0, 15]);

var tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden");

function loadStations(stationData) {
    d3.csv("../data/NSRDB_StationsMeta.csv",function(error,data){
        
        console.log(data);
        console.log(stationData)
       

        svg.selectAll(".dot").data(data).enter().append("circle", ".dot")
                .attr("transform", function (d) { 
                    if (projection([(parseFloat(d.NSRDB_LON)), (parseFloat(d.NSRDB_LAT))]) !== null) {
                    return "translate("+projection([(parseFloat(d.NSRDB_LON)), (parseFloat(d.NSRDB_LAT))])+")" ;}})
                .attr("r", function(d){
                    if (stationData[d.USAF] !== undefined)
                    {
                        //console.log("hi");
                        if (projection([(parseFloat(d.NSRDB_LON)), (parseFloat(d.NSRDB_LAT))]) !== null)
                        {
                                console.log(radius_scale(stationData[d.USAF].sum));

                                return radius_scale(stationData[d.USAF].sum);
                        }   
                    }

                })
                .style("fill", "#ff9500")
                .on("mouseover", function(d){
                    return tooltip.text(""+d.STATION + ", " + stationData[d.USAF].sum + "").style("visibility", "visible");
                })
                .on("mousemove", function(){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");})
                .on("mouseout", function(){return tooltip.style("visibility", "hidden");});
    });
}

function loadStats() {

    d3.json("../data/reducedMonthStationHour2003_2004.json", function(error,data){
        completeDataSet= data;

        loadStations(completeDataSet);
    })

}


d3.json("../data/us-named.json", function(error, data) {

    var usMap = topojson.feature(data,data.objects.states).features

    svg.selectAll(".country").data(usMap).enter().append("path").attr("d", function(d){
        return path(d.geometry);
    }).attr("class", "country")
    .on("click", zoomToBB);

    loadStats();
});



// ALL THESE FUNCTIONS are just a RECOMMENDATION !!!!
var createDetailVis = function(){

}


var updateDetailVis = function(data, name){
  
}

// ZOOMING
function zoomToBB(d) {
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

  svg.selectAll(".country")
      .classed("active", centered && function(d) { return d === centered; });

  
  svg.transition()
      .duration(750)
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
      .style("stroke-width", 1.5 / k + "px");
}

