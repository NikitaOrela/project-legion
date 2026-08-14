# 07a · Сырой корпус: скиллы и сакрамент 257 героев

**Это сырьё, а не документ.** Дословная выгрузка агента-ресерчера от 2026-08-14
с вики `mwreborn.irunawiki.com` (страницы героев `/en/heroes/4000`…`/4275`,
архив от 24.12.2025). Разбор и выводы — в `07_SKILLS_RESEARCH.md`, задача — в
`06_SKILLS_BRIEF.md`. Здесь лежит то, на чём они основаны, чтобы следующая
сессия могла перепроверить число, не переползая вики заново.

⚠️ **IP.** Имена героев, названия скиллов и дословные тексты — собственность
правообладателя первоисточника. Материал лежит в репозитории КАК ИСТОЧНИК ДЛЯ
АНАЛИЗА МЕХАНИК. В продукт не переносится ничего из имён и текстов: ни имена
героев, ни названия скиллов, ни формулировки.

**Охват:** статистика посчитана по всем 257 распарсенным героям; дословно
выписано 56 (по 7 на класс, разброс по тирам от SS до F). Полный дословный
корпус на 257 остался в сессии агента и на диск не попал — если понадобится,
это ещё один проход по вики.

---

# ОХВАТ СБОРА

Собраны **все 258 героев** (ID 4000–4275; 18 ID — дыры, отдают HTTP 500: 4030, 4038, 4040, 4043, 4044, 4045, 4050, 4051, 4052, 4053, 4055, 4057, 4058, 4067, 4186, 4224, 4226, 4274). 257 из них имеют распарсенный текст скилла + 5 ступеней сакрамента.

Классы: Mage 37, Shield Guard 36, Sword Man 36, Spearman 34, Priest 32, Cavalry 31, Archer 27, Pegasus Knight 24.
Тиры (Max): SS 4, S+ 11, S 21, S- 17, A+ 19, A 16, A- 17, B+ 20, B 13, B- 22, C 25, D 13, F 4, «??» 55 (у 55 героев рейтинг не проставлен — это новые/недооценённые: Odin, Athena, Apollo, Napoleon, Zhong Kui, Hel, Mo Li Hong/Hai/Shou и др.).

Ниже — **56 героев дословно** (по 7 на класс, с равномерным разбросом по тирам от SS до F). Формат: `Имя [Класс] Base>Max/sac:X | Cooldown | roles`, далее SKILL и ступени сакрамента S1–S5.

---

# ARCHER

## Marco Polo [Archer] A>S+/sac:S | no cd | roles: Damage
SKILL "Crack Shot": `Triggers immediately after battle start, permanently increasing self's attack speed by 45(75)% . Increases the damage of the first 2 attacks dealt to each enemy by 40(100)% . Every 2 basic attacks will additionally deal basic attack damage to up to 2 enemies within range ( 1(2) times, with independent calculations for hit and crit). Each kill permanently increases own physical attack by 0.8(2)% (for hero units, increases by 4(10)% ), stackable. For every 5 enemy soldiers or 1 enemy hero defeated, triggers Revolver Barrage: deals basic attack damage 3(6) times in a row to the nearest enemy hero (cooldown 5 seconds, unused barrages are stored).`
- S1 `Attack range +20m.`
- S2 `Hero attack +12%`
- S3 `The normal attacks of the hero will always critcal hit.`
- S4 `The normal attacks of the hero ignore evasion.`
- S5 `Crack Shot is upgraded to Bloodthirsty Dual Guns. Each attack deals one additional basic attack damage to the current target (calculating hit and crit separately), and grants 20% basic attack lifesteal.`

## Reglos [Archer] B>S/sac:A | Cooldown: 4s | roles: Damage
SKILL "Sky-Splitting Arrow": `Normal attacks have a 40% chance to trigger, firing a Hunter's Arrow at the most heavily wounded enemy hero on the battlefield, dealing 120(300)% of physical attack as skill damage. If this skill successfully kills the target, it additionally fires a Piercing Arrow at the furthest enemy hero, dealing the same amount of damage (dealing equal damage to enemy heroes in its path and only 10% damage to enemy units).`
- S1 `Heroes' attack power increased by 12%.`
- S2 `After every 3 Hunter's Arrows fired, an additional Piercing Arrow is shot.`
- S3 `Deals double damage to targets below 30% HP.`
- S4 `Hunter's Arrow ignores invisible units and deals penetrating damage (ignores target shields).`
- S5 `Hunting Arrow upgrades to Split Hunting Arrow, targeting and attacking the two enemy heroes with the lowest HP simultaneously.`

## Miranda Leva [Archer] A+>A+/sac:A | Cooldown: 7s | roles: CC
SKILL "Polymorph": `Normal attacks have a 50% chance to activate, sending a magic ray forward that transforms up to 3 enemy heroes and all soldiers it hits into [Hedgehogs] for 5 seconds, which cannot be dispelled. [Hedgehog]: When transformed, targets are immobilized and take 12(30)% increased skill damage. Each second, they deal Miranda Lewa's 12(30)% physical attack as magic skill damage to their nearby allies (soldiers take only 20% of this damage).`
- S1 `Duration of negative effects received by hero is reduced by 50%`
- S2 `Heroes' attack power increased by 12%.`
- S3 `All units in the unit have their attack speed increased by 30%.`
- S4 `After transforming into a hedgehog, loses an additional 20% of max HP and takes 30% more damage.`
- S5 `Casts a polymorph spell at the start of battle, affecting all enemies in its path and turning them into hedgehogs for 5 seconds.`

## Kelly [Archer] C>A-/sac:C | Cooldown: 10s | roles: Damage
SKILL "Lethal Arrow": `Normal attacks have a 10% chance to deal true damage equal to 20(100)% max HP to 1 random enemy hero in range.`
- S1 `Hero attack +12%`
- S2 `Soldier attack +30%`
- S3 `When anyone in the unit kills an enemy hero, soldiers permanently gain +10% attack, stacking up to 50%`
- S4 `When anyone in the unit kills an enemy hero, all soldier squads in that hero's unit lose 30% attack and defense, undispellable.`
- S5 `Skill trigger rate +10%`

## Mary Read [Archer] B+>B+/sac:B | Cooldown: 5s | roles: CC, Damage
SKILL "Ocean Breeze": `Normal attacks have a 40% chance to deal 50(200)% physical damage to up to 5 enemy squads or heroes and reduce their movement speed by 20(50)% for 14 seconds, dispellable.`
- S1 `The normal attacks of the soldiers in the unit ignore evasion.`
- S2 `Soldier attack +30%`
- S3 `Skill damage and slow effect +20%`
- S4 `After casting skill, the current engaged enemy unit takes +6% permanent extra normal attack damage, up to 30%, undispellable.`
- S5 `After casting skill, increase attack by 10%, up to 40%, undispellable.`

## Robinhood [Archer] C>C/sac:D | Cooldown: 6s | roles: Debuff
SKILL "Accurate Mark": `Normal attacks have a 65% chance to mark the highest physical defense enemy hero in range, reducing their physical defense by 50(140)% and dodge to 0 for 5 seconds, dispellable.`
- S1 `This unit deals +30% extra damage to cavalry.`
- S2 `Soldier attack +30%`
- S3 `The damage dealt by unit to all summoned units is increased by 50%`
- S4 `+3% hero attack for each surviving soldier squad in the unit.`
- S5 `Skill will also hit the enemy with highest magic defense and reduce magic defense, dispellable.`

## Yellow Wind Demon [Archer] D>D/sac:C | no cd | roles: CC
SKILL "Divine Samadhi Wind": `At the start of the battle, summons a windstorm above the nearest ranged enemy squad, lasting for 13(25) seconds, reducing the target's hit rate by 15(45) and attack speed by 16(40)% , undispellable.`
- S1 `Soldier attack +30%`
- S2 `Each time a soldier squad attacks, 50% chance to heal 40% of damage dealt.`
- S3 `The normal attacks of the soldiers in the unit ignore evasion.`
- S4 `All soldiers in the unit gain 50% attack at the start of battle, lasting for 50 seconds, undispellable.`
- S5 `Skill target +1`

---

# CAVALRY

## Talyan Saint Radiance [Cavalry] SS>SS/sac:S | no cd | roles: Damage, Heal, Tanking, Buff
SKILL "Knights of the Holy Light": `At battle start, forms a Holy Light Knight Order with melee allies in the same row, permanently increasing their max HP by 40(100)% , and before battle begins grants immunity to control effects up to 3 times for 13(25) seconds. Talyan marks the current target as 'Sinner,' and every 5 attacks summons a knight to join the strike, dealing 80(200)% physical skill damage each. When an allied knight dies, Talyan calls down Grace of Yura to heal all remaining knights for 20% of their max HP.`
- S1 `Hero HP +6%`
- S2 `Healing received by hero +20%`
- S3 `For every normal attack, hero restore 1% of max HP.`
- S4 `As long as there is another hero from the knight order alive, this hero will not die.`
- S5 `When a hero belonging to the knight order dies, this hero additionally calls down Judgment Light to deal physical damage equal to 50% of his max HP to the nearest enemy hero.`

