/**
 * Created by hen on 3/8/14.
 */

var margin = {
    top: 20,
    right: 40,
    bottom: 0,
    left: 50
};

var bbDetail = {
    x: 200,
    y: 50,
    w: 360,
    h: 320,
    p: 20
};

var loadedGraph = false;

var width = 860 - margin.left - margin.right;
var height = 400 - margin.bottom - margin.top;
var selected;

var bbVis = {
    x: 250,
    y: 10,
    w: width - 100,
    h: 300,
    p: 8
};

var detailVis = d3.select("#detailVis").append("svg").attr({
    width:400,
    height:350,
})


tooltip = d3.select('#vis').append("div").attr({id:'tooltip'}).style("position", "absolute")
  .style("z-index", "10")
  .style("visibility", "hidden");

var canvas = d3.select("#vis").append("svg").attr({
    width: width + margin.left + margin.right,
    height: height + margin.top + margin.bottom
    })


var svg = canvas.append("g").attr({
        transform: "translate(" + margin.left + "," + margin.top + ")"
    });


var projection = d3.geo.albersUsa().translate([width / 2, height / 2]).scale(800);
var path = d3.geo.path().projection(projection);

var colors = {};
var colorDomains = {};

// each object in each array of R, G, and B represent corresponding components
// of the blue (index 0) and red (index 1) scales

var colorRanges = {
  'r': [ {'min':160, 'range':141}, {'min':255, 'range':156} ], 
  'g': [ {'min':218, 'range':126}, {'min':213, 'range':121}   ],
  'b': [ {'min':242, 'range':150}, {'min':177, 'range':135}  ],
}

// var colorRanges = {
//   'r': [ {'min':160, 'range':141}, {'min':240, 'range':58} ], 
//   'g': [ {'min':218, 'range':126}, {'min':150, 'range':150}   ],
//   'b': [ {'min':242, 'range':150}, {'min':165, 'range':140}  ],
// }

// var colorRanges = {
//   'r': [ {'min':160, 'max':19}, {'min':240, 'max':182} ], 
//   'g': [ {'min':218, 'max':92}, {'min':150, 'max':0}   ],
//   'b': [ {'min':242, 'max':92}, {'min':165, 'max':30}  ],
// }

  // {'r':{'min':160, 'max':19}, 'g':{'min':218, 'max':92}, 'b':{'min':242, 'max':92}},
  // {'r':{'min':240, 'max':182}, 'g':{'min':150, 'max':0}, 'b':{'min':165, 'max':30}}


// colorRanges.forEach(function(color) {
//   for (var c in color) { c['diff'] = c.min - c.max; }
// });

var factors = {};
var mins = {};
var maxs = {};
var ranges = {};
var averages = {};
var tooltip;
var xDetailAxis, xDetailAxis, yDetailAxis, yDetailScale;

function loadFactor(factor) {

  if (factors.loaded.length == 3) {
    alert("Please de-select an option first!");
  }
  else {
    factors.loaded.push(factor);


    function colorize(datum) {

      // calculates scaled value of each factor selected
      var RGB = {'r':0,'g':0,'b':0 }

      // for each factor value
      datum.forEach(function(factorVal, i) {

        // calculates scaled value
        var scaledval = (factorVal - mins[factors.loaded[i]]) / ranges[factors.loaded[i]];

        // for each RGB component, calculates scaled color value and adds it to existing val
        for (var c in colorRanges) {
          RGB[c] += colorRanges[c][i]["min"] - scaledval*colorRanges[c][i]["range"] ; 
        }
      });


      // takes average of each RGB component 
      for (var c in RGB) { RGB[c] = Math.round(RGB[c] / datum.length); }
      var color = "rgb("+RGB.r+","+RGB.g+","+RGB.b + ")";
      return color;
    }
    


    svg.selectAll("path")
      .style("fill", function(d) {
        var values = [];
        factors.loaded.forEach(function(f) {
          if(d["properties"]["name"] in factors[f]) {
            values.push(factors[f][d["properties"]["name"]]["rate_per_pop"]);
          }
        })
        console.log(values)
        colors[d["properties"]["name"]] = colorize(values);
        return colors[d["properties"]["name"]];
      })
      .style("stroke", "white");



    // UPDATE GRAPH

    // update scales and axes
    xDetailScale.domain([mins[factor], parseInt(maxs[factor]) + 1]);
    yDetailScale.domain([maxs[factor],mins[factor]]);
    xDetailAxis.scale(xDetailScale);
    yDetailAxis.scale(yDetailScale);

    detailVis.select("g.x.axis").call(xDetailAxis)
          .selectAll("text") 
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", function(d) {
                return "rotate(-65)" 
                });

    detailVis.select("g.y.axis").call(yDetailAxis);



    // load data for selected factor
    var dataSet = [];
    Object.keys(factors[factor]).forEach(function(id) {

      dataSet.push(factors[factor][id]);
    });
    
    // update title
    detailVis.select('text.title').text(factor);

    detailVis.selectAll("circle").remove();
    // REMOVE CIRCLES


    // add bars
    var bars = detailVis.append("g")
       .selectAll("circle")
       .data(dataSet)
       .enter()
       .append("circle")
       .attr("class", "stateDot")
       .attr("cx", function(d) {
          return xDetailScale(d["rate_per_pop"]);
       })
       .attr("cy", function(d) {
          return yDetailScale(d["rate_per_pop"]);
       })
       .attr("r", 5);
  }
}

