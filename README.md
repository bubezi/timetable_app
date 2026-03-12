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
