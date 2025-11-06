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
        const year = String(date.getFullYear()).slice(-2);
        return date.toLocaleDateString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric'
        }) + " '" + year;
    }

    function formatEventTime(date) {
        const h = date.getHours(), m = date.getMinutes();
        if (h === 0 && m === 0) return "All Day";
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Build a single <li> + expandable details for each result
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
        infoButton.setAttribute("aria-expanded", "false");
        infoButton.innerHTML = `<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>`;

        // Create expandable details container
        const detailsContainer = document.createElement("div");
        detailsContainer.className = "event-details";

        // Insert Location before Web Area Keywords
        // COMMENTED OUT FOR NOW
        // let descWithLocation = event.description;
        // if (descWithLocation.includes('<b>Web Area Keywords</b>')) {
        //     descWithLocation = descWithLocation.replace(
        //         '<b>Web Area Keywords</b>',
        //         `<b>Location</b>:&nbsp;${event.location} <br/><b>Web Area Keywords</b>`
        //     );
        // } else if (descWithLocation.includes('<b>Event Locator</b>')) {
        //     descWithLocation = descWithLocation.replace(
        //         '<b>Event Locator</b>',
        //         `<b>Location</b>:&nbsp;${event.location} <br/><b>Event Locator</b>`
        //     );
        // } else {
        //     descWithLocation += `<br/><b>Location</b>:&nbsp;${event.location}`;
        // }

        detailsContainer.innerHTML = `
            <div class="event-details-content">
                <div><strong>${event.title}</strong></div>
                <div>${event.description}</div>
            </div>
        `;

        // toggle expansion on info-button click
        infoButton.addEventListener("click", e => {
            e.stopPropagation();
            const isExpanded = detailsContainer.classList.contains("expanded");

            // Close all other expanded details
            document.querySelectorAll(".event-details.expanded")
                .forEach(d => {
                    d.classList.remove("expanded");
                    d.style.maxHeight = null;
                });
            document.querySelectorAll(".info-icon")
                .forEach(ic => {
                    ic.classList.remove("active");
                    ic.setAttribute("aria-expanded", "false");
                    ic.querySelector("i").className = "fa-solid fa-chevron-down";
                });

            // If this item wasn't expanded, expand it now
            if (!isExpanded) {
                infoButton.classList.add("active");
                infoButton.setAttribute("aria-expanded", "true");
                infoButton.querySelector("i").className = "fa-solid fa-chevron-up";
                detailsContainer.classList.add("expanded");
                detailsContainer.style.maxHeight = detailsContainer.scrollHeight + "px";
            }
        });

        // Wrap time, link, and button in a container
        const eventHeader = document.createElement("div");
        eventHeader.className = "search-event-header";
        eventHeader.append(timeSpan, link, infoButton);

        li.appendChild(eventHeader);
        li.appendChild(detailsContainer);
        return li;
    }

    // fetch + filter by title, time, and description
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
                            // Clean description
                            let rawDesc = item.querySelector("description")?.textContent || "";
                            let description = rawDesc
                                .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
                                .replace(/(<br\s*\/?>\s*)+$/gi, '')
                                .replace(/<div[^>]*>\s*&nbsp;\s*<\/div>/gi, '');
                            // Remove <br> that immediately follows a </p>
                            description = description.replace(/<\/p>\s*<br\s*\/?>/gi, '</p>');
                            // Remove <br> that immediately follows a <div> opening tag (run multiple times to catch all instances)
                            while (/<div[^>]*>\s*<br\s*\/?>/i.test(description)) {
                                description = description.replace(/<div([^>]*)>\s*<br\s*\/?>/gi, '<div$1>');
                            }
                            // Remove <br> that immediately follows a </div> closing tag (run multiple times to catch all instances)
                            while (/<\/div>\s*<br\s*\/?>/i.test(description)) {
                                description = description.replace(/<\/div>\s*<br\s*\/?>/gi, '</div>');
                            }

                            // Extract location from description (it's at the beginning before first <br/>)
                            let location = "Location not specified";
                            const descMatch = description.match(/^([^<]+)<br/i);
                            if (descMatch) {
                                const firstLine = descMatch[1].trim();
                                // Check if the first line is a date (contains day name followed by comma)
                                if (!/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/.test(firstLine)) {
                                    location = firstLine;
                                }
                            }

                            const link = item.querySelector("link")?.textContent || "";
                            const date = new Date(item.querySelector("pubDate")?.textContent || "");
                            let newLink = link;
                            try {
                                newLink = feed.baseUrl + new URL(link).search;
                            } catch { }

                            // Format time for searching
                            const timeStr = formatEventTime(date);
                            const dateStr = formatDateString(date);

                            return {
                                title,
                                description: description,
                                link: newLink,
                                date,
                                label: feed.label,
                                location: location,
                                timeStr,
                                dateStr
                            };
                        })
                        .filter(ev => {
                            // Search in title, time, date, and description (stripped of HTML tags)
                            const titleMatch = ev.title.toLowerCase().includes(q);
                            const timeMatch = ev.timeStr.toLowerCase().includes(q);
                            const dateMatch = ev.dateStr.toLowerCase().includes(q);
                            // Strip HTML tags from description for searching
                            const plainDesc = ev.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
                            const descMatch = plainDesc.includes(q);

                            return titleMatch || timeMatch || dateMatch || descMatch;
                        });
                })
        )).then(all => {
            const flat = all.flat();
            eventList.innerHTML = "";
            trainingList.innerHTML = "";

            if (flat.length === 0) {
                // Don't show "No events found" - just leave lists empty
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
                // Don't show "No events found" messages - just leave sections empty
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