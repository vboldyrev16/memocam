# Detection and troubleshooting

[Русский](RECOGNITION.md) · **English**

Memocam maps visible movements to reactions; it does not identify internal emotions. Detection expects one face and up to two hands. Lighting, angle, and occlusion affect results.

## Check a reaction

Open **Моя подборка** (My selection) → **Тестировать выбранные** (Test selected). The panel shows selected actions, landmarks, detection conditions, calibration, and an event log. New test reactions are not sent to calls while settings are open. If the log contains events but your call does not show memes, close settings and check the clean output first.

Calibrate with a relaxed face looking roughly forward. Switching cameras starts calibration again. Lower your hands and return to a neutral expression between attempts. Reloading must preserve your current selection rather than restore an older saved favorite.

| Reaction | Intended movement | Common blockers |
|---|---|---|
| I know, but can't prove it | Hold a two-eye squint with a relaxed mouth | Fully closed eyes, smile, strong head turn |
| Doubtful, but okay | Gently lift one eyebrow | A strong head turn creates misleading asymmetry |
| Smart person with glasses | Index finger directly at the nose bridge, face forward | Finger at the temple or lost face tracking |
| Disappearing squirrel | One open hand to the side, moving sideways and back | Stationary palm, no return movement, hand outside the frame |

The squirrel plays for about seven seconds. Wait for the clip to finish and lower your hand before another wave. If multiple memes share the wave route, check your selected actions and rotation setting.

## Implementation invariants

- Camera device choice and preview mirroring are separate from portable meme settings. Device IDs do not belong in author presets.
- `yaw` is nose displacement relative to the eyes, not degrees or eye gaze. The three perspective-sensitive gestures require `abs(yaw) < 0.2`.
- Squint is normalized against relaxed eyes. Eye closure stays absolute; subtracting its calibration baseline can mask a blink.
- The nose-bridge gesture needs a current face and a narrow target. Matching a hand against a cached face can fail after a head turn.
- Wave already requires multiple frames, travel, and reversal. An extra static hold can discard a completed short wave.
- Test motion gestures together with simpler poses: a preceding palm reaction can block a later wave through a shared latch.
- After a wave, require neutral input before repeating. A stationary palm must not trigger the squirrel.

Unit tests exercise rules and timing. Browser tests cover routing, UI state, video playback, and parts of model integration. Neither replaces testing on different people and physical cameras.
