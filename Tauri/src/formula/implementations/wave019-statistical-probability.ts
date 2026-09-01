import type { FunctionDefinition } from "../functions";

const num=(x:unknown):number=>{
  if(typeof x==="number"&&Number.isFinite(x))
    return x;

  if(typeof x==="string"&&x.trim()!==""){
    const n=Number(x);

    if(Number.isFinite(n))
      return n;
  }

  throw new TypeError("Expected number");
};

const int=(x:unknown):number=>
  Math.trunc(num(x));

const truthy=(x:unknown):boolean=>{
  if(typeof x==="boolean")
    return x;

  if(typeof x==="number")
    return x!==0;

  if(typeof x==="string"){
    const s=x.trim().toLowerCase();

    if(s==="true")
      return true;

    if(s==="false")
      return false;

    const n=Number(s);

    if(Number.isFinite(n))
      return n!==0;
  }

  return Boolean(x);
};

const clamp01=(x:number):number=>
  Math.max(0,Math.min(1,x));

const erf=(x:number):number=>{
  const sign=x<0?-1:1;
  const a=Math.abs(x);
  const t=1/(1+0.3275911*a);

  const y=
    1-
    (
      (
        (
          (
            (
              1.061405429*t-
              1.453152027
            )*t+
            1.421413741
          )*t-
          0.284496736
        )*t+
        0.254829592
      )*t
    )*
    Math.exp(-a*a);

  return sign*y;
};

const normalPdf=(x:number):number=>
  Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI);

const normalCdf=(x:number):number=>
  0.5*(1+erf(x/Math.sqrt(2)));

const horner=(
  coefficients:number[],
  x:number
):number=>{
  let result=0;

  for(const coefficient of coefficients)
    result=result*x+coefficient;

  return result;
};

const normalInv=(p:number):number=>{
  if(p<=0||p>=1)
    throw new RangeError(
      "Probability must be between 0 and 1"
    );

  const a=[
    -39.69683028665376,
    220.9460984245205,
    -275.9285104469687,
    138.357751867269,
    -30.66479806614716,
    2.506628277459239
  ];

  const b=[
    -54.47609879822406,
    161.5858368580409,
    -155.6989798598866,
    66.80131188771972,
    -13.28068155288572
  ];

  const c=[
    -0.007784894002430293,
    -0.3223964580411365,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783
  ];

  const d=[
    0.007784695709041462,
    0.3224671290700398,
    2.445134137142996,
    3.754408661907416
  ];

  const low=0.02425;
  const high=1-low;

  if(p<low){
    const q=Math.sqrt(-2*Math.log(p));

    return (
      horner(c,q)/
      (horner(d,q)*q+1)
    );
  }

  if(p>high){
    const q=Math.sqrt(-2*Math.log(1-p));

    return -(
      horner(c,q)/
      (horner(d,q)*q+1)
    );
  }

  const q=p-0.5;
  const r=q*q;

  return (
    horner(a,r)*q/
    (horner(b,r)*r+1)
  );
};

