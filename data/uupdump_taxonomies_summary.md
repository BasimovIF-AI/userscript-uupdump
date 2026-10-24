# Каталог и анализ таксономий UUP dump

> **Дата сканирования:** 2026-10-24T18:37:41.972Z
> **Всего сборок в реестре:** **9148**

## 1. Распределение по семействам ОС

| Семейство ОС | Количество | Доля |
| :--- | :--- | :--- |
| **Windows 10** | 4560 | 49.8% |
| **Windows 11** | 3107 | 34.0% |
| **Windows Server** | 1155 | 12.6% |
| **Azure Stack HCI** | 143 | 1.6% |
| **System Components / Updates** | 132 | 1.4% |
| **Windows CPC OS** | 51 | 0.6% |

## 2. Распределение по категориям (Полные сборки vs Обновления)

| Категория | Количество | Доля | Назначение |
| :--- | :--- | :--- | :--- |
| **Полные сборки** (Full Builds / ISO) | 5576 | 61.0% | Установочные образы для создания полноценного ISO Windows |
| **Обновления** (Updates / Patches) | 3572 | 39.0% | Накопительные обновления, .NET, патчи безопасности |

## 3. Распределение по типам пакетов (Package Types)

| Тип пакета | Категория | Количество | Доля |
| :--- | :--- | :--- | :--- |
| **Cumulative Update** | Обновления | 3072 | 33.6% |
| **Feature Update** | Полные сборки | 2403 | 26.3% |
| **Insider Preview** | Полные сборки | 1888 | 20.6% |
| **Standard Build** | Полные сборки | 1285 | 14.0% |
| **.NET Framework Update** | Обновления | 180 | 2.0% |
| **Update Stack Package** | Обновления | 174 | 1.9% |
| **Preview Update** | Обновления | 56 | 0.6% |
| **Security Update** | Обновления | 38 | 0.4% |
| **Quality Update** | Обновления | 30 | 0.3% |
| **Autopilot Update** | Обновления | 22 | 0.2% |

## 4. Распределение по архитектурам

| Архитектура | Количество | Доля |
| :--- | :--- | :--- |
| **x64** | 4253 | 46.5% |
| **arm64** | 3368 | 36.8% |
| **x86** | 1527 | 16.7% |

## 5. Топ версий и релизов (Versions / Releases)

| Версия / Релиз | Количество | Доля |
| :--- | :--- | :--- |
| **22H2** | 1103 | 12.1% |
| **24H2** | 915 | 10.0% |
| **21H2** | 842 | 9.2% |
| **1809** | 733 | 8.0% |
| **20H2** | 607 | 6.6% |
| **2004** | 496 | 5.4% |
| **1903** | 459 | 5.0% |
| **1909** | 409 | 4.5% |
| **23H2** | 365 | 4.0% |
| **21H1** | 325 | 3.6% |
| **Insider (Canary/Dev)** | 299 | 3.3% |
| **1803** | 284 | 3.1% |
| **Future / Experimental** | 280 | 3.1% |
| **Insider (Manganese/Iron)** | 212 | 2.3% |
| **1709** | 212 | 2.3% |
| **Generic / Standalone** | 161 | 1.8% |
| **25H2** | 158 | 1.7% |
| **Insider (Beta 23H2)** | 141 | 1.5% |
| **26H2** | 105 | 1.1% |
| **Insider (Dev)** | 80 | 0.9% |
| **1703** | 71 | 0.8% |
| **26H1** | 37 | 0.4% |
| **Build 22623** | 30 | 0.3% |
| **Build 19100** | 30 | 0.3% |
| **Build 19013** | 27 | 0.3% |

## 6. Ветки разработки (Branches / Rings)

| Ветка разработки | Количество | Пример сборки |
| :--- | :--- | :--- |
| `none` | 7261 | - |
| `rs_prerelease` | 651 | `Windows 11 Insider Preview 29695.1001 (rs_prerelease) a...` |
| `ni_release` | 384 | `Windows 11 Insider Preview 10.0.22635.5305 (ni_release)...` |
| `ge_release_upr` | 149 | `Feature update for Windows Insider Preview 10.0.26220.7...` |
| `ni_prerelease` | 76 | `Windows 11 Insider Preview 23620.1000 (ni_prerelease) a...` |
| `vb_release` | 75 | `Windows 10 Insider Preview 19041.1 (vb_release) arm64...` |
| `rs2_release_svc_d_shub` | 69 | `Windows 10 Insider Preview 15063.358 (rs2_release_svc_d...` |
| `rs5_release` | 62 | `Windows 10 Insider Preview 17763.1 (rs5_release) amd64...` |
| `19h1_release` | 57 | `Windows 10 Insider Preview 10.0.18327.7 (19h1_release) ...` |
| `co_release` | 56 | `Windows 11 Insider Preview 10.0.22000.9 (co_release) am...` |
| `vb_release_svc_team_flight` | 53 | `Windows 10 Insider Preview 19101.1153 (vb_release_svc_t...` |
| `ge_prerelease` | 50 | `Windows Server Insider Preview 26404.5000 (ge_prereleas...` |
| `ge_release` | 42 | `Windows 11 Insider Preview 10.0.26120.961 (ge_release) ...` |
| `rs4_release` | 29 | `Windows 10 Insider Preview 17134.1 (rs4_release) amd64...` |
| `br_release` | 26 | `Windows 11 Insider Preview 28000.1 (br_release) amd64...` |
| `fe_release` | 24 | `Windows 10 Insider Preview 20279.1 (fe_release) arm64...` |
| `ge_prereleaseserver` | 18 | `Windows Server Insider Preview 26534.1000 (ge_prereleas...` |
| `zn_release` | 18 | `Windows 11 Insider Preview 25393.1 (zn_release) arm64...` |
| `mn_release` | 15 | `Windows 10 Insider Preview 19645.1 (mn_release) amd64...` |
| `ge_release_svc_betaflt_upr` | 14 | `Windows 11 Insider Preview 10.0.26120.1912 (ge_release_...` |
| `rs_flight` | 5 | `Windows Server Insider Preview 29683.1000 (rs_flight) a...` |
| `rs3_release` | 5 | `Windows 10 Insider Preview 16299.15 (rs3_release) amd64...` |
| `19H1_RELEASE` | 3 | `Windows 10 Insider Preview 10.0.18362.1 (19H1_RELEASE) ...` |
| `RS_PRERELEASE_FLT` | 3 | `Windows 10 Insider Preview 10.0.17692.1004 (RS_PRERELEA...` |
| `rs2_release` | 2 | `Windows 10 Insider Preview 15063 (rs2_release) amd64...` |
| `ge_release_flt_upr` | 1 | `Feature update for Windows Insider Preview 10.0.26220.8...` |
