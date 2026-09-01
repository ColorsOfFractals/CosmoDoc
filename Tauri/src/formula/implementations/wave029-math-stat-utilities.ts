import type { FunctionDefinition } from "../functions";

const H={
  num(x:unknown):number{
    if(typeof x==="number"&&Number.isFinite(x))return x;
    if(typeof x==="string"&&x.trim()!==""){
      const n=Number(x);
      if(Number.isFinite(n))return n;
    }
    throw new TypeError("Expected number");
  },

  flat(x:unknown):unknown[]{
    const out:unknown[]=[];
    const walk=(v:unknown):void=>{
      if(Array.isArray(v)){for(const q of v)walk(q);}
      else out.push(v);
    };
    walk(x);
    return out;
  },

  nums(x:unknown):number[]{
    return this.flat(x).map(v=>this.num(v));
  },

  aNum(x:unknown):number{
    if(typeof x==="number"&&Number.isFinite(x))return x;
    if(typeof x==="boolean")return x?1:0;
    if(typeof x==="string"){
      const n=Number(x);
      return x.trim()!==""&&Number.isFinite(n)?n:0;
    }
    return 0;
  },

  pair(a:unknown,b:unknown):[number[],number[]]{
    const x=this.nums(a),y=this.nums(b);
    if(x.length!==y.length)
      throw new RangeError("Arrays must have equal size");
    return [x,y];
  },

  roundAway(x:number):number{
    return Math.sign(x)*Math.floor(Math.abs(x)+0.5);
  },

  logGamma(z:number):number{
    const p=[
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.984369578019572e-6,
      1.5056327351493116e-7
    ];

    if(z<0.5)
      return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-this.logGamma(1-z);

    z-=1;
    let x=p[0];

    for(let i=1;i<p.length;i++)x+=p[i]/(z+i);

    const t=z+7.5;
    return 0.5*Math.log(2*Math.PI)+(z+0.5)*Math.log(t)-t+Math.log(x);
  },

  erf(x:number):number{
    const sign=x<0?-1:1;
    const a=Math.abs(x);
    const t=1/(1+0.3275911*a);

    const y=1-
      (((((1.061405429*t-1.453152027)*t+1.421413741)*t-
      0.284496736)*t+0.254829592)*t)*Math.exp(-a*a);

    return sign*y;
  },

  combination(n:number,k:number):number{
    if(k<0||k>n)return 0;
    k=Math.min(k,n-k);
    let r=1;
    for(let i=1;i<=k;i++)r=r*(n-k+i)/i;
    return r;
  },

  binom(n:number,k:number,p:number):number{
    return this.combination(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k);
  }
};

const def=(
  name:string,
  evaluate:(args:unknown[])=>unknown,
  minArgs=1,
  maxArgs=minArgs
):FunctionDefinition=>({
  name,
  minArgs,
  maxArgs,
  evaluate
});

