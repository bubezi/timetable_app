const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const times = [
  "06:00–08:00",
  "08:00–09:00",
  "09:00–12:00",
  "12:00–13:00",
  "13:00–15:00",
  "15:00–16:00",
  "16:00–16:30",
  "16:30–17:45",
  "17:45–18:00",
  "18:00–20:00",
  "20:00–21:30",
  "21:30–22:00",
];

const defaultData = {
  weekLabel: "Bubezi Weekly Timetable",
  cells: {
    "06:00–08:00": [
      "Reading",
      "Reading",
      "Reading",
      "Reading - The New Trading for a Living",
      "Reading - The New Trading for a Living",
    ],
    "08:00–09:00": [
      "Exercise",
      "Exercise",
      "Exercise",
      "Exercise",
      "Exercise",
    ],
    "09:00–12:00": [
      "Client Work",
      "Client Work",
      "Client Work",
      "Client Work",
      "Client Work",
    ],
    "12:00–13:00": [
      "Lunch / Walk",
      "Lunch / Walk",
      "Lunch / Walk",
      "Lunch / Walk",
      "Lunch / Walk",
    ],
    "13:00–15:00": [
      "Bug Bounty / Security Practice",
      "Coding / Product Development",
      "Bug Bounty / Security Practice",
      "Coding / Product Development",
      "Bug Bounty / Security Practice",
    ],
    "15:00–16:00": ["Chores", "Chores", "Chores", "Chores", "Chores"],
    "16:00–16:30": ["Relax", "Relax", "Relax", "Relax", "Relax"],
    "16:30–17:45": [
      "Trading",
      "Deep Market Research",
      "Trading",
      "Deep Market Research",
      "Trading",
    ],
    "17:45–18:00": [
      "Trade Journal",
      "Research Notes",
      "Trade Journal",
      "Research Notes",
      "Trade Journal",
    ],
    "18:00–20:00": [
      "Client Work",
      "Music Production",
      "Client Work",
      "Music Production",
      "Personal Projects / Music",
    ],
    "20:00–21:30": ["Movie", "Movie", "Movie", "Movie", "Movie"],
    "21:30–22:00": [
      "Wind Down + Journal",
      "Wind Down + Journal",
      "Wind Down + Journal",
      "Wind Down + Journal",
      "Wind Down + Journal",
    ],
  },
};

// Bumped from v1: the time-block keys changed shape (16:30–18:00 split
// into two blocks), so old saved schedules are intentionally not reused.
const STORAGE_KEY = "bubezi-weekly-timetable-v2";
const tbody = document.querySelector("#scheduleTable tbody");
const weekLabelInput = document.getElementById("weekLabel");

const liveNowTime = document.getElementById("liveNowTime");
const liveToday = document.getElementById("liveToday");
const currentItemEl = document.getElementById("currentItem");
const currentRangeEl = document.getElementById("currentRange");
const nextItemEl = document.getElementById("nextItem");
const nextRangeEl = document.getElementById("nextRange");
const countdownEl = document.getElementById("countdown");

function getData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultData);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.cells) {
      throw new Error("Invalid saved shape");
    }
    return parsed;
  } catch {
    return structuredClone(defaultData);
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2));
}

