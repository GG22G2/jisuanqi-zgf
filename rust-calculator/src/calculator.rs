use crate::skill_effect::SkillEffect;

pub const QUALITY_ADD: [f64; 6] = [-1.0, 0.0, 0.1, 0.3, 0.5, 1.0];

#[derive(Debug, Clone)]
pub struct ChefInternal {
    pub chef_id: u32,
    pub name: String,
    pub rarity: usize,
    pub stirfry: i32,
    pub bake: i32,
    pub boil: i32,
    pub steam: i32,
    pub fry: i32,
    pub knife: i32,
    pub tags: Option<Vec<u32>>,
    pub ult: bool,
    pub mask: u32,
    pub match_mask: u32,
    pub index: usize,
    pub remark: String,
    pub skill_effect: SkillEffect,
}

#[derive(Debug, Clone)]
pub struct RecipeInternal {
    pub recipe_id: usize, // Compact ID (0..N-1)
    pub original_id: u32,
    pub name: String,
    pub rarity: usize,
    pub price: u32,
    pub ex_price: u32,
    pub stirfry: u32,
    pub bake: u32,
    pub boil: u32,
    pub steam: u32,
    pub fry: u32,
    pub knife: u32,
    pub condiment: String,
    pub is_tasty: bool,
    pub is_salty: bool,
    pub is_spicy: bool,
    pub is_sweet: bool,
    pub is_bitter: bool,
    pub is_sour: bool,
    pub tags: [f64; 4], // [creation, meat, vegetable, fish]
    pub materials: Vec<(usize, u32)>,
    pub limit: u32,
    pub material_feature: u64,

    // Dynamic fields populated during pruning
    pub p_index: usize,
    pub count: u32,
    pub reward_price: f64,
    pub estimated_chef_add: f64,
    pub estimated_reward_price: f64,
    pub candidate_source_mask: u32,
    pub candidate_source_count: u32,
    pub candidate_sort_score: f64,
    pub candidate_best_chef_score: f64,
    pub candidate_rule_hits: u32,
    pub candidate_chef_hits: u32,
}

#[derive(Debug, Clone)]
pub struct Calculator {
    pub base: f64,
    pub recipe_reward: Vec<f64>,
    pub sex_reward: [f64; 2],
    pub use_all: [f64; 6],
}

impl Calculator {
    pub fn new(recipe_reward: Vec<f64>, sex_reward: [f64; 2], use_all: [f64; 6]) -> Self {
        Self {
            base: 1.0,
            recipe_reward,
            sex_reward,
            use_all,
        }
    }

    pub fn quality_add_no_equip(
        &self,
        chef: &ChefInternal,
        effect: &SkillEffect,
        recipe: &RecipeInternal,
    ) -> f64 {
        let mut ratio: i32 = 5;

        if recipe.bake != 0 {
            let s = ((chef.bake + effect.bake) as f64) * (1.0 + effect.bake_percent);
            let s = s.max(0.0);
            let t = (s as i32) / (recipe.bake as i32);
            ratio = ratio.min(t);
        }
        if recipe.boil != 0 {
            let s = ((chef.boil + effect.boil) as f64) * (1.0 + effect.boil_percent);
            let s = s.max(0.0);
            let t = (s as i32) / (recipe.boil as i32);
            ratio = ratio.min(t);
        }
        if recipe.stirfry != 0 {
            let s = ((chef.stirfry + effect.stirfry) as f64) * (1.0 + effect.stirfry_percent);
            let s = s.max(0.0);
            let t = (s as i32) / (recipe.stirfry as i32);
            ratio = ratio.min(t);
        }
        if recipe.knife != 0 {
            let s = ((chef.knife + effect.knife) as f64) * (1.0 + effect.knife_percent);
            let s = s.max(0.0);
            let t = (s as i32) / (recipe.knife as i32);
            ratio = ratio.min(t);
        }
        if recipe.fry != 0 {
            let s = ((chef.fry + effect.fry) as f64) * (1.0 + effect.fry_percent);
            let s = s.max(0.0);
            let t = (s as i32) / (recipe.fry as i32);
            ratio = ratio.min(t);
        }
        if recipe.steam != 0 {
            let s = ((chef.steam + effect.steam) as f64) * (1.0 + effect.steam_percent);
            let s = s.max(0.0);
            let t = (s as i32) / (recipe.steam as i32);
            ratio = ratio.min(t);
        }

        if ratio < 0 {
            -1.0
        } else {
            let r = ratio.min(5) as usize;
            QUALITY_ADD[r]
        }
    }

