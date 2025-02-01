import {fetchJSON, renderProjects} from '../global.js';

// const projects = await fetchJSON('../lib/projects.json');

// const projectsTitle = document.querySelector('.projects-title');
// const projectsContainer = document.querySelector('.projects');


// if (projects && projects.length > 0) {
//     projectsTitle.textContent = '${projects.length} Projects';

// } else {
//     projectsTitle.textContent = 'No Projects Found';
// }

// renderProjects(projects, projectsContainer, 'h2');
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