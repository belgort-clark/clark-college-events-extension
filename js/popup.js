// Show messages from GitHub
const messages = document.querySelector("#messages");
const messagesUrl = "https://raw.githubusercontent.com/belgort-clark/clark-college-events-messages/refs/heads/main/messages.json";

fetch(messagesUrl)
  .then(response => {
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.json();
  })
  .then(data => {
    if (data.message !== "") {
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
  heading.innerHTML = 'Clark College Events <br><small>' + now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }) + '</small>';
}

function getPacificNow() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  return new Date(formatter.format(new Date()));
}

function formatEventTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (hours === 0 && minutes === 0) return "All Day";
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fetchRssFeed(url, replacementBaseUrl) {
  return fetch(url)
    .then(response => response.text())
    .then(text => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const items = xmlDoc.querySelectorAll("item");

      const nowPacific = getPacificNow();
      const today = new Date(nowPacific.getFullYear(), nowPacific.getMonth(), nowPacific.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const normalizedTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

      const todayUpcomingEvents = [];
      const todayEarlierEvents = [];
      const tomorrowEvents = [];

      const sortedItems = Array.from(items).sort((a, b) => {
        const dateA = new Date(a.querySelector("pubDate")?.textContent || 0);
        const dateB = new Date(b.querySelector("pubDate")?.textContent || 0);
        return dateA - dateB;
      });

      sortedItems.forEach((item) => {
        const title = item.querySelector("title")?.textContent;
        const pubDate = item.querySelector("pubDate")?.textContent;
        const description = item.querySelector("description")?.textContent || "";
        const eventDate = new Date(pubDate);
        const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

        let originalLink = item.querySelector("link")?.textContent;
        let newLink = "";
        try {
          const originalUrl = new URL(originalLink);
          newLink = replacementBaseUrl + originalUrl.search;
        } catch (e) {
          console.warn("Invalid URL in feed:", originalLink);
          newLink = originalLink;
        }

        const isAllDay = eventDate.getHours() === 0 && eventDate.getMinutes() === 0;
        const oneHourAfter = new Date(eventDate.getTime() + 60 * 60 * 1000);
        const isPast = !isAllDay && oneHourAfter.getTime() < nowPacific.getTime();

        const eventObj = {
          title,
          timeStr: formatEventTime(eventDate),
          link: newLink,
          isPast,
          description
        };

        if (eventDay.getTime() === today.getTime()) {
          if (isPast) {
            todayEarlierEvents.push(eventObj);
          } else {
            todayUpcomingEvents.push(eventObj);
          }
        } else if (eventDay.getTime() === normalizedTomorrow.getTime()) {
          tomorrowEvents.push(eventObj);
        }
      });

      return { todayEarlierEvents, todayUpcomingEvents, tomorrowEvents, fetchedAt: nowPacific };
    });
}

function renderEventSection(containerId, sectionTitle, descriptionText, data, sectionLinkUrl) {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  const headingLink = document.createElement("a");
  headingLink.href = sectionLinkUrl;
  headingLink.target = "_blank";
  headingLink.rel = "noopener noreferrer";
  headingLink.textContent = sectionTitle;
  heading.appendChild(headingLink);
  section.appendChild(heading);

  if (descriptionText) {
    const intro = document.createElement("p");
    intro.textContent = descriptionText;
    section.appendChild(intro);
  }

  function renderEventList(title, events) {
    const shouldRenderEmpty = (title === "Today" || title === "Tomorrow");
    if (events.length === 0 && !shouldRenderEmpty) return;

    const subheading = document.createElement("h3");
    subheading.textContent = title;
    section.appendChild(subheading);

    if (events.length === 0) {
      const message = document.createElement("p");
      message.textContent = 'No scheduled events.';
      section.appendChild(message);
      return;
    }

    const ul = document.createElement("ul");
    events.forEach(event => {
      const li = document.createElement("li");

      const timeSpan = document.createElement("span");
      timeSpan.className = "event-time";
      timeSpan.textContent = event.timeStr;

      const link = document.createElement("a");
      link.href = event.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = event.title;
      if (event.isPast) link.classList.add("event-past");

      const infoButton = document.createElement("button");
      infoButton.className = "info-icon";
      infoButton.setAttribute("aria-label", "More information about this event");
      infoButton.setAttribute("tabindex", "0");
      infoButton.setAttribute("role", "button");
      infoButton.innerHTML = '<i class="fa-solid fa-circle-info" aria-hidden="true"></i>';

      const popup = document.createElement("div");
      popup.className = "event-popup";
      popup.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div></div>
          <button class="popup-close" aria-label="Close popup" style="border: none; background: none; font-size: 1.2em; cursor: pointer;">&times;</button>
        </div>
        <div><strong>${event.title}</strong></div>
        <div>${event.description}</div>
      `;

      popup.querySelector(".popup-close").addEventListener("click", () => {
        popup.classList.remove("visible");
        infoButton.classList.remove("active");
      });

      infoButton.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = popup.classList.contains("visible");
        document.querySelectorAll(".event-popup").forEach(p => p.classList.remove("visible", "above"));
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
      ul.appendChild(li);
    });

    section.appendChild(ul);
  }

  renderEventList("Earlier Today", data.todayEarlierEvents);
  renderEventList("Today", data.todayUpcomingEvents);
  renderEventList("Tomorrow", data.tomorrowEvents);

  const container = document.getElementById(containerId);
  if (container) {
    section.classList.add("event-section");
    container.appendChild(section);
  } else {
    console.warn(`Container with ID "${containerId}" not found.`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderTodayDate();
  const loadingMessage = document.getElementById("loading-message");
  Promise.all([
    fetchRssFeed(
      'https://api.bruceelgort.com/get_data.php?feed=https://25livepub.collegenet.com/calendars/clark-events.rss',
      'https://www.clark.edu/about/calendars/events.php'
    ),
    fetchRssFeed(
      'https://api.bruceelgort.com/get_data.php?feed=https://25livepub.collegenet.com/calendars/training-and-development.rss',
      'https://www.clark.edu/tlc/main-schedule.php'
    )
  ]).then(([generalData, trainingData]) => {
    renderEventSection(
      'general-events',
      'Events at Clark College',
      'Displaying college community events, important dates, enrollment deadlines, and student activities happening today and tomorrow.',
      generalData,
      'https://www.clark.edu/about/calendars/events.php'
    );

    renderEventSection(
      'training-events',
      'Employee Training and Development Events',
      'These events are part of Clark College\'s Employee Training and Development programs happening today and tomorrow.',
      trainingData,
      'https://www.clark.edu/tlc/main-schedule.php'
    );
  }).finally(() => {
    if (loadingMessage) loadingMessage.style.display = 'none';
    document.getElementById("general-events").style.display = "block";
    document.getElementById("training-events").style.display = "block";
    document.addEventListener("click", () => {
      document.querySelectorAll(".event-popup").forEach(p => p.classList.remove("visible", "above"));
      document.querySelectorAll(".info-icon").forEach(icon => icon.classList.remove("active"));
    });
  });
});