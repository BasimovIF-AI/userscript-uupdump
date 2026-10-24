/**
 * tools/scan_known_builds.js
 * Автоматический сканер всех страниц known.php сайта uupdump.net
 * Собирает полный каталог сборок, сохраняет инкрементальный кэш
 * и формирует детальный аналитический отчёт по всем таксономиям.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://uupdump.net/known.php';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const CACHE_DIR = path.join(DATA_DIR, '.cache_pages');
const RAW_OUTPUT_PATH = path.join(DATA_DIR, 'uupdump_builds_raw.json');
const SUMMARY_OUTPUT_PATH = path.join(DATA_DIR, 'uupdump_taxonomies_summary.md');

// Создание необходимых директорий
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 12000);

            const res = await fetch(url, {
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8'
                },
                signal: controller.signal
            });

            clearTimeout(timer);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText}`);
            }

            const html = await res.text();
            return html;
        } catch (err) {
            console.warn(`  [Попытка ${attempt}/${maxRetries}] Ошибка загрузки ${url}: ${err.message}`);
            if (attempt === maxRetries) throw err;
            await sleep(1000 * attempt);
        }
    }
}

function parsePageBuilds(html, pageNum) {
    const builds = [];
    // Извлекаем все строки таблицы
    const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

    for (const row of rowMatches) {
        // Проверяем наличие ссылки на selectlang.php?id=UUID
        const uuidMatch = row.match(/selectlang\.php\?id=([a-f0-9-]{36})/i);
        if (!uuidMatch) continue;

        const uuid = uuidMatch[1];

        // Извлекаем заголовок из тега <a>
        const aMatch = row.match(/<a[^>]*selectlang\.php\?id=[^>]*>([\s\S]*?)<\/a>/i);
        const rawTitle = aMatch ? aMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        // Извлекаем ячейки <td>
        const tdMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
        const rawArch = tdMatches[1] ? tdMatches[1].replace(/<[^>]+>/g, '').trim() : '';
        const rawDate = tdMatches[2] ? tdMatches[2].replace(/<[^>]+>/g, '').trim() : '';

        builds.push({
            uuid,
            title: rawTitle,
            arch: rawArch,
            date: rawDate,
            page: pageNum
        });
    }

    return builds;
}

function detectMaxPages(html) {
    let max = 1;
    const pageMatches = html.matchAll(/known\.php\?p=(\d+)/gi);
    for (const m of pageMatches) {
        const p = parseInt(m[1], 10);
        if (p > max) max = p;
    }
    return max;
}

// Извлечение таксономий и классификаторов
function analyzeDataset(builds) {
    const osMap = new Map();
    const branchMap = new Map();
    const archMap = new Map();
    const typeMap = new Map();
    const versionMap = new Map();
    const buildMajorMap = new Map();

    const updateTypePatterns = [
        { type: '.NET Framework Update', regex: /\.NET Framework/i, isUpdate: true },
        { type: 'Cumulative Update', regex: /Cumulative Update/i, isUpdate: true },
        { type: 'Preview Update', regex: /Preview Update/i, isUpdate: true },
        { type: 'Security Update', regex: /Security Update/i, isUpdate: true },
        { type: 'Quality Update', regex: /Quality Update/i, isUpdate: true },
        { type: 'Dynamic Update', regex: /Dynamic Update/i, isUpdate: true },
        { type: 'Update Stack Package', regex: /Update Stack Package/i, isUpdate: true },
        { type: 'Autopilot Update', regex: /Autopilot update/i, isUpdate: true },
        { type: 'Setup Duo', regex: /Setup Duo/i, isUpdate: true },
        { type: 'Feature Update', regex: /Feature update/i, isUpdate: false },
        { type: 'Insider Preview', regex: /Insider Preview/i, isUpdate: false },
        { type: 'Standard Build', regex: /.*/, isUpdate: false }
    ];

    for (const b of builds) {
        const title = b.title;

        // Архитектура
        archMap.set(b.arch, (archMap.get(b.arch) || 0) + 1);

        // Номер сборки
        const buildNumMatch = title.match(/\b(?:10\.0\.)?(\d{5})(?:\.\d+)?\b/);
        const majorNum = buildNumMatch ? parseInt(buildNumMatch[1], 10) : 0;
        if (majorNum > 0) {
            buildMajorMap.set(String(majorNum), (buildMajorMap.get(String(majorNum)) || 0) + 1);
        }

        // Семейство ОС (с 100% детекцией и fallback по buildNum)
        let os = 'Unknown OS';
        if (/Windows 11/i.test(title)) os = 'Windows 11';
        else if (/Windows 10/i.test(title)) os = 'Windows 10';
        else if (/Server/i.test(title)) os = 'Windows Server';
        else if (/Azure Stack/i.test(title)) os = 'Azure Stack HCI';
        else if (/CPC|Cloud PC/i.test(title)) os = 'Windows CPC OS';
        else if (/Holographic/i.test(title)) os = 'Windows Holographic';
        else if (/Team|Surface Hub/i.test(title)) os = 'Windows Team';
        else if (majorNum >= 22000) os = 'Windows 11';
        else if (majorNum >= 10240) os = 'Windows 10';
        else if (/\.NET Framework|Update Stack/i.test(title)) os = 'System Components / Updates';
        osMap.set(os, (osMap.get(os) || 0) + 1);

        // Извлечение ветки разработки (только реальные ветки, исключая номера версий и сборок)
        const bracketMatches = Array.from(title.matchAll(/\(([a-zA-Z0-9_\-\.]+)\)/g)).map(m => m[1]);
        let foundBranch = 'none';
        for (const m of bracketMatches) {
            if (/^(rs_|ge_|ni_|co_|fe_|zn_|br_|mn_|vb_|19h1_|th|canary|beta|dev|main|release|preview)/i.test(m) || 
                m.endsWith('_release') || m.endsWith('_prerelease') || m.includes('_flight') || m.includes('_svc')) {
                foundBranch = m;
                break;
            }
        }
        branchMap.set(foundBranch, (branchMap.get(foundBranch) || 0) + 1);

        // Тип обновления
        let detectedType = 'Standard Build';
        for (const item of updateTypePatterns) {
            if (item.regex.test(title)) {
                detectedType = item.type;
                break;
            }
        }
        typeMap.set(detectedType, (typeMap.get(detectedType) || 0) + 1);

        // Версия / Релиз
        let ver = null;
        const directVerMatch = title.match(/\b(2[0-6]H[12]|2004|1909|1903|1809|1803|1709|1703|1607|1511|1507)\b/i);
        if (directVerMatch) {
            ver = directVerMatch[1].toUpperCase();
        } else if (majorNum > 0) {
            if (majorNum >= 28000) ver = 'Future / Experimental';
            else if (majorNum >= 26300 && majorNum < 26400) ver = '26H2';
            else if (majorNum >= 26100 && majorNum < 26300) ver = '24H2';
            else if (majorNum >= 25000 && majorNum < 26100) ver = 'Insider (Canary/Dev)';
            else if (majorNum >= 23400 && majorNum < 25000) ver = 'Insider (Dev)';
            else if (majorNum === 22635) ver = 'Insider (Beta 23H2)';
            else if (majorNum === 22631) ver = '23H2';
            else if (majorNum === 22621) ver = '22H2';
            else if (majorNum === 22000) ver = '21H2';
            else if (majorNum === 20348) ver = 'Server 2022';
            else if (majorNum === 19045) ver = '22H2';
            else if (majorNum === 19044) ver = '21H2';
            else if (majorNum === 19043) ver = '21H1';
            else if (majorNum === 19042) ver = '20H2';
            else if (majorNum === 19041) ver = '2004';
            else if (majorNum >= 19500 && majorNum < 20300) ver = 'Insider (Manganese/Iron)';
            else if (majorNum === 18363) ver = '1909';
            else if (majorNum === 18362) ver = '1903';
            else if (majorNum === 17763) ver = '1809';
            else if (majorNum === 17134) ver = '1803';
            else if (majorNum === 16299) ver = '1709';
            else if (majorNum === 15063) ver = '1703';
            else if (majorNum === 14393) ver = '1607';
            else if (majorNum === 10586) ver = '1511';
            else if (majorNum === 10240) ver = '1507';
            else ver = 'Build ' + majorNum;
        } else {
            ver = 'Generic / Standalone';
        }
        versionMap.set(ver, (versionMap.get(ver) || 0) + 1);
    }

    return {
        total: builds.length,
        osMap,
        branchMap,
        archMap,
        typeMap,
        versionMap,
        buildMajorMap
    };
}

