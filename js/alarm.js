// Change this filename to whatever sound file you place beside alarm.html
const ALARM_SOUND_FILE = "alarm.wav";

const alarmsContainer = document.getElementById("alarms");
const addAlarmBtn = document.getElementById("addAlarmBtn");
const currentTimeEl = document.getElementById("currentTime");
const currentDateEl = document.getElementById("currentDate");

let alarms = [];
let activeAudio = null;
let unlockedAudio = false;

function saveAlarms() {
  localStorage.setItem("modern-alarms", JSON.stringify(alarms));
}

function loadAlarms() {
  const saved = localStorage.getItem("modern-alarms");
  if (saved) {
    try {
      alarms = JSON.parse(saved);
    } catch {
      alarms = [];
    }
  }

  if (!alarms.length) {
    alarms = [
      {
        id: crypto.randomUUID(),
        time: "07:00",
        label: "Wake up",
        enabled: false,
        ringing: false,
        lastTriggeredDate: null,
      },
    ];
  }
}
function formatTime24(now) {
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatNow() {
  const now = new Date();

  currentTimeEl.textContent = formatTime24(now);

  currentDateEl.textContent = now.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function stopAlarm(alarmId) {
  const alarm = alarms.find((a) => a.id === alarmId);
  if (alarm) {
    alarm.ringing = false;
  }

  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }

  saveAlarms();
  renderAlarms();
}

function stopAllAlarms() {
  alarms.forEach((a) => (a.ringing = false));
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  saveAlarms();
  renderAlarms();
}

async function ringAlarm(alarm) {
  stopAllAlarms();
  alarm.ringing = true;
  alarm.lastTriggeredDate = getTodayKey();
  saveAlarms();
  renderAlarms();

  try {
    activeAudio = new Audio(ALARM_SOUND_FILE);
    activeAudio.loop = true;
    await activeAudio.play();
  } catch (error) {
    console.error("Audio failed:", error);
    alert(
      `Alarm triggered, but sound could not play.\n\nMake sure "${ALARM_SOUND_FILE}" exists beside alarm.html and click the page once to allow audio.`,
    );
  }
}

function checkAlarms() {
  const now = new Date();
  const currentHHMM =
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0");

  const todayKey = getTodayKey();

  for (const alarm of alarms) {
    if (!alarm.enabled) continue;
    if (alarm.ringing) continue;
    if (alarm.time !== currentHHMM) continue;
    if (alarm.lastTriggeredDate === todayKey) continue;

    ringAlarm(alarm);
    break;
  }
}

function renderAlarms() {
  alarmsContainer.innerHTML = "";

  alarms.forEach((alarm, index) => {
    const card = document.createElement("div");
    card.className = "alarm" + (alarm.ringing ? " ringing" : "");

    const left = document.createElement("div");
    left.className = "alarm-left";

    const timeRow = document.createElement("div");
    timeRow.className = "alarm-time-row";

    const timeInput = document.createElement("input");
    timeInput.type = "time";
    timeInput.className = "alarm-time";
    timeInput.value = alarm.time;
    timeInput.addEventListener("change", (e) => {
      alarm.time = e.target.value;
      alarm.lastTriggeredDate = null;
      saveAlarms();
      renderAlarms();
    });

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "alarm-name";
    nameInput.placeholder = "Alarm label";
    nameInput.value = alarm.label || "";
    nameInput.addEventListener("input", (e) => {
      alarm.label = e.target.value;
      saveAlarms();
    });

    timeRow.appendChild(timeInput);
    timeRow.appendChild(nameInput);

    const status = document.createElement("div");
    status.className = "status";
    status.textContent = alarm.ringing
      ? "Ringing now"
      : alarm.enabled
        ? `Enabled • ${alarm.label?.trim() || `Alarm ${index + 1}`}`
        : "Disabled";

    left.appendChild(timeRow);
    left.appendChild(status);

    const actions = document.createElement("div");
    actions.className = "alarm-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "toggle" + (alarm.enabled ? " active" : "");
    toggleBtn.title = alarm.enabled ? "Disable alarm" : "Enable alarm";
    toggleBtn.setAttribute("aria-label", toggleBtn.title);
    toggleBtn.addEventListener("click", () => {
      alarm.enabled = !alarm.enabled;
      if (!alarm.enabled && alarm.ringing) {
        stopAlarm(alarm.id);
        return;
      }
      saveAlarms();
      renderAlarms();
    });

    if (alarm.ringing) {
      const stopBtn = document.createElement("button");
      stopBtn.className = "stop-btn";
      stopBtn.textContent = "Stop";
      stopBtn.addEventListener("click", () => stopAlarm(alarm.id));
      actions.appendChild(stopBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.disabled = alarms.length === 1;
    deleteBtn.style.opacity = alarms.length === 1 ? "0.45" : "1";
    deleteBtn.style.cursor =
      alarms.length === 1 ? "not-allowed" : "pointer";

    deleteBtn.addEventListener("click", () => {
      if (alarms.length === 1) return;
      if (alarm.ringing) stopAlarm(alarm.id);
      alarms = alarms.filter((a) => a.id !== alarm.id);
      saveAlarms();
      renderAlarms();
    });

    actions.appendChild(toggleBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(left);
    card.appendChild(actions);
    alarmsContainer.appendChild(card);
  });
}

addAlarmBtn.addEventListener("click", () => {
  alarms.push({
    id: crypto.randomUUID(),
    time: "06:30",
    label: "",
    enabled: true,
    ringing: false,
    lastTriggeredDate: null,
  });
  saveAlarms();
  renderAlarms();
});

function unlockAudioOnce() {
  if (unlockedAudio) return;
  unlockedAudio = true;

  const audio = new Audio(ALARM_SOUND_FILE);
  audio.volume = 0;
  audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
    })
    .catch(() => {});
}

["click", "touchstart", "keydown"].forEach((eventName) => {
  window.addEventListener(eventName, unlockAudioOnce, { once: true });
});

loadAlarms();
renderAlarms();
formatNow();
checkAlarms();

setInterval(formatNow, 1000);
setInterval(checkAlarms, 1000);