## Wen Zhong [Cavalry] A>S/sac:A | no cd | roles: Damage
SKILL "Five-Thunder Divine Judgment": `Five types of Thunder circle the user permanently after the battle begins: Sky Thunder: Triggers every 4 attacks, dealing 80(200)% physical attack as skill damage to the target and healing the user for 80(200)% of the damage dealt. Earth Thunder: Triggers every 12 seconds, dispelling 4(10) negative effects from the user's troops and dealing 1.2(3)% max HP as true damage to all enemies in range. Water Thunder: Triggers every 6 seconds, dealing 12(30)% physical attack as skill damage to all enemy soldiers nearby. Divine Thunder: Has a 40% chance to trigger on attack, dealing 160(400)% physical attack as skill damage to the nearest enemy hero. Demon Thunder: Triggers after fighting the same target for a total of 10 seconds, dealing 6(15)% of the target's max HP as true damage.`
- S1 `Double damage to enemies below 30% HP.`
- S2 `Damage dealt to targets with over 80% HP is doubled.`
- S3 `After casting skill, increase attack by 10%, up to 40%, undispellable.`
- S4 `Before casting Thunder five times, the user is immune to control and cannot die.`
- S5 `Before receiving fatal damage for the first time, calls down Chaos Divine Thunder, striking all enemies in range and dealing 500% physical attack + 15% of the target's max HP as true damage (only 10% damage to soldiers).`

## Valente [Cavalry] B>A+/sac:A | Cooldown: 4s | roles: Buffs, Healing
SKILL "Lord of the Alliance": `At the start of the battle/every 5 seconds/every time an enemy hero is defeated/the user's HP drops below 80% / 60% / 40% / 20% , triggers to insert a random battle flag, inspiring all friendly units within its range for 10 seconds. The effects of each flag can stack 2 times, and effects from different flags can stack. Storm Flag: Increases movement speed and attack speed by 6(15)% . War Flag: Increases attack by 8(20)% . Ironclad Flag: Increases defense by 8(20)% .`
- S1 `Hero attack +12%`
- S2 `Hero defense +18%`
- S3 `After casting skill, increase defense by 15%, up to 60%, undispellable.`
- S4 `After casting skill, increase attack by 10%, up to 40%, undispellable.`
- S5 `Every 3 times the skill is cast, additionally plant a Supply Banner (restores 10% of max HP to allies within range), and the skill duration is extended by 20%`

## Galahad [Cavalry] B>A-/sac:C | Cooldown: 5s | roles: Damage
SKILL "Brutal Stomp": `Normal attacks have a 40% chance to trigger a skill that deals 50(200)% physical damage to up to 5 random enemy soldier squads or heroes within a central area around the user. Targets hit are stunned for 3 seconds, dispellable.`
- S1 `Hero attack +12%`
- S2 `Soldier attack +30%`
- S3 `Skill damage +20%`
- S4 `After casting skill, the current engaged enemy unit takes +6% permanent extra normal attack damage, up to 30%, undispellable.`
- S5 `Each time the skill is cast, restore 10% of max HP.`

## Cannon [Cavalry] B->B+/sac:C | Cooldown: 6s | roles: Damage
SKILL "Roar": `Normal attacks have a 40% chance to roar, reducing current HP and max HP of up to 5 nearby enemy squads or heroes by 10(22)% . Stackable and undispellable.`
- S1 `Hero attack +12%`
- S2 `After casting skill, the current engaged enemy unit takes +6% permanent extra normal attack damage, up to 30%, undispellable.`
- S3 `Skill trigger rate +10%`
- S4 `+2 soldier squads.`
- S5 `Skill target +3`

## Star Lord of Fire [Cavalry] D>B/sac:C | Cooldown: 11s | roles: Damage
SKILL "Blazing True Flame": `Triggers every 12 seconds after battle begins, summoning falling fire meteors above the current target, igniting up to 3 enemy units within the area. Affected units lose 1(4)% of their max HP per second for 5 seconds, dispellable.`
- S1 `Soldier defense +50%`
- S2 `Soldiers reduces skill damage received by 50%`
- S3 `50% of damage taken by hero is shared evenly by all soldier squads in the unit.`
- S4 `+5% hero defense for each surviving soldier squad in the unit.`
- S5 `Soldiers gain +50% defense for 50s at battle start, undispellable.`

## Watanabe no Tsuna [Cavalry] F>C/sac:C | Cooldown: 1s | roles: Damage
SKILL "Power of the Ghost Arm": `Triggers at battle start. Permanently loses 50% of max HP due to Ghost Arm corruption. Each attack deals additional physical skill damage equal to 2(5)% of max HP.`
- S1 `Hero HP +6%`
- S2 `For the first 20 seconds of battle, restore 2% of the maximum HP of unit per second, undispellable.`
- S3 `Ghost Arm Corrosion only reduces half of your maximum HP.`
- S4 `Unit attack speed +30%`
- S5 `Bonus damage is upgraded to true damage, and the bonus damage is doubled for the first 20 seconds of battle.`

---

# MAGE

## Tamamo-no-Mae [Mage] A->S+/sac:S | no cd | roles: Stall, CC, Damage
SKILL "Illusive Radiance": `Upon first engaging the enemy, unleashes the power of the Nine Tails, creating a [Phantom] at the location of the 3(9) farthest enemy heroes. When a [Phantom] is defeated, it returns 12(30)% of its max HP, magic attack, and 2(5)% attack speed to Tamamo-no-Mae, and causes all enemy units within range to be stunned and unable to act for 2(5) seconds (can be dispelled). [Phantom]: Each Phantom created consumes 10% of Tamamo-no-Mae's max HP, inherits 30(60)% of the target's total HP and attack attributes but has all defense attributes set to 0 . Can cast skills, and upon appearing, forces the target into combat with itself (ineffective against Priests). A Phantom can exist for up to 20 seconds.`
- S1 `Hero HP +6%`
- S2 `Hero attack +12%`
- S3 `All damage received by this unit will be borne by [Phantom].`
- S4 `【Phantom】inherits the target's Defend attributes. For the first 10 seconds of forced combat, the target's outgoing damage is reduced by 30%; this can be dispelled.`
- S5 `For every 3 <Phantom> recalled, a new <Phantom> will be generated at the location of the farthest enemy hero (additionally gains 50% of Tamamo-no-Mae's total attributes).`

## Merlin [Mage] A->S/sac:A+ | Cooldown: 3s | roles: Damage
SKILL "Lightning": `Normal attacks have a 40% chance to deal 3 instances of 60(120)% magic damage to the target area, each hitting up to 5 enemy squads or heroes.`
- S1 `Hero attack +12%`
- S2 `Skill trigger rate +10%`
- S3 `Damage dealt to targets with over 80% HP is doubled.`
- S4 `Skill target +2`
- S5 `Skill damage +20%`

## Jin Zha [Mage] B>S-/sac:A | Cooldown: 5s | roles: CC
SKILL "Soul Imprisonment": `Normal attacks have a 50% chance to trigger, summoning the Dragon-Hiding Pillar to seal off 2 random enemy ranged heroes. Deals 120(300)% magic attack as skill damage and restricts one of their body parts: Neck (Silence) / Waist (reduces attack speed by 20(50)% ) / Legs (Root). Effect lasts for 7 seconds and dispellable.`
- S1 `Hero reduces skill damage received by 33%`
- S2 `Skill target +1`
- S3 `The Dragon-Hiding Pillar immobilizes two body parts each time.`
- S4 `Skill target +1`
- S5 `The Dragon-Hiding Pillar immobilizes all body parts each time and applies one stack of [Cripple]: permanently reduces attack by 5%, up to 10 stacks, until Jin Zha is defeated.`

## Pandora [Mage] B+>A/sac:C | Cooldown: 9s | roles: Debuffs, CC
SKILL "Pandora's Box": `Every 10 seconds after battle begins, curses 5 random enemy heroes, causing them to suffer one random effect: Attack reduced by 20(50)% , defense reduced by 20(50)% , or attack speed reduced by 10(30)% , lasts for 8 seconds, dispellable.`
- S1 `Skill duration +25%`
- S2 `After casting skill, the current engaged enemy unit takes +10% permanent extra skill damage, up to 50%, undispellable.`
- S3 `Skill target +1`
- S4 `After casting skill, the current engaged enemy unit takes +6% permanent extra normal attack damage, up to 30%, undispellable.`
- S5 `Skill will also stun the targets for 2 seconds, dispellable.`

## Belthor [Mage] A>A-/sac:C | Cooldown: 8s | roles: CC
SKILL "Polymorph": `Normal attacks have a 65% chance to polymorph up to 5 enemy squads or heroes in the target area into sheep, reducing their physical and magic defense by 40(100)% for 5 seconds, dispellable.`
- S1 `This unit deals +30% extra damage to shield guard.`
- S2 `Soldier attack +30%`
- S3 `After casting skill, the current engaged enemy unit takes +10% permanent extra skill damage, up to 50%, undispellable.`
- S4 `After casting skill, the current engaged enemy unit takes +6% permanent extra normal attack damage, up to 30%, undispellable.`
- S5 `Skill target +1`

## Elizabeth [Mage] B->B/sac:D | Cooldown: 6s | roles: Damage
SKILL "Bloody Ceremony": `Normal attacks have a 50% chance to curse the nearest enemy hero in range, dealing 6(18)% of the hero's max HP as magic damage every 2 seconds for 8 seconds, dispellable.`
- S1 `Hero attack +12%`
- S2 `Soldier attack +30%`
- S3 `When anyone in the unit kills an enemy hero, all soldier squads in that hero's unit lose 30% attack and defense, undispellable.`
- S4 `Double damage to enemies below 30% HP.`
- S5 `Damage dealt to targets with over 80% HP is doubled.`

