var tableGraph = data_starttimeXnum;
// document.getElementById("infoNumber").value=j.length;

// function loadHeatMap()
// {
// var itemSize = 22,
//       cellSize = itemSize - 1,
//       margin = {top: 120, right: 20, bottom: 20, left: 110};
      
//   var width = 750 - margin.right - margin.left,
//       height = 300 - margin.top - margin.bottom;

//   var formatDate = d3.timeFormat("%Y-%m-%d");

  

//     var data = data_starttimeXcameraIPXnum;
//     for(var i=0;i<data_starttimeXcameraIPXnum.length;i++)
//       {
       
//         var newItem = {};
//         newItem.ip = data_starttimeXcameraIPXnum[i][0];
//         newItem.time =  data_starttimeXcameraIPXnum[i][1];
//         newItem.value = data_starttimeXcameraIPXnum[i][2];
//         console.log(newItem);
//         return newItem;

//       };


//     var x_elements = d3.set(data.map(function( item ) { return item.time; } )).values(),
//         y_elements = d3.set(data.map(function( item ) { return item.ip; } )).values();

//     var xScale = d3.scaleOrdinal()
//         .domain(x_elements)
//         .rangeBands([0, x_elements.length * itemSize]);

//     var xAxis = d3.svg.axis()
//         .scale(xScale)
//         .tickFormat(function (d) {
//             return d;
//         })
//         .orient("top");

//     var yScale = d3.scaleOrdinal()
//         .domain(y_elements)
//         .rangeBands([0, y_elements.length * itemSize]);

//     var yAxis = d3.svg.axis()
//         .scale(yScale)
//         .tickFormat(function (d) {
//             return d;
//         })
//         .orient("left");

//     var colorScale = d3.scaleThreshold()
//         .domain([0.85, 1])
//         .range(["#2980B9", "#E67E22", "#27AE60", "#27AE60"]);

//     var svg = d3.select("#chartHeat")
//         .append("svg")
//         .attr("width", width + margin.left + margin.right)
//         .attr("height", height + margin.top + margin.bottom)
//         .append("g")
//         .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//     var cells = svg.selectAll('rect')
//         .data(data)
//         .enter().append('g').append('rect')
//         .attr('class', 'cell')
//         .attr('width', cellSize)
//         .attr('height', cellSize)
//         .attr('y', function(d) { return yScale(d.ip); })
//         .attr('x', function(d) { return xScale(d.time); })
//         .attr('fill', function(d) { return colorScale(d.value); });

//     svg.append("g")
//         .attr("class", "y axis")
//         .call(yAxis)
//         .selectAll('text')
//         .attr('font-weight', 'normal');

//     svg.append("g")
//         .attr("class", "x axis")
//         .call(xAxis)
//         .selectAll('text')
//         .attr('font-weight', 'normal')
//         .style("text-anchor", "start")
//         .attr("dx", ".8em")
//         .attr("dy", ".5em")
//         .attr("transform", function (d) {
//             return "rotate(-65)";
//         });
       
// }


function heatmap2()
{
  const url = 'https://raw.githubusercontent.com/FreeCodeCamp/ProjectReferenceData/master/global-temperature.json',
  months = ['January','February','March','April','May','June','July','August','September','October','November','December'],
  colors = ['#2C7BB6', '#00A6CA','#00CCBC','#90EB9D','#FFFF8C','#F9D057','#F29E2E','#E76818','#D7191C'],
  margin = {top: 100,right: 20,bottom: 100,left: 60},
  width = 1000,
  height = 400;

const tooltip = d3.select('body').append('div')
  .attr('id', 'tooltip');

const x = d3.scaleTime()
  .range([0, width]);

const y = d3.scaleLinear()
  .range([height, 0]);

const chart = d3.select('#chart')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .append('g')
  .attr('transform', `translate(${margin.left}, ${margin.top})`);

chart.append('text')             
  .attr('transform', `translate(${width/2},${ -45})`)
  .attr('id', 'title')
  .text('Monthly Global Land Surface Temperatures: 1753-2015');

chart.append('text')             
  .attr('transform', `translate(${width/2},${ -20})`)
  .attr('id', 'description')
  .text('Temperatures are relative to the Jan 1951 - Dec 1980 estimated average global temperature: 8.66°C ± 0.07');
  
chart.append('g')
  .selectAll('text')
  .data(months)
  .enter().append('text')
  .attr('class','months')
  .attr('x', (d) => `${-10}`)
  .attr('y', (d, i) => `${20 + (i * 33.4)}`)
  .attr('text-anchor','end')
  .text((d) => `${d}`);

d3.json(url, (data) => {

    const date = (year) => new Date(Date.parse(year));

    x.domain([date(data.monthlyVariance[0].year), date(data.monthlyVariance[data.monthlyVariance.length - 1].year)]);
    y.domain([0,12]);

    const xTicks = x.ticks().concat(new Date(data.monthlyVariance[data.monthlyVariance.length - 1].year, 0));
  
    chart.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickValues(xTicks));  
  
    const colorScale = d3.scaleQuantize()
      .domain([d3.min(data.monthlyVariance, (d) => d.variance), d3.max(data.monthlyVariance, (d) => d.variance)])
      .range(colors);
  
    chart.selectAll('.bar')
      .data(data.monthlyVariance)
      .enter().append('rect')
      .attr('class','bar')
      .attr('x', (d) => x(new Date(d.year, 0)))
      .attr('width', ((width / data.monthlyVariance.length) + 40) / 12)
      .attr('y', (d) => y(d.month))
      .attr('height', height / 12)
      .attr('fill', (d) => colorScale(d.variance))
      .on('mouseover', (d) => {
        tooltip.transition()
          .duration(100)    
          .style('opacity', .9);
        tooltip.text(`${months[months.length - d.month]} ${d.year} ${d.variance.toFixed(3)}°C`)
          .style('left', `${d3.event.pageX - 55}px`)  
          .style('top', `${d3.event.pageY - 40}px`);
      })
      .on('mouseout', () => {   
        tooltip.transition()    
        .duration(400)    
        .style('opacity', 0); 
      });
  });

