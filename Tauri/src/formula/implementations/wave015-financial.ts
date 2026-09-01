import type { FunctionDefinition } from "../functions";

const num=(x:unknown):number=>{
  if(typeof x==="number"&&Number.isFinite(x))return x;

  if(typeof x==="string"&&x.trim()!==""){
    const n=Number(x);
    if(Number.isFinite(n))return n;
  }

  throw new TypeError("Expected number");
};

const int=(x:unknown):number=>Math.trunc(num(x));

const typ=(x:unknown):number=>{
  const n=int(x);
  if(n!==0&&n!==1)
    throw new RangeError("Type must be 0 or 1");
  return n;
};

const flatNums=(xs:unknown[]):number[]=>{
  const out:number[]=[];

  const walk=(x:unknown):void=>{
    if(Array.isArray(x)){
      x.forEach(walk);
      return;
    }

    out.push(num(x));
  };

  xs.forEach(walk);
  return out;
};

const fv=(
  rate:number,
  periods:number,
  payment:number,
  present=0,
  type=0
):number=>{
  if(periods<0)
    throw new RangeError("Periods cannot be negative");

  if(rate===0)
    return -(present+payment*periods);

  const growth=Math.pow(1+rate,periods);

  return -(
    present*growth+
    payment*(1+rate*type)*(growth-1)/rate
  );
};

const pv=(
  rate:number,
  periods:number,
  payment:number,
  future=0,
  type=0
):number=>{
  if(periods<0)
    throw new RangeError("Periods cannot be negative");

  if(rate===0)
    return -(future+payment*periods);

  const growth=Math.pow(1+rate,periods);

  return -(
    future+
    payment*(1+rate*type)*(growth-1)/rate
  )/growth;
};

const pmt=(
  rate:number,
  periods:number,
  present:number,
  future=0,
  type=0
):number=>{
  if(periods===0)
    throw new RangeError("Periods cannot be zero");

  if(rate===0)
    return -(present+future)/periods;

  const growth=Math.pow(1+rate,periods);
  const denominator=(1+rate*type)*(growth-1);

  if(denominator===0)
    throw new RangeError("Invalid payment denominator");

  return -(future+present*growth)*rate/denominator;
};

const nper=(
  rate:number,
  payment:number,
  present:number,
  future=0,
  type=0
):number=>{
  if(rate===0){
    if(payment===0)
      throw new RangeError("Payment cannot be zero");

    return -(present+future)/payment;
  }

  if(rate<=-1)
    throw new RangeError("Rate must be greater than -1");

  const c=payment*(1+rate*type)/rate;
  const ratio=(c-future)/(present+c);

  if(ratio<=0||!Number.isFinite(ratio))
    throw new RangeError("Unable to solve NPER");

  return Math.log(ratio)/Math.log(1+rate);
};

const ipmt=(
  rate:number,
  period:number,
  periods:number,
  present:number,
  future=0,
  type=0
):number=>{
  if(period<1||period>periods)
    throw new RangeError("Period out of range");

  const payment=pmt(
    rate,
    periods,
    present,
    future,
    type
  );

  let balance=present;
  let interest=0;

  for(let p=1;p<=period;p++){
    if(type===1&&p===1){
      interest=0;
    }else{
      interest=-balance*rate;
    }

    const principal=payment-interest;
    balance+=principal;
  }

  return interest;
};

const db=(
  cost:number,
  salvage:number,
  life:number,
  period:number,
  month=12
):number=>{
  if(cost<0||salvage<0||life<=0)
    throw new RangeError("Invalid DB arguments");

  if(period<1||period>life)
    throw new RangeError("Period out of range");

  if(month<1||month>12)
    throw new RangeError("Month must be 1 through 12");

  if(cost===0)
    return 0;

  const raw=1-Math.pow(salvage/cost,1/life);
  const rate=Math.round(raw*1000)/1000;

  let book=cost;
  let depreciation=0;

  for(let p=1;p<=period;p++){
    depreciation=
      p===1
        ? book*rate*month/12
        : book*rate;

    depreciation=Math.min(
      depreciation,
      Math.max(0,book-salvage)
    );

    book-=depreciation;
  }

  return depreciation;
};

const ddb=(
  cost:number,
  salvage:number,
  life:number,
  period:number,
  factor=2
):number=>{
  if(cost<0||salvage<0||life<=0||factor<=0)
    throw new RangeError("Invalid DDB arguments");

  if(period<1||period>life)
    throw new RangeError("Period out of range");

  let book=cost;
  let depreciation=0;

  for(let p=1;p<=period;p++){
    depreciation=Math.min(
      book*factor/life,
      Math.max(0,book-salvage)
    );

    book-=depreciation;
  }

  return depreciation;
};

const dollarScale=(fraction:number):number=>{
  const f=Math.abs(Math.trunc(fraction));

  if(f<=0)
    throw new RangeError("Fraction must be positive");

  return Math.pow(
    10,
    Math.ceil(Math.log10(f+1))
  );
};

const dollarDe=(
  value:number,
  fraction:number
):number=>{
  const f=Math.abs(Math.trunc(fraction));

  if(f<=0)
    throw new RangeError("Fraction must be positive");

  const sign=value<0?-1:1;
  const x=Math.abs(value);
  const whole=Math.floor(x);
  const part=x-whole;
  const scale=dollarScale(f);

  return sign*(
    whole+
    part*scale/f
  );
};

