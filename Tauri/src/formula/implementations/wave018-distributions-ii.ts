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

const logBeta=(a:number,b:number):number=>
  logGamma(a)+logGamma(b)-logGamma(a+b);

const gammaP=(
  a:number,
  x:number
):number=>{
  if(a<=0||x<0)
    throw new RangeError("Invalid gamma arguments");

  if(x===0)
    return 0;

  const eps=1e-14;
  const gln=logGamma(a);

  if(x<a+1){
    let ap=a;
    let sum=1/a;
    let del=sum;

    for(let n=1;n<=200;n++){
      ap+=1;
      del*=x/ap;
      sum+=del;

      if(Math.abs(del)<Math.abs(sum)*eps)
        break;
    }

    return clamp01(
      sum*Math.exp(
        -x+
        a*Math.log(x)-
        gln
      )
    );
  }

  let b=x+1-a;
  let c=1/1e-300;
  let d=1/b;
  let h=d;

  for(let i=1;i<=200;i++){
    const an=-i*(i-a);

    b+=2;

    d=an*d+b;

    if(Math.abs(d)<1e-300)
      d=1e-300;

    c=b+an/c;

    if(Math.abs(c)<1e-300)
      c=1e-300;

    d=1/d;

    const del=d*c;

    h*=del;

    if(Math.abs(del-1)<eps)
      break;
  }

  return clamp01(
    1-
    Math.exp(
      -x+
      a*Math.log(x)-
      gln
    )*h
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

const chiPdf=(
  x:number,
  df:number
):number=>{
  const a=df/2;

  if(x===0){
    if(a<1)
      return Number.POSITIVE_INFINITY;

    if(a===1)
      return 0.5;

    return 0;
  }

  return Math.exp(
    (a-1)*Math.log(x)-
    x/2-
    a*Math.log(2)-
    logGamma(a)
  );
};

const fCdf=(
  x:number,
  d1:number,
  d2:number
):number=>{
  if(x<=0)
    return 0;

  const z=
    (d1*x)/
    (d1*x+d2);

  return betaI(
    z,
    d1/2,
    d2/2
  );
};

const fPdf=(
  x:number,
  d1:number,
  d2:number
):number=>{
  if(x===0){
    if(d1<2)
      return Number.POSITIVE_INFINITY;

    if(d1===2)
      return 1;

    return 0;
  }

  const a=d1/2;
  const b=d2/2;

  return Math.exp(
    a*Math.log(d1/d2)+
    (a-1)*Math.log(x)-
    logBeta(a,b)-
    (a+b)*Math.log(
      1+d1*x/d2
    )
  );
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
  def("NORM.DIST",a=>{const x=num(a[0]),mean=num(a[1]),sd=num(a[2]);if(sd<=0)throw new RangeError("Standard deviation must be positive");const z=(x-mean)/sd;return truthy(a[3])?normalCdf(z):normalPdf(z)/sd;},4,4),
  def("NORM.INV",a=>{const p=num(a[0]),mean=num(a[1]),sd=num(a[2]);if(p<=0||p>=1||sd<=0)throw new RangeError("Invalid NORM.INV arguments");return mean+sd*normalInv(p);},3,3),
  def("NORM.S.DIST",a=>{const z=num(a[0]);return truthy(a[1])?normalCdf(z):normalPdf(z);},2,2),
  def("NORM.S.INV",a=>normalInv(num(a[0])),1,1),
  def("CHISQ.DIST",a=>{const x=num(a[0]),df=num(a[1]);if(x<0||df<1)throw new RangeError("Invalid CHISQ.DIST arguments");if(truthy(a[2]))return gammaP(df/2,x/2);return chiPdf(x,df);},3,3),
  def("CHISQ.DIST.RT",a=>{const x=num(a[0]),df=num(a[1]);if(x<0||df<1)throw new RangeError("Invalid CHISQ.DIST.RT arguments");return clamp01(1-gammaP(df/2,x/2));},2,2),
  def("CHISQ.INV",a=>{const p=num(a[0]),df=num(a[1]);if(p<=0||p>=1||df<1)throw new RangeError("Invalid CHISQ.INV arguments");return 2*invertPositive(x=>gammaP(df/2,x),p,Math.max(1,df/2));},2,2),
  def("CHISQ.INV.RT",a=>{const p=num(a[0]),df=num(a[1]);if(p<=0||p>=1||df<1)throw new RangeError("Invalid CHISQ.INV.RT arguments");return 2*invertPositive(x=>gammaP(df/2,x),1-p,Math.max(1,df/2));},2,2),
  def("F.DIST",a=>{const x=num(a[0]),d1=num(a[1]),d2=num(a[2]);if(x<0||d1<1||d2<1)throw new RangeError("Invalid F.DIST arguments");return truthy(a[3])?fCdf(x,d1,d2):fPdf(x,d1,d2);},4,4),
  def("F.DIST.RT",a=>{const x=num(a[0]),d1=num(a[1]),d2=num(a[2]);if(x<0||d1<1||d2<1)throw new RangeError("Invalid F.DIST.RT arguments");return clamp01(1-fCdf(x,d1,d2));},3,3),
  def("F.INV",a=>{const p=num(a[0]),d1=num(a[1]),d2=num(a[2]);if(p<=0||p>=1||d1<1||d2<1)throw new RangeError("Invalid F.INV arguments");return invertPositive(x=>fCdf(x,d1,d2),p,1);},3,3),
  def("F.INV.RT",a=>{const p=num(a[0]),d1=num(a[1]),d2=num(a[2]);if(p<=0||p>=1||d1<1||d2<1)throw new RangeError("Invalid F.INV.RT arguments");return invertPositive(x=>fCdf(x,d1,d2),1-p,1);},3,3)
];