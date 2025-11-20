console.log("DEBUG: popup.js loaded");


// Show messages from GitHub
const messages = document.querySelector("#messages");
const messagesUrl = "https://raw.githubusercontent.com/belgort-clark/clark-college-events-messages/refs/heads/main/messages.json";

fetch(messagesUrl)
  .then(response => {
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.json();
  })
  .then(data => {
    if (data.message) {
      messages.innerHTML = data.message;
      messages.style.display = 'block';
    }
  })
  .catch(error => {
    console.error('There was an error with the fetch operation:', error);
  });

// Render today's date
function renderTodayDate() {
  const now = new Date();
  const heading = document.querySelector('#event-date');
  if (!heading) return; // No header element on this page
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  heading.innerHTML = 'Clark College Events';
}

// Get Pacific‐time “now”
function getPacificNow() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  return new Date(formatter.format(new Date()));
}

// Format H:MM or "All Day"
function formatEventTime(date) {
  const h = date.getHours(), m = date.getMinutes();
  if (h === 0 && m === 0) return "All Day";
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Fetch & parse RSS
function fetchRssFeed(url, replacementBaseUrl) {
  const loadingMessage = document.getElementById('loading-message');
  let loadingTimeout;
  loadingMessage.classList.remove('show');
  loadingMessage.style.display = '';
  loadingMessage.setAttribute('aria-hidden', 'false');
  loadingTimeout = setTimeout(() => {
    loadingMessage.classList.add('show');
  }, 2000);
  return fetch(url)
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.text();
    })
    .then(text => {
      clearTimeout(loadingTimeout);
      loadingMessage.classList.remove('show');
      return parseRss(text, replacementBaseUrl);
    })
    .catch(error => {
      clearTimeout(loadingTimeout);
      loadingMessage.classList.remove('show');
      loadingMessage.style.display = 'none';
      loadingMessage.setAttribute('aria-hidden', 'true');
      const messages = document.getElementById('messages');
      if (messages) {
        messages.style.display = 'block';
        messages.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="margin-right: 8px;" aria-hidden="true"></i>Unable to load events. Please check your internet connection or try again later.';
        messages.setAttribute('data-timeout-error', 'true');
      }
      // Hide main content sections when there's an error
      const generalEvents = document.getElementById('general-events');
      const trainingEvents = document.getElementById('training-events');
      if (generalEvents) generalEvents.style.display = 'none';
      if (trainingEvents) trainingEvents.style.display = 'none';
      const main = document.getElementById('main-content');
      if (main) main.style.opacity = 1;
      // Return empty event lists so downstream code doesn't break
      return { todayEarlierEvents: [], todayUpcomingEvents: [], tomorrowEvents: [], upcomingEvents: [] };
    });
}
function parseRss(text, replacementBaseUrl) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");
  const items = xmlDoc.querySelectorAll("item");

  const nowPT = getPacificNow();
  const today = new Date(nowPT.getFullYear(), nowPT.getMonth(), nowPT.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const normTom = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  const todayUpcomingEvents = [];
  const todayEarlierEvents = [];
  const tomorrowEvents = [];
  const upcomingEvents = [];

  // Calculate the end of the 10-day rolling window
  const rollingEnd = new Date(today);
  rollingEnd.setDate(today.getDate() + 10);
  rollingEnd.setHours(23, 59, 59, 999);

  Array.from(items)
    .sort((a, b) =>
      new Date(a.querySelector("pubDate")?.textContent || 0) -
      new Date(b.querySelector("pubDate")?.textContent || 0)
    )
    .forEach(item => {
      const title = item.querySelector("title")?.textContent || "";
      const pubDateStr = item.querySelector("pubDate")?.textContent || "";
      const eventDate = new Date(pubDateStr);
      const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

      // build link
      let originalLink = item.querySelector("link")?.textContent || "";
      let newLink = originalLink;
      try {
        const u = new URL(originalLink);
        newLink = replacementBaseUrl + u.search;
      } catch {
        console.warn("Invalid URL in feed:", originalLink);
      }

      // clean description
      let rawDesc = item.querySelector("description")?.textContent || "";
      let description = rawDesc
        .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
        .replace(/(<br\s*\/?>\s*)+$/gi, '')
        .replace(/<div[^>]*>\s*&nbsp;\s*<\/div>/gi, '');
      // Remove <p>&nbsp;</p> tags (multiple occurrences, with or without attributes)
      // Handles &nbsp; entity, actual non-breaking space character, and just whitespace
      // More aggressive: matches any combination of whitespace and nbsp
      while (/<p[^>]*>[\s\u00A0&nbsp;]*<\/p>/i.test(description)) {
        description = description.replace(/<p[^>]*>[\s\u00A0&nbsp;]*<\/p>/gi, '');
      }
      // Remove <br> that immediately follows a </p>
      description = description.replace(/<\/p>\s*<br\s*\/?>/gi, '</p>');
      // Remove <br> that immediately follows a <div> opening tag
      while (/<div[^>]*>\s*<br\s*\/?>/i.test(description)) {
        description = description.replace(/<div([^>]*)>\s*<br\s*\/?>/gi, '<div$1>');
      }
      // Remove <br> that immediately follows a </div> closing tag
      while (/<\/div>\s*<br\s*\/?>/i.test(description)) {
        description = description.replace(/<\/div>\s*<br\s*\/?>/gi, '</div>');
      }

      // Determine if event has passed (1 hour after start time)
      const oneHourAfter = new Date(eventDate.getTime() + 60 * 60 * 1000);
      const isPast =
        !(eventDate.getHours() === 0 && eventDate.getMinutes() === 0) &&
        oneHourAfter < nowPT;

      // ============================================================================
      // EVENT STATE DETECTION - Controls "soon" (orange pulse) and "in progress" (green pulse)
      // ============================================================================
      // PRODUCTION MODE (ACTIVE):
      // - "Soon": Events within 60 min before to 30 min after start time
      // - "In Progress": Events that started and are within 1 hour duration
      const nowMs = nowPT.getTime();
      const startMs = eventDate.getTime();
      const past60 = nowMs - 60 * 60 * 1000;
      const next30 = nowMs + 30 * 60 * 1000;
      const isSoon = startMs >= past60 && startMs <= next30;
      const isInProgress = startMs <= nowMs && nowMs < startMs + 60 * 60 * 1000;

      // TEST MODE (to visualize event states with more data):
      // Uncomment the 4 lines below and comment out the 4 lines above
      // const past60 = nowMs - 24 * 60 * 60 * 1000;
      // const next30 = nowMs + 24 * 60 * 60 * 1000;
      // const isSoon = startMs >= past60 && startMs <= next30;
      // const isInProgress = startMs <= nowMs && nowMs < startMs + 24 * 60 * 60 * 1000;
      // ============================================================================

      // Extract location from description (it's at the beginning before first <br/>)
      let location = "Location not specified";
      const descMatch = description.match(/^([^<]+)<br/i);
      if (descMatch) {
        const firstLine = descMatch[1].trim();
        // Check if the first line is a date (skip if it starts with a day name)
        if (!/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/.test(firstLine)) {
          location = firstLine;
        }
      }

      const ev = {
        title,
        date: eventDate,
        timeStr: formatEventTime(eventDate),
        link: newLink,
        isPast,
        isSoon,
        isInProgress,
        description,
        location: location
      };

      if (eventDay.getTime() === today.getTime()) {
        if (isPast) todayEarlierEvents.push(ev);
        else todayUpcomingEvents.push(ev);
      } else if (eventDay.getTime() === normTom.getTime()) {
        tomorrowEvents.push(ev);
      } else if (eventDay.getTime() > normTom.getTime() && eventDay.getTime() <= rollingEnd.getTime()) {
        upcomingEvents.push(ev);
      }
    });

  return { todayEarlierEvents, todayUpcomingEvents, tomorrowEvents, upcomingEvents };
}

