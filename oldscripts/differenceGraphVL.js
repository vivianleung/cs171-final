var bbVis, brush, createVis, dataSet, handle, height, margin, width, ANames;

margin = {
  top: 50, right: 50, bottom: 50, left: 50
};

width = 960 - margin.left - margin.right;
height = 570 - margin.bottom - margin.top;

bbVis = {
  x: 0 + 100, y: 10, w: width - 100, h: 300
};

var pad = 10, LBoxLen = 10, ttPad = 5;

var Yinput = 'pop', lastScaleInput = 'pop',
    lastConsensusInput = 'all', lastDivergeSelect = 'raw',
    lastDivergeTypeInput = 'absolute';

dataSet = [];
ANames = {};

d3.csv("timeline.csv", function(error, data) {
  if (error) {console.log(error); }
  else {
    var keys = d3.keys(data[0]);
    keys.splice(keys.indexOf('Year'), 1);

    var consensus = {};
    data.forEach(function(t) { 
      t.Year = parseInt(t.Year);
      if (t.Year >= 0) {
        var ests = [], num = 0;
        keys.forEach(function(d) { if (t[d]) { 
          ests.push(parseInt(t[d])); 
          num++; } })
        if (num > 0) {
          var ext = d3.extent(d3.values(ests));
          var avg = Math.floor(d3.values(ests).reduce(function(a, b){return a+b;})/num);
          consensus[t.Year] = {'year':t.Year,'pop':avg,'min':ext[0],'max': ext[1],'absolute':0,'percent':0};
    }}});

    dataSet = keys.map( function(a, i) {
      ANames[a] = i; var values = [];
      data.forEach( function(d) { if (d[a] && d.Year >= 0) { 
        d.Year = parseInt(d.Year); d[a] = parseInt(d[a]);
        var abs = d[a] - consensus[d.Year].pop;
        var perc = (abs/consensus[d.Year].pop) * 100;
        values.push({'year': d.Year, 'pop': d[a], 'absolute': abs, 'percent': perc }); 
      }});
      values.sort(function(a, b){ return a.year - b.year; });
      return {'agency': a, 'values': values};
    });
    ANames['consensus'] = dataSet.length;
    dataSet.push({agency: 'consensus', 'values': d3.values(consensus)});
    return createVis();
  }
});

