(function(){"use strict";self.onmessage=async p=>{let e=p.data;await R.setBaseData(e.data);let t=R.call(e.start,e.limit);console.log(t),self.postMessage({type:"r",result:t})};class j{constructor(){this.playRecipes=null,this.start=0,this.groupMaxScore=null,this.groupMaxScoreChefIndex=null,this.chefRealIndex=null,this.recipeCount=0}async setBaseData({playRecipesArr:e,recipePL:t,scoreCache:I,amberPrice:g,recipeCount:s,playChefCount:r,ownChefCount:b,playPresenceChefCount:o,presenceChefCount:P,chefEquipCount:n,chefMasks:l,chefMatchMasks:f,chefRealIndex:h}){this.playRecipes=e,this.recipePL=t,console.time("计算每三道菜最高得分的厨师");let M=await q(I,s,r+o,b,P,n);console.timeEnd("计算每三道菜最高得分的厨师"),this.groupMaxScore=M.groupMaxScore,this.groupMaxScoreChefIndex=M.groupMaxScoreChefIndex,this.chefRealIndex=h,this.recipeCount=s,this.chefMasks=l,this.chefMatchMasks=f,this.presenceChefCount=P}call(e,t){let I=Date.now(),g=0,s=0,r,b,o,P=new Array(3),n=this.chefMasks,l=this.chefMatchMasks,f={maxScore:0,maxScoreChefGroup:P,recipes:null};const h=this.recipeCount;let M=this.chefRealIndex;const B=this.playRecipes;let c=new Uint16Array(B.length*1680);for(let a=e;a<t;a++){const U=a*9;for(let m=0;m<1680;m++){const d=this.recipePL[m];for(let A=0;A<9;A++)c[a*1680*9+m*9+A]=B[U+d[A]]}}const C=this.presenceChefCount+3;for(let a=0;a<c.length;a+=9){r=w(c[a+0],c[a+1],c[a+2],h),b=w(c[a+3],c[a+4],c[a+5],h),o=w(c[a+6],c[a+7],c[a+8],h),r=r*C,b=b*C,o=o*C;for(let U=0;U<C;U++)for(let m=0;m<C;m++)for(let d=0;d<C;d++){let A=this.groupMaxScore[r+U]+this.groupMaxScore[b+m]+this.groupMaxScore[o+d];if(A>s){let v=this.groupMaxScoreChefIndex[r+U],G=this.groupMaxScoreChefIndex[b+m],u=this.groupMaxScoreChefIndex[o+d],x=M[v],i=M[G],S=M[u];if(x!==i&&x!==S&&i!==S){let y=l[x],T=l[i],_=l[S];if(y|T|_){let N=n[x],D=n[i],E=n[S],O=y&(D|E),Y=T&(N|E),W=_&(N|D);if(O!==y||Y!==T||W!==T)continue}s=A,f.maxScore=s,f.maxScoreChefGroup=[v,G,u],f.recipes=c.slice(a,a+9)}}}}return g=Date.now(),console.info(t-e+"组数据计算用时:"+(g-I)+"ms"),f}calAllCache(e,t,I,g,s,r){let b=k(t-2,t-2);console.log(b,t*t*t);const o=new Int32Array(b*(3+s)),P=new Int32Array(b*(3+s));console.time("计算每三道菜最高得分的厨师");let n=0;for(let l=0;l<t;l++){for(let f=l+1;f<t;f++)for(let h=f+1;h<t;h++){n=w(l,f,h,t),n=n*(3+s);let M=0,B=0,c=0,C=0,a=0,U=0,m=0;for(let d=0;d<g;d++){let A=r[d],v=m,G=m+A+1,u=0,x=0;for(let i=v;i<G;i++)if(!(e[i*t+l]===0||e[i*t+f]===0||e[i*t+h]===0)){const S=e[i*t+l]+e[i*t+f]+e[i*t+h];S>u&&(u=S,x=i)}m=G,u>M?(c=B,U=a,B=M,a=C,M=u,C=x):u>B?(c=B,U=a,B=u,a=x):u>c&&(c=u,U=x)}P[n]=C,P[n+1]=a,P[n+2]=U,o[n]=M,o[n+1]=B,o[n+2]=c;for(let d=0;d<s;d++){let A=d+g,v=r[A],G=m,u=m+v+1,x=0,i=0;for(let y=G;y<u;y++)if(!(e[y*t+l]===0||e[y*t+f]===0||e[y*t+h]===0)){const T=e[y*t+l]+e[y*t+f]+e[y*t+h];T>x&&(x=T,i=y)}m=u;let S=n+3+d;P[S]=i,o[S]=x}}postMessage({type:"p",p:n/(b*(3+s))})}return console.timeEnd("计算每三道菜最高得分的厨师"),{groupMaxScore:o,groupMaxScoreChefIndex:P}}}async function q(p,e,t,I,g,s){const r=await this.initWebGPU();try{const o=k(e-2,e-2)*(3+g)*4;let P=o+o;console.log("预估显存占用",P/1024/1024/1024);const n=r.createBuffer({size:p.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});r.queue.writeBuffer(n,0,p);const l=r.createBuffer({size:s.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});r.queue.writeBuffer(l,0,s);const f=new Uint32Array([e,t,I,g]),h=r.createBuffer({size:f.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});r.queue.writeBuffer(h,0,f);const M=r.createBuffer({size:o,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),B=r.createBuffer({size:o,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),c=r.createShaderModule({code:` @group(0) @binding(0) var<storage, read> scoreCache: array<i32>;
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
                           let totalChefCount : i32 = ${t};
                           let ownChefCount : i32= ${I};
                           let ownPresenceChefCount : i32= ${g};
                             let queueDeep : i32 = ${3+g};
                             
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

`}),C=r.createComputePipeline({layout:"auto",compute:{module:c,entryPoint:"main"}}),a=r.createBindGroup({layout:C.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:l}},{binding:2,resource:{buffer:M}},{binding:3,resource:{buffer:B}}]}),U=e**3,d=Math.ceil(U/256);let v=Math.min(d,65535),G=Math.ceil(d/v);const u=r.createCommandEncoder(),x=u.beginComputePass();x.setPipeline(C),x.setBindGroup(0,a),x.dispatchWorkgroups(v,G),x.end();const i=r.createBuffer({size:o,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),S=r.createBuffer({size:o,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});u.copyBufferToBuffer(M,0,i,0,o),u.copyBufferToBuffer(B,0,S,0,o),r.queue.submit([u.finish()]),await i.mapAsync(GPUMapMode.READ),await S.mapAsync(GPUMapMode.READ);const y=new Int32Array(i.getMappedRange().slice()),T=new Int32Array(S.getMappedRange().slice());return i.unmap(),S.unmap(),i.destroy(),S.destroy(),M.destroy(),B.destroy(),h.destroy(),l.destroy(),n.destroy(),{groupMaxScore:y,groupMaxScoreChefIndex:T}}finally{r.destroy()}}function w(p,e,t,I){let g=k(p,I-2),s=z(p,e-1,I),r=t-e-1;return g+s+r}function k(p,e){const t=p*(p-1)*(p-3*e-2)/6,I=p*e*(e+1)/2;return t+I}function z(p,e,t){const I=e-p,g=t-p-2,s=g-I+1;return(g+s)*I/2}let R=new j})();
