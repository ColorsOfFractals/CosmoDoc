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

const combination=(n:number,k:number):number=>{
  if(k<0||k>n)
    return 0;

  k=Math.min(k,n-k);

  let r=1;

  for(let i=1;i<=k;i++)
    r=r*(n-k+i)/i;

  return r;
};

const binomPmf=(
  k:number,
  n:number,
  p:number
):number=>{
  if(p===0)
    return k===0?1:0;

  if(p===1)
    return k===n?1:0;

  return (
    combination(n,k)*
    Math.pow(p,k)*
    Math.pow(1-p,n-k)
  );
};

const poissonPmf=(
  k:number,
  mean:number
):number=>{
  if(mean===0)
    return k===0?1:0;

  return Math.exp(
    -mean+
    k*Math.log(mean)-
    logGamma(k+1)
  );
};

const negBinomPmf=(
  failures:number,
  successes:number,
  p:number
):number=>
  combination(
    failures+successes-1,
    failures
  )*
  Math.pow(p,successes)*
  Math.pow(1-p,failures);

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

const invertUnit=(
  fn:(x:number)=>number,
  target:number
):number=>{
  let lo=0;
  let hi=1;

  for(let i=0;i<120;i++){
    const mid=(lo+hi)/2;
    const value=fn(mid);

    if(value<target)
      lo=mid;
    else
      hi=mid;
  }

  return (lo+hi)/2;
};

const invertMonotone=(
  fn:(x:number)=>number,
  target:number,
  initial=1
):number=>{
  let lo=0;
  let hi=Math.max(1,initial);

  while(fn(hi)<target){
    hi*=2;

    if(hi>1e12)
      throw new RangeError(
        "Unable to bracket inverse"
      );
  }

  for(let i=0;i<140;i++){
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
  def("EXPON.DIST",a=>{const x=num(a[0]),lambda=num(a[1]);if(x<0||lambda<=0)throw new RangeError("Invalid EXPON.DIST arguments");return truthy(a[2])?1-Math.exp(-lambda*x):lambda*Math.exp(-lambda*x);},3,3),
  def("WEIBULL.DIST",a=>{const x=num(a[0]),alpha=num(a[1]),beta=num(a[2]);if(x<0||alpha<=0||beta<=0)throw new RangeError("Invalid WEIBULL.DIST arguments");const z=Math.pow(x/beta,alpha);return truthy(a[3])?1-Math.exp(-z):(alpha/beta)*Math.pow(x/beta,alpha-1)*Math.exp(-z);},4,4),
  def("POISSON.DIST",a=>{const x=int(a[0]),mean=num(a[1]);if(x<0||mean<0)throw new RangeError("Invalid POISSON.DIST arguments");if(truthy(a[2])){let s=0;for(let k=0;k<=x;k++)s+=poissonPmf(k,mean);return clamp01(s);}return poissonPmf(x,mean);},3,3),
  def("BINOM.DIST",a=>{const k=int(a[0]),n=int(a[1]),p=num(a[2]);if(k<0||n<0||k>n||p<0||p>1)throw new RangeError("Invalid BINOM.DIST arguments");if(truthy(a[3])){let s=0;for(let i=0;i<=k;i++)s+=binomPmf(i,n,p);return clamp01(s);}return binomPmf(k,n,p);},4,4),
  def("BINOM.INV",a=>{const n=int(a[0]),p=num(a[1]),alpha=num(a[2]);if(n<0||p<0||p>1||alpha<0||alpha>1)throw new RangeError("Invalid BINOM.INV arguments");let s=0;for(let k=0;k<=n;k++){s+=binomPmf(k,n,p);if(s>=alpha)return k;}return n;},3,3),
  def("NEGBINOM.DIST",a=>{const failures=int(a[0]),successes=int(a[1]),p=num(a[2]);if(failures<0||successes<1||p<=0||p>1)throw new RangeError("Invalid NEGBINOM.DIST arguments");if(truthy(a[3])){let s=0;for(let k=0;k<=failures;k++)s+=negBinomPmf(k,successes,p);return clamp01(s);}return negBinomPmf(failures,successes,p);},4,4),
  def("LOGNORM.DIST",a=>{const x=num(a[0]),mean=num(a[1]),sd=num(a[2]);if(x<=0||sd<=0)throw new RangeError("Invalid LOGNORM.DIST arguments");const z=(Math.log(x)-mean)/sd;return truthy(a[3])?normalCdf(z):normalPdf(z)/(x*sd);},4,4),
  def("LOGNORM.INV",a=>{const p=num(a[0]),mean=num(a[1]),sd=num(a[2]);if(p<=0||p>=1||sd<=0)throw new RangeError("Invalid LOGNORM.INV arguments");return Math.exp(mean+sd*normalInv(p));},3,3),
  def("GAMMA.DIST",a=>{const x=num(a[0]),alpha=num(a[1]),beta=num(a[2]);if(x<0||alpha<=0||beta<=0)throw new RangeError("Invalid GAMMA.DIST arguments");if(truthy(a[3]))return gammaP(alpha,x/beta);if(x===0)return alpha===1?1/beta:0;return Math.exp((alpha-1)*Math.log(x)-x/beta-logGamma(alpha)-alpha*Math.log(beta));},4,4),
  def("GAMMA.INV",a=>{const p=num(a[0]),alpha=num(a[1]),beta=num(a[2]);if(p<=0||p>=1||alpha<=0||beta<=0)throw new RangeError("Invalid GAMMA.INV arguments");return beta*invertMonotone(x=>gammaP(alpha,x),p,Math.max(1,alpha));},3,3),
  def("BETA.DIST",a=>{const x=num(a[0]),alpha=num(a[1]),beta=num(a[2]),cum=truthy(a[3]),lo=a.length>4?num(a[4]):0,hi=a.length>5?num(a[5]):1;if(alpha<=0||beta<=0||hi<=lo||x<lo||x>hi)throw new RangeError("Invalid BETA.DIST arguments");const z=(x-lo)/(hi-lo);if(cum)return betaI(z,alpha,beta);if(z===0||z===1)return 0;return Math.exp((alpha-1)*Math.log(z)+(beta-1)*Math.log(1-z)-logBeta(alpha,beta))/(hi-lo);},4,6),
  def("BETA.INV",a=>{const p=num(a[0]),alpha=num(a[1]),beta=num(a[2]),lo=a.length>3?num(a[3]):0,hi=a.length>4?num(a[4]):1;if(p<=0||p>=1||alpha<=0||beta<=0||hi<=lo)throw new RangeError("Invalid BETA.INV arguments");const z=invertUnit(x=>betaI(x,alpha,beta),p);return lo+z*(hi-lo);},3,5)
];