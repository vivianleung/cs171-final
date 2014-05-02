/**
 * Created by hen on 3/8/14.
 */

var margin = {
    top: 20,
    right: 40,
    bottom: 0,
    left: -60
};

var bbVis = {
    x: 250,
    y: 10,
    w: width,
    h: 300,
    p: 8
};

var bbDetail = {
    x: 200,
    y: 50,
    w: 360,
    h: 320,
    p: 20,
    r: 5
};

var loadedGraph = false;
var width = 700 - margin.left - margin.right;
var height = 400 - margin.bottom - margin.top;
var selected;
var clickedState;

var detailVis = d3.select("#detailVis").append("svg").attr({
    width:(bbDetail.w+5*bbDetail.p),
    height:(bbDetail.h+5*bbDetail.p),
    })
    .append("g")
    .attr("transform", "translate("+(2*bbDetail.p)+","+bbDetail.p+")");



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

// each object in each array of R, G, and B represent corresponding components
// of the blue (index 0) and red (index 1) scales

var colorRanges = {
  'r': [ {'min':160, 'range':141}, {'min':255, 'range':156} ], 
  'g': [ {'min':218, 'range':126}, {'min':213, 'range':121}   ],
  'b': [ {'min':242, 'range':150}, {'min':177, 'range':135}  ],
}

var colors = {};
var colorDomains = {};
var factors = {};
var mins = {};
var maxs = {};
var ranges = {};
var averages = {};
var tooltip;
var xDetailAxis, xDetailAxis, yDetailAxis, yDetailScale, hDetailScale;

