(function(){"use strict";self.onmessage=A=>{let c=A.data;y.setBaseData(c.data);let I=y.call(c.start,c.limit);self.postMessage({type:"r",result:I})};class G{constructor(){this.playRecipes=null,this.start=0,this.groupRecipeIndex=null,this.groupMaxScore=null,this.groupMaxScoreChefIndex=null}setBaseData({playRecipes2:c,recipePL:I,amberPrice:s,scoreCache:M,recipeCount:i,chefCount:x}){this.playRecipes=c,this.recipePL=I;let a=this.calAllCache(M,s,i,x);this.groupMaxScore=a.groupMaxScore,this.groupMaxScoreChefIndex=a.groupMaxScoreChefIndex,this.groupRecipeIndex=a.groupRecipeIndex}call(c,I){let s=Date.now(),M=0,i=0,x,a,h,r={maxScore:0,maxScoreChefGroup:new Array(3),recipes:null,permuation:null};const e=this.playRecipes,n=Math.sqrt(this.groupRecipeIndex.length);for(let g=c;g<I;g++){const t=g*9;for(let d=0;d<1680;d++){const o=this.recipePL[d];x=this.groupRecipeIndex[e[t+o[0]]*n+e[t+o[1]]]+(e[t+o[2]]-e[t+o[1]]-1),a=this.groupRecipeIndex[e[t+o[3]]*n+e[t+o[4]]]+(e[t+o[5]]-e[t+o[4]]-1),h=this.groupRecipeIndex[e[t+o[6]]*n+e[t+o[7]]]+(e[t+o[8]]-e[t+o[7]]-1),x=x*3,a=a*3,h=h*3;let S=this.groupMaxScore[x]+this.groupMaxScore[a]+this.groupMaxScore[h];if(S>i){let p=this.groupMaxScoreChefIndex[x],f=this.groupMaxScoreChefIndex[a],l=this.groupMaxScoreChefIndex[h];if(p!==f&&p!==l&&f!==l)i=S,r.maxScore=i,r.maxScoreChefGroup=[p,f,l],r.recipes=e.slice(t,t+9),r.permuation=o;else for(let u=0;u<3;u++)for(let m=0;m<3;m++)for(let R=0;R<3;R++)S=this.groupMaxScore[x+u]+this.groupMaxScore[a+m]+this.groupMaxScore[h+R],p=this.groupMaxScoreChefIndex[x+u],f=this.groupMaxScoreChefIndex[a+m],l=this.groupMaxScoreChefIndex[h+R],S>i&&p!==f&&p!==l&&f!==l&&(i=S,r.maxScore=i,r.maxScoreChefGroup=[p,f,l],r.recipes=e.slice(t,t+9),r.permuation=o)}}}return M=Date.now(),console.info(I-c+"组数据计算用时:"+(M-s)+"ms"),r}calAllCache(c,I,s,M){let i=0;for(let e=0;e<s;e++)for(let n=e+1;n<s;n++)for(let g=n+1;g<s;g++)i++;console.log(`菜谱组合 ${i}`);const x=new Int32Array(s*s),a=new Int32Array(i*3),h=new Int32Array(i*3),w=new Int32Array(i);let r=0;console.time("计算菜谱组合最高3个得分"),r=0;for(let e=0;e<s;e++){for(let n=e+1;n<s;n++){x[e*s+n]=r/3;for(let g=n+1;g<s;g++){let t=0,d=0,o=0,S=0,p=0,f=0;for(let l=0;l<M;l++){let u=0;c[l*s+e]===0||c[l*s+n]===0||c[l*s+g]===0||(u=c[l*s+e]+c[l*s+n]+c[l*s+g]+w[r/3]),u>t?(o=d,f=p,d=t,p=S,t=u,S=l):u>d?(o=d,f=p,d=u,p=l):u>o&&(o=u,f=l)}h[r]=S,h[r+1]=p,h[r+2]=f,a[r]=t,a[r+1]=d,a[r+2]=o,r=r+3}}postMessage({type:"p",p:r/(i*3)})}return console.timeEnd("计算菜谱组合最高3个得分"),{groupRecipeIndex:x,groupMaxScore:a,groupMaxScoreChefIndex:h}}}let y=new G})();
