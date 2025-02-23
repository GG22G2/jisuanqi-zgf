
export class IngredientLimit {
    constructor(ingredientNum) {
        if (typeof ingredientNum === 'number') {
            this.materialCount = new Int32Array(47)
            this.extraLimit = [0, 0, 0, 0, 0, 0];
            this.materialCount.fill(ingredientNum);
        } else {
            this.materialCount = new Int32Array(47)
            this.extraLimit = [0, 0, 0, 0, 0, 0];
            if (ingredientNum.length >= 47) {
                this.materialCount = ingredientNum;
            } else {
                this.materialCount.fill(50);
            }
        }
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
            t = t | 0;
            max = Math.min(t, max);
        }
        return max;
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
