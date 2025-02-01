import {fetchJSON, renderProjects} from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');


if (projects && projects.length > 0) {
    projectsTitle.textContent = '${projects.length} Projects';

} else {
    projectsTitle.textContent = 'No Projects Found';
}

renderProjects(projects, projectsContainer, 'h2');