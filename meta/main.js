let data = [];
let commits = [];
let xScale, yScale;
let brushSelection = null;
let selectedCommits = [];

let svg, dots, gridlines;

// A color scale for line types
const lineColor = d3.scaleOrdinal(d3.schemeTableau10);

/* First scrollytelling (chronological) */
let scrollContainerSel, itemsContainerSel;
const ITEM_HEIGHT = 80;  
let scrollyData = [];

/* Second scrollytelling (by longest line length) */
let scrollContainer2Sel, itemsContainer2Sel;
const ITEM_HEIGHT_2 = 80;
let scrollyLongestData = [];

async function loadData() {
  data = await d3.csv('loc.csv', row => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    file: row.file,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime)
  }));

  processCommits();
  displayStats();
  initChart();
  updateScatterPlot(commits);
  updateFileList(commits);

  // Setup first scrollytelling (chronological)
  scrollContainerSel = d3.select('#scroll-container');
  itemsContainerSel = d3.select('#items-container');
  scrollyData = [...commits].sort((a, b) => a.datetime - b.datetime);
  scrollyData.forEach((c, i) => c._index = i);
  d3.select('#spacer').style('height', (scrollyData.length * ITEM_HEIGHT) + 'px');
  scrollContainerSel.on('scroll', renderItems);
  renderItems();

  // Setup second scrollytelling (by longest line)
  scrollContainer2Sel = d3.select('#scroll-container-2');
  itemsContainer2Sel = d3.select('#items-container-2');
  scrollyLongestData = [...commits].sort((a, b) => a.longestLine - b.longestLine);
  scrollyLongestData.forEach((c, i) => c._indexLongest = i);
  d3.select('#spacer-2').style('height', (scrollyLongestData.length * ITEM_HEIGHT_2) + 'px');
  scrollContainer2Sel.on('scroll', renderItemsLongestLine);
  renderItemsLongestLine();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
});

function processCommits() {
  commits = d3.groups(data, d => d.commit).map(([commit, lines]) => {
    let first = lines[0];
    let { author, date, time, timezone, datetime } = first;
    let ret = {
      id: commit,
      url: 'https://github.com/vis-society/lab-7/commit/' + commit,
      author,
      date,
      time,
      timezone,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length
    };
    Object.defineProperty(ret, 'lines', { value: lines, enumerable: false });
    // Compute longest line length for this commit
    ret.longestLine = d3.max(lines, d => d.length) || 0;
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

function initChart() {
  const width = 1000, height = 600;
  svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');
  svg.append('g').attr('class', 'x-axis');
  svg.append('g').attr('class', 'y-axis');
  gridlines = svg.append('g').attr('class', 'gridlines');
  dots = svg.append('g').attr('class', 'dots');
  brushSelector();
}

function updateScatterPlot(filteredCommits) {
  const width = 1000, height = 600, margin = { top: 10, right: 10, bottom: 30, left: 50 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };
  if (!filteredCommits.length) {
    dots.selectAll('circle').remove();
    return;
  }
  const xDomain = d3.extent(filteredCommits, d => d.datetime);
  xScale = d3.scaleTime().domain(xDomain).range([usableArea.left, usableArea.right]).nice();
  yScale = d3.scaleLinear().domain([0, 24]).range([usableArea.bottom, usableArea.top]);
  const [minLines, maxLines] = d3.extent(filteredCommits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines || 0, maxLines || 0]).range([2, 30]);
  const t = svg.transition().duration(300);
  gridlines.attr('transform', `translate(${usableArea.left}, 0)`)
    .transition(t)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
  svg.select('.x-axis')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .transition(t)
    .call(d3.axisBottom(xScale));
  svg.select('.y-axis')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .transition(t)
    .call(d3.axisLeft(yScale).tickFormat(d => String(d % 24).padStart(2, '0') + ':00'));
  const sortedCommits = d3.sort(filteredCommits, d => -d.totalLines);
  const circles = dots.selectAll('circle').data(sortedCommits, d => d.id);
  circles.exit()
    .transition(t)
    .attr('r', 0)
    .remove();
  const circlesEnter = circles.enter()
    .append('circle')
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .attr('r', 0)
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
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
  circlesEnter.merge(circles)
    .transition(t)
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines));
}

function updateFileList(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);
  const fileGroups = d3.groups(lines, d => d.file);
  const filesData = fileGroups.map(([file, lines]) => ({ file, lines }));
  filesData.sort((a, b) => d3.descending(a.lines.length, b.lines.length));
  d3.select('#files').html('');
  d3.select('#files')
    .selectAll('dl')
    .data(filesData, d => d.file)
    .join('dl')
    .each(function(d) {
      const sel = d3.select(this);
      sel.append('dt').html(`
        <code>${d.file}</code>
        <small>${d.lines.length} lines</small>
      `);
      const dd = sel.append('dd');
      dd.selectAll('div.line')
        .data(d.lines)
        .join('div')
        .attr('class', 'line')
        .style('background', line => lineColor(line.type));
    });
}

