# B. MWR Archive (mwrarchive.com) — разведка числовых данных

Дата съёма: 2026-08-14. Метод: Chrome, собственная вкладка, только чтение публичных страниц
и тех data-эндпоинтов, которые сайт сам запрашивает при открытии. Игру не трогали,
ассеты/анимации не качали, аккаунт не создавали.

---

## 0. ЧТО ЭТО ЗА САЙТ ТЕХНИЧЕСКИ

`https://mwrarchive.com/` — НЕ SPA на React. Это **статический Astro-сайт** с классическими
`.html`-страницами и данными в **Firebase Firestore** (проект `legion-mwr-archive`).

Маршруты (из `<a href>` на главной, URL: `https://mwrarchive.com/`):
`/index.html`, `/tierlist.html`, `/info.html`, `/formation.html`, `/battles.html`,
`/calculator.html`, `/animations.html`, `/banners.html`, `/patchnotes.html`,
`/early-game-guide.html`, `/login.html`, `/support.html`, `/legal.html`.
(при заходе сервер редиректит на без-расширения вариант: `/tierlist`, `/calculator` и т.д.)

Источники данных, которые сайт реально дёргает:

| Эндпоинт | Тип | Что внутри | Доступ |
|---|---|---|---|
| `https://mwrarchive.com/catalog-en.json` | статический JSON | 283 героя, полные описания навыков/сакраментов/пробуждений | публичный |
| `https://mwrarchive.com/catalog-<locale>.json` | статический JSON | то же для ar/de/es/fr/ja/th/zh-tw | публичный |
| `https://mwrarchive.com/assets/patch-notes.json` | статический JSON | 33 патча с балансными правками | публичный |
| `https://mwrarchive.com/api/banners/active` | JSON API | активные баннеры | публичный |
| Firestore `cache/*` (проект `legion-mwr-archive`) | Firestore | тир-листы, AOE-шаблоны, гайды, ченджлог | публичный (read) |
| Firestore `info_posts/*` | Firestore | гайды сообщества (престиж, VIP) | публичный (read) |
| `https://mwrarchive.com/api/battles/run-stream` | SSE API | **сам симулятор боя** | **401, нужен вход** |
| Firestore `comments`, `heroComments` | Firestore | комментарии | permission-denied |

Полный список документов в Firestore-коллекции `cache` (снято через firebase SDK
на странице `https://mwrarchive.com/tierlist`):
`aoe_payload`, `info_index`, `info_meta`, `info_payload`, `logs_payload`,
`tierlist_meta`, `tierlist_meta_{ar,de,es,fr,ja,th,zh-tw}`,
`tierlist_payload` (578 597 симв.), `tierlist_payload_{ar,de,es,fr,ja,th,zh-tw}` (~200 601 симв. каждый),
`tierlist_slim`.

Логика загрузки героев (файл `https://mwrarchive.com/shared/hero-payload.js`,
объект `window.MWR_HEROES`):
`catalog-<locale>.json` (описания) + Firestore `cache/tierlist_slim` (оценки) → merge → localStorage
(`mwr_tierlist_data_v9`). То есть **описания статичны, оценки живые**.

**ВАЖНОЕ ПРЕДУПРЕЖДЕНИЕ.** Тексты в Firestore-документе `cache/tierlist_payload`
**помечены водяными знаками**: в слова вставлены кириллические гомоглифы (`е`, `а`, `о`, `с`, `р`)
и нулевой ширины символы (U+200B/U+200C/U+00AD). Пример сырой строки: `Hеro H​P +6%`.
Файл `catalog-en.json` от этого чист. Это анти-скрейпинг-канарейка — если копировать оттуда
текст в свой проект, он будет опознаваем. Все тексты ниже нормализованы.

---

## 1. TIER LIST — СТРУКТУРА И ПРИВЯЗКА К СТАДИИ ПРОГРЕССИИ

URL: `https://mwrarchive.com/tierlist`

### Да, тир ЖЁСТКО привязан к стадии прогрессии. Это ровно «ранняя игра vs эндгейм».

Дословные описания режимов (сняты со страницы, переключатель `#mode-standard` / `#mode-ultimate`):

**Standard:**
> «Ranking heroes based on 6*, sacrament 5, and no awakening. Focused on individual hero
> performance, with consideration for ease of use and viability for most players.
> Focused on low to medium spenders. Use this list to decide your next pull or investment.»

**Ultimate:**
> «Ranking heroes based on maxed everything. Focused on overall battle impact.
> Focused on endgame, hyper maxed players. This is the endgame meta tierlist,
> not recommended to follow for most players.»

То есть **Standard = 6 звёзд + сакрамент 5 + БЕЗ пробуждения**, малые/средние донатеры.
**Ultimate = всё в максимуме** (включая пробуждение), эндгейм.

### Шкала тиров (с ярлыками со страницы)

`SSS` BEST OF THE BEST · `SS` META-DEFINING · `S` STRONG · `A` SOLID · `B` NICHE ·
`C` COLLECTION · `D` WEAK · `F` USELESS · `Unranked`.
Внутри тира есть модификаторы `-` / `+` (SS-, SS, SS+, S-, S, S+, …).

### Распределение оценок (283 героя, источник: merge `catalog-en.json` + `cache/tierlist_slim`)