    pub fn base_price_add(&self, effect: &SkillEffect, recipe: &RecipeInternal) -> f64 {
        let mut add = effect.base_price;
        if recipe.bake != 0 {
            add += effect.basic_price_use_bake;
        }
        if recipe.boil != 0 {
            add += effect.basic_price_use_boil;
        }
        if recipe.stirfry != 0 {
            add += effect.basic_price_use_stirfry;
        }
        if recipe.knife != 0 {
            add += effect.basic_price_use_knife;
        }
        if recipe.fry != 0 {
            add += effect.basic_price_use_fry;
        }
        if recipe.steam != 0 {
            add += effect.basic_price_use_steam;
        }

        if recipe.is_tasty {
            add += effect.basic_price_use_tasty;
        }
        if recipe.is_salty {
            add += effect.basic_price_use_salty;
        }
        if recipe.is_spicy {
            add += effect.basic_price_use_spicy;
        }
        if recipe.is_sweet {
            add += effect.basic_price_use_sweet;
        }
        if recipe.is_bitter {
            add += effect.basic_price_use_bitter;
        }
        if recipe.is_sour {
            add += effect.basic_price_use_sour;
        }

        add
    }

    pub fn skill_add(&self, effect: &SkillEffect, recipe: &RecipeInternal) -> f64 {
        let mut add = 0.0;
        if recipe.bake != 0 {
            add += effect.usebake;
        }
        if recipe.boil != 0 {
            add += effect.useboil;
        }
        if recipe.stirfry != 0 {
            add += effect.usestirfry;
        }
        if recipe.knife != 0 {
            add += effect.useknife;
        }
        if recipe.fry != 0 {
            add += effect.usefry;
        }
        if recipe.steam != 0 {
            add += effect.usesteam;
        }

        if recipe.is_tasty {
            add += effect.use_tasty;
        }
        if recipe.is_salty {
            add += effect.use_salty;
        }
        if recipe.is_spicy {
            add += effect.use_spicy;
        }
        if recipe.is_sweet {
            add += effect.use_sweet;
        }
        if recipe.is_bitter {
            add += effect.use_bitter;
        }
        if recipe.is_sour {
            add += effect.use_sour;
        }

        add += effect.usecreation * recipe.tags[0]
            + effect.usemeat * recipe.tags[1]
            + effect.usevegetable * recipe.tags[2]
            + effect.usefish * recipe.tags[3];

        add
    }

    pub fn cal_single_price(&self, chef: &ChefInternal, recipe: &RecipeInternal) -> i32 {
        let skill_effect = &chef.skill_effect;
        let quality_add_q = self.quality_add_no_equip(chef, skill_effect, recipe);
        if quality_add_q < 0.0 {
            return 0;
        }

        let mut sex_add = 0.0;
        if let Some(tags) = &chef.tags {
            for &sex_tag in tags {
                if sex_tag == 1 {
                    sex_add += self.sex_reward[0];
                } else if sex_tag == 2 {
                    sex_add += self.sex_reward[1];
                }
            }
        }

        let mut quality_add_s = 0.0;

        for rank in &skill_effect.excess_rank {
            if QUALITY_ADD[rank.0] <= quality_add_q {
                quality_add_s += rank.1;
            }
        }

        for item in &skill_effect.excess_cookbook_num {
            if item.0 >= recipe.count {
                quality_add_s += item.1;
            }
        }

        for item in &skill_effect.fewer_cookbook_num {
            if item.0 <= recipe.count {
                quality_add_s += item.1;
            }
        }

        quality_add_s += self.skill_add(skill_effect, recipe);

        let mut price = recipe.price as f64;
        let base_price_add =
            self.base_price_add(skill_effect, recipe) + skill_effect.base_rarity[recipe.rarity];
        if base_price_add != 0.0 {
            price = ((price * (1.0 + base_price_add)) as i32) as f64;
        }

        let reward = if recipe.recipe_id < self.recipe_reward.len() {
            self.recipe_reward[recipe.recipe_id]
        } else {
            0.0
        };

        let mult = self.base
            + reward
            + sex_add
            + quality_add_q
            + quality_add_s
            + self.use_all[recipe.rarity]
            + skill_effect.rarity[recipe.rarity];

        (price * mult).ceil() as i32
    }
}
