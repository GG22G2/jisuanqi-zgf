(function(){"use strict";let d=!1;self.onmessage=w=>{let t=w.data;if(d){let s=P.call(t.start,t.limit);self.postMessage({type:"r",maxK:s})}else{let s=JSON.parse(t.data);P.setBaseData(s.playRecipes2,s.playChefs,s.recipe2Change,s.tempCalCache),d=!0}};class e{constructor(){this.playRecipes=null,this.playChefs=null,this.start=0,this.scoreCache=null,this.groupScoreCacheNoIndex=null,this.groupScoreCache=null,this.recipe2Change=null}static __static_initialize(){e.__static_initialized||(e.__static_initialized=!0,e.__static_initializer_0())}static disordePermuation_$LI$(){if(e.__static_initialize(),e.disordePermuation==null){e.disordePermuation=new Array(1680);for(let t=0;t<1680;t++)e.disordePermuation[t]=new Array(9).fill(0)}return e.disordePermuation}static __static_initializer_0(){const t=[0,1,2,3,4,5,6,7,8];e.permute(t,[0,0,0,0,0,0,0,0,0],[0,0,0],0)}setBaseData(t,s,a,c){this.playRecipes=t,this.playChefs=s,this.scoreCache=c.scoreCacheNoEquip,this.groupScoreCacheNoIndex=c.groupScoreCacheNoIndex,this.groupScoreCache=c.groupScoreCache,this.recipe2Change=a}call(t,s){let a=Date.now(),c=0,o=new Array(this.playChefs.length);for(let i=0;i<o.length;i++)o[i]=this.playChefs[i][2];let g=new Array(this.groupScoreCache.length).fill(!1),p=0;for(let i=0;i<this.groupScoreCache.length;i++)for(let n of this.groupScoreCache[i])n>p&&(p=n);p=.35*p;for(let i=0;i<this.groupScoreCache.length;i++){let n=0,r=!1;for(let h of this.groupScoreCache[i])n+=h,h>p&&(r=!0);g[i]=n===0||!r}let L=0,z=0,B=BigInt(0),C,I,x,y=0;for(let i=t;i<s;i++){let n=(i-t)/(s-t)*100|0;n>y&&(self.postMessage({type:"p",p:n-y}),y=n);const r=this.playRecipes[i];let h=0;for(let f=0;f<1680;f++){const l=e.disordePermuation_$LI$()[f];if(C=this.groupScoreCacheNoIndex[r[l[0]]][r[l[1]]]+(r[l[2]]-r[l[1]]-1),I=this.groupScoreCacheNoIndex[r[l[3]]][r[l[4]]]+(r[l[5]]-r[l[4]]-1),x=this.groupScoreCacheNoIndex[r[l[6]]][r[l[7]]]+(r[l[8]]-r[l[7]]-1),g[C]||g[I]||g[x])continue;let D=this.groupScoreCache[x];for(let _=0,u=0,S=0,m;_<this.recipe2Change.length;_++){m=this.recipe2Change[_];let N=this.playChefs[u],$=this.groupScoreCache[C][N[0]];if($===0){u=m;continue}if(S=$+this.groupScoreCache[I][N[1]],S===0){u=m;continue}for(let K=Math.max(L-S,0);u<m;u++)h=D[o[u]],h>K&&(h+=S,h>z&&(z=h,B=((BigInt(h)<<18n|BigInt(i))<<11n|BigInt(f))<<14n|BigInt(u)))}}}return c=Date.now(),console.info(s-t+"全菜谱 全厨师 无厨具排列结果用时:"+(c-a)+"ms"),B}static permute(t,s,a,c){if(a[0]+a[1]+a[2]===9){for(let o=0;o<9;o++)e.disordePermuation_$LI$()[e.index][o]=s[o];e.index++;return}for(let o=0;o<3;o++)a[o]!==3&&(s[o*3+a[o]]=t[c],a[o]++,e.permute(t,s,a,c+1),a[o]--)}}e.__static_initialized=!1,e.index=0,e.disordePermuation_$LI$(),e.__static_initialize();let P=new e})();