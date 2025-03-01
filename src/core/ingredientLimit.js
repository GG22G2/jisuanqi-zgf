

export function getMaterialCount(materials){
    let materialCount= new Int32Array(47);
    if (typeof materials === 'number') {
        materialCount.fill(materials);
    } else {
        if (materials.length >= 47) {
            materialCount = materials;
        } else {
            materialCount.fill(50);
        }
    }
    return materialCount;
}


export class IngredientLimit {
    constructor(ingredientNum) {

    }

    cookingQuantity(recipe, count) {
        IngredientLimit.cookingQuantityAndReduce(recipe.materials, count, this.materialCount);
    }

    static cookingQuantity(materials, expected, materialCount) {
        let max = expected, t;
        const length = materials.length;
        for (let i = 0; i < length; i++) {
            const material = materials[i];
            t = materialCount[material.material] / material.quantity;
            max = Math.min(t, max);
        }
        return max| 0;
    }

    static cookingQuantityAndReduce(materials, count, materialCount) {
        let maxCount = count;
        let t;
        const length = materials.length;
        for (let i = 0; i < length; i++) {
            const material = materials[i];
            t = materialCount[material.material] / material.quantity;
            t = t | 0;
            maxCount = t < maxCount ? t : maxCount;
            materialCount[material.material] -= material.quantity * maxCount;
        }
    }

    getFinalMaterialCount() {
        let destinationArray = new Int32Array(47);
        destinationArray.set(this.materialCount);
        return destinationArray;
    }

    setMaterialCount(materialCount) {
        this.materialCount = materialCount;
    }
}
