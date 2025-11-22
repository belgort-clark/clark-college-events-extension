// Single Page Application Router
class Router {
    constructor() {
        this.routes = {
            'home': this.renderHome,
            'search': this.renderSearch,
            'about': this.renderAbout
        };

        this.currentPage = null;
        this.hamburgerInitialized = false;
        this.init();
    }

    init() {
        // Handle navigation clicks
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                this.navigate(page);
            });
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const page = e.state?.page || 'home';
            this.loadPage(page);
        });

        // Handle hamburger menu - only once
        if (!this.hamburgerInitialized) {
            this.setupHamburgerMenu();
            this.hamburgerInitialized = true;
        }

        // Load initial page immediately (before DOMContentLoaded for other scripts)
        const hash = window.location.hash.slice(1) || 'home';
        this.navigate(hash, true);

        // Mark router as ready
        window.routerReady = true;
    }

    navigate(page, replace = false) {
        if (replace) {
            window.history.replaceState({ page }, '', `#${page}`);
        } else {
            window.history.pushState({ page }, '', `#${page}`);
        }
        this.loadPage(page);

        // Close mobile menu if open
        const nav = document.querySelector('nav ul');
        const hamburger = document.querySelector('.hamburger');
        if (nav?.classList.contains('active')) {
            nav.classList.remove('active');
            hamburger?.classList.remove('active');
            hamburger?.setAttribute('aria-expanded', 'false');
        }
    }

    loadPage(page) {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.dataset.page === page) {
                link.id = 'active-page';
            } else {
                link.removeAttribute('id');
            }
        });

        // Update page title
        const titles = {
            'home': 'Home - Clark College Events',
            'search': 'Search - Clark College Events',
            'about': 'About - Clark College Events'
        };
        document.title = titles[page] || 'Clark College Events';

        // Render the page
        const renderFunction = this.routes[page];
        if (renderFunction) {
            this.currentPage = page;
            renderFunction.call(this);
        } else {
            this.navigate('home');
        }
    }

    setupHamburgerMenu() {
        const hamburger = document.querySelector('.hamburger');
        const nav = document.querySelector('nav ul');

        if (!hamburger || !nav) {
            console.log('Hamburger or nav not found');
            return;
        }

        // Toggle menu - remove old listeners first
        const newHamburger = hamburger.cloneNode(true);
        hamburger.parentNode.replaceChild(newHamburger, hamburger);

        newHamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = newHamburger.getAttribute('aria-expanded') === 'true';
            newHamburger.setAttribute('aria-expanded', !isExpanded);
            newHamburger.classList.toggle('active');
            nav.classList.toggle('active');
            console.log('Hamburger clicked, menu active:', nav.classList.contains('active'));
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !newHamburger.contains(e.target)) {
                nav.classList.remove('active');
                newHamburger.classList.remove('active');
                newHamburger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    renderHome() {
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <div id="filter-search" style="display: none;">
                <div class="filter-input-wrapper">
                    <label for="filter-input" class="visually-hidden">Filter events by keyword</label>
                    <input type="text" id="filter-input" placeholder="Filter events...">
                    <button id="clear-filter" aria-label="Clear filter" title="Clear">&times;</button>
                </div>
            </div>

            <main role="main" id="main-content" style="opacity:0; transition: opacity 0.4s; position:relative;">
                <div id="messages" role="alert"></div>
                <div id="general-events"></div>
                <div id="training-events"></div>
            </main>
            
            <div id="loading-message" role="status" aria-live="polite">
                <span class="loading-spinner" aria-hidden="true"></span>
                <span class="loading-text">Getting data from 25Live...</span>
            </div>
        `;

        // Show info message on home page (with quick nav links)
        const infoMessage = document.getElementById('info-message');
        if (infoMessage) {
            infoMessage.style.display = 'block';
            // Show the quick nav links on home page
            const quickNavLinks = infoMessage.querySelectorAll('a, .nav-divider');
            quickNavLinks.forEach(link => link.style.display = '');

            // Set up smooth scrolling for quick nav links
            const scrollLinks = infoMessage.querySelectorAll('a[href^="#"]');
            scrollLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href').substring(1);

                    if (targetId === 'top') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                        const targetElement = document.getElementById(targetId);
                        if (targetElement) {
                            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }
                });
            });
        }

        // Trigger a custom event to reload home page data
        setTimeout(() => {
            const event = new CustomEvent('homePageLoaded');
            document.dispatchEvent(event);
        }, 100);
    }

    renderSearch() {
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <main>
                <p>Begin typing to search upcoming events...</p>

                <div id="search-input">
                    <div class="filter-input-wrapper">
                        <label for="search" class="visually-hidden">Search events by keyword or title</label>
                        <input type="text" id="search" placeholder="Search events..." autofocus>
                        <button id="clear-search" aria-label="Clear search input" title="Clear">&times;</button>
                    </div>
                </div>

                <div id="search-results"></div>
            </main>
        `;

        // Hide quick nav links on search page, keep hamburger visible
        const infoMessage = document.getElementById('info-message');
        if (infoMessage) {
            infoMessage.style.display = 'block';
            // Hide only the quick nav links
            const quickNavLinks = infoMessage.querySelectorAll('a, .nav-divider');
            quickNavLinks.forEach(link => link.style.display = 'none');
        }

        // Trigger search initialization
        setTimeout(() => {
            const event = new CustomEvent('searchPageLoaded');
            document.dispatchEvent(event);
        }, 100);
    }

    renderAbout() {
        const content = document.getElementById('app-content');
        content.innerHTML = `
            <main>
                <h2>Development Team</h2>
                <p>Developed by students in Clark College's <a
                        href="https://www.clark.edu/academics/programs/science-technology-and-engineering/web-dev/"
                        target="_blank">Web Development Program</a>.
                </p>
                <ul id="devteam">
                    <li><a href="https://www.linkedin.com/in/juniper-colville-8355b1218/"
                            target="_blank">Juniper Colville</a> - Testing and Quality Assurance</li>
                    <li><a href="https://bruceelgort.com" target="_blank">Professor Bruce Elgort</a></li>
                    <li><a href="https://www.linkedin.com/in/beheshta-e-44aa2b2b4/"
                            target="_blank">Beheshta Eqbali</a></li>
                    <li><a href="https://www.linkedin.com/in/shane-mitchell-b74b46361/"
                            target="_blank">Dank Mitchell</a></li>
                    <li><a href="https://www.linkedin.com/in/andrew-sabourin-b6ba1311a/"
                            target="_blank">Andrew Sabourin</a></li>
                </ul>
            </main>
        `;

        // Hide quick nav links on about page, keep hamburger visible
        const infoMessage = document.getElementById('info-message');
        if (infoMessage) {
            infoMessage.style.display = 'block';
            // Hide only the quick nav links
            const quickNavLinks = infoMessage.querySelectorAll('a, .nav-divider');
            quickNavLinks.forEach(link => link.style.display = 'none');
        }
    }
}

// Initialize router when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new Router());
} else {
    new Router();
}
