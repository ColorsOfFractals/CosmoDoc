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
  def("PERCENTILE.EXC",a=>{
  const s=flatNums(a[0]).sort((x,y)=>x-y);
  const k=num(a[1]);

  if(s.length===0||k<=0||k>=1)
    throw new RangeError("Invalid percentile");

  const r=(s.length+1)*k;

  if(r<1||r>s.length)
    throw new RangeError("Percentile out of range");

  const lo=Math.floor(r);
  const hi=Math.ceil(r);

  if(lo===hi)
    return s[lo-1];

  return s[lo-1]+(r-lo)*(s[hi-1]-s[lo-1]);
},2,2),
  def("QUARTILE.EXC",a=>{
  const s=flatNums(a[0]).sort((x,y)=>x-y);
  const q=Math.trunc(num(a[1]));

  if(s.length===0||q<1||q>3)
    throw new RangeError("Invalid quartile");

  const r=(s.length+1)*(q/4);

  if(r<1||r>s.length)
    throw new RangeError("Quartile out of range");

  const lo=Math.floor(r);
  const hi=Math.ceil(r);

  if(lo===hi)
    return s[lo-1];

  return s[lo-1]+(r-lo)*(s[hi-1]-s[lo-1]);
},2,2),
  def("PERCENTRANK.INC",a=>{
  const s=flatNums(a[0]).sort((x,y)=>x-y);
  const x=num(a[1]);
  const digits=a.length>2?Math.trunc(num(a[2])):3;

  if(s.length<2||digits<1)
    throw new RangeError("Invalid PERCENTRANK.INC arguments");

  if(x<s[0]||x>s[s.length-1])
    throw new RangeError("Value outside data range");

  let rank=0;

  const exact=s.indexOf(x);

  if(exact>=0){
    rank=exact/(s.length-1);
  }else{
    let hi=1;

    while(hi<s.length&&s[hi]<x)
      hi++;

    const lo=hi-1;
    const fraction=(x-s[lo])/(s[hi]-s[lo]);

    rank=(lo+fraction)/(s.length-1);
  }

  const factor=Math.pow(10,digits);

  return Math.round(rank*factor)/factor;
},2,3),
  def("PERCENTRANK.EXC",a=>{
  const s=flatNums(a[0]).sort((x,y)=>x-y);
  const x=num(a[1]);
  const digits=a.length>2?Math.trunc(num(a[2])):3;

  if(s.length<1||digits<1)
    throw new RangeError("Invalid PERCENTRANK.EXC arguments");

  if(x<s[0]||x>s[s.length-1])
    throw new RangeError("Value outside data range");

  let rank=0;

  const exact=s.indexOf(x);

  if(exact>=0){
    rank=(exact+1)/(s.length+1);
  }else{
    let hi=1;

    while(hi<s.length&&s[hi]<x)
      hi++;

    const lo=hi-1;
    const fraction=(x-s[lo])/(s[hi]-s[lo]);

    rank=(lo+1+fraction)/(s.length+1);
  }

  const factor=Math.pow(10,digits);

  return Math.round(rank*factor)/factor;
},2,3),
  def("RANK.EQ",a=>{
  const x=num(a[0]);
  const values=flatNums(a[1]);
  const order=a.length>2?num(a[2]):0;

  if(values.length===0)
    throw new RangeError("Empty reference");

  if(!values.some(v=>v===x))
    throw new RangeError("Value not found");

  return order===0
    ? 1+values.filter(v=>v>x).length
    : 1+values.filter(v=>v<x).length;
},2,3),
  def("RANK.AVG",a=>{
  const x=num(a[0]);
  const values=flatNums(a[1]);
  const order=a.length>2?num(a[2]):0;

  if(values.length===0)
    throw new RangeError("Empty reference");

  const equal=values.filter(v=>v===x).length;

  if(equal===0)
    throw new RangeError("Value not found");

  const base=order===0
    ? 1+values.filter(v=>v>x).length
    : 1+values.filter(v=>v<x).length;

  return base+(equal-1)/2;
},2,3)
];