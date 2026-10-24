# Архитектурный атлас проекта UUP dump Dynamic Build Filters

В данном документе описывается компонентная архитектура, поток данных и модель взаимодействия юзерскрипта с DOM-деревом сайта UUP dump.

---

## 1. Диаграмма потоков данных (Data Flow)

```mermaid
flowchart TD
    DOM["DOM страницы uupdump.net (table.ui.table)"] --> Scanner["Инициализация и парсер (init / parseRow)"]
    Scanner --> State["Внутреннее состояние (state.items)"]
    State --> Facets["Агрегатор фасетов (collectInitialStats)"]
    Facets --> UI["Рендеринг панели фильтров (renderFilterPanel)"]
    
    UserAction["Действие пользователя (клик по чипу / выбор в селекте / ввод)"] --> EventHandlers["Обработчики событий"]
    EventHandlers --> FilterEngine["Движок сопоставления (matchesItem / applyFilters)"]
    FilterEngine --> DynamicRecalc["Динамический пересчет счетчиков (computeDynamicFacetCounts)"]
    FilterEngine --> DOMUpdate["Мгновенное обновление DOM (style.display = '' / 'none')"]
    DynamicRecalc --> ControlState["Обновление бейджей и блокировка нулевых опций (updateFacetControls)"]
    
    DOMChange["Динамическое изменение DOM (AJAX / пагинация)"] --> MutationObserver["MutationObserver"]
    MutationObserver --> Scanner
```

---

## 2. Структура модулей и зоны ответственности

### 2.1. Parser Module (`parseRow`, `normalizeArch`, `detectOS`, `detectBranch`, `detectType`, `detectBuildNumber`, `detectVersion`)
- **Ответственность:** Извлечение чистых структурированных метаданных из HTML-элементов `tr` и `td`.
- **Выход:** Нормализованный объект записи сборки (`arch`, `os`, `version`, `branch`, `updateType`, `buildNumber`, `uuid`, `searchableText`).

### 2.2. Facet Engine & Dynamic Recalculation (`computeDynamicFacetCounts`, `createChipGroup`, `createDropdownGroup`)
- **Ответственность:** Агрегация уникальных значений и динамический расчет доступного количества сборок в контексте других активных фильтров.
- **Особенность:** Блокировка пустых чипов (`count === 0` $\rightarrow$ `disabled`, полупрозрачность и запрет клика) и автоматическое сокрытие пустых групп.

### 2.3. Filter Matching Engine (`matchesItem`, `applyFilters`)
- **Ответственность:** Оценка каждой строки на соответствие активным фильтрам и поисковым ключевым словам.
- **Правило логики:**
  - `category_1 IN activeSet_1 AND ... AND category_N IN activeSet_N AND (all queryTokens in searchableText)`

### 2.4. UI Component (`renderFilterPanel`, `updateFacetControls`)
- **Ответственность:** Построение интуитивной панели над таблицей:
  - Чипы для категорий с малым набором вариантов (Архитектура, ОС, Релиз, Тип сборки).
  - Компактный выпадающий список `<select>` для сборок (Build) с мини-кнопкой сброса `[✖]`.
