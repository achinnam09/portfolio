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

    displayStats();
    
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
    processCommits();

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
