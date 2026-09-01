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

const flatNums=(x:unknown):number[]=>{
  const out:number[]=[];

  const walk=(v:unknown):void=>{
    if(Array.isArray(v)){
      v.forEach(walk);
      return;
    }

    out.push(num(v));
  };

  walk(x);

  return out;
};

type PairData={
  y:number[];
  x:number[];
};

const pair=(
  yInput:unknown,
  xInput:unknown
):PairData=>{
  const y=flatNums(yInput);
  const x=flatNums(xInput);

  if(y.length!==x.length)
    throw new RangeError(
      "Paired arrays must have equal length"
    );

  if(y.length===0)
    throw new RangeError(
      "Paired arrays cannot be empty"
    );

  return {y,x};
};

const mean=(values:number[]):number=>{
  if(values.length===0)
    throw new RangeError("Empty array");

  return values.reduce(
    (sum,value)=>sum+value,
    0
  )/values.length;
};

const linear=(data:PairData):{
  slope:number;
  intercept:number;
}=>{
  if(data.y.length<2)
    throw new RangeError(
      "Regression requires at least two pairs"
    );

  const meanY=mean(data.y);
  const meanX=mean(data.x);

  let ssX=0;
  let cross=0;

  for(let i=0;i<data.y.length;i++){
    const dy=data.y[i]-meanY;
    const dx=data.x[i]-meanX;

    ssX+=dx*dx;
    cross+=dy*dx;
  }

  if(ssX===0)
    throw new RangeError(
      "Independent values have zero variance"
    );

  const slope=cross/ssX;
  const intercept=meanY-slope*meanX;

  return {
    slope,
    intercept
  };
};

const steyx=(data:PairData):number=>{
  const n=data.y.length;

  if(n<3)
    throw new RangeError(
      "STEYX requires at least three pairs"
    );

  const fit=linear(data);

  let residual=0;

  for(let i=0;i<n;i++){
    const predicted=
      fit.intercept+
      fit.slope*data.x[i];

    const error=
      data.y[i]-
      predicted;

    residual+=error*error;
  }

  return Math.sqrt(
    residual/(n-2)
  );
};

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

const normalCdf=(x:number):number=>
  0.5*(1+erf(x/Math.sqrt(2)));

const sampleSd=(values:number[]):number=>{
  if(values.length<2)
    throw new RangeError(
      "Sample standard deviation requires two values"
    );

  const m=mean(values);

  const sum=values.reduce(
    (total,value)=>{
      const d=value-m;
      return total+d*d;
    },
    0
  );

  return Math.sqrt(
    sum/(values.length-1)
  );
};

const zTest=(
  values:number[],
  hypothesizedMean:number,
  sigma?:number
):number=>{
  if(values.length===0)
    throw new RangeError(
      "Z.TEST requires values"
    );

  const m=mean(values);

  const sd=
    sigma===undefined
      ? sampleSd(values)
      : sigma;

  if(sd<=0)
    throw new RangeError(
      "Standard deviation must be positive"
    );

  const z=
    (m-hypothesizedMean)/
    (sd/Math.sqrt(values.length));

  return 1-normalCdf(z);
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
  def("STEYX",a=>steyx(pair(a[0],a[1])),2,2),
  def("FORECAST.LINEAR",a=>{const fit=linear(pair(a[1],a[2]));return fit.intercept+fit.slope*num(a[0]);},3,3),
  def("FISHER",a=>{const x=num(a[0]);if(x<=-1||x>=1)throw new RangeError("FISHER requires -1 < x < 1");return 0.5*Math.log((1+x)/(1-x));},1,1),
  def("FISHERINV",a=>{const y=num(a[0]);const e=Math.exp(2*y);return (e-1)/(e+1);},1,1),
  def("Z.TEST",a=>zTest(flatNums(a[0]),num(a[1]),a.length>2?num(a[2]):undefined),2,3)
];