// Helper function to render upcoming events list with day grouping
function renderUpcomingEventsList(ul, events, parentElement) {
  // Group events by day
  const byDay = {};
  events.forEach(ev => {
    const dayKey = ev.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!byDay[dayKey]) byDay[dayKey] = [];
    byDay[dayKey].push(ev);
  });

  Object.entries(byDay).forEach(([day, dayEvents]) => {
    const dayLi = document.createElement("li");
    dayLi.classList.add("date-header");
    dayLi.textContent = day;
    ul.appendChild(dayLi);

    dayEvents.forEach(ev => {
      const li = document.createElement("li");

      if (ev.isSoon) {
        li.classList.add("upcoming-soon");
        li.dataset.startTime = ev.date.getTime();
      }
      if (ev.isInProgress) {
        li.classList.add("event-in-progress");
      }

      const ts = document.createElement("span");
      ts.className = "event-time";
      ts.textContent = ev.timeStr;
      const linkEl = document.createElement("a");
      linkEl.href = ev.link;
      linkEl.target = "_blank";
      linkEl.rel = "noopener noreferrer";
      linkEl.textContent = ev.title;
      if (ev.isPast) linkEl.classList.add("event-past");

      // Add keyboard accessibility for screen readers (Ctrl/Cmd+Enter to expand details)
      linkEl.addEventListener("keydown", e => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          // Trigger the button click to expand details
          setTimeout(() => {
            const btn = linkEl.parentElement.querySelector(".info-icon");
            if (btn) btn.click();
          }, 0);
        }
      });

      const btn = document.createElement("button");
      btn.className = "info-icon";
      btn.setAttribute("aria-label", "More information");
      btn.setAttribute("aria-expanded", "false");
      btn.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';

      const detailsContainer = document.createElement("div");
      detailsContainer.className = "event-details";

      detailsContainer.innerHTML = `
        <div class="event-details-content">
          <div><strong>${ev.title}</strong></div>
          <div>${ev.description}</div>
        </div>
      `;

      // Remove <p>&nbsp;</p> tags from the rendered content
      const contentDiv = detailsContainer.querySelector('.event-details-content');
      if (contentDiv) {
        const emptyParas = contentDiv.querySelectorAll('p');
        emptyParas.forEach(p => {
          const text = p.textContent.trim();
          if (text === '' || text === '\u00A0' || text.replace(/\s/g, '') === '') {
            p.remove();
          }
        });
      }

      btn.addEventListener("click", e => {
        e.stopPropagation();
        const isExpanded = detailsContainer.classList.contains("expanded");

        // Close all other expanded details
        document.querySelectorAll(".event-details.expanded").forEach(el => {
          el.classList.remove("expanded");
          el.style.maxHeight = null;
        });
        document.querySelectorAll(".info-icon").forEach(ic => {
          ic.classList.remove("active");
          ic.setAttribute("aria-expanded", "false");
          ic.querySelector("i").className = "fa-solid fa-chevron-down";
        });

        if (!isExpanded) {
          btn.classList.add("active");
          detailsContainer.classList.add("expanded");
          btn.setAttribute("aria-expanded", "true");
          btn.querySelector("i").className = "fa-solid fa-chevron-up";
          detailsContainer.style.maxHeight = detailsContainer.scrollHeight + "px";
        }
      });

      const eventHeader = document.createElement("div");
      eventHeader.className = "event-header";
      eventHeader.appendChild(ts);
      eventHeader.appendChild(linkEl);
      eventHeader.appendChild(btn);
      li.appendChild(eventHeader);
      li.appendChild(detailsContainer);
      ul.appendChild(li);
    });
  });

  parentElement.appendChild(ul);
}

