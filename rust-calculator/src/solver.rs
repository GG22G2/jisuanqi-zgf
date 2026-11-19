use crate::calculator::{Calculator, ChefInternal, RecipeInternal};
use crate::global_addition::GlobalAddition;
use crate::gpu_calculator::{GpuContext, Stage1Input};
use crate::models::*;
use crate::search::*;
use crate::skill_effect::SkillEffect;
use rayon::prelude::*;
use std::collections::HashMap;
use std::sync::OnceLock;

static PERMUTATIONS: OnceLock<Vec<[usize; 9]>> = OnceLock::new();

pub fn get_recipe_permutations() -> &'static [[usize; 9]] {
    PERMUTATIONS.get_or_init(|| {
        let mut result = Vec::with_capacity(1680);
        let mut tmp = [0usize; 9];
        let mut count = [0usize; 3];
        permute_helper(&mut result, &mut tmp, &mut count, 0);
        result
    })
}

fn permute_helper(
    result: &mut Vec<[usize; 9]>,
    tmp: &mut [usize; 9],
    count: &mut [usize; 3],
    start: usize,
) {
    if count[0] + count[1] + count[2] == 9 {
        result.push(*tmp);
        return;
    }
    for j in 0..3 {
        if count[j] == 3 {
            continue;
        }
        tmp[j * 3 + count[j]] = start;
        count[j] += 1;
        permute_helper(result, tmp, count, start + 1);
        count[j] -= 1;
    }
}

pub struct ParsedRule {
    pub recipe_reward: Vec<f64>,
    pub material_count: Vec<i32>,
    pub sex_reward: [f64; 2],
}

pub fn parse_rule(
    rule_data: &RuleDataRaw,
    num_recipes: usize,
    recipe_id_map: &HashMap<u32, usize>,
    official_recipes: &[RecipeRaw],
) -> Option<ParsedRule> {
    for rule in &rule_data.rules {
        let title = rule.title.as_deref().unwrap_or("");
        if !title.contains("御前") {
            continue;
        }

        let mut recipe_reward = vec![-1000.0f64; num_recipes + 1];

        if let Some(effect_map) = &rule.recipe_effect {
            for (k, &v) in effect_map {
                if let Ok(orig_id) = k.parse::<u32>() {
                    if let Some(&compact_id) = recipe_id_map.get(&orig_id) {
                        if compact_id < recipe_reward.len() {
                            recipe_reward[compact_id] = v;
                        }
                    }
                }
            }
        } else {
            recipe_reward.fill(0.0);
        }

        let mut material_count = vec![5000i32; 47];
        if let Some(mat_limit) = &rule.materials_limit {
            if let Some(obj) = mat_limit.as_object() {
                for (k, v) in obj {
                    if let Ok(idx) = k.parse::<usize>() {
                        if idx < material_count.len() {
                            material_count[idx] = v.as_i64().unwrap_or(5000) as i32;
                        }
                    }
                }
            } else if let Some(val) = mat_limit.as_i64() {
                material_count.fill(val as i32);
            }
        }

        let mut sex_reward = [0.0f64, 0.0f64];
        if let Some(tag_effect) = &rule.chef_tag_effect {
            if let Some(&v1) = tag_effect.get("1") {
                sex_reward[0] = v1;
            }
            if let Some(&v2) = tag_effect.get("2") {
                sex_reward[1] = v2;
            }
        }

        if let Some(cond_effect) = &rule.condiment_effect {
            for r in official_recipes {
                if let Some(&compact_id) = recipe_id_map.get(&r.recipe_id) {
                    if let Some(cond) = &r.condiment {
                        if let Some(&cv) = cond_effect.get(cond) {
                            if compact_id < recipe_reward.len() {
                                recipe_reward[compact_id] += cv;
                            }
                        }
                    }
                }
            }
        }

        if let Some(skill_effect) = &rule.skill_effect {
            for r in official_recipes {
                if let Some(&compact_id) = recipe_id_map.get(&r.recipe_id) {
                    let mut add = 0.0;
                    if r.stirfry > 0 { add += skill_effect.get("stirfry").copied().unwrap_or(0.0); }
                    if r.boil > 0 { add += skill_effect.get("boil").copied().unwrap_or(0.0); }
                    if r.knife > 0 { add += skill_effect.get("knife").copied().unwrap_or(0.0); }
                    if r.fry > 0 { add += skill_effect.get("fry").copied().unwrap_or(0.0); }
                    if r.bake > 0 { add += skill_effect.get("bake").copied().unwrap_or(0.0); }
                    if r.steam > 0 { add += skill_effect.get("steam").copied().unwrap_or(0.0); }

                    if compact_id < recipe_reward.len() {
                        recipe_reward[compact_id] += add;
                    }
                }
            }
        }

        if let Some(mat_effect) = &rule.materials_effect {
            let mut mat_map = HashMap::new();
            for item in mat_effect {
                mat_map.insert(item.material_i_d, item.effect);
            }
            for r in official_recipes {
                if let Some(&compact_id) = recipe_id_map.get(&r.recipe_id) {
                    let mut add = 0.0;
                    for mat in &r.materials {
                        if let Some(&eff) = mat_map.get(&mat.material) {
                            add += eff;
                        }
                    }
                    if compact_id < recipe_reward.len() {
                        recipe_reward[compact_id] += add;
                    }
                }
            }
        }

        if let Some(rarity_effect) = &rule.rarity_effect {
            for r in official_recipes {
                if let Some(&compact_id) = recipe_id_map.get(&r.recipe_id) {
                    if let Some(&eff) = rarity_effect.get(&r.rarity.to_string()) {
                        if compact_id < recipe_reward.len() {
                            recipe_reward[compact_id] += eff;
                        }
                    }
                }
            }
        }

        return Some(ParsedRule {
            recipe_reward,
            material_count,
            sex_reward,
        });
    }

    None
}

