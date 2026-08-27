# Weekly Timetable App

A tiny static timetable app that works:
- locally by opening `index.html`
- or on a subdomain with any static hosting

## Run locally

Option 1:
- double-click `index.html`

Option 2:
- serve it locally:

```bash
cd timetable_app
python -m http.server 8080
```

Then open `http://localhost:8080`

## Host on a subdomain

### Nginx example

Put the files in your web root, e.g.

```bash
/var/www/timetable/
```

Basic server block:

```nginx
server {
    listen 80;
    server_name timetable.yourdomain.com;

    root /var/www/timetable;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Then reload Nginx.

## Notes

- data is stored in browser localStorage
- no backend, no user accounts, no sync across devices unless you export/import JSON


# ⏱️ Market Clock & Session Dashboard

A zero-dependency, single-file trading dashboard that answers one core question:

> **“What time is it — across markets — *in my own timezone*?”**

This project is designed for traders who care about **sessions, kill zones, and market opens**, not UI frameworks.

**No frameworks. No build step. No external libraries.**

---

## ✨ Features

* ⏳ Fixed event countdown
* 🌍 Multi-timezone world clock
* 🕒 User-configurable local timezone
* 📈 Trading session timeline bar
* 🎯 Precise kill zones (London & NY)
* 🚨 Next major market open countdown
* 🧪 Built-in time travel testing (URL-based)

All in **one HTML file**.

---

## 📂 Project Structure

```text
.
├── clock.html              # Main application
├── config.js               # Optional user overrides (gitignored)
└── README.md               # You are here
```

---

## 🌍 Timezones Used

| Market       | Timezone ID        |
| ------------ | ------------------ |
| New York     | `America/New_York` |
| London       | `Europe/London`    |
| User / Local | `EAT`(configurable)|

---

---

## 📊 Session Timeline Bar

The timeline visualizes:

* Asian session
* London session
* New York session
* Current session highlight
* Kill zone overlays

Sessions are computed using **real exchange time**, not your local clock.

---

## ⏰ Next Major Market Open

The dashboard automatically detects:

* Upcoming London Open
* Upcoming New York Open
* Countdown updates every second

Displayed in your **local timezone**, sourced from exchange time.

---

## 🧪 Testing & Time Travel (Important)

You can simulate *any moment in time* using a URL parameter.

### Format

?test=YYYY-MM-DDTHH:MM:SSZ

### Example: Test NY Kill Zone

?test=2026-02-05T14:31:00Z

This simulates:

* **09:31 New York**
* NY kill zone → ACTIVE
* London → CLOSED

### Remove testing

Just remove the `?test=` parameter — real time resumes.

This is invaluable for:

* Verifying kill zones
* Checking session transitions
* Debugging edge cases

---

## 🔒 No Dependencies. No Tracking

* No external APIs
* No cookies
* No analytics
* No frameworks

Everything runs **locally in the browser**.

---

## 🧠 Design Philosophy

* **Trader-first**
* Configurable without code rewrites
* DST-safe
* Fork-friendly
* Honest time math

This tool exists to reduce cognitive load — not add dashboards for the sake of dashboards.

---

## 🚀 Deployment

* Open `clock.html` locally
* Or host on:

  * GitHub Pages
  * Netlify
  * Any static server

Zero configuration required.

---

## 📜 License

MIT — fork it, modify it, trade with it.

---
