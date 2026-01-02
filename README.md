# Streamdelay-GUI

Streamdelay-GUI is a lightweight, self-hosted web control panel for managing the **streamdelay** service.
It provides a clean, responsive interface for controlling stream state, censorship mode, safety delays,
and YouTube output configuration.

The project is designed for **local or server-side deployment**, typically on Linux systems,
and integrates directly with the `streamdelay` backend via its local HTTP API.

---

## Key Features

- Web-based GUI for `streamdelay`
- Start / Stop stream control
- Censor ON / OFF toggle with enforced safety delay
- Visual safety delay progress bar
- Automatic button locking during safety delay
- YouTube Stream Key management via GUI
- Automatic restart of `streamdelay.service` on configuration change
- OBS SRT output helper with copy button
- Responsive layout (desktop, mobile, tablet)
- Light / Dark / Auto theme support
- No JavaScript frameworks, no build step
- Designed to run behind Nginx or directly via Flask

### Architecture Overview

Browser → Streamdelay-GUI (Flask) → streamdelay (local API) → systemd


### YouTube Stream Key Handling

- Stored in `/etc/streamdelay/out_uri.txt`
- Masked in UI
- Restart of streamdelay.service after change
- UI locked until key is set

### OBS Integration

Provides ready-to-use SRT output URL:

```
srt://<this-server-ip>:9000?mode=caller&latency=200000
```

### Theme Support

- Auto (system)
- Light
- Dark

Stored in localStorage and applied instantly.

---

### Installation
```bash
git clone https://github.com/marcinmajsc/streamdelay-gui.git --recursive
cd streamdelay-gui && sudo bash deploy/install_ubuntu_24.04.sh
```

---

### Acknowledgements
- [marcinmajsc](https://github.com/marcinmajsc/) - Author
- [streamwall](https://github.com/streamwall/) - The maker backend base package streamdelay (Thanks! ❤️)

---

## Licensing

This project is released under a **dual-license model**.

### Free Use (Non-Commercial & Open Source)

You may use, modify, and share this software **free of charge** if **all** of the following apply:

- the use is **non-commercial**
- the project is **open-source** or run by a **non-profit organization**
- there is **no SaaS, hosting, or revenue generation**
- the software is **not used internally by a for-profit company**
- **all author and license notices are preserved**

### Commercial Use

A **commercial license is required** for any use that involves:

- SaaS, cloud, or hosted services
- internal use within a for-profit company
- paid products, services, or integrations
- consulting or contractor work
- any activity that provides **direct or indirect commercial value**

### Notes

- This is **not an OSI-approved open-source license**
- If in doubt whether your use is commercial — **it probably is**
