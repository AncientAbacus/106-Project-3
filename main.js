// set up global constants and variables
let data = [];
let commits = [];
let xScale, yScale;

// create custom color scale
const customColors = [
    "#E63946", // Strong Red
    "#F4A261", // Orange
    "#2A9D8F", // Teal
    "#264653", // Deep Navy
    "#E9C46A", // Yellow Gold
    "#A23E48", // Dark Red
    "#457B9D", // Blue
    "#1D3557", // Dark Blue
    "#6A0572", // Purple
    "#FFB400", // Bright Yellow
    "#4ECDC4"  // Light Cyan
];

const colorScale = d3.scaleOrdinal()
    .domain(d3.range(customColors.length)) // Assigns colors to categories
    .range(customColors.reverse());

// load data using d3's csv method
async function loadData() {
    data = await d3.csv('data/viz_cases.csv', (row) => ({
      ...row,
        agebin : row.age_bin,
        age : Number(row.age),
        mortality : Number(row.mortality_rate),
        sex : row.sex,
        opname : row.opname,
        optype : row.optype,
        intraop_ebl : Number(row.intraop_ebl),

    }));
    console.log(data);
    displayStats();
    createStackedBar();
  }

  // execute loadData when the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
  });

  // display stats
  function displayStats() {  
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  
    // add total observations
    dl.append('dt').html('Total');
    dl.append('dd').text(data.length);
  
    // Add total cases by age bin
    const ageBins = d3.group(data, d => d.agebin);
    const reversedAgeBins = Array.from(ageBins).reverse();
    reversedAgeBins.forEach(([key, value]) => {
        dl.append('dt').text(`${key}`);
        dl.append('dd').text(value.length);
    });
  }

    // create stacked bar
    function createStackedBar() {
        const width = 1000;
        const height = 600;
        const margin = { top: 20, right: 30, bottom: 40, left: 40 };
    
        const svg = d3
            .select('#chart')
            .append('svg')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('overflow', 'visible');
    
        const ageBins = d3.group(data, d => d.agebin);
        const ageBinKeys = Array.from(ageBins.keys()).sort((a, b) => d3.descending(Number(a.split('-')[0]), Number(b.split('-')[0])));
    
        const optypes = Array.from(new Set(data.map(d => d.optype))).sort(d3.ascending).reverse();
    
        const stack = d3.stack()
            .keys(optypes)
            .value((d, key) => d[1].filter(v => v.optype === key).length / d[1].length);
    
        const series = stack(ageBins);
        
        // set up axes
        xScale = d3.scaleBand()
            .domain(ageBinKeys.reverse())
            .range([margin.left, width - margin.right])
            .padding(0.1);
    
        yScale = d3.scaleLinear()
            .domain([0, 1])
            .range([height - margin.bottom, margin.top]);
    
        const color = d3.scaleOrdinal()
            .domain(optypes)
            .range(colorScale.range());
    
        // draw bars
        svg.append('g')
            .selectAll('g')
            .data(series)
            .join('g')
            .attr('fill', d => color(d.key))
            .selectAll('rect')
            .data(d => d)
            .join('rect')
            .attr('x', d => xScale(d.data[0]))
            .attr('y', d => yScale(d[1]))
            .attr('height', d => yScale(d[0]) - yScale(d[1]))
            .attr('width', xScale.bandwidth())
            .attr('class', 'bar')
            .style('fill-opacity', 0.85)
            .on('mouseenter', function(event) {
                d3.select(this).style('fill-opacity', 1);
            })
            .on('mouseleave', function() {
                d3.select(this).style('fill-opacity', 0.85);
            });
    
        // draw axes
        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale));
    
        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale).tickFormat(d3.format('.0%')));
    
        // draw legend
        const legend = svg.append('g')
            .attr('transform', `translate(${width - margin.right + 20},${margin.top})`)
            .selectAll('g')
            .data(optypes.reverse()) // Reverse again for legend to match the bars
            .join('g')
            .attr('transform', (d, i) => `translate(0,${i * 20})`);
    
        legend.append('rect')
            .attr('class', 'legend-rect')
            .attr('x', -25)
            .attr('width', 19)
            .attr('height', 19)
            .attr('fill', color)
            .style('rx', '25%');
    
        legend.append('text')
            .attr('x', 0)
            .attr('y', 9.5)
            .attr('dy', '0.32em')
            .text(d => d);
    }

    
