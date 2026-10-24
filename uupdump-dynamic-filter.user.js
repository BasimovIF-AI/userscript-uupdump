// ==UserScript==
// @name         UUP dump Dynamic Build Filters
// @namespace    https://github.com/BasimovIF-AI/userscript-uupdump
// @version      1.1.0
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
        const updateType = detectType(title);
        const uuid = extractUuid(link);

        const searchableText = [
            title,
            arch,
            os,
            version || '',
            branch || '',
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
            updateType,
            buildNumber,
            searchableText
        };
    }

    // -------------------------------------------------------------
    // МОДУЛЬ 2: СОСТОЯНИЕ И ДВИЖОК ФИЛЬТРАЦИИ
    // -------------------------------------------------------------
    const state = {
        items: [],
        filters: {
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

    function matchesFilter(item, filters, queryTokens) {
        if (filters.arch.size > 0 && !filters.arch.has(item.arch)) return false;
        if (filters.os.size > 0 && !filters.os.has(item.os)) return false;
        if (filters.version.size > 0 && (!item.version || !filters.version.has(item.version))) return false;
        if (filters.branch.size > 0 && (!item.branch || !filters.branch.has(item.branch))) return false;
        if (filters.updateType.size > 0 && !filters.updateType.has(item.updateType)) return false;
        if (filters.buildNumber.size > 0 && (!item.buildNumber || !filters.buildNumber.has(item.buildNumber))) return false;

        if (queryTokens.length > 0) {
            const hasAll = queryTokens.every(tok => item.searchableText.includes(tok));
            if (!hasAll) return false;
        }

        return true;
    }

    function applyFilters() {
        const queryTokens = state.searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
        let visibleCount = 0;

        state.items.forEach(item => {
            const isVisible = matchesFilter(item, state.filters, queryTokens);
            item.element.style.display = isVisible ? '' : 'none';
            if (isVisible) visibleCount++;
        });

        // Обновление счетчика в заголовке панели
        const counterEl = state.panelEl?.querySelector('.uup-filter-status-count');
        if (counterEl) {
            counterEl.textContent = `${visibleCount} из ${state.items.length}`;
        }

        // Обновление состояния кнопок-чипов (активность и класс цвета)
        updateChipStyles();
    }

    function updateChipStyles() {
        if (!state.panelEl) return;
        const chips = state.panelEl.querySelectorAll('.uup-filter-chip');
        chips.forEach(chip => {
            const category = chip.getAttribute('data-category');
            const value = chip.getAttribute('data-value');
            const isActive = state.filters[category]?.has(value);

            if (isActive) {
                chip.classList.add('active', 'blue');
                chip.classList.remove('basic');
            } else {
                chip.classList.remove('active', 'blue');
                chip.classList.add('basic');
            }
        });

        // Показ или скрытие кнопки «Сбросить все»
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
        applyFilters();
    }

    // -------------------------------------------------------------
    // МОДУЛЬ 3: ГЕНЕРАТОР ПОЛЬЗОВАТЕЛЬСКОГО ИНТЕРФЕЙСА (UI)
    // -------------------------------------------------------------
    function collectFacetStats() {
        const stats = {
            arch: new Map(),
            os: new Map(),
            version: new Map(),
            branch: new Map(),
            updateType: new Map(),
            buildNumber: new Map()
        };

        state.items.forEach(item => {
            if (item.arch) stats.arch.set(item.arch, (stats.arch.get(item.arch) || 0) + 1);
            if (item.os) stats.os.set(item.os, (stats.os.get(item.os) || 0) + 1);
            if (item.version) stats.version.set(item.version, (stats.version.get(item.version) || 0) + 1);
            if (item.branch) stats.branch.set(item.branch, (stats.branch.get(item.branch) || 0) + 1);
            if (item.updateType) stats.updateType.set(item.updateType, (stats.updateType.get(item.updateType) || 0) + 1);
            if (item.buildNumber) stats.buildNumber.set(item.buildNumber, (stats.buildNumber.get(item.buildNumber) || 0) + 1);
        });

        return stats;
    }

    function createChipGroup(title, iconClass, category, statsMap, isScrollable = false) {
        // Если сборок или данных нет — группа не отображается
        if (!statsMap || statsMap.size === 0) return null;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'uup-filter-group';
        groupDiv.style.marginBottom = '8px';
        groupDiv.style.display = 'flex';
        groupDiv.style.alignItems = isScrollable && statsMap.size > 8 ? 'flex-start' : 'center';
        groupDiv.style.flexWrap = 'wrap';
        groupDiv.style.gap = '6px';

        const label = document.createElement('span');
        label.style.fontWeight = 'bold';
        label.style.fontSize = '0.9em';
        label.style.minWidth = '130px';
        label.style.paddingTop = isScrollable && statsMap.size > 8 ? '4px' : '0';
        label.style.opacity = '0.85';
        label.innerHTML = `<i class="${iconClass}"></i> ${title}:`;
        groupDiv.appendChild(label);

        const chipsWrap = document.createElement('div');
        chipsWrap.style.display = 'flex';
        chipsWrap.style.flexWrap = 'wrap';
        chipsWrap.style.gap = '6px';
        chipsWrap.style.flex = '1';

        // При большом количестве сборок включаем аккуратную прокрутку
        if (isScrollable && statsMap.size > 8) {
            chipsWrap.style.maxHeight = '74px';
            chipsWrap.style.overflowY = 'auto';
            chipsWrap.style.padding = '2px 4px';
            chipsWrap.style.border = '1px solid rgba(34,36,38,.08)';
            chipsWrap.style.borderRadius = '6px';
            chipsWrap.style.scrollbarWidth = 'thin';
        }

        const entries = Array.from(statsMap.entries());

        // Сортировка: для номеров сборок — численно по убыванию (новейшие первыми)
        if (category === 'buildNumber') {
            entries.sort((a, b) => {
                const parseParts = s => s.split('.').map(n => parseInt(n, 10) || 0);
                const [aMaj, aMin] = parseParts(a[0]);
                const [bMaj, bMin] = parseParts(b[0]);
                if (bMaj !== aMaj) return bMaj - aMaj;
                return bMin - aMin;
            });
        } else {
            // Для остальных категорий: по количеству сборок, затем по алфавиту
            entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        }

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

            btn.innerHTML = `${val} <span class="ui circular label tiny" style="margin-left: 4px; padding: 2px 6px;">${count}</span>`;

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

    function renderFilterPanel() {
        if (state.panelEl) {
            state.panelEl.remove();
            state.panelEl = null;
        }

        const stats = collectFacetStats();

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

        // Кнопка сброса
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'ui tiny red basic button uup-filter-reset-btn';
        resetBtn.style.display = 'none';
        resetBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Сбросить';
        resetBtn.addEventListener('click', resetAllFilters);
        actionsDiv.appendChild(resetBtn);

        headerBar.appendChild(actionsDiv);
        panel.appendChild(headerBar);

        // 2. Группы фильтров (отображаются строго при наличии элементов в категории)
        const groupsContainer = document.createElement('div');
        groupsContainer.style.display = 'flex';
        groupsContainer.style.flexDirection = 'column';
        groupsContainer.style.gap = '4px';

        const gArch = createChipGroup('Архитектура', 'fa-solid fa-microchip', 'arch', stats.arch);
        if (gArch) groupsContainer.appendChild(gArch);

        const gOS = createChipGroup('Операционная система', 'fa-brands fa-microsoft', 'os', stats.os);
        if (gOS) groupsContainer.appendChild(gOS);

        const gVersion = createChipGroup('Версия / Релиз', 'fa-solid fa-tag', 'version', stats.version);
        if (gVersion) groupsContainer.appendChild(gVersion);

        const gBranch = createChipGroup('Ветка разработки', 'fa-solid fa-code-branch', 'branch', stats.branch);
        if (gBranch) groupsContainer.appendChild(gBranch);

        const gType = createChipGroup('Тип сборки', 'fa-solid fa-box-archive', 'updateType', stats.updateType);
        if (gType) groupsContainer.appendChild(gType);

        // Группа сборки (Build) — с адаптивным скроллом при большом количестве сборок
        const gBuild = createChipGroup('Сборка (Build)', 'fa-solid fa-code-commit', 'buildNumber', stats.buildNumber, true);
        if (gBuild) groupsContainer.appendChild(gBuild);

        panel.appendChild(groupsContainer);

        state.panelEl = panel;
        state.table.parentElement.insertBefore(panel, state.table);

        updateChipStyles();
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