const MATERIAL_TAG: [&str; 47] = [
    "留空", "肉", "鱼", "肉", "肉", "肉", "菜", "肉", "肉", "肉", "菜", "面", "肉", "菜", "菜",
    "菜", "菜", "菜", "菜", "菜", "面", "面", "菜", "菜", "鱼", "菜", "肉", "肉", "肉", "面",
    "菜", "菜", "鱼", "菜", "面", "面", "菜", "鱼", "肉", "肉", "肉", "鱼", "鱼", "肉", "肉",
    "菜", "菜",
];

pub fn build_recipe_internal(
    raw: &RecipeRaw,
    compact_id: usize,
    ex: bool,
) -> RecipeInternal {
    let price = raw.price + if ex { raw.ex_price.unwrap_or(0) } else { 0 };
    let cond = raw.condiment.clone().unwrap_or_default();
    let is_tasty = cond == "Tasty";
    let is_salty = cond == "Salty";
    let is_spicy = cond == "Spicy";
    let is_sweet = cond == "Sweet";
    let is_bitter = cond == "Bitter";
    let is_sour = cond == "Sour";

    let mut tags = [0.0f64; 4];
    let mut feature = 0u64;
    let mut mats = Vec::new();

    for m in &raw.materials {
        mats.push((m.material, m.quantity));
        feature |= 1u64 << (m.material as u64);
        if m.material < MATERIAL_TAG.len() {
            match MATERIAL_TAG[m.material] {
                "面" => tags[0] = 1.0,
                "肉" => tags[1] = 1.0,
                "菜" => tags[2] = 1.0,
                "鱼" => tags[3] = 1.0,
                _ => {}
            }
        }
    }

    RecipeInternal {
        recipe_id: compact_id,
        original_id: raw.recipe_id,
        name: raw.name.clone(),
        rarity: raw.rarity,
        price,
        ex_price: raw.ex_price.unwrap_or(0),
        stirfry: raw.stirfry,
        bake: raw.bake,
        boil: raw.boil,
        steam: raw.steam,
        fry: raw.fry,
        knife: raw.knife,
        condiment: cond,
        is_tasty,
        is_salty,
        is_spicy,
        is_sweet,
        is_bitter,
        is_sour,
        tags,
        materials: mats,
        limit: raw.limit,
        material_feature: feature,
        p_index: 0,
        count: 0,
        reward_price: 0.0,
        estimated_chef_add: 0.0,
        estimated_reward_price: 0.0,
        candidate_source_mask: 0,
        candidate_source_count: 0,
        candidate_sort_score: 0.0,
        candidate_best_chef_score: 0.0,
        candidate_rule_hits: 0,
        candidate_chef_hits: 0,
    }
}

