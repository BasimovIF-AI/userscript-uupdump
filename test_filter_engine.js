// test_filter_engine.js — Автоматические unit-тесты парсинга и фильтрации сборок UUP dump
const assert = require('assert');

// Модуль движка (в юзерскрипте встраивается автономно)
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

function detectVersion(title) {
    // 26H2, 24H2, 23H2, 22H2, 21H2, 1809, etc.
    const m = title.match(/\b(?:version\s+)?(2\d{1}H[12]|1\d{1}H[12]|1809|1909|1903|2004)\b/i);
    return m ? m[1].toUpperCase() : null;
}

function detectBranch(title) {
    // Ветка разработки обычно указывается в круглых скобках: (rs_prerelease), (rs_flight), (ge_release), (ni_release) и т.д.
    const m = title.match(/\(([a-z0-9_-]+(?:release|prerelease|flight|canary|dev|beta|preview)[a-z0-9_-]*)\)/i);
    if (m) return m[1].toLowerCase();

    // Альтернативный поиск по ключевым веткам
    const alt = title.match(/\b(rs_prerelease|rs_flight|ge_release|ni_release|co_release|fe_release|vb_release|mn_release)\b/i);
    return alt ? alt[1].toLowerCase() : null;
}

function detectType(title) {
    if (/Insider Preview/i.test(title)) return 'Insider Preview';
    if (/Cumulative Update/i.test(title)) return 'Cumulative Update';
    if (/Feature update/i.test(title)) return 'Feature Update';
    if (/Dynamic Update/i.test(title)) return 'Dynamic Update';
    if (/Security Update/i.test(title)) return 'Security Update';
    if (/Setup Duo/i.test(title)) return 'Setup Duo';
    return 'Standard Build';
}

function detectBuildNumber(title) {
    // Например: (26300.9807), 29695.1001, (10.0.26300.9711)
    const mFull = title.match(/\b10\.0\.(\d{5}(?:\.\d+)?)\b/);
    if (mFull) return mFull[1];

    const m = title.match(/\b(\d{5}(?:\.\d+)?)\b/);
    return m ? m[1] : '';
}

function parseBuildRecord({ title, arch, date, link }) {
    const normArch = normalizeArch(arch, title);
    const os = detectOS(title);
    const version = detectVersion(title);
    const branch = detectBranch(title);
    const updateType = detectType(title);
    const buildNumber = detectBuildNumber(title);
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

function buildFacets(items) {
    const facets = {
        arch: new Map(),
        os: new Map(),
        version: new Map(),
        branch: new Map(),
        updateType: new Map()
    };

    items.forEach(item => {
        if (item.arch) facets.arch.set(item.arch, (facets.arch.get(item.arch) || 0) + 1);
        if (item.os) facets.os.set(item.os, (facets.os.get(item.os) || 0) + 1);
        if (item.version) facets.version.set(item.version, (facets.version.get(item.version) || 0) + 1);
        if (item.branch) facets.branch.set(item.branch, (facets.branch.get(item.branch) || 0) + 1);
        if (item.updateType) facets.updateType.set(item.updateType, (facets.updateType.get(item.updateType) || 0) + 1);
    });

    return facets;
}

function filterItems(items, filters, searchQuery) {
    const queryTokens = (searchQuery || '')
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

    return items.filter(item => {
        if (filters.arch && filters.arch.size > 0 && !filters.arch.has(item.arch)) return false;
        if (filters.os && filters.os.size > 0 && !filters.os.has(item.os)) return false;
        if (filters.version && filters.version.size > 0 && (!item.version || !filters.version.has(item.version))) return false;
        if (filters.branch && filters.branch.size > 0 && (!item.branch || !filters.branch.has(item.branch))) return false;
        if (filters.updateType && filters.updateType.size > 0 && !filters.updateType.has(item.updateType)) return false;

        if (queryTokens.length > 0) {
            const hasAll = queryTokens.every(tok => item.searchableText.includes(tok));
            if (!hasAll) return false;
        }

        return true;
    });
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
        title: "Windows 11 Insider Preview 29695.1001 (rs_prerelease) amd64",
        link: "https://uupdump.net/selectlang.php?id=9775f6a3-8aa9-43c2-a875-e0fed7c1e81c",
        arch: "x64",
        date: "2026-10-23 17:00:18 UTC"
    },
    {
        title: "Windows Server Insider Preview 29683.1000 (rs_flight) amd64",
        link: "https://uupdump.net/selectlang.php?id=35cf7f29-b228-4f0e-aab6-80cb6dd66495",
        arch: "x64",
        date: "2026-10-12 17:00:05 UTC"
    },
    {
        title: "Feature update to Windows 10, version 22H2 (19045.5247) amd64",
        link: "https://uupdump.net/selectlang.php?id=a1b2c3d4-e5f6-47a8-b9c0-112233445566",
        arch: "x64",
        date: "2024-12-10 17:00:00 UTC"
    }
];