function render(data) {
  weekLabelInput.value = data.weekLabel || "";
  tbody.innerHTML = "";

  for (const time of times) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = time;
    tr.appendChild(th);

    days.forEach((day, i) => {
      const td = document.createElement("td");
      td.dataset.time = time;
      td.dataset.dayIndex = String(i);

      const box = document.createElement("div");
      box.className = "cell";

      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = day;

      const area = document.createElement("textarea");
      area.className = "task";
      area.value = (data.cells[time] && data.cells[time][i]) || "";
      area.dataset.time = time;
      area.dataset.dayIndex = String(i);
      area.placeholder = `${day} @ ${time}`;

      box.appendChild(chip);
      box.appendChild(area);
      td.appendChild(box);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  }

  updateLiveStatus();
}

function collect() {
  const data = { weekLabel: weekLabelInput.value.trim(), cells: {} };
  times.forEach((time) => (data.cells[time] = ["", "", "", "", ""]));
  document.querySelectorAll(".task").forEach((el) => {
    const time = el.dataset.time;
    const i = Number(el.dataset.dayIndex);
    data.cells[time][i] = el.value.trim();
  });
  return data;
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseTimeRange(range) {
  const [start, end] = range.split("–").map((s) => s.trim());
  return {
    startMinutes: toMinutes(start),
    endMinutes: toMinutes(end),
    startText: start,
    endText: end,
  };
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const ALARM_SOUND_FILE = "alarm.wav";
let activeAudio = null;
let alarmFiredForBlockStart = null;

async function ringAlarm() {
  try {
    activeAudio = new Audio(ALARM_SOUND_FILE);
    activeAudio.loop = false;
    await activeAudio.play();
  } catch (error) {
    console.error("Audio failed:", error);
    alert(
      `Alarm triggered, but sound could not play.\n\nMake sure "${ALARM_SOUND_FILE}" exists beside this file and click the page once to allow audio.`,
    );
  }
}

function formatCountdown(ms, blockStartKey) {
  if (ms <= 0) return "Now";
  const totalSeconds = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  // Fire the alarm exactly once per upcoming block, right as it's about
  // to start, instead of re-triggering on every render tick that
  // happens to land on secs === 1.
  if (
    totalSeconds <= 1 &&
    alarmFiredForBlockStart !== blockStartKey
  ) {
    alarmFiredForBlockStart = blockStartKey;
    ringAlarm();
  }

  if (hrs > 0) return `Starts in ${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `Starts in ${mins}m ${secs}s`;
  return `Starts in ${secs}s`;
}

function clearHighlights() {
  document
    .querySelectorAll("td.current-cell, td.next-cell")
    .forEach((td) => {
      td.classList.remove("current-cell", "next-cell");
    });
}

function getDayIndexFromDate(date) {
  const jsDay = date.getDay(); // Sun=0, Mon=1, ... Sat=6
  if (jsDay >= 1 && jsDay <= 5) return jsDay - 1;
  return -1;
}

function findCurrentAndNext(data, now = new Date()) {
  const dayIndex = getDayIndexFromDate(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentSeconds = now.getSeconds();

  if (dayIndex === -1) {
    return {
      isWeekday: false,
      dayIndex,
      nowBlock: null,
      nextBlock: null,
    };
  }

  let nowBlock = null;
  let nextBlock = null;

  for (const range of times) {
    const parsed = parseTimeRange(range);
    const item = (data.cells[range] && data.cells[range][dayIndex]) || "";

    if (
      currentMinutes >= parsed.startMinutes &&
      currentMinutes < parsed.endMinutes
    ) {
      nowBlock = {
        time: range,
        item,
        ...parsed,
      };
    } else if (currentMinutes < parsed.startMinutes && !nextBlock) {
      nextBlock = {
        time: range,
        item,
        ...parsed,
      };
    }
  }

  return {
    isWeekday: true,
    dayIndex,
    currentMinutes,
    currentSeconds,
    nowBlock,
    nextBlock,
  };
}

function updateLiveStatus() {
  const data = collect();
  const now = new Date();
  const dayIndex = getDayIndexFromDate(now);
  const dayName =
    dayIndex >= 0
      ? days[dayIndex]
      : now.toLocaleDateString([], { weekday: "long" });

  liveNowTime.textContent = formatTime(now);
  liveToday.textContent = dayName;

  clearHighlights();

  const status = findCurrentAndNext(data, now);

  if (!status.isWeekday) {
    currentItemEl.textContent = "Weekend";
    currentRangeEl.textContent = "No weekday block active";
    nextItemEl.textContent = "Next block is on Monday";
    nextRangeEl.textContent = "06:00–08:00";
    countdownEl.textContent = "Manual recovery mode. Weekend detected.";
    return;
  }

  if (status.nowBlock) {
    currentItemEl.textContent =
      status.nowBlock.item || "Free / Unnamed block";
    currentRangeEl.textContent = `${dayName} • ${status.nowBlock.time}`;

    const currentCell = document.querySelector(
      `td[data-time="${CSS.escape(status.nowBlock.time)}"][data-day-index="${status.dayIndex}"]`,
    );
    if (currentCell) currentCell.classList.add("current-cell");
  } else {
    currentItemEl.textContent = "No active block";
    currentRangeEl.textContent = `${dayName} • Outside timetable hours`;
  }

  if (status.nextBlock) {
    nextItemEl.textContent =
      status.nextBlock.item || "Free / Unnamed block";
    nextRangeEl.textContent = `${dayName} • ${status.nextBlock.time}`;

    const nextCell = document.querySelector(
      `td[data-time="${CSS.escape(status.nextBlock.time)}"][data-day-index="${status.dayIndex}"]`,
    );
    if (nextCell) nextCell.classList.add("next-cell");

    const nextStart = new Date(now);
    nextStart.setHours(
      Math.floor(status.nextBlock.startMinutes / 60),
      status.nextBlock.startMinutes % 60,
      0,
      0,
    );
    const blockStartKey = `${dayName}-${status.nextBlock.time}`;
    countdownEl.textContent = formatCountdown(
      nextStart - now,
      blockStartKey,
    );
  } else {
    nextItemEl.textContent = "Done for today";
    nextRangeEl.textContent = `${dayName} • No more blocks`;
    countdownEl.textContent = "Go rest, menace.";
  }
}

document.getElementById("loadDefault").addEventListener("click", () => {
  render(structuredClone(defaultData));
});

document.getElementById("saveBtn").addEventListener("click", () => {
  saveData(collect());
  updateLiveStatus();
  alert("Saved locally.");
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("Reset timetable to your default schedule?")) return;
  const fresh = structuredClone(defaultData);
  saveData(fresh);
  render(fresh);
});

document
  .getElementById("printBtn")
  .addEventListener("click", () => window.print());

document.getElementById("exportBtn").addEventListener("click", () => {
  const data = collect();
  download(
    "weekly-timetable.json",
    JSON.stringify(data, null, 2),
    "application/json",
  );
});

document
  .getElementById("importFile")
  .addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || !parsed.cells) {
        throw new Error("Invalid format");
      }
      saveData(parsed);
      render(parsed);
      alert("Imported.");
    } catch (err) {
      alert("Could not import that JSON file.");
    } finally {
      e.target.value = "";
    }
  });

weekLabelInput.addEventListener("input", () => {
  document.title = weekLabelInput.value.trim() || "Weekly Timetable";
  updateLiveStatus();
});

document.addEventListener("input", (e) => {
  if (e.target.classList.contains("task")) {
    updateLiveStatus();
  }
});

render(getData());
setInterval(updateLiveStatus, 1000);
