# Сторонние компоненты

Лицензия MIT в этом репозитории относится к исходному коду. У зависимостей, моделей и мемных материалов свои права и условия; см. установленные пакеты и документацию поставщиков.

- MediaPipe Tasks Vision: https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/tasks/web/vision
- Face Landmarker и модель: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker
- Hand Landmarker и модель: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker

Модели и WASM не хранятся в git. `npm run setup` получает закреплённые модели версии 1 по официальным URL и проверяет контрольные суммы.

Мемные изображения, GIF, аудио и видео включены в `public/media/`. Источники и известные сведения перечислены в `public/media/sources.json`; ссылки указывают происхождение, а не разрешение на распространение. Подтверждённые разрешения на эти сторонние материалы не установлены. Они не лицензируются нами по MIT. Для обращения по конкретному файлу создай issue с именем файла и ссылкой на оригинал. Личные скриншоты и загруженные через браузер пользовательские файлы не включены.
