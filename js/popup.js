const messages = document.querySelector("#messages");
const messagesUrl = "https://raw.githubusercontent.com/belgort-clark/clark-college-events-messages/refs/heads/main/messages.json";

// check for important messages stored on GitHub repo as JSON
fetch(messagesUrl)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json(); // Parse JSON data
  })
  .then(data => {
    if (data.message != "") {
      messages.innerHTML = data.message;
      messages.style.display = 'block';
    }
  })
  .catch(error => {
    console.error('There was an error with the fetch operation:', error);
  });

function renderTodayDate() {
  const now = new Date();

  // const heading = document.createElement("h1");
  const heading = document.querySelector('#event-date');
  heading.innerHTML = `Clark College Events <br> ${now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })}</small>`;
}

function formatEventTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (hours === 0 && minutes === 0) {
    return "All Day";
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// New: Get feed data only, don't render yet
function fetchRssFeed(url, replacementBaseUrl) {
  return fetch(url)
    .then(response => response.text())
    .then(text => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const items = xmlDoc.querySelectorAll("item");

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayEvents = [];
      const tomorrowEvents = [];

      const sortedItems = Array.from(items).sort((a, b) => {
        const dateA = new Date(a.querySelector("pubDate")?.textContent || 0);
        const dateB = new Date(b.querySelector("pubDate")?.textContent || 0);
        return dateA - dateB;
      });

      sortedItems.forEach((item) => {
        const title = item.querySelector("title")?.textContent;
        const pubDate = item.querySelector("pubDate")?.textContent;
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

        const eventObj = {
          title,
          timeStr: formatEventTime(eventDate),
          link: newLink
        };

        if (eventDay.getTime() === today.getTime()) {
          todayEvents.push(eventObj);
        } else if (eventDay.getTime() === tomorrow.getTime()) {
          tomorrowEvents.push(eventObj);
        }
      });

      return { todayEvents, tomorrowEvents };
    });
}

// Renders a section of events (after all feeds are loaded)
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
    const subheading = document.createElement("h3");
    subheading.textContent = title;
    section.appendChild(subheading);

    if (events.length > 0) {
      const ul = document.createElement("ul");
      events.forEach(event => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span class="event-time">${event.timeStr}</span>
          <a href="${event.link}" target="_blank" rel="noopener noreferrer">${event.title}</a>
        `;
        ul.appendChild(li);
      });
      section.appendChild(ul);
    } else {
      const message = document.createElement("p");
      message.textContent = `There are no ${title.toLowerCase()}.`;
      section.appendChild(message);
    }
  }

  renderEventList("Events Today", data.todayEvents);
  renderEventList("Events Tomorrow", data.tomorrowEvents);

  const container = document.getElementById(containerId);
  if (container) {
    container.appendChild(section);
  } else {
    console.warn(`Container with ID "${containerId}" not found.`);
  }
}


document.addEventListener("DOMContentLoaded", () => {
  renderTodayDate();

  const loadingMessage = document.getElementById("loading-message");

  // Fetch both feeds at once
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
    if (loadingMessage) {
      loadingMessage.style.display = 'none';
    }
  });
});