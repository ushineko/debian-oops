# OOPS (Openly Obnoxious Pedantic Shell)

This project is an **example OS/Docker environment** designed as a learning vehicle. It provides a pre-configured shell experience alongside a very stupid "Desktop" web interface. It serves a multifold and noble purpose: a functional development playground, a demonstration of React JS/Node.js capabilities, and probably a source of embarassment for the person who created it.

## 🛠️ Shell Environment
The Docker container (`debian-oops`) is built on **Debian Trixie** and configured with lightly opinionated and not at all pedantic defaults for productivity:

*   **Shell**: `zsh` with **Oh My Zsh**.
    *   **Plugins**: `git`, `tmux`, `zsh-autosuggestions`, `zsh-syntax-highlighting`, `fzf`, `fzf-tab` (tab completion replaced by fuzzy finder).
    *   **Prompt**: **Oh My Posh** with a custom theme (`oops.omp.json`), displaying git status, timestamps, and execution time.
*   **Terminal Multiplexer**: `tmux` configured with **TPM** (Tmux Plugin Manager).
    *   **Plugins**: `tmux-sensible` (sane defaults), `tmux-resurrect` (session persistence).
    *   **Persistence**: Sessions are saved to `~/.tmux/resurrect` (mounted volume) and survive container restarts.
*   **Editor**: **Neovim** pre-configured with **NvChad** for an IDE-like experience.
*   **Modern Tools**:
    *   `eza`: A modern, colorful replacement for `ls` (aliased to `ls` and `dir`).
    *   `btop`: A beautiful resource monitor.
    *   `fastfetch`: A rapid system information fetcher.
    *   `zoxide`: A smarter `cd` command.
    *   `atuin`: Shell history sync and search.
    *   `ripgrep` (`rg`) & `fd`: Faster replacements for `grep` and `find`.

## 🌐 Web Service
The project hosts a web-based fake-ass "Desktop Environment" on **port 8765**. 

*   **Backend**: Node.js + Express + Socket.io.
*   **Terminal Emulation**: Uses `node-pty` to spawn real shell sessions and pipes them to the frontend via WebSockets.
*   **Authentication**: Simple persistent user/password login (using `bcrypt`).

## 🖥️ Enterprise-Quality Desktop Tools
The frontend is a **React** application that mimics a desktop environment, complete with a completely legitimate and usable window manager, taskbar, and start menu. It includes several specialized "apps" (more like "stupid jokes" but let's go with "apps"):

1.  **Terminal**: A fully functional `xterm.js` window connected to the container's shell. Supports `tmux`, `vim`, etc.
2.  **Web Browser**: A basic `<iframe>` wrapper for browsing the web (with all the security restrictions that implies). great for Wikipedia. And example.com. And, um, nothing else.
3.  **Files App**: An epic file manager designed primarily for one thing: viewing the **cat pictures** stored in `~/img`. Any other purported functionality of this app is unintended.
4.  **Blue Screen of Delight**: Use this to get out of online meetings. 
5.  **System Stats**: Wrappers for `fastfetch` and `btop` running in terminals. These are actually sort of useful. It was an accident.

## 🚀 Getting Started
```bash
# Start the environment
make up

# Connect to shell directly
make shell

# View logs
make logs

# Access Web Desktop
open http://localhost:8765
```

Note that this project was created with AI, so a great many innocent baby harp seals and dolphins were ground into a fine paste during the creation of this app. You are welcome.