/* New function: update unit viz for longest line scrolly */
function updateFileListLongest(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);
  const fileGroups = d3.groups(lines, d => d.file);
  const filesData = fileGroups.map(([file, lines]) => ({ file, lines }));
  filesData.sort((a, b) => d3.descending(a.lines.length, b.lines.length));
  d3.select('#files-longest').html('');
  d3.select('#files-longest')
    .selectAll('dl')
    .data(filesData, d => d.file)
    .join('dl')
    .each(function(d) {
      const sel = d3.select(this);
      sel.append('dt').html(`
        <code>${d.file}</code>
        <small>${d.lines.length} lines</small>
      `);
      const dd = sel.append('dd');
      dd.selectAll('div.line')
        .data(d.lines)
        .join('div')
        .attr('class', 'line')
        .style('background', line => lineColor(line.type));
    });
}

/* Tooltip functions */
function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');
  if (!commit || !commit.id) {
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
  date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
  time.textContent = commit.datetime?.toLocaleString('en', { hour: '2-digit', minute: '2-digit' });
  author.textContent = commit.author || "Unknown";
  lines.textContent = commit.totalLines ?? 0;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function brushSelector() {
  const svgSel = d3.select('svg');
  svgSel.call(d3.brush().on('brush end', brushed));
  svgSel.selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event) {
  const sel = event.selection;
  if (!sel) {
    selectedCommits = [];
  } else {
    const [x0, y0] = sel[0];
    const [x1, y1] = sel[1];
    selectedCommits = commits.filter(commit => {
      const cx = xScale(commit.datetime);
      const cy = yScale(commit.hourFrac);
      return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
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
  d3.selectAll('circle').classed('selected', d => isCommitSelected(d));
}

function updateSelectionCount() {
  const selected = selectedCommits.length;
  const countElement = document.getElementById('selection-count');
  countElement.textContent = `${selected || 'No'} commits selected`;
  return selectedCommits;
}

function updateLanguageBreakdown() {
  const container = document.getElementById('language-breakdown');
  if (!selectedCommits.length) {
    container.innerHTML = '';
    return;
  }
  const lines = selectedCommits.flatMap(d => d.lines);
  const breakdown = d3.rollup(lines, v => v.length, d => d.type);
  container.innerHTML = '';
  for (const [lang, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1%')(proportion);
    container.innerHTML += `<dt>${lang}</dt><dd>${count} lines (${formatted})</dd>`;
  }
  return breakdown;
}

/* First scrollytelling: chronological commits */
function renderItems() {
  d3.select('#spacer').style('height', (scrollyData.length * ITEM_HEIGHT) + 'px');
  const items = itemsContainerSel.selectAll('.item')
    .data(scrollyData, d => d.id);
  items.exit().remove();
  const itemsEnter = items.enter()
    .append('div')
    .attr('class', 'item');
  itemsEnter.merge(items)
    .style('top', d => (d._index * ITEM_HEIGHT) + 'px')
    .html(d => {
      const dateStr = d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' });
      return `<div>
                <strong>${dateStr}</strong>
                <a href="${d.url}" target="_blank">Open Commit</a>
              </div>
              <div>
                Another glorious commit by <em>${d.author}</em>!
                We had <strong>${d.totalLines}</strong> lines.
                It was absolutely wonderful!
              </div>`;
    });
  const scrollTop = scrollContainerSel.node().scrollTop;
  const containerHeight = parseFloat(scrollContainerSel.style('height'));
  const centerIndex = Math.round((scrollTop + containerHeight / 2) / ITEM_HEIGHT);
  const clampedIndex = Math.max(0, Math.min(scrollyData.length - 1, centerIndex));
  const currentCommit = scrollyData[clampedIndex];
  const filteredCommits = commits.filter(d => d.datetime <= currentCommit.datetime);
  updateScatterPlot(filteredCommits);
  updateFileList(filteredCommits);
}

/* Second scrollytelling: sorted by longest line length */
function renderItemsLongestLine() {
  d3.select('#spacer-2').style('height', (scrollyLongestData.length * ITEM_HEIGHT_2) + 'px');
  const items = itemsContainer2Sel.selectAll('.item-longest')
    .data(scrollyLongestData, d => d.id);
  items.exit().remove();
  const itemsEnter = items.enter()
    .append('div')
    .attr('class', 'item-longest');
  itemsEnter.merge(items)
    .style('top', d => (d._indexLongest * ITEM_HEIGHT_2) + 'px')
    .html(d => {
      const dateStr = d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' });
      return `<div>
                <strong>${dateStr}</strong>
                <a href="${d.url}" target="_blank">Open Commit</a>
              </div>
              <div>
                This commit's <strong>longest line</strong> was
                <em>${d.longestLine} characters</em>!
                The author <em>${d.author}</em> wrote a record-breaking line.
              </div>`;
    });
  const scrollTop = scrollContainer2Sel.node().scrollTop;
  const containerHeight = parseFloat(scrollContainer2Sel.style('height'));
  const centerIndex = Math.round((scrollTop + containerHeight / 2) / ITEM_HEIGHT_2);
  const clampedIndex = Math.max(0, Math.min(scrollyLongestData.length - 1, centerIndex));
  const currentCommit = scrollyLongestData[clampedIndex];
  // Filter commits: show those with longestLine less than or equal to current commit's longestLine
  const filteredLongest = commits.filter(d => d.longestLine <= currentCommit.longestLine);
  updateFileListLongest(filteredLongest);
}