function loadFactor(factor) {

  if (factors.loaded.length == 3) {
    alert("Please de-select an option first!");
  }
  else {
    factors.loaded.push(factor);
    updateMap();
  }
}
function updateMap() {

    // calculates RGB color value for datum based on selected factor(s)
    var colorize = function(datum) {

      var scaled_factors_sum = 0;
      var scaled_factors = [];

      // scaled value for the factor by factor's range
      datum.forEach(function(raw_factor, i) {
        scaled_factors.push((raw_factor - mins[factors.loaded[i]]) / ranges[factors.loaded[i]]);
        scaled_factors_sum += scaled_factors[i];
      })
      var RGB = {};
      // for each RGB component, sum of [(scaled color value, by factor value) * factor weight in datum]
      for (var c in colorRanges) {
        var prima_color = 0;          
        scaled_factors.forEach(function(scaled_fact, i) {
          var factor_ratio; 
          if (scaled_factors_sum == 0) { factor_ratio = 1/scaled_factors.length }
          else { factor_ratio = scaled_fact/scaled_factors_sum; }
          // factor ratio scaling to weigh a state's factor values, i.e. to reflect whether there is correlation between factors
          prima_color += (colorRanges[c][i]["min"] - scaled_fact*colorRanges[c][i]["range"]) * factor_ratio;
        })
        RGB[c] = Math.round(prima_color);
      }

      var color = "rgb("+RGB.r+","+RGB.g+","+RGB.b + ")";
      return color;
    }
    
  // most recently selected factor
  var factor = "";

  // removes old circles
  detailVis.select("g.factordata").remove();

  // if no factors selected, reset state colors to default color
  if (factors.loaded.length == 0) {
    svg.selectAll("path")
      .style("fill", function(d) {
        colors[d["properties"]["name"]] = "#97d9d9";
        return "#97d9d9";
      })
    .style("stroke", "white");
  }

  // if factors are selected
  else {

    var params = factors.loaded;

    // sets state color
    svg.selectAll("path")
      .style("fill", function(d) { 
        var state_values = [];
        params.forEach(function(f) {
          if(d["properties"]["name"] in factors[f]) {
            state_values.push(factors[f][d["properties"]["name"]]["rate_per_pop"]);
          }
        })
        colors[d["properties"]["name"]] = colorize(state_values);          
        return colors[d["properties"]["name"]];
      })
      .style("stroke", "white");

  
    // GRAPH UPDATES!

    // 1 factor selected:  Histogram
    if(params.length == 1) {
      params = params[0];

      // update domain of quantize scale for binning
      hDetailScale.domain([mins[params], maxs[params]]);
      // set up values dataSet with bins
      var values = [];
      hDetailScale.range().forEach(function(bin) { values[bin] = {states:[]} });

      // sort states into bins
      Object.keys(factors[params]).forEach(function(st) {
        var obj = {};
        obj["state"] = st;
        obj["rate_per_pop"] = factors[params][st]["rate_per_pop"];
        var bin = hDetailScale(obj["rate_per_pop"]);
        values[bin].states.push(obj);
      })
 
       // sets x scale, axis (for plotting) with padding to accomodate bins
      var bin_value_size = hDetailScale.invertExtent(1)[1]-hDetailScale.invertExtent(1)[0];
      xDetailScale.domain([mins[params]-bin_value_size/2, maxs[params]+bin_value_size/2]);

      var roundTo = 0;
      var quotient = ranges[params]/12;
      if (quotient < 1) {
        do { quotient = quotient*12;
             roundTo--; }
        while (quotient < 1);
      }
      else if (quotient >= 12) {
        do { quotient = quotient/12;
             roundTo++; }
        while (quotient >= 12);
      }

      // make tick vlues based on hDetail range (invert?)
      xDetailAxis.scale(xDetailScale)
        .tickValues(function(d) {
          var v = values.map(function(b, i) {
            b["val"] =  d3.round(hDetailScale.invertExtent(i)[1]-bin_value_size/2, roundTo); 
            return b["val"];
          })
          return v;
        })

      // counts frequencies, sets up y scale: (1) find domain, (2) set scale, axis
      var bin_min;
      var bin_max;
      values.forEach(function(b, i) {
        var freq = b.states.length;
        b["freq"] = freq;
        if (!bin_min || bin_min > b["freq"]) {bin_min = b["freq"];}
        if (!bin_max || bin_max < b["freq"]) { bin_max= b["freq"];}
      })

      yDetailScale.domain([bin_max, 0]);
      yDetailAxis.scale(yDetailScale);

      // append bars for each bin (adjust position for tick)
      detailVis.select("g.x.axis").call(xDetailAxis)
          .selectAll("text:not(.label)") 
          .style("text-anchor", "end")
          .attr("dx", "-.8em").attr("dy", ".15em")
          .attr("transform", function(d) { return "rotate(-65)" });
      detailVis.select("g.x.axis").select("text.label").text(tags[params]);

      detailVis.select("g.y.axis").call(yDetailAxis)
        .select("text.label").text("Frequency");
      var bar_pad = 2;
      
      var bin_plot_size = xDetailScale(hDetailScale.invertExtent(1)[1]) - xDetailScale(hDetailScale.invertExtent(1)[0])
      // add bars
      var bars = detailVis.append("g")
         .attr("class","factordata")
         .attr("transform","translate("+bbDetail.p+","+bbDetail.p+")")
         .selectAll("rect")
         .data(values)
         .enter()
         .append("rect")
         .attr({class:"stateBar", width:bin_plot_size - 2*bar_pad})
         .attr("height", function(d) {return yDetailScale(d.freq)})
         .attr("x", function(d) { return xDetailScale(d.val) - bar_pad - bin_plot_size/2; })
         .attr("y", function(d) {return bbDetail.h - yDetailScale(d.freq); });
         

      // tooltip stuff
  




    }

    // // 2 factors selected:  XY Plot
    // else if (params.length == 2) {


    // }


    // // update scales and axes with appropriate domains
    // xDetailScale.domain([mins[params[0]], maxs[params[0]]]);

    // yDetailScale.domain([maxs[params[0]], 0]);

    // xDetailAxis.scale(xDetailScale);
    // yDetailAxis.scale(yDetailScale);

    // var xAxis = detailVis.select("g.x.axis")
    // var factor = params[0];
    // xAxis.call(xDetailAxis)
    //     .selectAll("text:not(.label)") 
    //     .style("text-anchor", "end")
    //     .attr("dx", "-.8em").attr("dy", ".15em")
    //     .attr("transform", function(d) { return "rotate(-65)" });

    // xAxis.select("text.label").text(factor)

    // detailVis.select("g.y.axis").call(yDetailAxis)
    //   .select("text.label").text(factor);

    // var dataSet = [];
    //   Object.keys(factors[factor]).forEach(function(id) {
    //     dataSet.push(factors[factor][id]);
    //   });
    // console.log(dataSet)


    // // add bars
    // var bars = detailVis.append("g")
    //    .attr("class","circles")
    //    .attr("transform","translate("+bbDetail.p+","+bbDetail.p+")")
    //    .selectAll("circle")
    //    .data(dataSet)
    //    .enter()
    //    .append("circle")
    //    .attr("class", "stateDot")
    //    .attr("cx", function(d) {
    //       return xDetailScale(d["rate_per_pop"]);
    //    })
    //    .attr("cy", function(d) {
    //       return yDetailScale(d["rate_per_pop"]);
    //    })
    //    .attr("r", bbDetail.r);

    // }

    // update title
    detailVis.select('text.title').text(factor);
  }
}

// possible tags
var tags = {"cly": "chlamydia",
            "syp": "syphilis",
            "hiv": "HIV",
            "gon": "gonorrhea",
            "teen": "teen pregnancy",
            "gdp": "GDP",
            "pop": "population density",
            "creampie": "teen tag",
            "teen-tag": "creampie tag"};

