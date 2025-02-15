// set up global constants and variables -----------------------------------------------------------
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
    .range(customColors.reverse()); // reverse because otherwise the x axis displays backwards

// load data-----------------------------------------------------------------------------------------
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
    createStackedBar(data);
  }


// execute loadData when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
await loadData();
});

// display stats ------------------------------------------------------------------------------------
function displayStats() {  
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    // add total observations
    dl.append('dt').html('Total');
    dl.append('dd').text(data.length);

    // Add total cases by age bin
    const ageBins = d3.group(data, d => d.agebin);
    const sortedAgeBins = Array.from(ageBins).sort((a, b) => d3.ascending(Number(a[0].split('-')[0]), Number(b[0].split('-')[0])));
    sortedAgeBins.forEach(([key, value]) => {
        dl.append('dt').text(`${key}`);
        dl.append('dd').text(value.length);
    });
}

// create stacked bar --------------------------------------------------------------------------------
function createStackedBar(data) {
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

    // interaction: group highlighting

    // draw bars
    const bars = svg.append('g')
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
        .on('mouseenter', function(event, d) {
            const optype = d3.select(this.parentNode).datum().key;
        
            bars.style('fill-opacity', function(d) {
                return d3.select(this.parentNode).datum().key === optype ? 1 : 0.3;
            });
        
            // Add marching ants effect to highlighted bars
            d3.selectAll('.bar')
                .filter(function(d) {
                    return d3.select(this.parentNode).datum().key === optype;
                })
                .classed('marching-ants', true);

            // Bold the corresponding legend item
            legend.filter(l => l === optype)
                .select('text')
                .style('font-weight', 'bold');
        })
        .on('mouseleave', function() {
            bars.style('fill-opacity', 0.85);
        
            // Remove marching ants effect
            d3.selectAll('.bar').classed('marching-ants', false);

            // Remove bold from all legend items
            legend.select('text').style('font-weight', null);
        })
        .on("click", function(event, d) {
            console.log("Circle clicked!", d); // Log the data bound to the circle
            d3.select(this) // Select the clicked circle
              .attr("fill", "red"); // Change its fill color to red;

            // Filter data to include only the selected optype
            const filteredData = data.filter(d => d.optype === d3.select(this.parentNode).datum().key);

            // Clear the existing chart
            d3.select('#chart').selectAll('*').remove();

            // Create a new chart with the filtered data
            createNestedStackedBar(filteredData);
            });

    // draw axes
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('font-family', 'Franklin');

    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).tickFormat(d3.format('.0%')))
        .selectAll('text')
        .style('font-family', 'Franklin');

    // draw legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - margin.right + 20},${margin.top})`)
        .selectAll('g')
        .data(optypes.reverse()) // Reverse again for legend to match the bars
        .join('g')
        .attr('transform', (d, i) => `translate(0,${i * 20})`)
        ;

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
        .text(d => d)
        .attr('class','legend-text');

    // Add hover interaction to legend items
    legend.on('mouseenter', function(event, d) {
        bars.style('fill-opacity', function(barData) {
            return d3.select(this.parentNode).datum().key === d ? 1 : 0.3;
        });

        // Add marching ants effect to highlighted bars
        d3.selectAll('.bar')
            .filter(function(barData) {
                return d3.select(this.parentNode).datum().key === d;
            })
            .classed('marching-ants', true);

        // Bold the corresponding legend item
        d3.select(this).select('text').style('font-weight', 'bold');
    })
    .on('mouseleave', function() {
        bars.style('fill-opacity', 0.85);

        // Remove marching ants effect
        d3.selectAll('.bar').classed('marching-ants', false);

        // Remove bold from all legend items
        legend.select('text').style('font-weight', null);
    });
    
    // Add animation on load
    bars.attr('y', height - margin.bottom)
        .attr('height', 0)
        .transition()
        .duration(1000)
        .attr('y', d => yScale(d[1]))
        .attr('height', d => yScale(d[0]) - yScale(d[1]));

    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
}

function createNestedStackedBar(data) {
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

    const opnames = Array.from(new Set(data.map(d => d.opname))).sort(d3.ascending).reverse();

    const stack = d3.stack()
        .keys(opnames)
        .value((d, key) => d[1].filter(v => v.opname === key).length);

    const series = stack(ageBins);
    
    // set up axes
    xScale = d3.scaleBand()
        .domain(ageBinKeys.reverse())
        .range([margin.left, width - margin.right])
        .padding(0.1);

    yScale = d3.scaleLinear()
        .domain([0, d3.max(series, s => d3.max(s, d => d[1]))])
        .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal()
        .domain(opnames)
        .range(colorScale.range());

    // draw bars
    const bars = svg.append('g')
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
        .on('mouseenter', function(event, d) {
            const opname = d3.select(this.parentNode).datum().key;
        
            bars.style('fill-opacity', function(d) {
                return d3.select(this.parentNode).datum().key === opname ? 1 : 0.3;
            });
        
            // Add marching ants effect to highlighted bars
            d3.selectAll('.bar')
                .filter(function(d) {
                    return d3.select(this.parentNode).datum().key === opname;
                })
                .classed('marching-ants', true);

            // Bold the corresponding legend item
            legend.filter(l => l === opname)
                .select('text')
                .style('font-weight', 'bold');
        })
        .on('mouseleave', function() {
            bars.style('fill-opacity', 0.85);
        
            // Remove marching ants effect
            d3.selectAll('.bar').classed('marching-ants', false);

            // Remove bold from all legend items
            legend.select('text').style('font-weight', null);
        });

    // draw axes
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('font-family', 'Franklin');

    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .style('font-family', 'Franklin');

    // draw legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - margin.right + 20},${margin.top})`)
        .selectAll('g')
        .data(opnames.reverse()) // Reverse again for legend to match the bars
        .join('g')
        .attr('transform', (d, i) => `translate(0,${i * 20})`)
        ;   

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
        .text(d => d)
        .attr('class','legend-text');

    // Add hover interaction to legend items
    legend.on('mouseenter', function(event, d) {
        bars.style('fill-opacity', function(barData) {
            return d3.select(this.parentNode).datum().key === d ? 1 : 0.3;
        });

        // Add marching ants effect to highlighted bars
        d3.selectAll('.bar')
            .filter(function(barData) {
                return d3.select(this.parentNode).datum().key === d;
            })
            .classed('marching-ants', true);

        // Bold the corresponding legend item
        d3.select(this).select('text').style('font-weight', 'bold');
    })
    .on('mouseleave', function() {
        bars.style('fill-opacity', 0.85);

        // Remove marching ants effect
        d3.selectAll('.bar').classed('marching-ants', false);

        // Remove bold from all legend items
        legend.select('text').style('font-weight', null);
    });
    
    // Add animation on load
    bars.attr('y', height - margin.bottom)
        .attr('height', 0)
        .transition()
        .duration(1000)
        .attr('y', d => yScale(d[1]))
        .attr('height', d => yScale(d[0]) - yScale(d[1]));

    // Add back button
    svg.append('foreignObject')
        .attr('x', margin.left - 150)
        .attr('y', margin.top - 30)
        .attr('width', 100)
        .attr('height', 30)
        .append('xhtml:div')
        .style('width', '100px')
        .style('height', '30px')
        .style('background-color', 'black')
        .style('border', 'none')
        .style('border-radius', '5px')
        .style('box-shadow', '2px 2px 5px rgba(0, 0, 0, 0.3)')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('cursor', 'pointer')
        .style('font-size', '14px')
        .style('color', '#fff')
        .text('Back')
        .on('click', function() {
            // Clear the existing chart
            location.reload();
        });
}