## Lü Yue [Mage] C>C/sac:B | no cd | roles: Damage
SKILL "Plague Venom Spring": `At battle start, gains Plague Spring (increases damage dealt by 12(30)% , loses 3.2(8)% max HP per second), undispellable. Before death, transfers Plague Spring to the nearest non-summoned enemy hero. The effect continues to transfer upon each death until one side has no heroes left.`
- S1 `Hero attack +12%`
- S2 `Attack range +20m.`
- S3 `Unit attack speed +30%`
- S4 `Skill damage to allied units is halved.`
- S5 `Upon death, an additional Skill with 30% damage and no extra bonus is released, and only transfers between enemy units.`

---

# PEGASUS KNIGHT

## Lucifer [Pegasus Knight] SS>SS/sac:S | no cd | roles: Tanking, Damage, Buff, Healing
SKILL "Power of the Angel": `Triggers immediately after the battle starts. Forms a joint formation with allied melee units in the same row and column, permanently increasing all units' attack, HP, and defense by 20(50)% . When the hero's HP first falls below 30% , transforms into a fallen angel, becomes immune to damage and control, and increases all allied flying units' attack speed by 20(50)% , crit rate by 12(30) , and attack by 20(50)% for 10 seconds, undispellable.`
- S1 `Hero defense +18%`
- S2 `Hero attack +12%`
- S3 `For 60s before battle starts, the entire formation is immune to hard control effects, undispellable.`
- S4 `While in Fallen Angel state, protects all allied squads in the formation, sharing 70% of all damage they receive; undispellable.`
- S5 `Upon transforming into a Fallen Angel, restores all allied squads in the formation to full HP and emits a destructive aura, dealing 200% physical skill damage per second to all enemies in range.`

## Ne Zha [Pegasus Knight] A>S/sac:B | Cooldown: 1s | roles: Stall, Damage
SKILL "Three Heads and Six Arms": `Immune to slow effects; each time a negative effect is received, there is a 50% chance to be immune to it. Triggers at battle start/on taking fatal damage, increasing 12(30)% lifesteal and 30(60)% basic attack damage. Each attack also inflicts an additional basic attack damage (hit and crit calculated independently), stackable up to 2 times, lasting the entire battle. After taking fatal damage for the first time, becomes immune to all damage for 5 seconds. All above effects cannot be dispelled.`
- S1 `Hero attack +12%`
- S2 `Paragon attack increases by 12%.`
- S3 `All units in the squad gain 30% increased attack speed.`
- S4 `After triggering invincibility, if lethal damage is taken again, the unit transforms into a Demon Orb and flies towards the allied Pegasus/Cavalry Hero with the highest attack, granting them a portion of the Three Heads and Six Arms effect (each basic attack deals 2 additional normal attack hits) for 20 seconds.`
- S5 `At the start of battle, Three Heads and Six Arms is fully stacked. While immune to damage, is also immune to negative controls, and each attack can strike up to 3 enemies simultaneously.`
- AWAKENING 1 `Fearless: After the battle begins, damage dealt and damage reduction are increased by 3% .` / 2 `Desperate Hour: Triggers upon first receiving lethal damage: all subsequent basic attacks are guaranteed to hit, and for 5(8) seconds, critical hits are guaranteed and ignore target defense (cannot be dispelled). During this period, defeating an enemy hero extends the duration by 2 seconds (up to 4 times maximum) and increases 12(30)% basic attack damage and basic attack damage reduction for 2 seconds, which cannot be dispelled.` / 3 — та же способность с усиленными числами.

## Smaug [Pegasus Knight] A->S-/sac:A | no cd | roles: Damage, Tanking
SKILL "Dragon Meteor": `At the onset of battle, [Heavy Scaled Armor] is applied, lasting up to 30 seconds and cannot be dispelled. Every 10 seconds, Blazing Dragon Breath accumulates, firing 2(5) Inferno Fireballs at random enemy units at the 10th second, inflicting skill damage equal to 70(130)% of physical attack to all targets in the area (dealing only 10% damage to soldiers). [Heavy Scaled Armor]: Movement speed is reduced by 20% , absorbs damage up to 30(60)% of max HP, reduces physical normal attack damage received by 30(60)% while present, and decreases both defenses of all adjacent enemy units by 32(80)% .`
- S1 `Heroes' attack power increased by 12%.`
- S2 `After casting skill, increase attack by 10%, up to 40%, undispellable.`
- S3 `Enters a berserk state when all friendly unit squads are wiped out, increasing attack speed by 30% and damage by 10%. This effect cannot be dispelled.`
- S4 `At the start of battle, immediately charge up Blazing Dragon Breath, and double the durability of Heavy Scales.`
- S5 `The first Inferno Breath fires 2 additional Hellfireballs, with subsequent Inferno Breaths each firing 1 additional Hellfireball. While charging Inferno Breath, gain +3% Physical Attack and +5% Defend per second; this effect cannot be dispelled and will reset after the breath is released.`

## Golden-Winged Roc [Pegasus Knight] B->A/sac:C | no cd | roles: Buff
SKILL "Golden Wings Eclipse": `At the start of the battle, hides the tactical information of friendly flying units in the same row for 4(10) seconds, making them undetectable by enemy scouts (this effect ends immediately after first contact). Additionally grants a wind shield based on 80(200)% of the hero's physical attack, lasting 15 seconds, undispellable.`
- S1 `Hero attack +12%`
- S2 `This unit deals +30% extra damage to mage.`
- S3 `Hero attack +12%`
- S4 `Damage dealt to targets with over 80% HP is doubled.`
- S5 `While the shield provided by the skill exists, additionally gain +20% attack speed and +25 evasion.`

## Bellerophon [Pegasus Knight] B>B/sac:C | no cd | roles: Tanking, Stall
SKILL "Arcane Portal": `Every 10 seconds after battle starts, summons 2 squads of soldiers. Each squad has 40(100)% HP and permanently increases its max HP by 40(100)% .`
- S1 `Soldier HP +40%`
- S2 `Soldier attack +30%`
- S3 `This unit deals +30% extra damage to archer.`
- S4 `This unit deals +30% extra damage to mage.`
- S5 `Skill will automatically trigger once at battle start.`

## Hilda [Pegasus Knight] B->B-/sac:C | Cooldown: 1s | roles: Debuff
SKILL "Soul Inspiring": `Upon first engagement, reduces attack of the 2 highest magic attack enemy heroes within range by 20(50)% for 15 seconds, undispellable.`
- S1 `Hero defense +18%`
- S2 `Hero HP +6%`
- S3 `50% of damage taken by hero is shared evenly by all soldier squads in the unit.`
- S4 `For 60s before battle starts, the entire formation is immune to hard control effects, undispellable.`
- S5 `Skill target +1`

## Jingwei [Pegasus Knight] B->B-/sac:C | no cd | roles: Damage
SKILL "Unyielding Will": `Every 3 normal attacks will permanently increase the normal attack damage of the unit by 8(20)% . This effect can stack up to 25 times.`
- S1 `Hero defense +18%`
- S2 `Soldier defense +50%`
- S3 `50% of damage taken by hero is shared evenly by all soldier squads in the unit.`
- S4 `Hero attack +12%`
- S5 `Unit attack speed +30%`

---

# PRIEST

## Shennong [Priest] SS>SS/sac:S | no cd | roles: Damage, Healing
SKILL "Alchemical Cauldron of Divine Refinement": `Activates immediately at battle start. All allied units receive the Flame Emperor's blessing, increasing healing received and damage reduction by 12(30)% . Priest units gain an additional 12(30)% boost to healing, attack, HP, and defense. Lasts for the entire battle and cannot be dispelled. Every 6 seconds, a batch of [Elixir] is concocted and distributed to the 5 most injured allied heroes and the 5 least injured enemy heroes, healing/dealing skill damage equal to 80(200)% of magic attack, and increasing/decreasing all attributes by 4(10)% for 10 seconds. Cannot be dispelled. [Elixir]: Starts at First Grade rarity, increasing in rarity with each concoction, up to Ninth Grade. Each advancement increases all effects by 25% .`
- S1 `Hero attack +12%`
- S2 `After each alchemy session, Shennong also consumes a pill.`
- S3 `Before the Elixir is promoted to the 9th transformation, your unit is immune to all control effects and its attack range is doubled.`
- S4 `Triggers when a hero who has received the Elixir falls below 50% HP. Allied/enemy heroes receive healing/magic skill damage equal to Shennong's 500% magic attack plus 10% of their own max HP (triggers once every 10 seconds, up to 3 times per target).`
- S5 `For each allied/enemy hero who dies, an additional Revive Pill/Brokenheart Pill will be crafted and administered to the allied/enemy hero who is most/least injured, resulting in healing or magic skill damage equal to 500% magic attack + 10% of the target's max HP. (For every 4 Revive Pills/Brokenheart Pills crafted, the number of hero casualties required for subsequent crafting increases by 1, up to a maximum of 1 pill for every 5 heroes who die.)`

