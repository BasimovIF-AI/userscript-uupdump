// ==UserScript==
// @name         UUP dump Dynamic Build Filters
// @namespace    https://github.com/BasimovIF-AI/userscript-uupdump
// @version      1.3.1
// @description  Мгновенные динамические фасетные фильтры, быстрый поиск и счетчики сборок для UUP dump (uupdump.net)
// @author       BasimovIF
// @match        https://uupdump.net/*
// @match        http://uupdump.net/*
// @icon         https://uupdump.net/static/uupdump/1.2.0/img/logo.svg
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // -------------------------------------------------------------
    // МОДУЛЬ 1: ПАРСЕР И РАСПОЗНАВАНИЕ МЕТАДАННЫХ СБОРОК
    // -------------------------------------------------------------
    function extractUuid(link) {
        if (!link) return '';
        const m = link.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        return m ? m[0] : '';
    }

    function normalizeArch(archText, title) {
        const raw = `${archText || ''} ${title || ''}`.toLowerCase();
        if (raw.includes('arm64') || raw.includes('aarch64')) return 'arm64';
        if (raw.includes('x64') || raw.includes('amd64') || raw.includes('x86_64')) return 'x64';
        if (raw.includes('x86') || raw.includes('i386') || raw.includes('i686') || raw.includes('32-bit')) return 'x86';
        return 'other';
    }

    function detectOS(title) {
        if (/Windows Server/i.test(title)) return 'Windows Server';
        if (/Windows CPC OS|Cloud PC/i.test(title)) return 'Windows CPC OS';
        if (/Windows 11/i.test(title)) return 'Windows 11';
        if (/Windows 10/i.test(title)) return 'Windows 10';
        if (/Windows Holographic/i.test(title)) return 'Holographic';
        return 'Other OS';
    }

    function detectBuildNumber(title) {
        // Извлекает номера вида 26300.9807, 26300.10008, 10.0.26300.9711
        const mFull = title.match(/\b(?:10\.0\.)?(\d{5}(?:\.\d+)?)\b/);
        return mFull ? mFull[1] : '';
    }

    function inferVersionFromBuild(buildStr) {
        if (!buildStr) return null;
        const major = parseInt(buildStr.split('.')[0], 10);
        if (isNaN(major)) return null;

        if (major >= 26300 && major < 26400) return '26H2';
        if (major >= 26100 && major < 26300) return '24H2';
        if (major === 22631) return '23H2';
        if (major === 22621) return '22H2';
        if (major === 22000) return '21H2';
        if (major === 19045) return '22H2';
        if (major === 19044) return '21H2';
        if (major === 19043) return '21H1';
        if (major === 19042) return '20H2';
        if (major === 19041) return '2004';
        if (major === 17763) return '1809';
        return null;
    }

    function detectVersion(title, buildNumber) {
        const m = title.match(/\b(?:version\s+)?(2\d{1}H[12]|1\d{1}H[12]|1809|1909|1903|2004)\b/i);
        if (m) return m[1].toUpperCase();

        return inferVersionFromBuild(buildNumber);
    }

    function detectBranch(title) {
        const m = title.match(/\(([a-z0-9_-]+(?:release|prerelease|flight|canary|dev|beta|preview)[a-z0-9_-]*)\)/i);
        if (m) return m[1].toLowerCase();

        const alt = title.match(/\b(rs_prerelease|rs_flight|ge_release|ni_release|co_release|fe_release|vb_release|mn_release)\b/i);
        return alt ? alt[1].toLowerCase() : null;
    }

    function detectPackageCategory(title) {
        // Разделение между апдейтами и полными установочными сборками
        if (/\.NET Framework|Cumulative Update|Preview Update for|Security Update|Dynamic Update|\bKB\d{6,8}\b/i.test(title)) {
            return 'Обновления';
        }
        return 'Полные сборки';
    }

    function detectType(title) {
        if (/\.NET Framework/i.test(title)) return '.NET Framework Update';
        if (/Insider Preview/i.test(title)) return 'Insider Preview';
        if (/Cumulative Update/i.test(title)) return 'Cumulative Update';
        if (/Preview Update/i.test(title)) return 'Preview Update';
        if (/Feature update/i.test(title)) return 'Feature Update';
        if (/Security Update/i.test(title)) return 'Security Update';
        if (/Dynamic Update/i.test(title)) return 'Dynamic Update';
        if (/Setup Duo/i.test(title)) return 'Setup Duo';
        return 'Standard Build';
    }

    function parseRow(tr) {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 2) return null;

        const titleCol = tds[0];
        const archCol = tds[1];
        const dateCol = tds[2];

        const linkEl = titleCol.querySelector('a');
        const title = (linkEl ? linkEl.innerText : titleCol.innerText).trim();
        const link = linkEl ? linkEl.href : '';
        const archRaw = archCol ? archCol.innerText.trim() : '';
        const date = dateCol ? dateCol.innerText.trim() : '';

        const arch = normalizeArch(archRaw, title);
        const os = detectOS(title);
        const buildNumber = detectBuildNumber(title);
        const version = detectVersion(title, buildNumber);
        const branch = detectBranch(title);
        const packageCategory = detectPackageCategory(title);
        const updateType = detectType(title);
        const uuid = extractUuid(link);

        const searchableText = [
            title,
            arch,
            os,
            version || '',
            branch || '',
            packageCategory,
            updateType,
            buildNumber,
            uuid
        ].join(' ').toLowerCase();

        return {
            element: tr,
            title,
            arch,
            date,
            link,
            uuid,
            os,
            version,
            branch,
            packageCategory,
            updateType,
            buildNumber,
            searchableText
        };
    }

    // -------------------------------------------------------------
    // МОДУЛЬ 2: СОСТОЯНИЕ И ДВИЖОК ФИЛЬТРАЦИИ
    // -------------------------------------------------------------
    const CATEGORIES = ['packageCategory', 'arch', 'os', 'version', 'branch', 'updateType', 'buildNumber'];

    const state = {
        items: [],
        filters: {
            packageCategory: new Set(),
            arch: new Set(),
            os: new Set(),
            version: new Set(),
            branch: new Set(),
            updateType: new Set(),
            buildNumber: new Set()
        },
        searchQuery: '',
        table: null,
        panelEl: null
    };

    function matchesItem(item, filters, queryTokens, categoryToIgnore = null) {
        for (const cat of CATEGORIES) {
            if (cat === categoryToIgnore) continue;
            const set = filters[cat];
            if (set && set.size > 0) {
                const itemVal = item[cat];
                if (!itemVal || !set.has(itemVal)) return false;
            }
        }

        if (queryTokens && queryTokens.length > 0) {
            const hasAll = queryTokens.every(tok => item.searchableText.includes(tok));
            if (!hasAll) return false;
        }

        return true;
    }

    function computeDynamicFacetCounts() {
        const queryTokens = state.searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const dynamicStats = {};
        CATEGORIES.forEach(cat => {
            dynamicStats[cat] = new Map();
        });

        CATEGORIES.forEach(cat => {
            state.items.forEach(item => {
                if (matchesItem(item, state.filters, queryTokens, cat)) {
                    const val = item[cat];
                    if (val) {
                        dynamicStats[cat].set(val, (dynamicStats[cat].get(val) || 0) + 1);
                    }
                }
            });
        });

        return dynamicStats;
    }

    function applyFilters() {
        const queryTokens = state.searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
        let visibleCount = 0;

        state.items.forEach(item => {
            const isVisible = matchesItem(item, state.filters, queryTokens, null);
            item.element.style.display = isVisible ? '' : 'none';
            if (isVisible) visibleCount++;
        });

        // Обновление счетчика в заголовке панели
        const counterEl = state.panelEl?.querySelector('.uup-filter-status-count');
        if (counterEl) {
            counterEl.textContent = `${visibleCount} из ${state.items.length}`;
        }

        // Динамический пересчет и обновление состояния элементов управления
        updateFacetControls();
    }

    function updateFacetControls() {
        if (!state.panelEl) return;

        const dynamicStats = computeDynamicFacetCounts();

        // 1. Обновление чипов (Категория, Архитектура, ОС, Релиз, Ветка, Тип)
        const chips = state.panelEl.querySelectorAll('.uup-filter-chip');
        chips.forEach(chip => {
            const category = chip.getAttribute('data-category');
            const value = chip.getAttribute('data-value');
            const isActive = state.filters[category]?.has(value);
            const count = dynamicStats[category]?.get(value) || 0;

            // Обновляем бейдж с количеством
            const badge = chip.querySelector('.uup-filter-count-badge');
            if (badge) {
                badge.textContent = count;
            }

            if (isActive) {
                chip.classList.add('active', 'blue');
                chip.classList.remove('basic', 'disabled');
                chip.disabled = false;
                chip.style.opacity = '1';
                chip.style.pointerEvents = 'auto';
                chip.style.cursor = 'pointer';
            } else {
                chip.classList.remove('active', 'blue');
                chip.classList.add('basic');

                if (count === 0) {
                    // Если элементов 0 — делаем недоступным для нажатия
                    chip.classList.add('disabled');
                    chip.disabled = true;
                    chip.style.opacity = '0.35';
                    chip.style.pointerEvents = 'none';
                    chip.style.cursor = 'not-allowed';
                } else {
                    chip.classList.remove('disabled');
                    chip.disabled = false;
                    chip.style.opacity = '1';
                    chip.style.pointerEvents = 'auto';
                    chip.style.cursor = 'pointer';
                }
            }
        });

        // 2. Обновление выпадающего списка «Сборка (Build)»
        const buildSelect = state.panelEl.querySelector('.uup-filter-build-select');
        const clearBuildBtn = state.panelEl.querySelector('.uup-filter-clear-build-btn');
        const buildGroup = buildSelect ? buildSelect.closest('.uup-filter-group') : null;

        if (buildSelect) {
            const options = buildSelect.querySelectorAll('option');
            let visibleBuildOptionsCount = 0;
            let selectedBuildBecameUnavailable = false;

            options.forEach(opt => {
                const bVal = opt.value;
                if (!bVal) {
                    // Опция "Все сборки"
                    return;
                }
                const bCount = dynamicStats.buildNumber?.get(bVal) || 0;
                opt.textContent = `${bVal} (${bCount})`;

                if (bCount === 0) {
                    // Если сборка недоступна — полностью скрываем её из выпадающего списка
                    opt.hidden = true;
                    opt.style.display = 'none';
                    opt.disabled = true;

                    if (state.filters.buildNumber.has(bVal)) {
                        selectedBuildBecameUnavailable = true;
                    }
                } else {
                    // Если доступна — показываем
                    opt.hidden = false;
                    opt.style.display = '';
                    opt.disabled = false;
                    visibleBuildOptionsCount++;
                }
            });

            // Если ранее выбранная сборка стала недоступна из-за другого фильтра — сбрасываем выбор
            if (selectedBuildBecameUnavailable) {
                state.filters.buildNumber.clear();
                buildSelect.value = '';
            }

            // Обновляем текст пункта "Все сборки"
            const defaultOpt = buildSelect.querySelector('option[value=""]');
            if (defaultOpt) {
                defaultOpt.textContent = `Все сборки (Доступно: ${visibleBuildOptionsCount})`;
            }

            // Если нет ни одной доступной сборки — скрываем всю строку группы
            if (buildGroup) {
                buildGroup.style.display = visibleBuildOptionsCount === 0 ? 'none' : 'flex';
            }

            let hasActiveBuild = state.filters.buildNumber.size > 0;
            if (hasActiveBuild) {
                buildSelect.style.borderColor = '#2185d0';
                buildSelect.style.backgroundColor = 'rgba(33, 133, 208, 0.08)';
                if (clearBuildBtn) clearBuildBtn.style.display = 'inline-block';
            } else {
                buildSelect.style.borderColor = 'rgba(34,36,38,.2)';
                buildSelect.style.backgroundColor = 'var(--bg-input, rgba(255,255,255,0.9))';
                if (clearBuildBtn) clearBuildBtn.style.display = 'none';
            }
        }

        // 3. Показ или скрытие главной кнопки «Сбросить все»
        const hasActiveFilters = Object.values(state.filters).some(s => s.size > 0) || state.searchQuery.length > 0;
        const resetBtn = state.panelEl.querySelector('.uup-filter-reset-btn');
        if (resetBtn) {
            resetBtn.style.display = hasActiveFilters ? 'inline-block' : 'none';
        }
    }

    function resetAllFilters() {
        Object.keys(state.filters).forEach(k => state.filters[k].clear());
        state.searchQuery = '';

        const searchInput = state.panelEl?.querySelector('.uup-filter-search-input');
        if (searchInput) searchInput.value = '';

        const buildSelect = state.panelEl?.querySelector('.uup-filter-build-select');
        if (buildSelect) buildSelect.value = '';

        applyFilters();
    }

    // -------------------------------------------------------------
    // МОДУЛЬ 3: ГЕНЕРАТОР ПОЛЬЗОВАТЕЛЬСКОГО ИНТЕРФЕЙСА (UI)
    // -------------------------------------------------------------
    function collectInitialStats() {
        const stats = {};
        CATEGORIES.forEach(cat => {
            stats[cat] = new Map();
        });

        state.items.forEach(item => {
            CATEGORIES.forEach(cat => {
                const val = item[cat];
                if (val) {
                    stats[cat].set(val, (stats[cat].get(val) || 0) + 1);
                }
            });
        });

        return stats;
    }

    function createChipGroup(title, iconClass, category, statsMap) {
        if (!statsMap || statsMap.size === 0) return null;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'uup-filter-group';
        groupDiv.style.marginBottom = '8px';
        groupDiv.style.display = 'flex';
        groupDiv.style.alignItems = 'center';
        groupDiv.style.flexWrap = 'wrap';
        groupDiv.style.gap = '6px';

        const label = document.createElement('span');
        label.style.fontWeight = 'bold';
        label.style.fontSize = '0.9em';
        label.style.minWidth = '130px';
        label.style.opacity = '0.85';
        label.innerHTML = `<i class="${iconClass}"></i> ${title}:`;
        groupDiv.appendChild(label);

        const chipsWrap = document.createElement('div');
        chipsWrap.style.display = 'flex';
        chipsWrap.style.flexWrap = 'wrap';
        chipsWrap.style.gap = '6px';
        chipsWrap.style.flex = '1';

        const entries = Array.from(statsMap.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

        entries.forEach(([val, count]) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ui tiny basic button uup-filter-chip';
            btn.setAttribute('data-category', category);
            btn.setAttribute('data-value', val);
            btn.style.margin = '0';
            btn.style.padding = '4px 8px';
            btn.style.borderRadius = '14px';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all 0.2s';

            btn.innerHTML = `${val} <span class="ui circular label tiny uup-filter-count-badge" style="margin-left: 4px; padding: 2px 6px;">${count}</span>`;

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const set = state.filters[category];
                if (set.has(val)) {
                    set.delete(val);
                } else {
                    set.add(val);
                }
                applyFilters();
            });

            chipsWrap.appendChild(btn);
        });

        groupDiv.appendChild(chipsWrap);
        return groupDiv;
    }

    function createDropdownGroup(title, iconClass, category, statsMap) {
        if (!statsMap || statsMap.size === 0) return null;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'uup-filter-group';
        groupDiv.style.marginBottom = '8px';
        groupDiv.style.display = 'flex';
        groupDiv.style.alignItems = 'center';
        groupDiv.style.flexWrap = 'wrap';
        groupDiv.style.gap = '8px';

        const label = document.createElement('span');
        label.style.fontWeight = 'bold';
        label.style.fontSize = '0.9em';
        label.style.minWidth = '130px';
        label.style.opacity = '0.85';
        label.innerHTML = `<i class="${iconClass}"></i> ${title}:`;
        groupDiv.appendChild(label);

        const selectWrap = document.createElement('div');
        selectWrap.style.display = 'inline-flex';
        selectWrap.style.alignItems = 'center';
        selectWrap.style.gap = '6px';

        const select = document.createElement('select');
        select.className = 'uup-filter-build-select';
        select.style.padding = '5px 12px';
        select.style.borderRadius = '6px';
        select.style.border = '1px solid rgba(34,36,38,.2)';
        select.style.backgroundColor = 'var(--bg-input, rgba(255,255,255,0.9))';
        select.style.color = 'inherit';
        select.style.fontSize = '0.9em';
        select.style.cursor = 'pointer';
        select.style.outline = 'none';
        select.style.minWidth = '240px';
        select.style.transition = 'all 0.2s';

        // Пункт по умолчанию
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = `Все сборки (Всего: ${state.items.length})`;
        select.appendChild(defaultOpt);

        // Сортировка сборок численно по убыванию ревизии
        const entries = Array.from(statsMap.entries()).sort((a, b) => {
            const parseParts = s => s.split('.').map(n => parseInt(n, 10) || 0);
            const [aMaj, aMin] = parseParts(a[0]);
            const [bMaj, bMin] = parseParts(b[0]);
            if (bMaj !== aMaj) return bMaj - aMaj;
            return bMin - aMin;
        });

        entries.forEach(([val, count]) => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = `${val} (${count})`;
            select.appendChild(opt);
        });

        select.addEventListener('change', () => {
            state.filters.buildNumber.clear();
            if (select.value) {
                state.filters.buildNumber.add(select.value);
            }
            applyFilters();
        });

        // Мини-кнопка сброса выбора сборки
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'ui tiny icon basic button uup-filter-clear-build-btn';
        clearBtn.title = 'Сбросить выбор сборки';
        clearBtn.style.display = 'none';
        clearBtn.style.margin = '0';
        clearBtn.style.padding = '5px 7px';
        clearBtn.style.borderRadius = '50%';
        clearBtn.style.cursor = 'pointer';
        clearBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';

        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            select.value = '';
            state.filters.buildNumber.clear();
            applyFilters();
        });

        selectWrap.appendChild(select);
        selectWrap.appendChild(clearBtn);
        groupDiv.appendChild(selectWrap);

        return groupDiv;
    }

    function renderFilterPanel() {
        if (state.panelEl) {
            state.panelEl.remove();
            state.panelEl = null;
        }

        const initialStats = collectInitialStats();

        const panel = document.createElement('div');
        panel.id = 'uup-dynamic-filter-panel';
        panel.className = 'ui segment';
        panel.style.margin = '16px 0';
        panel.style.padding = '14px 18px';
        panel.style.border = '1px solid rgba(34,36,38,.15)';
        panel.style.borderRadius = '8px';
        panel.style.backgroundColor = 'var(--bg-panel, rgba(0, 0, 0, 0.02))';

        // 1. Верхний бар: Заголовок, поиск и статус
        const headerBar = document.createElement('div');
        headerBar.style.display = 'flex';
        headerBar.style.justifyContent = 'space-between';
        headerBar.style.alignItems = 'center';
        headerBar.style.flexWrap = 'wrap';
        headerBar.style.gap = '10px';
        headerBar.style.marginBottom = '12px';
        headerBar.style.paddingBottom = '10px';
        headerBar.style.borderBottom = '1px solid rgba(34,36,38,.08)';

        const titleDiv = document.createElement('div');
        titleDiv.style.display = 'flex';
        titleDiv.style.alignItems = 'center';
        titleDiv.style.gap = '8px';
        titleDiv.innerHTML = `
            <h4 class="ui header" style="margin: 0; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-filter fa-sm" style="color: #2185d0;"></i>
                Динамические фильтры
            </h4>
            <span class="ui label teal tiny" style="margin-left: 6px;">
                Найдено: <b class="uup-filter-status-count" style="margin-left: 4px;">${state.items.length} из ${state.items.length}</b>
            </span>
        `;
        headerBar.appendChild(titleDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.alignItems = 'center';
        actionsDiv.style.gap = '8px';

        // Поле живого поиска
        const searchWrap = document.createElement('div');
        searchWrap.className = 'ui small icon input';
        searchWrap.style.minWidth = '240px';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'uup-filter-search-input';
        searchInput.placeholder = 'Живой поиск по таблице...';
        searchInput.value = state.searchQuery;

        let debounceTimer = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                state.searchQuery = searchInput.value;
                applyFilters();
            }, 100);
        });

        const searchIcon = document.createElement('i');
        searchIcon.className = 'fa-solid fa-magnifying-glass icon';
        searchWrap.appendChild(searchInput);
        searchWrap.appendChild(searchIcon);
        actionsDiv.appendChild(searchWrap);

        // Кнопка сброса всех фильтров
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'ui tiny red basic button uup-filter-reset-btn';
        resetBtn.style.display = 'none';
        resetBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Сбросить';
        resetBtn.addEventListener('click', resetAllFilters);
        actionsDiv.appendChild(resetBtn);

        headerBar.appendChild(actionsDiv);
        panel.appendChild(headerBar);

        // 2. Группы фильтров
        const groupsContainer = document.createElement('div');
        groupsContainer.style.display = 'flex';
        groupsContainer.style.flexDirection = 'column';
        groupsContainer.style.gap = '4px';

        // ПУНКТ 1 (САМЫЙ ВЕРХНИЙ): Разделение между полными сборками и обновлениями
        const gCategory = createChipGroup('Категория', 'fa-solid fa-layer-group', 'packageCategory', initialStats.packageCategory);
        if (gCategory) groupsContainer.appendChild(gCategory);

        // ПУНКТ 2: Архитектура
        const gArch = createChipGroup('Архитектура', 'fa-solid fa-microchip', 'arch', initialStats.arch);
        if (gArch) groupsContainer.appendChild(gArch);

        // ПУНКТ 3: Операционная система
        const gOS = createChipGroup('Операционная система', 'fa-brands fa-microsoft', 'os', initialStats.os);
        if (gOS) groupsContainer.appendChild(gOS);

        // ПУНКТ 4: Версия / Релиз
        const gVersion = createChipGroup('Версия / Релиз', 'fa-solid fa-tag', 'version', initialStats.version);
        if (gVersion) groupsContainer.appendChild(gVersion);

        // ПУНКТ 5: Ветка разработки
        const gBranch = createChipGroup('Ветка разработки', 'fa-solid fa-code-branch', 'branch', initialStats.branch);
        if (gBranch) groupsContainer.appendChild(gBranch);

        // ПУНКТ 6: Тип сборки (Standard Build, .NET Framework, Cumulative, Preview)
        const gType = createChipGroup('Тип сборки', 'fa-solid fa-box-archive', 'updateType', initialStats.updateType);
        if (gType) groupsContainer.appendChild(gType);

        // ПУНКТ 7: Сборка (Build) в виде выпадающего списка
        const gBuild = createDropdownGroup('Сборка (Build)', 'fa-solid fa-code-commit', 'buildNumber', initialStats.buildNumber);
        if (gBuild) groupsContainer.appendChild(gBuild);

        panel.appendChild(groupsContainer);

        state.panelEl = panel;
        state.table.parentElement.insertBefore(panel, state.table);

        updateFacetControls();
    }

    // -------------------------------------------------------------
    // МОДУЛЬ 4: ИНИЦИАЛИЗАЦИЯ И НАБЛЮДЕНИЕ ЗА DOM
    // -------------------------------------------------------------
    function init() {
        const table = document.querySelector('table.ui.table, table.table');
        if (!table) return false;

        const rows = Array.from(table.querySelectorAll('tr')).filter(r => r.querySelectorAll('td').length >= 2);
        if (rows.length === 0) return false;

        state.table = table;
        state.items = rows.map(parseRow).filter(Boolean);

        renderFilterPanel();
        return true;
    }

    // Запуск при готовности DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init());
    } else {
        init();
    }

    // Наблюдение за динамическими изменениями таблицы (например, пагинация или ajax-обновление)
    let observerDebounce = null;
    const observer = new MutationObserver(() => {
        clearTimeout(observerDebounce);
        observerDebounce = setTimeout(() => {
            const table = document.querySelector('table.ui.table, table.table');
            if (table && (!state.panelEl || !document.contains(state.panelEl))) {
                init();
            }
        }, 300);
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