function generateMarkdownSummary(analysis, builds) {
    const sorted = (map) => Array.from(map.entries()).sort((a, b) => b[1] - a[1]);

    let md = `# Каталог и анализ таксономий UUP dump\n\n`;
    md += `> **Дата сканирования:** ${new Date().toISOString()}\n`;
    md += `> **Всего сборок в реестре:** **${analysis.total}**\n\n`;

    md += `## 1. Распределение по семействам ОС\n\n`;
    md += `| Семейство ОС | Количество | Доля |\n`;
    md += `| :--- | :--- | :--- |\n`;
    for (const [os, count] of sorted(analysis.osMap)) {
        const pct = ((count / analysis.total) * 100).toFixed(1);
        md += `| **${os}** | ${count} | ${pct}% |\n`;
    }

    md += `\n## 2. Распределение по категориям (Полные сборки vs Обновления)\n\n`;
    let updatesTotal = 0;
    let fullTotal = 0;
    for (const [type, count] of analysis.typeMap.entries()) {
        const isUpdate = (type !== 'Standard Build' && type !== 'Insider Preview' && type !== 'Feature Update');
        if (isUpdate) updatesTotal += count;
        else fullTotal += count;
    }
    md += `| Категория | Количество | Доля | Назначение |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    md += `| **Полные сборки** (Full Builds / ISO) | ${fullTotal} | ${((fullTotal / analysis.total) * 100).toFixed(1)}% | Установочные образы для создания полноценного ISO Windows |\n`;
    md += `| **Обновления** (Updates / Patches) | ${updatesTotal} | ${((updatesTotal / analysis.total) * 100).toFixed(1)}% | Накопительные обновления, .NET, патчи безопасности |\n`;

    md += `\n## 3. Распределение по типам пакетов (Package Types)\n\n`;
    md += `| Тип пакета | Категория | Количество | Доля |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    for (const [type, count] of sorted(analysis.typeMap)) {
        const pct = ((count / analysis.total) * 100).toFixed(1);
        const category = (type === 'Standard Build' || type === 'Insider Preview' || type === 'Feature Update') ? 'Полные сборки' : 'Обновления';
        md += `| **${type}** | ${category} | ${count} | ${pct}% |\n`;
    }

    md += `\n## 4. Распределение по архитектурам\n\n`;
    md += `| Архитектура | Количество | Доля |\n`;
    md += `| :--- | :--- | :--- |\n`;
    for (const [arch, count] of sorted(analysis.archMap)) {
        const pct = ((count / analysis.total) * 100).toFixed(1);
        md += `| **${arch}** | ${count} | ${pct}% |\n`;
    }

    md += `\n## 5. Топ версий и релизов (Versions / Releases)\n\n`;
    md += `| Версия / Релиз | Количество | Доля |\n`;
    md += `| :--- | :--- | :--- |\n`;
    for (const [ver, count] of sorted(analysis.versionMap).slice(0, 25)) {
        const pct = ((count / analysis.total) * 100).toFixed(1);
        md += `| **${ver}** | ${count} | ${pct}% |\n`;
    }

    md += `\n## 6. Ветки разработки (Branches / Rings)\n\n`;
    md += `| Ветка разработки | Количество | Пример сборки |\n`;
    md += `| :--- | :--- | :--- |\n`;
    const sortedBranches = sorted(analysis.branchMap);
    for (const [branch, count] of sortedBranches) {
        if (branch === 'none' && count === 0) continue;
        const example = builds.find(b => b.title.includes(`(${branch})`));
        const sampleText = example ? `\`${example.title.slice(0, 55)}...\`` : '-';
        md += `| \`${branch}\` | ${count} | ${sampleText} |\n`;
    }

    return md;
}

