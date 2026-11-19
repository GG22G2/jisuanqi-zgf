use crate::calculator::{Calculator, ChefInternal, RecipeInternal};
use crate::models::CalConfig;
use rayon::prelude::*;
use std::cmp::Ordering;
use std::collections::HashMap;

pub fn cooking_quantity(materials: &[(usize, u32)], expected: u32, material_count: &[i32]) -> u32 {
    let mut max_q = expected;
    for &(mat_idx, qty) in materials {
        if qty > 0 && mat_idx < material_count.len() {
            let available = material_count[mat_idx].max(0) as u32;
            let t = available / qty;
            max_q = max_q.min(t);
        }
    }
    max_q
}

pub fn deterministic_noise(recipe_id: u32, run: u32) -> f64 {
    let mut x = (recipe_id.wrapping_add(1))
        .wrapping_mul(1103515245)
        .wrapping_add((run.wrapping_add(1)).wrapping_mul(12345))
        .wrapping_add(0x9e3779b9);
    x ^= x >> 16;
    x = x.wrapping_mul(2246822519);
    x ^= x >> 13;
    (x as f64) / 4294967295.0
}

pub fn estimated_chef_add(
    recipe: &RecipeInternal,
    chefs: &[ChefInternal],
    calculator: &Calculator,
) -> f64 {
    if chefs.is_empty() {
        return legacy_estimated_chef_add(recipe);
    }

    let mut best1 = -1.0;
    let mut best2 = -1.0;
    let mut best3 = -1.0;

    for chef in chefs {
        let score = calculator.quality_add_no_equip(chef, &chef.skill_effect, recipe);
        if score > best1 {
            best3 = best2;
            best2 = best1;
            best1 = score;
        } else if score > best2 {
            best3 = best2;
            best2 = score;
        } else if score > best3 {
            best3 = score;
        }
        if best1 >= 1.0 && best2 >= 1.0 && best3 >= 1.0 {
            break;
        }
    }

    if best1 < 0.0 {
        return legacy_estimated_chef_add(recipe);
    }
    let q1 = best1.max(0.0);
    if best2 < 0.0 {
        return q1;
    }
    let q2 = best2.max(0.0);
    let q3 = best3.max(0.0);
    (q1 * 0.65 + q2 * 0.25 + q3 * 0.1).min(1.0)
}

fn legacy_estimated_chef_add(recipe: &RecipeInternal) -> f64 {
    let abc = [-1.0, 0.0, 0.1, 0.3, 0.5, 1.0];
    let v1 = 500.0;
    let v2 = 400.0;

    let mut skills = Vec::new();
    if recipe.bake > 0 {
        skills.push(recipe.bake);
    }
    if recipe.boil > 0 {
        skills.push(recipe.boil);
    }
    if recipe.stirfry > 0 {
        skills.push(recipe.stirfry);
    }
    if recipe.knife > 0 {
        skills.push(recipe.knife);
    }
    if recipe.fry > 0 {
        skills.push(recipe.fry);
    }
    if recipe.steam > 0 {
        skills.push(recipe.steam);
    }

    if skills.is_empty() {
        return 0.0;
    }
    skills.sort_by(|a, b| b.cmp(a));

    let a = ((v1 / (skills[0] as f64)) as usize).min(5);
    let b = if skills.len() > 1 {
        ((v2 / (skills[1] as f64)) as usize).min(5)
    } else {
        5
    };
    (abc[a] as f64).min(abc[b]).max(0.0)
}

fn recipe_scarce_efficiency(
    recipe: &RecipeInternal,
    unit_score: f64,
    material_counts: &[i32],
) -> f64 {
    if recipe.materials.is_empty() {
        return unit_score;
    }
    let mut scarcity_cost = 0.0;
    for &(mat_idx, qty) in &recipe.materials {
        let avail = if mat_idx < material_counts.len() {
            material_counts[mat_idx].max(1) as f64
        } else {
            1.0
        };
        scarcity_cost += (qty as f64) / avail;
    }
    if scarcity_cost <= 0.0 {
        unit_score
    } else {
        unit_score / scarcity_cost
    }
}

#[derive(Clone)]
struct RecipeCandidateMetric {
    recipe_idx: usize,
    recipe_id: usize,
    total_score: i32,
    unit_score: f64,
    count: u32,
    scarce_efficiency: f64,
}

#[derive(Clone)]
struct RecipeCandidateMeta {
    metric_idx: usize,
    recipe_id: usize,
    sort_score: f64,
    source_count: u32,
    has_global: bool,
    has_chef: bool,
    has_rule: bool,
    has_scarce: bool,
    has_perturb: bool,
    global_rank: f64,
    best_chef_rank: f64,
    best_chef_score: f64,
    chef_hits: u32,
    best_rule_rank: f64,
    rule_hits: u32,
    scarce_rank: f64,
    best_perturb_rank: f64,
    perturb_hits: u32,
}

