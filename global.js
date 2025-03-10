console.log("IT'S ALIVE!");

function $$(selector, context=document){
    return Array.from(context.querySelectorAll(selector))
}

// let navLinks = $$("nav a");

// let currentLink = navLinks.find(
//     (a) => a.host === location.host && a.pathname === location.pathname
// );

// if (currentLink){
//     currentLink.classList.add("current");
// }

let pages = [
    { url: 'index.html', title: 'Home' },
    { url: 'projects/index.html', title: 'Projects' },
    { url: 'contact/index.html', title: 'Contact' },
    { url: 'resume/index.html', title: 'Resume' },
    {url: 'meta/index.html', title: 'Meta'},
    { url: 'https://github.com/achinnam09', title: 'Github' }
];

const isGitHubPages = window.location.hostname.includes("github.io");
const basePath = isGitHubPages ? "/portfolio/" : "/";

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;

    if (!url.startsWith("http")) {
        url = basePath + url;
    }

    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;

    if (location.href.endsWith(a.href)) {
        a.classList.add("current");
    }

    if (a.host !== location.host) {
        a.target = '_blank';
    }
    
    nav.append(a);
}

document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <label class="color-scheme">
        Theme:
        <select id="theme-switcher">
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>
    `
);

const select = document.querySelector('#theme-switcher')

function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty('color-scheme', colorScheme);
    localStorage.colorScheme = colorScheme;
}

if('colorScheme' in localStorage){
    const savedScheme = localStorage.colorScheme;
    setColorScheme(savedScheme);
    select.value = savedScheme;
}

select.addEventListener('input', function (event) {
    setColorScheme(event.target.value);
});

const form = document.querySelector('#contact-form');

form?.addEventListener('submit', function (event) {
    event.preventDefault();

    const data = new FormData(form);

    let url = form.action + '?';

    for (let [name, value] of data) {
        url += `${encodeURIComponent(name)}=${encodeURIComponent(value)}&`;
    }

    url = url.slice(0, -1); 
    location.href = url; 
});

export async function fetchJSON(url){
    try{
        // Fetch the JSON file from the given URL
        const response = await fetch(url);

        // If the response is not successful, throw an error
        if (!response.ok){
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    }
    catch (error){
        console.error('Error fetching or parsing JSON data', error);
    }
    
}

export function renderProjects(project, containerElement, headingLevel = 'h2'){
    containerElement.innerHTML = '';
    for (let p of project) {
        const article = document.createElement('article');

        article.innerHTML = `
    <h3>${p.title}</h3>
    <img src="${p.image}" alt="${p.title}">
    <div>  
        <p>${p.description}</p>
        <p class="project-year">c. ${p.year || 'N/A'}</p>
    </div>
    
`;

        containerElement.appendChild(article);
    }

}

export async function fetchGithubData(username){
    return fetchJSON(`https://api.github.com/users/${username}`);
}