const logGamma=(z:number):number=>{
  const p=[
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  if(z<0.5){
    return Math.log(Math.PI)-
      Math.log(Math.sin(Math.PI*z))-
      logGamma(1-z);
  }

  z-=1;

  let x=p[0];

  for(let i=1;i<p.length;i++)
    x+=p[i]/(z+i);

  const t=z+7.5;

  return (
    0.5*Math.log(2*Math.PI)+
    (z+0.5)*Math.log(t)-
    t+
    Math.log(x)
  );
};

const betaFraction=(
  a:number,
  b:number,
  x:number
):number=>{
  const max=200;
  const eps=3e-14;
  const tiny=1e-300;

  const qab=a+b;
  const qap=a+1;
  const qam=a-1;

  let c=1;
  let d=1-qab*x/qap;

  if(Math.abs(d)<tiny)
    d=tiny;

  d=1/d;

  let h=d;

  for(let m=1;m<=max;m++){
    const m2=2*m;

    let aa=
      m*(b-m)*x/
      ((qam+m2)*(a+m2));

    d=1+aa*d;

    if(Math.abs(d)<tiny)
      d=tiny;

    c=1+aa/c;

    if(Math.abs(c)<tiny)
      c=tiny;

    d=1/d;
    h*=d*c;

    aa=
      -(a+m)*(qab+m)*x/
      ((a+m2)*(qap+m2));

    d=1+aa*d;

    if(Math.abs(d)<tiny)
      d=tiny;

    c=1+aa/c;

    if(Math.abs(c)<tiny)
      c=tiny;

    d=1/d;

    const del=d*c;

    h*=del;

    if(Math.abs(del-1)<eps)
      break;
  }

  return h;
};

const betaI=(
  x:number,
  a:number,
  b:number
):number=>{
  if(x<=0)
    return 0;

  if(x>=1)
    return 1;

  const bt=Math.exp(
    logGamma(a+b)-
    logGamma(a)-
    logGamma(b)+
    a*Math.log(x)+
    b*Math.log(1-x)
  );

  if(x<(a+1)/(a+b+2)){
    return clamp01(
      bt*betaFraction(a,b,x)/a
    );
  }

  return clamp01(
    1-
    bt*
    betaFraction(b,a,1-x)/
    b
  );
};

const tPdf=(
  x:number,
  df:number
):number=>
  Math.exp(
    logGamma((df+1)/2)-
    logGamma(df/2)-
    0.5*Math.log(df*Math.PI)-
    ((df+1)/2)*
    Math.log(1+x*x/df)
  );

const tCdf=(
  x:number,
  df:number
):number=>{
  if(x===0)
    return 0.5;

  const z=
    df/
    (df+x*x);

  const ib=
    betaI(
      z,
      df/2,
      0.5
    );

  return x>0
    ? clamp01(1-0.5*ib)
    : clamp01(0.5*ib);
};

const invertPositive=(
  fn:(x:number)=>number,
  target:number,
  initial=1
):number=>{
  let lo=0;
  let hi=Math.max(initial,1e-12);

  while(fn(hi)<target){
    hi*=2;

    if(hi>1e14)
      throw new RangeError(
        "Unable to bracket inverse"
      );
  }

  for(let i=0;i<160;i++){
    const mid=(lo+hi)/2;

    if(fn(mid)<target)
      lo=mid;
    else
      hi=mid;
  }

  return (lo+hi)/2;
};

const tInv=(
  p:number,
  df:number
):number=>{
  if(p===0.5)
    return 0;

  if(p<0.5)
    return -tInv(1-p,df);

  return invertPositive(
    x=>tCdf(x,df),
    p,
    1
  );
};

const logCombination=(
  n:number,
  k:number
):number=>{
  if(k<0||k>n)
    return Number.NEGATIVE_INFINITY;

  return (
    logGamma(n+1)-
    logGamma(k+1)-
    logGamma(n-k+1)
  );
};

const hypergeomPmf=(
  successes:number,
  sample:number,
  populationSuccesses:number,
  population:number
):number=>{
  const lower=Math.max(
    0,
    sample-(population-populationSuccesses)
  );

  const upper=Math.min(
    sample,
    populationSuccesses
  );

  if(successes<lower||successes>upper)
    return 0;

  return Math.exp(
    logCombination(
      populationSuccesses,
      successes
    )+
    logCombination(
      population-populationSuccesses,
      sample-successes
    )-
    logCombination(
      population,
      sample
    )
  );
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
  def("T.DIST",a=>{const x=num(a[0]),df=num(a[1]);if(df<1)throw new RangeError("Degrees of freedom must be positive");return truthy(a[2])?tCdf(x,df):tPdf(x,df);},3,3),
  def("T.DIST.RT",a=>{const x=num(a[0]),df=num(a[1]);if(df<1)throw new RangeError("Degrees of freedom must be positive");return clamp01(1-tCdf(x,df));},2,2),
  def("T.DIST.2T",a=>{const x=Math.abs(num(a[0])),df=num(a[1]);if(df<1)throw new RangeError("Degrees of freedom must be positive");return clamp01(2*(1-tCdf(x,df)));},2,2),
  def("T.INV",a=>{const p=num(a[0]),df=num(a[1]);if(p<=0||p>=1||df<1)throw new RangeError("Invalid T.INV arguments");return tInv(p,df);},2,2),
  def("T.INV.2T",a=>{const p=num(a[0]),df=num(a[1]);if(p<=0||p>=1||df<1)throw new RangeError("Invalid T.INV.2T arguments");return tInv(1-p/2,df);},2,2),
  def("HYPGEOM.DIST",a=>{const sampleS=int(a[0]),sampleN=int(a[1]),popS=int(a[2]),popN=int(a[3]);if(sampleS<0||sampleN<0||popS<0||popN<1||sampleN>popN||popS>popN||sampleS>sampleN||sampleS>popS)throw new RangeError("Invalid HYPGEOM.DIST arguments");if(truthy(a[4])){let s=0;for(let k=0;k<=sampleS;k++)s+=hypergeomPmf(k,sampleN,popS,popN);return clamp01(s);}return hypergeomPmf(sampleS,sampleN,popS,popN);},5,5),
  def("CONFIDENCE.NORM",a=>{const alpha=num(a[0]),sd=num(a[1]),size=int(a[2]);if(alpha<=0||alpha>=1||sd<=0||size<1)throw new RangeError("Invalid CONFIDENCE.NORM arguments");return normalInv(1-alpha/2)*sd/Math.sqrt(size);},3,3),
  def("CONFIDENCE.T",a=>{const alpha=num(a[0]),sd=num(a[1]),size=int(a[2]);if(alpha<=0||alpha>=1||sd<=0||size<2)throw new RangeError("Invalid CONFIDENCE.T arguments");return tInv(1-alpha/2,size-1)*sd/Math.sqrt(size);},3,3),
  def("PHI",a=>normalPdf(num(a[0])),1,1),
  def("GAUSS",a=>normalCdf(num(a[0]))-0.5,1,1)
];