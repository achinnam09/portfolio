let data = [];
let commits = [];

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        file: row.file,
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
    
    processCommits();
    displayStats();
    createScatterPlot();
    
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});


function processCommits() {
    commits = d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
        let first = lines[0];

        let {author, date, time, timezone, datetime} = first;

        let ret = {
            id: commit,
            url: 'https://github.com/vis-society/lab-7/commit/' + commit,
            author,
            date,
            time,
            timezone,
            datetime,
            hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
            totalLines: lines.length,
        };

        Object.defineProperty(ret, 'lines', {
            value: lines,
            enumerable: false,
        });

        return ret;
    });

    return commits;
}

function displayStats() {

    const statsContainer = d3.select('#stats')
        .append('div')
        .attr('class', 'stats-container');

    statsContainer.append('div')
        .attr('class', 'stats-header')
        .text('Summary Stats');

    const statsGrid = statsContainer.append('dl')
        .attr('class', 'stats-grid');

    const stats = [
        { label: 'Total LOC', value: data.length },
        { label: 'Total Commits', value: commits.length },
        { label: 'Average File Length (lines)', value: d3.mean(d3.rollups(data, v => d3.max(v, d => d.line), d => d.file), d => d[1]).toFixed(2) },
        { label: 'Average Line Length (characters)', value: d3.mean(data, d => d.length).toFixed(2) },
        { label: 'Number of Files', value: d3.groups(data, d => d.file).length },
        { label: 'Most Productive Period', value: d3.greatest(d3.rollups(data, v => v.length, d => {
            let hour = d.datetime.getHours();
            return hour >= 6 && hour < 12 ? 'Morning' :
                   hour >= 12 && hour < 18 ? 'Afternoon' :
                   hour >= 18 && hour < 24 ? 'Evening' : 'Night';
        }), d => d[1])?.[0] }
    ];

    stats.forEach(stat => {
        statsGrid.append('dt').text(stat.label);
        statsGrid.append('dd').text(stat.value);
    });
}

function createScatterPlot() {
    const width = 1000;
    const height = 600;
    
    const margin = { top: 10, right: 10, bottom: 30, left: 50 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom
    };

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    const xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();
    
    const yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);  // Fix translation

    gridlines.call(
        d3.axisLeft(yScale)
            .tickFormat('')
            .tickSize(-usableArea.width)
    );

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    const dots = svg.append('g').attr('class', 'dots');

    dots.selectAll('circle')
        .data(commits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', 5)
        .attr('fill', 'steelblue');
}
