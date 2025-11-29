<div align="center">
  <img src="https://via.placeholder.com/120x120/00f3ff/000000?text=Flux" alt="Flux Logo" width="120" height="120">

  <h1>Flux Terminal</h1>

  <p>
    <strong>The Cyberpunk-Themed, High-Performance Terminal for the Modern Hacker.</strong>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Written%20in-TypeScript-blue" alt="TypeScript">
    <img src="https://img.shields.io/badge/Framework-Vue%203-42b883" alt="Vue 3">
    <img src="https://img.shields.io/badge/Powered%20by-Electron-47848F" alt="Electron">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  </p>
</div>

---

## ⚡️ Introduction

**Flux Terminal** is an immersive workspace designed for developers who live in the terminal. Built with **Electron**, **Vue 3**, and **TypeScript**, Flux combines raw performance with a stunning, customizable Cyberpunk aesthetic.

## 🚀 Key Features

* **Cyberpunk Aesthetics**: A strictly dark, neon-infused UI designed to reduce eye strain.
* **Smart Session Manager**: Organize your SSH connections with tags, aliases, and quick search.
* **Robust SSH Core**: Built on top of `ssh2` with intelligent connection healing.
* **Local & Remote**: Seamlessly switch between your local Shell (PowerShell/Bash) and remote servers.
* **Hardware Accelerated**: Powered by `xterm.js` with WebGL rendering.

## 🛠 Tech Stack

* **Core**: Electron, Vite
* **Frontend**: Vue 3 (Composition API), Pinia
* **Styling**: TailwindCSS v4
* **Terminal**: xterm.js, node-pty
* **SSH**: ssh2

## 📦 Installation

```bash
# Clone the repository
git clone [https://github.com/yourusername/flux-terminal.git](https://github.com/yourusername/flux-terminal.git)

# Install dependencies
npm install

# Start Development Server
npm run dev