## Jerome [Priest] A->S-/sac:A | no cd | roles: Healing, Revive
SKILL "Redemption": `After battle starts, triggers every 15 seconds, reviving 1 fallen allied hero back to the battlefield (summoned unit—skills that trigger at battle start/on death/with certain conditions cannot activate; will absorb 40(100)% of skill damage for Jerome), and restoring 20(50)% of their max HP. At the same time, Redemption heals the 2 most injured heroes on the field for 200(500)% magic attack + 12(30)% of their max HP, and permanently increases their max HP by 8(20)% (not stackable).`
- S1 `Hero HP +6%`
- S2 `Hero reduces skill damage received by 33%`
- S3 `Skill will heal Jerome as well`
- S4 `Skill heal +100%`
- S5 `Skill cooldown -20%, First three skills casts on double targets`

## Chang'e [Priest] C>A/sac:B | Cooldown: 1s | roles: Buffs
SKILL "Cold Moonlight": `Triggers immediately after battle begins. All allied units in the same row convert 20(50)% of their current HP into a shield equal to 30(70)% of their max HP. Lasts for the entire battle, undispellable.`
- S1 `+2 soldier squads.`
- S2 `Hero attack +12%`
- S3 `+2 soldier squads.`
- S4 `All soldiers in the unit gain 50% attack at the start of battle, lasting for 50 seconds, undispellable.`
- S5 `Allies affected by the skill restore HP equal to 100% of the hero's magic attack every 10 seconds, undispellable.`

## Nüwa [Priest] C>B+/sac:B | no cd | roles: Healing
SKILL "Creation and Restoration": `Triggers 8 seconds after battle begins, summoning 2 spirit birds to accompany you. Each spirit bird automatically seeks nearby allied heroes and heals them for 40(100)% of Nuwa's magic attack each time.`
- S1 `All soldiers in the unit gain 50% attack at the start of battle, lasting for 50 seconds, undispellable.`
- S2 `Hero reduces skill damage received by 33%`
- S3 `Attack range +20m.`
- S4 `For 60s before battle starts, the entire formation is immune to hard control effects, undispellable.`
- S5 `The Spirit Bird's flight speed is increased, and it heals up to 2 allied heroes along its path for the same amount.`

## Cleopatra [Priest] C>B-/sac:C | no cd | roles: CC
SKILL "Queen's Kiss": `Every 8 seconds after battle starts, charms up to 5 nearby enemies, rendering them unable to act for 5(10) seconds.`
- S1 `Silence duration on hero -80%`
- S2 `Skill target +1`
- S3 `Skill target +1`
- S4 `Skill target +1`
- S5 `Skill will automatically trigger once at battle start.`

## Sarah [Priest] D>C/sac:C | Cooldown: 3s | roles: Healing
SKILL "Healing Sphere": `Normal healing has a 40% chance to heal the 5 most injured nearby allied squads or heroes for 50(200)% magic attack.`
- S1 `Hero attack +12%`
- S2 `Skill target +1`
- S3 `Skill target +1`
- S4 `Skill target +1`
- S5 `Skill heal +20%`

## Orpheus [Priest] F>F/sac:D | Cooldown: 9s | roles: Buffs
SKILL "Song of the Warrior": `Every 10 seconds after battle begins, praises 5 random ally heroes, receiving one random effect: Attack increase by 10(30)% , defense increase by 10(30)% , or attack speed increase by 10(30)% , lasts for 7 seconds, dispellable.`
- S1 `Skill target +1`
- S2 `Skill duration +25%`
- S3 `Skill target +1`
- S4 `Skill will automatically trigger once at battle start.`
- S5 `Skill target +1`

---

# SHIELD GUARD

## Eugene [Shield Guard] A->S/sac:A | Cooldown: 14s | roles: Tanking, Healing
SKILL "Arcane Shield": `Every 15 seconds, grants Arcane Shield to self and up to 2 nearby ally heroes. While the shield is active, 50(200)% of incoming damage is converted into healing for 12 seconds, dispellable.`
- S1 `Soldier HP +40%`
- S2 `All soldiers in the unit gain 50% defense at the start of battle, lasting for 50 seconds, undispellable.`
- S3 `Healing received by hero +20%`
- S4 `Skill will automatically trigger once at battle start.`
- S5 `After casting skill, increase defense by 15%, up to 60%, undispellable.`

## Shuten-dōji [Shield Guard] A->S-/sac:A | no cd | roles: Tanking, Damage
SKILL "Demon King's Domain": `At battle start, every 12 seconds, generates a Demon Tent (can lose up to 50% max HP during duration), lasting 7 seconds, undispellable. Each time this unit takes or deals damage, it gains 1 stack of [Drunken Will]; when 20 stacks are accumulated, [Demon King's Domain] is unleashed. [Drunken Will]: Up to 20 stacks; each stack increases this unit's team's reflect rate by 1.2(3)% . Undispellable. [Demon King's Domain]: This unit's team becomes immune to all control effects, restores 2(5)% max HP per second, and deals physical skill damage equal to 2(5)% of max HP per second to enemies in range. Cannot gain [Drunken Will] during the domain; loses 2 stacks of [Drunken Will] per second while active.`
- S1 `Hero defense +18%`
- S2 `Hero reduces skill damage received by 33%`
- S3 `The activation time of Ghost Canopy is reduced by 2 seconds.`
- S4 `If an enemy hero is slain while Demon King Domain is active, Drunkenness is reset to 20 points.`
- S5 `Upon first engagement or the first time HP drops below 40%, the nearest enemy hero's true body is pulled into the Oni Gourd (untargetable by either side during this period) for 10 seconds, during which Shuten-dōji drains 5% of their max HP each second.`

## Zhu Bajie [Shield Guard] B>A/sac:C | Cooldown: 5s | roles: Tanking
SKILL "Mighty Rake Strike": `Normal attacks have a 60% chance to trigger, dealing skill damage equal to 50(200)% of physical attack to up to 5 enemy squads or heroes near the target. Also permanently increases the attacker's max HP by 5(20)% and defense by 5(20)% , up to 5 stacks.`
- S1 `Hero HP +6%`
- S2 `Healing received by the unit +12%`
- S3 `Hero reduces skill damage received by 33%`
- S4 `For every normal attack, hero restore 1% of max HP.`
- S5 `Each time the skill is cast, restore 10% of max HP.`

## Rubeus Hagrid [Shield Guard] B>A-/sac:B | no cd | roles: Tanking
SKILL "Blessing of Life": `When battle begins, gain 2 Spirit Blessings that remain active throughout and cannot be dispelled. [Bramble Guardian]: Prevents one instance of physical skill damage from heroes; upon activation, heals your unit with 8(20)% maximum HP. Cooldown: 10(8) seconds. [Water Spirit Veil]: Prevents one instance of magical skill damage from heroes; when triggered, raises your unit's 16(40)% damage reduction for 5 seconds, cannot be dispelled. Cooldown: 10(8) seconds.`
- S1 `Hero defense +18%`
- S2 `Hero HP +6%`
- S3 `The cooldown of Elven Blessing is reduced by 30%.`
- S4 `Each time the skill is cast, restore 10% of max HP.`
- S5 `The first time you receive lethal damage, Elven Protection is triggered, nullifying the damage and immediately activating both blessings, with their effects and duration doubled. Both blessing cooldowns are also reset, but their subsequent cooldowns are doubled.`

## King Arthur [Shield Guard] B>C/sac:C | Cooldown: 4s | roles: Tanking, Buffs
SKILL "Defense Halo": `At the start of battle and every 5 seconds after combat begins, triggers an defense aura. This aura follows King Arthur's movement. Each time a skill is cast, all allies within the aura gain 20(50)% physical defense for 10 seconds, dispellable.`
- S1 `Hero HP +6%`
- S2 `50% of damage taken by hero is shared evenly by all soldier squads in the unit.`
- S3 `Healing received by the unit +12%`
- S4 `Skill duration +5s`
- S5 `Soldiers gain +50% defense for 50s at battle start, undispellable.`

## Fianna [Shield Guard] C>C/sac:D | no cd | roles: Tanking
SKILL "Lord's Majesty": `For every 10% HP lost by the unit, it gain 5(5)% physical defense. Additionally, 15 seconds after the battle begins, the unit gain another 20(50)% physical defense boost. These effects undispellable.`
- S1 `Soldier defense +50%`
- S2 `Healing received by the unit +12%`
- S3 `+2 soldier squads.`
- S4 `Soldiers gain +50% defense for 50s at battle start, undispellable.`
- S5 `For the first 20 seconds of battle, restore 2% of the maximum HP of unit per second, undispellable.`

## Brokkr [Shield Guard] D>F/sac:D | no cd | roles: Tanking, Buffs
SKILL "Forge Divine Weapon": `At battle start, for all adjacent friendly formations (up/down/left/right), forge 1 piece of equipment to permanently increase their defense by 4(10)% .`
- S1 `Hero HP +6%`
- S2 `Hero defense +18%`
- S3 `Soldiers gain +50% defense for 50s at battle start, undispellable.`
- S4 `50% of damage taken by hero is shared evenly by all soldier squads in the unit.`
- S5 `Skill will also increase attack by the same amount.`

---

# SPEARMAN

