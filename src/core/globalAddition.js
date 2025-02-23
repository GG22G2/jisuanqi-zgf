

export class GlobalAddition {
    constructor(chefs, skills) {
        this.bake = 0;
        this.boil = 0;
        this.stirfry = 0;
        this.knife = 0;
        this.fry = 0;
        this.steam = 0;
        this.manfill = 0;
        this.womanfill = 0;
        this.price = 0;
        //各个星级菜谱的售价加成
        this.useall = [0, 0, 0, 0, 0, 0];
        this.maxequiplimit = [0, 0, 0, 0, 0, 0];
        this.init(chefs, skills)
    }

    init(chefs, skills1) {
        const skills = new Map();
        for (let i = 0; i < skills1.length; i++) {
            let skill = skills1[i];
            skills.set(skill.skillId, skill);
        }
        for (let i = 0; i < chefs.length; i++) {
            let chef = chefs[i];
            if (this.hasXiuLian(chef)) {
                const skill = skills.get(chef.ultimateSkill);
                if (skill == null) {
                    continue;
                }
                for (let j = 0; j < skill.effect.length; j++) {
                    let effect = skill.effect[j];
                    this.parseEffect(effect);
                }
            }

            //记不清为啥要拿技能走一遍了，3星技能也有全局加成吗?
            const skill = skills.get(chef.skill);
            if (skill == null) {
                continue;
            }
            for (let j = 0; j < skill.effect.length; j++) {
                let effect = skill.effect[j];
                this.parseEffect(effect);
            }

        }
        for (let i = 0; i < this.useall.length; i++) {
            this.useall[i] = this.useall[i] / 100;
        }
        this.manfill = Math.floor(this.manfill / 6);
        this.womanfill = Math.floor(this.womanfill / 6)

    }

    parseEffect(effect) {
        const type = effect.type;
        if (effect.condition === ("Global")) {
            if (effect.tag != null) {
                //男女技法区分
                if (effect.tag === 1) {
                    this.manfill = this.manfill + effect.value;
                } else if (effect.tag === 2) {
                    this.womanfill = this.womanfill + effect.value;
                }
            } else {
                switch ((type)) {
                    case "Bake":
                        this.bake = this.bake + effect.value;
                        break;
                    case "Steam":
                        this.steam = this.steam + effect.value;
                        break;
                    case "Boil":
                        this.boil = this.boil + effect.value;
                        break;
                    case "Fry":
                        this.fry = this.fry + effect.value;
                        break;
                    case "Knife":
                        this.knife = this.knife + effect.value;
                        break;
                    case "Stirfry":
                        this.stirfry = this.stirfry + effect.value;
                        break;
                    case "MaxEquipLimit":
                        this.maxequiplimit[effect.rarity] += effect.value;
                        break;
                    case "UseAll":
                        //菜谱售价
                        this.useall[effect.rarity] += effect.value;
                        break;
                    default:
                        break;
                }
            }
        }
    }

    hasXiuLian(chef) {
        return chef.ult;
    }
}