pub fn build_chef_skill_effect(
    chef: &ChefRaw,
    is_ult: bool,
    skill_map: &HashMap<u32, SkillRaw>,
    equip_map: &HashMap<u32, EquipRaw>,
    user_equip_id: Option<u32>,
    partial_effects: Option<&[crate::models::SkillEffectRaw]>,
) -> SkillEffect {
    let mut eff = SkillEffect::default();
    let tags = chef.tags.as_deref();

    if let Some(skill) = skill_map.get(&chef.skill) {
        for e in &skill.effect {
            eff.apply_effect(e, tags);
        }
    }

    let mut double_equip = false;
    if is_ult {
        for ult_id in chef.get_ultimate_skills() {
            if ult_id == 528 {
                double_equip = true;
            }
            if let Some(skill) = skill_map.get(&ult_id) {
                for e in &skill.effect {
                    eff.apply_effect(e, tags);
                }
            }
        }
    }

    if let Some(eq_id) = user_equip_id {
        if let Some(eq) = equip_map.get(&eq_id) {
            for &sk_id in &eq.skill {
                if let Some(skill) = skill_map.get(&sk_id) {
                    for e in &skill.effect {
                        eff.apply_effect(e, tags);
                        if double_equip {
                            eff.apply_effect(e, tags);
                        }
                    }
                }
            }
        }
    }

    if let Some(pe_list) = partial_effects {
        for pe in pe_list {
            eff.apply_partial_effect(pe, tags);
        }
    }

    eff
}

pub fn cal_i(i: i32, n: i32) -> i32 {
    let i_f = i as f64;
    let n_f = n as f64;
    let term1 = i_f * (i_f - 1.0) * (i_f - 3.0 * n_f - 2.0) / 6.0;
    let term2 = i_f * n_f * (n_f + 1.0) / 2.0;
    (term1 + term2).round() as i32
}

pub fn cal_j(i: i32, j: i32, n: i32) -> i32 {
    let count = j - i;
    let start = n - i - 2;
    let end = start - count + 1;
    (start + end) * count / 2
}

pub fn get_index(i: usize, j: usize, k: usize, recipe_count: usize) -> usize {
    let c1 = cal_i(i as i32, (recipe_count as i32) - 2);
    let c2 = cal_j(i as i32, (j as i32) - 1, recipe_count as i32);
    let c3 = (k - j - 1) as i32;
    (c1 + c2 + c3) as usize
}

#[derive(Clone, Debug)]
pub struct UniquePlayRecipe {
    pub recipe: RecipeInternal,
    pub count: u32,
    pub index: usize,
}

