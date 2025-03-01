(function(){"use strict";self.onmessage=async k=>{let t=k.data;await T.setBaseData(t.data);let e=T.call(t.start,t.limit);console.log(e),self.postMessage({type:"r",result:e})};class D{constructor(){this.playRecipes=null,this.start=0,this.groupMaxScore=null,this.groupMaxScoreChefIndex=null,this.chefRealIndex=null,this.recipeCount=0}async setBaseData({playRecipesArr:t,recipePL:e,scoreCache:C,amberPrice:m,recipeCount:i,playChefCount:d,ownChefCount:r,playPresenceChefCount:I,presenceChefCount:c,chefEquipCount:u,chefMasks:x,chefMatchMasks:n,chefRealIndex:h}){this.playRecipes=t,this.recipePL=e,console.time("计算每三道菜最高得分的厨师");let M=await this.computeWithWebGPU(C,i,d+I,r,c,u);console.timeEnd("计算每三道菜最高得分的厨师"),this.groupMaxScore=M.groupMaxScore,this.groupMaxScoreChefIndex=M.groupMaxScoreChefIndex,this.chefRealIndex=h,this.recipeCount=i,this.chefMasks=x,this.chefMatchMasks=n,this.presenceChefCount=c}call(t,e){let C=Date.now(),m=0,i=0,d,r,I,c=new Array(3),u=this.chefMasks,x=this.chefMatchMasks,n={maxScore:0,maxScoreChefGroup:c,recipes:null};const h=this.recipeCount;let M=this.chefRealIndex;const U=this.playRecipes;let o=new Uint16Array(U.length*1680);for(let a=t;a<e;a++){const b=a*9;for(let l=0;l<1680;l++){const g=this.recipePL[l];for(let y=0;y<9;y++)o[a*1680*9+l*9+y]=U[b+g[y]]}}const P=this.presenceChefCount+3;for(let a=0;a<o.length;a+=9){d=this.getIndex(o[a+0],o[a+1],o[a+2],h),r=this.getIndex(o[a+3],o[a+4],o[a+5],h),I=this.getIndex(o[a+6],o[a+7],o[a+8],h),d=d*P,r=r*P,I=I*P;for(let b=0;b<P;b++)for(let l=0;l<P;l++)for(let g=0;g<P;g++){let y=this.groupMaxScore[d+b]+this.groupMaxScore[r+l]+this.groupMaxScore[I+g];if(y>i){let G=this.groupMaxScoreChefIndex[d+b],v=this.groupMaxScoreChefIndex[r+l],p=this.groupMaxScoreChefIndex[I+g],S=M[G],s=M[v],B=M[p];if(S!==s&&S!==B&&s!==B){let f=x[G],A=x[v],w=x[p];if(f|A|w){let R=u[G],_=u[v],N=u[p],q=f&(_|N),E=A&(R|N),z=w&(R|_);if(q!==f||E!==A||z!==w)continue}i=y,n.maxScore=i,n.maxScoreChefGroup=[G,v,p],n.recipes=o.slice(a,a+9),n.scores=[this.groupMaxScore[d+b],this.groupMaxScore[r+l],this.groupMaxScore[I+g]]}}}}return m=Date.now(),console.info(e-t+"组数据计算用时:"+(m-C)+"ms"),n}calAllCache(t,e,C,m,i,d){let r=calI(e-2,e-2);console.log(r,e*e*e);const I=new Int32Array(r*(3+i)),c=new Int32Array(r*(3+i));console.time("计算每三道菜最高得分的厨师");let u=0;for(let x=0;x<e;x++){for(let n=x+1;n<e;n++)for(let h=n+1;h<e;h++){u=this.getIndex(x,n,h,e),u=u*(3+i);let M=0,U=0,o=0,P=0,a=0,b=0,l=0;for(let g=0;g<m;g++){let y=d[g],G=l,v=l+y+1,p=0,S=0;for(let s=G;s<v;s++)if(!(t[s*e+x]===0||t[s*e+n]===0||t[s*e+h]===0)){const B=t[s*e+x]+t[s*e+n]+t[s*e+h];B>p&&(p=B,S=s)}l=v,p>M?(o=U,b=a,U=M,a=P,M=p,P=S):p>U?(o=U,b=a,U=p,a=S):p>o&&(o=p,b=S)}c[u]=P,c[u+1]=a,c[u+2]=b,I[u]=M,I[u+1]=U,I[u+2]=o;for(let g=0;g<i;g++){let y=g+m,G=d[y],v=l,p=l+G+1,S=0,s=0;for(let f=v;f<p;f++)if(!(t[f*e+x]===0||t[f*e+n]===0||t[f*e+h]===0)){const A=t[f*e+x]+t[f*e+n]+t[f*e+h];A>S&&(S=A,s=f)}l=p;let B=u+3+g;c[B]=s,I[B]=S}}postMessage({type:"p",p:u/(r*(3+i))})}return console.timeEnd("计算每三道菜最高得分的厨师"),{groupMaxScore:I,groupMaxScoreChefIndex:c}}async initWebGPU(){if(!navigator.gpu)throw new Error("WebGPU not supported");return await(await navigator.gpu.requestAdapter()).requestDevice({requiredLimits:{maxBufferSize:2147483644,maxStorageBufferBindingSize:2147483644}})}async computeWithWebGPU(t,e,C,m,i,d){const r=await this.initWebGPU();try{const c=this.calI(e-2,e-2)*(3+i)*4;let u=c+c;console.log("预估显存占用",u/1024/1024/1024);const x=r.createBuffer({size:t.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});r.queue.writeBuffer(x,0,t);const n=r.createBuffer({size:d.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});r.queue.writeBuffer(n,0,d);const h=new Uint32Array([e,C,m,i]),M=r.createBuffer({size:h.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});r.queue.writeBuffer(M,0,h);const U=r.createBuffer({size:c,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),o=r.createBuffer({size:c,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),P=r.createShaderModule({code:` @group(0) @binding(0) var<storage, read> scoreCache: array<i32>;
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
                           let totalChefCount : i32 = ${C};
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

`}),a=r.createComputePipeline({layout:"auto",compute:{module:P,entryPoint:"main"}}),b=r.createBindGroup({layout:a.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:x}},{binding:1,resource:{buffer:n}},{binding:2,resource:{buffer:U}},{binding:3,resource:{buffer:o}}]}),l=e**3,y=Math.ceil(l/256);let v=Math.min(y,65535),p=Math.ceil(y/v);const S=r.createCommandEncoder(),s=S.beginComputePass();s.setPipeline(a),s.setBindGroup(0,b),s.dispatchWorkgroups(v,p),s.end();const B=r.createBuffer({size:c,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),f=r.createBuffer({size:c,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});S.copyBufferToBuffer(U,0,B,0,c),S.copyBufferToBuffer(o,0,f,0,c),r.queue.submit([S.finish()]),await B.mapAsync(GPUMapMode.READ),await f.mapAsync(GPUMapMode.READ);const A=new Int32Array(B.getMappedRange().slice()),w=new Int32Array(f.getMappedRange().slice());return B.unmap(),f.unmap(),B.destroy(),f.destroy(),U.destroy(),o.destroy(),M.destroy(),n.destroy(),x.destroy(),{groupMaxScore:A,groupMaxScoreChefIndex:w}}finally{r.destroy()}}getIndex(t,e,C,m){let i=this.calI(t,m-2),d=this.calJ(t,e-1,m),r=C-e-1;return i+d+r}calI(t,e){const C=t*(t-1)*(t-3*e-2)/6,m=t*e*(e+1)/2;return C+m}calJ(t,e,C){const m=e-t,i=C-t-2,d=i-m+1;return(i+d)*m/2}}let T=new D})();
