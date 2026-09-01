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

const typ=(x:unknown):number=>{
  const n=int(x);

  if(n!==0&&n!==1)
    throw new RangeError("Type must be 0 or 1");

  return n;
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

const epoch=Date.UTC(1899,11,30);

const dateNum=(x:unknown):number=>{
  if(typeof x==="number"&&Number.isFinite(x))
    return x;

  const d=new Date(String(x??""));

  if(Number.isNaN(d.getTime()))
    throw new RangeError("Invalid date");

  return (
    Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate()
    )-epoch
  )/86400000;
};

const flatDates=(x:unknown):number[]=>{
  const out:number[]=[];

  const walk=(v:unknown):void=>{
    if(Array.isArray(v)){
      v.forEach(walk);
      return;
    }

    out.push(dateNum(v));
  };

  walk(x);

  return out;
};

const yearFrac=(
  start:number,
  end:number,
  basis=0
):number=>{
  if(end<=start)
    throw new RangeError("Maturity must follow settlement");

  const days=end-start;

  if(basis===1)
    return days/365.25;

  if(basis===2)
    return days/360;

  if(basis===3)
    return days/365;

  if(basis===0||basis===4){
    const s=new Date(epoch+start*86400000);
    const e=new Date(epoch+end*86400000);

    let d1=s.getUTCDate();
    let d2=e.getUTCDate();

    const m1=s.getUTCMonth()+1;
    const m2=e.getUTCMonth()+1;

    const y1=s.getUTCFullYear();
    const y2=e.getUTCFullYear();

    if(d1===31)
      d1=30;

    if(d2===31&&d1===30)
      d2=30;

    return (
      (y2-y1)*360+
      (m2-m1)*30+
      (d2-d1)
    )/360;
  }

  throw new RangeError("Unsupported basis");
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

const fvEquation=(
  rate:number,
  periods:number,
  payment:number,
  present:number,
  future:number,
  type:number
):number=>{
  if(Math.abs(rate)<1e-12)
    return present+payment*periods+future;

  if(rate<=-1)
    return Number.NaN;

  const growth=Math.pow(1+rate,periods);

  return (
    present*growth+
    payment*(1+rate*type)*(growth-1)/rate+
    future
  );
};

const solveRoot=(
  fn:(x:number)=>number,
  guess=0.1
):number=>{
  let x=Number.isFinite(guess)?guess:0.1;

  x=Math.max(-0.999999,Math.min(10,x));

  for(let i=0;i<80;i++){
    const y=fn(x);

    if(Number.isFinite(y)&&Math.abs(y)<1e-10)
      return x;

    const h=Math.max(1e-7,Math.abs(x)*1e-6);
    const yl=fn(Math.max(-0.999999,x-h));
    const yr=fn(x+h);
    const derivative=(yr-yl)/(2*h);

    if(
      !Number.isFinite(y)||
      !Number.isFinite(derivative)||
      Math.abs(derivative)<1e-12
    ){
      break;
    }

    const next=x-y/derivative;

    if(!Number.isFinite(next)||next<=-1)
      break;

    if(Math.abs(next-x)<1e-12)
      return next;

    x=next;
  }

  const points:number[]=[
    -0.9999,
    -0.99,
    -0.9,
    -0.75,
    -0.5,
    -0.25,
    -0.1,
    0,
    0.01,
    0.05,
    0.1,
    0.2,
    0.5,
    1,
    2,
    5,
    10,
    25,
    50,
    100
  ];

  let left=points[0];
  let fl=fn(left);

  for(let i=1;i<points.length;i++){
    const right=points[i];
    const fr=fn(right);

    if(Number.isFinite(fl)&&Number.isFinite(fr)){
      if(fl===0)
        return left;

      if(fr===0)
        return right;

      if(fl*fr<0){
        let a=left;
        let b=right;
        let fa=fl;

        for(let j=0;j<120;j++){
          const mid=(a+b)/2;
          const fm=fn(mid);

          if(!Number.isFinite(fm))
            break;

          if(Math.abs(fm)<1e-10)
            return mid;

          if(fa*fm<=0){
            b=mid;
          }else{
            a=mid;
            fa=fm;
          }
        }

        return (a+b)/2;
      }
    }

    left=right;
    fl=fr;
  }

  throw new RangeError("Unable to converge");
};

const rateSolve=(
  periods:number,
  payment:number,
  present:number,
  future=0,
  type=0,
  guess=0.1
):number=>{
  if(periods<=0)
    throw new RangeError("Periods must be positive");

  return solveRoot(
    r=>fvEquation(
      r,
      periods,
      payment,
      present,
      future,
      type
    ),
    guess
  );
};

const irr=(
  values:number[],
  guess=0.1
):number=>{
  if(values.length<2)
    throw new RangeError("IRR requires multiple cash flows");

  if(
    !values.some(v=>v>0)||
    !values.some(v=>v<0)
  ){
    throw new RangeError(
      "IRR requires positive and negative cash flows"
    );
  }

  return solveRoot(
    r=>{
      if(r<=-1)
        return Number.NaN;

      return values.reduce(
        (sum,value,index)=>
          sum+
          value/Math.pow(1+r,index),
        0
      );
    },
    guess
  );
};

const xnpv=(
  rate:number,
  values:number[],
  dates:number[]
):number=>{
  if(rate<=-1)
    throw new RangeError("Rate must exceed -1");

  if(
    values.length!==dates.length||
    values.length===0
  ){
    throw new RangeError(
      "Values and dates must have equal length"
    );
  }

  const first=dates[0];

  return values.reduce(
    (sum,value,index)=>
      sum+
      value/
      Math.pow(
        1+rate,
        (dates[index]-first)/365
      ),
    0
  );
};

const xirr=(
  values:number[],
  dates:number[],
  guess=0.1
):number=>{
  if(
    values.length!==dates.length||
    values.length<2
  ){
    throw new RangeError(
      "Values and dates must have equal length"
    );
  }

  if(
    !values.some(v=>v>0)||
    !values.some(v=>v<0)
  ){
    throw new RangeError(
      "XIRR requires positive and negative cash flows"
    );
  }

  return solveRoot(
    r=>xnpv(r,values,dates),
    guess
  );
};

const cumLoan=(
  rate:number,
  periods:number,
  present:number,
  start:number,
  end:number,
  type:number
):{interest:number;principal:number}=>{
  if(
    rate<=0||
    periods<=0||
    present<=0||
    start<1||
    end<start||
    end>periods
  ){
    throw new RangeError("Invalid cumulative loan arguments");
  }

  const payment=pmt(
    rate,
    periods,
    present,
    0,
    type
  );

  let balance=present;
  let interestTotal=0;
  let principalTotal=0;

  for(let period=1;period<=periods;period++){
    let interest:number;

    if(type===1&&period===1){
      interest=0;
    }else{
      interest=-balance*rate;
    }

    const principal=payment-interest;

    if(period>=start&&period<=end){
      interestTotal+=interest;
      principalTotal+=principal;
    }

    balance+=principal;

    if(type===1&&period===1)
      balance+=payment;
  }

  return {
    interest:interestTotal,
    principal:principalTotal
  };
};

const vdb=(
  cost:number,
  salvage:number,
  life:number,
  start:number,
  end:number,
  factor=2,
  noSwitch=false
):number=>{
  if(
    cost<0||
    salvage<0||
    life<=0||
    start<0||
    end<start||
    factor<=0
  ){
    throw new RangeError("Invalid VDB arguments");
  }

  const cappedEnd=Math.min(end,life);
  let book=cost;
  let total=0;

  for(
    let period=0;
    period<Math.ceil(cappedEnd);
    period++
  ){
    const remainingLife=Math.max(
      life-period,
      1
    );

    const declining=Math.min(
      book*factor/life,
      Math.max(0,book-salvage)
    );

    const straight=Math.min(
      (book-salvage)/remainingLife,
      Math.max(0,book-salvage)
    );

    const depreciation=
      noSwitch
        ? declining
        : Math.max(declining,straight);

    const sliceStart=Math.max(
      start,
      period
    );

    const sliceEnd=Math.min(
      cappedEnd,
      period+1
    );

    if(sliceEnd>sliceStart){
      total+=
        depreciation*
        (sliceEnd-sliceStart);
    }

    book-=depreciation;

    if(book<=salvage)
      break;
  }

  return total;
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
  def("RATE",a=>rateSolve(num(a[0]),num(a[1]),num(a[2]),a.length>3?num(a[3]):0,a.length>4?typ(a[4]):0,a.length>5?num(a[5]):0.1),3,6),
  def("IRR",a=>irr(flatNums([a[0]]),a.length>1?num(a[1]):0.1),1,2),
  def("XNPV",a=>xnpv(num(a[0]),flatNums([a[1]]),flatDates(a[2])),3,3),
  def("XIRR",a=>xirr(flatNums([a[0]]),flatDates(a[1]),a.length>2?num(a[2]):0.1),2,3),
  def("CUMIPMT",a=>cumLoan(num(a[0]),int(a[1]),num(a[2]),int(a[3]),int(a[4]),typ(a[5])).interest,6,6),
  def("CUMPRINC",a=>cumLoan(num(a[0]),int(a[1]),num(a[2]),int(a[3]),int(a[4]),typ(a[5])).principal,6,6),
  def("VDB",a=>vdb(num(a[0]),num(a[1]),num(a[2]),num(a[3]),num(a[4]),a.length>5?num(a[5]):2,a.length>6?truthy(a[6]):false),5,7),
  def("DISC",a=>{const s=dateNum(a[0]),m=dateNum(a[1]),price=num(a[2]),redemption=num(a[3]),basis=a.length>4?int(a[4]):0;const y=yearFrac(s,m,basis);if(y<=0||price<=0||redemption<=0)throw new RangeError("Invalid DISC arguments");return (redemption-price)/redemption/y;},4,5),
  def("INTRATE",a=>{const s=dateNum(a[0]),m=dateNum(a[1]),investment=num(a[2]),redemption=num(a[3]),basis=a.length>4?int(a[4]):0;const y=yearFrac(s,m,basis);if(y<=0||investment<=0||redemption<=0)throw new RangeError("Invalid INTRATE arguments");return (redemption-investment)/investment/y;},4,5),
  def("RECEIVED",a=>{const s=dateNum(a[0]),m=dateNum(a[1]),investment=num(a[2]),discount=num(a[3]),basis=a.length>4?int(a[4]):0;const y=yearFrac(s,m,basis);const d=1-discount*y;if(investment<=0||discount<=0||d<=0)throw new RangeError("Invalid RECEIVED arguments");return investment/d;},4,5),
  def("PRICEDISC",a=>{const s=dateNum(a[0]),m=dateNum(a[1]),discount=num(a[2]),redemption=num(a[3]),basis=a.length>4?int(a[4]):0;const y=yearFrac(s,m,basis);if(y<=0||discount<=0||redemption<=0)throw new RangeError("Invalid PRICEDISC arguments");return redemption*(1-discount*y);},4,5),
  def("YIELDDISC",a=>{const s=dateNum(a[0]),m=dateNum(a[1]),price=num(a[2]),redemption=num(a[3]),basis=a.length>4?int(a[4]):0;const y=yearFrac(s,m,basis);if(y<=0||price<=0||redemption<=0)throw new RangeError("Invalid YIELDDISC arguments");return (redemption-price)/price/y;},4,5),
  def("TBILLPRICE",a=>{const s=dateNum(a[0]),m=dateNum(a[1]),discount=num(a[2]);const days=m-s;if(days<=0||days>365||discount<=0)throw new RangeError("Invalid TBILLPRICE arguments");return 100*(1-discount*days/360);},3,3),
  def("TBILLYIELD",a=>{const s=dateNum(a[0]),m=dateNum(a[1]),price=num(a[2]);const days=m-s;if(days<=0||days>365||price<=0)throw new RangeError("Invalid TBILLYIELD arguments");return (100-price)/price*360/days;},3,3),
  def("TBILLEQ",a=>{const s=dateNum(a[0]),m=dateNum(a[1]),discount=num(a[2]);const days=m-s;if(days<=0||days>365||discount<=0)throw new RangeError("Invalid TBILLEQ arguments");const denom=360-discount*days;if(denom<=0)throw new RangeError("Invalid TBILLEQ denominator");return 365*discount/denom;},3,3)
];