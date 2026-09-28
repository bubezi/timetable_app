const targetDate = new Date("July 6, 2026 19:02:00").getTime();

const els = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
  countdown: document.getElementById("countdown"),
  card: document.getElementById("card"),
  title: document.getElementById("title"),
  subtitle: document.getElementById("subtitle"),
};

function celebrate() {
  els.countdown.remove();
  els.subtitle.remove();

  els.card.classList.add("celebration");
  els.title.textContent = "🎉 It’s Time";

  const msg = document.createElement("p");
  msg.textContent = "The countdown is complete.";
  els.card.appendChild(msg);

  launchConfetti();
}

function launchConfetti() {
  for (let i = 0; i < 120; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = Math.random() > 0.5 ? "#38bdf8" : "#4ade80";
    piece.style.animationDuration = 2 + Math.random() * 3 + "s";
    piece.style.animationDelay = Math.random() + "s";
    document.body.appendChild(piece);

    setTimeout(() => piece.remove(), 6000);
  }
}

function updateCountdown() {
  const now = Date.now();
  const diff = targetDate - now;

  if (diff <= 0) {
    clearInterval(timer);
    celebrate();
    return;
  }

  els.days.textContent = Math.floor(diff / (1000 * 60 * 60 * 24));
  els.hours.textContent = Math.floor((diff / (1000 * 60 * 60)) % 24)
    .toString()
    .padStart(2, "0");
  els.minutes.textContent = Math.floor((diff / (1000 * 60)) % 60)
    .toString()
    .padStart(2, "0");
  els.seconds.textContent = Math.floor((diff / 1000) % 60)
    .toString()
    .padStart(2, "0");
}

updateCountdown();
const timer = setInterval(updateCountdown, 1000);
