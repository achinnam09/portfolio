console.log("index.js is being run");
import { fetchJSON, renderProjects, fetchGithubData }  from "./global.js";

(async function loadLatestProjects() {
    try {
        // Fetch the JSON data
        const projects = await fetchJSON('./lib/projects.json');
        
        // Extract the latest 3 projects
        const latestProjects = projects.projects.slice(0, 3);

        // Select the container for projects
        const projectsContainer = document.querySelector('.projects');

        // Render the latest projects
        renderProjects(latestProjects, projectsContainer, 'h2');
    } catch (error) {
        console.error('Error fetching or rendering projects:', error);
    }
})();

(async function loadGitHubStats() {
    try {
        const githubData = await fetchGithubData('achinnam09');

        const profileStats = document.querySelector('#profile-stats'); 

        if (profileStats) {
            profileStats.innerHTML = `
                <dl>
                    <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
                    <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
                    <dt>Followers:</dt><dd>${githubData.followers}</dd>
                    <dt>Following:</dt><dd>${githubData.following}</dd>
                </dl>
            `;
        }
    } catch (error) {
        console.error('Error loading GitHub stats:', error);
    }
})();
