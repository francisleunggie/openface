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
  var tab = data_starttimeXcameraIPXnum;

Highcharts.chart('container', {
    chart: {
        type: 'heatmap',
        marginTop: 40,
        marginBottom: 80,
        plotBorderWidth: 1
    },


    title: {
        text: 'heat map'
    },

    xAxis: {
        categories: ['Alexander', 'Marie', 'Maximilian', 'Sophia', 'Lukas', 'Maria', 'Leon', 'Anna', 'Tim', 'Laura']
    },

    yAxis: {
        categories: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        title: null
    },

    colorAxis: {
        min: 0,
        minColor: '#FFFFFF',
        maxColor: Highcharts.getOptions().colors[0]
    },

    legend: {
        align: 'right',
        layout: 'vertical',
        margin: 0,
        verticalAlign: 'top',
        y: 25,
        symbolHeight: 280
    },

    tooltip: {
        formatter: function () {
            return '<b>' + this.series.xAxis.categories[this.point.x] + '</b> sold <br><b>' +
                this.point.value + '</b> items on <br><b>' + this.series.yAxis.categories[this.point.y] + '</b>';
        }
    },

    series: [{
        name: 'Sales per employee',
        borderWidth: 1,
        data: [[0, 0, 10], [0, 1, 19], [0, 2, 8], [0, 3, 24], [0, 4, 67], [1, 0, 92], [1, 1, 58], [1, 2, 78], [1, 3, 117], [1, 4, 48], [2, 0, 35], [2, 1, 15], [2, 2, 123], [2, 3, 64], [2, 4, 52], [3, 0, 72], [3, 1, 132], [3, 2, 114], [3, 3, 19], [3, 4, 16], [4, 0, 38], [4, 1, 5], [4, 2, 8], [4, 3, 117], [4, 4, 115], [5, 0, 88], [5, 1, 32], [5, 2, 12], [5, 3, 6], [5, 4, 120], [6, 0, 13], [6, 1, 44], [6, 2, 88], [6, 3, 98], [6, 4, 96], [7, 0, 31], [7, 1, 1], [7, 2, 82], [7, 3, 32], [7, 4, 30], [8, 0, 85], [8, 1, 97], [8, 2, 123], [8, 3, 64], [8, 4, 84], [9, 0, 47], [9, 1, 114], [9, 2, 31], [9, 3, 48], [9, 4, 91]],
        dataLabels: {
            enabled: true,
            color: '#000000'
        }
    }]

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
//if (!data_starttimeXnum) return;
goog = [["2017-07-15 4:00pm",425.32], ["2017-07-15 5:00pm",424.84], ["2017-07-15 6:00pm",417.23], ["2017-07-15 6:10pm",390]];
let sanityDate = (new Date()).addYears(-1);
let minTime = (new Date()).addHours(-12);
minTime.setMinutes(0);


goog = [];
data_starttimeXnum.forEach( (tuple) => {
  if (tuple[0] > sanityDate) {
    goog.push(tuple);
  }
});
//goog= data_starttimeXnum;
console.log(sanityDate, goog);

    var plot1 = $.jqplot('chartdiv', [goog], { 
      
        series: [{ 
            
            neighborThreshold: -1 
        }], 
        axes: { 
            xaxis: { 
                labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
                tickRenderer: $.jqplot.CanvasAxisTickRenderer,
                tickOptions:{ 
                  angle: -30,
                  formatString:'%#d/%#m %R'
                },
                
                renderer:$.jqplot.DateAxisRenderer,
                tickInterval:'1 hour',
                min: minTime.toString("d/M HH:mm")

            }, 
            yaxis: {  

                renderer: $.jqplot.LogAxisRenderer    
            } 
        }, 
        cursor:{
            show: true, 
            zoom: true
        } 
    }).replot();

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
        }).replot();
     
        $('#chart1').bind('jqplotDataClick', 
            function (ev, seriesIndex, pointIndex, data) {
                $('#info1').html('series: '+seriesIndex+', point: '+pointIndex+', data: '+data);
            }
        );
}


function bubbleGraphChart()
{
  //if (!data_engagementCamFreq) return;
  var tabData = data_engagementCamFreq;
  var tabRslt=[];
  var add;
  var machin;
    let display = [], groupByCam = {};
     // end goal = [{ variance, total unique view, avg strength = total Strength / total unique view, label}]
     tabData.forEach( (eng) => {
        let strength = eng[0], cam = eng[1], freq = eng[2];
        // x, y, size, label
        if (!groupByCam[cam]) {
          // total strength = freq x strength, total unique visitors, min strength, max strength
          groupByCam[cam] = { totStren: 0, totUniq: 0, minStren: 0, maxStren: 0};
        }
        groupByCam[cam].totStren += freq * strength;
        if (strength > 0) groupByCam[cam].totUniq += freq;
        if (strength < groupByCam[cam].minStren) 
          groupByCam[cam].minStren = strength; 
        if (strength > groupByCam[cam].maxStren) 
          groupByCam[cam].maxStren = strength;
     });
     Object.keys(groupByCam).forEach( (cam) => {
        let stats = groupByCam[cam];
        let variance = stats.maxStren - stats.minStren;
        let avgStren = stats.totUniq > 0 ? stats.totStren / stats.totUniq:0;
        let output = [variance, stats.totUniq, avgStren, cam];
        display.push(output);
        console.log(output);
     });
     $("bubbleGraphChart").html('');
    plot1 = $.jqplot('bubbleGraphChart',[display],{
        title: 'Engagement Strength Per Exhibit',
        seriesDefaults:{
            renderer: $.jqplot.BubbleRenderer,
            rendererOptions: {
                bubbleAlpha: 0.6,
                highlightAlpha: 0.8
            },
            shadow: true,
            shadowAlpha: 0.05
        },
        axes:{
          xaxis:{
            label:'Strength variance',
            labelRenderer: $.jqplot.CanvasAxisLabelRenderer
          },
          yaxis:{
            label:'Total Unique Views',
            labelRenderer: $.jqplot.CanvasAxisLabelRenderer
          }
        }

    }).replot();    
}