export const definitions:FunctionDefinition[]=[
  def("ROUND",a=>{
  const n=H.num(a[0]),d=Math.trunc(H.num(a[1]));
  const p=Math.pow(10,d);
  if(!Number.isFinite(p)||p===0)return n;
  return H.roundAway(n*p)/p;
},2,2),
  def("ROUNDUP",a=>{
  const n=H.num(a[0]),d=Math.trunc(H.num(a[1]));
  const p=Math.pow(10,d);
  if(!Number.isFinite(p)||p===0)return n;
  return Math.sign(n)*Math.ceil(Math.abs(n)*p)/p;
},2,2),
  def("ROUNDDOWN",a=>{
  const n=H.num(a[0]),d=Math.trunc(H.num(a[1]));
  const p=Math.pow(10,d);
  if(!Number.isFinite(p)||p===0)return n;
  return Math.sign(n)*Math.floor(Math.abs(n)*p)/p;
},2,2),
  def("FACT",a=>{
  const n=Math.floor(H.num(a[0]));
  if(n<0)throw new RangeError("FACT requires nonnegative number");
  let r=1;
  for(let i=2;i<=n;i++){
    r*=i;
    if(!Number.isFinite(r))throw new RangeError("FACT overflow");
  }
  return r;
},1,1),
  def("PERMUT",a=>{
  const n=Math.trunc(H.num(a[0])),k=Math.trunc(H.num(a[1]));
  if(n<0||k<0||k>n)throw new RangeError("Invalid PERMUT arguments");
  let r=1;
  for(let i=0;i<k;i++)r*=n-i;
  return r;
},2,2),
  def("PERMUTATIONA",a=>{
  const n=Math.trunc(H.num(a[0])),k=Math.trunc(H.num(a[1]));
  if(n<0||k<0)throw new RangeError("Invalid PERMUTATIONA arguments");
  return Math.pow(n,k);
},2,2),
  def("SERIESSUM",a=>{
  const x=H.num(a[0]),n=H.num(a[1]),m=H.num(a[2]);
  const c=H.nums(a[3]);
  return c.reduce<number>(
    (s,v,i)=>s+v*Math.pow(x,n+i*m),
    0
  );
},4,4),
  def("SUMPRODUCT",a=>{
  const arrays=a.map(v=>H.nums(v));
  if(!arrays.length)return 0;
  const n=arrays[0].length;
  if(arrays.some(v=>v.length!==n))
    throw new RangeError("SUMPRODUCT arrays must have equal size");
  let sum=0;
  for(let i=0;i<n;i++){
    let product=1;
    for(const values of arrays)product*=values[i];
    sum+=product;
  }
  return sum;
},1,255),
  def("SUMX2MY2",a=>{
  const [x,y]=H.pair(a[0],a[1]);
  let s=0;
  for(let i=0;i<x.length;i++)s+=x[i]*x[i]-y[i]*y[i];
  return s;
},2,2),
  def("SUMX2PY2",a=>{
  const [x,y]=H.pair(a[0],a[1]);
  let s=0;
  for(let i=0;i<x.length;i++)s+=x[i]*x[i]+y[i]*y[i];
  return s;
},2,2),
  def("SUMXMY2",a=>{
  const [x,y]=H.pair(a[0],a[1]);
  let s=0;
  for(let i=0;i<x.length;i++){
    const d=x[i]-y[i];
    s+=d*d;
  }
  return s;
},2,2),
  def("AVERAGEA",a=>{
  const values=H.flat(a);
  if(!values.length)throw new RangeError("AVERAGEA requires values");
  return values.reduce<number>((s,v)=>s+H.aNum(v),0)/values.length;
},1,255),
  def("MAXA",a=>{
  const values=H.flat(a);
  if(!values.length)return 0;
  return Math.max(...values.map(v=>H.aNum(v)));
},1,255),
  def("MINA",a=>{
  const values=H.flat(a);
  if(!values.length)return 0;
  return Math.min(...values.map(v=>H.aNum(v)));
},1,255),
  def("COUNTBLANK",a=>
  H.flat(a[0]).filter(v=>v===null||v===undefined||v==="").length,
1,1),
  def("GAMMA",a=>{
  const x=H.num(a[0]);
  if(x<=0&&Math.trunc(x)===x)
    throw new RangeError("GAMMA undefined");
  const g=Math.exp(H.logGamma(x));
  if(!Number.isFinite(g))throw new RangeError("GAMMA overflow");
  return g;
},1,1),
  def("GAMMALN",a=>{
  const x=H.num(a[0]);
  if(x<=0)throw new RangeError("GAMMALN requires positive number");
  return H.logGamma(x);
},1,1),
  def("ERF",a=>{
  const lower=H.num(a[0]);
  if(a.length===1)return H.erf(lower);
  return H.erf(H.num(a[1]))-H.erf(lower);
},1,2),
  def("ERFC",a=>1-H.erf(H.num(a[0])),1,1),
  def("BINOM.DIST.RANGE",a=>{
  const trials=Math.trunc(H.num(a[0]));
  const p=H.num(a[1]);
  const lo=Math.trunc(H.num(a[2]));
  const hi=a.length>3?Math.trunc(H.num(a[3])):lo;

  if(trials<0||p<0||p>1||lo<0||hi<lo||hi>trials)
    throw new RangeError("Invalid BINOM.DIST.RANGE arguments");

  let sum=0;
  for(let k=lo;k<=hi;k++)sum+=H.binom(trials,k,p);
  return sum;
},3,4)
];