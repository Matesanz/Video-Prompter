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

## ✨ Features

- **📱 Progressive Web App**: Install on mobile and desktop devices
- **🎥 Video Recording**: Record yourself while reading the script
- **📝 Script Display**: Clean, readable teleprompter interface
- **⚡ Auto-scroll**: Configurable scrolling speed (slow, normal, fast)
- **🔄 Text Rotation**: Rotate text for different camera orientations
- **📐 Multi-Directional Resizing**: Drag bottom, left, or right edges to adjust script box size
- **💾 Persistent Settings**: Your preferences are automatically saved
- **📱 Mobile Responsive**: Works seamlessly on all device sizes

## 🎛️ Controls

- **Speed Control**: Choose between slow, normal, and fast scrolling speeds
- **Text Size**: Small, medium, and large text size options
- **Rotation Button**: Toggle text rotation for landscape/portrait modes
- **Record Button**: Start/stop video recording
- **Camera Switch**: Toggle between front and back camera (mobile)
- **Resize Handles**: Drag the bottom edge for height, left/right edges for width