createVis = function() {

  // scales, axes & constructors, and elements/selectors
  var xDom, yDom, xAxis, xScale, yScale, yAxis, srcScale, line, area, zoom, bisectYear, getExt, activeData, commas;
  var svg, legendBox, legend, lines, points, consensusAreas, divergeAreas, yGuide, cGuide, tooltip, tooltext;

  getExt = function(attr) {
    var set = [];
    dataSet.forEach(function(d) {
      d.values.forEach(function(e){ set[e[attr]] = e[attr]; }) });
    return d3.extent(d3.values(set));
  }  
  var parseX = d3.format("4d")
  var parseY = d3.format(".4s"); 
  // setting scales, axes constructors
  xDom = getExt('year');
  xScale = d3.scale.linear().range([0, bbVis.w]);
  yScale = d3.scale.linear().range([bbVis.h, 0]);
  srcScale = d3.scale.category10().domain(dataSet.map(function(d) {return d.agency;} ));
  xAxis = d3.svg.axis().orient("bottom").tickFormat(function(d) { return parseX(d)});
  yAxis = d3.svg.axis().orient("left").tickFormat(function(d) { return parseY(d)});
  line = d3.svg.line().interpolate("linear").x(function(e) {return xScale(e.year)+bbVis.x;});
  area = d3.svg.area().interpolate("linear");
  zoom = d3.behavior.zoom().scaleExtent([1, 50]).on("zoom", zoomed);
  bisectYear = d3.bisector(function(d) {return d.year}).left;
  commas = d3.format("0,000");
  resetParams();

  svg = d3.select("#vis").append("svg")
    .attr({width:width+margin.left+margin.right, height:height+margin.top+margin.bottom})
    .append("g").attr({class:'graph', transform:"translate("+margin.left+","+margin.top+")"});


  // append svgX, Y axes, clip path
  svg.append("g").attr({class:"x axis",transform:"translate("+bbVis.x+","+(bbVis.y+bbVis.h)+")"})
    .call(xAxis).append("text").attr({class: "label", x: bbVis.w, dy: 45}).text("Year");

  svg.append("g").attr({class:"y axis",transform:"translate("+bbVis.x+",0)"})
    .call(yAxis).append("text")
    .attr({class:"label",transform:"rotate(-90)",y:bbVis.y+10,dx:-2}).text("Population");

  svg.append("clipPath").attr("id", "clip").append("rect")
    .attr({ width:bbVis.w+pad, height:bbVis.h+bbVis.y+pad, 
            transform:"translate("+bbVis.x+","+(pad*-1)+")"});

  svg.append("rect").attr({ class:"backdrop", width:bbVis.w+pad, height:bbVis.h+bbVis.y+pad, 
      transform:"translate("+bbVis.x+","+(pad*-1)+")"});
  console.log(d3.select('g.graph')[0][0].getBBox().height);

  var makeDataViz = function() {

    agencies.enter().append("g").attr("class", function(d) {return "agency "+d.agency});

    lines = agencies.append("path").attr("class", function(d) {return "line "+d.agency})
      .style("stroke", function(d) {return srcScale(d.agency)});

    points = agencies.append("g").attr("class", function(d) {return "points "+d.agency})
      .attr("fill",function(d){return srcScale(d.agency)}).selectAll("circle")
      .data(function(d){return d.values}).enter().append("svg:circle");

    makeOverlay();
  }
  agencies = svg.selectAll(".agency").data(dataSet);
  activeData = d3.keys(ANames).map(function(d, i) {return i});
  makeDataViz();

     // append legend
  legendBox = d3.select('svg').append("g").attr("class",'legendBox').attr("transform", 
    function(d) {return "translate("+bbVis.x+","
      +(bbVis.y+d3.select('g.graph')[0][0].getBBox().height+2*pad)+")"});
  
  legend = legendBox.append("g").selectAll("g")
    .data(dataSet.map(function(d,i){return [d.agency,i]})).enter().append("g")
    .attr("class", function(d){return d[0]+" legend selected"})
    .attr("id",function(d){return"k"+d[1]})
    .attr("fill",function(d){return srcScale(d[0])}).on("click", selectThis);
  
  legend.append("rect").attr({width:LBoxLen,height:LBoxLen})
    .attr("y",function(d,i){return i*pad*2-LBoxLen});

  legend.append("text").attr("x",20).attr("y", function(d,i) {return i*pad*2})
    .text(function(d) {return d[0]});

  legendBox.append("g").selectAll('text').data(['DESELECT ALL', 'SELECT ALL'])
    .enter().append('text').attr("transform", function(d, i)  {
      return "translate(0,"+(d3.select('.legendBox g')[0][0].getBBox().height+pad+i*pad*2)+")";})
    .on("click", selectThis).text(function(d) {return d});

  zoomed();

  d3.select('body').on("keyup",function(){zoom.y(yScale);})
          .on("keydown",function(){if (d3.event.altKey) {zoom.y(null);}});

  // change from / reset linear and log scales
  d3.selectAll("input[name=scale]").on("click", function() {
    lastScaleInput = $(this).attr("value");
    makeScale();
  });


  // switch views from all data to consensus analysis
  d3.selectAll("input[name=consensus]").on("click", function() {
    if ($(this).attr("value") != lastConsensusInput){
      lastConsensusInput = $(this).attr("value");
      agencies.remove();        

      if (lastConsensusInput == 'trends') { makeTrends(); } 
      else {  legend.classed('selected', true);
              agencies = svg.selectAll(".agency").data(dataSet);
              activeData = d3.keys(ANames).map(function(d, i) {return i});
              Yinput="pop", consensusAreas = null;
              makeDataViz(); }
      resetParams(); 
      zoomed();
  }});

  // switch to viz for divergence or raw Pop vs. Time
  d3.selectAll("input[name=divergence]").on("click", function() { 
    if ($(this).attr("value") != lastDivergeSelect) {
      agencies.remove();
      agencies = svg.selectAll(".agency").data(activeData.map(function(k){return dataSet[k];}));
      lastDivergeSelect = $(this).attr("value");

      if (lastDivergeSelect == 'diverge') {
        lines = null; points = null;
        makeDiverge(); 
       }
      else { Yinput = 'pop';
        divergeAreas = null;
        makeDataViz(); }

      makeScale();
  }});

  d3.selectAll("input[name=divergeType]").on("click", function() { 
    if (lastDivergeSelect=='diverge' && $(this).attr('value')!=lastDivergeTypeInput)  {
      Yinput = $(this).attr('value');
      lastDivergeTypeInput = Yinput;
      resetParams(); 
      zoomed();
    }
  });


  function makeOverlay(){
    
    var xAxH = d3.select('g.x.axis')[0][0].getBBox().height;
    var yAxW = d3.select('g.y.axis')[0][0].getBBox().width;


    d3.selectAll('.tip').remove();

    // TOOLTIP
    tooltip = svg.append("g").attr("class","tip");
    tooltip.append("g").attr("class","tip guide");
    yGuide = tooltip.select("g.guide").append("rect")
      .attr({width:'2px', height:bbVis.h, y:bbVis.y-LBoxLen, visibility: 'hidden'});
    cGuide = tooltip.select("g.guide").append("circle")
      .attr({r: 5, visibility: 'hidden'});
    tooltext = tooltip.append("g").attr({class:'tip text'});
    var xAtt = bbVis.x+d3.select('g.y.axis text.label')[0][0].getBBox().height+pad;
    tooltext.append("rect").attr({width:105,height:54,x:xAtt,y:(bbVis.y-LBoxLen)})
    tooltext.append("g").attr("class","content").selectAll('text')
      .data(["YEAR", "POP'N", "MIN", "MAX"]).enter().append('text')
      .attr({x: xAtt}).attr("y", function(d, i) {return bbVis.y+i*(pad+4)})
      .text(function(d) {return d});


    // mouse-following for tooltip adapted from http://bl.ocks.org/gniemetz/4618602
    d3.selectAll('rect.overlay').remove();
    svg.append("rect")
      .attr({class: "overlay", width: bbVis.w+yAxW+2*pad, height: bbVis.h+xAxH+2*pad,
        x: bbVis.x-yAxW+pad, y: bbVis.y-xAxH/2-pad
      })
      .on("mouseover", function(){
        tooltip.attr("visibility", 'visible');
        d3.select('.tip g.guide').selectAll('*').attr("visibility", 'visible'); }) 
      .on("mouseout", function(){
        tooltip.attr("visibility", 'hidden');
        d3.select('.tip g.guide').selectAll('*').attr("visibility", 'hidden'); }) 
      .on("mousemove", mouseMove).call(zoom);
  }

  function mouseMove() {
    var mX  = d3.mouse(this)[0]-bbVis.x;
      var domainX = Math.floor(xScale.invert(mX)),
           cObj = dataSet[ANames.consensus].values,
              j = bisectYear(cObj, domainX),
              d = cObj[j];
      if(d){
         guideX = xScale(d.year)+bbVis.x,
         guideY = yScale(d[Yinput]),
        ttcont = [['YEAR: '+d.year], ["POP'N: "+commas(d3.round(d.pop,0))],
                  ['MIN: '+commas(d3.round(d.min,0))],
                  ['MAX: '+commas(d3.round(d.max,0))]]; 
        yGuide.attr("transform","translate("+guideX+",0)");
        cGuide.attr("transform","translate("+guideX+","+guideY+")");
        tooltext.select('g.content').selectAll('text')
        .data(ttcont.map(function(d){return d;}))
        .text(function(d) {return d[0];});
  }}

  function makeDiverge() {
    Yinput = lastDivergeTypeInput, lastScaleInput = "linear", lastConsensusInput = "all";
    agencies.enter().append("g").attr("class", function(d) {return "agency "+d.agency});
    divergeAreas = agencies.append("path").attr("fill",function(d){return srcScale(d.agency)})
      .attr("class",function(d){return 'area '+d.agency});
    makeOverlay();
  }

  function makeScale () {
    if (lastScaleInput=="log"&&lastConsensusInput=="all"&&lastDivergeSelect=="raw") {  
      yScale = d3.scale.log().range([bbVis.h, 0]); }
    else  { yScale = d3.scale.linear().range([bbVis.h, 0]); }
    resetParams(), zoomed();
  }
  function makeTrends() {
    Yinput = "pop";
    legend.classed('selected',false);
    d3.select('.legend g.consensus').classed('selected',true);
    lastScaleInput = "linear";
    $('input[value=linear]').attr('checked',true);
    activeData = [ANames.consensus];  
    var Cdata = [{agency:'max', values:dataSet[ANames.consensus].values},
                 {agency:'min', values:dataSet[ANames.consensus].values}]
    agencies = svg.selectAll(".agency").data(Cdata);
    makeDataViz();
    consensusAreas = agencies.append("path").attr('class', function(d){return 'area '+d.agency});
  }
  function resetParams(){
    yDom = getExt(Yinput);
    xScale.domain(xDom), yScale.domain(yDom);
    xAxis.scale(xScale), yAxis.scale(yScale);
    zoom.x(xScale).y(yScale);
  }
  function selectThis(){
    var thisA = d3.select(this);

    // [1] Deselect specific Agency
    if (thisA.classed("selected")) { 
      thisA.classed("selected",false);
      var sName = '.'+thisA.text().replace(/ /g,'.');
      d3.select('.agency'+sName).remove();
      var aIndex = parseInt(thisA.attr("id").split('k')[1]);
      activeData.splice( activeData.indexOf(aIndex) ,1); }

    else { agencies.remove();

      // [2] Deselect ALL Agencies
      if (thisA.text() == "DESELECT ALL") {
          legend.classed("selected", false);
          activeData = []; }
      else {
        if (Yinput == "pop" && lastConsensusInput == "trends") { makeTrends(); }
        else {
          // [3] Select ALL Agencies
          if (thisA.text() == "SELECT ALL") { 
            legend.classed("selected", true);
            activeData = d3.keys(ANames).map(function(d, i) {return i});
            agencies = svg.selectAll(".agency").data(dataSet); }
          
          // [4] Select specific Agency
          else {  thisA.classed("selected", true);  
            var aIndex = parseInt(thisA.attr("id").split('k')[1]);
            activeData.push(aIndex);
            agencies = svg.selectAll(".agency")
                          .data(activeData.map(function(k){return dataSet[k];})); }

          if (lastDivergeSelect == "raw") { makeDataViz(); }
          else { makeDiverge(); }
        }
        makeOverlay();
        zoomed();
  }}};
  
  function zoomed(){
    var tformPts=function(transition){
      transition.attr("cx",function(e){return xScale(e.year) + bbVis.x;})
       .attr("cy",function(e){return yScale(e[Yinput]); }).attr("r", 2); }
    var tformLN=function(transition){transition.attr("d", function(d){return line(d.values); })}
    var tformCA=function(transition){transition.attr("d", function(c){Yinput=c.agency; return area(c.values);})}
    var tformDA=function(transition){transition.attr('d',function(d){return area(d.values);})}

    area.x(function(d) {return xScale(d.year) + bbVis.x })
        .y0(yScale(0)).y1(function(d) { return yScale(d[Yinput]) });
    line.y(function(e) {return yScale(e[Yinput])});
    
    var transition = d3.transition().duration(1000).ease("linear");

    svg.select(".x.axis").transition().call(xAxis); 
    svg.select(".y.axis").transition().call(yAxis);
    if (lines) {lines.transition().call(tformLN); }
    if (points) {points.transition().call(tformPts); }
    if (divergeAreas) {divergeAreas.transition().call(tformDA)}; 
    if (consensusAreas) { 
      area.y0(function(d) {return yScale(d.pop);});
      var tempInput = Yinput; consensusAreas.transition().call(tformCA);
      Yinput = tempInput; d3.select('g.graph').select('.agency.min path.line').remove();
    }   
  };
};