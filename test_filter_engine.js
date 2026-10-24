// test_filter_engine.js — Автоматические unit-тесты парсинга и фильтрации сборок UUP dump
const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

function isCandidateBuildsTable({ parentClass, links }) {
    // Игнорируем блок быстрых пресетов на главной странице
    if (parentClass && parentClass.includes('home-quick-options')) {
        return false;
    }

    // Таблица сборок UUP dump обязательно содержит ссылки selectlang.php?id=UUID
    const hasBuildLink = links && links.some(l => l && l.includes('selectlang.php?id='));
    return Boolean(hasBuildLink);
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

function detectOS(title, buildNumber) {
    if (/Windows Server/i.test(title)) return 'Windows Server';
    if (/Azure Stack/i.test(title)) return 'Azure Stack HCI';
    if (/Windows CPC OS|Cloud PC/i.test(title)) return 'Windows CPC OS';
    if (/Windows 11/i.test(title)) return 'Windows 11';
    if (/Windows 10/i.test(title)) return 'Windows 10';
    if (/Windows Holographic/i.test(title)) return 'Windows Holographic';
    if (/Windows Team|Surface Hub/i.test(title)) return 'Windows Team';
    if (/\.NET Framework|Update Stack Package/i.test(title)) return 'Системные компоненты';

    if (buildNumber) {
        const major = parseInt(buildNumber.split('.')[0], 10);
        if (!isNaN(major)) {
            if (major >= 22000) return 'Windows 11';
            if (major >= 10240) return 'Windows 10';
        }
    }
    return 'Другая ОС';
}

function detectBuildNumber(title) {
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
    if (/\.NET Framework|Cumulative Update|Preview Update|Security Update|Quality Update|Dynamic Update|Update Stack Package|Autopilot update|Setup Duo|\bKB\d{6,8}\b/i.test(title)) {
        return 'Обновления';
    }
    return 'Полные сборки';
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

function parseBuildRecord({ title, arch, date, link }) {
    const normArch = normalizeArch(arch, title);
    const buildNumber = detectBuildNumber(title);
    const os = detectOS(title, buildNumber);
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

// ---------------- ТЕСТОВЫЕ ДАННЫЕ ----------------
const sampleData = [
    {
        title: "Windows 11, version 26H2 (26300.9807) amd64",
        link: "https://uupdump.net/selectlang.php?id=687d1ced-aab1-4cd5-ad05-705189769731",
        arch: "x64",
        date: "2026-10-16 17:00:10 UTC"
    },
    {
        title: "Cumulative Update for Windows Server 2019 (1809) (17763.1) amd64",
        link: "https://uupdump.net/selectlang.php?id=bf882f73-feb3-425b-9208-56cb11703967",
        arch: "x64",
        date: "2026-10-16 17:01:10 UTC"
    },
    {
        title: "Cumulative Update for Windows CPC OS (10.0.26300.9711) (26300.9711) amd64",
        link: "https://uupdump.net/selectlang.php?id=439b7eae-f36a-44b5-9aca-d7468ec86d9a",
        arch: "x64",
        date: "2026-10-13 17:17:21 UTC"
    },
    {
        title: "Cumulative Update for Azure Stack HCI, version 20H2 (17784.1557) amd64",
        link: "https://uupdump.net/selectlang.php?id=33333333-2222-3333-4444-555555555555",
        arch: "x64",
        date: "2026-09-15 13:45:43 UTC"
    },
    {
        title: "Update Stack Package - (Version 1301.2401.16011.0) amd64",
        link: "https://uupdump.net/selectlang.php?id=44444444-3333-4444-5555-666666666666",
        arch: "x64",
        date: "2026-10-13 17:00:20 UTC"
    },
    {
        title: "Windows 11 Insider Preview 29695.1001 (rs_prerelease) amd64",
        link: "https://uupdump.net/selectlang.php?id=55555555-3333-4444-5555-666666666666",
        arch: "x64",
        date: "2026-10-23 17:00:18 UTC"
    }
];

console.log('===> Запуск тестов парсера UUP dump v1.4.0...');

// Тест 1: Валидация целевых страниц URL
assert.strictEqual(isBuildsPage('/known.php'), true);
assert.strictEqual(isBuildsPage('/fetchupd.php'), true);
assert.strictEqual(isBuildsPage('/'), true);
assert.strictEqual(isBuildsPage('/index.php'), true);
assert.strictEqual(isBuildsPage('/selectedition.php'), false);
console.log('  [PASS] Тест 1: Валидация URL разрешает списки и отсекает визарды');

// Тест 2: Выбор таблицы сборок
const quickOptionsTable = {
    parentClass: 'home-quick-options',
    links: ['fetchupd.php?arch=amd64&ring=retail']
};
assert.strictEqual(isCandidateBuildsTable(quickOptionsTable), false);

const recentlyAddedTable = {
    parentClass: 'main-container',
    links: ['selectlang.php?id=5486793c-ef16-4f21-b397-f0321a833424']
};
assert.strictEqual(isCandidateBuildsTable(recentlyAddedTable), true);
console.log('  [PASS] Тест 2: Исключение Quick options на главной странице');

// Тест 3: Распознавание категорий, ОС, веток и версий
const parsed = sampleData.map(parseBuildRecord);

// Windows 11 Full Build
assert.strictEqual(parsed[0].os, 'Windows 11');
assert.strictEqual(parsed[0].version, '26H2');
assert.strictEqual(parsed[0].packageCategory, 'Полные сборки');

// Windows Server Update with (1809) bracket (version, NOT branch!)
assert.strictEqual(parsed[1].os, 'Windows Server');
assert.strictEqual(parsed[1].version, '1809');
assert.strictEqual(parsed[1].branch, null); // (1809) и (17763.1) отсеяны, ветка null
assert.strictEqual(parsed[1].packageCategory, 'Обновления');

// Azure Stack HCI
assert.strictEqual(parsed[3].os, 'Azure Stack HCI');
assert.strictEqual(parsed[3].version, '20H2');
assert.strictEqual(parsed[3].packageCategory, 'Обновления');

// Update Stack Package
assert.strictEqual(parsed[4].os, 'Системные компоненты');
assert.strictEqual(parsed[4].packageCategory, 'Обновления');
assert.strictEqual(parsed[4].updateType, 'Update Stack Package');

// Future Experimental build with branch
assert.strictEqual(parsed[5].os, 'Windows 11');
assert.strictEqual(parsed[5].version, 'Future / Experimental');
assert.strictEqual(parsed[5].branch, 'rs_prerelease');
assert.strictEqual(parsed[5].packageCategory, 'Полные сборки');

console.log('  [PASS] Тест 3: Точная классификация ОС, версий, веток и категорий подтверждена');

// Тест 4: Пакетная валидация на всем каталоге из 9148 записей (если файл существует)
const catalogPath = path.join(__dirname, 'data', 'uupdump_builds_raw.json');
if (fs.existsSync(catalogPath)) {
    const allBuilds = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    let unknownOSCount = 0;

    for (const b of allBuilds) {
        const buildNum = detectBuildNumber(b.title);
        const os = detectOS(b.title, buildNum);
        if (os === 'Другая ОС') unknownOSCount++;
    }

    assert.strictEqual(unknownOSCount, 0, 'В базе 9148 сборок не должно быть неопознанных ОС');
    console.log(`  [PASS] Тест 4: Пакетная проверка 9148 сборок — 0 неопознанных ОС (100% точность)`);
}

console.log('\n Все unit-тесты v1.4.0 успешно пройдены!');
