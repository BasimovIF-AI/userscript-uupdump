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
    // 10.0.26300.9711 или 26300.10008
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

    // Если в заголовке нет явного указания (например, у .NET Framework или Cumulative Update), выводим по сборке
    return inferVersionFromBuild(buildNumber);
}

function detectBranch(title) {
    const m = title.match(/\(([a-z0-9_-]+(?:release|prerelease|flight|canary|dev|beta|preview)[a-z0-9_-]*)\)/i);
    if (m) return m[1].toLowerCase();

    const alt = title.match(/\b(rs_prerelease|rs_flight|ge_release|ni_release|co_release|fe_release|vb_release|mn_release)\b/i);
    return alt ? alt[1].toLowerCase() : null;
}

function detectType(title) {
    // Приоритетная классификация .NET Framework
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

function buildFacets(items) {
    const facets = {
        arch: new Map(),
        os: new Map(),
        version: new Map(),
        branch: new Map(),
        updateType: new Map(),
        buildNumber: new Map()
    };

    items.forEach(item => {
        if (item.arch) facets.arch.set(item.arch, (facets.arch.get(item.arch) || 0) + 1);
        if (item.os) facets.os.set(item.os, (facets.os.get(item.os) || 0) + 1);
        if (item.version) facets.version.set(item.version, (facets.version.get(item.version) || 0) + 1);
        if (item.branch) facets.branch.set(item.branch, (facets.branch.get(item.branch) || 0) + 1);
        if (item.updateType) facets.updateType.set(item.updateType, (facets.updateType.get(item.updateType) || 0) + 1);
        if (item.buildNumber) facets.buildNumber.set(item.buildNumber, (facets.buildNumber.get(item.buildNumber) || 0) + 1);
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
        if (filters.buildNumber && filters.buildNumber.size > 0 && (!item.buildNumber || !filters.buildNumber.has(item.buildNumber))) return false;

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
    },
    {
        title: ".NET Framework Preview Update for Windows 11 - KB5125105 (26300.10003) amd64",
        link: "https://uupdump.net/selectlang.php?id=33333333-4444-5555-6666-777777777777",
        arch: "x64",
        date: "2026-09-10 18:56:00 UTC"
    },
    {
        title: "Windows Server Insider Preview 29683.1000 (rs_flight) amd64",
        link: "https://uupdump.net/selectlang.php?id=35cf7f29-b228-4f0e-aab6-80cb6dd66495",
        arch: "x64",
        date: "2026-10-12 17:00:05 UTC"
    }
];

console.log('===> Запуск тестов парсера UUP dump v1.1.0...');
const parsed = sampleData.map(parseBuildRecord);

// Тест 1: Классификация .NET Framework
assert.strictEqual(parsed[3].updateType, '.NET Framework Update');
assert.strictEqual(parsed[4].updateType, '.NET Framework Update');
console.log('  [PASS] Тест 1: .NET Framework Security и Preview успешно определены как .NET Framework Update');

// Тест 2: Извлечение номеров сборок (Build Number)
assert.strictEqual(parsed[0].buildNumber, '26300.9807');
assert.strictEqual(parsed[1].buildNumber, '26300.9711');
assert.strictEqual(parsed[2].buildNumber, '26300.9278');
assert.strictEqual(parsed[3].buildNumber, '26300.10008');
assert.strictEqual(parsed[4].buildNumber, '26300.10003');
console.log('  [PASS] Тест 2: Номера сборок (Build Number / Revision) успешно извлечены');

// Тест 3: Интеллектуальное определение версии 26H2 для всех элементов сборки 26300
assert.strictEqual(parsed[0].version, '26H2');
assert.strictEqual(parsed[1].version, '26H2'); // CPC OS
assert.strictEqual(parsed[2].version, '26H2'); // Preview Update
assert.strictEqual(parsed[3].version, '26H2'); // .NET Framework
assert.strictEqual(parsed[4].version, '26H2'); // .NET Framework Preview
console.log('  [PASS] Тест 3: Интеллектуальное определение версии 26H2 по сборке 26300 сработало для всех 5 элементов');

// Тест 4: Проверка фасетов сборок
const facets = buildFacets(parsed);
assert.strictEqual(facets.buildNumber.get('26300.9807'), 1);
assert.strictEqual(facets.buildNumber.get('26300.10008'), 1);
assert.strictEqual(facets.updateType.get('.NET Framework Update'), 2);
console.log('  [PASS] Тест 4: Фасетная карта сборок и типов содержит корректные счетчики');

// Тест 5: Фильтрация по конкретной сборке 26300.9278
const buildFiltered = filterItems(parsed, { buildNumber: new Set(['26300.9278']) }, '');
assert.strictEqual(buildFiltered.length, 1);
assert.strictEqual(buildFiltered[0].title, 'Preview Update for Windows 11 (26300.9278) amd64');
console.log('  [PASS] Тест 5: Фильтрация по buildNumber: 26300.9278 возвращает точное совпадение');

// Тест 6: Фильтрация по типу .NET Framework Update
const frameworkFiltered = filterItems(parsed, { updateType: new Set(['.NET Framework Update']) }, '');
assert.strictEqual(frameworkFiltered.length, 2);
console.log('  [PASS] Тест 6: Фильтрация по .NET Framework Update отделила оба обновления фреймворка');

console.log('\n Все unit-тесты v1.1.0 успешно пройдены!');