const gradientScale = d3.scaleLinear()
  .range(colors);

const linearGradient = chart.append('linearGradient')
  .attr('id', 'linear-gradient');  

linearGradient.selectAll('stop') 
  .data(gradientScale.range())                  
  .enter().append('stop')
  .attr('offset', (d,i) => i/(gradientScale.range().length - 1))
  .attr('stop-color', (d) => d);

chart.append('rect')
  .attr('width', 300)
  .attr('height', 20)
  .style('fill', 'url(#linear-gradient)')
  .attr('transform', 'translate(350,440)');

chart.append('g')
  .selectAll('text')
  .data(Array.from(Array(13).keys()))
  .enter().append('text')
  .attr('class','temperatures')
  .attr('x', (d) => `${352 + (Math.ceil(300 / 13) * d)}`)
  .attr('y', '470')
  .text((d) => `${d - 6}`);
}












function linearGraphD(){

// goog = [["6/22/2009",425.32], ["6/8/2009",424.84], ["5/26/2009",417.23], ["5/11/2009",390]]
goog= data_starttimeXnum;

    var plot1 = $.jqplot('chartdiv', [goog], { 
      
        series: [{ 
            
            neighborThreshold: -1 
        }], 
        axes: { 
            xaxis: { 
                renderer:$.jqplot.DateAxisRenderer,
                tickRenderer: $.jqplot.axisTickRenderer
            }, 
            yaxis: {  

                renderer: $.jqplot.LogAxisRenderer    
            } 
        }, 
        cursor:{
            show: true, 
            zoom: true
        } 
    });

}



function barChartAverage()
{
        var s1 = [];
        var ticks = [];
    $.jqplot.config.enablePlugins = true;
    for(var i=0;i<data_engagementFreq.length;i++){
      s1.push(data_engagementFreq[i][0]);
      ticks.push(data_engagementFreq[i][1]);
    }
         
        plot1 = $.jqplot('chartBarAverage', [s1], {
            // Only animate if we're not using excanvas (not in IE 7 or IE 8)..
            animate: !$.jqplot.use_excanvas,
            seriesDefaults:{
                rendererOptions:{ varyBarColor : true },
                renderer:$.jqplot.BarRenderer,
                pointLabels: { show: true }
            },
            axes: {
                xaxis: {
                    renderer: $.jqplot.CategoryAxisRenderer,
                    ticks: ticks
                }
            },
            highlighter: { show: false }
        });
     
        $('#chart1').bind('jqplotDataClick', 
            function (ev, seriesIndex, pointIndex, data) {
                $('#info1').html('series: '+seriesIndex+', point: '+pointIndex+', data: '+data);
            }
        );
}


function bubbleGraphChart()
{
  var arr = [[11, 123, 1236, "Acura"], [45, 92, 1067, "Alfa Romeo"], 
    [24, 104, 1176, "AM General"], [50, 23, 610, "Aston Martin Lagonda"], 
    [18, 17, 539, "Audi"], [7, 89, 864, "BMW"], [2, 13, 1026, "Bugatti"]];
     
    plot1 = $.jqplot('bubbleGraphChart',[arr],{
        title: 'Transparent Bubbles',
        seriesDefaults:{
            renderer: $.jqplot.BubbleRenderer,
            rendererOptions: {
                bubbleAlpha: 0.6,
                highlightAlpha: 0.8
            },
            shadow: true,
            shadowAlpha: 0.05
        }
    });    
}


