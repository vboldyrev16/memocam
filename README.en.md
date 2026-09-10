<p align="center"><a href="README.md">Русский</a> · <strong>English</strong></p>

![Memocam: expressions become memes on your camera](docs/assets/hero.svg)

<p align="center">
  <a href="https://github.com/vboldyrev16/memocam/actions/workflows/checks.yml"><img alt="Project checks" src="https://github.com/vboldyrev16/memocam/actions/workflows/checks.yml/badge.svg" /></a>
  <a href="LICENSE"><img alt="Code: MIT" src="https://img.shields.io/badge/code-MIT-cdf092?labelColor=192419" /></a>
  <a href="https://nodejs.org/"><img alt="Node.js 22.12+" src="https://img.shields.io/badge/Node.js-22.12%2B-cdf092?labelColor=192419" /></a>
</p>

# Your expression → a meme in the call

**Memocam** turns facial expressions and hand gestures into camera reactions. Raise an eyebrow for “Doubtful, but okay.” Wave goodbye and let a squirrel disappear for you. Pick your favorites from **48 Russian internet memes**, rehearse the gestures, and use them in Meet or Zoom through OBS.

No account. Camera frames are processed locally in your browser. **The app interface and bundled memes are in Russian.** This English guide includes the Russian button labels so you can follow along; an English app interface is not available yet.

[Quick start](#quick-start) · [See it in action](#see-it-in-action) · [Use it in calls](#use-it-in-calls) · [Contribute](CONTRIBUTING.md#english)

## See it in action

![Real face and hand landmarks with an automatically selected meme overlay](docs/assets/recognition.png)

*Actual MediaPipe inference on a public catalog image supplied as a test camera. This is an app demonstration, not footage of a user.*

| What you do | What appears |
|---|---|
| Open your mouth and raise your brows or widen your eyes | “Окак” — a surprised cat |
| Lift one eyebrow | “Сомнительно, но окей” — doubtful, but okay |
| Squint both eyes | “Знаю, но не могу доказать” — I know, but can't prove it |
| Hold an open hand beside your cheek and open your mouth | Tinkov hiding behind a folder |
| Wave an open hand sideways and back | The disappearing squirrel |

**You choose the reactions.** Enable only the gestures you want, assign a different meme to an expression, or add your own media. The app maps visible movements to reactions; it does not infer your internal emotions or identify you.

## Quick start

You need **Node.js 22.12+**, Git, and a recent Chrome/Chromium browser. Manually tested on macOS; other operating systems have not yet been manually verified.

```sh
git clone https://github.com/vboldyrev16/memocam.git
cd memocam
npm ci
npm run setup
npm run dev
```

Open **http://127.0.0.1:5173**, allow camera access, and relax your face for two seconds. Choose an external webcam from **Камера** (Camera); your choice is remembered.

`setup` downloads two models with SHA-256 verification and installs WASM from the npm package. Installation needs internet access; camera inference runs on your device. A signed desktop installer is not available.

## Make it yours

![Selected memes and their gesture checkboxes in the Russian interface](docs/assets/selection.png)

1. **Мой набор и тест** (My set and test): select meme–gesture pairs.
2. **Моя подборка** (My selection): see only your selected reactions.
3. **Тестировать выбранные** (Test selected): inspect landmarks, detection conditions, and the reaction log.
4. **Перенести или сохранить настройки** (Transfer or save settings): export JSON or import a selection from another device.

The current selection saves automatically. Imports take effect after review and confirmation. Add custom media in the studio at `/?studio=1`; uploads stay in your browser and are not included in settings exports.

<details>
<summary>Shortcuts, mirroring, and repeat attempts</summary>

- **H**: library; **L**: landmarks; **Space**: pause; **F**: fullscreen.
- **Зеркало: вкл/выкл** (Mirror on/off) changes only your Memocam preview, not Google Meet.
- Return to a neutral expression and lower your hands before repeating a reaction. The squirrel plays for about seven seconds.
- Face roughly forward for the eyebrow, squint, and finger-at-the-bridge gestures.
- Switching cameras recalibrates detection. If a device disappears, press **↻** or choose another camera.

</details>

## Use it in calls

**Camera → Memocam → OBS Virtual Camera → Meet / Zoom**

![Compact call controls with a camera selector and reaction settings](docs/assets/call-desk.png)

1. Install [OBS Studio](https://obsproject.com/). On macOS, allow its camera extension if prompted.
2. Open `http://127.0.0.1:5173/?send=1&compact=1` for the compact controls.
3. In OBS, add a **Browser Source** at `http://127.0.0.1:5173/?output=1`, sized **1280×720**. Use 1280×720 for the scene canvas and output too.
4. Click **Start Virtual Camera**, then select **OBS Virtual Camera** in Meet/Zoom.

The call receives a clean frame without landmarks or controls. **Кадр для звонка ↗** (Call output) previews the outgoing stream before additional OBS/Meet processing. Camera footage fills 16:9 with cropping as needed; memes keep their proportions.

**Limitations:** keep Memocam running; meme audio is not routed to your microphone. New test reactions are not sent to the call while settings are open. Lighting, viewing angle, and hand occlusion affect detection. [Gesture troubleshooting →](docs/RECOGNITION.en.md)

## Built with

React · TypeScript · Vite · MediaPipe · Web Worker

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

[Contributing](CONTRIBUTING.md#english) · [Changelog](CHANGELOG.en.md) · [Report a bug](https://github.com/vboldyrev16/memocam/issues/new/choose)

See [CONTRIBUTING.md](CONTRIBUTING.md#english) for code pointers and custom author presets. OBS output uses the local Vite server: hosting the static app on GitHub Pages does not replace the call server.

## Memes, sources, and licenses

Code is licensed under [MIT](LICENSE). The bundle includes 48 memes with images, GIFs, audio, and videos; sources are listed in [sources.json](public/media/sources.json). **MIT does not cover third-party media; separate redistribution permissions have not been established.** See [third-party notices](THIRD_PARTY.md).

For a removal request or source correction, open an issue with the filename and original source. Person categories in the catalog do not verify anyone's current legal status. Some clips contain profanity.
