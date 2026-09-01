import type { FunctionDefinition } from "../functions";

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
  def("ABS",a=>
  Math.abs(H.num(a[0])),
1,1),
  def("INT",a=>
  Math.floor(H.num(a[0])),
1,1),
  def("MOD",a=>{
  const n=H.num(a[0]);
  const d=H.num(a[1]);

  if(d===0)
    throw new RangeError("Divisor cannot be zero");

  return n-d*Math.floor(n/d);
},2,2),
  def("SIGN",a=>{
  const x=H.num(a[0]);

  return x===0
    ? 0
    : x>0
      ? 1
      : -1;
},1,1),
  def("POWER",a=>{
  const result=Math.pow(
    H.num(a[0]),
    H.num(a[1])
  );

  if(!Number.isFinite(result))
    throw new RangeError("Invalid POWER result");

  return result;
},2,2),
  def("EXP",a=>{
  const result=Math.exp(H.num(a[0]));

  if(!Number.isFinite(result))
    throw new RangeError("EXP overflow");

  return result;
},1,1),
  def("LN",a=>{
  const x=H.num(a[0]);

  if(x<=0)
    throw new RangeError("LN requires positive number");

  return Math.log(x);
},1,1),
  def("LOG",a=>{
  const x=H.num(a[0]);
  const base=a.length>1
    ? H.num(a[1])
    : 10;

  if(
    x<=0||
    base<=0||
    base===1
  ){
    throw new RangeError("Invalid LOG arguments");
  }

  return Math.log(x)/Math.log(base);
},1,2),
  def("LOG10",a=>{
  const x=H.num(a[0]);

  if(x<=0)
    throw new RangeError("LOG10 requires positive number");

  return Math.log10(x);
},1,1),
  def("SIN",a=>
  Math.sin(H.num(a[0])),
1,1),
  def("COS",a=>
  Math.cos(H.num(a[0])),
1,1),
  def("TAN",a=>
  Math.tan(H.num(a[0])),
1,1),
  def("ASIN",a=>{
  const x=H.num(a[0]);

  if(x < -1 || x > 1)
    throw new RangeError("ASIN domain error");

  return Math.asin(x);
},1,1),
  def("ACOS",a=>{
  const x=H.num(a[0]);

  if(x < -1 || x > 1)
    throw new RangeError("ACOS domain error");

  return Math.acos(x);
},1,1),
  def("ATAN",a=>
  Math.atan(H.num(a[0])),
1,1),
  def("ATAN2",a=>{
  const x=H.num(a[0]);
  const y=H.num(a[1]);

  if(x===0&&y===0)
    throw new RangeError("ATAN2 undefined at origin");

  return Math.atan2(y,x);
},2,2),
  def("SINH",a=>{
  const result=Math.sinh(H.num(a[0]));

  if(!Number.isFinite(result))
    throw new RangeError("SINH overflow");

  return result;
},1,1),
  def("COSH",a=>{
  const result=Math.cosh(H.num(a[0]));

  if(!Number.isFinite(result))
    throw new RangeError("COSH overflow");

  return result;
},1,1),
  def("TANH",a=>
  Math.tanh(H.num(a[0])),
1,1),
  def("ASINH",a=>
  Math.asinh(H.num(a[0])),
1,1),
  def("ACOSH",a=>{
  const x=H.num(a[0]);

  if(x<1)
    throw new RangeError("ACOSH domain error");

  return Math.acosh(x);
},1,1),
  def("ATANH",a=>{
  const x=H.num(a[0]);

  if(x<=-1||x>=1)
    throw new RangeError("ATANH domain error");

  return Math.atanh(x);
},1,1),
  def("EVEN",a=>{
  const x=H.num(a[0]);

  if(x===0)
    return 0;

  const sign=x<0?-1:1;

  return sign*(
    Math.ceil(Math.abs(x)/2)*2
  );
},1,1),
  def("ODD",a=>{
  const x=H.num(a[0]);
  const sign=x<0?-1:1;
  const magnitude=Math.abs(x);

  return sign*(
    Math.ceil((magnitude-1)/2)*2+1
  );
},1,1)
];