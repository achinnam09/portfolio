import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

(async function loadProjects() {
    try {
        const projectsData = await fetchJSON('../lib/projects.json');
        const projects = projectsData.projects;

        const projectsTitle = document.querySelector('.projects-title');
        const projectsContainer = document.querySelector('.projects');
        const searchInput = document.querySelector('.searchBar');
        const legend = d3.select('.legend');
        const svg = d3.select('svg');

        if (projects.length > 0) {
            projectsTitle.textContent = `${projects.length} Projects`;
        } else {
            projectsTitle.textContent = 'No Projects Found';
        }

        renderProjects(projects, projectsContainer, 'h2');
        renderPieChart(projects);

        function updateProjectsAndChart(filteredProjects) {
            renderProjects(filteredProjects, projectsContainer, 'h2');
            renderPieChart(filteredProjects);
        }

        let query = '';
        searchInput.addEventListener('input', (event) => {
            query = event.target.value.toLowerCase();

            const filteredProjects = projects.filter((project) => {
                const values = Object.values(project).join('\n').toLowerCase();
                return values.includes(query);
            });

            updateProjectsAndChart(filteredProjects);
        });

        function renderPieChart(projectsGiven) {
            const rolledData = d3.rollups(
                projectsGiven,
                (v) => v.length, 
                (d) => d.year    
            );

            const data = rolledData.map(([year, count]) => {
                return { value: count, label: year };
            });

            const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
            const sliceGenerator = d3.pie().value((d) => d.value);
            const arcData = sliceGenerator(data);
            const arcs = arcData.map((d) => arcGenerator(d));
            const colors = d3.scaleOrdinal(d3.schemeTableau10);

            svg.selectAll('path').remove();
            legend.selectAll('*').remove();

            arcs.forEach((arc, idx) => {
                svg
                    .append('path')
                    .attr('d', arc)
                    .attr('fill', colors(idx));
            });

            data.forEach((d, idx) => {
                legend.append('li')
                    .attr('style', `--color:${colors(idx)}`)
                    .attr('class', 'legend-item')
                    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
            });
        }
    } catch (error) {
        console.error('Error fetching projects:', error);
    }
})();
