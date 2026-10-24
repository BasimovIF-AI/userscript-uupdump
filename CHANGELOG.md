# Changelog

Все изменения в проекте документируются в соответствии со спецификацией [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/) и принципами [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-24

### Added
- Первый релиз Tampermonkey-юзерскрипта `uupdump-dynamic-filter.user.js`.
- Движок парсинга строк сборок UUP dump (`parseRow`) с извлечением ОС, архитектуры, ветки разработки, номера сборки, типа обновления и UUID.
- Модуль генерации динамических фасетных фильтров (`collectFacetStats`, `createChipGroup`) с подсчетом доступных элементов по каждой категории.
- Интерактивная панель Semantic UI (`#uup-dynamic-filter-panel`) с чипами мультиселекта и поддержкой светлой/темной темы.
- Поле живого поиска (Instant Search) с дебаунсом ввода 100 мс и кнопкой быстрого сброса всех активных фильтров.
- Автоматическая переинициализация интерфейса через `MutationObserver` при динамических манипуляциях с DOM.
- Набор автоматических тестов парсера и движка фильтрации [`test_filter_engine.js`](file:///e:/Ильгиз/Documents/VibeCoding/TM_Scripts/userscript-uupdump/test_filter_engine.js).
- Скрипт автоматизации сборки и упаковки релизных исходников [`build.ps1`](file:///e:/Ильгиз/Documents/VibeCoding/TM_Scripts/userscript-uupdump/build.ps1).
- Полный комплект проектной документации: `AGENTS.md`, `README.md`, `ARCHITECTURE.md`.