| Тир | Standard | Ultimate |
|---|---|---|
| SSS | 2 | 2 |
| SS+ | 2 | 1 |
| SS | 3 | 3 |
| SS- | 2 | 5 |
| S+ | 20 | 26 |
| S | 27 | 20 |
| S- | 23 | 22 |
| A+ | 23 | 21 |
| A | 20 | 10 |
| A- | 20 | 2 |
| B+ | 20 | 0 |
| B | 26 | 1 |
| B- | 22 | 0 |
| C | 23 | 0 |
| D | 11 | 0 |
| F | 12 | 0 |
| Unranked / пусто | 27 | 170 |

Ultimate заполнен только для ~113 героев — остальные не оценены (эндгейм-лист узкий).

### Верхушка списков (со страницы)

* **Standard SSS:** Athena, Kratos.
  **SS (7):** Poseidon, Shennong, Lucifer, Talyan Saint Radiance, Venus, Ares, Tamamo-no-Mae.
* **Ultimate SSS:** Athena, Kratos.
  **SS (9):** Shennong, Lucifer, Talyan Saint Radiance, Venus, Bai Ze, Cui Ben, Hou Yi,
  Michael, The Phoenix.

Показательные сдвиги Standard→Ultimate: Poseidon и Ares выпадают из SS; Bai Ze, Cui Ben,
Hou Yi, Michael, The Phoenix — поднимаются. Merlin: Standard S-, Ultimate S-, с пометкой
«Falls off endgame, where more than raw damage is needed».

### Схема записи героя

`catalog-en.json` (283 объекта), поля — у всех 283 присутствуют:

```
heroId, name, title, desc, heroClass, borderTier, gender, mainland,
skillName, skill, skill2Name, skill2,
sacramentName, sacramentDesc, s1, s2, s3, s4, s5,
hasAwaken, awakenName, aw1, aw2, aw3,
visible, source
```

`cache/tierlist_slim` — словарь `heroId → { ultimate, standard, role, notes, visible, lastUpdate }`.

Пример (heroId 4000, Galahad), URL `https://mwrarchive.com/catalog-en.json`:
```json
{ "heroId":"4000", "name":"Galahad", "title":"Pure Knight",
  "heroClass":"Cavalry", "borderTier":"", "gender":"Male", "mainland":"Mainland_1",
  "skillName":"Brutal Stomp",
  "skill":"Normal attacks have a 40% chance to trigger a skill that deals 50(200)% physical damage to up to 5 random enemy soldier squads or heroes within a central area around the user. Targets ... for 3 seconds, dispellable.",
  "sacramentName":"Red Handle Sword",
  "s1":"Hero attack +12%",
  "s2":"Soldier attack +30%",
  "s3":"Skill damage +20%",
  "s4":"After casting skill, the current engaged enemy unit takes +6% permanent extra normal attack damage, up to 30%, undispellable.",
  "s5":"Each time the skill is cast, restore 10% of max HP.",
  "hasAwaken":"No", "awakenName":"", "aw1":"", "aw2":"", "aw3":"",
  "visible":true, "source":"gamedata" }
```
Его оценка (`cache/tierlist_slim`, ключ `4000`):
```json
{"ultimate":"Unranked","standard":"B-","role":"Damage",
 "notes":"- A cavalry with decent damage and a stun.\n- Good damage to the backline hero he's targeting.\n- Can only target a limited number of enemies due to the old targeting system.\n- Recommended sac: 4",
 "visible":true,"lastUpdate":"2026-08-05T19:28:07.998Z"}
```

### Справочники, извлечённые из полей

**Классы (`heroClass`), 8 шт., 283 героя:**
Swordman 42, Mage 41, Shield Guard 38, Spearman 37, Cavalry 34, Priest 34, Archer 30,
Pegasus Knight 27.

**Редкость (`borderTier`).** Расшифровка взята из `https://mwrarchive.com/shared/battles.js`:
```
RARITY_NAMES = { '5':'Divine', '4':'VIP', '3':'T0 Limited', '2':'T0.5 Limited', '1':'Normal' }
```
Суффикс `A` = у героя есть пробуждение (`hasAwaken:"Yes"`).
Правило из `https://mwrarchive.com/shared/divine-cap.js`: **не более одного Divine-героя (border 5)
на одну волну**; `"5A"` тоже считается Divine.

Кросс-таблица borderTier × hasAwaken (283 героя):
`(нет рамки)/No` 94 · `1/No` 58 · `1/Yes` 1 · `2/No` 14 · `2A/Yes` 14 · `3/No` 16 · `3/Yes` 1 ·
`3A/Yes` 67 · `4/No` 4 · `4A/Yes` 10 · `5/No` 4.
**Всего с пробуждением: 93 героя.**

**Континенты (`mainland`):** Mainland_1…Mainland_16 (Mainland_4 — 30 героев, Mainland_16 — 2).

**Роли (`role`, из tierlist_slim):** Damage 63, Tanking 17, Tanking+Buffs 10, CC 8,
Damage+Debuffs 8, Healing 7, Buffs 7, Damage+CC 7, CC+Damage 6, Tanking+Damage 5,
Debuffs 5, Buff 5, Buffs+Niche 4 и т.д.; 34 без роли.

**Рекомендованный уровень сакрамента** (парсинг `notes` на «Recommended sac: N»),
205 героев из 283:
`sac 5` → 120 героев, `sac 4` → 37, `sac 3` → 11, `sac 0` → 37.

---

## 2. СИМУЛЯТОР БОЁВ (`/battles`) — ВХОД, ВЫХОД, И ГДЕ СИДИТ МАТЕМАТИКА

