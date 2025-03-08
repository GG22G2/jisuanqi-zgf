(function(){"use strict";self.onmessage=async k=>{let t=k.data;await T.setBaseData(t.data);let e=T.call(t.start,t.limit);console.log(e),self.postMessage({type:"r",result:e})};class D{constructor(){this.playRecipes=null,this.start=0,this.groupMaxScore=null,this.groupMaxScoreChefIndex=null,this.chefRealIndex=null,this.recipeCount=0}async setBaseData({playRecipesArr:t,recipePL:e,scoreCache:b,amberPrice:p,recipeCount:i,playChefCount:l,ownChefCount:r,playPresenceChefCount:h,presenceChefCount:n,chefEquipCount:s,chefMasks:x,chefMatchMasks:c,chefRealIndex:S}){this.playRecipes=t,this.recipePL=e;let I=null;console.time("计算每三道菜最高得分的厨师"),navigator.gpu?I=await this.computeWithWebGPU(b,i,l+h,r,n,s):I=this.calAllCache(b,i,l+h,r,n,s),console.timeEnd("计算每三道菜最高得分的厨师"),this.groupMaxScore=I.groupMaxScore,this.groupMaxScoreChefIndex=I.groupMaxScoreChefIndex,this.chefRealIndex=S,this.recipeCount=i,this.chefMasks=x,this.chefMatchMasks=c,this.presenceChefCount=n}call(t,e){let b=Date.now(),p=0,i=0,l,r,h,n=new Array(3),s=this.chefMasks,x=this.chefMatchMasks,c={maxScore:0,maxScoreChefGroup:n,recipes:null};const S=this.recipeCount;let I=this.chefRealIndex;const v=this.playRecipes;let o=new Uint16Array(v.length*1680);for(let a=t;a<e;a++){const B=a*9;for(let f=0;f<1680;f++){const m=this.recipePL[f];for(let y=0;y<9;y++)o[a*1680*9+f*9+y]=v[B+m[y]]}}const P=this.presenceChefCount+3;for(let a=0;a<o.length;a+=9){l=this.getIndex(o[a+0],o[a+1],o[a+2],S),r=this.getIndex(o[a+3],o[a+4],o[a+5],S),h=this.getIndex(o[a+6],o[a+7],o[a+8],S),l=l*P,r=r*P,h=h*P;for(let B=0;B<P;B++)for(let f=0;f<P;f++)for(let m=0;m<P;m++){let y=this.groupMaxScore[l+B]+this.groupMaxScore[r+f]+this.groupMaxScore[h+m];if(y>i){let A=this.groupMaxScoreChefIndex[l+B],G=this.groupMaxScoreChefIndex[r+f],g=this.groupMaxScoreChefIndex[h+m],M=I[A],u=I[G],U=I[g];if(M!==u&&M!==U&&u!==U){let d=x[A],C=x[G],w=x[g];if(d|C|w){let N=s[A],R=s[G],_=s[g],q=d&(R|_),z=C&(N|_),E=w&(N|R);if(q!==d||z!==C||E!==w)continue}i=y,c.maxScore=i,c.maxScoreChefGroup=[A,G,g],c.recipes=o.slice(a,a+9),c.scores=[this.groupMaxScore[l+B],this.groupMaxScore[r+f],this.groupMaxScore[h+m]]}}}}return p=Date.now(),console.info(e-t+"组数据计算用时:"+(p-b)+"ms"),c}calAllCache(t,e,b,p,i,l){let r=this.calI(e-2,e-2);console.log(r,e*e*e);const h=new Int32Array(r*(3+i)),n=new Int32Array(r*(3+i));console.time("计算每三道菜最高得分的厨师");let s=0;for(let x=0;x<e;x++){for(let c=x+1;c<e;c++)for(let S=c+1;S<e;S++){s=this.getIndex(x,c,S,e),s=s*(3+i);let I=0,v=0,o=0,P=0,a=0,B=0,f=0;for(let m=0;m<p;m++){let y=l[m],A=f,G=f+y+1,g=0,M=0;for(let u=A;u<G;u++)if(!(t[u*e+x]===0||t[u*e+c]===0||t[u*e+S]===0)){const U=t[u*e+x]+t[u*e+c]+t[u*e+S];U>g&&(g=U,M=u)}f=G,g>I?(o=v,B=a,v=I,a=P,I=g,P=M):g>v?(o=v,B=a,v=g,a=M):g>o&&(o=g,B=M)}n[s]=P,n[s+1]=a,n[s+2]=B,h[s]=I,h[s+1]=v,h[s+2]=o;for(let m=0;m<i;m++){let y=m+p,A=l[y],G=f,g=f+A+1,M=0,u=0;for(let d=G;d<g;d++)if(!(t[d*e+x]===0||t[d*e+c]===0||t[d*e+S]===0)){const C=t[d*e+x]+t[d*e+c]+t[d*e+S];C>M&&(M=C,u=d)}f=g;let U=s+3+m;n[U]=u,h[U]=M}}postMessage({type:"p",p:s/(r*(3+i))})}return console.timeEnd("计算每三道菜最高得分的厨师"),{groupMaxScore:h,groupMaxScoreChefIndex:n}}async initWebGPU(){if(console.log("执行initWebGPU"),console.log(navigator.gpu),console.log(WorkerNavigator.gpu),!navigator.gpu)throw console.log("WebGPU not supported"),new Error("WebGPU not supported");const e=await(await navigator.gpu.requestAdapter()).requestDevice({requiredLimits:{maxBufferSize:2147483644,maxStorageBufferBindingSize:2147483644}});return console.log("gpuDevice",e),e}async computeWithWebGPU(t,e,b,p,i,l){const r=await this.initWebGPU();try{const n=this.calI(e-2,e-2)*(3+i)*4;let s=n+n;console.log("预估显存占用",s/1024/1024/1024);const x=r.createBuffer({size:t.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});r.queue.writeBuffer(x,0,t);const c=r.createBuffer({size:l.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});r.queue.writeBuffer(c,0,l);const S=new Uint32Array([e,b,p,i]),I=r.createBuffer({size:S.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});r.queue.writeBuffer(I,0,S);const v=r.createBuffer({size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),o=r.createBuffer({size:n,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),P=r.createShaderModule({code:` @group(0) @binding(0) var<storage, read> scoreCache: array<i32>;
                @group(0) @binding(1) var<storage, read> chefEquipCount: array<i32>;
                @group(0) @binding(2) var<storage, read_write> groupMaxScore: array<i32>;
                @group(0) @binding(3) var<storage, read_write> groupMaxScoreChefIndex: array<i32>;
         
         fn calI(i: i32, N: i32) -> i32 {
            let i_f32 = i;
            let N_f32 = N;
            let term1 = i_f32 * (i_f32 - 1) * (i_f32 - 3 * N_f32 - 2) / 6;
            let term2 = i_f32 * N_f32 * (N_f32 + 1) / 2;
            return term1 + term2;
        }

// Function to calculate calJ (translated from JS)
fn calJ(i: i32, j: i32, N: i32) -> i32 {
    let count = j - i;
    let start = N - i - 2;
    let end = start - count + 1;
    return (start + end) * count / 2;
}

// Function to calculate getIndex (translated from JS)
        fn getIndex(i: i32, j: i32, k: i32, recipeCount: i32) -> i32 {
            let c1 = calI(i, recipeCount - 2);
            let c2 = calJ(i, j - 1, recipeCount);
            let c3 = k - j - 1;
            return c1 + c2 + c3;
        }
                
                @compute @workgroup_size(256)
                fn main(@builtin(global_invocation_id) globalIndex: vec3<u32>) {
                            let recipeCount : i32 = ${e};
                           let totalChefCount : i32 = ${b};
                           let ownChefCount : i32= ${p};
                           let ownPresenceChefCount : i32= ${i};
                             let queueDeep : i32 = ${3+i};
                             
                    //let maxIndex: i32 = recipeCount * recipeCount * recipeCount;
                     let maxIndex: i32 = ${e*e*e};
                    let r2: i32 = recipeCount * recipeCount;
                
                    // Compute rawIndex using x, y, z dimensions
                    let rawIndex: i32 = i32(globalIndex.x + globalIndex.y * 65535u * 256u + globalIndex.z * 65535u * 256u * 4u);
                
                    if (rawIndex >= maxIndex) {
                        return;
                    }
                
                    let i: i32 = rawIndex / r2;
                    let j: i32 = (rawIndex % r2) / recipeCount;
                    let k: i32 = rawIndex % recipeCount;
                
                    if (i >= j || j >= k) {
                        return;
                    }
                    
                    let index = getIndex(i,j,k,recipeCount) * queueDeep;
                    
                    var a: i32 = 0;
                    var b: i32 = 0;
                    var c: i32 = 0;
                    var ai: i32 = 0;
                    var bi: i32 = 0;
                    var ci: i32 = 0;

                    var tAdd: i32 = 0;

                    for (var r: i32 = 0; r < ownChefCount; r++) {
                        var equipCount: i32 = chefEquipCount[r];
                        var start: i32 = tAdd;
                        var end: i32 = tAdd + equipCount + 1;
                        var maxNum: i32 = 0;
                        var maxT: i32 = 0;

                        for (var t: i32 = start; t < end; t++) {
                            if (!(scoreCache[t * recipeCount + i] == 0 || scoreCache[t * recipeCount + j] == 0 || scoreCache[t * recipeCount + k] == 0)) {
                                let num : i32 = scoreCache[t * recipeCount + i] + scoreCache[t * recipeCount + j] + scoreCache[t * recipeCount + k];
                                if (num > maxNum) {
                                    maxNum = num;
                                    maxT = t;
                                }
                            }
                        }
                        tAdd = end;

                        if (maxNum > a) {
                            c = b;
                            ci = bi;
                            b = a;
                            bi = ai;
                            a = maxNum;
                            ai = maxT;
                        } else if (maxNum > b) {
                            c = b;
                            ci = bi;
                            b = maxNum;
                            bi = maxT;
                        } else if (maxNum > c) {
                            c = maxNum;
                            ci = maxT;
                        }
                    }
          
                    groupMaxScoreChefIndex[index] = ai;
                    groupMaxScoreChefIndex[index + 1] = bi;
                    groupMaxScoreChefIndex[index + 2] = ci;

                    groupMaxScore[index] = a;
                    groupMaxScore[index + 1] = b;
                    groupMaxScore[index + 2] = c;

                    for (var r1: i32 = 0; r1 < ownPresenceChefCount; r1++) {
                        var r : i32= r1 + ownChefCount;
                        var equipCount: i32 = chefEquipCount[r];
                        var start: i32 = tAdd;
                        var end: i32 = tAdd + equipCount + 1;
                        var maxNum: i32 = 0;
                        var maxT: i32 = 0;

                        for (var t: i32 = start; t < end; t++) {
                            if (!(scoreCache[t * recipeCount + i] == 0 || scoreCache[t * recipeCount + j] == 0 || scoreCache[t * recipeCount + k] == 0)) {
                                let num = scoreCache[t * recipeCount + i] + scoreCache[t * recipeCount + j] + scoreCache[t * recipeCount + k];
                                if (num > maxNum) {
                                    maxNum = num;
                                    maxT = t;
                                }
                            }
                        }
                        tAdd = end;

                        let chefScoreIndex : i32 = index + 3 + r1;
                        groupMaxScoreChefIndex[chefScoreIndex] = maxT;
                        groupMaxScore[chefScoreIndex] = maxNum;
                    }
                }

`}),a=r.createComputePipeline({layout:"auto",compute:{module:P,entryPoint:"main"}}),B=r.createBindGroup({layout:a.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:x}},{binding:1,resource:{buffer:c}},{binding:2,resource:{buffer:v}},{binding:3,resource:{buffer:o}}]}),f=e**3,y=Math.ceil(f/256);let G=Math.min(y,65535),g=Math.ceil(y/G);const M=r.createCommandEncoder(),u=M.beginComputePass();u.setPipeline(a),u.setBindGroup(0,B),u.dispatchWorkgroups(G,g),u.end();const U=r.createBuffer({size:n,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),d=r.createBuffer({size:n,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});M.copyBufferToBuffer(v,0,U,0,n),M.copyBufferToBuffer(o,0,d,0,n),r.queue.submit([M.finish()]),await U.mapAsync(GPUMapMode.READ),await d.mapAsync(GPUMapMode.READ);const C=new Int32Array(U.getMappedRange().slice()),w=new Int32Array(d.getMappedRange().slice());return U.unmap(),d.unmap(),U.destroy(),d.destroy(),v.destroy(),o.destroy(),I.destroy(),c.destroy(),x.destroy(),{groupMaxScore:C,groupMaxScoreChefIndex:w}}finally{r.destroy()}}getIndex(t,e,b,p){let i=this.calI(t,p-2),l=this.calJ(t,e-1,p),r=b-e-1;return i+l+r}calI(t,e){const b=t*(t-1)*(t-3*e-2)/6,p=t*e*(e+1)/2;return b+p}calJ(t,e,b){const p=e-t,i=b-t-2,l=i-p+1;return(i+l)*p/2}}let T=new D})();