fn get_recipe_rule_bucket_keys(recipe: &RecipeInternal) -> Vec<String> {
    let mut keys = Vec::new();
    if !recipe.condiment.is_empty() {
        keys.push(format!("flavor:{}", recipe.condiment));
    }
    if recipe.bake > 0 {
        keys.push("skill:Bake".to_string());
    }
    if recipe.boil > 0 {
        keys.push("skill:Boil".to_string());
    }
    if recipe.stirfry > 0 {
        keys.push("skill:Stirfry".to_string());
    }
    if recipe.knife > 0 {
        keys.push("skill:Knife".to_string());
    }
    if recipe.fry > 0 {
        keys.push("skill:Fry".to_string());
    }
    if recipe.steam > 0 {
        keys.push("skill:Steam".to_string());
    }
    keys.push(format!("rarity:{}", recipe.rarity));

    if recipe.tags[0] > 0.0 {
        keys.push("ingredient:creation".to_string());
    }
    if recipe.tags[1] > 0.0 {
        keys.push("ingredient:meat".to_string());
    }
    if recipe.tags[2] > 0.0 {
        keys.push("ingredient:vegetable".to_string());
    }
    if recipe.tags[3] > 0.0 {
        keys.push("ingredient:fish".to_string());
    }
    keys
}

fn normalize_candidate_rank(rank: f64, limit: f64) -> f64 {
    if !rank.is_finite() || rank <= 0.0 || limit <= 0.0 {
        0.0
    } else {
        (limit - rank + 1.0) / limit
    }
}