## Akedron Disaster Flame [Spearman] SS>SS/sac:S | no cd | roles: Damage
SKILL "Wraith Pact": `Immediately triggers after battle starts, forming a contract with spearmen units in the 3×3 grid surrounding the caster's formation position. Contracted units gain permanent bonuses: damage, attack speed, and movement speed increased by 20(50)% . When a contracted hero dies, they unleash Hellfire, dealing true damage to up to 5 nearby enemies equal to 120(300)% of their physical attack, and transform into a Harbinger of Calamity inheriting 50% of original stats (each attack additionally damages 1 more enemy; death re-triggers Hellfire).`
- S1 `Duration of negative effects received by hero is reduced by 50%`
- S2 `When Hero's normal attack critically hits, restore 50% of the damage dealt as HP.`
- S3 `90% of damage taken by hero is transferred to the contracted spearman hero and Harbinger of Calamity.`
- S4 `The attributes inherited by the Harbinger of Calamity are doubled, and with each attack, they will additionally deal basic attack damage to 2 other enemy units (hit rate and critical hit are calculated independently).`
- S5 `Before the contracted hero dies, they offer 30% of their own HP, ATK, DEF, and Crit to hero.`

## Tu Xingsun [Spearman] C>A+/sac:C | no cd | roles: Damage
SKILL "Underground Ambush": `When not in combat, burrows underground, becoming untargetable, and empowers the next attack by allied units to deal 200(500)% physical attack skill damage to the target.`
- S1 `Hero attack +12%`
- S2 `Hero attack +12%`
- S3 `Each time hero burrows underground, he immediately restores HP equal to 300% of his physical attack.`
- S4 `Damage dealt to targets with over 80% HP is doubled.`
- S5 `Each time hero engages an enemy, he performs an ambush that deals additional damage equal to 10% of the target's max HP.`

## Mo Li Qing [Spearman] B->B+/sac:A | no cd | roles: Damage
SKILL "Wisdom Blade Severs Delusion": `Triggered at the start of battle. Each time the user suffers a negative effect, gains 1 stack of Azure Barrier. Every 12 seconds or upon reaching 5 stacks, triggers a Azure Slash, striking all enemies in range for 200(500)% physical attack as skill damage (only 10% damage to soldiers). If a fake hero (summon/undead/revived) is hit, also deals 20(50)% of their max HP as true damage. Azure Barrier: + 20(50)% Physical Attack, reduces duration of negative/control effects by 3.9(7.5)% . Max 10 stacks, undispellable. Resets every 10 seconds after full stacks.`
- S1 `Hero attack +12%`
- S2 `When engaged in combat, every 5 seconds reduces Tenacity of both self and target enemy by 10/20 points for 5/10 seconds. Dispellable and stackable.`
- S3 `Each time Enlightenment is gained, it is also shared with the 2 nearest allied spearman heroes. It resets when the user resets or dies.`
- S4 `When first engaging the enemy, immediately gain 4 stacks of [Qinggang]. When receiving lethal damage for the first time, additionally trigger Ultimate · Wisdomblade Slash (area of effect increased by 100%).`
- S5 `Skill kills fake enemies(summon, undead, revived) instantly.`

## Sha Wujing [Spearman] C>B-/sac:C | Cooldown: 7s | roles: Damage
SKILL "Sky-Piercing Thunder": `Normal attacks have a 40% chance to trigger, dealing skill damage to the 3 nearest enemy soldier squads or heroes equal to 80(200)% of physical attack + 4(10)% of the target's max HP. Also reduces their physical defense by 10(30)% for 10 seconds, dispellable.`
- S1 `Hero attack +12%`
- S2 `This unit deals +30% extra damage to cavalry.`
- S3 `Double damage to enemies below 30% HP.`
- S4 `Damage dealt to targets with over 80% HP is doubled.`
- S5 `Skill target +2`

## Mu Zha [Spearman] B->C/sac:B | no cd | roles: Damage
SKILL "Twin Blades of Wu Hook": `Triggered at the start of battle, each normal attack additionally deals 10(25)% of physical attack as physical skill damage + same amount of magic skill damage. If the current enemy hero being attacked dies, the Yin-Yang Twin Swords are summoned: Yang Sword heals the most injured allied hero for 160(400)% of physical attack as HP, Yin Sword strikes the most injured enemy hero, dealing 160(400)% of physical attack as skill damage.`
- S1 `Hero attack +12%`
- S2 `Wu Hook Twin Swords' effects against units below 20% HP are increased by 50%.`
- S3 `The bonus damage from Yin-Yang Twin Swords is doubled.`
- S4 `An additional Yin-Yang Twin Swords strike is triggered every 12 seconds.`
- S5 `Each time the swords are summoned, they leave behind Sword Aura for 5 seconds (stackable). Yang Sword restores 2% of the target's max HP per second, while Yin Sword deals 1% of the target's max HP as true damage per second.`

## Ignatius [Spearman] D>D/sac:C | Cooldown: 1s | roles: Damage
SKILL "Arcane Energy": `The unit permanently gain Arcane Power: attacks deal true damage equal to 10(40)% of physical attack, ignoring all defenses.`
- S1 `Hero attack +12%`
- S2 `Soldier attack +30%`
- S3 `This unit deals +30% extra damage to cavalry.`
- S4 `Hero's attacks additionally deal true damage equal to 1% of the target's current HP.`
- S5 `Unit attack speed +30%`

## Camu [Spearman] F>F/sac:D | no cd | roles: Damage
SKILL "Earth Resonance": `Triggers immediately after the battle starts. While alive, causes earthquakes every 2 seconds, dealing physical skill damage equal to 0.04(0.1)% of current HP to all enemies. Every 20 seconds survived increases the earthquake magnitude, raising the earthquake damage by 100% , with a maximum of 3 increases.`
- S1 `Hero defense +18%`
- S2 `Hero HP +6%`
- S3 `Hero reduces skill damage received by 33%`
- S4 `For the first 20 seconds of battle, restore 2% of the maximum HP of unit per second, undispellable.`
- S5 `At the start of battle and each time the seismic level changes, deal true damage equal to 1% of the target's max HP.`

---

# SWORD MAN

## Chi You [Sword Man] S+>S+/sac:A | no cd | roles: Damage
SKILL "Mad Carnage": `Immediately triggers upon battle start: All soldiers in your unit gain 50(200)% increased Physical Attack, 40(100)% increased Physical Lifesteal, 30(60)% damage reduction from all sources, and their normal attacks ignore Dodge for the entire battle. Simultaneously, Inspire all ground melee units within the "】" range of your formation, granting them 50% of this skill's effect for 120 seconds. These effects cannot be dispelled.`
- S1 `Hero attack +12%`
- S2 `50% of damage taken by hero is shared evenly by all soldier squads in the unit.`
- S3 `All soldiers in the unit gain 50% attack at the start of battle, lasting for 50 seconds, undispellable.`
- S4 `For 60s before battle starts, the entire formation is immune to hard control effects, undispellable.`
- S5 `Each time a hero performs a basic attack, it also deals basic attack damage to up to 3 nearby enemy units around the target (hit and critical chance are calculated separately).`

## Helmar [Sword Man] B+>A+/sac:B | Cooldown: 1s | roles: Tanking
SKILL "Great Viking!": `When HP first drops below 50% , summons 4 Viking heroes near self, each inheriting 30(60)% of the hero's max HP.`
- S1 `Hero HP +6%`
- S2 `This unit deals +30% extra damage to spearmen.`
- S3 `When affected by debuff, hero restores 5% of max HP, cooldown 3s.`
- S4 `50% of damage taken by hero is shared evenly by all soldier squads in the unit.`
- S5 `Skill will automatically trigger once at battle start.`

## Ji Fa [Sword Man] B+>A/sac:B | no cd | roles: Buffs
SKILL "Mandated by Heaven": `Generates a Destiny Field at the start of battle (every 5 seconds, grants allies within range + 12(30)% tenacity and + 8(20) dodge, dispellable). Every 12 seconds, triggers a Destiny Event in the following order, each lasting 10 seconds, undispellable: Turning Misfortune into Blessing: Allies in the field (excluding self) take 8(20)% less damage, losing up to 90(60)% HP. Guided by the Starpath: Self gains + 40(100) dodge; allies in the field gain guaranteed hit and 8(20)% increased attack. Imperial Onslaught: Normal attack damage dealt by allied heroes within the field heals Ji Fa for 30(60)% ; normal attack damage dealt by enemy heroes is redirected to Ji Fa at 20(50)% of the value.`
- S1 `Hero reduces skill damage received by 33%`
- S2 `The interval between Destiny Events is reduced by 2 seconds.`
- S3 `Each time a Destiny Event is triggered, the Emperor's Sword descends, dealing damage to the nearest enemy hero equal to 5% of their current HP × the number of remaining allied heroes in the field (up to a maximum of 50%).`
- S4 `The effective range of the Destiny Field is increased by 25%.`
- S5 `Imperial Onslaught is no longer functions as a Destiny Event and instead becomes a permanent effect. Ji Fa's healing received is permanently increased by 33%.`

