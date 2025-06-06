document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.querySelector("#search");
    const clearButton = document.querySelector("#clear-search");
    const resultsContainer = document.querySelector("#search-results");

    // Create two separate <ul> containers: one for general events, one for training
    const eventList = document.createElement("ul");
    eventList.id = "event-results";
    const trainingList = document.createElement("ul");
    trainingList.id = "training-results";

    // Headings for each section
    const eventHeader = document.createElement("h3");
    eventHeader.textContent = "Events at Clark College";
    const trainingHeader = document.createElement("h3");
    trainingHeader.textContent = "Employee Training and Development Events";

    // Append headings and lists into the results container
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

    function formatDateString(date) {
        return date.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatEventTime(date) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        if (hours === 0 && minutes === 0) return "All Day";
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function createEventListItem(event) {
        const li = document.createElement("li");
        li.className = "search-event";

        const timeSpan = document.createElement("span");
        timeSpan.className = "search-event-time";
        timeSpan.textContent = `${formatDateString(event.date)} ${formatEventTime(event.date)}`;

        const link = document.createElement("a");
        link.href = event.link;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = event.title;

        const infoButton = document.createElement("button");
        infoButton.className = "info-icon";
        infoButton.setAttribute("aria-label", "More information about this event");
        infoButton.innerHTML = '<i class="fa-solid fa-circle-info" aria-hidden="true"></i>';

        const popup = document.createElement("div");
        popup.className = "search-event-popup";

        const popupClose = document.createElement("button");
        popupClose.className = "popup-close";
        popupClose.setAttribute("aria-label", "Close popup");
        popupClose.innerHTML = "&times;";
        popupClose.addEventListener("click", () => {
            popup.classList.remove("visible");
            infoButton.classList.remove("active");
        });

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

        infoButton.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = popup.classList.contains("visible");
            document.querySelectorAll(".search-event-popup").forEach(p => p.classList.remove("visible", "above"));
            document.querySelectorAll(".info-icon").forEach(icon => icon.classList.remove("active"));
            if (!isOpen) {
                infoButton.classList.add("active");
                popup.classList.add("visible");
                requestAnimationFrame(() => {
                    const rect = popup.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const spaceAbove = rect.top;
                    if (spaceBelow < 100 && spaceAbove > rect.height + 20) {
                        popup.classList.add("above");
                    } else {
                        popup.classList.remove("above");
                    }
                });
            }
        });

        li.appendChild(timeSpan);
        li.appendChild(link);
        li.appendChild(infoButton);
        li.appendChild(popup);

        return li;
    }

    function fetchAndSearchFeeds(query) {
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) {
            eventList.innerHTML = "";
            trainingList.innerHTML = "";
            resultsContainer.style.display = "none";
            return;
        }

        Promise.all(feeds.map(feed =>
            fetch(feed.url)
                .then(res => res.text())
                .then(text => {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(text, "text/xml");
                    const items = xmlDoc.querySelectorAll("item");

                    return Array.from(items).map(item => {
                        const title = item.querySelector("title")?.textContent || "";
                        // const description = item.querySelector("description")?.textContent || "";
                        let description = item.querySelector("description")?.textContent || "";
                        description = description
                            .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
                            .replace(/(<br\s*\/?>\s*)+$/gi, '');
                        const link = item.querySelector("link")?.textContent || "";
                        const pubDate = new Date(item.querySelector("pubDate")?.textContent || new Date());

                        let newLink = link;
                        try {
                            const originalUrl = new URL(link);
                            newLink = feed.baseUrl + originalUrl.search;
                        } catch (e) {
                            // leave link as is
                        }

                        return {
                            title,
                            description,
                            link: newLink,
                            date: pubDate,
                            label: feed.label
                        };
                    }).filter(event =>
                        event.title.toLowerCase().includes(lowerQuery)
                    );
                })
        )).then(results => {
            const allMatches = results.flat();
            eventList.innerHTML = "";
            trainingList.innerHTML = "";

            if (allMatches.length === 0) {
                // If no matches at all, show a single "No events found." under general Events
                const noResult = document.createElement("p");
                noResult.textContent = "No events found.";
                eventList.appendChild(noResult);
                // Also show “no training events found” under training
                const noTraining = document.createElement("p");
                noTraining.textContent = "No training events found.";
                trainingList.appendChild(noTraining);
            } else {
                allMatches.sort((a, b) => a.date - b.date);
                let hasEvent = false;
                let hasTraining = false;

                allMatches.forEach(event => {
                    const li = createEventListItem(event);
                    if (event.label === "Training Event") {
                        trainingList.appendChild(li);
                        hasTraining = true;
                    } else {
                        eventList.appendChild(li);
                        hasEvent = true;
                    }
                });

                if (!hasEvent) {
                    const noEvent = document.createElement("p");
                    noEvent.textContent = "No events found.";
                    eventList.appendChild(noEvent);
                }
                if (!hasTraining) {
                    const noTraining = document.createElement("p");
                    noTraining.textContent = "No training events found.";
                    trainingList.appendChild(noTraining);
                }
            }

            resultsContainer.style.display = "block";
        }).catch(err => {
            console.error("Error fetching feeds:", err);
        });
    }

    // Clear button: empties input and hides results
    clearButton.addEventListener("click", () => {
        searchInput.value = "";
        eventList.innerHTML = "";
        trainingList.innerHTML = "";
        resultsContainer.style.display = "none";
        searchInput.focus();
    });

    searchInput.addEventListener("input", () => {
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (searchTerm.length < 3) {
            eventList.innerHTML = "";
            trainingList.innerHTML = "";
            resultsContainer.style.display = "none";
            return;
        }
        fetchAndSearchFeeds(searchTerm);
    });

    // Clicking elsewhere closes any open pop-ups
    document.addEventListener("click", () => {
        document.querySelectorAll(".search-event-popup").forEach(p => p.classList.remove("visible", "above"));
        document.querySelectorAll(".info-icon").forEach(icon => icon.classList.remove("active"));
    });
});