### Доступ

`https://mwrarchive.com/battles.html` → клиентский редирект на
`https://mwrarchive.com/login?return=%2Fbattles`. Форма: USERNAME / PASSWORD / Sign in / Register.
**Аккаунт не создавали и не создаём.**

HTML страницы `/battles.html` отдаётся публично (HTTP 200, 52 856 байт), и все её скрипты
(`/shared/battles*.js`) публичны. Из них восстановлена схема ввода/вывода. Но:

```
GET https://mwrarchive.com/api/battles/run-stream
→ 401  {"error":"missing Authorization header"}
```

**Симуляция считается на СЕРВЕРЕ.** Клиент только собирает JSON-спеку, шлёт её в
`/api/battles/run-stream` и рисует SSE-поток. Формул урона в клиентском коде НЕТ.

### Что симулятор принимает на вход

Из `https://mwrarchive.com/shared/battles-kernel.js` (`buildRunSpec`):

```
{
  seed,                              // сид ГСЧ
  duration: 180,                     // длительность боя по умолчанию, секунд
  reinforceIntervalOverride: null,   // интервал подхода волн
  formations: { left: [...], right: [...] }   // left = игрок, right = враг
}
```
Число волн: `reinforce === '1v1'` → 1 волна, иначе → **3 волны** (режим по умолчанию `"3v3"`).

Спека одного героя (те же поля и в пресетах врагов):
```
{ heroId, x, y, deploySlot,
  heroLevel, starLevel, commandLevel,
  hallowsStar,            // уровень сакрамента (реликвии)
  professionId,           // класс-специализация
  professionNodeIds: [],  // прокачанные узлы дерева класса
  wakeUpLv }              // уровень пробуждения
```

### Потолки движка

Из `https://mwrarchive.com/shared/battles.js`:
```js
const ENGINE_STAT_CAPS = Object.freeze({
  heroLevel: 1000,
  starLevel: 6,
  hallowsStar: 5,
  wakeUpLv: 3,
  awakenBudget: Infinity,
  pointsPerAwakenLevel: 1,
});
// дефолты редактора:
defaults: { heroLevel: 1000, starLevel: 6, hallowsStar: 5, wakeUpLv: 3 }
```
Лимиты турнирного режима (из HTML `/battles.html`): `tnCreateLevelCap` min 1 / **max 800** /
default 800; `tnCreateStarCap` 0–6 (default 6); `tnCreateSacramentCap` 0–5 (default 5);
`tnCreateAwakenBudget` default 12; `tnCreateAwakenPoints` default 1;
`tnCreateSignupHours` 0.02–168 (default 48).

### Поле боя

Из `battles-kernel.js` и `_astro/FormationPage...js`:
```
FORM_ROWS = 7;  FORM_COLS = 5;      // сетка построения 7×5
deploySlot(player) = row*1000 + (4 - col)
deploySlot(enemy)  = (6 - row)*1000 + (4 - col)
```
Из гайда `/early-game-guide`: «Troops face right; the front line is the rightmost column.»
2-я волна подходит сзади и поддерживает 1-ю.

### Что симулятор выдаёт на выходе

Из `https://mwrarchive.com/shared/battles.js`. Поток SSE даёт события
`frame`, `pos`, `pos_meta`, `result` (обработчик в `battles-stream.js`).

**Колонки по героям:** `side`, `heroName`, **`powerScore` («Power Score»)**, далее блоки
`heroStats` и `soldierStats` по ключам:
```js
STAT_KEYS = ["combatDamage","abilityDamage","receiveDamage",
             "sendNormalHeal","sendAbilityHeal","receiveHeal","abilityCastCount"];
// подписи: CombatDmg, AbilityDmg, ReceiveDmg, NormalHeal, AbilityHeal, ReceiveHeal, CastCount
```
**Колонки по солдатам:** `side`, `heroName`, `finalSoldierHp` («SoldierHP») + те же STAT_KEYS.

**Аналитика (`analytics`):**
```js
ANALYTICS_KEYS = ["lastHitHeroKills","topContributionHeroKills","lastHitSoldierKills",
  "controlEffectsApplied","controlTimeSeconds","uniqueHeroesBuffed","uniqueHeroesDebuffed",
  "uniqueHeroesActuallySaved","timesRevived","protectionEffectsApplied"];
```

**Итог: `powerScore` — это ВЫХОДНАЯ метрика симулятора (вклад героя в бой), а не входная
«боевая мощь 战力».** Клиент её только отображает; как она считается — на сервере.

### Пресетный противник (публичный, для калибровки)

`https://mwrarchive.com/shared/preset-enemies.js` → `window.BATTLE_ENEMY_PRESETS`,
34 864 симв., ровно один пресет:
```
id: "legn-neko", name: "LEGN NEKO (level 560)"
```
Полные 3 волны реальных героев с конкретными билдами, например:
`{"heroId":4139,"x":2,"y":0,"heroLevel":560,"starLevel":6,"hallowsStar":4,"wakeUpLv":0,
  "commandLevel":560,"professionId":50302,"professionNodeIds":[5000,5031,...,5044],"deploySlot":2}`
`{"heroId":4187,"x":4,"y":0,"heroLevel":560,"starLevel":6,"hallowsStar":5,"wakeUpLv":0,
  "commandLevel":560,"professionId":80302,...}`

Это готовый эталонный «эндгеймовый» набор параметров: уровень 560, звёзды 6, сакрамент 4–5,
пробуждение 0.

