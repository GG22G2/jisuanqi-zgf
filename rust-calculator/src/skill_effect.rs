use crate::models::SkillEffectRaw;

#[derive(Debug, Clone)]
pub struct SkillEffect {
    pub bake: i32,
    pub boil: i32,
    pub stirfry: i32,
    pub knife: i32,
    pub fry: i32,
    pub steam: i32,
    pub bake_percent: f64,
    pub boil_percent: f64,
    pub stirfry_percent: f64,
    pub knife_percent: f64,
    pub fry_percent: f64,
    pub steam_percent: f64,

    pub usefish: f64,
    pub usecreation: f64,
    pub usemeat: f64,
    pub usevegetable: f64,

    pub usebake: f64,
    pub useboil: f64,
    pub usestirfry: f64,
    pub useknife: f64,
    pub usefry: f64,
    pub usesteam: f64,

    pub use_tasty: f64,
    pub use_salty: f64,
    pub use_spicy: f64,
    pub use_sweet: f64,
    pub use_bitter: f64,
    pub use_sour: f64,

    pub base_price: f64,
    pub base_price_abs: i32,

    pub basic_price_use_bake: f64,
    pub basic_price_use_boil: f64,
    pub basic_price_use_stirfry: f64,
    pub basic_price_use_knife: f64,
    pub basic_price_use_fry: f64,
    pub basic_price_use_steam: f64,

    pub basic_price_use_sour: f64,
    pub basic_price_use_salty: f64,
    pub basic_price_use_tasty: f64,
    pub basic_price_use_sweet: f64,
    pub basic_price_use_spicy: f64,
    pub basic_price_use_bitter: f64,

    pub rarity: [f64; 6],
    pub base_rarity: [f64; 6],

    pub excess_cookbook_num: Vec<(u32, f64)>,
    pub fewer_cookbook_num: Vec<(u32, f64)>,
    pub excess_rank: Vec<(usize, f64)>,
    pub base_excess_rank: Vec<(usize, f64)>,
}

impl Default for SkillEffect {
    fn default() -> Self {
        Self {
            bake: 0,
            boil: 0,
            stirfry: 0,
            knife: 0,
            fry: 0,
            steam: 0,
            bake_percent: 0.0,
            boil_percent: 0.0,
            stirfry_percent: 0.0,
            knife_percent: 0.0,
            fry_percent: 0.0,
            steam_percent: 0.0,
            usefish: 0.0,
            usecreation: 0.0,
            usemeat: 0.0,
            usevegetable: 0.0,
            usebake: 0.0,
            useboil: 0.0,
            usestirfry: 0.0,
            useknife: 0.0,
            usefry: 0.0,
            usesteam: 0.0,
            use_tasty: 0.0,
            use_salty: 0.0,
            use_spicy: 0.0,
            use_sweet: 0.0,
            use_bitter: 0.0,
            use_sour: 0.0,
            base_price: 0.0,
            base_price_abs: 0,
            basic_price_use_bake: 0.0,
            basic_price_use_boil: 0.0,
            basic_price_use_stirfry: 0.0,
            basic_price_use_knife: 0.0,
            basic_price_use_fry: 0.0,
            basic_price_use_steam: 0.0,
            basic_price_use_sour: 0.0,
            basic_price_use_salty: 0.0,
            basic_price_use_tasty: 0.0,
            basic_price_use_sweet: 0.0,
            basic_price_use_spicy: 0.0,
            basic_price_use_bitter: 0.0,
            rarity: [0.0; 6],
            base_rarity: [0.0; 6],
            excess_cookbook_num: Vec::new(),
            fewer_cookbook_num: Vec::new(),
            excess_rank: Vec::new(),
            base_excess_rank: Vec::new(),
        }
    }
}

impl SkillEffect {
    pub fn chef_tag_match_self(effect: &SkillEffectRaw, tags: Option<&[u32]>) -> bool {
        let Some(cond_list) = &effect.condition_value_list else {
            return false;
        };
        let Some(self_tags) = tags else {
            return false;
        };
        for t in self_tags {
            if cond_list.contains(t) {
                return true;
            }
        }
        false
    }

