let data = [];
let commits = [];
let xScale, yScale;
let brushSelection = null;
let selectedCommits = [];
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
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

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

    xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();
    
    yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

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
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            updateTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
            d3.select(event.currentTarget).classed('selected', isCommitSelected(commit));
        })
        .on('mouseleave', (event, commit) => {
            updateTooltipContent({});
            updateTooltipVisibility(false);
            d3.select(event.currentTarget).classed('selected', isCommitSelected(commit));
        });

    brushSelector();
}

function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines'); 

    if (Object.keys(commit).length === 0) {
        link.href = "";
        link.textContent = "";
        date.textContent = "";
        time.textContent = "";
        author.textContent = "";
        lines.textContent = "";
        return;
    }
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });
    time.textContent = commit.datetime?.toLocaleString('en', {
        hour: '2-digit', minute: '2-digit'
    });
    author.textContent = commit.author || "Unknown";
    lines.textContent = commit.totalLines ? commit.totalLines : "0";
}

function updateTooltipVisibility(isVisible){
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

function brushSelector() {
    const svg = d3.select('svg');
    svg.call(d3.brush().on('brush end', brushed)); 
    svg.selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event) {
    let sel = event.selection;
    if (!sel) {
        selectedCommits = [];
    } else {
        let min = { x: sel[0][0], y: sel[0][1] };
        let max = { x: sel[1][0], y: sel[1][1] };
        selectedCommits = commits.filter((commit) => {
            let cx = xScale(commit.datetime);
            let cy = yScale(commit.hourFrac);
            return cx >= min.x && cx <= max.x && cy >= min.y && cy <= max.y;
        });
    }
    updateSelection();
    updateSelectionCount();
    updateLanguageBreakdown();
    console.log(event);
}

function isCommitSelected(commit) {
    return selectedCommits.includes(commit);
}

function updateSelection() {
    d3.selectAll('circle').classed('selected', (d) => isCommitSelected(d));
}

function updateSelectionCount() {
    const selected = selectedCommits.length;
    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${selected || 'No'} commits selected`;
    return selectedCommits;
}

function updateLanguageBreakdown() {
    const container = document.getElementById('language-breakdown');
    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }
    const lines = selectedCommits.flatMap((d) => d.lines);
    const breakdown = d3.rollup(lines, (v) => v.length, (d) => d.type);
    container.innerHTML = '';
    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1%')(proportion);
        container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
    }
    return breakdown;
}