### Деревья классов (профессии)

`https://mwrarchive.com/shared/profession-defaults.js` → `window.PROFESSION_DEFAULTS`
(7 321 симв., заголовок: «Auto-generated by build_profession_defaults.py»).
Структура: `heroClass → [{ id, name, nodeIds[] }]`. Для Swordman:
```
10000 "Warrior (none)"  nodeIds: []
10102 "Hero"            nodeIds: [1000..1044] (43 узла, без 1015/1030/1045)
10202 "Bloodhand"       nodeIds: те же 43 узла
10302 "Grand Marshal"   nodeIds: [1000..1045] (46 узлов, полное дерево)
```
Схема ID: `<классXX>0<ступень>02`. Узлы: класс 1 → 1000–1045, класс 5 → 5000–5044,
класс 8 → 8000–8044. То есть **у каждого класса ~46 узлов дерева, 3 специализации + «нет»**,
и топовая специализация (`X0302`) открывает 3 дополнительных узла (например 1015, 1030, 1045).

---

## 3. SIGIL CALCULATOR — ЭТО НЕ КАЛЬКУЛЯТОР СТАТОВ

URL: `https://mwrarchive.com/calculator`

**Сигилы — это валюта призыва (пулл-тикеты), а не предметы со статами.** Есть зелёные
(green) и фиолетовые (purple). Калькулятор считает недельный/месячный ДОХОД сигилов
из источников и его ценность в алмазах. Никаких боевых статов он не считает.

Логика целиком в инлайн-скрипте страницы `/calculator` (3 985 симв.). Восстановлена полностью.

### Константы

```js
// множитель Lucky Spin по VIP
spinVip = { 0:4, 6:5, 30:6, 100:8 }
// Alliance Shop по уровню альянса
allianceShop = { 1:{green:15,purple:15}, 3:{green:30,purple:30}, 5:{green:45,purple:45} }
// Alliance Clash — зелёные за ранг
clashRank = { "1st":80, "2-3":60, "4-10":40, "11-100":20 }
// Alliance Conquest — зелёные за ранг
conqRank  = { "1st":100, "2nd":90, "3rd":90, "4-10":70, "11-20":60, "21+":50 }
// Conquest, выполнение квестов
conqQuest = { max:120, expected:100, off:0 }
// Conquest, индивидуальный зачёт
conqIndiv = { top30:170, "31-100":50, none:0 }
```

### Формулы дохода (weeks = 30/7 ≈ 4.2857 при «monthly», иначе 1; days = 30 или 7)

```
Daily Login      green = 10 * days
Lucky Spin       green = round(spinVip[VIP] * 2.7) * days
Alliance Shop    green = lvl.green * weeks
                 purple = lvl.purple * weeks   (+10 если monthly)
                 diamonds = 2520 * weeks       (+300 если monthly)
Arena Shop       green = 10 * weeks
World Boss       green = 70 * weeks
Chess Shop       green = 30 * weeks
Alliance Clash   occ = monthly ? 2 : (выбран clash ? 1 : 0)
                 green  = clashRank[rank] * occ
                 purple = (wins*10 + (7-wins)*3) * occ
Alliance Conquest occ = monthly ? 2 : (выбран conquest ? 1 : 0)
                 g = wins*10 + (7-wins)*5
                 green = (conqRank[rank] + conqQuest[q] + conqIndiv[i] + g) * occ
Soul Shop (prem) green = 20*days, purple = 30*days, diamonds = 550*days
```

### Итоговые формулы (ключевое)

```
pulls        = green + purple + floor(purple / 100) * 30
diamondValue = green * 42 + purple * 60 - diamondsSpent
```

То есть **1 зелёный сигил ≈ 42 алмаза, 1 фиолетовый ≈ 60 алмазов**, и каждые полные
100 фиолетовых сигилов дают **бонус +30 пуллов** (порог/милестоун).

Дефолтный расклад страницы при загрузке (все обычные источники ON, Soul Shop OFF,
альянс LV5, ранги 1st, 7 побед, VIP 0):
GREEN 742 · PURPLE 45 · PULLS 787 · DIAMOND COST −2 520 · DIAMOND VALUE 31 344.
(Alliance Shop показывает 45 / 45 / 2 520; Soul Shop: «550 + 44 souls/day», 140 / 210 / 3 850.)

### Ориентир из гайда

`https://mwrarchive.com/early-game-guide`: **«~2,100 sigils — Save this amount before pulling
on any banner.»** Плюс: «Never spend gems on grails», «Never spend gems on tavern pulls»,
«Spend gems on extra Evil Heroes runs — once past Prestige 80».

---

## 4. ФОРМУЛЫ, КОТОРЫЕ УДАЛОСЬ ВОССТАНОВИТЬ

### 4.1. Нотация коэффициентов навыков `X(Y)%` — и её масштаб

Во всех описаниях навыков урон записан как `X(Y)% of physical attack` (или `magic attack`).
Всего в `catalog-en.json` **618 таких пар** по полям `skill`/`skill2`.

Распределение отношения Y/X:
```
2.50 → 475 случаев (76.9%)
2.00 →  37
3.00 →  21
4.00 →  18
2.20 →   8 ;  1.60 → 7 ; 1.67 → 6 ; 1.92 → 6 ; 1.75 → 6 ; 2.06 → 5 ; ...
```
Примеры пар: (40,100), (80,200), (12,30), (4,10), (10,25), (20,50), (16,40), (300,600),
(200,500), (60,120), (450,1350), (500,800).

