use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecipeMaterialRaw {
    pub material: usize,
    pub quantity: u32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecipeRaw {
    pub recipe_id: u32,
    pub name: String,
    pub rarity: usize,
    pub price: u32,
    pub ex_price: Option<u32>,
    #[serde(default)]
    pub stirfry: u32,
    #[serde(default)]
    pub bake: u32,
    #[serde(default)]
    pub boil: u32,
    #[serde(default)]
    pub steam: u32,
    #[serde(default)]
    pub fry: u32,
    #[serde(default)]
    pub knife: u32,
    pub condiment: Option<String>,
    #[serde(default)]
    pub materials: Vec<RecipeMaterialRaw>,
    #[serde(default)]
    pub limit: u32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillEffectRaw {
    #[serde(rename = "type")]
    pub type_: Option<String>,
    #[serde(default)]
    pub value: f64,
    pub condition: Option<String>,
    pub condition_type: Option<String>,
    pub cal: Option<String>,
    pub condition_value: Option<u32>,
    pub condition_value_list: Option<Vec<u32>>,
    pub tag: Option<u32>,
    #[serde(default)]
    pub rarity: usize,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillRaw {
    pub skill_id: u32,
    #[serde(default)]
    pub effect: Vec<SkillEffectRaw>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChefRaw {
    pub chef_id: u32,
    pub name: String,
    pub rarity: usize,
    #[serde(default)]
    pub stirfry: i32,
    #[serde(default)]
    pub bake: i32,
    #[serde(default)]
    pub boil: i32,
    #[serde(default)]
    pub steam: i32,
    #[serde(default)]
    pub fry: i32,
    #[serde(default)]
    pub knife: i32,
    pub skill: u32,
    pub ultimate_skill: Option<u32>,
    pub ultimate_skill_extra: Option<Vec<u32>>,
    pub ultimate_skill_list: Option<Vec<u32>>,
    pub tags: Option<Vec<u32>>,
}

impl ChefRaw {
    pub fn get_ultimate_skills(&self) -> Vec<u32> {
        if let Some(list) = &self.ultimate_skill_list {
            list.clone()
        } else {
            let mut res = Vec::new();
            if let Some(sk) = self.ultimate_skill {
                res.push(sk);
            }
            if let Some(extras) = &self.ultimate_skill_extra {
                res.extend(extras);
            }
            res
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EquipRaw {
    pub equip_id: u32,
    pub name: String,
    pub rarity: usize,
    #[serde(default)]
    pub skill: Vec<u32>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OfficialGameDataRaw {
    #[serde(default)]
    pub chefs: Vec<ChefRaw>,
    #[serde(default)]
    pub recipes: Vec<RecipeRaw>,
    #[serde(default)]
    pub skills: Vec<SkillRaw>,
    #[serde(default)]
    pub equips: Vec<EquipRaw>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UserChefRaw {
    pub id: u32,
    pub got: Option<String>,
    pub ult: Option<String>,
    pub equip: Option<u32>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UserRecipeRaw {
    pub id: u32,
    pub got: Option<String>,
    pub ex: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct MyGameDataRaw {
    #[serde(default)]
    pub chefs: Vec<UserChefRaw>,
    #[serde(default)]
    pub recipes: Vec<UserRecipeRaw>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct MaterialEffectItem {
    pub material_i_d: usize,
    pub effect: f64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct RuleItemRaw {
    pub title: Option<String>,
    pub recipe_effect: Option<HashMap<String, f64>>,
    pub materials_limit: Option<serde_json::Value>,
    pub chef_tag_effect: Option<HashMap<String, f64>>,
    pub condiment_effect: Option<HashMap<String, f64>>,
    pub skill_effect: Option<HashMap<String, f64>>,
    pub materials_effect: Option<Vec<MaterialEffectItem>>,
    pub rarity_effect: Option<HashMap<String, f64>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RuleDataRaw {
    #[serde(default)]
    pub rules: Vec<RuleItemRaw>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalConfig {
    #[serde(default = "default_deep_limit")]
    pub deep_limit: Vec<usize>,
    #[serde(default = "default_recipe_limit")]
    pub recipe_limit: usize,
    #[serde(default = "default_chef_min_rarity")]
    pub chef_min_rarity: usize,
    #[serde(default = "default_filter_score_rate")]
    pub filter_score_rate: f64,
    #[serde(default)]
    pub use_equip: bool,
    #[serde(default)]
    pub use_all: bool,
    #[serde(default = "default_must_chefs")]
    pub must_chefs: Vec<String>,
    #[serde(default = "default_own_chef_top_k")]
    pub own_chef_top_k: usize,
    #[serde(default = "default_base_own_chef_top_k")]
    pub base_own_chef_top_k: usize,
    #[serde(default = "default_true")]
    pub enable_dynamic_top_k: bool,
    #[serde(default = "default_recipe_perturb_runs")]
    pub recipe_perturb_runs: usize,
    #[serde(default = "default_recipe_candidate_expand_rate")]
    pub recipe_candidate_expand_rate: f64,
    #[serde(default = "default_recipe_candidate_expand_max")]
    pub recipe_candidate_expand_max: usize,
    #[serde(default = "default_estimated_candidate_keep_rate")]
    pub estimated_candidate_keep_rate: f64,
    #[serde(default = "default_max_estimated_candidate_extra")]
    pub max_estimated_candidate_extra: usize,
    #[serde(default)]
    pub add_base_value: u32,
    #[serde(default = "default_chef_recipe_top_k")]
    pub chef_recipe_top_k: usize,
    #[serde(default = "default_rule_bucket_top_k")]
    pub rule_bucket_top_k: usize,
    #[serde(default = "default_scarce_recipe_top_k")]
    pub scarce_recipe_top_k: usize,
}

fn default_deep_limit() -> Vec<usize> {
    vec![1, 7, 6, 4, 3, 3, 3, 3, 5, 10]
}
fn default_recipe_limit() -> usize {
    120
}
fn default_chef_min_rarity() -> usize {
    5
}
fn default_filter_score_rate() -> f64 {
    0.92
}
fn default_must_chefs() -> Vec<String> {
    vec!["二郎神".to_string()]
}
fn default_own_chef_top_k() -> usize {
    5
}
fn default_base_own_chef_top_k() -> usize {
    3
}
fn default_true() -> bool {
    true
}
fn default_recipe_perturb_runs() -> usize {
    4
}
fn default_recipe_candidate_expand_rate() -> f64 {
    1.35
}
fn default_recipe_candidate_expand_max() -> usize {
    60
}
fn default_estimated_candidate_keep_rate() -> f64 {
    1.12
}
fn default_max_estimated_candidate_extra() -> usize {
    800
}
fn default_chef_recipe_top_k() -> usize {
    120
}
fn default_rule_bucket_top_k() -> usize {
    30
}
fn default_scarce_recipe_top_k() -> usize {
    40
}

impl Default for CalConfig {
    fn default() -> Self {
        Self {
            deep_limit: default_deep_limit(),
            recipe_limit: default_recipe_limit(),
            chef_min_rarity: default_chef_min_rarity(),
            filter_score_rate: default_filter_score_rate(),
            use_equip: false,
            use_all: false,
            must_chefs: default_must_chefs(),
            own_chef_top_k: default_own_chef_top_k(),
            base_own_chef_top_k: default_base_own_chef_top_k(),
            enable_dynamic_top_k: true,
            recipe_perturb_runs: default_recipe_perturb_runs(),
            recipe_candidate_expand_rate: default_recipe_candidate_expand_rate(),
            recipe_candidate_expand_max: default_recipe_candidate_expand_max(),
            estimated_candidate_keep_rate: default_estimated_candidate_keep_rate(),
            max_estimated_candidate_extra: default_max_estimated_candidate_extra(),
            add_base_value: 0,
            chef_recipe_top_k: default_chef_recipe_top_k(),
            rule_bucket_top_k: default_rule_bucket_top_k(),
            scarce_recipe_top_k: default_scarce_recipe_top_k(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FullCalculateRequest {
    pub my_game_data: serde_json::Value,
    pub rule: serde_json::Value,
    pub cal_config: Option<CalConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FinalRecipeItem {
    pub recipe: String,
    pub count: u32,
    pub single_price: i32,
    pub total_price: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FinalChefItem {
    pub chef: String,
    pub equip: String,
    pub recipes: Vec<FinalRecipeItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FinalTopResult {
    pub score: i32,
    pub chefs: Vec<FinalChefItem>,
}
