//将结果转换成脚本， 可以在白菜菊花运行

async function setChef(index,chefName){
    document.querySelectorAll('.chef')[index].click();
    document.querySelectorAll('.chef')[index].click();
   await Vue.nextTick(()=>{
        setDropdown(chefName);
    })
}

async function setRecipe(chefIndex,recipeIndex,recipeName){
    document.querySelectorAll('.rep-box')[chefIndex].querySelectorAll('.rep')[recipeIndex].click()
    document.querySelectorAll('.rep-box')[chefIndex].querySelectorAll('.rep')[recipeIndex].click()
    await Vue.nextTick(()=>{
        setDropdown(recipeName);
    })
}

async function setDropdown(text){
    let dropdown =  getDisplayDropdown();
    let inputEl = dropdown.querySelector('input');
    inputEl.value = text
    inputEl.dispatchEvent(new Event('input'))
    await Vue.nextTick(()=>{
        dropdown.querySelectorAll(' ul > li ')[0].click()
    })
}

function getDisplayDropdown(){
    let dropdownList = document.querySelectorAll('.dropdown-box');
    for (let i = 0; i < dropdownList.length; i++) {
        let dropdown = dropdownList[i];
        if (dropdown.style.display!=='none'){
            return dropdown;
        }
    }
    return null;
}


await setChef(0,'小青龙');
await setChef(1,'普洛妮');
await setChef(2,'白发小黑');
await setRecipe(0,0,'庆典蛋糕')
await setRecipe(0,1,'章鱼小丸子')
await setRecipe(0,2,'马卡龙')
