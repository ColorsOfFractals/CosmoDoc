import type { FunctionDefinition } from "../functions";

/*
 * Bake 025 uses one shared toolbox object.
 *
 * Candidate routing may remove any subset of definitions.
 * Unused toolbox methods therefore do not become TS6133
 * top-level orphan-helper failures.
 */
const H={

  num(x:unknown):number{
    if(
      typeof x==="number"&&
      Number.isFinite(x)
    ){
      return x;
    }

    if(
      typeof x==="string"&&
      x.trim()!==""
    ){
      const n=Number(x);

      if(Number.isFinite(n))
        return n;
    }

    throw new TypeError("Expected number");
  },

  truthy(x:unknown):boolean{
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
  },

  flat(x:unknown):number[]{
    const out:number[]=[];

    const walk=(v:unknown):void=>{
      if(Array.isArray(v)){
        v.forEach(walk);
        return;
      }

      out.push(H.num(v));
    };

    walk(x);

    return out;
  },

  mean(xs:number[]):number{
    if(xs.length===0)
      throw new RangeError("Empty data");

    return (
      xs.reduce((s,x)=>s+x,0)/
      xs.length
    );
  },

  variance(
    xs:number[],
    sample:boolean
  ):number{
    const min=sample?2:1;

    if(xs.length<min)
      throw new RangeError(
        "Insufficient data"
      );

    const m=H.mean(xs);

    const sum=xs.reduce(
      (s,x)=>{
        const d=x-m;
        return s+d*d;
      },
      0
    );

    return (
      sum/
      (sample?xs.length-1:xs.length)
    );
  },

  percentile(
    values:number[],
    k:number
  ):number{
    if(
      values.length===0||
      k<0||
      k>1
    ){
      throw new RangeError(
        "Invalid percentile"
      );
    }

    const xs=[
      ...values
    ].sort((a,b)=>a-b);

    if(xs.length===1)
      return xs[0];

    const rank=
      (xs.length-1)*k;

    const lo=Math.floor(rank);
    const hi=Math.ceil(rank);

    return lo===hi
      ? xs[lo]
      : xs[lo]+
        (rank-lo)*
        (xs[hi]-xs[lo]);
  },

  comb(
    n:number,
    k:number
  ):number{
    if(
      !Number.isInteger(n)||
      !Number.isInteger(k)||
      n<0||
      k<0||
      k>n
    ){
      return 0;
    }

    k=Math.min(k,n-k);

    let result=1;

    for(let i=1;i<=k;i++){
      result=
        result*
        (n-k+i)/
        i;
    }

    return result;
  },

  binomPmf(
    k:number,
    n:number,
    p:number
  ):number{
    if(p===0)
      return k===0?1:0;

    if(p===1)
      return k===n?1:0;

    return (
      H.comb(n,k)*
      Math.pow(p,k)*
      Math.pow(1-p,n-k)
    );
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
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];

    if(z<0.5){
      return (
        Math.log(Math.PI)-
        Math.log(
          Math.sin(Math.PI*z)
        )-
        H.logGamma(1-z)
      );
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
  },

  poissonPmf(
    k:number,
    mu:number
  ):number{
    if(mu===0)
      return k===0?1:0;

    return Math.exp(
      -mu+
      k*Math.log(mu)-
      H.logGamma(k+1)
    );
  },

  erf(x:number):number{
    const sign=x<0?-1:1;
    const a=Math.abs(x);
    const t=1/(1+0.3275911*a);

    const y=
      1-
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
      )*
      t*
      Math.exp(-a*a);

    return sign*y;
  },

  normalPdf(x:number):number{
    return (
      Math.exp(-0.5*x*x)/
      Math.sqrt(2*Math.PI)
    );
  },

  normalCdf(x:number):number{
    return (
      0.5*
      (
        1+
        H.erf(
          x/Math.sqrt(2)
        )
      )
    );
  },

  normalInv(p:number):number{
    if(p<=0||p>=1){
      throw new RangeError(
        "Probability must be between 0 and 1"
      );
    }

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
      const q=Math.sqrt(
        -2*Math.log(p)
      );

      return (
        (
          (
            (
              (
                (
                  c[0]*q+c[1]
                )*q+c[2]
              )*q+c[3]
            )*q+c[4]
          )*q+c[5]
        )/
        (
          (
            (
              (
                d[0]*q+d[1]
              )*q+d[2]
            )*q+d[3]
          )*q+1
        )
      );
    }

    if(p>high){
      const q=Math.sqrt(
        -2*Math.log(1-p)
      );

      return -(
        (
          (
            (
              (
                (
                  c[0]*q+c[1]
                )*q+c[2]
              )*q+c[3]
            )*q+c[4]
          )*q+c[5]
        )/
        (
          (
            (
              (
                d[0]*q+d[1]
              )*q+d[2]
            )*q+d[3]
          )*q+1
        )
      );
    }

    const q=p-0.5;
    const r=q*q;

    return (
      (
        (
          (
            (
              (
                a[0]*r+a[1]
              )*r+a[2]
            )*r+a[3]
          )*r+a[4]
        )*r+a[5]
      )*
      q/
      (
        (
          (
            (
              (
                b[0]*r+b[1]
              )*r+b[2]
            )*r+b[3]
          )*r+b[4]
        )*r+1
      )
    );
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
  def("VAR",a=>{
  const xs=H.flat(a);
  return H.variance(xs,true);
},1,255),
  def("VARP",a=>{
  const xs=H.flat(a);
  return H.variance(xs,false);
},1,255),
  def("STDEV",a=>{
  const xs=H.flat(a);
  return Math.sqrt(H.variance(xs,true));
},1,255),
  def("STDEVP",a=>{
  const xs=H.flat(a);
  return Math.sqrt(H.variance(xs,false));
},1,255),
  def("RANK",a=>{
  const x=H.num(a[0]);
  const xs=H.flat(a[1]);
  const order=a.length>2?H.num(a[2]):0;

  if(xs.length===0)
    throw new RangeError("Empty reference");

  if(!xs.some(v=>v===x))
    throw new RangeError("Value not found");

  return order===0
    ? 1+xs.filter(v=>v>x).length
    : 1+xs.filter(v=>v<x).length;
},2,3),
  def("PERCENTILE",a=>{
  return H.percentile(
    H.flat(a[0]),
    H.num(a[1])
  );
},2,2),
  def("QUARTILE",a=>{
  const q=Math.trunc(H.num(a[1]));

  if(q<0||q>4)
    throw new RangeError("Invalid quartile");

  return H.percentile(
    H.flat(a[0]),
    q/4
  );
},2,2),
  def("MODE",a=>{
  const xs=H.flat(a);

  if(xs.length===0)
    throw new RangeError("Empty data");

  const counts=new Map<number,number>();

  for(const x of xs)
    counts.set(x,(counts.get(x)??0)+1);

  let bestCount=1;
  let best:number|undefined;

  for(const [value,count] of counts){
    if(count>bestCount){
      bestCount=count;
      best=value;
    }
  }

  if(best===undefined)
    throw new RangeError("No mode");

  return best;
},1,255),
  def("COVAR",a=>{
  const x=H.flat(a[0]);
  const y=H.flat(a[1]);

  if(x.length===0||x.length!==y.length)
    throw new RangeError("Array size mismatch");

  const mx=H.mean(x);
  const my=H.mean(y);

  return x.reduce(
    (s,v,i)=>s+(v-mx)*(y[i]-my),
    0
  )/x.length;
},2,2),
  def("ZTEST",a=>{
  const xs=H.flat(a[0]);
  const mu=H.num(a[1]);

  if(xs.length===0)
    throw new RangeError("Empty data");

  const sigma=
    a.length>2
      ? H.num(a[2])
      : Math.sqrt(H.variance(xs,true));

  if(sigma<=0)
    throw new RangeError("Invalid standard deviation");

  const z=
    (H.mean(xs)-mu)/
    (sigma/Math.sqrt(xs.length));

  return 1-H.normalCdf(z);
},2,3),
  def("CONFIDENCE",a=>{
  const alpha=H.num(a[0]);
  const sigma=H.num(a[1]);
  const n=H.num(a[2]);

  if(alpha<=0||alpha>=1||sigma<=0||n<1)
    throw new RangeError("Invalid CONFIDENCE arguments");

  return (
    H.normalInv(1-alpha/2)*
    sigma/
    Math.sqrt(n)
  );
},3,3),
  def("POISSON",a=>{
  const x=Math.trunc(H.num(a[0]));
  const mu=H.num(a[1]);
  const cumulative=H.truthy(a[2]);

  if(x<0||mu<0)
    throw new RangeError("Invalid POISSON arguments");

  if(!cumulative)
    return H.poissonPmf(x,mu);

  let total=0;

  for(let k=0;k<=x;k++)
    total+=H.poissonPmf(k,mu);

  return Math.min(1,total);
},3,3),
  def("WEIBULL",a=>{
  const x=H.num(a[0]);
  const alpha=H.num(a[1]);
  const beta=H.num(a[2]);
  const cumulative=H.truthy(a[3]);

  if(x<0||alpha<=0||beta<=0)
    throw new RangeError("Invalid WEIBULL arguments");

  const z=Math.pow(x/beta,alpha);

  if(cumulative)
    return 1-Math.exp(-z);

  if(x===0&&alpha<1)
    return Number.POSITIVE_INFINITY;

  if(x===0&&alpha>1)
    return 0;

  return (
    (alpha/beta)*
    Math.pow(x/beta,alpha-1)*
    Math.exp(-z)
  );
},4,4),
  def("EXPONDIST",a=>{
  const x=H.num(a[0]);
  const lambda=H.num(a[1]);
  const cumulative=H.truthy(a[2]);

  if(x<0||lambda<=0)
    throw new RangeError("Invalid EXPONDIST arguments");

  return cumulative
    ? 1-Math.exp(-lambda*x)
    : lambda*Math.exp(-lambda*x);
},3,3),
  def("BINOMDIST",a=>{
  const k=Math.trunc(H.num(a[0]));
  const n=Math.trunc(H.num(a[1]));
  const p=H.num(a[2]);
  const cumulative=H.truthy(a[3]);

  if(k<0||n<0||k>n||p<0||p>1)
    throw new RangeError("Invalid BINOMDIST arguments");

  if(!cumulative)
    return H.binomPmf(k,n,p);

  let total=0;

  for(let i=0;i<=k;i++)
    total+=H.binomPmf(i,n,p);

  return Math.min(1,total);
},4,4),
  def("CRITBINOM",a=>{
  const n=Math.trunc(H.num(a[0]));
  const p=H.num(a[1]);
  const alpha=H.num(a[2]);

  if(n<0||p<0||p>1||alpha<0||alpha>1)
    throw new RangeError("Invalid CRITBINOM arguments");

  let total=0;

  for(let k=0;k<=n;k++){
    total+=H.binomPmf(k,n,p);

    if(total>=alpha)
      return k;
  }

  return n;
},3,3),
  def("HYPGEOMDIST",a=>{
  const x=Math.trunc(H.num(a[0]));
  const sample=Math.trunc(H.num(a[1]));
  const success=Math.trunc(H.num(a[2]));
  const population=Math.trunc(H.num(a[3]));

  if(
    population<=0||
    sample<0||
    success<0||
    sample>population||
    success>population||
    x<0||
    x>sample||
    x>success||
    sample-x>population-success
  ){
    throw new RangeError("Invalid HYPGEOMDIST arguments");
  }

  return (
    H.comb(success,x)*
    H.comb(population-success,sample-x)/
    H.comb(population,sample)
  );
},4,4),
  def("LOGINV",a=>{
  const p=H.num(a[0]);
  const mu=H.num(a[1]);
  const sigma=H.num(a[2]);

  if(p<=0||p>=1||sigma<=0)
    throw new RangeError("Invalid LOGINV arguments");

  return Math.exp(
    mu+sigma*H.normalInv(p)
  );
},3,3),
  def("LOGNORMDIST",a=>{
  const x=H.num(a[0]);
  const mu=H.num(a[1]);
  const sigma=H.num(a[2]);

  if(x<=0||sigma<=0)
    throw new RangeError("Invalid LOGNORMDIST arguments");

  return H.normalCdf(
    (Math.log(x)-mu)/sigma
  );
},3,3),
  def("NORMDIST",a=>{
  const x=H.num(a[0]);
  const mu=H.num(a[1]);
  const sigma=H.num(a[2]);
  const cumulative=H.truthy(a[3]);

  if(sigma<=0)
    throw new RangeError("Invalid standard deviation");

  const z=(x-mu)/sigma;

  return cumulative
    ? H.normalCdf(z)
    : H.normalPdf(z)/sigma;
},4,4),
  def("NORMINV",a=>{
  const p=H.num(a[0]);
  const mu=H.num(a[1]);
  const sigma=H.num(a[2]);

  if(p<=0||p>=1||sigma<=0)
    throw new RangeError("Invalid NORMINV arguments");

  return mu+sigma*H.normalInv(p);
},3,3),
  def("NORMSDIST",a=>{
  return H.normalCdf(
    H.num(a[0])
  );
},1,1),
  def("NORMSINV",a=>{
  return H.normalInv(
    H.num(a[0])
  );
},1,1),
  def("NEGBINOMDIST",a=>{
  const failures=Math.trunc(H.num(a[0]));
  const successes=Math.trunc(H.num(a[1]));
  const p=H.num(a[2]);

  if(
    failures<0||
    successes<1||
    p<=0||
    p>1
  ){
    throw new RangeError("Invalid NEGBINOMDIST arguments");
  }

  return (
    H.comb(
      failures+successes-1,
      failures
    )*
    Math.pow(p,successes)*
    Math.pow(1-p,failures)
  );
},3,3)
];