const dollarFr=(
  value:number,
  fraction:number
):number=>{
  const f=Math.abs(Math.trunc(fraction));

  if(f<=0)
    throw new RangeError("Fraction must be positive");

  const sign=value<0?-1:1;
  const x=Math.abs(value);
  const whole=Math.floor(x);
  const part=x-whole;
  const scale=dollarScale(f);

  return sign*(
    whole+
    part*f/scale
  );
};

const mirr=(
  values:number[],
  financeRate:number,
  reinvestRate:number
):number=>{
  if(values.length<2)
    throw new RangeError("MIRR requires at least two values");

  const n=values.length;

  let positiveFuture=0;
  let negativePresent=0;
  let hasPositive=false;
  let hasNegative=false;

  values.forEach((value,index)=>{
    if(value>0){
      hasPositive=true;

      positiveFuture+=
        value*
        Math.pow(
          1+reinvestRate,
          n-1-index
        );
    }

    if(value<0){
      hasNegative=true;

      negativePresent+=
        value/
        Math.pow(
          1+financeRate,
          index
        );
    }
  });

  if(!hasPositive||!hasNegative)
    throw new RangeError(
      "MIRR requires positive and negative cash flows"
    );

  return Math.pow(
    -positiveFuture/negativePresent,
    1/(n-1)
  )-1;
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
  def("FV",a=>fv(num(a[0]),num(a[1]),num(a[2]),a.length>3?num(a[3]):0,a.length>4?typ(a[4]):0),3,5),
  def("PV",a=>pv(num(a[0]),num(a[1]),num(a[2]),a.length>3?num(a[3]):0,a.length>4?typ(a[4]):0),3,5),
  def("PMT",a=>pmt(num(a[0]),num(a[1]),num(a[2]),a.length>3?num(a[3]):0,a.length>4?typ(a[4]):0),3,5),
  def("NPER",a=>nper(num(a[0]),num(a[1]),num(a[2]),a.length>3?num(a[3]):0,a.length>4?typ(a[4]):0),3,5),
  def("IPMT",a=>ipmt(num(a[0]),int(a[1]),int(a[2]),num(a[3]),a.length>4?num(a[4]):0,a.length>5?typ(a[5]):0),4,6),
  def("PPMT",a=>{const r=num(a[0]),per=int(a[1]),n=int(a[2]),principal=num(a[3]),future=a.length>4?num(a[4]):0,t=a.length>5?typ(a[5]):0;return pmt(r,n,principal,future,t)-ipmt(r,per,n,principal,future,t);},4,6),
  def("EFFECT",a=>{const rate=num(a[0]),n=int(a[1]);if(rate<=0||n<1)throw new RangeError("Invalid EFFECT arguments");return Math.pow(1+rate/n,n)-1;},2,2),
  def("NOMINAL",a=>{const effect=num(a[0]),n=int(a[1]);if(effect<=0||n<1)throw new RangeError("Invalid NOMINAL arguments");return n*(Math.pow(1+effect,1/n)-1);},2,2),
  def("RRI",a=>{const n=num(a[0]),present=num(a[1]),future=num(a[2]);if(n<=0||present<=0||future<0)throw new RangeError("Invalid RRI arguments");return Math.pow(future/present,1/n)-1;},3,3),
  def("PDURATION",a=>{const rate=num(a[0]),present=num(a[1]),future=num(a[2]);if(rate<=0||present<=0||future<=0)throw new RangeError("Invalid PDURATION arguments");return Math.log(future/present)/Math.log(1+rate);},3,3),
  def("SLN",a=>{const cost=num(a[0]),salvage=num(a[1]),life=num(a[2]);if(life===0)throw new RangeError("Life cannot be zero");return (cost-salvage)/life;},3,3),
  def("SYD",a=>{const cost=num(a[0]),salvage=num(a[1]),life=num(a[2]),period=num(a[3]);if(life<=0||period<=0||period>life)throw new RangeError("Invalid SYD period");return (cost-salvage)*(life-period+1)*2/(life*(life+1));},4,4),
  def("DB",a=>db(num(a[0]),num(a[1]),int(a[2]),int(a[3]),a.length>4?int(a[4]):12),4,5),
  def("DDB",a=>ddb(num(a[0]),num(a[1]),int(a[2]),int(a[3]),a.length>4?num(a[4]):2),4,5),
  def("ISPMT",a=>{const rate=num(a[0]),period=num(a[1]),periods=num(a[2]),principal=num(a[3]);if(periods===0)throw new RangeError("Periods cannot be zero");return principal*rate*(period/periods-1);},4,4),
  def("DOLLARDE",a=>dollarDe(num(a[0]),int(a[1])),2,2),
  def("DOLLARFR",a=>dollarFr(num(a[0]),int(a[1])),2,2),
  def("NPV",a=>{const rate=num(a[0]);if(rate===-1)throw new RangeError("Invalid rate");const values=flatNums(a.slice(1));return values.reduce((s,v,i)=>s+v/Math.pow(1+rate,i+1),0);},2,255),
  def("MIRR",a=>mirr(flatNums([a[0]]),num(a[1]),num(a[2])),3,3),
  def("FVSCHEDULE",a=>flatNums([a[1]]).reduce((v,r)=>v*(1+r),num(a[0])),2,2)
];