pub async fn solve_full(
    official_data: &OfficialGameDataRaw,
    my_game_data: &MyGameDataRaw,
    rule_data: &RuleDataRaw,
    config: &CalConfig,
    gpu: &GpuContext,
) -> Result<FinalTopResult, String> {
    let total_start = std::time::Instant::now();

    // 1. Build compact recipe map
    let mut recipe_id_map = HashMap::new();
    for (i, r) in official_data.recipes.iter().enumerate() {
        recipe_id_map.insert(r.recipe_id, i);
    }

    let parsed_rule = parse_rule(
        rule_data,
        official_data.recipes.len(),
        &recipe_id_map,
        &official_data.recipes,
    )
    .ok_or_else(|| "Failed to parse rule".to_string())?;

    let mut chef_raw_map = HashMap::new();
    for c in &official_data.chefs {
        chef_raw_map.insert(c.chef_id, c);
    }

    let mut skill_map = HashMap::new();
    for s in &official_data.skills {
        skill_map.insert(s.skill_id, s.clone());
    }

    let mut equip_map = HashMap::new();
    for eq in &official_data.equips {
        equip_map.insert(eq.equip_id, eq.clone());
    }

    // 2. Parse user data
    let mut user_chef_ult = HashMap::new();
    let mut user_chef_equip = HashMap::new();
    let mut owned_chef_raws = Vec::new();

    for uc in &my_game_data.chefs {
        if uc.got.as_deref() == Some("是") {
            if let Some(c) = chef_raw_map.get(&uc.id) {
                let ult = uc.ult.as_deref() == Some("是");
                user_chef_ult.insert(uc.id, ult);
                if let Some(eq) = uc.equip {
                    user_chef_equip.insert(uc.id, eq);
                }
                owned_chef_raws.push((*c).clone());
            }
        }
    }

    let global_addition = GlobalAddition::build(&owned_chef_raws, &user_chef_ult, &skill_map);

    let mut user_recipes: Vec<RecipeInternal> = Vec::new();
    for ur in &my_game_data.recipes {
        if ur.got.as_deref() == Some("是") {
            if let Some(&compact_id) = recipe_id_map.get(&ur.id) {
                let raw_r = &official_data.recipes[compact_id];
                let ex = ur.ex.as_deref() == Some("是");
                user_recipes.push(build_recipe_internal(raw_r, compact_id, ex));
            }
        }
    }

    // 3. Filter owned chefs
    let mut filtered_chefs: Vec<ChefRaw> = owned_chef_raws
        .into_iter()
        .filter(|c| config.must_chefs.contains(&c.name) || c.rarity >= config.chef_min_rarity)
        .collect();
    filtered_chefs.sort_by_key(|c| c.chef_id);

    // 4. Presence chefs (e.g., 兰飞鸿)
    let mut presence_chefs: Vec<ChefInternal> = Vec::new();
    for c in &filtered_chefs {
        if c.name == "兰飞鸿" {
            let mask = 0b01u32;
            let is_ult = user_chef_ult.get(&c.chef_id).copied().unwrap_or(false);
            let eq = user_chef_equip.get(&c.chef_id).copied();

            let mut partial_effects = Vec::new();
            if let Some(sk) = skill_map.get(&c.skill) {
                for eff in &sk.effect {
                    if eff.condition.as_deref() == Some("Partial") {
                        partial_effects.push(eff.clone());
                    }
                }
            }
            if is_ult {
                for ult_id in c.get_ultimate_skills() {
                    if let Some(sk) = skill_map.get(&ult_id) {
                        for eff in &sk.effect {
                            if eff.condition.as_deref() == Some("Partial") {
                                partial_effects.push(eff.clone());
                            }
                        }
                    }
                }
            }

            // Self partial clone
            let clone_self_eff =
                build_chef_skill_effect(c, is_ult, &skill_map, &equip_map, eq, None);
            let remark = if let Some(eq_id) = eq {
                equip_map.get(&eq_id).map(|e| e.name.clone()).unwrap_or_default()
            } else {
                String::new()
            };
            presence_chefs.push(ChefInternal {
                chef_id: c.chef_id,
                name: c.name.clone(),
                rarity: c.rarity,
                stirfry: c.stirfry,
                bake: c.bake,
                boil: c.boil,
                steam: c.steam,
                fry: c.fry,
                knife: c.knife,
                tags: c.tags.clone(),
                ult: is_ult,
                mask,
                match_mask: 0,
                index: 0,
                remark,
                skill_effect: clone_self_eff,
            });

            // Compatible other chefs
            for oc in &filtered_chefs {
                if oc.name == c.name {
                    continue;
                }
                let mut matched_pe = Vec::new();
                for pe in &partial_effects {
                    if pe.condition_type.as_deref() == Some("ChefTag") {
                        if let Some(self_tags) = &oc.tags {
                            if let Some(cond_list) = &pe.condition_value_list {
                                if self_tags.iter().any(|t| cond_list.contains(t)) {
                                    matched_pe.push(pe.clone());
                                }
                            }
                        }
                    } else {
                        matched_pe.push(pe.clone());
                    }
                }
                if matched_pe.is_empty() {
                    continue;
                }

                let oc_ult = user_chef_ult.get(&oc.chef_id).copied().unwrap_or(false);
                let oc_eq = user_chef_equip.get(&oc.chef_id).copied();
                let oc_eff = build_chef_skill_effect(
                    oc,
                    oc_ult,
                    &skill_map,
                    &equip_map,
                    oc_eq,
                    Some(&matched_pe),
                );
                let oc_remark = if let Some(eq_id) = oc_eq {
                    equip_map.get(&eq_id).map(|e| e.name.clone()).unwrap_or_default()
                } else {
                    String::new()
                };

                presence_chefs.push(ChefInternal {
                    chef_id: oc.chef_id,
                    name: oc.name.clone(),
                    rarity: oc.rarity,
                    stirfry: oc.stirfry,
                    bake: oc.bake,
                    boil: oc.boil,
                    steam: oc.steam,
                    fry: oc.fry,
                    knife: oc.knife,
                    tags: oc.tags.clone(),
                    ult: oc_ult,
                    mask: 0,
                    match_mask: mask,
                    index: 0,
                    remark: oc_remark,
                    skill_effect: oc_eff,
                });
            }
        }
    }

    // 5. Build own chefs
    let mut own_chefs: Vec<ChefInternal> = Vec::with_capacity(filtered_chefs.len());
    for (idx, c) in filtered_chefs.iter().enumerate() {
        let is_ult = user_chef_ult.get(&c.chef_id).copied().unwrap_or(false);
        let eq = user_chef_equip.get(&c.chef_id).copied();
        let eff = build_chef_skill_effect(c, is_ult, &skill_map, &equip_map, eq, None);
        let remark = if let Some(eq_id) = eq {
            equip_map.get(&eq_id).map(|e| e.name.clone()).unwrap_or_default()
        } else {
            String::new()
        };

        own_chefs.push(ChefInternal {
            chef_id: c.chef_id,
            name: c.name.clone(),
            rarity: c.rarity,
            stirfry: c.stirfry,
            bake: c.bake,
            boil: c.boil,
            steam: c.steam,
            fry: c.fry,
            knife: c.knife,
            tags: c.tags.clone(),
            ult: is_ult,
            mask: 0,
            match_mask: 0,
            index: idx,
            remark,
            skill_effect: eff,
        });
    }

    // Index mapping for presence chefs
    let mut chef_id_to_own_index = HashMap::new();
    for (i, c) in own_chefs.iter().enumerate() {
        chef_id_to_own_index.insert(c.chef_id, i);
    }
    for pc in &mut presence_chefs {
        if let Some(&idx) = chef_id_to_own_index.get(&pc.chef_id) {
            pc.index = idx;
        }
    }

    // Apply global additions
    for c in own_chefs.iter_mut().chain(presence_chefs.iter_mut()) {
        c.bake += global_addition.bake;
        c.boil += global_addition.boil;
        c.stirfry += global_addition.stirfry;
        c.steam += global_addition.steam;
        c.fry += global_addition.fry;
        c.knife += global_addition.knife;

        if let Some(tags) = &c.tags {
            for &t in tags {
                let add = if t == 1 {
                    global_addition.manfill
                } else if t == 2 {
                    global_addition.womanfill
                } else {
                    0
                };
                c.bake += add;
                c.boil += add;
                c.stirfry += add;
                c.steam += add;
                c.fry += add;
                c.knife += add;
            }
        }
    }

    let estimated_chefs: Vec<ChefInternal> = own_chefs
        .iter()
        .cloned()
        .chain(presence_chefs.iter().cloned())
        .collect();
    let estimated_calculator = Calculator::new(
        parsed_rule.recipe_reward.clone(),
        parsed_rule.sex_reward,
        global_addition.useall,
    );

    // 6. Candidate Pruning & DFS
    let mut raw_quantities = vec![0u32; 1500];
    for r in &user_recipes {
        let q = cooking_quantity(
            &r.materials,
            r.limit + global_addition.maxequiplimit[r.rarity],
            &parsed_rule.material_count,
        );
        if r.recipe_id < raw_quantities.len() {
            raw_quantities[r.recipe_id] = q;
        }
    }

    let t0 = std::time::Instant::now();
    let temp_own_recipes = select_recipe_candidates_with_perturbation(
        &mut user_recipes,
        &raw_quantities,
        &parsed_rule.material_count,
        &estimated_chefs,
        &estimated_calculator,
        config,
        &parsed_rule.recipe_reward,
    );
    println!("==> [Solver] 菜谱扰动剪枝耗时: {}ms", t0.elapsed().as_millis());

    let mut initial_counts = vec![0u32; temp_own_recipes.len()];
    for (i, r) in temp_own_recipes.iter().enumerate() {
        initial_counts[i] = cooking_quantity(
            &r.materials,
            r.limit + global_addition.maxequiplimit[r.rarity],
            &parsed_rule.material_count,
        );
    }

    let mut dfs_material_counts = parsed_rule.material_count.clone();
    let t_dfs = std::time::Instant::now();
    let raw_groups = DfsContext::run_dfs(
        &temp_own_recipes,
        &config.deep_limit,
        global_addition.maxequiplimit,
        &mut dfs_material_counts,
        &initial_counts,
    );
    println!("==> [Solver] 68万组合 DFS 遍历耗时: {}ms (产出 {} 组)", t_dfs.elapsed().as_millis(), raw_groups.len());

    let t_filter = std::time::Instant::now();
    let filtered_groups = filter_recipe_group_candidates(
        raw_groups,
        &temp_own_recipes,
        &parsed_rule.material_count,
        &parsed_rule.recipe_reward,
        config,
    );
    println!("==> [Solver] 候选组合过滤耗时: {}ms", t_filter.elapsed().as_millis());

    // 7. Compact Unique Recipes for Cache & GPU
    let mut recipe_map: HashMap<u32, UniquePlayRecipe> = HashMap::new();
    let mut play_recipe_group_indices: Vec<[usize; 9]> = Vec::with_capacity(filtered_groups.len());

    for group in &filtered_groups {
        let mut group_arr = [0usize; 9];
        for (j, item) in group.iter().enumerate() {
            let key = (item.count << 14) | (item.recipe_id as u32);
            let next_idx = recipe_map.len();
            let entry = recipe_map.entry(key).or_insert_with(|| {
                let mut r = temp_own_recipes[item.p_index].clone();
                r.count = item.count;
                UniquePlayRecipe {
                    recipe: r,
                    count: item.count,
                    index: next_idx,
                }
            });
            group_arr[j] = entry.index;
        }
        play_recipe_group_indices.push(group_arr);
    }

    let mut unique_recipes: Vec<UniquePlayRecipe> = vec![
        UniquePlayRecipe {
            recipe: temp_own_recipes[0].clone(),
            count: 0,
            index: 0,
        };
        recipe_map.len()
    ];
    for (_, v) in recipe_map {
        let idx = v.index;
        unique_recipes[idx] = v;
    }

    let unique_recipe_count = unique_recipes.len();
    println!("==> [Solver] Unique recipes count: {}", unique_recipe_count);

    // 8. Build Cache Matrix
    let play_chefs = &own_chefs;
    let play_presence_chefs = &presence_chefs;
    let total_play_chefs = play_chefs.len() + play_presence_chefs.len();

    let mut score_cache = vec![0i32; total_play_chefs * unique_recipe_count];
    for (c_idx, chef) in play_chefs.iter().enumerate() {
        for (r_idx, ur) in unique_recipes.iter().enumerate() {
            let single_price = estimated_calculator.cal_single_price(chef, &ur.recipe);
            score_cache[c_idx * unique_recipe_count + r_idx] = single_price * (ur.count as i32);
        }
    }
    let start_offset = play_chefs.len() * unique_recipe_count;
    for (c_idx, chef) in play_presence_chefs.iter().enumerate() {
        for (r_idx, ur) in unique_recipes.iter().enumerate() {
            let single_price = estimated_calculator.cal_single_price(chef, &ur.recipe);
            score_cache[start_offset + c_idx * unique_recipe_count + r_idx] =
                single_price * (ur.count as i32);
        }
    }

    let chef_equip_count = vec![0i32; own_chefs.len() + presence_chefs.len()];

    let mut chef_masks = vec![0i32; total_play_chefs];
    let mut chef_match_masks = vec![0i32; total_play_chefs];
    let mut chef_real_index = vec![0i32; total_play_chefs];

    for i in 0..own_chefs.len() {
        chef_real_index[i] = i as i32;
    }
    for i in 0..presence_chefs.len() {
        let idx = own_chefs.len() + i;
        chef_masks[idx] = presence_chefs[i].mask as i32;
        chef_match_masks[idx] = presence_chefs[i].match_mask as i32;
        chef_real_index[idx] = presence_chefs[i].index as i32;
    }

    // 9. Stage 1 on GPU (RTX 3060)
    let stage1_input = Stage1Input {
        score_cache,
        chef_equip_count,
        recipe_count: unique_recipe_count as u32,
        total_chef_count: total_play_chefs as u32,
        own_chef_count: own_chefs.len() as u32,
        own_presence_chef_count: presence_chefs.len() as u32,
        own_chef_top_k: config.own_chef_top_k as u32,
    };

    println!("==> [Solver] Running Stage 1 on GPU ({}) ...", gpu.gpu_name);
    let stage1_start = std::time::Instant::now();
    let (group_max_score, group_max_score_chef_index) = gpu.run_stage1(&stage1_input).await?;
    println!(
        "==> [Solver] Stage 1 finished in {}ms!",
        stage1_start.elapsed().as_millis()
    );

    // 10. Stage 2 Search
    let chef_t = presence_chefs.len() + config.own_chef_top_k;
    let group_count = group_max_score.len() / chef_t;
    let mut group_best_score = vec![0i32; group_count];
    let mut group_best_score_base = vec![0i32; group_count];

    let base_own_top_k = config.base_own_chef_top_k.min(config.own_chef_top_k);
    let mut base_candidate_slots = Vec::with_capacity(base_own_top_k + presence_chefs.len());
    for i in 0..base_own_top_k {
        base_candidate_slots.push(i);
    }
    for i in 0..presence_chefs.len() {
        base_candidate_slots.push(config.own_chef_top_k + i);
    }

    for g in 0..group_count {
        let base = g * chef_t;
        let mut best = 0;
        for c in 0..chef_t {
            let s = group_max_score[base + c];
            if s > best {
                best = s;
            }
        }
        group_best_score[g] = best;

        let mut base_best = 0;
        for &slot in &base_candidate_slots {
            let s = group_max_score[base + slot];
            if s > base_best {
                base_best = s;
            }
        }
        group_best_score_base[g] = base_best;
    }

    println!("==> [Solver] Running Stage 2 combinatorial search ...");
    let stage2_start = std::time::Instant::now();
    let perms = get_recipe_permutations();

    let is_chef_pair_valid = |c1: usize, c2: usize, c3: usize| -> bool {
        let rc1 = chef_real_index[c1];
        let rc2 = chef_real_index[c2];
        let rc3 = chef_real_index[c3];
        if rc1 == rc2 || rc1 == rc3 || rc2 == rc3 {
            return false;
        }

        let mm1 = chef_match_masks[c1];
        let mm2 = chef_match_masks[c2];
        let mm3 = chef_match_masks[c3];
        if (mm1 | mm2 | mm3) == 0 {
            return true;
        }

        let m1 = chef_masks[c1];
        let m2 = chef_masks[c2];
        let m3 = chef_masks[c3];
        let p1 = mm1 & (m2 | m3);
        let p2 = mm2 & (m1 | m3);
        let p3 = mm3 & (m1 | m2);
        p1 == mm1 && p2 == mm2 && p3 == mm3
    };

    #[derive(Default, Clone)]
    struct ThreadBest {
        max_score: i32,
        chefs: [usize; 3],
        scores: [i32; 3],
        recipes: [usize; 9],
    }

    // Parallel chunked search across candidate groups
    let global_best = play_recipe_group_indices
        .par_chunks(64)
        .fold(
            || ThreadBest::default(),
            |mut local, chunk| {
                for group in chunk {
                    // Sort items ascending
                    let mut sorted_group = *group;
                    sorted_group.sort_unstable();

                    for p in perms {
                        let r0 = sorted_group[p[0]];
                        let r1 = sorted_group[p[1]];
                        let r2 = sorted_group[p[2]];
                        let r3 = sorted_group[p[3]];
                        let r4 = sorted_group[p[4]];
                        let r5 = sorted_group[p[5]];
                        let r6 = sorted_group[p[6]];
                        let r7 = sorted_group[p[7]];
                        let r8 = sorted_group[p[8]];

                        let g1 = get_index(r0, r1, r2, unique_recipe_count);
                        let g2 = get_index(r3, r4, r5, unique_recipe_count);
                        let g3 = get_index(r6, r7, r8, unique_recipe_count);

                        let full_upper =
                            group_best_score[g1] + group_best_score[g2] + group_best_score[g3];
                        if full_upper <= local.max_score {
                            continue;
                        }

                        let score1_idx = g1 * chef_t;
                        let score2_idx = g2 * chef_t;
                        let score3_idx = g3 * chef_t;

                        let base_upper = group_best_score_base[g1]
                            + group_best_score_base[g2]
                            + group_best_score_base[g3];

                        if base_upper > local.max_score {
                            for &c1 in &base_candidate_slots {
                                let s1 = group_max_score[score1_idx + c1];
                                if s1 == 0
                                    || s1 + group_best_score_base[g2] + group_best_score_base[g3]
                                        <= local.max_score
                                {
                                    continue;
                                }
                                for &c2 in &base_candidate_slots {
                                    let s2 = group_max_score[score2_idx + c2];
                                    if s2 == 0 {
                                        continue;
                                    }
                                    let s12 = s1 + s2;
                                    if s12 + group_best_score_base[g3] <= local.max_score {
                                        continue;
                                    }
                                    for &c3 in &base_candidate_slots {
                                        let s3 = group_max_score[score3_idx + c3];
                                        if s3 == 0 {
                                            continue;
                                        }
                                        let total_sc = s12 + s3;
                                        if total_sc <= local.max_score {
                                            continue;
                                        }
                                        let ch1 = group_max_score_chef_index[score1_idx + c1] as usize;
                                        let ch2 = group_max_score_chef_index[score2_idx + c2] as usize;
                                        let ch3 = group_max_score_chef_index[score3_idx + c3] as usize;

                                        if !is_chef_pair_valid(ch1, ch2, ch3) {
                                            continue;
                                        }

                                        local.max_score = total_sc;
                                        local.chefs = [ch1, ch2, ch3];
                                        local.scores = [s1, s2, s3];
                                        local.recipes = [r0, r1, r2, r3, r4, r5, r6, r7, r8];
                                    }
                                }
                            }
                        }

                        if full_upper > local.max_score && full_upper > base_upper {
                            for c1 in 0..chef_t {
                                let s1 = group_max_score[score1_idx + c1];
                                if s1 == 0
                                    || s1 + group_best_score[g2] + group_best_score[g3]
                                        <= local.max_score
                                {
                                    continue;
                                }
                                for c2 in 0..chef_t {
                                    let s2 = group_max_score[score2_idx + c2];
                                    if s2 == 0 {
                                        continue;
                                    }
                                    let s12 = s1 + s2;
                                    if s12 + group_best_score[g3] <= local.max_score {
                                        continue;
                                    }
                                    for c3 in 0..chef_t {
                                        let s3 = group_max_score[score3_idx + c3];
                                        if s3 == 0 {
                                            continue;
                                        }
                                        let total_sc = s12 + s3;
                                        if total_sc <= local.max_score {
                                            continue;
                                        }
                                        let ch1 = group_max_score_chef_index[score1_idx + c1] as usize;
                                        let ch2 = group_max_score_chef_index[score2_idx + c2] as usize;
                                        let ch3 = group_max_score_chef_index[score3_idx + c3] as usize;

                                        if !is_chef_pair_valid(ch1, ch2, ch3) {
                                            continue;
                                        }

                                        local.max_score = total_sc;
                                        local.chefs = [ch1, ch2, ch3];
                                        local.scores = [s1, s2, s3];
                                        local.recipes = [r0, r1, r2, r3, r4, r5, r6, r7, r8];
                                    }
                                }
                            }
                        }
                    }
                }
                local
            },
        )
        .reduce(
            || ThreadBest::default(),
            |a, b| if a.max_score >= b.max_score { a } else { b },
        );

    println!(
        "==> [Solver] Stage 2 finished in {}ms! Top Score: {}",
        stage2_start.elapsed().as_millis(),
        global_best.max_score
    );

    // 11. Extract Final Output
    let all_chefs: Vec<&ChefInternal> = play_chefs.iter().chain(play_presence_chefs.iter()).collect();

    let mut final_chefs = Vec::with_capacity(3);
    for i in 0..3 {
        let ch_idx = global_best.chefs[i];
        let chef_obj = all_chefs[ch_idx];

        let mut dishes = Vec::with_capacity(3);
        for j in 0..3 {
            let r_idx = global_best.recipes[i * 3 + j];
            let ur = &unique_recipes[r_idx];
            let single_price = estimated_calculator.cal_single_price(chef_obj, &ur.recipe);
            let total_price = single_price * (ur.count as i32);

            dishes.push(FinalRecipeItem {
                recipe: ur.recipe.name.clone(),
                count: ur.count,
                single_price,
                total_price,
            });
        }

        final_chefs.push(FinalChefItem {
            chef: chef_obj.name.clone(),
            equip: chef_obj.remark.clone(),
            recipes: dishes,
        });
    }

    println!(
        "==> [Solver] TOTAL end-to-end time: {}ms!",
        total_start.elapsed().as_millis()
    );

    Ok(FinalTopResult {
        score: global_best.max_score,
        chefs: final_chefs,
    })
}
