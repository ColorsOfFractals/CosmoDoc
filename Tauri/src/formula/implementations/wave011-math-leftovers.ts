import type { FunctionDefinition } from "../functions";

const num=(x:unknown):number=>{
  if(typeof x==="number"&&Number.isFinite(x))return x;
  if(typeof x==="string"&&x.trim()!==""){
    const n=Number(x); if(Number.isFinite(n))return n;
  }
  throw new TypeError("Expected number");
};

const int=(x:unknown):number=>Math.trunc(num(x));

const fact=(n:number):number=>{
  if(n<0||!Number.isInteger(n))throw new RangeError("Expected non-negative integer");
  let r=1; for(let i=2;i<=n;i++)r*=i; return r;
};

const gcd=(a:number,b:number):number=>{
  a=Math.abs(Math.trunc(a)); b=Math.abs(Math.trunc(b));
  while(b){const t=b;b=a%b;a=t;} return a;
};

const def=(name:string,evaluate:(args:unknown[])=>unknown,minArgs=1,maxArgs=minArgs):FunctionDefinition=>({
  name,minArgs,maxArgs,evaluate
});

const ceiling=(x:number,s:number):number=>{
  if(s===0)return 0;
  return Math.ceil(x/Math.abs(s))*Math.abs(s);
};

const floor=(x:number,s:number):number=>{
  if(s===0)return 0;
  return Math.floor(x/Math.abs(s))*Math.abs(s);
};

export const definitions:FunctionDefinition[]=[
  def("ACOT",a=>Math.atan2(1,num(a[0]))),
  def("ACOTH",a=>{const x=num(a[0]);return .5*Math.log((x+1)/(x-1));}),

  def("BASE",a=>{
    let n=Math.trunc(num(a[0])),rad=int(a[1]),min=a.length>2?int(a[2]):0;
    if(n<0||rad<2||rad>36)throw new RangeError("Invalid BASE arguments");
    return n.toString(rad).toUpperCase().padStart(min,"0");
  },2,3),

  def("CEILING",a=>ceiling(num(a[0]),num(a[1])),2,2),
  def("CEILING.MATH",a=>ceiling(num(a[0]),a.length>1?num(a[1]):1),1,3),
  def("CEILING.PRECISE",a=>ceiling(num(a[0]),a.length>1?num(a[1]):1),1,2),

  def("COMBIN",a=>{
    const n=int(a[0]),k=int(a[1]);
    if(n<0||k<0||k>n)throw new RangeError("Invalid combination");
    return fact(n)/(fact(k)*fact(n-k));
  },2,2),

  def("COMBINA",a=>{
    const n=int(a[0]),k=int(a[1]);
    if(n<0||k<0)throw new RangeError("Invalid combination");
    return fact(n+k-1)/(fact(k)*fact(n-1));
  },2,2),

  def("COT",a=>1/Math.tan(num(a[0]))),
  def("COTH",a=>1/Math.tanh(num(a[0]))),
  def("CSC",a=>1/Math.sin(num(a[0]))),
  def("CSCH",a=>1/Math.sinh(num(a[0]))),

  def("DECIMAL",a=>{
    const s=String(a[0]).trim(),rad=int(a[1]);
    if(rad<2||rad>36)throw new RangeError("Invalid radix");
    const n=parseInt(s,rad);
    if(Number.isNaN(n))throw new RangeError("Invalid number");
    return n;
  },2,2),

  def("FACTDOUBLE",a=>{
    const n=int(a[0]);
    if(n<0)throw new RangeError("Expected non-negative integer");
    let r=1;for(let i=n;i>1;i-=2)r*=i;return r;
  }),

  def("FLOOR",a=>floor(num(a[0]),num(a[1])),2,2),
  def("FLOOR.MATH",a=>floor(num(a[0]),a.length>1?num(a[1]):1),1,3),
  def("FLOOR.PRECISE",a=>floor(num(a[0]),a.length>1?num(a[1]):1),1,2),

  def("GCD",a=>{
    if(!a.length)return 0;
    return a.map(num).reduce((x,y)=>gcd(x,y));
  },1,255),

  def("LCM",a=>{
    const v=a.map(num).map(x=>Math.abs(Math.trunc(x)));
    if(v.some(x=>x===0))return 0;
    return v.reduce((x,y)=>Math.abs(x*y)/gcd(x,y),1);
  },1,255),

  def("MROUND",a=>{
    const x=num(a[0]),m=num(a[1]);
    if(m===0)return 0;
    return Math.round(x/m)*m;
  },2,2),

  def("MULTINOMIAL",a=>{
    const v=a.map(int);
    if(v.some(x=>x<0))throw new RangeError("Expected non-negative integers");
    const total=v.reduce((s,x)=>s+x,0);
    return fact(total)/v.reduce((p,x)=>p*fact(x),1);
  },1,255),

  def("SEC",a=>1/Math.cos(num(a[0]))),
  def("SECH",a=>1/Math.cosh(num(a[0])))
];