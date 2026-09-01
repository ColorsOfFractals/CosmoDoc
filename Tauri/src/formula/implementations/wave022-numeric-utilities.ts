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

const romanValue=(c:string):number=>{
  switch(c){
    case "I": return 1;
    case "V": return 5;
    case "X": return 10;
    case "L": return 50;
    case "C": return 100;
    case "D": return 500;
    case "M": return 1000;
    default: return 0;
  }
};

const arabic=(input:string):number=>{
  const s=input
    .trim()
    .toUpperCase();

  if(s==="")
    throw new RangeError(
      "Empty Roman numeral"
    );

  let total=0;

  for(let i=0;i<s.length;i++){
    const current=romanValue(s[i]);

    if(current===0)
      throw new RangeError(
        "Invalid Roman numeral"
      );

    const next=
      i+1<s.length
        ? romanValue(s[i+1])
        : 0;

    total+=
      current<next
        ? -current
        : current;
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
  def("QUOTIENT",a=>{const d=num(a[1]);if(d===0)throw new RangeError("Division by zero");return Math.trunc(num(a[0])/d);},2,2),
  def("ISO.CEILING",a=>{const value=num(a[0]);const sig=Math.abs(a.length>1?num(a[1]):1);if(sig===0)throw new RangeError("Significance cannot be zero");return Math.ceil(value/sig)*sig;},1,2),
  def("ARABIC",a=>arabic(String(a[0]??"")),1,1)
];