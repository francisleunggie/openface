function loadHeatMap()
{
const margin = { top: 50, right: 0, bottom: 100, left: 30 },
          width = 300 - margin.left - margin.right,
          height = 200 - margin.top - margin.bottom,
          gridSize = Math.floor(width / 24),
          legendElementWidth = gridSize*2,
          buckets = 9,
          colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"], // alternatively colorbrewer.YlGnBu[9]
          days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
          times = ["1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a", "12a", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p", "12p"];
          datasets = ["data.json"];

      const svg = d3.select("#chart").append("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      const dayLabels = svg.selectAll(".dayLabel")
          .data(days)
          .enter().append("text")
            .text(function (d) { return d; })
            .attr("x", 0)
            .attr("y", (d, i) => i * gridSize)
            .style("text-anchor", "end")
            .attr("transform", "translate(-6," + gridSize / 1.5 + ")")
            .attr("class", (d, i) => ((i >= 0 && i <= 4) ? "dayLabel mono axis axis-workweek" : "dayLabel mono axis"));

      const timeLabels = svg.selectAll(".timeLabel")
          .data(times)
          .enter().append("text")
            .text((d) => d)
            .attr("x", (d, i) => i * gridSize)
            .attr("y", 0)
            .style("text-anchor", "middle")
            .attr("transform", "translate(" + gridSize / 2 + ", -6)")
            .attr("class", (d, i) => ((i >= 7 && i <= 16) ? "timeLabel mono axis axis-worktime" : "timeLabel mono axis"));

      const type = (d) => {
        return {
          day: +d.day,
          hour: +d.hour,
          value: +d.value
        };
      };

      const heatmapChart = function(tsvFile) {
        d3.tsv(tsvFile, type, (error, data) => {
          const colorScale = d3.scaleQuantile()
            .domain([0, buckets - 1, d3.max(data, (d) => d.value)])
            .range(colors);

          const cards = svg.selectAll(".hour")
              .data(data, (d) => d.day+':'+d.hour);

          cards.append("title");

          cards.enter().append("rect")
              .attr("x", (d) => (d.hour - 1) * gridSize)
              .attr("y", (d) => (d.day - 1) * gridSize)
              .attr("rx", 4)
              .attr("ry", 4)
              .attr("class", "hour bordered")
              .attr("width", gridSize)
              .attr("height", gridSize)
              .style("fill", colors[0])
            .merge(cards)
              .transition()
              .duration(1000)
              .style("fill", (d) => colorScale(d.value));

          cards.select("title").text((d) => d.value);

          cards.exit().remove();

          const legend = svg.selectAll(".legend")
              .data([0].concat(colorScale.quantiles()), (d) => d);

          const legend_g = legend.enter().append("g")
              .attr("class", "legend");

          legend_g.append("rect")
            .attr("x", (d, i) => legendElementWidth * i)
            .attr("y", height)
            .attr("width", legendElementWidth)
            .attr("height", gridSize / 2)
            .style("fill", (d, i) => colors[i]);

          legend_g.append("text")
            .attr("class", "mono")
            .text((d) => "≥ " + Math.round(d))
            .attr("x", (d, i) => legendElementWidth * i)
            .attr("y", height + gridSize);

          legend.exit().remove();
        });
      };

      heatmapChart(datasets[0]);

}



function linearGraphD(){
var data_str = "x,y\n0,0.45\n1,-0.55\n2,-0.15\n3,2.06\n4,1.49\n5,2.34\n6,3.21\n7,4.56\n8,3.78\n9,4.24\n10,5.01"

    var data = data.test.map(function( item ) {
        var newItem = {};
        newItem.source = item.source;
        newItem.date = item.date;
        newItem.value = item.value;
        return newItem;
    })


var margin = {top: 20, right: 50, bottom: 20, left: 80},
    width = 300 ,
    height = 150;

var zoom = d3.zoom()
    .scaleExtent([1, 5])
    .extent([100, 100], [width-100, height-100])
    .on("zoom", zoomed);

function zoomed() {
    svg.selectAll(".charts")
        .attr("transform", d3.event.transform);
    d3.selectAll('.line').style("stroke-width", 2/d3.event.transform.k);
    gX.call(xAxis.scale(d3.event.transform.rescaleX(x)));
    gY.call(yAxis.scale(d3.event.transform.rescaleY(y)));
}

var svg = d3.select("svg")
    .attr("width", width )
    .attr("height", height)
    .call(zoom)
    // .append("g")
    //     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var x = d3.scaleLinear()
    .domain([0, 10])
    .range([0, width]);
var y = d3.scaleLinear()
    .domain([-2, 6])
    .range([height, 0]);

var xAxis = d3.axisBottom(x);
var yAxis = d3.axisLeft(y);

var gX = svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);
var gY = svg.append("g")
     .attr("class", "axis axis--y")
     .call(yAxis)

line = d3.line()
    .x(function(d) { return x(d.x); })
    .y(function(d) { return y(d.y); });
    
svg.append("g")
    .attr("class", "charts")
    .append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", function(d) { return line(d); });


}