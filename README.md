# 📹 Video Teleprompter PWA

A minimalistic Progressive Web App (PWA) that records video while displaying a script in teleprompter style.

## 🚀 Quick Start

Build the Docker image

```bash
docker build -t video-prompter .
```

Run the container

```bash
docker run -p 8080:80 video-prompter
```

Then open http://localhost:8080

## 👷 Local Development

Using Python:

```bash
python -m http.server 8000 --directory src
```

Using Node.js:

```bash
npx serve src
```

Then open http://localhost:8000