**Доминирующее правило: максимальное значение = 2.5 × базового.** Что именно скейлит X→Y
(звёзды/уровень навыка), сайт нигде не поясняет — легенды к этой нотации на публичных
страницах нет. Не додумываю.

### 4.2. Базовая форма урона от навыка

Из текстов навыков (`https://mwrarchive.com/catalog-en.json`), дословные примеры:

```
«dealing skill damage equal to 50(200)% of physical attack to up to 5 enemy heroes within attack range»
«dealing 3 instances of skill damage equal to 40(70)% of physical attack to targets in the area»
«dealing 80(200)% of physical attack as skill damage»
«deals skill damage equal to 450(1350)% of physical attack to target unit before death»
«heals ... each second by 80(200)% of magic attack (soldiers only receive 20% of the healing)»
«attacks deal true damage equal to 10(40)% of physical attack, ignoring all defenses»
«dealing 120(300)% mixed Physical and Magic damage (half of each, deals only 15% damage to soldiers)»
«deals skill damage equal to 500(800)% of physical attack ... (only 10% damage to soldiers)»
```

Отсюда:
```
SkillDamage = Coeff% × (PhysicalAttack | MagicAttack)      // базовая форма
TrueDamage  = Coeff% × Attack, игнорирует всю защиту       // отдельный тип
MixedDamage = 50% Physical + 50% Magic
```
И отдельный **множитель «по солдатам»**: у каждого AoE-навыка своя доля урона по отрядам
солдат — встречаются 10%, 15%; лечение солдат — 20% от лечения героя.

Словарь механик по корпусу описаний (283 героя, 313 078 символов, `catalog-en.json`):
`range` 314, `skill damage` 303, `soldier` 293, `max HP` 288, `defense` 186,
`healing` 157, `damage reduction` 154, `physical attack` 127, `squad` 125,
`attack speed` 124, `crit` 101, `shield` 98, `cooldown` 77, `magic attack` 62,
`true damage` 55, `movement speed` 47, `evasion` 28, `lifesteal` 28, `physical damage` 23,
`rage` 19, `dodge` 16, `magic damage` 15, `armor` 12, `block` 8, `energy` 4.
Терминов `penetration` / `accuracy` / `pure damage` — 0.

### 4.3. САКРАМЕНТ (реликвия) — канонические слоты s1…s5

Это готовая таблица модификаторов. Собрано агрегацией полей `s1..s5` по всем 283 героям
(`https://mwrarchive.com/catalog-en.json`; варианты формулировок с разных локализаций слиты).

