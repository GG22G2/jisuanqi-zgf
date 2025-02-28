(function(){"use strict";self.onmessage=async k=>{let t=k.data;await T.setBaseData(t.data);let e=T.call(t.start,t.limit);console.log(e),self.postMessage({type:"r",result:e})};class D{constructor(){this.playRecipes=null,this.start=0,this.groupMaxScore=null,this.groupMaxScoreChefIndex=null,this.chefRealIndex=null,this.recipeCount=0}async setBaseData({playRecipesArr:t,recipePL:e,scoreCache:B,amberPrice:m,recipeCount:i,playChefCount:p,ownChefCount:r,playPresenceChefCount:M,presenceChefCount:s,chefEquipCount:c,chefMasks:f,chefMatchMasks:u,chefRealIndex:g}){this.playRecipes=t,this.recipePL=e,console.time("计算每三道菜最高得分的厨师");let b=await this.computeWithWebGPU(B,i,p+M,r,s,c);console.timeEnd("计算每三道菜最高得分的厨师"),this.groupMaxScore=b.groupMaxScore,this.groupMaxScoreChefIndex=b.groupMaxScoreChefIndex,this.chefRealIndex=g,this.recipeCount=i,this.chefMasks=f,this.chefMatchMasks=u,this.presenceChefCount=s}call(t,e){let B=Date.now(),m=0,i=0,p,r,M,s=new Array(3),c=this.chefMasks,f=this.chefMatchMasks,u={maxScore:0,maxScoreChefGroup:s,recipes:null};const g=this.recipeCount;let b=this.chefRealIndex;const C=this.playRecipes;let o=new Uint16Array(C.length*1680);for(let a=t;a<e;a++){const U=a*9;for(let d=0;d<1680;d++){const h=this.recipePL[d];for(let y=0;y<9;y++)o[a*1680*9+d*9+y]=C[U+h[y]]}}const P=this.presenceChefCount+3;for(let a=0;a<o.length;a+=9){p=this.getIndex(o[a+0],o[a+1],o[a+2],g),r=this.getIndex(o[a+3],o[a+4],o[a+5],g),M=this.getIndex(o[a+6],o[a+7],o[a+8],g),p=p*P,r=r*P,M=M*P;for(let U=0;U<P;U++)for(let d=0;d<P;d++)for(let h=0;h<P;h++){let y=this.groupMaxScore[p+U]+this.groupMaxScore[r+d]+this.groupMaxScore[M+h];if(y>i){let A=this.groupMaxScoreChefIndex[p+U],v=this.groupMaxScoreChefIndex[r+d],I=this.groupMaxScoreChefIndex[M+h],x=b[A],n=b[v],S=b[I];if(x!==n&&x!==S&&n!==S){let l=f[x],G=f[n],w=f[S];if(l|G|w){let R=c[x],_=c[n],N=c[S],q=l&(_|N),E=G&(R|N),z=w&(R|_);if(q!==l||E!==G||z!==G)continue}i=y,u.maxScore=i,u.maxScoreChefGroup=[A,v,I],u.recipes=o.slice(a,a+9)}}}}return m=Date.now(),console.info(e-t+"组数据计算用时:"+(m-B)+"ms"),u}calAllCache(t,e,B,m,i,p){let r=calI(e-2,e-2);console.log(r,e*e*e);const M=new Int32Array(r*(3+i)),s=new Int32Array(r*(3+i));console.time("计算每三道菜最高得分的厨师");let c=0;for(let f=0;f<e;f++){for(let u=f+1;u<e;u++)for(let g=u+1;g<e;g++){c=this.getIndex(f,u,g,e),c=c*(3+i);let b=0,C=0,o=0,P=0,a=0,U=0,d=0;for(let h=0;h<m;h++){let y=p[h],A=d,v=d+y+1,I=0,x=0;for(let n=A;n<v;n++)if(!(t[n*e+f]===0||t[n*e+u]===0||t[n*e+g]===0)){const S=t[n*e+f]+t[n*e+u]+t[n*e+g];S>I&&(I=S,x=n)}d=v,I>b?(o=C,U=a,C=b,a=P,b=I,P=x):I>C?(o=C,U=a,C=I,a=x):I>o&&(o=I,U=x)}s[c]=P,s[c+1]=a,s[c+2]=U,M[c]=b,M[c+1]=C,M[c+2]=o;for(let h=0;h<i;h++){let y=h+m,A=p[y],v=d,I=d+A+1,x=0,n=0;for(let l=v;l<I;l++)if(!(t[l*e+f]===0||t[l*e+u]===0||t[l*e+g]===0)){const G=t[l*e+f]+t[l*e+u]+t[l*e+g];G>x&&(x=G,n=l)}d=I;let S=c+3+h;s[S]=n,M[S]=x}}postMessage({type:"p",p:c/(r*(3+i))})}return console.timeEnd("计算每三道菜最高得分的厨师"),{groupMaxScore:M,groupMaxScoreChefIndex:s}}async initWebGPU(){if(!navigator.gpu)throw new Error("WebGPU not supported");return await(await navigator.gpu.requestAdapter()).requestDevice({requiredLimits:{maxBufferSize:2147483644,maxStorageBufferBindingSize:2147483644}})}async computeWithWebGPU(t,e,B,m,i,p){const r=await this.initWebGPU();try{const s=this.calI(e-2,e-2)*(3+i)*4;let c=s+s;console.log("预估显存占用",c/1024/1024/1024);const f=r.createBuffer({size:t.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});r.queue.writeBuffer(f,0,t);const u=r.createBuffer({size:p.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});r.queue.writeBuffer(u,0,p);const g=new Uint32Array([e,B,m,i]),b=r.createBuffer({size:g.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});r.queue.writeBuffer(b,0,g);const C=r.createBuffer({size:s,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),o=r.createBuffer({size:s,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),P=r.createShaderModule({code:` @group(0) @binding(0) var<storage, read> scoreCache: array<i32>;
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
                           let totalChefCount : i32 = ${B};
                           let ownChefCount : i32= ${m};
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

`}),a=r.createComputePipeline({layout:"auto",compute:{module:P,entryPoint:"main"}}),U=r.createBindGroup({layout:a.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:f}},{binding:1,resource:{buffer:u}},{binding:2,resource:{buffer:C}},{binding:3,resource:{buffer:o}}]}),d=e**3,y=Math.ceil(d/256);let v=Math.min(y,65535),I=Math.ceil(y/v);const x=r.createCommandEncoder(),n=x.beginComputePass();n.setPipeline(a),n.setBindGroup(0,U),n.dispatchWorkgroups(v,I),n.end();const S=r.createBuffer({size:s,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),l=r.createBuffer({size:s,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});x.copyBufferToBuffer(C,0,S,0,s),x.copyBufferToBuffer(o,0,l,0,s),r.queue.submit([x.finish()]),await S.mapAsync(GPUMapMode.READ),await l.mapAsync(GPUMapMode.READ);const G=new Int32Array(S.getMappedRange().slice()),w=new Int32Array(l.getMappedRange().slice());return S.unmap(),l.unmap(),S.destroy(),l.destroy(),C.destroy(),o.destroy(),b.destroy(),u.destroy(),f.destroy(),{groupMaxScore:G,groupMaxScoreChefIndex:w}}finally{r.destroy()}}getIndex(t,e,B,m){let i=this.calI(t,m-2),p=this.calJ(t,e-1,m),r=B-e-1;return i+p+r}calI(t,e){const B=t*(t-1)*(t-3*e-2)/6,m=t*e*(e+1)/2;return B+m}calJ(t,e,B){const m=e-t,i=B-t-2,p=i-m+1;return(i+p)*m/2}}let T=new D})();