    pub fn chef_tag_match_self_percent(
        target: &mut f64,
        effect: &SkillEffectRaw,
        tags: Option<&[u32]>,
    ) {
        if effect.cal.as_deref() == Some("Percent") {
            if effect.condition_type.as_deref() == Some("ChefTag") {
                if Self::chef_tag_match_self(effect, tags) {
                    *target += effect.value / 100.0;
                }
            } else {
                *target += effect.value / 100.0;
            }
        }
    }

    pub fn apply_partial_effect(&mut self, effect: &SkillEffectRaw, tags: Option<&[u32]>) {
        if let Some(ct) = effect.condition_type.as_deref() {
            if ct == "SameSkill" || ct == "PerRank" {
                return;
            }
        }

        let Some(typ) = effect.type_.as_deref() else {
            return;
        };
        match typ {
            "Bake" => self.bake += effect.value as i32,
            "Steam" => self.steam += effect.value as i32,
            "Boil" => self.boil += effect.value as i32,
            "Fry" => self.fry += effect.value as i32,
            "Knife" => self.knife += effect.value as i32,
            "Stirfry" => self.stirfry += effect.value as i32,
            "UseSteam" => Self::chef_tag_match_self_percent(&mut self.usesteam, effect, tags),
            "BasicPrice" => match effect.condition_type.as_deref() {
                Some("CookbookRarity") => {
                    if let Some(list) = &effect.condition_value_list {
                        for &r in list {
                            if r < 6 {
                                if effect.cal.as_deref() == Some("Percent") {
                                    self.base_rarity[r as usize] += effect.value / 100.0;
                                } else {
                                    self.base_price_abs += effect.value as i32;
                                }
                            }
                        }
                    }
                }
                Some("Rank") => {
                    if let Some(cv) = effect.condition_value {
                        self.base_excess_rank
                            .push((cv as usize, effect.value / 100.0));
                    }
                }
                Some("ChefTag") => {
                    if Self::chef_tag_match_self(effect, tags)
                        && effect.cal.as_deref() == Some("Percent")
                    {
                        self.base_price += effect.value / 100.0;
                    }
                }
                _ => {}
            },
            "CookbookPrice" => {
                if effect.cal.as_deref() == Some("Percent") {
                    match effect.condition_type.as_deref() {
                        Some("CookbookRarity") => {
                            if let Some(list) = &effect.condition_value_list {
                                for &r in list {
                                    if r < 6 {
                                        self.rarity[r as usize] += effect.value / 100.0;
                                    }
                                }
                            }
                        }
                        Some("ExcessCookbookNum") => {
                            if let Some(cv) = effect.condition_value {
                                self.excess_cookbook_num
                                    .push((cv, effect.value / 100.0));
                            }
                        }
                        Some("FewerCookbookNum") => {
                            if let Some(cv) = effect.condition_value {
                                self.fewer_cookbook_num
                                    .push((cv, effect.value / 100.0));
                            }
                        }
                        Some("Rank") => {
                            if let Some(cv) = effect.condition_value {
                                self.excess_rank
                                    .push((cv as usize, effect.value / 100.0));
                            }
                        }
                        _ => {}
                    }
                }
            }
            "BasicPriceUseKnife" => {
                Self::chef_tag_match_self_percent(&mut self.basic_price_use_knife, effect, tags)
            }
            "BasicPriceUseStirfry" => {
                Self::chef_tag_match_self_percent(&mut self.basic_price_use_stirfry, effect, tags)
            }
            "BasicPriceUseFry" => {
                Self::chef_tag_match_self_percent(&mut self.basic_price_use_fry, effect, tags)
            }
            _ => {}
        }
    }

