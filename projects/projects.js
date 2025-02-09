import {fetchJSON, renderProjects} from '../global.js';

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

(async function loadProjects() {
    try {
        const projects = await fetchJSON('../lib/projects.json');

        const projectsTitle = document.querySelector('.projects-title');
        const projectsContainer = document.querySelector('.projects');

        if (projects && projects.projects.length > 0) {
            projectsTitle.textContent = `${projects.projects.length} Projects`;
        } else {
            projectsTitle.textContent = 'No Projects Found';
        }

        renderProjects(projects.projects, projectsContainer, 'h2');
    } catch (error) {
        console.error('Error fetching projects:', error);
    }
})();

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

let data = [1, 2, 3, 4, 5, 5];
let sliceGenerator = d3.pie();
let arcData = sliceGenerator(data);
let arcs = arcData.map((d) => arcGenerator(d));
let colors = d3.scaleOrdinal(d3.schemeTableau10); 
// let total = 0;
// for (let d of data) {
//     total += d;
// }
// let angle = 0;
// let arcData = [];
// for (let d of data) {
//     let endAngle = angle + (d / total) * 2 * Math.PI;
//     arcData.push({startAngle: angle, endAngle});
//     angle = endAngle;
// }
// let arcs = arcData.map((d) => arcGenerator(d));
// let colors = ['gold', 'blue'];

arcs.forEach((arc, idx) => {
    d3.select('svg')
    .append('path')
    .attr('d', arc)
    .attr('fill', colors(idx));
})