// Render sections
function renderEventSection(containerId, sectionTitle, descriptionText, data, sectionLinkUrl, showFuture) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const section = document.createElement("section");
  section.classList.add("event-section");

  // header
  const h2 = document.createElement("h2");
  const a = document.createElement("a");
  a.href = sectionLinkUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = sectionTitle;
  h2.appendChild(a);
  section.appendChild(h2);

  // intro
  if (descriptionText) {
    const p = document.createElement("p");
    p.innerHTML = descriptionText;
    section.appendChild(p);
  }

  // sub‐lists
  function renderList(label, events, allowEmpty) {
    if (!events.length && !allowEmpty) return;

    // Check if this is the "Upcoming Events" section - make it collapsible
    const isUpcomingEvents = label.startsWith("Upcoming Events");

    if (isUpcomingEvents) {
      const details = document.createElement("details");
      // Collapsed by default (no 'open' attribute)
      const summary = document.createElement("summary");
      summary.textContent = label;
      details.appendChild(summary);
      section.appendChild(details);

      if (!events.length) {
        const msg = document.createElement("p");
        msg.textContent = "No scheduled events";
        details.appendChild(msg);
        return;
      }

      const ul = document.createElement("ul");
      // Continue rendering inside details element
      renderUpcomingEventsList(ul, events, details);
      return;
    }

    // For non-upcoming sections, render as before
    const h3 = document.createElement("h3");
    h3.textContent = label;
    section.appendChild(h3);

    if (!events.length) {
      const msg = document.createElement("p");
      msg.textContent = "No scheduled events";
      section.appendChild(msg);
      return;
    }

    const ul = document.createElement("ul");

    // Render events for non-upcoming sections (Today, Tomorrow)
    events.forEach(ev => {
      const li = document.createElement("li");
      if (ev.isSoon) {
        li.classList.add("upcoming-soon");
        li.dataset.startTime = ev.date.getTime();
      }
      if (ev.isInProgress) {
        li.classList.add("event-in-progress");
      }
      const ts = document.createElement("span");
      ts.className = "event-time";
      ts.textContent = ev.timeStr;
      const linkEl = document.createElement("a");
      linkEl.href = ev.link;
      linkEl.target = "_blank";
      linkEl.rel = "noopener noreferrer";
      linkEl.textContent = ev.title;
      if (ev.isPast) linkEl.classList.add("event-past");

      // Add keyboard accessibility for screen readers (Ctrl/Cmd+Enter to expand details)
      linkEl.addEventListener("keydown", e => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          // Trigger the button click to expand details
          setTimeout(() => {
            const btn = linkEl.parentElement.querySelector(".info-icon");
            if (btn) btn.click();
          }, 0);
        }
      });

      const btn = document.createElement("button");
      btn.className = "info-icon";
      btn.setAttribute("aria-label", "More information");
      btn.setAttribute("aria-expanded", "false");
      btn.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';

      // Create expandable details container
      const detailsContainer = document.createElement("div");
      detailsContainer.className = "event-details";

      // Insert Location before Web Area Keywords
      // COMMENTED OUT FOR NOW
      // let descWithLocation = ev.description;
      // if (descWithLocation.includes('<b>Web Area Keywords</b>')) {
      //   descWithLocation = descWithLocation.replace(
      //     '<b>Web Area Keywords</b>',
      //     `<b>Location</b>:&nbsp;${ev.location} <br/><b>Web Area Keywords</b>`
      //   );
      // } else if (descWithLocation.includes('<b>Event Locator</b>')) {
      //   descWithLocation = descWithLocation.replace(
      //     '<b>Event Locator</b>',
      //     `<b>Location</b>:&nbsp;${ev.location} <br/><b>Event Locator</b>`
      //   );
      // } else {
      //   descWithLocation += `<br/><b>Location</b>:&nbsp;${ev.location}`;
      // }

      detailsContainer.innerHTML = `
          <div class="event-details-content">
            <div><strong>${ev.title}</strong></div>
            <div>${ev.description}</div>
          </div>
        `;

      // Remove <p>&nbsp;</p> tags from the rendered content
      const contentDiv = detailsContainer.querySelector('.event-details-content');
      if (contentDiv) {
        const emptyParas = contentDiv.querySelectorAll('p');
        emptyParas.forEach(p => {
          const text = p.textContent.trim();
          if (text === '' || text === '\u00A0' || text.replace(/\s/g, '') === '') {
            p.remove();
          }
        });
      }

      btn.addEventListener("click", e => {
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

        if (!isExpanded) {
          btn.classList.add("active");
          btn.setAttribute("aria-expanded", "true");
          btn.querySelector("i").className = "fa-solid fa-chevron-up";
          detailsContainer.classList.add("expanded");
          detailsContainer.style.maxHeight = detailsContainer.scrollHeight + "px";
        }
      });

      // Wrap time, link, and button in a container
      const eventHeader = document.createElement("div");
      eventHeader.className = "event-header";
      eventHeader.append(ts, linkEl, btn);

      li.appendChild(eventHeader);
      li.appendChild(detailsContainer);
      ul.appendChild(li);
    });
    section.appendChild(ul);
  }


  renderList("Today", data.todayUpcomingEvents, true);
  renderList("Earlier Today", data.todayEarlierEvents, false);
  renderList("Tomorrow", data.tomorrowEvents, true);
  if (showFuture) {
    renderList("Upcoming Events (next 10 days)", data.upcomingEvents, true);
  }

  container.appendChild(section);
  container.style.display = "block";
}

