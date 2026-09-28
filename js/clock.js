const TIMEZONES = [
  "Africa/Abidjan",
  "Africa/Accra",
  "Africa/Addis_Ababa",
  "Africa/Algiers",
  "Africa/Cairo",
  "Africa/Casablanca",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Tripoli",
  "America/Anchorage",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Caracas",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Sao_Paulo",
  "America/Toronto",
  "Asia/Bangkok",
  "Asia/Calcutta",
  "Asia/Colombo",
  "Asia/Dhaka",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Jerusalem",
  "Asia/Kolkata",
  "Asia/Kuala_Lumpur",
  "Asia/Manila",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tehran",
  "Asia/Tokyo",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Darwin",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Athens",
  "Europe/Belgrade",
  "Europe/Berlin",
  "Europe/Brussels",
  "Europe/Bucharest",
  "Europe/Copenhagen",
  "Europe/Dublin",
  "Europe/Helsinki",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Moscow",
  "Europe/Paris",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Vienna",
  "Europe/Warsaw",
  "Indian/Maldives",
  "Indian/Mauritius",
  "Indian/Reunion",
  "Pacific/Auckland",
  "Pacific/Chatham",
  "Pacific/Fiji",
  "Pacific/Guam",
  "Pacific/Honolulu",
  "Pacific/Port_Moresby",
  "Pacific/Samoa",
  "Pacific/Tahiti",
  "Pacific/Truk",
];

let USER_TIMEZONE = "";

const tzSelect = document.getElementById("tz-select");
const defaultOption = document.createElement("option");
defaultOption.value = "";
defaultOption.textContent = "EAT / Default";
tzSelect.appendChild(defaultOption);

TIMEZONES.forEach((tz) => {
  const opt = document.createElement("option");
  opt.value = tz;
  opt.textContent = tz.replace("_", " · ");
  tzSelect.appendChild(opt);
});

const views = {
  countdown: document.getElementById("view-countdown"),
  world: document.getElementById("view-world"),
  sessions: document.getElementById("view-sessions"),
};

const buttons = document.querySelectorAll("nav button");
buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    buttons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    Object.values(views).forEach((v) => v.classList.remove("active"));
    views[btn.dataset.view].classList.add("active");
  });
});

tzSelect.addEventListener("change", (e) => {
  USER_TIMEZONE = e.target.value || "";
  updateClocks();
  updateSessions();
});

const targetDate = new Date("February 5, 2031 13:24:00").getTime();

function updateCountdown() {
  const diff = targetDate - Date.now();
  if (diff <= 0) {
    document.getElementById("days").textContent = "0";
    document.getElementById("hours").textContent = "00";
    document.getElementById("minutes").textContent = "00";
    document.getElementById("seconds").textContent = "00";
    return;
  }

  document.getElementById("days").textContent = Math.floor(
    diff / 86400000,
  );
  document.getElementById("hours").textContent = String(
    Math.floor(diff / 3600000) % 24,
  ).padStart(2, "0");
  document.getElementById("minutes").textContent = String(
    Math.floor(diff / 60000) % 60,
  ).padStart(2, "0");
  document.getElementById("seconds").textContent = String(
    Math.floor(diff / 1000) % 60,
  ).padStart(2, "0");
}

const clocks = {
  ny: {
    tz: "America/New_York",
    time: "ny-time",
    date: "ny-date",
  },
  ldn: {
    tz: "Europe/London",
    time: "ldn-time",
    date: "ldn-date",
  },
  eat: {
    tz: "Africa/Nairobi",
    time: "eat-time",
    date: "eat-date",
  },
};

function updateClocks() {
  const now = new Date();

  Object.values(clocks).forEach((c) => {
    const tz =
      c.tz === "Africa/Nairobi" && USER_TIMEZONE ? USER_TIMEZONE : c.tz;

    document.getElementById(c.time).textContent = new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      },
    ).format(now);

    document.getElementById(c.date).textContent = new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: tz,
        weekday: "short",
        day: "numeric",
        month: "short",
      },
    ).format(now);
  });
}

const sessions = [
  { name: "Asia", start: 0, end: 8 },
  { name: "London", start: 8, end: 16 },
  { name: "New York", start: 13, end: 21 },
];

function setSessionBlock(id, startHour, endHour) {
  const el = document.getElementById(id);
  if (!el) return;

  const startPct = (startHour / 24) * 100;
  const widthPct = ((endHour - startHour) / 24) * 100;

  el.style.left = `${startPct}%`;
  el.style.width = `${widthPct}%`;
}

setSessionBlock("session-asia", 0, 8);
setSessionBlock("session-london", 8, 16);
setSessionBlock("session-ny", 13, 21);

function getTimePartsForZone(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = fmt.formatToParts(date);
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const p of parts) {
    if (p.type === "hour") hour = parseInt(p.value, 10);
    if (p.type === "minute") minute = parseInt(p.value, 10);
    if (p.type === "second") second = parseInt(p.value, 10);
  }

  return { hour, minute, second };
}

const urlParams = new URLSearchParams(window.location.search);
const testParam = urlParams.get("test");
const testDate = testParam ? new Date(testParam) : null;

function updateSessions() {
  const now = testDate || new Date();

  const utcHourFloat =
    now.getUTCHours() +
    now.getUTCMinutes() / 60 +
    now.getUTCSeconds() / 3600;

  const marker = document.getElementById("now-marker");
  if (marker) {
    marker.style.left = `${(utcHourFloat / 24) * 100}%`;
  }

  const nyParts = getTimePartsForZone(now, "America/New_York");
  const ldnParts = getTimePartsForZone(now, "Europe/London");

  const nyMinutes = nyParts.hour * 60 + nyParts.minute;
  const ldnMinutes = ldnParts.hour * 60 + ldnParts.minute;

  const nyKZ = nyMinutes >= 9 * 60 + 30 && nyMinutes < 9 * 60 + 45;
  const ldnKZ = ldnMinutes >= 7 * 60 && ldnMinutes < 9 * 60;

  const kzLondon = document.getElementById("kz-london");
  const kzNY = document.getElementById("kz-ny");

  kzLondon.classList.toggle("active", ldnKZ);
  kzNY.classList.toggle("active", nyKZ);

  const kzLondonStatus = document.querySelector("#kz-london .kz-status");
  const kzNYStatus = document.querySelector("#kz-ny .kz-status");

  if (kzLondonStatus) {
    kzLondonStatus.textContent = ldnKZ
      ? " · active now"
      : " · 07:00–09:00 London";
  }

  if (kzNYStatus) {
    kzNYStatus.textContent = nyKZ
      ? " · active now"
      : " · 09:30–09:45 New York";
  }

  let next = null;
  for (const open of sessions) {
    if (utcHourFloat < open.start) {
      next = open;
      break;
    }
  }

  if (!next) {
    next = { name: "Asia", start: 24 };
  }

  const diffHours = next.start - utcHourFloat;
  const totalSeconds = Math.max(0, Math.floor(diffHours * 3600));

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");

  document.getElementById("next-open-name").textContent = next.name;
  document.getElementById("next-open-countdown").textContent =
    `${pad(h)}:${pad(m)}:${pad(s)}`;
}

updateCountdown();
updateClocks();
updateSessions();

setInterval(updateCountdown, 1000);
setInterval(updateClocks, 1000);
setInterval(updateSessions, 1000);
