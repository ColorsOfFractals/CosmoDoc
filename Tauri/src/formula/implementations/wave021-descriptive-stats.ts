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

const flatA=(x:unknown):number[]=>{
  const out:number[]=[];

  const walk=(v:unknown):void=>{
    if(Array.isArray(v)){
      v.forEach(walk);
      return;
    }

    if(typeof v==="boolean"){
      out.push(v?1:0);
      return;
    }

    if(typeof v==="number"&&Number.isFinite(v)){
      out.push(v);
      return;
    }

    if(typeof v==="string"){
      const s=v.trim();

      if(s===""){
        out.push(0);
        return;
      }

      const n=Number(s);

      out.push(
        Number.isFinite(n)
          ? n
          : 0
      );

      return;
    }

    out.push(0);
  };

  walk(x);

  return out;
};

const mean=(values:number[]):number=>{
  if(values.length===0)
    throw new RangeError("Empty data set");

  return values.reduce(
    (sum,value)=>sum+value,
    0
  )/values.length;
};

const variance=(
  values:number[],
  sample:boolean
):number=>{
  const n=values.length;

  if(n===0||(sample&&n<2))
    throw new RangeError("Insufficient data");

  const m=mean(values);

  const sum=values.reduce(
    (total,value)=>{
      const d=value-m;
      return total+d*d;
    },
    0
  );

  return sum/(sample?n-1:n);
};

const skew=(
  values:number[],
  population:boolean
):number=>{
  const n=values.length;

  if(population){
    if(n<1)
      throw new RangeError("Insufficient data");
  }else if(n<3){
    throw new RangeError(
      "SKEW requires at least three values"
    );
  }

  const m=mean(values);

  const m2=values.reduce(
    (sum,value)=>{
      const d=value-m;
      return sum+d*d;
    },
    0
  );

  if(m2===0)
    throw new RangeError("Zero variance");

  const m3=values.reduce(
    (sum,value)=>{
      const d=value-m;
      return sum+d*d*d;
    },
    0
  );

  if(population){
    const sd=Math.sqrt(m2/n);

    return (
      m3/n
    )/Math.pow(sd,3);
  }

  const sd=Math.sqrt(
    m2/(n-1)
  );

  return (
    n/
    ((n-1)*(n-2))
  )*(
    m3/
    Math.pow(sd,3)
  );
};

const kurt=(values:number[]):number=>{
  const n=values.length;

  if(n<4)
    throw new RangeError(
      "KURT requires at least four values"
    );

  const m=mean(values);

  const sum2=values.reduce(
    (sum,value)=>{
      const d=value-m;
      return sum+d*d;
    },
    0
  );

  if(sum2===0)
    throw new RangeError("Zero variance");

  const sum4=values.reduce(
    (sum,value)=>{
      const d=value-m;
      return sum+Math.pow(d,4);
    },
    0
  );

  const s2=sum2/(n-1);

  return (
    n*(n+1)/
    ((n-1)*(n-2)*(n-3))
  )*(
    sum4/
    (s2*s2)
  )-
  (
    3*Math.pow(n-1,2)/
    ((n-2)*(n-3))
  );
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
  def("KURT",a=>kurt(flatNums(a)),1,255),
  def("SKEW",a=>skew(flatNums(a),false),1,255),
  def("SKEW.P",a=>skew(flatNums(a),true),1,255),
  def("VARA",a=>variance(flatA(a),true),1,255),
  def("VARPA",a=>variance(flatA(a),false),1,255),
  def("STDEVA",a=>Math.sqrt(variance(flatA(a),true)),1,255),
  def("STDEVPA",a=>Math.sqrt(variance(flatA(a),false)),1,255)
];