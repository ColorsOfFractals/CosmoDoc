import type { FunctionDefinition } from "../functions";

const H={
  num(x:unknown):number{
    if(typeof x==="number"&&Number.isFinite(x))
      return x;

    if(typeof x==="boolean")
      return x?1:0;

    if(typeof x==="string"&&x.trim()!==""){
      const n=Number(x);

      if(Number.isFinite(n))
        return n;
    }

    throw new TypeError("Expected number");
  },

  int(x:unknown):number{
    return Math.trunc(this.num(x));
  },

  truthy(x:unknown):boolean{
    if(typeof x==="boolean")
      return x;

    if(typeof x==="number")
      return x!==0;

    if(typeof x==="string"){
      const s=x.trim().toUpperCase();

      if(s==="TRUE")
        return true;

      if(s==="FALSE"||s==="")
        return false;
    }

    return Boolean(x);
  },

  flat(x:unknown):unknown[]{
    const out:unknown[]=[];

    const walk=(v:unknown):void=>{
      if(Array.isArray(v)){
        v.forEach(walk);
        return;
      }

      out.push(v);
    };

    walk(x);

    return out;
  },

  flatNums(x:unknown):number[]{
    return this.flat(x).map(v=>this.num(v));
  },

  mean(xs:number[]):number{
    if(xs.length===0)
      throw new RangeError("Empty data");

    return xs.reduce((s,v)=>s+v,0)/xs.length;
  },

  variance(xs:number[],sample:boolean):number{
    if(xs.length<(sample?2:1))
      throw new RangeError("Insufficient data");

    const mean=this.mean(xs);
    const ss=xs.reduce((s,v)=>{
      const d=v-mean;
      return s+d*d;
    },0);

    return ss/(sample?xs.length-1:xs.length);
  },

  median(xs:number[]):number{
    if(xs.length===0)
      throw new RangeError("Empty data");

    const s=[...xs].sort((a,b)=>a-b);
    const m=Math.floor(s.length/2);

    return s.length%2
      ? s[m]
      : (s[m-1]+s[m])/2;
  },

  mode(xs:number[]):number{
    if(xs.length===0)
      throw new RangeError("Empty data");

    const counts=new Map<number,number>();

    for(const x of xs)
      counts.set(x,(counts.get(x)??0)+1);

    let best=xs[0];
    let bestCount=0;

    for(const [value,count] of counts){
      if(count>bestCount){
        best=value;
        bestCount=count;
      }
    }

    if(bestCount<2)
      throw new RangeError("No mode");

    return best;
  },

  large(xs:number[],k:number):number{
    if(k<1||k>xs.length)
      throw new RangeError("Invalid rank");

    return [...xs].sort((a,b)=>b-a)[k-1];
  },

  small(xs:number[],k:number):number{
    if(k<1||k>xs.length)
      throw new RangeError("Invalid rank");

    return [...xs].sort((a,b)=>a-b)[k-1];
  },

  gcd(a:number,b:number):number{
    a=Math.abs(Math.trunc(a));
    b=Math.abs(Math.trunc(b));

    while(b!==0){
      const t=b;
      b=a%b;
      a=t;
    }

    return a;
  },

  comb(n:number,k:number):number{
    n=Math.trunc(n);
    k=Math.trunc(k);

    if(n<0||k<0||k>n)
      throw new RangeError("Invalid combination");

    k=Math.min(k,n-k);

    let result=1;

    for(let i=1;i<=k;i++)
      result=result*(n-k+i)/i;

    return result;
  },

  bit(x:number):number{
    const n=Math.trunc(x);

    if(n<0||n>281474976710655)
      throw new RangeError("Invalid bit operand");

    return n;
  },

  escapeRegex(s:string):string{
    return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  },

  date(x:unknown):Date{
    if(x instanceof Date&&!Number.isNaN(x.getTime()))
      return new Date(x.getTime());

    if(typeof x==="number"&&Number.isFinite(x)){
      return new Date(
        Date.UTC(1899,11,30)+x*86400000
      );
    }

    if(typeof x==="string"){
      const d=new Date(x);

      if(!Number.isNaN(d.getTime()))
        return d;
    }

    throw new TypeError("Expected date");
  },

  isoWeek(input:Date):number{
    const d=new Date(Date.UTC(
      input.getUTCFullYear(),
      input.getUTCMonth(),
      input.getUTCDate()
    ));

    const day=d.getUTCDay()||7;

    d.setUTCDate(d.getUTCDate()+4-day);

    const yearStart=new Date(Date.UTC(
      d.getUTCFullYear(),0,1
    ));

    return Math.ceil(
      (((d.getTime()-yearStart.getTime())/86400000)+1)/7
    );
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
  def("AGGREGATE",a=>{
  const fn=H.int(a[0]);
  const values=H.flatNums(a.slice(2));

  if(values.length===0)
    throw new RangeError("Empty aggregate");

  switch(fn){
    case 1: return H.mean(values);
    case 2: return values.length;
    case 3: return values.length;
    case 4: return Math.max(...values);
    case 5: return Math.min(...values);
    case 6: return values.reduce((p,v)=>p*v,1);
    case 9: return values.reduce((s,v)=>s+v,0);
    case 10: return Math.sqrt(H.variance(values,true));
    case 11: return Math.sqrt(H.variance(values,false));
    case 12: return H.median(values);
    case 13: return H.mode(values);
    case 14: return H.large(values,H.int(a[a.length-1]));
    case 15: return H.small(values,H.int(a[a.length-1]));
    default:
      throw new RangeError("Unsupported AGGREGATE function number");
  }
},3,255),
  def("SUBTOTAL",a=>{
  let fn=H.int(a[0]);

  if(fn>=101&&fn<=111)
    fn-=100;

  const values=H.flatNums(a.slice(1));

  if(values.length===0)
    return 0;

  switch(fn){
    case 1: return H.mean(values);
    case 2: return values.length;
    case 3: return values.length;
    case 4: return Math.max(...values);
    case 5: return Math.min(...values);
    case 6: return values.reduce((p,v)=>p*v,1);
    case 7: return Math.sqrt(H.variance(values,true));
    case 8: return Math.sqrt(H.variance(values,false));
    case 9: return values.reduce((s,v)=>s+v,0);
    case 10: return H.variance(values,true);
    case 11: return H.variance(values,false);
    default:
      throw new RangeError("Unsupported SUBTOTAL function number");
  }
},2,255)
];