async function run() {
    console.log('===> [1/4] Инициализация сканера UUP dump (known.php)...');
    
    // Шаг 1: Загрузка первой страницы и определение общего количества страниц
    console.log(`Запрос страницы 1: ${BASE_URL}...`);
    const page1Html = await fetchWithRetry(`${BASE_URL}?p=1`);
    const maxPages = detectMaxPages(page1Html);
    console.log(`✅ Всего обнаружено страниц пагинации: ${maxPages}`);

    const allBuilds = [];
    const page1Builds = parsePageBuilds(page1Html, 1);
    fs.writeFileSync(path.join(CACHE_DIR, `page_001.json`), JSON.stringify(page1Builds, null, 2), 'utf8');
    allBuilds.push(...page1Builds);
    console.log(`[Страница 001/${maxPages}] Получено ${page1Builds.length} сборок (Всего: ${allBuilds.length})`);

    // Шаг 2: Обход остальных страниц с кэшированием
    console.log('\n===> [2/4] Загрузка страниц с инкрементальным кэшем...');
    const CONCURRENCY = 3;
    const DELAY_MS = 150;

    const pagesToFetch = [];
    for (let p = 2; p <= maxPages; p++) {
        pagesToFetch.push(p);
    }

    // Обработка пачками по CONCURRENCY
    for (let i = 0; i < pagesToFetch.length; i += CONCURRENCY) {
        const batch = pagesToFetch.slice(i, i + CONCURRENCY);
        
        await Promise.all(batch.map(async (pageNum) => {
            const cacheFile = path.join(CACHE_DIR, `page_${String(pageNum).padStart(3, '0')}.json`);
            
            if (fs.existsSync(cacheFile)) {
                try {
                    const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
                    allBuilds.push(...cachedData);
                    console.log(`[Страница ${String(pageNum).padStart(3, '0')}/${maxPages}] [КЭШ] ${cachedData.length} сборок`);
                    return;
                } catch (e) {
                    // Если файл поврежден, перезакачиваем
                }
            }

            const url = `${BASE_URL}?p=${pageNum}`;
            const html = await fetchWithRetry(url);
            const builds = parsePageBuilds(html, pageNum);
            
            fs.writeFileSync(cacheFile, JSON.stringify(builds, null, 2), 'utf8');
            allBuilds.push(...builds);
            console.log(`[Страница ${String(pageNum).padStart(3, '0')}/${maxPages}] [СЕТЬ] Получено ${builds.length} сборок (Всего: ${allBuilds.length})`);
        }));

        if (i + CONCURRENCY < pagesToFetch.length) {
            await sleep(DELAY_MS);
        }
    }

    console.log(`\n✅ Успешно собрано всех сборок: ${allBuilds.length}`);

    // Шаг 3: Сохранение общего сырого датасета
    console.log('\n===> [3/4] Сохранение полного JSON каталога...');
    // Сортировка по дате (свежие сверху)
    allBuilds.sort((a, b) => new Date(b.date) - new Date(a.date));
    fs.writeFileSync(RAW_OUTPUT_PATH, JSON.stringify(allBuilds, null, 2), 'utf8');
    console.log(`✅ Каталог сохранен: ${RAW_OUTPUT_PATH} (${(fs.statSync(RAW_OUTPUT_PATH).size / (1024 * 1024)).toFixed(2)} MB)`);

    // Шаг 4: Анализ таксономий и формирование отчёта
    console.log('\n===> [4/4] Анализ таксономий и генерация сводного отчёта...');
    const analysis = analyzeDataset(allBuilds);
    const summaryMd = generateMarkdownSummary(analysis, allBuilds);
    fs.writeFileSync(SUMMARY_OUTPUT_PATH, summaryMd, 'utf8');
    console.log(`✅ Сводный отчёт сохранен: ${SUMMARY_OUTPUT_PATH}`);

    console.log('\n=============================================');
    console.log('ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`- Всего сборок: ${analysis.total}`);
    console.log(`- Архитектуры: ${Array.from(analysis.archMap.keys()).join(', ')}`);
    console.log(`- Семейства ОС: ${Array.from(analysis.osMap.keys()).join(', ')}`);
    console.log(`- Уникальных веток: ${analysis.branchMap.size}`);
    console.log(`- Типов обновлений: ${analysis.typeMap.size}`);
    console.log('=============================================');
}

run().catch(err => {
    console.error('Критическая ошибка:', err);
    process.exit(1);
});