Топ-значения (число вхождений по всем 5 слотам):
| Эффект | Кол-во |
|---|---|
| Hero attack +12% | 93 (+37 «Heroes' attack power increased by 12%», +4 «Hero ATK increased by 12%», +3 «Paragon attack increases by 12%») |
| Hero HP +6% | 61 (+2 «Heroes' HP increased by 6%») |
| Hero reduces skill damage received by 33% | 35 (+26 «Heroes receive 33% less skill damage») |
| Hero defense +18% | 32 |
| Skill target +1 | 30 |
| Soldier attack +30% | 28 |
| Each time the skill is cast, restore 10% of max HP | 25 |
| Attack range +20m | 21 (+2 «range of the skill increased by 20») |
| Unit attack speed +30% | 18 (+9 «unit attack speed +30%», +1 «+30% Attack Speed boost») |
| Healing received by hero +20% | 15 |
| Plus 2 soldier squads | 11 (+2 «Plus 5 soldier squads») |
| Soldier HP +40% | 10 |
| Damage dealt to targets with over 80% HP is doubled | 10 (+6 вариант) |
| Healing received by the unit +12% | 10 |
| Double damage to enemies below 30% HP | 9 (+2 вариант) |
| Hero normal attacks ignore evasion | 9 |
| Skill duration +25% | 8 (+3 «+20%», +7 «+5s») |
| Skill will automatically trigger once at battle start | 8 |
| Silence duration on hero −80% | 7 |
| Skill damage +20% | 7 |
| Soldier defense +50% | 6 |
| Soldiers reduce skill damage received by 50% | 6 |
| **This unit deals +30% extra damage to shield guard** | 5 |
| Hero normal attacks always critical hit | 5 |
| Skill trigger rate +10% | 5 |
| **This unit deals +30% extra damage to cavalry** | 4 |
| **This unit deals +30% extra damage to mage** | 4 |
| Skill triggers once at first engagement | 4 |
| **This unit deals +30% extra damage to spearmen** | 3 |
| For every normal attack, hero restores 1% of max HP | 3 |
| Skill maximum trigger count +1 | 3 |
| Unit movement speed increased by 50% | 2 |
| Skill cooldown −20% | 2 |
| Skill target is doubled | 2 |
| Skill damage and reduce-healing effect +20% | 2 |
| After casting skill, +10% attack, up to 40%, undispellable | 11 (в слоте s3) |
| After casting skill, +15% defense, up to 60%, undispellable | 6 |
| 50% of damage taken by hero is shared evenly by all soldier squads in the unit | 7 |

**Ключевой вывод для реконструкции:** у механик игры фиксированный «шаг» значений —
Hero ATK **+12%**, Hero HP **+6%**, Hero DEF **+18%**, Soldier ATK **+30%**,
Soldier HP **+40%**, Soldier DEF **+50%**, снижение получаемого скилл-урона **−33%** (герой)
и **−50%** (солдаты), контр-класс **+30%**, дальность **+20 м**.

### 4.4. ПРОБУЖДЕНИЕ (awakening) — универсальная константа

Поле `aw1` у **всех 93 героев с пробуждением идентично**:

```
«After the battle begins, damage dealt and damage reduction are increased by 3%.»
```

**Пробуждение уровня 1 = +3% нанесённого урона и +3% снижения урона, одинаково для всех.**
`aw2` и `aw3` — уникальные для каждого героя эффекты (уровни 2 и 3). Потолок `wakeUpLv = 3`.
Пример (Merlin, `awakenName: "Doomsday Thunderstorm"`): aw2 — молния каждые 10 сек,
aw3 — каждые 8 сек + доп. «Thundercloud». То есть между aw2 и aw3 меняются числа кулдауна.

### 4.5. Геометрия AOE (для симулятора формаций)

Firestore `cache/aoe_payload` — 17 героев, схема:
```json
{ "heroId":"4147",
  "grid":[{"x":0,"y":-1},{"x":-1,"y":-1},{"x":-1,"y":0},{"x":-1,"y":1},
          {"x":0,"y":1},{"x":1,"y":0},{"x":1,"y":-1},{"x":1,"y":1}],
  "fullRows":[], "fullCols":[], "wholeFormation":false, "radius":0 }
```
Значения полей:
* `grid` — смещения клеток относительно цели (8 клеток = «квадрат 3×3 без центра»,
  4 клетки = «крест», 5 клеток, 1 клетка).
* `fullRows: [0]` — вся строка цели; `fullRows: [-1,0,1]` — три строки (у 4146).
* `fullCols: [0]` — вся колонка цели (4121, 4047, 4080).
* `wholeFormation: true` — всё построение (4181).
* `radius` — круговой AOE. **Единица: десятые доли клетки** (из кода формации: `radius/10`).
  Встречаются `radius: 35` (3.5 клетки, героя 4022) и `radius: 27` (2.7, героя 4141).

Сетка построения: **7 строк × 5 колонок**, фронт — правая колонка, до 3 волн.

---

## 5. ДОПОЛНИТЕЛЬНЫЕ ЧИСЛОВЫЕ ТАБЛИЦЫ (гайды сообщества)

Источник: Firestore `info_posts` (публичное чтение), страницы вида
`https://mwrarchive.com/posts/<id>`.

### 5.1. Prestige Levels (`info_posts/prestige-levels`, 69 161 симв.)

Таблица на **126 уровней**: Level | Exp Required | Max Energy | Army 1 Slots | Army 2 Slots |
Army 3 Slots | Unlocks.

Правило энергии (дословно): «Each level grants +5 max energy (base 180, cap 540 at level 73+).»
Проверено по таблице: lv1 → 180, lv73 → 540, дальше 540.

Опорные строки: lv1 exp 0 / en 180; lv2 exp 20 / en 185 / Army1 6 слотов;
lv40 exp 1 600 / en 375 / A1 17 / A2 6; lv50 exp 2 100 / en 425 / A1 18 / A2 8;
lv60 exp 2 850 / en 475 / A1 20 / A2 9; lv100 exp 17 500 / en 540 / A1 27 / A2 26 / A3 26;
lv126 exp 29 200 / en 540 / 35 / 35 / 35 (последняя строка).
Слоты армий после ~lv95 растут циклом «+1 по очереди A1→A2→A3», exp-шаг фиксирован 450/уровень.

**Разблокировки по уровню престижа (полный список из таблицы):**
```
1  Alliance Duel, Alliance Conquest, Mini Auto Chess, Mini Trial Arena
17 Soldier Promotion, Recruit, Merlin's Tower, Lucky Wheel
27 Wonder, Chest
28 Arena, Shop, Cultivation
30 Quick Battle
34 Chat, Phantom PvP
37 Hero Equipment, Dungeon
38 Fair Arena
40 Army 2 unlocked, Martial Tournament Feature
41 Grand Arena
48 Training, Training Grounds
50 Continental Arena, Arena of Kings, Hell Contract
56 Evil Heroes From Other Dimensions, Name Change, Hero Sacrament
60 Rift Challenge
61 Mail, Hero Expertise, Orc Invasion, Class, Class Change 2
63 Energy Realm, Resonance, Slot Machine
65 Awakening, Spell, Continent Tower
70 World Boss, Battle Pass, Boss Training
76 Army 3 unlocked, Divine System, Divine Realm, Expedition
```
Это прямо объясняет, почему гайд говорит «Rush Prestige 63 — biggest early power spike»
(Resonance/Энергетический предел) и почему сакрамент до lv56 недоступен, а пробуждение — до lv65.

### 5.2. VIP Levels (`info_posts/vip-levels-and-rewards`, 13 867 симв.)

«Prices in Red Diamonds (premium currency). Approximate cost: 100 VIP Points ~ $15 USD.»
21 уровень VIP:

| VIP lv | VIP Points | ~$ |
|---|---|---|
| 1 | 6 | ~$1 |
| 2 | 30 | ~$5 |
| 3 | 100 | ~$15 |
| 4 | 200 | ~$30 |
| 5 | 500 | ~$75 |
| 6 | 1 000 | ~$150 |
| 7 | 2 000 | ~$300 |
| 8 | 3 000 | ~$450 |
| 9 | 5 000 | ~$750 |
| 10 | 7 000 | ~$1 050 |
| 11 | 10 000 | ~$1 500 |
| 12 | 12 500 | ~$1 875 |
| 13 | 15 000 | ~$2 250 |
| 14 | 20 000 | ~$3 000 |
| 15 | 25 000 | ~$3 750 |
| 16 | 30 000 | ~$4 500 |
| 17 | 35 000 | ~$5 250 |
| 18 | 40 000 | ~$6 000 |
| 19 | 50 000 | ~$7 500 |
| 20 | 60 000 | ~$9 000 |
| 21 | 70 000 | ~$10 500 |

Примеры содержимого паков: VIP1 «6 Points VIP Reward Pack ×2 (30 Red Diamonds): 500 Gems,
10 Purple Sigils»; VIP3 «100 Points Pack ×2 (340 Red Diamonds): 500 Gems, 180 Purple Sigils»;
VIP4 «Merlin's Sacrament Pack 1 (180 Red Diamonds): 10 000 Merlin Arcana, 48 Purple Sigils»;
VIP5 «Merlin's Awakening Bundle 1 (340 Red Diamonds): 10 Merlin Awaken Hearts, 100 Purple Sigils».
Видно, что прокачка сакрамента идёт «арканой» героя (Arcana), а пробуждение — «сердцами»
пробуждения (Awaken Hearts).

### 5.3. Патч-ноты (`https://mwrarchive.com/assets/patch-notes.json`)

33 патча, схема `{ date, summary, sections:{ skillChanges:[{name,class,description}], newContent:[...] } }`.
Последний: `2026-08-11`, «Balance changes for 7 heroes, five title reworks, and the Nightjar banner revealed».

Формулировки прямо содержат коэффициенты — полезно как срез реальных величин:
```
Lucifer (Pegasus Knight): «Demon God's damage-reduction bonus to nearby allies increased to
  -60% (up from -40%), scaling to -120% at max rank.»
Ao Guang (Swordman): «Water Dragon Blade's bonus basic-attack damage rose to 80% of ATK
  (up from 60%), and his awakened Dragon Soul shield grew to 45%/60% max HP (up from 20%/40%).»
Michael (Pegasus Knight): «Heaven's Protection's lifesteal and attack-damage bonus for Angels
  now scale from 20% up to 50% by rank, down from a flat 100%/100%.»
Ōtengu (Pegasus Knight): «His buff-count shield now scales at 12% Physical Attack per stack
  (up from 8%).»
```
Частота терминов по всему файлу: `max HP` 26, `crit` 23, `ATK` 19, `attack speed` 15,
`damage reduction` 15, `true damage` 8, `defense` 7, `lifesteal` 7, `skill damage` 6,
`Physical Attack` 3, `magic damage` 2, `block` 2, `evasion` 2, `Magic Attack` 1.
Слов `penetration` / `armor` / `accuracy` — 0.

**Из этого видно две вещи:** (1) щиты и бонусы измеряются в «% от Physical Attack» и
«% от max HP» — те же две базы, что и урон; (2) есть понятие **rank** («scaling to −120% at
max rank», «from 20% up to 50% by rank») — вероятно, тот самый скейлинг X→Y, но явного
подтверждения на сайте нет.

### 5.4. Early-Game Guide (`https://mwrarchive.com/early-game-guide`, «updated May 2026»)

Приоритеты: «Stars beat rarity — always star up first» · «Rush Prestige 63 — biggest early
power spike» · «Phantom Invasion helps progression» · «Skip Unit Tree & Dungeon early — low impact».
Отдельный тир-лист низкой редкости (EPIC/RARE): S — Garbutt, Tapster; A — Randall, Seamas,
Cedric; B — William Tell, Anatole, Azod, Garvin, Harlan, Hedda, Leroy; C — Lamorak, Cantello,
Barfoot; D — Towneley, Nolan, Malik, Varian; E — Lambkin, Terim;
F — Dudefella, Lilac, Rodney, Reed, Chloe, Audrey.
Рекомендации по построению: «keep formations tight, rather than spread out»;
1-я волна — TANKS / CAVALRY / MELEE-SUPPORT / SUPPORT-UTILITY, 2-я — PEGASUS KNIGHTS /
CAVALRY / DPS-SUPPORT.

---

## 6. ЧТО НЕ УДАЛОСЬ

| Что | Причина |
|---|---|
| **Формула боевой мощи (战力 / battle power)** | На сайте её нет ни в каком виде. `powerScore` — это ВЫХОД симулятора (вклад героя в конкретный бой), считается на сервере в `/api/battles/run-stream`, в клиентском коде отсутствует. |
| **Формула урона (полная, с защитой)** | Считается на сервере. Клиент (`battles-kernel.js`, `battles-stream.js`, `battles.js`) только собирает спеку и рисует SSE-поток. Из текстов навыков восстановлена лишь базовая форма `Coeff% × Attack` и наличие true/mixed damage; как вычитается defense — неизвестно. |
| **Базовые статы героев (HP / ATK / DEF, рост на уровень, множители звёзд)** | В публичных данных ИХ НЕТ. Проверены все источники, которые сайт запрашивает: `catalog-*.json` (только текст), Firestore `cache/*` (полностью перечислена — 22 документа, статов нет), `assets/patch-notes.json`, `/api/banners/active`. Статы существуют только на сервере симулятора. |
| **Прогон матчапа в симуляторе** | `/battles` за логином; `GET /api/battles/run-stream` → 401 «missing Authorization header». Регистрацию не делал (создание аккаунтов и ввод паролей — вне разрешённых действий). Матчап не прогонялся. |
| **Расшифровка нотации `X(Y)%`** | Легенды на сайте нет. Эмпирически Y/X = 2.5 в 77% случаев, но чем именно вызван рост (звёзды? ранг навыка? уровень?) — на сайте не сказано. Не додумываю. |
| **Таблица контр-классов (полный треугольник)** | Явной матрицы нет ни в коде, ни в данных. Есть только фрагменты в текстах сакраментов: «+30% extra damage to shield guard / cavalry / mage / spearmen». Кто кого контрит системно — не выведено. |
| **Данные аур построения** | В UI формации есть панель «AURAS», в админ-меню есть `/aoe-editor.html` («Edit AOE & Aura Data»), но в Firestore лежит только `aoe_payload` (геометрия AOE, 17 героев). Отдельного документа с числами аур в публичном `cache` нет. |
| **Комментарии сообщества** | Firestore `comments` и `heroComments` → `permission-denied`. |
| **Библиотека анимаций** | Страница `https://mwrarchive.com/animations` существует (просмотрщик анимаций по всем героям с фильтром по классам). **Намеренно не скачивалось** — прямой запрет в задании. |
| Разделы Tournaments / Defense / PvP | `/api/tournaments/*`, `/api/defense/index-sync`, `/api/formations/load` — все под тем же логином. |

---

## 7. ЧТО ИЗ ЭТОГО РЕАЛЬНО ПРИГОДНО ДЛЯ РЕКОНСТРУКЦИИ

1. **Сетка боя и волны:** 7×5, фронт справа, до 3 волн, длительность боя по умолчанию 180 с,
   бой детерминирован сидом (`seed` в спеке).
2. **Оси прокачки и их потолки:** level ≤ 1000 (турнирный кап 800), star ≤ 6, sacrament ≤ 5,
   awakening ≤ 3. Плюс дерево класса (~46 узлов × 3 специализации на класс) и `commandLevel`.
3. **Фиксированный шаг модификаторов** (см. 4.3) — это по сути «сетка баланса» игры:
   ATK ±12%, HP ±6%, DEF ±18% для героя; 30/40/50% для солдат; контр-класс +30%;
   снижение скилл-урона 33% (герой) / 50% (солдаты).
4. **Пробуждение lv1 = +3%/+3% для всех** — универсальная константа.
5. **Коэффициенты навыков:** 618 пар `X(Y)%`, база = Physical/Magic Attack,
   максимум = 2.5×базы в 77% случаев.
6. **Экономика призыва:** 1 green = 42 алмаза, 1 purple = 60, бонус +30 пуллов за каждые
   100 purple, порог входа в баннер ~2 100 сигилов.
7. **Гейты прогрессии:** сакрамент с престижа 56, класс/резонанс с 61–63, пробуждение с 65,
   Divine-система и 3-я армия с 76. Энергия 180→540 (+5/ур., кап на 73).
8. **Эталонный эндгейм-билд для калибровки:** пресет `LEGN NEKO (level 560)` —
   реальные 3 волны с level 560 / star 6 / sacrament 4–5 / awaken 0.

---

## 8. ССЫЛКИ (все числа выше взяты отсюда)

```
https://mwrarchive.com/
https://mwrarchive.com/tierlist
https://mwrarchive.com/formation
https://mwrarchive.com/calculator
https://mwrarchive.com/info
https://mwrarchive.com/early-game-guide
https://mwrarchive.com/animations
https://mwrarchive.com/battles.html            (HTML публичен, UI за логином)
https://mwrarchive.com/login?return=%2Fbattles

https://mwrarchive.com/catalog-en.json          283 героя, полные тексты
https://mwrarchive.com/assets/patch-notes.json  33 патча
https://mwrarchive.com/api/banners/active       активные баннеры
https://mwrarchive.com/api/battles/run-stream   401 — симулятор, только для залогиненных

https://mwrarchive.com/shared/hero-payload.js         загрузчик каталога (window.MWR_HEROES)
https://mwrarchive.com/shared/battles-kernel.js       сетка 7×5, схема спеки прогона
https://mwrarchive.com/shared/battles-stream.js       SSE-протокол (frame/pos/pos_meta/result)
https://mwrarchive.com/shared/battles-results.js      heroStats/soldierStats/analytics/powerScore
https://mwrarchive.com/shared/battles.js              ENGINE_STAT_CAPS, STAT_KEYS, RARITY_NAMES
https://mwrarchive.com/shared/profession-defaults.js  деревья классов (window.PROFESSION_DEFAULTS)
https://mwrarchive.com/shared/preset-enemies.js       пресет LEGN NEKO (level 560)
https://mwrarchive.com/shared/divine-cap.js           1 Divine на волну
https://mwrarchive.com/shared/patchnotes.js           путь к patch-notes.json

Firestore, проект legion-mwr-archive, БД (default), публичное чтение:
  cache/tierlist_slim      оценки: heroId → {ultimate, standard, role, notes, lastUpdate}
  cache/tierlist_payload   полный тир-лист (с водяными знаками в тексте!)
  cache/aoe_payload        геометрия AOE, 17 героев
  cache/logs_payload       ченджлог оценок (78 453 симв.)
  info_posts/prestige-levels        таблица престижа 1–126
  info_posts/vip-levels-and-rewards таблица VIP 1–21
  info_posts/hero-recommendations   рекомендации по пуллам
```
