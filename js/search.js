// js/search.js

// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.querySelector("#search");
    const clearButton = document.querySelector("#clear-search");
    const resultsContainer = document.querySelector("#search-results");

    // Create separate lists & headers
    const eventList = document.createElement("ul");
    eventList.id = "event-results";
    const trainingList = document.createElement("ul");
    trainingList.id = "training-results";

    const eventHeader = document.createElement("h3");
    eventHeader.textContent = "Events at Clark College";
    const trainingHeader = document.createElement("h3");
    trainingHeader.textContent = "Employee Training and Development Events";

    resultsContainer.appendChild(eventHeader);
    resultsContainer.appendChild(eventList);
    resultsContainer.appendChild(trainingHeader);
    resultsContainer.appendChild(trainingList);
    resultsContainer.style.display = "none";

    const feeds = [
        {
            url: 'https://api.bruceelgort.com/get_data.php?feed=https://25livepub.collegenet.com/calendars/clark-events.rss',
            label: 'General Event',
            baseUrl: 'https://www.clark.edu/about/calendars/events.php'
        },
        {
            url: 'https://api.bruceelgort.com/get_data.php?feed=https://25livepub.collegenet.com/calendars/training-and-development.rss',
            label: 'Training Event',
            baseUrl: 'https://www.clark.edu/tlc/main-schedule.php'
        }
    ];

    // Mirror popup.js helper
    function getPacificNow() {
        const fmt = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Los_Angeles",
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
        return new Date(fmt.format(new Date()));
    }

    function formatDateString(date) {
        return date.toLocaleDateString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric'
        });
    }

    function formatEventTime(date) {
        const h = date.getHours(), m = date.getMinutes();
        if (h === 0 && m === 0) return "All Day";
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Build a single <li> + popup for each result
    function createEventListItem(event) {
        const nowPt = getPacificNow().getTime();
        const evTs = event.date.getTime();

        const li = document.createElement("li");
        li.className = "search-event";

        // pulse upcoming-soon if within next 60m
        if (evTs > nowPt && evTs <= nowPt + 60 * 60 * 1000) {
            li.classList.add("upcoming-soon");
        }

        // time
        const timeSpan = document.createElement("span");
        timeSpan.className = "search-event-time";
        timeSpan.textContent = `${formatDateString(event.date)} ${formatEventTime(event.date)}`;

        // link
        const link = document.createElement("a");
        link.href = event.link;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = event.title;

        // info button
        const infoButton = document.createElement("button");
        infoButton.className = "info-icon";
        infoButton.setAttribute("aria-label", "More information about this event");
        infoButton.innerHTML = `<i class="fa-solid fa-circle-info" aria-hidden="true"></i>`;

        // popup
        const popup = document.createElement("div");
        popup.className = "search-event-popup";

        // close button
        const popupClose = document.createElement("button");
        popupClose.className = "popup-close";
        popupClose.setAttribute("aria-label", "Close popup");
        popupClose.innerHTML = "×";
        popupClose.addEventListener("click", () => {
            popup.classList.remove("visible", "above");
            infoButton.classList.remove("active");
        });

        // header & content
        const popupHeader = document.createElement("div");
        popupHeader.className = "popup-header";
        popupHeader.appendChild(popupClose);

        const titleDiv = document.createElement("div");
        titleDiv.innerHTML = `<strong>${event.title}</strong>`;
        const descDiv = document.createElement("div");
        descDiv.innerHTML = event.description;

        popup.appendChild(popupHeader);
        popup.appendChild(titleDiv);
        popup.appendChild(descDiv);

        // toggle popup on info-button click
        infoButton.addEventListener("click", e => {
            e.stopPropagation();
            const isOpen = popup.classList.contains("visible");
            document.querySelectorAll(".search-event-popup")
                .forEach(p => p.classList.remove("visible", "above"));
            document.querySelectorAll(".info-icon")
                .forEach(ic => ic.classList.remove("active"));

            if (!isOpen) {
                infoButton.classList.add("active");
                popup.classList.add("visible");
                requestAnimationFrame(() => {
                    const rect = popup.getBoundingClientRect();
                    const belowSpace = window.innerHeight - rect.bottom;
                    const aboveSpace = rect.top;
                    if (belowSpace < 100 && aboveSpace > rect.height + 20) {
                        popup.classList.add("above");
                    } else {
                        popup.classList.remove("above");
                    }
                });
            }
        });

        // assemble
        li.appendChild(timeSpan);
        li.appendChild(link);
        li.appendChild(infoButton);
        li.appendChild(popup);
        return li;
    }

    // fetch + filter by title only
    function fetchAndSearchFeeds(query) {
        const q = query.toLowerCase();
        if (!q) {
            eventList.innerHTML = "";
            trainingList.innerHTML = "";
            resultsContainer.style.display = "none";
            return;
        }

        Promise.all(feeds.map(feed =>
            fetch(feed.url)
                .then(r => r.text())
                .then(str => {
                    const xml = new DOMParser().parseFromString(str, "text/xml");
                    return Array.from(xml.querySelectorAll("item"))
                        .map(item => {
                            const title = item.querySelector("title")?.textContent || "";
                            let desc = item.querySelector("description")?.textContent || "";
                            desc = desc.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>').replace(/(<br\s*\/?>\s*)+$/gi, '');
                            const link = item.querySelector("link")?.textContent || "";
                            const date = new Date(item.querySelector("pubDate")?.textContent || "");
                            let newLink = link;
                            try {
                                newLink = feed.baseUrl + new URL(link).search;
                            } catch { }
                            return { title, description: desc, link: newLink, date, label: feed.label };
                        })
                        .filter(ev => ev.title.toLowerCase().includes(q));
                })
        )).then(all => {
            const flat = all.flat();
            eventList.innerHTML = "";
            trainingList.innerHTML = "";

            if (flat.length === 0) {
                const p1 = document.createElement("p");
                p1.textContent = "No events found";
                eventList.appendChild(p1);
                const p2 = document.createElement("p");
                p2.textContent = "No events found";
                trainingList.appendChild(p2);
            } else {
                flat.sort((a, b) => a.date - b.date);
                let anyGen = false, anyTr = false;
                flat.forEach(ev => {
                    const li = createEventListItem(ev);
                    if (ev.label === "Training Event") {
                        trainingList.appendChild(li);
                        anyTr = true;
                    } else {
                        eventList.appendChild(li);
                        anyGen = true;
                    }
                });
                if (!anyGen) {
                    const p = document.createElement("p");
                    p.textContent = "No events found";
                    eventList.appendChild(p);
                }
                if (!anyTr) {
                    const p = document.createElement("p");
                    p.textContent = "No training events found";
                    trainingList.appendChild(p);
                }
            }

            resultsContainer.style.display = "block";
        }).catch(err => console.error("Search error:", err));
    }

    // clear-button clears & hides results
    clearButton.addEventListener("click", () => {
        searchInput.value = "";
        eventList.innerHTML = "";
        trainingList.innerHTML = "";
        resultsContainer.style.display = "none";
        searchInput.focus();
    });

    // start search on ≥3 chars
    searchInput.addEventListener("input", () => {
        const t = searchInput.value.trim();
        if (t.length < 3) {
            eventList.innerHTML = "";
            trainingList.innerHTML = "";
            resultsContainer.style.display = "none";
            return;
        }
        fetchAndSearchFeeds(t);
    });

    // clicking outside closes any pop­ups
    document.addEventListener("click", () => {
        document.querySelectorAll(".search-event-popup")
            .forEach(p => p.classList.remove("visible", "above"));
        document.querySelectorAll(".info-icon")
            .forEach(ic => ic.classList.remove("active"));
    });
});