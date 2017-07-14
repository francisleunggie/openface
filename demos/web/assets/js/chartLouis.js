function loadGraphDemo()
{
  
// d3.json("assets/js/data.json", function(data) {
//   var modData = [];
//   console.log("data ---");
//   console.log(data);  
//   console.log("data ---");
//  var compteur = 0;
//   data.test.forEach(function(d, i) {
//     compteur++;
//     var item = [compteur];
//     console.log(compteur)
//       item.push(d.date);
//     modData.push(item);
//   });
//   console.log(modData);
//   var chart = c3.generate({
//     data: {
//       columns: modData
//     }
//   });
// });
}


function loadHeatMap()
{
   var itemSize = 40,
      cellSize = itemSize - 1,
      margin = {top: 120, right: 20, bottom: 20, left: 110};
      
  var width = 750 - margin.right - margin.left,
      height = 300 - margin.top - margin.bottom;

  var formatDate = d3.time.format("%Y-%m-%d");

  d3.json('assets/js/data.json', function (error,data ) {

    var data = data.test.map(function( item ) {
        var newItem = {};
        newItem.source = item.source;
        newItem.date = item.date;
        newItem.value = item.value;
        return newItem;
    })

    var x_elements = d3.set(data.map(function( item ) { return item.date; } )).values(),
        y_elements = d3.set(data.map(function( item ) { return item.source; } )).values();


    var xScale = d3.scale.ordinal()
        .domain(x_elements)
        .rangeBands([0, x_elements.length * itemSize]);

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .tickFormat(function (d) {
            return d;
        })
        .orient("top");

    var yScale = d3.scale.ordinal()
        .domain(y_elements)
        .rangeBands([0, y_elements.length * itemSize]);

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .tickFormat(function (d) {
            return d;
        })
        .orient("left");

    var colorScale = d3.scale.threshold()
        .domain([10,30,50,300])
        .range(["#2980B9", "#E67E22", "#27AE60", "#27AE60"]);
    console.log(colorScale);

    var svg = d3.select('.heatmap')
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      console.log(svg)

    var cells = svg.selectAll('rect')
        .data(data)
        .enter().append('g').append('rect')
        .attr('class', 'cell')
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('y', function(d) { return yScale(d.source); })
        .attr('x', function(d) { return xScale(d.date); })
        .attr('fill', function(d) { return colorScale(d.value); });

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .selectAll('text')
        .attr('font-weight', 'normal');

    svg.append("g")
        .attr("class", "x axis")
        .call(xAxis)
        .selectAll('text')
        .attr('font-weight', 'normal')
        .style("text-anchor", "start")
        .attr("dx", ".8em")
        .attr("dy", ".5em")
        .attr("transform", function (d) {
            return "rotate(-65)";
        });
  });
}