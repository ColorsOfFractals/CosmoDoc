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
  def("MODE.MULT",a=>{
  const xs=flatNums(a[0]);

  if(xs.length===0)
    throw new RangeError("Empty data");

  const counts=new Map<number,number>();

  for(const x of xs)
    counts.set(x,(counts.get(x)??0)+1);

  const max=Math.max(...counts.values());

  if(max<2)
    throw new RangeError("No mode");

  return [...counts.entries()]
    .filter(([,count])=>count===max)
    .map(([value])=>value)
    .sort((a,b)=>a-b);
},1,1),
  def("PROB",a=>{
  const xs=flatNums(a[0]);
  const ps=flatNums(a[1]);
  const lower=num(a[2]);
  const upper=a.length>3?num(a[3]):lower;

  if(xs.length===0||xs.length!==ps.length)
    throw new RangeError("Array size mismatch");

  if(lower>upper)
    throw new RangeError("Invalid probability range");

  if(ps.some(p=>p<0||p>1))
    throw new RangeError("Invalid probability");

  const total=ps.reduce((s,p)=>s+p,0);

  if(Math.abs(total-1)>1e-7)
    throw new RangeError("Probabilities must total 1");

  return xs.reduce(
    (s,x,i)=>s+(x>=lower&&x<=upper?ps[i]:0),
    0
  );
},3,4),
  def("FREQUENCY",a=>{
  const data=flatNums(a[0]);
  const bins=flatNums(a[1]).sort((x,y)=>x-y);
  const out=new Array(bins.length+1).fill(0) as number[];

  for(const value of data){
    let i=0;

    while(i<bins.length&&value>bins[i])
      i++;

    out[i]++;
  }

  return out;
},2,2)
];