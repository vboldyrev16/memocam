# Участие / Contributing

[Русский](#русский) · [English](#english)

## Русский

Спасибо за интерес к Мемокам. Начни с [README](README.md): установка, камера и OBS описаны там.

### Ошибка или новая идея

Для ошибки укажи браузер и ОС, выбранный мем и действие, ракурс и шаги повторения. Уточни, появилась ли запись в журнале «Тестировать выбранные». Для предложения мема приложи ссылку на источник и опиши узнаваемое движение, которое могло бы его запускать. Не нужно прикладывать личные кадры или полный файл настроек.

### Изменения кода

Делай небольшие PR с понятным поведением до и после изменения. Для распознавания добавь регрессионный тест: верный жест должен срабатывать, похожее случайное движение — нет. Для динамических жестов проверь также смесь с другими выбранными действиями. Запусти `npm test`, `npm run build` и затронутые браузерные тесты.

| Область | Файл |
|---|---|
| Жесты и защита от повторов | `src/gestures.ts` |
| Выражения лица | `src/expressions.ts` |
| Калибровка и выбор реакции | `src/realtime.ts` |
| Камера | `src/useCamera.ts` |
| Поток в OBS | `src/useOutput.ts` |
| Личная подборка | `src/preferences.ts` |
| Мемы и источники | `src/catalog.ts`, `src/extraMemes.ts` |

### Документация и медиа

Обновляй русский и английский README вместе. Скриншоты в `docs/assets/` используют публичные материалы каталога или синтетическую камеру; не заменяй их личными кадрами. Указывай, что именно показано. При добавлении мема укажи источник и условия использования; MIT для кода не даёт прав на чужие медиа.

### Авторский набор для своей сборки

`src/author-preset.json` сейчас пуст: личная подборка автора не опубликована. Экспортируй выбранные действия из приложения, затем выполни:

```sh
node scripts/import-author-preset.mjs /path/to/memocam-settings.json
```

Скрипт сохранит только назначения выражений и ID действий. Непустой набор применяется для новых пользователей; существующий выбор, включая пустой, остаётся приоритетным. Сырой экспорт настроек не коммить.

## English

Start with the [English README](README.en.md) for installation, camera selection, and OBS.

### Bugs and ideas

Include your browser/OS, selected meme and gesture, viewing angle, and reproduction steps. Mention whether the reaction appears in the **Тестировать выбранные** (Test selected) log. For a meme suggestion, link the original source and describe a recognizable trigger movement. Personal camera footage and full settings exports are not required.

### Code changes

Keep PRs focused and describe the before/after behavior. Detection fixes should include a regression: the intended gesture fires, while a similar accidental movement does not. Test motion gestures alongside other enabled reactions, not just in isolation. Run `npm test`, `npm run build`, and affected browser tests.

Code pointers: gestures and repeat suppression in `src/gestures.ts`; expressions in `src/expressions.ts`; calibration in `src/realtime.ts`; camera lifecycle in `src/useCamera.ts`; OBS output in `src/useOutput.ts`; selection persistence in `src/preferences.ts`; catalog in `src/catalog.ts` and `src/extraMemes.ts`.

### Docs, media, and custom presets

Keep both READMEs in sync. Assets in `docs/assets/` use public catalog material or synthetic camera input; do not replace them with private footage. Label demonstrations accurately. Include original sources and usage terms for new memes; the code license does not grant rights to third-party media.

`src/author-preset.json` is currently empty; the author's personal selection is not published. To customize your build, export selected actions from the app and run the import command above. It retains only expression assignments and action IDs. A non-empty preset applies to new users; existing selections, including empty ones, take priority. Do not commit the raw settings export.