function loadStats() {
  // file names for each of the factors

  var dataFiles = ["cly", "gon", "syp", "teen", "creampie", "teen-tag"];

  // iterate over all factors
  dataFiles.forEach(function(factor) {
    var filePath = "../data/" + factor + "_data.csv";

    d3.csv(filePath, function(error,data){
      // find min, max and average
      var min;
      var max;
      var average = 0;

      // create factor array
      factors[factor] = {}

      Object.keys(data).forEach(function(id) {
          data[id]["rate_per_pop"] = parseFloat(data[id]["rate_per_pop"]);
          factors[factor][data[id]["state"]] = data[id];
          average += data[id]["rate_per_pop"];

          // update min and max
          if(!min || data[id]["rate_per_pop"] < min)
              min = data[id]["rate_per_pop"];
          if(!max || data[id]["rate_per_pop"] > max)
              max = data[id]["rate_per_pop"];
      });

      // save min and max
      mins[factor] = min;
      maxs[factor] = max;
      ranges[factor] = max - min;
      averages[factor] = average/(Object.keys(data).length);

      // create color scale
      colorDomains[factor] = d3.scale.linear()
          .domain([min, max]);
    });
  });

  d3.text("../data/porn_prefs.csv", function(text) {
    var data = d3.csv.parseRows(text);
    var headers = data.shift();
    var header_len = headers.length;
    var time_formatter = d3.time.format("%H:%M:%S");

    factors["stateID"] = {};  


    factors["porn_avg_time"] = {};
    var time_min, time_max;
    var avg_times = data.shift();
    avg_times.splice(1).forEach(function(t,i) {
      factors["stateID"][headers[i+1]] = {"state": headers[i+1], "rate_per_pop": i};
      factors["porn_avg_time"][headers[i+1]] = {"state": headers[i+1], "rate_per_pop": time_formatter.parse(t)};
      if (!time_min || time_min > time_formatter.parse(t)) { time_min = time_formatter.parse(t);}
      if (!time_max || time_max < time_formatter.parse(t)) { time_max = time_formatter.parse(t); }
    });

    mins["porn_avg_time"] = time_min;
    maxs["porn_avg_time"] = time_max;
    ranges["porn_avg_time"] = time_max - time_min;
    mins["stateID"] = 1;
    maxs["stateID"] = 51;
    ranges["stateID"] = 50;

    data.forEach(function(factor) {
      var factor_name = "porn_"+factor[0];
      factors[factor_name] = {};
      var min, max;
      for (var st=1; st<header_len; st++ ) {
        var rank = 4;
        if (factor[st]) { rank = parseInt(factor[st]);}
        factors[factor_name][headers[st]] = {"state": headers[st], "rate_per_pop": rank}

        // min and max are reversed to reflect the 
        if (!min || min < rank) { min = rank; }
        if (!max || max > rank) { max = rank; }
        
      }
      mins[factor_name] = min;
      maxs[factor_name] = max;
      ranges[factor_name] = max - min;
    })
  })

  factors.loaded = [];
}

d3.json("../data/us-named.json", function(error, data) {
    var usMap = topojson.feature(data,data.objects.states).features
    
    svg.selectAll(".country").data(usMap).enter().append("path").attr("d", path).attr("class","state")
      .on("mousemove", movetip)
      .on("mouseover", hover)
      .on("mouseout", hover)
      .on("click", displaySundial);

    loadStats();
    createDetailVis();
});

function hover(d) {
  selected = (d && selected !== d) ? d : null;

  svg.selectAll("path")
      .style("fill", function(d) {
        return (selected && d === selected) ? "#3B8686" : colors[d["properties"]["name"]];
      });

  movetip(d);
}

function movetip(d) {
  if (selected) {
    var tipHTML = d.properties.name;
    if (factors.loaded.length > 0) {
      factors.loaded.forEach(function(selector){
        tipHTML += "<br/>"+selector+": "+factors[selector][d.properties.name].rate_per_pop; 

      })
    }

    var tXY = d3.mouse(d3.select('#vis')[0][0]);
    tooltip.html(tipHTML)
      .style({visibility: 'visible'})
      .style("left",(tXY[0]+bbVis.p)+'px')
      .style("top", function() { return(tXY[1] + bbVis.x - bbVis.p)+'px';} ); 
  }
  else {
    tooltip.style({visibility: 'hidden'});
  }

}

