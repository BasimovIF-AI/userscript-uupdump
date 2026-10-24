// test_filter_engine.js — Автоматические unit-тесты парсинга и фильтрации сборок UUP dump
const assert = require('assert');

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
    const updateType = detectType(title);
    const uuid = extractUuid(link);

    const searchableText = [
        title,
        normArch,
        os,
        version || '',
        branch || '',
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
        updateType,
        buildNumber,
        searchableText
    };
}

function matchesItem(item, filters, queryTokens, categoryToIgnore = null) {
    for (const cat of ['arch', 'os', 'version', 'branch', 'updateType', 'buildNumber']) {
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

    const dynamicStats = {
        arch: new Map(),
        os: new Map(),
        version: new Map(),
        branch: new Map(),
        updateType: new Map(),
        buildNumber: new Map()
    };

    const categories = ['arch', 'os', 'version', 'branch', 'updateType', 'buildNumber'];

    categories.forEach(cat => {
        // Подсчитываем количество с учетом всех активных фильтров КРОМЕ текущей категории
        items.forEach(item => {
            if (matchesItem(item, filters, queryTokens, cat)) {
                const val = item[cat];
                if (val) {
                    dynamicStats[cat].set(val, (dynamicStats[cat].get(val) || 0) + 1);
                }
            }
        });
    });

    return dynamicStats;
}

function filterItems(items, filters, searchQuery) {
    const queryTokens = (searchQuery || '')
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

    return items.filter(item => matchesItem(item, filters, queryTokens, null));
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

console.log('===> Запуск тестов парсера UUP dump v1.2.0...');
const parsed = sampleData.map(parseBuildRecord);

// Тест 1: Базовый парсинг
assert.strictEqual(parsed[3].updateType, 'Preview Update');
assert.strictEqual(parsed[4].updateType, '.NET Framework Update');
console.log('  [PASS] Тест 1: Обновления Preview и .NET Framework корректно классифицированы');

// Тест 2: Динамический пересчет фасетов при пустых фильтрах
const initialStats = computeDynamicFacetCounts(parsed, {}, '');
assert.strictEqual(initialStats.arch.get('x64'), 4);
assert.strictEqual(initialStats.arch.get('arm64'), 1);
assert.strictEqual(initialStats.updateType.get('Preview Update'), 1);
console.log('  [PASS] Тест 2: Исходные счетчики фасетов подсчитаны корректно');

// Тест 3: Динамический пересчет при выборе arch: arm64
const arm64Filters = {
    arch: new Set(['arm64']),
    os: new Set(),
    version: new Set(),
    branch: new Set(),
    updateType: new Set(),
    buildNumber: new Set()
};
const arm64Stats = computeDynamicFacetCounts(parsed, arm64Filters, '');

// Для arm64 доступен только 26300.9807, а 26300.9711, 26300.9278 и 26300.10008 отсутствуют (undefined или 0)
assert.strictEqual(arm64Stats.buildNumber.get('26300.9807'), 1);
assert.strictEqual(arm64Stats.buildNumber.get('26300.9278') || 0, 0);
assert.strictEqual(arm64Stats.updateType.get('.NET Framework Update') || 0, 0);
assert.strictEqual(arm64Stats.os.get('Windows CPC OS') || 0, 0);
console.log('  [PASS] Тест 3: Динамический пересчет при arch: arm64 выявил недоступные опции (0 сборок)');

// Тест 4: Фильтрация по одиночной сборке из выпадающего списка
const singleBuildFilter = {
    arch: new Set(),
    os: new Set(),
    version: new Set(),
    branch: new Set(),
    updateType: new Set(),
    buildNumber: new Set(['26300.9807'])
};
const buildFiltered = filterItems(parsed, singleBuildFilter, '');
assert.strictEqual(buildFiltered.length, 2); // amd64 + arm64
console.log('  [PASS] Тест 4: Фильтрация по сборке из селекта вернула ровно 2 архитектуры (x64 и arm64)');

console.log('\n Все unit-тесты v1.2.0 успешно пройдены!');
