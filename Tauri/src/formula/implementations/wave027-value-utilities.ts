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
  },

  text(x:unknown):string{
    if(x===null||x===undefined)
      return "";

    if(typeof x==="boolean")
      return x?"TRUE":"FALSE";

    return String(x);
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

  equal(a:unknown,b:unknown):boolean{
    if(
      typeof a==="number"||
      typeof b==="number"
    ){
      try{
        return H.num(a)===H.num(b);
      }catch{
        return false;
      }
    }

    return H.text(a).toLowerCase()===
      H.text(b).toLowerCase();
  },

  flatten(x:unknown):unknown[]{
    const out:unknown[]=[];

    const walk=(value:unknown):void=>{
      if(Array.isArray(value)){
        value.forEach(walk);
        return;
      }

      out.push(value);
    };

    walk(x);

    return out;
  },

  columnLetter(column:number):string{
    let n=Math.trunc(column);

    if(n<1)
      throw new RangeError("Invalid column");

    let result="";

    while(n>0){
      n--;

      result=
        String.fromCharCode(
          65+n%26
        )+
        result;

      n=Math.floor(n/26);
    }

    return result;
  },

  delimiterHit(
    text:string,
    delimiter:string,
    instance:number
  ):number{
    if(instance>0){
      let from=0;

      for(let i=0;i<instance;i++){
        const hit=text.indexOf(
          delimiter,
          from
        );

        if(hit<0)
          return -1;

        if(i===instance-1)
          return hit;

        from=hit+delimiter.length;
      }
    }else{
      let from=text.length;

      for(let i=0;i<Math.abs(instance);i++){
        const hit=text.lastIndexOf(
          delimiter,
          from-1
        );

        if(hit<0)
          return -1;

        if(i===Math.abs(instance)-1)
          return hit;

        from=hit;
      }
    }

    return -1;
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
  def("SWITCH",a=>{
  const expression=a[0];

  if(a.length<3)
    throw new RangeError("SWITCH requires cases");

  const remaining=a.length-1;
  const hasDefault=remaining%2===1;
  const limit=hasDefault?a.length-1:a.length;

  for(let i=1;i<limit;i+=2){
    if(H.equal(expression,a[i]))
      return a[i+1];
  }

  if(hasDefault)
    return a[a.length-1];

  throw new RangeError("No SWITCH match");
},3,255),
  def("IFS",a=>{
  if(a.length<2||a.length%2!==0)
    throw new RangeError("IFS requires condition/value pairs");

  for(let i=0;i<a.length;i+=2){
    if(H.truthy(a[i]))
      return a[i+1];
  }

  throw new RangeError("No IFS condition matched");
},2,254),
  def("CHOOSE",a=>{
  const index=Math.trunc(H.num(a[0]));

  if(index<1||index>=a.length)
    throw new RangeError("Invalid CHOOSE index");

  return a[index];
},2,255),
  def("ADDRESS",a=>{
  const row=Math.trunc(H.num(a[0]));
  const column=Math.trunc(H.num(a[1]));
  const absNum=a.length>2
    ? Math.trunc(H.num(a[2]))
    : 1;
  const a1=a.length>3
    ? H.truthy(a[3])
    : true;
  const sheet=a.length>4
    ? H.text(a[4])
    : "";

  if(row<1||column<1||absNum<1||absNum>4)
    throw new RangeError("Invalid ADDRESS arguments");

  let address:string;

  if(a1){
    const col=H.columnLetter(column);

    const colAbs=absNum===1||absNum===3;
    const rowAbs=absNum===1||absNum===2;

    address=
      (colAbs?"$":"")+
      col+
      (rowAbs?"$":"")+
      row;
  }else{
    const rowRelative=absNum===3||absNum===4;
    const colRelative=absNum===2||absNum===4;

    address=
      "R"+
      (rowRelative?"["+row+"]":row)+
      "C"+
      (colRelative?"["+column+"]":column);
  }

  if(sheet!==""){
    const escaped=sheet.replace(/'/g,"''");
    address="'"+escaped+"'!"+address;
  }

  return address;
},2,5),
  def("ROMAN",a=>{
  let n=Math.trunc(H.num(a[0]));

  if(n<0||n>3999)
    throw new RangeError("ROMAN requires 0..3999");

  if(n===0)
    return "";

  const values=[
    1000,900,500,400,
    100,90,50,40,
    10,9,5,4,1
  ];

  const numerals=[
    "M","CM","D","CD",
    "C","XC","L","XL",
    "X","IX","V","IV","I"
  ];

  let result="";

  for(let i=0;i<values.length;i++){
    while(n>=values[i]){
      result+=numerals[i];
      n-=values[i];
    }
  }

  return result;
},1,2),
  def("TEXTBEFORE",a=>{
  const text=H.text(a[0]);
  const delimiter=H.text(a[1]);
  const instance=a.length>2
    ? Math.trunc(H.num(a[2]))
    : 1;

  if(delimiter===""||instance===0)
    throw new RangeError("Invalid TEXTBEFORE arguments");

  const hit=H.delimiterHit(text,delimiter,instance);

  if(hit<0)
    throw new RangeError("Delimiter not found");

  return text.slice(0,hit);
},2,6),
  def("TEXTAFTER",a=>{
  const text=H.text(a[0]);
  const delimiter=H.text(a[1]);
  const instance=a.length>2
    ? Math.trunc(H.num(a[2]))
    : 1;

  if(delimiter===""||instance===0)
    throw new RangeError("Invalid TEXTAFTER arguments");

  const hit=H.delimiterHit(text,delimiter,instance);

  if(hit<0)
    throw new RangeError("Delimiter not found");

  return text.slice(hit+delimiter.length);
},2,6),
  def("TEXTSPLIT",a=>{
  const text=H.text(a[0]);
  const colDelimiter=H.text(a[1]);

  if(colDelimiter==="")
    throw new RangeError("Empty delimiter");

  if(a.length<3||a[2]===undefined||a[2]===null||H.text(a[2])==="")
    return text.split(colDelimiter);

  const rowDelimiter=H.text(a[2]);

  return text
    .split(rowDelimiter)
    .map(row=>row.split(colDelimiter));
},2,6),
  def("ARRAYTOTEXT",a=>{
  const values=H.flatten(a[0]);
  const format=a.length>1
    ? Math.trunc(H.num(a[1]))
    : 0;

  if(format!==0&&format!==1)
    throw new RangeError("Invalid ARRAYTOTEXT format");

  if(format===0)
    return values.map(H.text).join(", ");

  return "{"+
    values.map(v=>{
      if(typeof v==="string")
        return '"'+v.replace(/"/g,'""')+'"';

      return H.text(v);
    }).join(",")+
    "}";
},1,2),
  def("VALUETOTEXT",a=>{
  const format=a.length>1
    ? Math.trunc(H.num(a[1]))
    : 0;

  if(format!==0&&format!==1)
    throw new RangeError("Invalid VALUETOTEXT format");

  const value=a[0];

  if(format===1&&typeof value==="string")
    return '"'+value.replace(/"/g,'""')+'"';

  return H.text(value);
},1,2),
  def("ISOMITTED",a=>
  a[0]===undefined,
1,1),
  def("ISBETWEEN",a=>{
  const value=H.num(a[0]);
  const lower=H.num(a[1]);
  const upper=H.num(a[2]);
  const inclusiveLower=a.length>3
    ? H.truthy(a[3])
    : true;
  const inclusiveUpper=a.length>4
    ? H.truthy(a[4])
    : true;

  const lowOk=inclusiveLower
    ? value>=lower
    : value>lower;

  const highOk=inclusiveUpper
    ? value<=upper
    : value<upper;

  return lowOk&&highOk;
},3,5),
  def("DEC2BASE",a=>{
  const value=Math.trunc(H.num(a[0]));
  const radix=Math.trunc(H.num(a[1]));

  if(radix<2||radix>36)
    throw new RangeError("Base must be 2..36");

  return value.toString(radix).toUpperCase();
},2,2),
  def("BASE2DEC",a=>{
  const text=H.text(a[0]).trim();
  const radix=Math.trunc(H.num(a[1]));

  if(radix<2||radix>36||text==="")
    throw new RangeError("Invalid BASE2DEC arguments");

  const negative=text.startsWith("-");
  const digits=negative?text.slice(1):text;

  if(digits==="")
    throw new RangeError("Invalid number");

  const alphabet="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let value=0;

  for(const char of digits.toUpperCase()){
    const digit=alphabet.indexOf(char);

    if(digit<0||digit>=radix)
      throw new RangeError("Digit outside base");

    value=value*radix+digit;
  }

  return negative?-value:value;
},2,2),
  def("BITNOT",a=>{
  const value=Math.trunc(H.num(a[0]));

  if(value<0||value>281474976710655)
    throw new RangeError("BITNOT requires unsigned 48-bit integer");

  return 281474976710655-value;
},1,1),
  def("BITCOUNT",a=>{
  let value=Math.trunc(H.num(a[0]));

  if(value<0||value>Number.MAX_SAFE_INTEGER)
    throw new RangeError("Invalid BITCOUNT value");

  let count=0;

  while(value>0){
    if(value%2===1)
      count++;

    value=Math.floor(value/2);
  }

  return count;
},1,1),
  def("GREATEST",a=>{
  const values=H.flatten(a).map(H.num);

  if(values.length===0)
    throw new RangeError("GREATEST requires values");

  return Math.max(...values);
},1,255),
  def("LEAST",a=>{
  const values=H.flatten(a).map(H.num);

  if(values.length===0)
    throw new RangeError("LEAST requires values");

  return Math.min(...values);
},1,255),
  def("SHEETNAME",a=>{
  const text=H.text(a[0]);
  const bang=text.lastIndexOf("!");

  if(bang<0)
    return text;

  return text
    .slice(0,bang)
    .replace(/^'/,"")
    .replace(/'$/,"")
    .replace(/''/g,"'");
},1,1),
  def("COLUMNLETTER",a=>{
  const column=Math.trunc(H.num(a[0]));

  if(column<1)
    throw new RangeError("Column must be positive");

  return H.columnLetter(column);
},1,1)
];