pub fn select_recipe_candidates_with_perturbation(
    recipes: &mut [RecipeInternal],
    quantity: &[u32],
    material_counts: &[i32],
    estimated_chefs: &[ChefInternal],
    estimated_calculator: &Calculator,
    config: &CalConfig,
    recipe_reward: &[f64],
) -> Vec<RecipeInternal> {
    let base_limit = config.recipe_limit.min(recipes.len());
    if base_limit == 0 {
        return Vec::new();
    }

    let mut metrics: Vec<RecipeCandidateMetric> = Vec::with_capacity(recipes.len());
    let mut max_total = 0i32;
    let mut max_unit = 0.0f64;
    let mut max_count = 0u32;
    let mut max_scarce = 0.0f64;

    for (i, r) in recipes.iter_mut().enumerate() {
        let count = quantity[r.recipe_id];
        let reward = if r.recipe_id < recipe_reward.len() {
            recipe_reward[r.recipe_id]
        } else {
            0.0
        };
        let est_chef_add = estimated_chef_add(r, estimated_chefs, estimated_calculator);
        r.estimated_chef_add = est_chef_add;
        let unit_score = (r.price as f64) * (1.0 + reward + est_chef_add);
        let total_score = (unit_score * (count as f64)) as i32;
        let scarce = recipe_scarce_efficiency(r, unit_score, material_counts);

        if total_score > max_total {
            max_total = total_score;
        }
        if unit_score > max_unit {
            max_unit = unit_score;
        }
        if count > max_count {
            max_count = count;
        }
        if scarce > max_scarce {
            max_scarce = scarce;
        }

        metrics.push(RecipeCandidateMetric {
            recipe_idx: i,
            recipe_id: r.recipe_id,
            total_score,
            unit_score,
            count,
            scarce_efficiency: scarce,
        });
    }

    let safe_max_total = (max_total.max(1)) as f64;
    let safe_max_unit = max_unit.max(1.0);
    let safe_max_count = (max_count.max(1)) as f64;
    let safe_max_scarce = max_scarce.max(1.0);

    let mut selected_map: HashMap<usize, RecipeCandidateMeta> = HashMap::new();

fn get_or_create_meta(
    map: &mut HashMap<usize, RecipeCandidateMeta>,
    metric_idx: usize,
    recipe_id: usize,
) -> &mut RecipeCandidateMeta {
    map.entry(recipe_id).or_insert_with(move || RecipeCandidateMeta {
        metric_idx,
        recipe_id,
        sort_score: 0.0,
        source_count: 0,
        has_global: false,
        has_chef: false,
        has_rule: false,
        has_scarce: false,
        has_perturb: false,
        global_rank: f64::INFINITY,
        best_chef_rank: f64::INFINITY,
        best_chef_score: 0.0,
        chef_hits: 0,
        best_rule_rank: f64::INFINITY,
        rule_hits: 0,
        scarce_rank: f64::INFINITY,
        best_perturb_rank: f64::INFINITY,
        perturb_hits: 0,
    })
}

    // 1. Global top K
    let mut global_ranked = metrics.clone();
    global_ranked.sort_by(|a, b| {
        b.total_score
            .cmp(&a.total_score)
            .then_with(|| {
                b.unit_score
                    .partial_cmp(&a.unit_score)
                    .unwrap_or(Ordering::Equal)
            })
            .then_with(|| b.count.cmp(&a.count))
            .then_with(|| a.recipe_id.cmp(&b.recipe_id))
    });

    let global_top_k = base_limit.min(global_ranked.len());
    for (i, m) in global_ranked.iter().take(global_top_k).enumerate() {
        let meta = get_or_create_meta(&mut selected_map, m.recipe_idx, m.recipe_id);
        if !meta.has_global {
            meta.has_global = true;
            meta.source_count += 1;
        }
        let rank = (i + 1) as f64;
        meta.global_rank = meta.global_rank.min(rank);
    }

    // 2. Chef top K
    let chef_top_k = config.chef_recipe_top_k.min(metrics.len());
    let mut max_chef_score = 0.0f64;
    if chef_top_k > 0 && !estimated_chefs.is_empty() {
        let mut ranked: Vec<(&RecipeCandidateMetric, f64)> = Vec::with_capacity(metrics.len());
        for chef in estimated_chefs {
            ranked.clear();
            for m in &metrics {
                let single_price =
                    estimated_calculator.cal_single_price(chef, &recipes[m.recipe_idx]);
                let chef_score = if single_price <= 0 {
                    0.0
                } else {
                    (single_price as f64) * (m.count as f64)
                };
                if chef_score > max_chef_score {
                    max_chef_score = chef_score;
                }
                ranked.push((m, chef_score));
            }

            ranked.sort_by(|a, b| {
                b.1.partial_cmp(&a.1)
                    .unwrap_or(Ordering::Equal)
                    .then_with(|| b.0.total_score.cmp(&a.0.total_score))
                    .then_with(|| {
                        b.0.unit_score
                            .partial_cmp(&a.0.unit_score)
                            .unwrap_or(Ordering::Equal)
                    })
                    .then_with(|| a.0.recipe_id.cmp(&b.0.recipe_id))
            });

            for (rank_idx, (m, score)) in ranked.iter().take(chef_top_k).enumerate() {
                if *score <= 0.0 {
                    break;
                }
                let meta = get_or_create_meta(&mut selected_map, m.recipe_idx, m.recipe_id);
                if !meta.has_chef {
                    meta.has_chef = true;
                    meta.source_count += 1;
                }
                meta.chef_hits += 1;
                meta.best_chef_rank = meta.best_chef_rank.min((rank_idx + 1) as f64);
                if *score > meta.best_chef_score {
                    meta.best_chef_score = *score;
                }
            }
        }
    }

    // 3. Rule bucket top K
    let rule_bucket_top_k = config.rule_bucket_top_k.min(metrics.len());
    if rule_bucket_top_k > 0 {
        let mut bucket_map: HashMap<String, Vec<&RecipeCandidateMetric>> = HashMap::new();
        for m in &metrics {
            let keys = get_recipe_rule_bucket_keys(&recipes[m.recipe_idx]);
            for key in keys {
                bucket_map.entry(key).or_default().push(m);
            }
        }

        for (_, bucket) in bucket_map.iter_mut() {
            bucket.sort_by(|a, b| {
                b.total_score
                    .cmp(&a.total_score)
                    .then_with(|| {
                        b.unit_score
                            .partial_cmp(&a.unit_score)
                            .unwrap_or(Ordering::Equal)
                    })
                    .then_with(|| b.count.cmp(&a.count))
                    .then_with(|| {
                        b.scarce_efficiency
                            .partial_cmp(&a.scarce_efficiency)
                            .unwrap_or(Ordering::Equal)
                    })
                    .then_with(|| a.recipe_id.cmp(&b.recipe_id))
            });

            for (i, m) in bucket.iter().take(rule_bucket_top_k).enumerate() {
                let meta = get_or_create_meta(&mut selected_map, m.recipe_idx, m.recipe_id);
                if !meta.has_rule {
                    meta.has_rule = true;
                    meta.source_count += 1;
                }
                meta.rule_hits += 1;
                meta.best_rule_rank = meta.best_rule_rank.min((i + 1) as f64);
            }
        }
    }

    // 4. Scarce top K
    let scarce_top_k = config.scarce_recipe_top_k.min(metrics.len());
    if scarce_top_k > 0 {
        let mut scarce_ranked = metrics.clone();
        scarce_ranked.sort_by(|a, b| {
            b.scarce_efficiency
                .partial_cmp(&a.scarce_efficiency)
                .unwrap_or(Ordering::Equal)
                .then_with(|| b.total_score.cmp(&a.total_score))
                .then_with(|| {
                    b.unit_score
                        .partial_cmp(&a.unit_score)
                        .unwrap_or(Ordering::Equal)
                })
                .then_with(|| a.recipe_id.cmp(&b.recipe_id))
        });

        for (i, m) in scarce_ranked.iter().take(scarce_top_k).enumerate() {
            let meta = get_or_create_meta(&mut selected_map, m.recipe_idx, m.recipe_id);
            if !meta.has_scarce {
                meta.has_scarce = true;
                meta.source_count += 1;
            }
            meta.scarce_rank = meta.scarce_rank.min((i + 1) as f64);
        }
    }

    // 5. Perturb runs
    let perturb_weights = [
        [0.82, 0.12, 0.06, 0.03],
        [0.72, 0.08, 0.20, 0.04],
        [0.66, 0.24, 0.10, 0.02],
        [0.90, 0.02, 0.08, 0.05],
        [0.74, 0.18, 0.08, 0.06],
    ];

    let runs = config.recipe_perturb_runs.max(1);
    for run in 1..runs {
        let weights = perturb_weights[(run - 1) % perturb_weights.len()];
        let (wb, wu, wc, wn) = (weights[0], weights[1], weights[2], weights[3]);
        let mut perturbed = metrics.clone();
        perturbed.sort_by(|a, b| {
            let an = deterministic_noise(a.recipe_id as u32, run as u32);
            let bn = deterministic_noise(b.recipe_id as u32, run as u32);
            let as_val = wb * ((a.total_score as f64) / safe_max_total)
                + wu * (a.unit_score / safe_max_unit)
                + wc * ((a.count as f64) / safe_max_count)
                + wn * an;
            let bs_val = wb * ((b.total_score as f64) / safe_max_total)
                + wu * (b.unit_score / safe_max_unit)
                + wc * ((b.count as f64) / safe_max_count)
                + wn * bn;
            bs_val
                .partial_cmp(&as_val)
                .unwrap_or(Ordering::Equal)
                .then_with(|| b.total_score.cmp(&a.total_score))
        });

        for (i, m) in perturbed.iter().take(base_limit).enumerate() {
            let meta = get_or_create_meta(&mut selected_map, m.recipe_idx, m.recipe_id);
            if !meta.has_perturb {
                meta.has_perturb = true;
                meta.source_count += 1;
            }
            meta.perturb_hits += 1;
            meta.best_perturb_rank = meta.best_perturb_rank.min((i + 1) as f64);
        }
    }

    let mut final_limit = base_limit;
    if selected_map.len() > base_limit {
        let expand_by_rate = ((base_limit as f64) * config.recipe_candidate_expand_rate).ceil() as usize;
        final_limit = base_limit.max(expand_by_rate);
        final_limit = final_limit.min(base_limit + config.recipe_candidate_expand_max);
        final_limit = final_limit.min(selected_map.len());
    }

    let safe_max_chef_score = if max_chef_score <= 0.0 { 1.0 } else { max_chef_score };

    let selected_map_len = selected_map.len();
    let mut meta_list: Vec<RecipeCandidateMeta> = selected_map.into_values().collect();

    for meta in &mut meta_list {
        let m = &metrics[meta.metric_idx];
        let total_norm = (m.total_score as f64) / safe_max_total;
        let unit_norm = m.unit_score / safe_max_unit;
        let count_norm = (m.count as f64) / safe_max_count;
        let chef_norm = meta.best_chef_score / safe_max_chef_score;
        let scarce_norm = m.scarce_efficiency / safe_max_scarce;
        let global_rank_norm = normalize_candidate_rank(meta.global_rank, global_top_k as f64);
        let chef_rank_norm = normalize_candidate_rank(meta.best_chef_rank, chef_top_k as f64);
        let rule_rank_norm = normalize_candidate_rank(meta.best_rule_rank, rule_bucket_top_k as f64);
        let scarce_rank_norm = normalize_candidate_rank(meta.scarce_rank, scarce_top_k as f64);
        let perturb_rank_norm = normalize_candidate_rank(meta.best_perturb_rank, base_limit as f64);
        let chef_coverage_norm = if estimated_chefs.is_empty() {
            0.0
        } else {
            ((meta.chef_hits as f64) / ((6.min(estimated_chefs.len())) as f64)).min(1.0)
        };
        let rule_coverage_norm = ((meta.rule_hits as f64) / 4.0).min(1.0);
        let source_norm = (meta.source_count as f64) / 5.0;

        meta.sort_score = total_norm * 0.34
            + unit_norm * 0.08
            + count_norm * 0.04
            + global_rank_norm * 0.10
            + chef_norm * 0.18
            + chef_rank_norm * 0.10
            + chef_coverage_norm * 0.04
            + rule_rank_norm * 0.14
            + rule_coverage_norm * 0.05
            + scarce_norm * 0.10
            + scarce_rank_norm * 0.05
            + perturb_rank_norm * 0.03
            + source_norm * 0.05;
    }

    meta_list.sort_by(|a, b| {
        let ma = &metrics[a.metric_idx];
        let mb = &metrics[b.metric_idx];
        b.sort_score
            .partial_cmp(&a.sort_score)
            .unwrap_or(Ordering::Equal)
            .then_with(|| mb.total_score.cmp(&ma.total_score))
            .then_with(|| {
                mb.unit_score
                    .partial_cmp(&ma.unit_score)
                    .unwrap_or(Ordering::Equal)
            })
            .then_with(|| mb.count.cmp(&ma.count))
            .then_with(|| a.recipe_id.cmp(&b.recipe_id))
    });

    if meta_list.len() > final_limit {
        meta_list.truncate(final_limit);
    }

    let mut result_recipes = Vec::with_capacity(meta_list.len());
    for (p_idx, meta) in meta_list.iter().enumerate() {
        let mut r = recipes[meta.metric_idx].clone();
        r.p_index = p_idx;
        r.count = metrics[meta.metric_idx].count;
        let reward = if r.recipe_id < recipe_reward.len() {
            recipe_reward[r.recipe_id]
        } else {
            0.0
        };
        r.reward_price = (r.price as f64) * (1.0 + reward);
        r.estimated_reward_price = (r.price as f64) * (1.0 + reward + r.estimated_chef_add);
        r.candidate_source_mask = (if meta.has_global { 1 } else { 0 })
            | (if meta.has_chef { 2 } else { 0 })
            | (if meta.has_rule { 4 } else { 0 })
            | (if meta.has_scarce { 8 } else { 0 })
            | (if meta.has_perturb { 16 } else { 0 });
        r.candidate_source_count = meta.source_count;
        r.candidate_sort_score = meta.sort_score;
        r.candidate_best_chef_score = meta.best_chef_score;
        r.candidate_rule_hits = meta.rule_hits;
        r.candidate_chef_hits = meta.chef_hits;
        result_recipes.push(r);
    }

    println!(
        "[recipe-candidate] global={} chef={} rule={} scarce={} union={} final={} runs={}",
        global_top_k,
        chef_top_k,
        rule_bucket_top_k,
        scarce_top_k,
        selected_map_len,
        result_recipes.len(),
        runs
    );

    result_recipes
}