## Ao Guang [Sword Man] B>B+/sac:A | no cd | roles: Damage
SKILL "Blade and Flesh as One": `Immediately after battle starts, infuses Water Dragon Blade with dragon spirit. Each basic attack deals additional skill damage equal to 60(150)% physical attack. After every 6 attacks, enters Blade and Flesh as One state, dealing skill damage equal to 60(150)% physical attack to all enemies in a frontal rectangular area (double damage to closer targets, only 10% damage to soldiers), and forms a [Water Dragon Shield] lasting 5 seconds (cannot be dispelled). [Water Dragon Shield]: Gains a shield equal to 120(300)% physical attack; while any shield effect exists, reduces incoming skill damage by an extra 12(30)% .`
- S1 `Heroes' attack power increased by 12%.`
- S2 `For the first 60 seconds of battle, all unit members are immune to control effects and cannot be dispelled.`
- S3 `All units in the unit have their attack speed increased by 30%.`
- S4 `Blade and Flesh as One deals true damage to nearby enemies and restores 15% of self's max HP.`
- S5 `Each time an Ultimate is triggered, grants [Dragon Soul: Water Dragon Shield] to up to 3 nearest allied Sword Man heroes (each basic attack while present deals Dragon Soul damage), lasts 5 seconds, cannot be dispelled.`
- AWAKENING 1 `Fearless: After the battle begins, damage dealt and damage reduction are increased by 3% .` / 2 `Dragon's Roar Across the Seas: Dragon Soul returns the first time HP drops below 50% (instantly recovers 12(30)% max HP, enhances skill damage by 10(25)% , and grants a shield equal to 20(50)% of max HP). Afterwards, Unity of Blade and Body also triggers once every 8 seconds.` / 3 `The first time HP falls below 50% , Dragon Soul is restored (immediately triggers Human-Blade Unity, healing for 20(50)% max HP, boosting skill damage by 16(40)% , and granting a shield worth 40(100)% of max HP). Thereafter, Human-Blade Unity additionally triggers every 6 seconds.`

## Saladin [Sword Man] C+>B-/sac:C | no cd | roles: Buff
SKILL "God's Blessing": `At battle start, increases the attack of all friendly soldiers in the same column as the user by 25(55)% for 50 seconds, dispellable.`
- S1 `The normal attacks of the soldiers in the unit ignore evasion.`
- S2 `Soldier attack +30%`
- S3 `Soldier attack +30%`
- S4 `Soldiers reduces skill damage received by 50%`
- S5 `Skill duration +25%`

## Theseus [Sword Man] C>C/sac:D | Cooldown: 10s | roles: Damage
SKILL "Vengeful Fury": `Has a 30% chance to trigger upon taking damage, dealing 50(200)% physical skill damage per second to the current target for 10 seconds. This effect can only be triggered once every 10 seconds.`
- S1 `Hero attack +12%`
- S2 `Skill trigger rate +10%`
- S3 `Skill damage +20%`
- S4 `Skill triggers once at first engagement.`
- S5 `Skill will also stun the targets for 2 seconds, dispellable.`

## Groom [Sword Man] D>D/sac:D | no cd | roles: Tanking
SKILL "Mortal Greed": `At the start of battle, a random enemy hero's physical body is imbued with Schrodinger's Treasure, causing Grumm to enter an Undispellable Stealth state. The Stealth effect will be removed upon either the first contact with the treasure or after 20 seconds since battle initiation. Once Stealth is dispelled, every 2 seconds, Grumm resets enemy targeting and restores 3(6)% of his maximum HP. [Schrodinger's Treasure]: Grumm will not attack but moves exclusively toward the treasure-holder. On contact, Grumm permanently extracts 10(25)% of the target's max HP (can stack, but each enemy can be affected only once). The treasure then relocates onto another random enemy hero's physical body. If the holder dies before contact occurs, it is treated as a contact and the treasure is redistributed.`
- S1 `Hero HP +6%`
- S2 `Heroes receive 33% less skill damage.`
- S3 `Unit movement speed increased by 50%.`
- S4 `Gain a shield equal to 20% of your max HP for 5 seconds upon touching treasure. Cannot be dispelled.`
- S5 `When self dies, deals true damage equal to 10% of own max HP * number of treasures looted (up to 5) to all enemies within range (only deals 20% of this damage to soldiers).`

---

# КЛАССИФИКАЦИЯ ЭФФЕКТОВ

Счётчики — по **всем 257 героям**, по объединённому тексту (скилл + 5 ступеней сакрамента). Категории пересекаются.

## Урон
| Тип | Кол-во | Пример формулировки |
|---|---|---|
| physical (skill) damage | 44 | `deals 50(200)% physical damage to up to 5 random enemy soldier squads or heroes` |
| magic (skill) damage | 21 | `deal 3 instances of 60(120)% magic damage to the target area` |
| true damage | 36 | `attacks deal true damage equal to 10(40)% of physical attack, ignoring all defenses` |
| % от max/current HP цели | 47 | `deal true damage equal to 20(100)% max HP to 1 random enemy hero in range` |
| DoT (per second / per N sec) | 16 | `dealing 6(18)% of the hero's max HP as magic damage every 2 seconds for 8 seconds` |
| «basic attack damage» как единица урона | ~15 | `deals basic attack damage 3(6) times in a row to the nearest enemy hero` |
| execute / порог HP | 40 | `Double damage to enemies below 30% HP.` / `Skill kills fake enemies instantly` |

Отдельно: почти все AoE-скиллы несут модификатор `only 10% damage to soldiers` (или 20%/50%) — солдаты и герои разделены как разные типы целей.

## Лечение / защита
| Тип | Кол-во | Пример |
|---|---|---|
| heal / restore | 145 | `heals the 2 most injured heroes on the field for 200(500)% magic attack + 12(30)% of their max HP` |
| shield (абсорб) | 46 | `convert 20(50)% of their current HP into a shield equal to 30(70)% of their max HP` |
| damage reduction / «takes X% less» | 88 | `Heroes receive 33% less skill damage.` |
| immunity / invulnerability | 62 | `becomes immune to damage and control` |
| revive / resurrect | 13 | `Revives on death, restoring 40(100)% max HP and permanently increasing own attack and defense by 20(50)%` |
| lifesteal / drain / vampirism | 22 | `increasing 12(30)% lifesteal` / `drains 5% of their max HP each second` |
| reflect | 5 | `it gain a permanent reflect shield: reflect 20(50)% of incoming damage to the source` |
| damage share / redirect | ~20 | `50% of damage taken by hero is shared evenly by all soldier squads in the unit.` |

## Баффы / дебаффы статов
| Тип | Кол-во |
|---|---|
| ATK buff | 154 |
| DEF buff | 65 |
| attack/move speed buff | 95 |
| crit chance / multiplier | 19 |
| ATK debuff | 36 |
| DEF debuff | 12 |

## Контроль
| Тип | Кол-во | Пример |
|---|---|---|
| stun | 29 | `Targets hit are stunned for 3 seconds, dispellable.` |
| fear / charm | 34 | `% chance to inflict fear for 5 seconds, dispellable.` / `charms up to 5 nearby enemies, rendering them unable to act for 5(10) seconds` |
| silence | 17 | `Every 6 seconds, silences up to 2 enemy heroes for 3 seconds, dispellable.` |
| root / immobilize | 8 | `Legs (Root)` / `targets are immobilized` |
| polymorph | 5 | `polymorph up to 5 enemy squads or heroes in the target area into sheep` |
| freeze | 1 | — |
| sleep | 1 | — |
| knockback / pull | 9 | `the nearest enemy hero's true body is pulled into the Oni Gourd` |
| taunt | 0 | явного taunt нет; функцию выполняет `forces the target into combat with itself` |

## Особые механики
| Тип | Кол-во | Пример |
|---|---|---|
| summon | 43 | `summons 4 Viking heroes near self, each inheriting 30(60)% of the hero's max HP` |
| copy / clone / phantom | 8 | `creating a [Phantom] ... inherits 30(60)% of the target's total HP and attack attributes` |
| dispel (снятие бафов/дебафов) | 27 | `dispelling 4(10) negative effects from the user's troops` |
| stackable | 54 | `stacking up to 50%` / `Max 10 stacks` |
| permanent | 95 | `permanently increases own physical attack by 0.8(2)%` |
| aura / team-wide | 50 | `all allied units in the same row` |
| анти-класс бонус | ~25 | `This unit deals +30% extra damage to cavalry.` |
| анти-summon | неск. | `Skill kills fake enemies(summon, undead, revived) instantly.` |

## Диспелл — трёхзначное поле
- `dispellable` явно: **67** скиллов
- `undispellable` / `cannot be dispelled`: **102**
- метка отсутствует: **83**

Вывод для модели данных: `dispellable` — обязательное булево поле на каждом **накладываемом эффекте** (не на скилле целиком): в одном скилле часть эффектов дispellable, часть нет (пример Ne Zha: `All above effects cannot be dispelled`; Jin Zha: эффект `dispellable`, а сакрамент S5 добавляет `[Cripple]` с другим сроком жизни).

---

# ЗАКОНОМЕРНОСТИ В ЧИСЛАХ

## 1. Формат `X(Y)%` — это Lv.1 и Lv.max, и отношение Y/X почти всегда фиксировано
Распределение Y/X по всем 126 найденным парам:

| Y/X | Кол-во |
|---|---|
| **2.50** | **70** |
| 4.00 | 10 |
| 2.00 | 6 |
| 3.00 | 4 |
| прочие (1.67, 1.75, 1.82, 1.92, 2.06, 2.14, 6.25) | по 1–2 |

**Главный вывод: ×2.5 — канонический множитель прокачки скилла (около 70% всех чисел).** Это не «скилл имеет уровни с произвольным ростом», а один общий коэффициент. 4.00 — вторая по частоте ступень (у Kelly 20→100, Nicolai 25→100, Galahad 50→200 — все «×4»). Проектная рекомендация: хранить `base` + `growthTier` (enum: x2, x2.5, x3, x4), а не два независимых числа.

