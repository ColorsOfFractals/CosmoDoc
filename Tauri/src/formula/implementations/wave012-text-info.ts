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

const bool=(x:unknown):boolean=>{
  if(typeof x==="boolean")return x;
  if(typeof x==="number")return x!==0;
  if(typeof x==="string"){
    const s=x.trim().toUpperCase();
    if(s==="TRUE")return true;
    if(s==="FALSE"||s==="")return false;
  }
  return Boolean(x);
};

const flat=(xs:unknown[]):unknown[]=>{
  const out:unknown[]=[];
  for(const x of xs){
    if(Array.isArray(x))out.push(...flat(x));
    else out.push(x);
  }
  return out;
};

const def=(name:string,evaluate:(args:unknown[])=>unknown,minArgs=1,maxArgs=minArgs):FunctionDefinition=>({
  name,minArgs,maxArgs,evaluate
});

export const definitions:FunctionDefinition[]=[
  def("PROPER",a=>String(a[0]??"").toLowerCase().replace(/\b\p{L}/gu,c=>c.toUpperCase())),
  def("DOLLAR",a=>num(a[0]).toLocaleString("en-US",{style:"currency",currency:"USD",minimumFractionDigits:a.length>1?Math.max(0,int(a[1])):2,maximumFractionDigits:a.length>1?Math.max(0,int(a[1])):2}),1,2),
  def("FIXED",a=>num(a[0]).toLocaleString("en-US",{useGrouping:a.length>2?!bool(a[2]):true,minimumFractionDigits:a.length>1?Math.max(0,int(a[1])):2,maximumFractionDigits:a.length>1?Math.max(0,int(a[1])):2}),1,3),
  def("NUMBERVALUE",a=>{let s=String(a[0]??"").trim();const dec=a.length>1?String(a[1]):".";const grp=a.length>2?String(a[2]):",";if(grp)s=s.split(grp).join("");if(dec!==".")s=s.replace(dec,".");const n=Number(s);if(!Number.isFinite(n))throw new RangeError("Invalid number");return n;},1,3),
  def("TEXTJOIN",a=>{const d=String(a[0]??"");const ignore=bool(a[1]);return flat(a.slice(2)).filter(x=>!ignore||String(x??"")!=="").map(x=>String(x??"")).join(d);},3,255),
  def("ERROR.TYPE",a=>{const x=a[0];if(!(x instanceof Error))return 0;const m=x.message.toUpperCase();if(m.includes("NULL"))return 1;if(m.includes("DIV"))return 2;if(m.includes("VALUE"))return 3;if(m.includes("REF"))return 4;if(m.includes("NAME"))return 5;if(m.includes("NUM"))return 6;if(m.includes("N/A")||m.includes("NA"))return 7;return 8;}),
  def("ISERR",a=>a[0] instanceof Error&&!/N\/A/i.test(a[0].message)),
  def("ISERROR",a=>a[0] instanceof Error),
  def("ISNA",a=>a[0] instanceof Error&&/N\/A/i.test(a[0].message)),
  def("NA",()=>new Error("#N/A"),0,0),
  def("ISFORMULA",a=>typeof a[0]==="string"&&a[0].startsWith("=")),
  def("ISREF",()=>false),
  def("ASC",a=>String(a[0]??"")),
  def("LEFTB",a=>String(a[0]??"").slice(0,a.length>1?Math.max(0,int(a[1])):1),1,2),
  def("RIGHTB",a=>{const s=String(a[0]??"");const n=a.length>1?Math.max(0,int(a[1])):1;return n===0?"":s.slice(-n);},1,2),
  def("MIDB",a=>String(a[0]??"").slice(Math.max(0,int(a[1])-1),Math.max(0,int(a[1])-1)+Math.max(0,int(a[2]))),3,3),
  def("LENB",a=>String(a[0]??"").length),
  def("FINDB",a=>{const hay=String(a[1]??"");const i=hay.indexOf(String(a[0]??""),a.length>2?Math.max(0,int(a[2])-1):0);if(i<0)throw new RangeError("Not found");return i+1;},2,3),
  def("SEARCHB",a=>{const hay=String(a[1]??"").toLowerCase();const i=hay.indexOf(String(a[0]??"").toLowerCase(),a.length>2?Math.max(0,int(a[2])-1):0);if(i<0)throw new RangeError("Not found");return i+1;},2,3),
  def("REPLACEB",a=>{const s=String(a[0]??"");const p=Math.max(0,int(a[1])-1);return s.slice(0,p)+String(a[3]??"")+s.slice(p+Math.max(0,int(a[2])));},4,4)
];