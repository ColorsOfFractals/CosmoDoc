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
const frac=(x:number):number=>((x%1)+1)%1;

const epoch=Date.UTC(1899,11,30);

const serial=(d:Date):number=>
  (d.getTime()-epoch)/86400000;

const fromSerial=(n:number):Date=>
  new Date(epoch+n*86400000);

const parseDate=(x:unknown):Date=>{
  if(typeof x==="number")return fromSerial(x);

  const d=new Date(String(x??""));
  if(Number.isNaN(d.getTime()))
    throw new RangeError("Invalid date");

  return new Date(Date.UTC(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds()
  ));
};

const isoWeek=(date:Date):number=>{
  const d=new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));

  const day=d.getUTCDay()||7;
  d.setUTCDate(d.getUTCDate()+4-day);

  const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));

  return Math.ceil(
    (((d.getTime()-yearStart.getTime())/86400000)+1)/7
  );
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
  def("DATE",a=>serial(new Date(Date.UTC(int(a[0])<1900?1900+int(a[0]):int(a[0]),int(a[1])-1,int(a[2])))),3,3),
  def("DATEVALUE",a=>serial(parseDate(a[0])),1,1),
  def("DAY",a=>fromSerial(num(a[0])).getUTCDate(),1,1),
  def("DAYS",a=>Math.trunc(num(a[0])-num(a[1])),2,2),
  def("EDATE",a=>{const d=fromSerial(num(a[0]));const day=d.getUTCDate();const x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+int(a[1]),1));const last=new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth()+1,0)).getUTCDate();x.setUTCDate(Math.min(day,last));return serial(x);},2,2),
  def("EOMONTH",a=>{const d=fromSerial(num(a[0]));return serial(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+int(a[1])+1,0)));},2,2),
  def("HOUR",a=>Math.floor(frac(num(a[0]))*24)%24,1,1),
  def("MINUTE",a=>Math.floor(frac(num(a[0]))*1440)%60,1,1),
  def("MONTH",a=>fromSerial(num(a[0])).getUTCMonth()+1,1,1),
  def("SECOND",a=>Math.floor(frac(num(a[0]))*86400)%60,1,1),
  def("TIME",a=>frac((int(a[0])*3600+int(a[1])*60+int(a[2]))/86400),3,3),
  def("TIMEVALUE",a=>{const s=String(a[0]??"").trim();const d=new Date("1970-01-01T"+s);if(Number.isNaN(d.getTime()))throw new RangeError("Invalid time");return (d.getHours()*3600+d.getMinutes()*60+d.getSeconds())/86400;},1,1),
  def("WEEKDAY",a=>{const d=fromSerial(num(a[0])).getUTCDay();const t=a.length>1?int(a[1]):1;if(t===1)return d+1;if(t===2)return d===0?7:d;if(t===3)return d===0?6:d-1;throw new RangeError("Unsupported return type");},1,2),
  def("WEEKNUM",a=>{const d=fromSerial(num(a[0]));const start=new Date(Date.UTC(d.getUTCFullYear(),0,1));const days=Math.floor((d.getTime()-start.getTime())/86400000);const t=a.length>1?int(a[1]):1;const weekStart=t===2?1:0;const offset=(start.getUTCDay()-weekStart+7)%7;return Math.floor((days+offset)/7)+1;},1,2),
  def("ISOWEEKNUM",a=>isoWeek(fromSerial(num(a[0]))),1,1),
  def("YEAR",a=>fromSerial(num(a[0])).getUTCFullYear(),1,1),
  def("YEARFRAC",a=>{const s=fromSerial(num(a[0])),e=fromSerial(num(a[1]));return (e.getTime()-s.getTime())/86400000/365;},2,3),
  def("DAYS360",a=>{const s=fromSerial(num(a[0])),e=fromSerial(num(a[1]));let d1=Math.min(s.getUTCDate(),30),d2=e.getUTCDate();if(d1===30&&d2===31)d2=30;return (e.getUTCFullYear()-s.getUTCFullYear())*360+(e.getUTCMonth()-s.getUTCMonth())*30+(d2-d1);},2,3)
];