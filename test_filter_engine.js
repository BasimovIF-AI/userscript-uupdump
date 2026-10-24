// test_filter_engine.js — Автоматические unit-тесты парсинга и фильтрации сборок UUP dump
const assert = require('assert');

function isBuildsPage(pathname) {
    if (!pathname) return false;
    // Черный список страниц мастера загрузки
    if (/(selectedition|selectlang|get|downloadpack|findfiles|faq)\.php/i.test(pathname)) {
        return false;
    }
    // Разрешенные страницы
    if (/(known|fetchupd)\.php/i.test(pathname) || pathname === '/' || pathname === '/index.php') {
        return true;
    }
    return false;
}

function isBuildsTableLike(headers, links) {
    const hasBuildLink = links.some(l => l && l.includes('selectlang.php?id='));
    if (hasBuildLink) return true;

    const lowerHeaders = headers.map(h => (h || '').toLowerCase());
    return lowerHeaders.includes('build') && lowerHeaders.includes('architecture');
}

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

function parseBuildRecord({ title, arch, date, link }) {
    const normArch = normalizeArch(arch, title);
    const os = detectOS(title);
    const buildNumber = detectBuildNumber(title);
    const version = detectVersion(title, buildNumber);
    const branch = detectBranch(title);
    const packageCategory = detectPackageCategory(title);
    const updateType = detectType(title);
    const uuid = extractUuid(link);

    const searchableText = [
        title,
        normArch,
        os,
        version || '',
        branch || '',
        packageCategory,
        updateType,
        buildNumber,
        uuid
    ].join(' ').toLowerCase();

    return {
        title,
        arch: normArch,
        date: date || '',
        link: link || '',
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

const CATEGORIES = ['packageCategory', 'arch', 'os', 'version', 'branch', 'updateType', 'buildNumber'];

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

function computeDynamicFacetCounts(items, filters, searchQuery) {
    const queryTokens = (searchQuery || '')
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

    const dynamicStats = {};
    CATEGORIES.forEach(cat => {
        dynamicStats[cat] = new Map();
    });

    CATEGORIES.forEach(cat => {
        items.forEach(item => {
            if (matchesItem(item, stateFiltersFallback(filters), queryTokens, cat)) {
                const val = item[cat];
                if (val) {
                    dynamicStats[cat].set(val, (dynamicStats[cat].get(val) || 0) + 1);
                }
            }
        });
    });

    return dynamicStats;
}

function stateFiltersFallback(f) {
    const res = {};
    CATEGORIES.forEach(cat => {
        res[cat] = f && f[cat] ? f[cat] : new Set();
    });
    return res;
}

function filterItems(items, filters, searchQuery) {
    const queryTokens = (searchQuery || '')
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

    return items.filter(item => matchesItem(item, stateFiltersFallback(filters), queryTokens, null));
}

// ---------------- ТЕСТОВЫЕ ДАННЫЕ ----------------
const sampleData = [
    {
        title: "Windows 11, version 26H2 (26300.9807) amd64",
        link: "https://uupdump.net/selectlang.php?id=687d1ced-aab1-4cd5-ad05-705189769731",
        arch: "x64",
        date: "2026-10-16 17:00:10 UTC"
    },
    {
        title: "Windows 11, version 26H2 (26300.9807) arm64",
        link: "https://uupdump.net/selectlang.php?id=bf882f73-feb3-425b-9208-56cb11703967",
        arch: "arm64",
        date: "2026-10-16 17:01:10 UTC"
    },
    {
        title: "Cumulative Update for Windows CPC OS (10.0.26300.9711) (26300.9711) amd64",
        link: "https://uupdump.net/selectlang.php?id=439b7eae-f36a-44b5-9aca-d7468ec86d9a",
        arch: "x64",
        date: "2026-10-13 17:17:21 UTC"
    },
    {
        title: "Preview Update for Windows 11 (26300.9278) amd64",
        link: "https://uupdump.net/selectlang.php?id=11111111-2222-3333-4444-555555555555",
        arch: "x64",
        date: "2026-09-15 13:45:43 UTC"
    },
    {
        title: ".NET Framework Security Update for Windows 11 - KB5127694 (26300.10008) amd64",
        link: "https://uupdump.net/selectlang.php?id=22222222-3333-4444-5555-666666666666",
        arch: "x64",
        date: "2026-10-13 17:00:20 UTC"
    }
];

console.log('===> Запуск тестов парсера UUP dump v1.3.2...');

// Тест 1: Валидация целевых страниц URL (isBuildsPage)
assert.strictEqual(isBuildsPage('/known.php'), true);
assert.strictEqual(isBuildsPage('/fetchupd.php'), true);
assert.strictEqual(isBuildsPage('/'), true);
assert.strictEqual(isBuildsPage('/selectedition.php'), false);
assert.strictEqual(isBuildsPage('/selectlang.php'), false);
assert.strictEqual(isBuildsPage('/get.php'), false);
assert.strictEqual(isBuildsPage('/downloadpack.php'), false);
assert.strictEqual(isBuildsPage('/findfiles.php'), false);
console.log('  [PASS] Тест 1: Валидация целевых страниц URL отсекает страницы мастера загрузки');

// Тест 2: Сигнатурная проверка таблицы сборок (isBuildsTableLike)
const validBuildHeaders = ['Build', 'Architecture', 'Date added'];
const validBuildLinks = ['https://uupdump.net/selectlang.php?id=687d1ced-aab1-4cd5-ad05-705189769731'];
assert.strictEqual(isBuildsTableLike(validBuildHeaders, validBuildLinks), true);

const editionTableHeaders = ['Additional edition', 'Required edition'];
const editionTableLinks = [];
assert.strictEqual(isBuildsTableLike(editionTableHeaders, editionTableLinks), false);
console.log('  [PASS] Тест 2: Сигнатурная проверка таблицы сборок отсекает таблицу редакций');

// Тест 3: Базовый парсинг категорий и билдов
const parsed = sampleData.map(parseBuildRecord);
assert.strictEqual(parsed[0].packageCategory, 'Полные сборки');
assert.strictEqual(parsed[2].packageCategory, 'Обновления');
console.log('  [PASS] Тест 3: Категории пакетов корректно определены');

console.log('\n Все unit-тесты v1.3.2 успешно пройдены!');
