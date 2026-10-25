// ==UserScript==
// @name         UUP dump Dynamic Build Filters
// @namespace    https://github.com/BasimovIF-AI/userscript-uupdump
// @version      1.5.0
// @description  Мгновенные динамические фасетные фильтры, быстрый поиск и счетчики сборок для UUP dump (uupdump.net)
// @author       BasimovIF
// @match        https://uupdump.net/*
// @match        http://uupdump.net/*
// @exclude      *://uupdump.net/selectedition.php*
// @exclude      *://uupdump.net/selectlang.php*
// @exclude      *://uupdump.net/get.php*
// @exclude      *://uupdump.net/downloadpack.php*
// @exclude      *://uupdump.net/findfiles.php*
// @exclude      *://uupdump.net/faq.php*
// @icon         https://uupdump.net/static/uupdump/1.2.0/img/logo.svg
// @updateURL    https://raw.githubusercontent.com/BasimovIF-AI/userscript-uupdump/master/uupdump-dynamic-filter.user.js
// @downloadURL  https://raw.githubusercontent.com/BasimovIF-AI/userscript-uupdump/master/uupdump-dynamic-filter.user.js
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // -------------------------------------------------------------
    // МОДУЛЬ 0.0: МУЛЬТИЯЗЫЧНОСТЬ И ЛОКАЛИЗАЦИЯ (i18n)
    // -------------------------------------------------------------
    const I18N = {
        en: {
            name: 'English',
            panelTitle: 'Dynamic Filters',
            searchPlaceholder: 'Search builds, versions, KB, UUID...',
            statusCount: 'Found: {visible} of {total} builds',
            reset: 'Reset',
            category: 'Category',
            arch: 'Architecture',
            os: 'Operating System',
            version: 'Version / Release',
            branch: 'Branch',
            buildType: 'Build Type',
            buildNumber: 'Build',
            allBuilds: 'All builds (Available: {count})',
            clearBuildTooltip: 'Clear build selection',
            fullBuilds: 'Full Builds',
            updates: 'Updates',
            sysComponents: 'System Components',
            otherOS: 'Other OS'
        },
        ru: {
            name: 'Русский',
            panelTitle: 'Динамические фильтры',
            searchPlaceholder: 'Живой поиск по таблице...',
            statusCount: 'Найдено: {visible} из {total} сборок',
            reset: 'Сбросить',
            category: 'Категория',
            arch: 'Архитектура',
            os: 'Операционная система',
            version: 'Версия / Релиз',
            branch: 'Ветка разработки',
            buildType: 'Тип сборки',
            buildNumber: 'Сборка (Build)',
            allBuilds: 'Все сборки (Доступно: {count})',
            clearBuildTooltip: 'Сбросить выбор сборки',
            fullBuilds: 'Полные сборки',
            updates: 'Обновления',
            sysComponents: 'Системные компоненты',
            otherOS: 'Другая ОС'
        },
        de: {
            name: 'Deutsch',
            panelTitle: 'Dynamische Filter',
            searchPlaceholder: 'Builds, Versionen, KB, UUID suchen...',
            statusCount: 'Gefunden: {visible} von {total} Builds',
            reset: 'Zurücksetzen',
            category: 'Kategorie',
            arch: 'Architektur',
            os: 'Betriebssystem',
            version: 'Version / Release',
            branch: 'Branch',
            buildType: 'Build-Typ',
            buildNumber: 'Build',
            allBuilds: 'Alle Builds (Verfügbar: {count})',
            clearBuildTooltip: 'Build-Auswahl aufheben',
            fullBuilds: 'Vollständige Builds',
            updates: 'Updates',
            sysComponents: 'Systemkomponenten',
            otherOS: 'Anderes BS'
        },
        zh: {
            name: '简体中文',
            panelTitle: '动态筛选器',
            searchPlaceholder: '搜索版本、内部版本号、KB、UUID...',
            statusCount: '已找到: {visible} / {total} 个版本',
            reset: '重置',
            category: '分类',
            arch: '体系结构',
            os: '操作系统',
            version: '版本 / 发行版',
            branch: '开发分支',
            buildType: '版本类型',
            buildNumber: '内部版本 (Build)',
            allBuilds: '全部内部版本 (可用: {count})',
            clearBuildTooltip: '清除版本选择',
            fullBuilds: '完整镜像',
            updates: '更新补丁',
            sysComponents: '系统组件',
            otherOS: '其他操作系统'
        },
        fr: {
            name: 'Français',
            panelTitle: 'Filtres dynamiques',
            searchPlaceholder: 'Rechercher builds, versions, KB, UUID...',
            statusCount: 'Trouvé: {visible} sur {total} builds',
            reset: 'Réinitialiser',
            category: 'Catégorie',
            arch: 'Architecture',
            os: 'Système d\'exploitation',
            version: 'Version / Édition',
            branch: 'Branche',
            buildType: 'Type de build',
            buildNumber: 'Build',
            allBuilds: 'Tous les builds (Disponibles: {count})',
            clearBuildTooltip: 'Effacer la sélection de build',
            fullBuilds: 'Builds complets',
            updates: 'Mises à jour',
            sysComponents: 'Composants système',
            otherOS: 'Autre OS'
        },
        es: {
            name: 'Español',
            panelTitle: 'Filtros dinámicos',
            searchPlaceholder: 'Buscar compilaciones, versiones, KB, UUID...',
            statusCount: 'Encontrado: {visible} de {total} compilaciones',
            reset: 'Restablecer',
            category: 'Categoría',
            arch: 'Arquitectura',
            os: 'Sistema operativo',
            version: 'Versión / Lanzamiento',
            branch: 'Rama',
            buildType: 'Tipo de compilación',
            buildNumber: 'Compilación (Build)',
            allBuilds: 'Todas las compilaciones (Disponibles: {count})',
            clearBuildTooltip: 'Borrar selección de compilación',
            fullBuilds: 'Compilaciones completas',
            updates: 'Actualizaciones',
            sysComponents: 'Componentes del sistema',
            otherOS: 'Otro SO'
        },
        pt: {
            name: 'Português',
            panelTitle: 'Filtros dinâmicos',
            searchPlaceholder: 'Pesquisar compilações, versões, KB, UUID...',
            statusCount: 'Encontrado: {visible} de {total} compilações',
            reset: 'Redefinir',
            category: 'Categoria',
            arch: 'Arquitetura',
            os: 'Sistema operacional',
            version: 'Versão / Lançamento',
            branch: 'Ramificação (Branch)',
            buildType: 'Tipo de compilação',
            buildNumber: 'Compilação (Build)',
            allBuilds: 'Todas as compilações (Disponíveis: {count})',
            clearBuildTooltip: 'Limpar seleção de compilação',
            fullBuilds: 'Compilações completas',
            updates: 'Atualizações',
            sysComponents: 'Componentes do sistema',
            otherOS: 'Outro SO'
        },
        it: {
            name: 'Italiano',
            panelTitle: 'Filtri dinamici',
            searchPlaceholder: 'Cerca build, versioni, KB, UUID...',
            statusCount: 'Trovato: {visible} di {total} build',
            reset: 'Reimposta',
            category: 'Categoria',
            arch: 'Architettura',
            os: 'Sistema operativo',
            version: 'Versione / Release',
            branch: 'Ramo (Branch)',
            buildType: 'Tipo di build',
            buildNumber: 'Build',
            allBuilds: 'Tutte le build (Disponibili: {count})',
            clearBuildTooltip: 'Cancella selezione build',
            fullBuilds: 'Build complete',
            updates: 'Aggiornamenti',
            sysComponents: 'Componenti di sistema',
            otherOS: 'Altro SO'
        }
    };

    function detectLanguage() {
        try {
            const saved = localStorage.getItem('uup_filter_lang');
            if (saved && I18N[saved]) return saved;
        } catch (e) {}

        const docLang = (document.documentElement.lang || '').toLowerCase();
        if (docLang.startsWith('ru')) return 'ru';
        if (docLang.startsWith('de')) return 'de';
        if (docLang.startsWith('zh')) return 'zh';
        if (docLang.startsWith('fr')) return 'fr';
        if (docLang.startsWith('es')) return 'es';
        if (docLang.startsWith('pt')) return 'pt';
        if (docLang.startsWith('it')) return 'it';

        const browserLangs = (typeof navigator !== 'undefined' && navigator.languages && navigator.languages.length)
            ? navigator.languages
            : [(typeof navigator !== 'undefined' ? navigator.language : '') || 'en'];

        for (const l of browserLangs) {
            const code = (l || '').toLowerCase();
            if (code.startsWith('ru') || code.startsWith('be') || code.startsWith('uk') || code.startsWith('kk')) return 'ru';
            if (code.startsWith('de')) return 'de';
            if (code.startsWith('zh')) return 'zh';
            if (code.startsWith('fr')) return 'fr';
            if (code.startsWith('es')) return 'es';
            if (code.startsWith('pt')) return 'pt';
            if (code.startsWith('it')) return 'it';
            if (code.startsWith('en')) return 'en';
        }

        return 'en';
    }

    function t(key, params = {}) {
        const currentLang = (typeof state !== 'undefined' && state.lang) ? state.lang : 'en';
        const langDict = I18N[currentLang] || I18N.en;
        let text = langDict[key] || I18N.en[key] || key;
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        }
        return text;
    }

    function formatFacetLabel(category, value) {
        if (category === 'packageCategory') {
            if (value === 'full') return t('fullBuilds');
            if (value === 'update') return t('updates');
        }
        if (category === 'os') {
            if (value === 'sys_components') return t('sysComponents');
            if (value === 'other') return t('otherOS');
        }
        return value;
    }

    // -------------------------------------------------------------
    // МОДУЛЬ 0: ВАЛИДАЦИЯ ЦЕЛЕВЫХ СТРАНИЦ И ТАБЛИЦ
    // -------------------------------------------------------------
    function isBuildsPage(pathname) {
        if (!pathname) return false;
        // Черный список страниц визарда подготовки загрузки
        if (/(selectedition|selectlang|get|downloadpack|findfiles|faq)\.php/i.test(pathname)) {
            return false;
        }
        // Разрешены страницы со списками сборок (включая главную)
        if (/(known|fetchupd)\.php/i.test(pathname) || pathname === '/' || pathname === '/index.php') {
            return true;
        }
        return false;
    }

    function isBuildsTable(table) {
        if (!table) return false;

        // Исключаем блок быстрых пресетов на главной странице
        if (table.closest('.home-quick-options')) {
            return false;
        }

        // Таблица сборок UUP dump обязательно содержит ссылки перехода к сборке (selectlang.php?id=UUID)
        if (!table.querySelector('a[href*="selectlang.php?id="]')) {
            return false;
        }

        // Проверяем, что в таблице есть строки данных
        const rows = table.querySelectorAll('tr');
        return rows.length >= 2;
    }

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

    function detectOS(title, buildNumber) {
        if (/Windows Server/i.test(title)) return 'Windows Server';
        if (/Azure Stack/i.test(title)) return 'Azure Stack HCI';
        if (/Windows CPC OS|Cloud PC/i.test(title)) return 'Windows CPC OS';
        if (/Windows 11/i.test(title)) return 'Windows 11';
        if (/Windows 10/i.test(title)) return 'Windows 10';
        if (/Windows Holographic/i.test(title)) return 'Windows Holographic';
        if (/Windows Team|Surface Hub/i.test(title)) return 'Windows Team';
        if (/\.NET Framework|Update Stack Package/i.test(title)) return 'sys_components';

        if (buildNumber) {
            const major = parseInt(buildNumber.split('.')[0], 10);
            if (!isNaN(major)) {
                if (major >= 22000) return 'Windows 11';
                if (major >= 10240) return 'Windows 10';
            }
        }
        return 'other';
    }

    function detectBuildNumber(title) {
        // Извлекает номера вида 26300.9807, 26300.10008, 10.0.26300.9711, 28120.3302
        const mFull = title.match(/\b(?:10\.0\.)?(\d{5}(?:\.\d+)?)\b/);
        return mFull ? mFull[1] : '';
    }

    function inferVersionFromBuild(buildStr) {
        if (!buildStr) return null;
        const major = parseInt(buildStr.split('.')[0], 10);
        if (isNaN(major)) return null;

        if (major >= 28000) return 'Future / Experimental';
        if (major >= 26300 && major < 26400) return '26H2';
        if (major >= 26100 && major < 26300) return '24H2';
        if (major >= 25000 && major < 26100) return 'Insider (Canary/Dev)';
        if (major >= 23400 && major < 25000) return 'Insider (Dev)';
        if (major === 22635) return '23H2 (Beta)';
        if (major === 22631) return '23H2';
        if (major === 22624) return '23H2 (Beta)';
        if (major === 22623 || major === 22622) return '22H2 (Beta)';
        if (major === 22621) return '22H2';
        if (major === 22000) return '21H2';
        if (major === 20348) return 'Server 2022';
        if (major === 19045) return '22H2';
        if (major === 19044) return '21H2';
        if (major === 19043) return '21H1';
        if (major === 19042) return '20H2';
        if (major === 19041) return '2004';
        if (major >= 19500 && major < 20300) return 'Insider (Manganese/Iron)';
        if (major === 18363) return '1909';
        if (major === 18362) return '1903';
        if (major === 17763) return '1809';
        if (major === 17134) return '1803';
        if (major === 16299) return '1709';
        if (major === 15063) return '1703';
        if (major === 14393) return '1607';
        if (major === 10586) return '1511';
        if (major === 10240) return '1507 (RTM)';
        return null;
    }

    function detectVersion(title, buildNumber) {
        const m = title.match(/\b(?:version\s+)?(2[0-6]H[12]|2004|1909|1903|1809|1803|1709|1703|1607|1511|1507)\b/i);
        if (m) return m[1].toUpperCase();

        return inferVersionFromBuild(buildNumber);
    }

    function detectBranch(title) {
        // Проверяем все круглые скобки
        const matches = Array.from(title.matchAll(/\(([a-zA-Z0-9_\-\.]+)\)/g)).map(m => m[1]);
        for (const m of matches) {
            if (/^(rs_|ge_|ni_|co_|fe_|zn_|br_|mn_|vb_|19h1_|th|canary|beta|dev|main|release|preview)/i.test(m) ||
                m.endsWith('_release') || m.endsWith('_prerelease') || m.includes('_flight') || m.includes('_svc') || m.includes('_upr')) {
                return m.toLowerCase();
            }
        }

        const alt = title.match(/\b(rs_prerelease|rs_flight|ge_release|ni_release|co_release|fe_release|vb_release|mn_release|zn_release|br_release|19h1_release)\b/i);
        return alt ? alt[1].toLowerCase() : null;
    }

    function detectPackageCategory(title) {
        // Разделение между апдейтами и полными установочными сборками
        if (/\.NET Framework|Cumulative Update|Preview Update|Security Update|Quality Update|Dynamic Update|Update Stack Package|Autopilot update|Setup Duo|\bKB\d{6,8}\b/i.test(title)) {
            return 'update';
        }
        return 'full';
    }

    function detectType(title) {
        if (/\.NET Framework/i.test(title)) return '.NET Framework Update';
        if (/Cumulative Update/i.test(title)) return 'Cumulative Update';
        if (/Preview Update/i.test(title)) return 'Preview Update';
        if (/Feature update/i.test(title)) return 'Feature Update';
        if (/Quality Update/i.test(title)) return 'Quality Update';
        if (/Security Update/i.test(title)) return 'Security Update';
        if (/Dynamic Update/i.test(title)) return 'Dynamic Update';
        if (/Update Stack Package/i.test(title)) return 'Update Stack Package';
        if (/Autopilot update/i.test(title)) return 'Autopilot Update';
        if (/Setup Duo/i.test(title)) return 'Setup Duo';
        if (/Insider Preview/i.test(title)) return 'Insider Preview';
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
        const buildNumber = detectBuildNumber(title);
        const os = detectOS(title, buildNumber);
        const version = detectVersion(title, buildNumber);
        const branch = detectBranch(title);
        const packageCategory = detectPackageCategory(title);
        const updateType = detectType(title);
        const uuid = extractUuid(link);

        const catWords = packageCategory === 'full'
            ? 'full builds полные сборки 完整镜像 vollständige'
            : 'updates обновления 更新补丁';
        const osWords = os === 'sys_components'
            ? 'system components системные компоненты'
            : (os === 'other' ? 'other os другая ос' : os);

        const searchableText = [
            title,
            arch,
            os,
            osWords,
            version || '',
            branch || '',
            catWords,
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
        lang: detectLanguage(),
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
            counterEl.textContent = t('statusCount', { visible: visibleCount, total: state.items.length });
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
                    opt.hidden = false;
                    opt.style.display = '';
                    opt.disabled = false;
                    visibleBuildOptionsCount++;
                }
            });

            // Если выбранная сборка стала недоступна из-за другого фильтра — сбрасываем выбор
            if (selectedBuildBecameUnavailable) {
                state.filters.buildNumber.clear();
                buildSelect.value = '';
            }

            // Обновляем текст пункта "Все сборки"
            const defaultOpt = buildSelect.querySelector('option[value=""]');
            if (defaultOpt) {
                defaultOpt.textContent = t('allBuilds', { count: visibleBuildOptionsCount });
            }

            // Если доступных сборок нет — скрываем группу выпадающего списка
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

        const entries = Array.from(statsMap.entries());

        if (category === 'packageCategory') {
            const order = ['full', 'update'];
            entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
        } else if (category === 'arch') {
            const order = ['x64', 'arm64', 'x86', 'other'];
            entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
        } else if (category === 'os') {
            const order = ['Windows 11', 'Windows 10', 'Windows Server', 'Azure Stack HCI', 'Windows CPC OS', 'Windows Holographic', 'Windows Team', 'sys_components', 'other'];
            entries.sort((a, b) => {
                const idxA = order.indexOf(a[0]);
                const idxB = order.indexOf(b[0]);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return b[1] - a[1];
            });
        } else if (category === 'version') {
            const verOrder = [
                'Future / Experimental', '26H2', '24H2', '23H2', '23H2 (Beta)', '22H2', '22H2 (Beta)', '21H2',
                'Server 2025', 'Server 2022', 'Server 2019', 'Server 2016',
                '21H1', '20H2', '2004', '1909', '1903', '1809', '1803', '1709', '1703', '1607', '1511', '1507 (RTM)',
                'Insider (Canary/Dev)', 'Insider (Dev)', 'Insider (Manganese/Iron)'
            ];
            entries.sort((a, b) => {
                const idxA = verOrder.indexOf(a[0]);
                const idxB = verOrder.indexOf(b[0]);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return b[1] - a[1];
            });
        } else {
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
            btn.style.transition = 'all 0.2s';

            const displayVal = formatFacetLabel(category, val);
            btn.innerHTML = `${displayVal} <span class="ui circular label tiny uup-filter-count-badge" style="margin-left: 4px; padding: 2px 6px;">${count}</span>`;

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
        defaultOpt.textContent = t('allBuilds', { count: state.items.length });
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
        clearBtn.title = t('clearBuildTooltip');
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

        // 1. Верхний бар: Заголовок, язык, поиск и статус
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
                ${t('panelTitle')}
            </h4>
            <span class="ui label teal tiny" style="margin-left: 6px;">
                <b class="uup-filter-status-count">${t('statusCount', { visible: state.items.length, total: state.items.length })}</b>
            </span>
        `;
        headerBar.appendChild(titleDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.alignItems = 'center';
        actionsDiv.style.flexWrap = 'wrap';
        actionsDiv.style.gap = '8px';

        // Селектор языка
        const langSelect = document.createElement('select');
        langSelect.className = 'uup-filter-lang-select';
        langSelect.title = 'Language / Язык';
        langSelect.style.padding = '5px 8px';
        langSelect.style.borderRadius = '6px';
        langSelect.style.border = '1px solid rgba(34,36,38,.2)';
        langSelect.style.backgroundColor = 'var(--bg-input, rgba(255,255,255,0.9))';
        langSelect.style.color = 'inherit';
        langSelect.style.fontSize = '0.85em';
        langSelect.style.cursor = 'pointer';
        langSelect.style.outline = 'none';

        const langOptions = [
            { code: 'en', label: '🌐 English (EN)' },
            { code: 'ru', label: 'Русский (RU)' },
            { code: 'de', label: 'Deutsch (DE)' },
            { code: 'zh', label: '简体中文 (ZH)' },
            { code: 'fr', label: 'Français (FR)' },
            { code: 'es', label: 'Español (ES)' },
            { code: 'pt', label: 'Português (PT)' },
            { code: 'it', label: 'Italiano (IT)' }
        ];

        langOptions.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt.code;
            o.textContent = opt.label;
            if (opt.code === state.lang) o.selected = true;
            langSelect.appendChild(o);
        });

        langSelect.addEventListener('change', () => {
            state.lang = langSelect.value;
            try {
                localStorage.setItem('uup_filter_lang', state.lang);
            } catch (e) {}
            renderFilterPanel();
            applyFilters();
        });
        actionsDiv.appendChild(langSelect);

        // Поле живого поиска
        const searchWrap = document.createElement('div');
        searchWrap.className = 'ui small icon input';
        searchWrap.style.minWidth = '220px';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'uup-filter-search-input';
        searchInput.placeholder = t('searchPlaceholder');
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
        resetBtn.innerHTML = `<i class="fa-solid fa-rotate-left"></i> ${t('reset')}`;
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
        const gCategory = createChipGroup(t('category'), 'fa-solid fa-layer-group', 'packageCategory', initialStats.packageCategory);
        if (gCategory) groupsContainer.appendChild(gCategory);

        // ПУНКТ 2: Архитектура
        const gArch = createChipGroup(t('arch'), 'fa-solid fa-microchip', 'arch', initialStats.arch);
        if (gArch) groupsContainer.appendChild(gArch);

        // ПУНКТ 3: Операционная система
        const gOS = createChipGroup(t('os'), 'fa-brands fa-microsoft', 'os', initialStats.os);
        if (gOS) groupsContainer.appendChild(gOS);

        // ПУНКТ 4: Версия / Релиз
        const gVersion = createChipGroup(t('version'), 'fa-solid fa-tag', 'version', initialStats.version);
        if (gVersion) groupsContainer.appendChild(gVersion);

        // ПУНКТ 5: Ветка разработки
        const gBranch = createChipGroup(t('branch'), 'fa-solid fa-code-branch', 'branch', initialStats.branch);
        if (gBranch) groupsContainer.appendChild(gBranch);

        // ПУНКТ 6: Тип сборки
        const gType = createChipGroup(t('buildType'), 'fa-solid fa-box-archive', 'updateType', initialStats.updateType);
        if (gType) groupsContainer.appendChild(gType);

        // ПУНКТ 7: Сборка (Build) в виде выпадающего списка
        const gBuild = createDropdownGroup(t('buildNumber'), 'fa-solid fa-code-commit', 'buildNumber', initialStats.buildNumber);
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
        if (!isBuildsPage(window.location.pathname)) {
            if (state.panelEl) {
                state.panelEl.remove();
                state.panelEl = null;
            }
            return false;
        }

        // Ищем целевую таблицу сборок (на главной странице пропускает Quick options и находит Recently added builds)
        const tables = Array.from(document.querySelectorAll('table.ui.table, table.table'));
        const table = tables.find(isBuildsTable);
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

    // Наблюдение за динамическими изменениями таблицы (пагинация / ajax-обновление)
    let observerDebounce = null;
    const observer = new MutationObserver(() => {
        clearTimeout(observerDebounce);
        observerDebounce = setTimeout(() => {
            if (!isBuildsPage(window.location.pathname)) {
                if (state.panelEl) {
                    state.panelEl.remove();
                    state.panelEl = null;
                }
                return;
            }
            const tables = Array.from(document.querySelectorAll('table.ui.table, table.table'));
            const table = tables.find(isBuildsTable);
            if (table && (!state.panelEl || !document.contains(state.panelEl))) {
                init();
            }
        }, 300);
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