// possible tags
var scales = {"cly": {scale: 100000, unit: "people"},
              "syp": {scale: 100000, unit: "people"},
              "hiv": {scale: 100000, unit: "people"},
              "gon": {scale: 100000, unit: "people"},
              "teen": {scale: 1000, unit: "teenage girls"},
              "gdp": {scale: null, unit: "billions"},
              "pop": {scale: null, unit: "millions"},
              "teen-tag": {scale: 3, unit: "top 3"},
              "creampie": {scale: 3, unit: "top 3"}};

function loadStats() {
  // file names for each of the factors

  var dataFiles = ["cly", "gon", "syp", "teen", "gdp", "pop"];

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
      console.log(factor, Object.keys(data))
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

    factors["porn_avg_time"] = {};
    var time_min, time_max;
    var avg_times = data.shift();
    avg_times.splice(1).forEach(function(t,i) {
      factors["porn_avg_time"][headers[i+1]] = {"state": headers[i+1], "rate_per_pop": time_formatter.parse(t)};
      if (!time_min || time_min > time_formatter.parse(t)) { time_min = time_formatter.parse(t);}
      if (!time_max || time_max < time_formatter.parse(t)) { time_max = time_formatter.parse(t); }
    });

    mins["porn_avg_time"] = time_min;
    maxs["porn_avg_time"] = time_max;
    ranges["porn_avg_time"] = time_max - time_min;

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
      tags[factor_name] = factor[0];
      categories[2].children.push(factor_name);
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
        return ((selected && d === selected) || (clickedState === d)) ? "#3B8686" : colors[d["properties"]["name"]];
      });

  movetip(d);
}

function movetip(d) {
  if (selected) {
    var tipHTML = d.properties.name;
    if (factors.loaded.length > 0) {
      factors.loaded.forEach(function(selector){
        tipHTML += "<br/>"+tags[selector]+": "+factors[selector][d.properties.name].rate_per_pop; 

      })
    }

    var tXY = d3.mouse(d3.select('#vis')[0][0]);
    tooltip.html(tipHTML)
      .style({visibility: 'visible'})
      .style("left",(tXY[0]+bbVis.p+80)+'px')
      .style("top", function() { return(tXY[1] + bbVis.x - bbVis.p - 5)+'px';} ); 
  }
  else {
    tooltip.style({visibility: 'hidden'});
  }

}

function createDetailVis(){

    // scales and axes (to update with domains of user-selected factors)
    xDetailScale = d3.scale.linear().range([10, bbDetail.w]);
    yDetailScale = d3.scale.linear().range([10, bbDetail.h]);
    hDetailScale = d3.scale.quantize().range(d3.range(12));

    xDetailAxis = d3.svg.axis().orient("bottom").ticks(5);
    yDetailAxis = d3.svg.axis().orient("left").ticks(6);




    // add x axis
    detailVis.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate("+bbDetail.p+"," + (bbDetail.h+bbDetail.p)  + ")")
          .append("text")
          .style("text-anchor", "end")
          .attr({class:"label", dx:bbDetail.w+"px", dy:(2*bbDetail.p) +"px"});
        
    // add y axis
    detailVis.append("g")
          .attr("class", "y axis")
          .attr("transform", "translate("+(bbDetail.p+2*bbDetail.r)+","+bbDetail.p+")")
          .append("text")
          .style("text-anchor", "end")
          .attr({class:"label", dy:(-bbDetail.p)+"px"})
          .attr("transform", function(d) { return "rotate(-90)" });


    // add title
    detailVis.append("text")
       .attr({class:"title",fill:"teal","text-anchor":"middle",
              dx:(bbDetail.w/2+bbDetail.p)+"px",y:(bbDetail.p)+"px"});
}

// menu code
var menu = d3.select("#menu");

// add caption
var caption = menu.append("h2").attr("id", "menu-caption");

// caption attributes
var captionText = [];

// add form
var form = menu.append("form");

// tag categories
var categories = [{id: "sh", name: "sexual health", children: ["cly", "syp", "hiv", "gon"]},
                  {id: "sb", name: "social behavior", children: ["teen", "gdp", "pop"]},
                  {id: "porn", name: "pornography usage", children: []}];

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
        factors.loaded.pop();
        updateMap();
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
      text += " " + '<span class="factor">' + d.name + '</span>';
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

    caption.html(text);
  }

  else if(currentCategory){
    caption.html("show me " + currentCategory + " data on...");
  }

  else {
    caption.html("show me data from...");
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
  // hide tip
  d3.select(".fa-arrow-down").style("display", "none");
  d3.select("#tip > p").style("display", "none");

  // toggle state selection
  clickedState = (clickedState == d) ? null : d;

  svg.selectAll("path")
      .style("fill", function(e) {
        return (clickedState == e) ? "#3B8686" : colors[e["properties"]["name"]];
      });

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
      h: 400,
      labels: [d.properties.name, "National Average"]
    }

    RadarChart.draw("#detailVis", [points, average], attributes);
  }
}
