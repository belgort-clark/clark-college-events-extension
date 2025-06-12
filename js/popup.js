function isRunningAsChromeExtension() {
  return typeof chrome !== "undefined" &&
    typeof chrome.runtime !== "undefined" &&
    typeof chrome.runtime.id !== "undefined";
}

if (!isRunningAsChromeExtension()) {
  document.body.style.width = '100%';
  document.body.style.margin = 0;
  document.querySelector('nav ul').style.display = 'block';
  document.querySelectorAll('nav ul li').forEach(item => {
    item.style.display = 'block';
  })
  document.querySelectorAll('.navicon').forEach(icon => {
    icon.style.display = 'none';
  })
}

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
  heading.innerHTML = 'Clark College Events <br>' + now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
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

// Format H:MM or “All Day”
function formatEventTime(date) {
  const h = date.getHours(), m = date.getMinutes();
  if (h === 0 && m === 0) return "All Day";
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Fetch & parse RSS
function fetchRssFeed(url, replacementBaseUrl) {
  return fetch(url)
    .then(response => response.text())
    .then(text => {
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
          const description = rawDesc
            .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
            .replace(/(<br\s*\/?>\s*)+$/gi, '');

          // determine past
          const oneHourAfter = new Date(eventDate.getTime() + 60 * 60 * 1000);
          const isPast =
            !(eventDate.getHours() === 0 && eventDate.getMinutes() === 0) &&
            oneHourAfter < nowPT;

          // NEW: soon if within [-60min, +30min] window
          const nowMs = nowPT.getTime();
          const startMs = eventDate.getTime();
          const past60 = nowMs - 60 * 60 * 1000;
          const next30 = nowMs + 30 * 60 * 1000;
          const isSoon = startMs >= past60 && startMs <= next30;
          const isInProgress = startMs <= nowMs && nowMs < startMs + 60 * 60 * 1000;

          const ev = {
            title,
            date: eventDate,
            timeStr: formatEventTime(eventDate),
            link: newLink,
            isPast,
            isSoon,
            isInProgress,
            description
          };

          if (eventDay.getTime() === today.getTime()) {
            if (isPast) todayEarlierEvents.push(ev);
            else todayUpcomingEvents.push(ev);
          } else if (eventDay.getTime() === normTom.getTime()) {
            tomorrowEvents.push(ev);
          }
        });

      return { todayEarlierEvents, todayUpcomingEvents, tomorrowEvents };
    });
}

// Render sections
function renderEventSection(containerId, sectionTitle, descriptionText, data, sectionLinkUrl) {
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
    events.forEach(ev => {
      const li = document.createElement("li");

      // apply pulse if within window
      if (ev.isSoon) {
        li.classList.add("upcoming-soon");
        li.dataset.startTime = ev.date.getTime();
      }

      // NEW: add class if event is in progress
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

      const btn = document.createElement("button");
      btn.className = "info-icon";
      btn.setAttribute("aria-label", "More information");
      btn.innerHTML = '<i class="fa-solid fa-circle-info" aria-hidden="true"></i>';

      const popup = document.createElement("div");
      popup.className = "event-popup";
      popup.innerHTML = `
        <div class="popup-header">
          <button class="popup-close" aria-label="Close popup">&times;</button>
        </div>
        <div><strong>${ev.title}</strong></div>
        <div>${ev.description}</div>
      `;
      popup.querySelector(".popup-close").addEventListener("click", () => {
        popup.classList.remove("visible", "above");
        btn.classList.remove("active");
      });

      btn.addEventListener("click", e => {
        e.stopPropagation();
        const open = popup.classList.contains("visible");
        document.querySelectorAll(".event-popup")
          .forEach(p => p.classList.remove("visible", "above"));
        document.querySelectorAll(".info-icon")
          .forEach(ic => ic.classList.remove("active"));
        if (!open) {
          btn.classList.add("active");
          popup.classList.add("visible");
          requestAnimationFrame(() => {
            const r = popup.getBoundingClientRect();
            if (window.innerHeight - r.bottom < 100 && r.top > r.height + 20) {
              popup.classList.add("above");
            }
          });
        }
      });

      li.append(ts, linkEl, btn, popup);
      ul.appendChild(li);
    });
    section.appendChild(ul);
  }

  renderList("Today", data.todayUpcomingEvents, true);
  renderList("Earlier Today", data.todayEarlierEvents, false);
  renderList("Tomorrow", data.tomorrowEvents, true);

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
  const loading = document.getElementById("loading-message");

  Promise.all([
    // fetchRssFeed(
    //   "test.rss",
    //   "https://www.clark.edu/about/calendars/events.php"
    // ),
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
      renderEventSection(
        "general-events",
        "Events at Clark College",
        "Displaying college community events, important dates, enrollment deadlines, and student activities happening today and tomorrow.",
        gen,
        "https://www.clark.edu/about/calendars/events.php"
      );
      renderEventSection(
        "training-events",
        "Employee Training and Development Events",
        "These events are part of Clark College’s Employee Training and Development programs happening today and tomorrow.",
        train,
        "https://www.clark.edu/tlc/main-schedule.php"
      );
    })
    .finally(() => {
      if (loading) loading.style.display = "none";
      document.addEventListener("click", () => {
        document.querySelectorAll(".event-popup")
          .forEach(p => p.classList.remove("visible", "above"));
        document.querySelectorAll(".info-icon")
          .forEach(ic => ic.classList.remove("active"));
      });
    });
});