// remove pulse exactly 60min after start-time
setInterval(() => {
  document.querySelectorAll(".upcoming-soon").forEach(li => {
    const start = Number(li.dataset.startTime);
    if (Date.now() >= start + 60 * 60 * 1000) {
      li.classList.remove("upcoming-soon");
    }
  });
}, 60 * 1000);

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  renderTodayDate();
  const loadingMessages = document.querySelectorAll("#loading-message");
  const loading = loadingMessages[loadingMessages.length - 1];
  let showLoadingTimeout = null;
  let globalTimeout = null;
  const messages = document.getElementById('messages');

  // Show the loading overlay only if loading takes longer than 2 seconds
  showLoadingTimeout = setTimeout(() => {
    if (loading) {
      loading.classList.add('show');
    }
  }, 2000);

  // Global timeout for all feeds (e.g., 10 seconds)
  globalTimeout = setTimeout(() => {
    if (loading) {
      loading.classList.remove('show');
      loading.style.display = 'none';
      loading.setAttribute('aria-hidden', 'true');
    }
    if (messages) {
      messages.style.display = 'block';
      messages.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="margin-right: 8px;" aria-hidden="true"></i>Unable to load events. Please check your internet connection or try again later.';
      messages.setAttribute('data-timeout-error', 'true');
    }
    // Hide main content sections when there's an error
    const generalEvents = document.getElementById('general-events');
    const trainingEvents = document.getElementById('training-events');
    if (generalEvents) generalEvents.style.display = 'none';
    if (trainingEvents) trainingEvents.style.display = 'none';
    const main = document.getElementById('main-content');
    if (main) main.style.opacity = 1;
  }, 10000);

  Promise.all([
    fetchRssFeed(
      'https://api.bruceelgort.com/get_data.php?feed=https://25livepub.collegenet.com/calendars/clark-events.rss',
      'https://www.clark.edu/about/calendars/events.php'
    ),
    fetchRssFeed(
      'https://api.bruceelgort.com/get_data.php?feed=https://25livepub.collegenet.com/calendars/training-and-development.rss',
      'https://www.clark.edu/tlc/main-schedule.php'
    )
  ])
    .then(([gen, train]) => {
      if (globalTimeout) {
        clearTimeout(globalTimeout);
        globalTimeout = null;
      }

      // Check if there's already an error displayed
      const messages = document.getElementById('messages');
      if (messages && messages.getAttribute('data-timeout-error') === 'true') {
        // Don't render sections if there's an error
        return;
      }

      renderEventSection(
        "general-events",
        "Events at Clark College",
        "Displaying college community events, important dates, enrollment deadlines, and student activities happening today, tomorrow, and beyond.",
        gen,
        "https://www.clark.edu/about/calendars/events.php",
        true
      );
      renderEventSection(
        "training-events",
        "Employee Training and Development Events",
        "These events are part of Clark College's Employee Training and Development programs happening today, tomorrow, and beyond.",
        train,
        "https://www.clark.edu/tlc/main-schedule.php",
        true
      );
    })
    .finally(() => {
      if (showLoadingTimeout) {
        clearTimeout(showLoadingTimeout);
        showLoadingTimeout = null;
      }
      if (globalTimeout) {
        clearTimeout(globalTimeout);
        globalTimeout = null;
      }
      // Only hide overlay and show content if a timeout error is not already shown
      if (messages && messages.getAttribute('data-timeout-error') === 'true') {
        // Do nothing, error already shown
      } else {
        if (loading) {
          loading.classList.remove('show');
        }
        const main = document.getElementById('main-content');
        if (main) main.style.opacity = 1;

        // Show footer and info message after data loads
        const footer = document.getElementById('footer');
        if (footer) footer.style.display = 'block';
        const infoMessage = document.getElementById('info-message');
        if (infoMessage) infoMessage.style.display = 'block';
        const filterSearch = document.getElementById('filter-search');
        if (filterSearch) filterSearch.style.display = 'block';
      }
    });
});