#[derive(Clone, Copy, Debug)]
pub struct PlayRecipeItem {
    pub p_index: usize,
    pub count: u32,
    pub recipe_id: usize,
}

pub struct DfsContext<'a> {
    pub recipes: &'a [RecipeInternal],
    pub deep_limit: &'a [usize],
    pub max_equip_limit: [u32; 6],
    pub groups: Vec<[PlayRecipeItem; 9]>,
    pub depth_counts: Vec<u32>,
    pub num_recipes: usize,
}

impl<'a> DfsContext<'a> {
    pub fn run_dfs(
        recipes: &'a [RecipeInternal],
        deep_limit: &'a [usize],
        max_equip_limit: [u32; 6],
        material_counts: &mut [i32],
        initial_counts: &[u32],
    ) -> Vec<[PlayRecipeItem; 9]> {
        let num_recipes = recipes.len();
        let mut depth_counts = vec![0u32; 11 * num_recipes];
        depth_counts[0..num_recipes].copy_from_slice(initial_counts);

        let mut ctx = DfsContext {
            recipes,
            deep_limit,
            max_equip_limit,
            groups: Vec::with_capacity(100000),
            depth_counts,
            num_recipes,
        };

        let mut current_play: [PlayRecipeItem; 9] = [PlayRecipeItem {
            p_index: 0,
            count: 0,
            recipe_id: 0,
        }; 9];
        let mut ignore: Vec<bool> = vec![false; num_recipes];

        ctx.dfs(
            1,
            &mut current_play,
            material_counts,
            &mut ignore,
            0u64,
        );

        ctx.groups
    }