function createDetailVis(){

    xDetailScale = d3.scale.linear().range([10, bbDetail.w]);
    yDetailScale = d3.scale.linear().range([10, bbDetail.h]);

    xDetailAxis = d3.svg.axis()
        .orient("bottom")
        .ticks(5);

    yDetailAxis = d3.svg.axis()
        .orient("left")
        .ticks(6);

    // add x axis
    detailVis.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate("+bbDetail.p/2+"," + (bbDetail.h+bbDetail.p)  + ")")

    // add y axis
    detailVis.append("g")
          .attr("class", "y axis")
          .attr("transform", "translate("+ bbDetail.p +","+bbDetail.p+")");

    // add title
    detailVis.append("text")
       .attr("fill", "teal")
       .attr("dy", 10)
       .attr("dx", 50);
}

// menu code
var menu = d3.select("#menu");

// add caption
var caption = menu.append("h2")
       .attr("id", "menu-caption");

// caption attributes
var captionText = [];

// add form
var form = menu.append("form");

// tag categories
var categories = [{id: "sh", name: "sexual health", children: ["cly", "syp", "hiv", "gon"]},
                  {id: "sb", name: "social behavior", children: ["teen", "gdp", "pop", "stateID"]},
                  {id: "porn", name: "pornography usage", children: ["creampie", "teen-tag"]}];

// possible tags
var tags = {"cly": "chlamydia",
            "syp": "syphilis",
            "hiv": "HIV",
            "gon": "gonorrhea",
            "teen": "teen pregnancy",
            "gdp": "GDP",
            "pop": "population density",
            "creampie": "teen tag",
            "stateID": "state index",
            "teen-tag": "creampie tag"};

// helper array to save on computations
var tagsArray = [];
var keys = Object.keys(tags);
for(tag in keys) {
  tagsArray.push({id: keys[tag], name: tags[keys[tag]]});
}

var currentCategory = null;

// update form with form's children
function updateForm(array) {
  // remove all (possible) nodes in form
  form.remove();

  // add form
  form = menu.append("form");

  // if already selected, add back button
  if(captionText.length > 0 || currentCategory) {
    var backButton = form.append("i");
    backButton
      .attr("class", "fa fa-arrow-left")
      .on("click", function() {
        // remove last tag
        captionText.pop();
        currentCategory = null;
        updateForm(categories);
      });
  }

  // generate buttons
  buttons = form.selectAll("input")
         .data(array)
         .enter()
         .append("input")
         .attr("type", "radio")
         .attr("id", function(d, i) {
            return "radio" + (i + 1);
         })
         .attr("name", "radios")
         .attr("value", function(d) {
            return d.id;
         });

  // add labels
  var labels = form.selectAll("input").each(function(d, i) {
      var label = document.createElement("label");
      label.setAttribute("for", "radio" + (i + 1));
      label.innerHTML = array[i].name;
      this.parentNode.insertBefore(label, this.nextSibling);
  });

  // update caption text
  if(captionText.length > 0) {
    text = "compare";
    captionText.forEach(function(d, i) {
      text += " " + d.name;
      // format punctuation and grammar
      if(i == captionText.length - 1 && captionText.length < 3) {
        text += " and..."
      }

      else if(i < captionText.length - 1 && !(i == 1 && captionText.length == 3)){
        text += ", ";
      }

      else if(i == 1 && captionText.length == 3) {
        text += " and ";
      }
    });

    caption.text(text);
  }

  else if(currentCategory){
    caption.text("show me " + currentCategory + " data on...");
  }

  else {
    caption.text("show me data from...");
  }

  // set radio button toggle for first selection
  array.forEach(function(d, i) {
    d3.select("input[value=\"" + d.id + "\"]").
      on("click", function() {
        // go into category
        if(d.children) {
          currentCategory = d.name;
          updateForm(tagsArray.filter(function(el, j) {
            return (d.children.indexOf(el.id) > -1) && (captionText.indexOf(el) < 0);
          }));
        }

        // add element to caption and return to categories
        else {
          currentCategory = null;
          // add category to caption
          captionText.push(d);
          loadFactor(d.id);
          updateForm(categories);
        }
      });
  });
}

updateForm(categories);

// sundial code

function displaySundial(d) {
  var points = [];
  var average = [];

  var tagIds = tagsArray.map(function(d) {
    return d.id;
  });

  if(factors) {
    for(key in factors) {
      if(tagIds.indexOf(key) >= 0) {
        points.push({"axis": tags[key].toUpperCase(), "value": (factors[key][d.properties.name].rate_per_pop)/(maxs[key] - mins[key])});
        average.push({"axis": tags[key].toUpperCase(), "value": averages[key]/(maxs[key] - mins[key])});
      }
    } 

    var attributes = {
      color: function(i){
        return (i == 1) ? "#97d9d9" : "#00d9bd";
      },
      w: 400,
      h: 350,
      labels: [d.properties.name, "National Average"]
    }

    RadarChart.draw("#detailVis", [points, average], attributes);
  }
}