    pub fn apply_effect(&mut self, effect: &SkillEffectRaw, tags: Option<&[u32]>) {
        let cond = effect.condition.as_deref().unwrap_or("");
        if cond == "Partial" {
            self.apply_partial_effect(effect, tags);
            return;
        }
        if cond != "Self" {
            return;
        }

        let Some(typ) = effect.type_.as_deref() else {
            return;
        };
        let cal = effect.cal.as_deref().unwrap_or("");
        let val_f = effect.value / 100.0;

        match typ {
            "Bake" => {
                if cal == "Abs" {
                    self.bake += effect.value as i32;
                } else if cal == "Percent" {
                    self.bake_percent += val_f;
                }
            }
            "Steam" => {
                if cal == "Abs" {
                    self.steam += effect.value as i32;
                } else if cal == "Percent" {
                    self.steam_percent += val_f;
                }
            }
            "Boil" => {
                if cal == "Abs" {
                    self.boil += effect.value as i32;
                } else if cal == "Percent" {
                    self.boil_percent += val_f;
                }
            }
            "Fry" => {
                if cal == "Abs" {
                    self.fry += effect.value as i32;
                } else if cal == "Percent" {
                    self.fry_percent += val_f;
                }
            }
            "Knife" => {
                if cal == "Abs" {
                    self.knife += effect.value as i32;
                } else if cal == "Percent" {
                    self.knife_percent += val_f;
                }
            }
            "Stirfry" => {
                if cal == "Abs" {
                    self.stirfry += effect.value as i32;
                } else if cal == "Percent" {
                    self.stirfry_percent += val_f;
                }
            }
            "UseBake" => self.usebake += val_f,
            "UseSteam" => self.usesteam += val_f,
            "UseBoil" => self.useboil += val_f,
            "UseFry" => self.usefry += val_f,
            "UseKnife" => self.useknife += val_f,
            "UseStirfry" => self.usestirfry += val_f,
            "UseFish" => self.usefish += val_f,
            "UseCreation" => self.usecreation += val_f,
            "UseMeat" => self.usemeat += val_f,
            "UseVegetable" => self.usevegetable += val_f,
            "UseTasty" => self.use_tasty += val_f,
            "UseSalty" => self.use_salty += val_f,
            "UseSpicy" => self.use_spicy += val_f,
            "UseSweet" => self.use_sweet += val_f,
            "UseBitter" => self.use_bitter += val_f,
            "UseSour" => self.use_sour += val_f,
            "BasicPriceUseStirfry" => {
                if cal == "Percent" {
                    self.basic_price_use_stirfry += val_f;
                }
            }
            "BasicPriceUseBoil" => {
                if cal == "Percent" {
                    self.basic_price_use_boil += val_f;
                }
            }
            "BasicPriceUseSteam" => {
                if cal == "Percent" {
                    self.basic_price_use_steam += val_f;
                }
            }
            "BasicPriceUseKnife" => {
                if cal == "Percent" {
                    self.basic_price_use_knife += val_f;
                }
            }
            "BasicPriceUseBake" => {
                if cal == "Percent" {
                    self.basic_price_use_bake += val_f;
                }
            }
            "BasicPriceUseFry" => {
                if cal == "Percent" {
                    self.basic_price_use_fry += val_f;
                }
            }
            "BasicPriceUseSour" => {
                if cal == "Percent" {
                    self.basic_price_use_sour += val_f;
                }
            }
            "BasicPriceUseSalty" => {
                if cal == "Percent" {
                    self.basic_price_use_salty += val_f;
                }
            }
            "BasicPriceUseTasty" => {
                if cal == "Percent" {
                    self.basic_price_use_tasty += val_f;
                }
            }
            "BasicPriceUseSweet" => {
                if cal == "Percent" {
                    self.basic_price_use_sweet += val_f;
                }
            }
            "BasicPriceUseSpicy" => {
                if cal == "Percent" {
                    self.basic_price_use_spicy += val_f;
                }
            }
            "BasicPriceUseBitter" => {
                if cal == "Percent" {
                    self.basic_price_use_bitter += val_f;
                }
            }
            "CookbookPrice" => {
                if cal == "Percent" {
                    match effect.condition_type.as_deref() {
                        Some("CookbookRarity") => {
                            if let Some(list) = &effect.condition_value_list {
                                for &r in list {
                                    if r < 6 {
                                        self.rarity[r as usize] += val_f;
                                    }
                                }
                            }
                        }
                        Some("ExcessCookbookNum") => {
                            if let Some(cv) = effect.condition_value {
                                self.excess_cookbook_num.push((cv, val_f));
                            }
                        }
                        Some("FewerCookbookNum") => {
                            if let Some(cv) = effect.condition_value {
                                self.fewer_cookbook_num.push((cv, val_f));
                            }
                        }
                        Some("Rank") => {
                            if let Some(cv) = effect.condition_value {
                                self.excess_rank.push((cv as usize, val_f));
                            }
                        }
                        _ => {}
                    }
                }
            }
            _ => {}
        }
    }
}