## 2. Гипотеза «шанс × урон в узком коридоре» — ЧАСТИЧНО ПОДТВЕРЖДАЕТСЯ, но коридор широкий
Для скиллов с триггером `Normal attacks have a N% chance` (произведение = chance × damage_max / 100):

| Герой | Класс | Тир | CD | Шанс | Урон X(Y)% | Тип | chance×Ymax |
|---|---|---|---|---|---|---|---|
| Medusa | Mage | B->A | 3 | 30% | 8(20)% | — | 6 |
| Miranda Leva | Archer | A+>A+ | 7 | 50% | 12(30)% | +skill dmg taken | 15 |
| Kepler | Archer | ?? | — | 40% | 20(50)% | — | 20 |
| William Wallace | Sword Man | B->B- | 3 | 50% | 20(50)% | phys | 25 |
| Morgan le Fay | Mage | B+>A+ | 5 | 50% | 20(50)% | — | 25 |
| Red Boy | Spearman | D>D | 5 | 60% | 20(50)% | phys | 30 |
| Merlin | Mage | A->S | 3 | 40% | 60(120)% | magic ×3 инстанса | 48 |
| Nicolai | Archer | C>A | 5 | 50% | 25(100)% | phys | 50 |
| Xiao Bailong | Mage | B->A+ | 5 | 50% | 40(100)% | magic | 50 |
| Galahad | Cavalry | B>A- | 5 | 40% | 50(200)% | phys | 80 |
| Gawain | Spearman | C>B+ | 5 | 40% | 50(200)% | phys | 80 |
| Mary Read | Archer | B+>B+ | 5 | 40% | 50(200)% | phys | 80 |
| Dahlia | Mage | B->C | 6 | 30% | 100(300)% | magic | 90 |
| Edward | Archer | A->A- | 6 | 50% | 50(200)% | phys | 100 |
| Aindor | Cavalry | B>A- | 5 | 50% | 80(200)% | phys | 100 |
| Cryptic Frostwhisper | Mage | B>B+ | 6 | 25% | 210(450)% | magic | 112.5 |
| Reglos | Archer | B>S | 4 | 40% | 120(300)% | phys | 120 |
| Dracula | Mage | B->B- | 5 | 50% | 120(300)% | magic | 150 |
| Jin Zha | Mage | B>S- | 5 | 50% | 120(300)% | magic | 150 |

Медиана произведения = 80, диапазон 6…150 (без учёта выбросов — 25…150, разброс ×6). Это **не узкий коридор**, но видна чёткая структура:
- **Шанс дискретен**: только 10 / 25 / 30 / 40 / 50 / 60 / 65%. Модальные значения — 40% и 50%.
- **Урон дискретен**: 20(50), 50(200), 80(200), 120(300), 100(300) — повторяющиеся «пресеты», а не непрерывная шкала.
- Компенсация идёт не через chance×damage, а через **дополнительные эффекты**: у скиллов с низким произведением почти всегда есть контроль или дебафф (Medusa 6 — но это контроль; Miranda 15 — polymorph+immobilize; Morgan 25 — дебафф). У «чистого урона» (Galahad, Edward, Aindor, Reglos, Dracula) произведение 80–150.
- **Корреляция произведения с тиром слабая.** Reglos (B>S, prod=120) и Dracula (B->B-, prod=150) почти равны, но тир различается на 5 ступеней. Тир определяется не числом урона, а качеством выбора цели и наличием снежного кома: Reglos бьёт `most heavily wounded enemy hero` и при killе стреляет второй раз; Dracula бьёт без селекции.

**Практический вывод для баланса: балансирующая величина — не chance×damage, а (chance × damage × target_count × target_quality).** Galahad при prod=80 бьёт `up to 5` целей и стунит — эффективно 400 + контроль; Kelly при prod=10 (10% × 100% maxHP) бьёт 1 цель, но уроном от макс. HP, что игнорирует защиту.

## 3. Таймерные скиллы: период жёстко привязан к силе
Для триггера `Every N seconds` (условный «DPS» = Ymax / N):

| Герой | Тир | Период | Урон | DPS-экв |
|---|---|---|---|---|
| Hou Yi | A->S | 5s | 600(1200)% | 240.0 |
| Reginleif | B>B+ | 6s | 150(450)% | 75.0 |
| Kong Xuan | A->A+ | 4s | 80(200)% | 50.0 |
| Mo Li Qing | B->B+ | 12s | 200(500)% | 41.7 |
| Sylna Windrunner | A>S- | 10s | 220(400)% | 40.0 |
| Aesath | A+>S+ | 5s | 80(200)% | 40.0 |
| Harry Holt | A->S- | 7s | 80(200)% | 28.6 |
| Torbad | ?? | 10s | 100(250)% | 25.0 |
| Theseus | C>C | 10s | 50(200)% | 20.0 |
| Gong Gong | ?? | 10s | 80(200)% | 20.0 |
| Wen Zhong | A>S | 12s | 80(200)% | 16.7 |
| Eugene | A->S | 15s | 50(200)% | 13.3 |
| Yi Sun-sin | C>S | 3s | 12(30)% | 10.0 |
| Heimdall | S>S | 10s | 40(100)% | 10.0 |
| Musashibō Benkei | C>A- | 10s | 32(80)% | 8.0 |
| Cui Ben | ?? | 2s | 6(15)% | 7.5 |
| Jerome | A->S- | 15s | 40(100)% | 6.7 |
| Ao Run | A+>S | 10s | 20(50)% | 5.0 |
| Ji Fa | B+>A | 5s | 8(20)% | 4.0 |
| Massasoit | A->S | 5s | 6(15)% | 3.0 |
| Yunxiao | A>S | 8s | 13(25)% | 3.1 |
| Van Helsing | B->A+ | 2s | 2(5)% | 2.5 |
| Weaving Maiden | C>B- | 12s | 12(30)% | 2.5 |
| Cupid | B+>S | 15s | 12(30)% | 2.0 |
| Kua Fu | B>A | 2s | 0.6(1.5)% | 0.8 |

Здесь связь «сила ↔ тир» тоже слабая: низкий DPS-экв у Cupid (S) и Yi Sun-sin (S) — но это скиллы поддержки/контроля, а не урона. **Урон в процентах от maxHP цели всегда мал по числу (0.6–13%), но по факту сильнее процентов от атаки.** Их нельзя сравнивать в одной шкале — нужны разные единицы измерения в модели данных.

## 4. Кулдаун — не то, чем кажется
Распределение поля Cooldown по 257 героям: **0/отсутствует — 168**, 5s — 24, 1s — 15, 4s — 10, 7s — 8, 3s и 6s — по 7, 9s — 6, 10s — 4, остальные единичны (max 19s).

**65% героев вообще не имеют кулдауна** — это пассивки, срабатывающие at battle start. Поле `Cooldown` заполнено почти только у proc-скиллов (`normal attacks have X% chance`) и служит **внутренним ICD (internal cooldown) прока**, а не временем восстановления активной способности. При этом период `every N seconds` пишется **в тексте скилла**, а не в поле Cooldown (Eugene: поле `Cooldown: 14s`, а текст говорит `Every 15 seconds` — числа расходятся, поле ненадёжно).

## 5. Триггеры — таксономия по частоте (по 257 скиллам)
| Триггер | Кол-во | Дословный шаблон |
|---|---|---|
| battle start | 121 | `Triggers immediately after battle start` / `At the start of the battle` / `Triggered at the start of battle` |
| every N seconds | 104 | `Every 20 seconds after battle starts` / `Triggers every 12 seconds after battle begins` |
| % chance (любой) | 54 | `has a 30% chance to` |
| normal-attack proc | 39 | `Normal attacks have a 40% chance to trigger` |
| on kill | 9 | `when killing an enemy or missing an attack` / `Each kill permanently increases` |
| HP threshold | 5 | `When HP drops below 50%` / `When the hero's HP first falls below 30%` |
| on taking damage | 3 | `When taking damage, has a 30% chance to` |
| every N attacks | ~12 | `Every 2 basic attacks` / `After every 6 attacks` / `Triggers every 4 attacks` |
| on first engagement | ~10 | `Upon first engaging the enemy` |
| on death / fatal damage | ~15 | `Before receiving fatal damage for the first time` / `When self dies` |

Отдельно отмечу: **триггеры комбинируются в одном скилле через слэш**. Valente: `At the start of the battle/every 5 seconds/every time an enemy hero is defeated/the user's HP drops below 80% / 60% / 40% / 20%`. Модель данных должна допускать **список триггеров на одном скилле**, а не один enum.

Также встречается **счётчик-накопитель как триггер**: Shuten-dōji (`when 20 stacks are accumulated`), Mo Li Qing (`Every 12 seconds or upon reaching 5 stacks` — таймер ИЛИ стаки), Marco Polo (`For every 5 enemy soldiers or 1 enemy hero defeated`, при этом `unused barrages are stored` — очередь несработавших зарядов).