// ========== Filter Functionality ==========
document.addEventListener('DOMContentLoaded', () => {
  const filterInput = document.getElementById('filter-input');
  const clearFilterBtn = document.getElementById('clear-filter');

  if (!filterInput || !clearFilterBtn) return;

  // Store all event items for filtering
  let allEventItems = [];

  // Function to collect all event items
  function collectEventItems() {
    allEventItems = Array.from(document.querySelectorAll('#general-events li, #training-events li'));
  }

  // Function to hide/show section headers based on visible events
  function updateSectionVisibility() {
    const generalEvents = document.getElementById('general-events');
    const trainingEvents = document.getElementById('training-events');
    const filterInput = document.getElementById('filter-input');
    const isFiltering = filterInput && filterInput.value.trim().length > 0;

    // Helper function to update visibility for a section
    function updateSection(container) {
      if (!container) return;

      // Always keep section h2 and description paragraph visible
      const headers = container.querySelectorAll('h2');
      headers.forEach(h => {
        h.style.display = 'block';
      });

      // Always show section description paragraph (first p after h2)
      const sectionElement = container.querySelector('section');
      if (sectionElement) {
        const descParagraph = sectionElement.querySelector('h2 + p');
        if (descParagraph && descParagraph.textContent !== 'No scheduled events') {
          descParagraph.style.display = 'block';
        }
      }

      // Get all h3 headers in this section
      const h3Headers = container.querySelectorAll('h3');

      h3Headers.forEach(h3 => {
        // Find the next element after this h3
        let nextElement = h3.nextElementSibling;

        if (!nextElement) {
          // No next element, hide the h3
          h3.style.display = 'none';
          return;
        }

        // Case 1: h3 followed by "No scheduled events" paragraph (no ul exists)
        if (nextElement.tagName === 'P' && nextElement.textContent === 'No scheduled events') {
          // Always show the h3, but hide the "No scheduled events" message when filtering
          h3.style.display = 'block';
          nextElement.style.display = isFiltering ? 'none' : 'block';
          return;
        }

        // Case 2: h3 followed by ul
        if (nextElement.tagName === 'UL') {
          // Check if this ul has any visible event items (not date headers)
          const visibleEvents = Array.from(nextElement.querySelectorAll('li')).filter(li => {
            return li.style.display !== 'none' && !li.classList.contains('date-header');
          });

          // Always show the h3, hide the ul only if no visible events
          h3.style.display = 'block';
          nextElement.style.display = visibleEvents.length === 0 ? 'none' : 'block';
          return;
        }

        // Case 3: unexpected structure - hide the h3
        h3.style.display = 'none';
      });
    }

    updateSection(generalEvents);
    updateSection(trainingEvents);
  }

  // Function to filter events
  function filterEvents() {
    const searchTerm = filterInput.value.toLowerCase().trim();

    // Get all details elements (for collapsible sections like Upcoming Events)
    const detailsElements = document.querySelectorAll('.event-section details');

    if (searchTerm.length === 0) {
      // Collapse the Upcoming Events section when no filter
      detailsElements.forEach(details => {
        details.removeAttribute('open');
      });

      // Show all events and headers if search is empty
      allEventItems.forEach(item => {
        if (item.classList.contains('date-header')) {
          // Date headers
          item.style.display = 'list-item';
        } else {
          // Event items
          item.style.display = 'block';
        }
      });
      // Show all section headers, h3 subsection headers, uls, and "No scheduled events" messages
      document.querySelectorAll('#general-events h2, #training-events h2, #general-events h3, #training-events h3').forEach(h => {
        h.style.display = 'block';
      });
      document.querySelectorAll('#general-events ul, #training-events ul').forEach(ul => {
        ul.style.display = 'block';
      });
      document.querySelectorAll('#general-events p, #training-events p').forEach(p => {
        if (p.textContent === 'No scheduled events') {
          p.style.display = 'block';
        }
      });
      return;
    }

    // Expand the Upcoming Events section when filtering
    detailsElements.forEach(details => {
      details.setAttribute('open', '');
    });

    // Hide "No scheduled events" messages when filtering
    document.querySelectorAll('#general-events p, #training-events p').forEach(p => {
      if (p.textContent === 'No scheduled events') {
        p.style.display = 'none';
      }
    });

    // First pass: filter events and mark them
    allEventItems.forEach(item => {
      // Skip date headers in first pass
      if (item.classList.contains('date-header')) {
        return;
      }

      // Get event title
      const titleElement = item.querySelector('a');
      const title = titleElement ? titleElement.textContent.toLowerCase() : '';

      // Get event time
      const timeElement = item.querySelector('.event-time');
      const time = timeElement ? timeElement.textContent.toLowerCase() : '';

      // Get expanded details content (description)
      const detailsElement = item.querySelector('.event-details-content');
      const details = detailsElement ? detailsElement.textContent.toLowerCase() : '';

      // Check if search term matches title, time, or details
      const matches = title.includes(searchTerm) ||
        time.includes(searchTerm) ||
        details.includes(searchTerm);

      item.style.display = matches ? 'block' : 'none';
    });

    // Second pass: show/hide date headers based on whether they have visible events after them
    allEventItems.forEach((item, index) => {
      if (item.classList.contains('date-header')) {
        // Check if there are any visible events after this date header and before the next date header
        let hasVisibleEvents = false;
        for (let i = index + 1; i < allEventItems.length; i++) {
          const nextItem = allEventItems[i];
          // Stop when we hit the next date header
          if (nextItem.classList.contains('date-header')) {
            break;
          }
          // Check if this event is visible
          if (nextItem.style.display !== 'none') {
            hasVisibleEvents = true;
            break;
          }
        }
        // Show the date header only if it has visible events
        item.style.display = hasVisibleEvents ? 'list-item' : 'none';
      }
    });

    // After filtering, check if details elements have visible events before expanding
    detailsElements.forEach(details => {
      const ul = details.querySelector('ul');
      if (ul) {
        const visibleItems = Array.from(ul.querySelectorAll('li')).filter(li =>
          !li.classList.contains('date-header') && li.style.display !== 'none'
        );
        // Only expand if there are visible events
        if (visibleItems.length > 0) {
          details.setAttribute('open', '');
        } else {
          details.removeAttribute('open');
        }
      }
    });

    // Update section header visibility
    updateSectionVisibility();
  }

  // Collect items when sections are populated
  const observer = new MutationObserver(() => {
    collectEventItems();
  });

  const generalEvents = document.getElementById('general-events');
  const trainingEvents = document.getElementById('training-events');

  if (generalEvents) {
    observer.observe(generalEvents, { childList: true, subtree: true });
  }
  if (trainingEvents) {
    observer.observe(trainingEvents, { childList: true, subtree: true });
  }

  // Event listeners
  filterInput.addEventListener('input', filterEvents);

  clearFilterBtn.addEventListener('click', () => {
    filterInput.value = '';
    filterEvents();
    filterInput.focus();
  });

  // Clear on Escape key
  filterInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      filterInput.value = '';
      filterEvents();
    }
  });
});
