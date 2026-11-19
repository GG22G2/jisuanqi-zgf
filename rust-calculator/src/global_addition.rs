use crate::models::{ChefRaw, SkillRaw};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct GlobalAddition {
    pub bake: i32,
    pub boil: i32,
    pub stirfry: i32,
    pub knife: i32,
    pub fry: i32,
    pub steam: i32,
    pub manfill: i32,
    pub womanfill: i32,
    pub useall: [f64; 6],
    pub maxequiplimit: [u32; 6],
}

impl Default for GlobalAddition {
    fn default() -> Self {
        Self {
            bake: 0,
            boil: 0,
            stirfry: 0,
            knife: 0,
            fry: 0,
            steam: 0,
            manfill: 0,
            womanfill: 0,
            useall: [0.0; 6],
            maxequiplimit: [0; 6],
        }
    }
}

impl GlobalAddition {
    pub fn build(
        owned_chefs: &[ChefRaw],
        chef_ult_map: &HashMap<u32, bool>,
        skill_map: &HashMap<u32, SkillRaw>,
    ) -> Self {
        let mut ga = Self::default();

        for chef in owned_chefs {
            let is_ult = chef_ult_map.get(&chef.chef_id).copied().unwrap_or(false);

            if is_ult {
                for ult_id in chef.get_ultimate_skills() {
                    if let Some(skill) = skill_map.get(&ult_id) {
                        for eff in &skill.effect {
                            ga.parse_effect(eff);
                        }
                    }
                }
            }

            if let Some(skill) = skill_map.get(&chef.skill) {
                for eff in &skill.effect {
                    ga.parse_effect(eff);
                }
            }
        }

        for i in 0..6 {
            ga.useall[i] /= 100.0;
        }
        ga.manfill /= 6;
        ga.womanfill /= 6;

        ga
    }

    fn parse_effect(&mut self, effect: &crate::models::SkillEffectRaw) {
        if effect.condition.as_deref() != Some("Global") {
            return;
        }

        if let Some(tag) = effect.tag {
            if tag == 1 {
                self.manfill += effect.value as i32;
            } else if tag == 2 {
                self.womanfill += effect.value as i32;
            }
        } else if let Some(typ) = effect.type_.as_deref() {
            match typ {
                "Bake" => self.bake += effect.value as i32,
                "Steam" => self.steam += effect.value as i32,
                "Boil" => self.boil += effect.value as i32,
                "Fry" => self.fry += effect.value as i32,
                "Knife" => self.knife += effect.value as i32,
                "Stirfry" => self.stirfry += effect.value as i32,
                "MaxEquipLimit" => {
                    if effect.rarity < 6 {
                        self.maxequiplimit[effect.rarity] += effect.value as u32;
                    }
                }
                "UseAll" => {
                    if effect.rarity < 6 {
                        self.useall[effect.rarity] += effect.value;
                    }
                }
                _ => {}
            }
        }
    }
}