## 6. Выбор целей — таксономия
| Селектор | Кол-во | Шаблон |
|---|---|---|
| `up to N` (squads/heroes/units) | 41 | `up to 5 enemy squads or heroes` |
| nearest / closest | 39 | `to the nearest enemy hero` |
| all in range | 22 | `all enemies in range` |
| same row / column / adjacent | 22 | `allied units in the same row` |
| most injured / lowest HP | 15 | `the 5 most injured allied heroes` / `most heavily wounded enemy hero` |
| N random | 12 | `5 random enemy heroes` |
| highest <stat> | 11 | `the highest physical defense enemy hero` |
| furthest / farthest | 11 | `the 3(9) farthest enemy heroes` |
| all on battlefield | 3 | `all enemy heroes on the battlefield` |

Ключевое: **цель — это либо hero, либо soldier squad**, и почти всегда указывается «squads or heroes». Позиционные селекторы (`same row`, `3×3 grid`, `frontal rectangular area`, `"】" range`) привязаны к сетке расстановки — модель должна знать формацию, а не только список юнитов.

---

# САКРАМЕНТ: ЧТО МЕНЯЕТ КАЖДАЯ СТУПЕНЬ

Посчитано по всем 257 героям × 5 ступеней (1285 записей).

## Средняя длина текста ступени (символов) — монотонный рост
| Ступень | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| ср. длина | **25** | **49** | **70** | **95** | **248** |
| плоский стат-бафф | 168 | 68 | 21 | 8 | 3 |
| «Skill target +N» | 1 | 9 | 10 | 14 | 12 |
| апгрейд/замена скилла | 0 | 2 | 1 | 2 | **11** |
| райдер «After casting skill / Each time the skill is cast» | 5 | 24 | 34 | 28 | 18 |
| добавляет контроль (stun/fear/silence/...) | 1 | 4 | 7 | 7 | **42** |
| добавляет лечение | 4 | 38 | 53 | 42 | **63** |
| добавляет щит | 3 | 4 | 5 | 7 | 13 |
| меняет условие срабатывания | 0 | 2 | 3 | 8 | **12** |
| снижение кулдауна | 0 | 0 | 1 | 2 | 2 |

**Это самая чистая закономерность во всём датасете.** Сакрамент — не пять равных ступеней, а градиент от «числовой бустер» к «переписывание скилла»:
- **S1–S2** — почти всегда шаблонный плоский стат из маленького пула (168 из 257 первых ступеней — плоский стат).
- **S3–S4** — райдеры к скиллу («каждый каст даёт X», «+1 цель»), стат-бустеры почти исчезают (21 → 8).
- **S5** — уникальный текст у **195 из 257** героев (76%). Именно здесь: `upgraded to <новое имя скилла>` (12 героев), новый контроль (42), новое условие (12).

## Пул шаблонов ступени 1 (38 уникальных на 257 героев)
| Кол-во | Текст |
|---|---|
| 73 | `Hero attack +12%` |
| 52 | `Hero HP +6%` |
| 30 | `Heroes' attack power increased by 12%.` (дубль формулировки первого) |
| 19 | `Hero defense +18%` |
| 13 | `Hero reduces skill damage received by 33%` |
| 12 | `Soldier attack +30%` |
| 5 | `Soldier HP +40%` |
| 5 | `Heroes receive 33% less skill damage.` (дубль пятого) |
| 4 | `Soldier defense +50%` |
| 3 | `This unit deals +30% extra damage to shield guard.` |
| 3 | `The normal attacks of the soldiers in the unit ignore evasion.` |
| 3 | `Attack range +20m.` |
| 3 | `Duration of negative effects received by hero is reduced by 50%` |
| 3 | `Healing received by hero +20%` |
| 2 | `Skill duration +25%` |
| 2 | `50% of damage taken by hero is shared evenly by all soldier squads in the unit.` |
| 2 | `Double damage to enemies below 30% HP.` |

Обратите внимание: **проценты фиксированы намертво** — всегда +12% атака, +6% HP, +18% защита, +30% атака солдат, +40% HP солдат, +50% защита солдат, +33% снижение скилл-урона, +20м дальность. Это готовый **справочник модификаторов**, а не индивидуальные числа. В модели данных это `sacrament_step -> modifier_id` из общей таблицы, а не свободный текст.

## Топ шаблонов ступеней 2–4 (771 запись)
| Кол-во | Текст |
|---|---|
| 32 | `After casting skill, increase attack by 10%, up to 40%, undispellable.` |
| 22 | `Skill target +1` |
| 22 | `Hero reduces skill damage received by 33%` |
| 21 | `Heroes receive 33% less skill damage.` |
| 18 | `Hero attack +12%` |
| 17 | `Attack range +20m.` |
| 17 | `Hero defense +18%` |
| 17 | `Each time the skill is cast, restore 10% of max HP.` |
| 16 | `Soldier attack +30%` |
| 15 | `50% of damage taken by hero is shared evenly by all soldier squads in the unit.` |
| 14 | `Unit attack speed +30%` |
| 13 | `All soldiers in the unit gain 50% attack at the start of battle, lasting for 50 seconds, undispellable.` |
| 12 | `Healing received by hero +20%` |
| 11 | `After casting skill, increase defense by 15%, up to 60%, undispellable.` |
| 10 | `After casting skill, the current engaged enemy unit takes +6% permanent extra normal attack damage, up to 30%, undispellable.` |
| 10 | `+2 soldier squads.` |

## Отдельный вывод по «Skill target +N»
Это самый частый способ усилить скилл сакраментом (22 раза на ступенях 2–4, ещё 12 на ступени 5). Встречаются `+1`, `+2`, `+3`. Крайний случай — Sarah (S2/S3/S4 = `Skill target +1` трижды: 5 → 8 целей) и Cleopatra (то же самое). **Количество целей — первичный балансный рычаг игры**, а не процент урона.

## Шестая система: AWAKENING
У **32 из 257** героев после сакрамента есть отдельный блок **Awakening** с собственными ступенями (обнаружено до 3). Герои: Sun Wukong, Bull Demon King, Ne Zha, Yang Jian, Jiang Ziya, Jane, Selidenn, Ao Guang, Ao Run, Zhao Gongming, Taiyi Zhenren, Shen Gongbao, Cupid, Xingtian, Gong Gong, Zhurong, Kua Fu, Yinglong, Harry Holt, Hermione Granger, Zoro, Cui Ben, Da Vinci, Copernicus, Michelangelo и др.

Структура: ступень 1 — универсальная у всех (`Fearless: After the battle begins, damage dealt and damage reduction are increased by 3% .`), ступени 2 и 3 — **одна и та же именованная способность с разными числами** (2 = слабая версия, 3 = сильная). Пример Sun Wukong:
- 2 `Blood Mimicry: At the start of battle, an additional Avatar inheriting 40(70)% of self's stats is summoned (not a summoned creature, cannot be copied or revived, casts Clone Beyond Taoism once every 10 seconds...). Lasts for 66 seconds.`
- 3 `Blood Mimicry: ... inheriting 70(100)% of your attributes ... releases Clone Beyond Taoism once every 8 seconds ... Lasts for 99 seconds.`

То есть Awakening 2→3 — не новый эффект, а **тот же эффект с апгрейдом чисел И периода** (10s→8s, 66s→99s, 40(70)→70(100)).

---

# ЧТО НЕ УДАЛОСЬ ПОЛУЧИТЬ

1. **18 ID отдают HTTP 500 и недоступны в принципе** — не rate-limit, а поломанные страницы (проверено повторно в конце сессии: 4030 и 4224 стабильно 500). Список: 4030, 4038, 4040, 4043, 4044, 4045, 4050, 4051, 4052, 4053, 4055, 4057, 4058, 4067, 4186, 4224, 4226, 4274. Итог 258 героев совпадает с ожидаемым числом, так что это, скорее всего, дыры в нумерации, а не потерянные герои.
2. **Zeus (ID 4183, Sword Man, скилл «Wrath of Olympus»)** — страница отдаётся, но блок текста скилла пуст на самой вики; сакрамент считался нормально (S1 `Hero attack +12%`). Пробел в источнике, не в парсинге.
3. **Тиры у 55 героев не проставлены («??»)** — Odin, Athena, Apollo, Napoleon, Zhong Kui, Hel, Mo Li Hong/Hai/Shou, Alash, Yu Hua, Qi Bo и др. Вики заархивирована 24 декабря 2025, эти герои не успели получить оценку. Для балансного анализа по тирам они исключены.
4. **Awakening собран не полностью.** Мой парсер вычленял блок сакрамента, и текст Awakening попадал «хвостом» в пятую ступень. Я подтвердил наличие у 32 героев и разобрал структуру на примерах Sun Wukong / Ne Zha / Ao Guang, но **отдельной чистой таблицы Awakening по всем 32 героям нет**. Если нужна — это ещё один проход с поправленным парсером (данные доступны, страницы читаются).
5. **Числа уровней между Lv.1 и Lv.max не даны нигде** — вики публикует только `X(Y)%`, промежуточные ступени прокачки скилла отсутствуют. Кривая между ними неизвестна (линейная или нет — из вики не выводится).
6. **Поле `Range:` на страницах героев почти всегда пустое** — заголовок есть, значения нет. Дальность скиллов из вики получить нельзя.
7. **Поле Cooldown ненадёжно** для таймерных скиллов: расходится с текстом (Eugene — поле 14s, текст `Every 15 seconds`). Доверять следует тексту скилла.
8. Собраны только публичные HTML-страницы вики. Ассеты, код и клиентские данные игры не трогал.