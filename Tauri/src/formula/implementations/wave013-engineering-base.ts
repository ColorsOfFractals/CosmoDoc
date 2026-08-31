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

const bit=(x:unknown):number=>{
  const n=int(x);
  if(n<0||n>0x7fffffff)throw new RangeError("Invalid bit value");
  return n;
};

const parseBase=(x:unknown,radix:number):number=>{
  const s=String(x??"").trim().toUpperCase();

  if(!s)throw new RangeError("Empty value");

  const digits="0123456789ABCDEF";
  let out=0;

  for(const ch of s){
    const d=digits.indexOf(ch);

    if(d<0||d>=radix)
      throw new RangeError("Invalid digit");

    out=out*radix+d;
  }

  return out;
};

const formatBase=(value:number,radix:number,places=0):string=>{
  const n=Math.trunc(value);

  if(n<0)throw new RangeError("Negative conversion not supported");

  const s=n.toString(radix).toUpperCase();

  if(places<0)throw new RangeError("Invalid places");
  if(places>0&&s.length>places)throw new RangeError("Result exceeds places");

  return places>0?s.padStart(places,"0"):s;
};

const shift=(value:number,count:number):number=>{
  if(count>=0)return value*Math.pow(2,count);
  return Math.floor(value/Math.pow(2,-count));
};

const def=(
  name:string,
  evaluate:(args:unknown[])=>unknown,
  minArgs=1,
  maxArgs=minArgs
):FunctionDefinition=>({
  name,minArgs,maxArgs,evaluate
});

export const definitions:FunctionDefinition[]=[
  def("BIN2DEC",a=>parseBase(a[0],2),1,1),
  def("BIN2HEX",a=>formatBase(parseBase(a[0],2),16,a.length>1?int(a[1]):0),1,2),
  def("BIN2OCT",a=>formatBase(parseBase(a[0],2),8,a.length>1?int(a[1]):0),1,2),
  def("DEC2BIN",a=>formatBase(int(a[0]),2,a.length>1?int(a[1]):0),1,2),
  def("DEC2HEX",a=>formatBase(int(a[0]),16,a.length>1?int(a[1]):0),1,2),
  def("DEC2OCT",a=>formatBase(int(a[0]),8,a.length>1?int(a[1]):0),1,2),
  def("HEX2BIN",a=>formatBase(parseBase(a[0],16),2,a.length>1?int(a[1]):0),1,2),
  def("HEX2DEC",a=>parseBase(a[0],16),1,1),
  def("HEX2OCT",a=>formatBase(parseBase(a[0],16),8,a.length>1?int(a[1]):0),1,2),
  def("OCT2BIN",a=>formatBase(parseBase(a[0],8),2,a.length>1?int(a[1]):0),1,2),
  def("OCT2DEC",a=>parseBase(a[0],8),1,1),
  def("OCT2HEX",a=>formatBase(parseBase(a[0],8),16,a.length>1?int(a[1]):0),1,2),
  def("BITAND",a=>bit(a[0])&bit(a[1]),2,2),
  def("BITOR",a=>bit(a[0])|bit(a[1]),2,2),
  def("BITXOR",a=>bit(a[0])^bit(a[1]),2,2),
  def("BITLSHIFT",a=>shift(bit(a[0]),int(a[1])),2,2),
  def("BITRSHIFT",a=>shift(bit(a[0]),-int(a[1])),2,2),
  def("DELTA",a=>num(a[0])===(a.length>1?num(a[1]):0)?1:0,1,2),
  def("GESTEP",a=>num(a[0])>=(a.length>1?num(a[1]):0)?1:0,1,2)
];