    fn dfs(
        &mut self,
        depth: usize,
        current_play: &mut [PlayRecipeItem; 9],
        material_counts: &mut [i32],
        ignore: &mut [bool],
        last_material_feature: u64,
    ) {
        if depth == 10 {
            self.groups.push(*current_play);
            return;
        }

        let limit = self.deep_limit[depth];
        let n = self.num_recipes;

        // Copy previous depth counts to current depth
        let prev_start = (depth - 1) * n;
        let curr_start = depth * n;
        self.depth_counts.copy_within(prev_start..prev_start + n, curr_start);

        // Fixed-size stack array for heap (limit <= 10)
        let mut heap = [0u64; 16];
        let mut heap_len = 0usize;

        for p_idx in 0..n {
            let r = &self.recipes[p_idx];
            let mut count = self.depth_counts[curr_start + p_idx];
            if (last_material_feature & r.material_feature) != 0 {
                count = cooking_quantity(
                    &r.materials,
                    r.limit + self.max_equip_limit[r.rarity],
                    material_counts,
                );
                self.depth_counts[curr_start + p_idx] = count;
            }
            if count == 0 || ignore[p_idx] {
                continue;
            }

            let est_price = r.estimated_reward_price;
            let computed_price = (est_price * (count as f64)) as u64;
            let val = (computed_price << 32) | (p_idx as u64);

            if heap_len < limit {
                heap[heap_len] = val;
                let mut idx = heap_len;
                while idx > 0 {
                    let parent = (idx - 1) / 2;
                    if heap[parent] <= heap[idx] {
                        break;
                    }
                    heap.swap(parent, idx);
                    idx = parent;
                }
                heap_len += 1;
            } else if val > heap[0] {
                heap[0] = val;
                let mut idx = 0;
                loop {
                    let mut smallest = idx;
                    let left = 2 * idx + 1;
                    let right = 2 * idx + 2;
                    if left < heap_len && heap[left] < heap[smallest] {
                        smallest = left;
                    }
                    if right < heap_len && heap[right] < heap[smallest] {
                        smallest = right;
                    }
                    if smallest != idx {
                        heap.swap(idx, smallest);
                        idx = smallest;
                    } else {
                        break;
                    }
                }
            }
        }

        // Sort ascending, then iterate in reverse (highest score first)
        heap[..heap_len].sort_unstable();

        for &val in heap[..heap_len].iter().rev() {
            let p_idx = (val & 0xFFFFFFFF) as usize;
            let quantity = self.depth_counts[curr_start + p_idx];
            if quantity == 0 {
                continue;
            }

            let sel = &self.recipes[p_idx];
            current_play[depth - 1] = PlayRecipeItem {
                p_index: p_idx,
                count: quantity,
                recipe_id: sel.recipe_id,
            };

            ignore[p_idx] = true;
            for &(mat, qty) in &sel.materials {
                material_counts[mat] -= (qty * quantity) as i32;
            }

            self.dfs(
                depth + 1,
                current_play,
                material_counts,
                ignore,
                sel.material_feature,
            );

            for &(mat, qty) in &sel.materials {
                material_counts[mat] += (qty * quantity) as i32;
            }
            ignore[p_idx] = false;
        }
    }
}