console.log('===> Запуск тестов парсера UUP dump...');
const parsed = sampleData.map(parseBuildRecord);

// Тест 1: Распознавание версий и сборок
assert.strictEqual(parsed[0].os, 'Windows 11');
assert.strictEqual(parsed[0].version, '26H2');
assert.strictEqual(parsed[0].buildNumber, '26300.9807');
assert.strictEqual(parsed[0].arch, 'x64');
assert.strictEqual(parsed[0].updateType, 'Standard Build');
console.log('  [PASS] Тест 1: Сборка Windows 11 26H2 успешно распарсена');

// Тест 2: Распознавание Cumulative Update и Cloud PC OS
assert.strictEqual(parsed[2].os, 'Windows CPC OS');
assert.strictEqual(parsed[2].updateType, 'Cumulative Update');
assert.strictEqual(parsed[2].buildNumber, '26300.9711');
console.log('  [PASS] Тест 2: Накопительное обновление CPC OS успешно распарсено');

// Тест 3: Распознавание Insider Preview и веток (rs_prerelease, rs_flight)
assert.strictEqual(parsed[3].os, 'Windows 11');
assert.strictEqual(parsed[3].updateType, 'Insider Preview');
assert.strictEqual(parsed[3].branch, 'rs_prerelease');
assert.strictEqual(parsed[4].os, 'Windows Server');
assert.strictEqual(parsed[4].branch, 'rs_flight');
console.log('  [PASS] Тест 3: Ветки разработки rs_prerelease и rs_flight успешно извлечены');

// Тест 4: Windows 10 22H2 Feature update
assert.strictEqual(parsed[5].os, 'Windows 10');
assert.strictEqual(parsed[5].version, '22H2');
assert.strictEqual(parsed[5].updateType, 'Feature Update');
assert.strictEqual(parsed[5].buildNumber, '19045.5247');
console.log('  [PASS] Тест 4: Windows 10 22H2 Feature update успешно извлечена');

// Тест 5: Построение динамических фасетов
const facets = buildFacets(parsed);
assert.strictEqual(facets.arch.get('x64'), 5);
assert.strictEqual(facets.arch.get('arm64'), 1);
assert.strictEqual(facets.os.get('Windows 11'), 3);
assert.strictEqual(facets.os.get('Windows Server'), 1);
assert.strictEqual(facets.branch.get('rs_prerelease'), 1);
assert.strictEqual(facets.version.get('26H2'), 2);
console.log('  [PASS] Тест 5: Динамические фасеты и счетчики корректно подсчитаны');

// Тест 6: Фильтрация по архитектуре arm64
const arm64Results = filterItems(parsed, { arch: new Set(['arm64']) }, '');
assert.strictEqual(arm64Results.length, 1);
assert.strictEqual(arm64Results[0].arch, 'arm64');
console.log('  [PASS] Тест 6: Фильтрация по arch: arm64 возвращает ровно 1 результат');

// Тест 7: Фильтрация по ветке (rs_prerelease) + поисковый запрос "29695"
const queryResults = filterItems(parsed, { branch: new Set(['rs_prerelease']) }, '29695');
assert.strictEqual(queryResults.length, 1);
assert.strictEqual(queryResults[0].buildNumber, '29695.1001');
console.log('  [PASS] Тест 7: Комбинированная фильтрация по ветке и номеру сборки работает корректно');

// Тест 8: Текстовый поиск по UUID
const uuidResults = filterItems(parsed, {}, '35cf7f29');
assert.strictEqual(uuidResults.length, 1);
assert.strictEqual(uuidResults[0].os, 'Windows Server');
console.log('  [PASS] Тест 8: Быстрый поиск по UUID работает корректно');

console.log('\n Все unit-тесты движка успешно пройдены!');