pub struct RecipeGroupCandidate {
    pub play_recipe_group: [PlayRecipeItem; 9],
    pub score: i32,
    pub estimated_score: i32,
    pub scarce_efficiency: f64,
    pub rule_coverage_score: f64,
    pub source_score: f64,
    pub source_coverage: u32,
    pub special_recipe_count: u32,
    pub source_count: u32,
    pub score_pass: bool,
    pub estimated_pass: bool,
    pub has_score: bool,
    pub has_estimated: bool,
    pub has_scarce: bool,
    pub has_coverage: bool,
    pub has_source: bool,
    pub score_rank: f64,
    pub estimated_rank: f64,
    pub scarce_rank: f64,
    pub coverage_rank: f64,
    pub source_rank: f64,
    pub composite_score: f64,
}

pub fn filter_recipe_group_candidates(
    raw_groups: Vec<[PlayRecipeItem; 9]>,
    recipes: &[RecipeInternal],
    material_counts: &[i32],
    recipe_reward: &[f64],
    config: &CalConfig,
) -> Vec<[PlayRecipeItem; 9]> {
    // 1. Deduplicate by sorted items using integer array key (zero string allocations)
    let mut candidate_map: HashMap<[(u32, u32); 9], RecipeGroupCandidate> =
        HashMap::with_capacity(raw_groups.len().min(80000));

    for mut group in raw_groups {
        group.sort_by(|a, b| b.recipe_id.cmp(&a.recipe_id));
        let mut key = [(0u32, 0u32); 9];
        for i in 0..9 {
            key[i] = (group[i].recipe_id as u32, group[i].count);
        }

        if candidate_map.contains_key(&key) {
            continue;
        }

        let mut score = 0i32;
        let mut estimated_score = 0i32;
        let mut scarcity_cost = 0.0f64;
        let mut flavor_seen = [0u32; 6];
        let mut skill_seen = [0u32; 6];
        let mut rarity_seen = [0u32; 6];
        let mut ingredient_seen = [0u32; 4];
        let mut combo_source_mask = 0u32;
        let mut source_weight = 0u32;
        let mut special_recipe_count = 0u32;
        let mut chef_recipe_hits = 0u32;
        let mut rule_recipe_hits = 0u32;
        let mut scarce_recipe_hits = 0u32;

        for item in &group {
            let r = &recipes[item.p_index];
            let count = item.count;
            let reward = if r.recipe_id < recipe_reward.len() {
                recipe_reward[r.recipe_id]
            } else {
                0.0
            };

            score += ((r.price as f64) * (1.0 + reward + 1.0) * (count as f64)) as i32;
            let est_chef_add = r.estimated_chef_add;
            estimated_score += ((r.price as f64) * (1.0 + reward + est_chef_add) * (count as f64)) as i32;

            for &(mat, qty) in &r.materials {
                let avail = material_counts[mat].max(1) as f64;
                scarcity_cost += ((qty * count) as f64) / avail;
            }

            match r.condiment.as_str() {
                "Tasty" => flavor_seen[0] = 1,
                "Salty" => flavor_seen[1] = 1,
                "Spicy" => flavor_seen[2] = 1,
                "Sweet" => flavor_seen[3] = 1,
                "Bitter" => flavor_seen[4] = 1,
                "Sour" => flavor_seen[5] = 1,
                _ => {}
            }
            if r.bake > 0 { skill_seen[0] = 1; }
            if r.boil > 0 { skill_seen[1] = 1; }
            if r.stirfry > 0 { skill_seen[2] = 1; }
            if r.knife > 0 { skill_seen[3] = 1; }
            if r.fry > 0 { skill_seen[4] = 1; }
            if r.steam > 0 { skill_seen[5] = 1; }

            if r.rarity < 6 {
                rarity_seen[r.rarity] = 1;
            }
            for j in 0..4 {
                if r.tags[j] > 0.0 {
                    ingredient_seen[j] = 1;
                }
            }

            let source_mask = if r.candidate_source_mask == 0 { 1 } else { r.candidate_source_mask };
            combo_source_mask |= source_mask;
            let recipe_source_count = if r.candidate_source_count == 0 { 1 } else { r.candidate_source_count };
            source_weight += recipe_source_count;

            if (source_mask & 30) != 0 {
                special_recipe_count += 1;
            }
            if (source_mask & 2) != 0 {
                chef_recipe_hits += 1;
            }
            if (source_mask & 4) != 0 {
                rule_recipe_hits += 1;
            }
            if (source_mask & 8) != 0 {
                scarce_recipe_hits += 1;
            }
        }

        let source_coverage = combo_source_mask.count_ones();
        let flavor_cov: f64 = flavor_seen.iter().sum::<u32>() as f64;
        let skill_cov: f64 = skill_seen.iter().sum::<u32>() as f64;
        let rarity_cov: f64 = rarity_seen.iter().sum::<u32>() as f64;
        let ingredient_cov: f64 = ingredient_seen.iter().sum::<u32>() as f64;

        let rule_coverage_score = flavor_cov * 1.25 + skill_cov * 1.4 + rarity_cov * 0.9 + ingredient_cov * 1.0;
        let source_score = (source_coverage as f64) * 3.0
            + (special_recipe_count as f64) * 1.5
            + (chef_recipe_hits as f64) * 1.6
            + (rule_recipe_hits as f64) * 1.35
            + (scarce_recipe_hits as f64) * 1.35
            + (source_weight as f64) * 0.35;
        let scarce_efficiency = if scarcity_cost <= 0.0 {
            estimated_score as f64
        } else {
            (estimated_score as f64) / scarcity_cost
        };

        candidate_map.insert(
            key,
            RecipeGroupCandidate {
                play_recipe_group: group,
                score,
                estimated_score,
                scarce_efficiency,
                rule_coverage_score,
                source_score,
                source_coverage,
                special_recipe_count,
                source_count: 0,
                score_pass: false,
                estimated_pass: false,
                has_score: false,
                has_estimated: false,
                has_scarce: false,
                has_coverage: false,
                has_source: false,
                score_rank: f64::INFINITY,
                estimated_rank: f64::INFINITY,
                scarce_rank: f64::INFINITY,
                coverage_rank: f64::INFINITY,
                source_rank: f64::INFINITY,
                composite_score: 0.0,
            },
        );
    }

    let candidates_len = candidate_map.len();
    let mut candidates: Vec<RecipeGroupCandidate> = candidate_map.into_values().collect();
    if candidates.is_empty() {
        return Vec::new();
    }

    let mut max_score = 0i32;
    let mut max_estimated_score = 0i32;
    let mut max_scarce = 0.0f64;
    let mut max_rule_cov = 0.0f64;
    let mut max_source = 0.0f64;
    let mut max_source_cov = 0u32;
    let mut max_special = 0u32;

    for c in &candidates {
        if c.score > max_score { max_score = c.score; }
        if c.estimated_score > max_estimated_score { max_estimated_score = c.estimated_score; }
        if c.scarce_efficiency > max_scarce { max_scarce = c.scarce_efficiency; }
        if c.rule_coverage_score > max_rule_cov { max_rule_cov = c.rule_coverage_score; }
        if c.source_score > max_source { max_source = c.source_score; }
        if c.source_coverage > max_source_cov { max_source_cov = c.source_coverage; }
        if c.special_recipe_count > max_special { max_special = c.special_recipe_count; }
    }

    let score_threshold = ((max_score as f64) * config.filter_score_rate) as i32;
    let est_score_threshold = ((max_estimated_score as f64) * config.filter_score_rate) as i32;

    let mut base_keep_count = 0usize;
    for c in &mut candidates {
        let sp = c.score >= score_threshold;
        let ep = c.estimated_score >= est_score_threshold;
        c.score_pass = sp;
        c.estimated_pass = ep;
        if sp || ep {
            base_keep_count += 1;
        }
        if sp && !c.has_score {
            c.has_score = true;
            c.source_count += 1;
        }
        if ep && !c.has_estimated {
            c.has_estimated = true;
            c.source_count += 1;
        }
    }

    let fallback = (config.recipe_limit * 3).max(120);
    let base_extra = config.max_estimated_candidate_extra.min(fallback);
    let target = if base_keep_count > 0 {
        ((base_keep_count as f64 * 0.4).ceil() as usize).max(base_extra)
    } else {
        fallback
    };
    let extra_keep_limit = candidates.len().min(1.max(target));

    // Sort and mark rankings
    let mut indices: Vec<usize> = (0..candidates.len()).collect();

    // Score rank
    indices.par_sort_unstable_by(|&a, &b| {
        candidates[b].score
            .cmp(&candidates[a].score)
            .then_with(|| candidates[b].estimated_score.cmp(&candidates[a].estimated_score))
            .then_with(|| candidates[b].source_score.partial_cmp(&candidates[a].source_score).unwrap_or(Ordering::Equal))
    });
    for (rank, &idx) in indices.iter().take(extra_keep_limit).enumerate() {
        let c = &mut candidates[idx];
        if !c.has_score {
            c.has_score = true;
            c.source_count += 1;
        }
        c.score_rank = c.score_rank.min((rank + 1) as f64);
    }

    // Estimated score rank
    indices.par_sort_unstable_by(|&a, &b| {
        candidates[b].estimated_score
            .cmp(&candidates[a].estimated_score)
            .then_with(|| candidates[b].score.cmp(&candidates[a].score))
            .then_with(|| candidates[b].source_score.partial_cmp(&candidates[a].source_score).unwrap_or(Ordering::Equal))
    });
    for (rank, &idx) in indices.iter().take(extra_keep_limit).enumerate() {
        let c = &mut candidates[idx];
        if !c.has_estimated {
            c.has_estimated = true;
            c.source_count += 1;
        }
        c.estimated_rank = c.estimated_rank.min((rank + 1) as f64);
    }

    // Scarce rank
    indices.par_sort_unstable_by(|&a, &b| {
        candidates[b].scarce_efficiency
            .partial_cmp(&candidates[a].scarce_efficiency).unwrap_or(Ordering::Equal)
            .then_with(|| candidates[b].estimated_score.cmp(&candidates[a].estimated_score))
            .then_with(|| candidates[b].score.cmp(&candidates[a].score))
    });
    for (rank, &idx) in indices.iter().take(extra_keep_limit).enumerate() {
        let c = &mut candidates[idx];
        if !c.has_scarce {
            c.has_scarce = true;
            c.source_count += 1;
        }
        c.scarce_rank = c.scarce_rank.min((rank + 1) as f64);
    }

    // Coverage rank
    indices.par_sort_unstable_by(|&a, &b| {
        candidates[b].rule_coverage_score
            .partial_cmp(&candidates[a].rule_coverage_score).unwrap_or(Ordering::Equal)
            .then_with(|| candidates[b].estimated_score.cmp(&candidates[a].estimated_score))
            .then_with(|| candidates[b].scarce_efficiency.partial_cmp(&candidates[a].scarce_efficiency).unwrap_or(Ordering::Equal))
    });
    for (rank, &idx) in indices.iter().take(extra_keep_limit).enumerate() {
        let c = &mut candidates[idx];
        if !c.has_coverage {
            c.has_coverage = true;
            c.source_count += 1;
        }
        c.coverage_rank = c.coverage_rank.min((rank + 1) as f64);
    }

    // Source rank
    indices.par_sort_unstable_by(|&a, &b| {
        candidates[b].source_score
            .partial_cmp(&candidates[a].source_score).unwrap_or(Ordering::Equal)
            .then_with(|| candidates[b].estimated_score.cmp(&candidates[a].estimated_score))
            .then_with(|| candidates[b].rule_coverage_score.partial_cmp(&candidates[a].rule_coverage_score).unwrap_or(Ordering::Equal))
    });
    for (rank, &idx) in indices.iter().take(extra_keep_limit).enumerate() {
        let c = &mut candidates[idx];
        if !c.has_source {
            c.has_source = true;
            c.source_count += 1;
        }
        c.source_rank = c.source_rank.min((rank + 1) as f64);
    }

    let mut selected: Vec<RecipeGroupCandidate> = candidates
        .into_iter()
        .filter(|c| c.source_count > 0 || c.score_pass || c.estimated_pass)
        .collect();

    let safe_max_sc = max_score.max(1) as f64;
    let safe_max_est = max_estimated_score.max(1) as f64;
    let safe_max_sc_eff = max_scarce.max(1.0);
    let safe_max_rule_cov = max_rule_cov.max(1.0);
    let safe_max_src = max_source.max(1.0);
    let safe_max_src_cov = max_source_cov.max(1) as f64;
    let safe_max_spec = max_special.max(1) as f64;
    let r_lim = extra_keep_limit as f64;

    for c in &mut selected {
        let score_norm = (c.score as f64) / safe_max_sc;
        let est_norm = (c.estimated_score as f64) / safe_max_est;
        let scarce_norm = c.scarce_efficiency / safe_max_sc_eff;
        let cov_norm = c.rule_coverage_score / safe_max_rule_cov;
        let src_norm = c.source_score / safe_max_src;
        let src_cov_norm = (c.source_coverage as f64) / safe_max_src_cov;
        let spec_norm = (c.special_recipe_count as f64) / safe_max_spec;
        let score_rank_norm = normalize_candidate_rank(c.score_rank, r_lim);
        let est_rank_norm = normalize_candidate_rank(c.estimated_rank, r_lim);
        let scarce_rank_norm = normalize_candidate_rank(c.scarce_rank, r_lim);
        let cov_rank_norm = normalize_candidate_rank(c.coverage_rank, r_lim);
        let src_rank_norm = normalize_candidate_rank(c.source_rank, r_lim);
        let src_type_norm = (c.source_count as f64) / 5.0;

        c.composite_score = score_norm * 0.2
            + est_norm * 0.24
            + scarce_norm * 0.12
            + cov_norm * 0.12
            + src_norm * 0.12
            + score_rank_norm * 0.06
            + est_rank_norm * 0.08
            + scarce_rank_norm * 0.05
            + cov_rank_norm * 0.05
            + src_rank_norm * 0.05
            + src_cov_norm * 0.03
            + spec_norm * 0.03
            + src_type_norm * 0.03
            + (if c.score_pass { 0.03 } else { 0.0 })
            + (if c.estimated_pass { 0.05 } else { 0.0 });
    }

    selected.par_sort_unstable_by(|a, b| {
        b.composite_score
            .partial_cmp(&a.composite_score).unwrap_or(Ordering::Equal)
            .then_with(|| b.estimated_score.cmp(&a.estimated_score))
            .then_with(|| b.score.cmp(&a.score))
            .then_with(|| b.source_score.partial_cmp(&a.source_score).unwrap_or(Ordering::Equal))
    });

    if base_keep_count > 0 && selected.len() > base_keep_count {
        let mut target_count = ((base_keep_count as f64) * config.estimated_candidate_keep_rate).ceil() as usize;
        target_count = target_count.min(base_keep_count + config.max_estimated_candidate_extra);
        target_count = target_count.max(base_keep_count);
        let extra_only_count = selected.iter().filter(|c| !c.score_pass && !c.estimated_pass).count();
        let reserved_extra = extra_only_count.min(30.max(((extra_keep_limit as f64) * 0.2).ceil() as usize));
        target_count = target_count.max(selected.len().min(base_keep_count + reserved_extra));
        if selected.len() > target_count {
            selected.truncate(target_count);
        }
    }

    println!(
        "[group-candidate] base={} extraTop={} union={} final={}",
        base_keep_count,
        extra_keep_limit,
        candidates_len,
        selected.len()
    );

    selected.into_iter().map(|c| c.play_recipe_group).collect()
}
