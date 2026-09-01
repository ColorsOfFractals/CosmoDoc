import type { FunctionDefinition } from "../functions";

type Complex={
  re:number;
  im:number;
};

type ParsedComplex=Complex&{
  suffix:"i"|"j";
};

const H={
  num(x:unknown):number{
    if(typeof x==="number"&&Number.isFinite(x))
      return x;

    if(typeof x==="string"&&x.trim()!==""){
      const n=Number(x);
      if(Number.isFinite(n))
        return n;
    }

    throw new TypeError("Expected number");
  },

  flat(x:unknown):unknown[]{
    const out:unknown[]=[];

    const walk=(v:unknown):void=>{
      if(Array.isArray(v)){
        for(const q of v)walk(q);
      }else{
        out.push(v);
      }
    };

    walk(x);
    return out;
  },

  parse(x:unknown):ParsedComplex{
    if(typeof x==="number"&&Number.isFinite(x))
      return {re:x,im:0,suffix:"i"};

    if(typeof x!=="string")
      throw new TypeError("Expected complex number");

    let s=x.trim().replace(/\s+/g,"");

    if(s==="")
      throw new TypeError("Expected complex number");

    let suffix:"i"|"j"="i";

    const last=s.slice(-1).toLowerCase();

    if(last==="i"||last==="j"){
      suffix=last;
      s=s.slice(0,-1);

      if(s===""||s==="+")
        return {re:0,im:1,suffix};

      if(s==="-")
        return {re:0,im:-1,suffix};

      let split=-1;

      for(let i=1;i<s.length;i++){
        const c=s[i];

        if(
          (c==="+"||c==="-")&&
          s[i-1]!=="e"&&
          s[i-1]!=="E"
        ){
          split=i;
        }
      }

      if(split<0){
        const im=Number(s);

        if(!Number.isFinite(im))
          throw new TypeError("Invalid complex number");

        return {re:0,im,suffix};
      }

      const re=Number(s.slice(0,split));
      const tail=s.slice(split);

      const im=
        tail==="+"?1:
        tail==="-"?-1:
        Number(tail);

      if(!Number.isFinite(re)||!Number.isFinite(im))
        throw new TypeError("Invalid complex number");

      return {re,im,suffix};
    }

    const re=Number(s);

    if(!Number.isFinite(re))
      throw new TypeError("Invalid complex number");

    return {re,im:0,suffix};
  },

  clean(x:number):number{
    if(Math.abs(x)<1e-14)return 0;
    return x;
  },

  format(
    z:Complex,
    suffix:"i"|"j"="i"
  ):string{
    const re=this.clean(z.re);
    const im=this.clean(z.im);

    if(im===0)
      return String(re);

    if(re===0){
      if(im===1)return suffix;
      if(im===-1)return "-"+suffix;
      return String(im)+suffix;
    }

    const sign=im<0?"-":"+";
    const mag=Math.abs(im);

    return (
      String(re)+
      sign+
      (mag===1?"":String(mag))+
      suffix
    );
  },

  abs(z:Complex):number{
    return Math.hypot(z.re,z.im);
  },

  add(a:Complex,b:Complex):Complex{
    return {
      re:a.re+b.re,
      im:a.im+b.im
    };
  },

  sub(a:Complex,b:Complex):Complex{
    return {
      re:a.re-b.re,
      im:a.im-b.im
    };
  },

  mul(a:Complex,b:Complex):Complex{
    return {
      re:a.re*b.re-a.im*b.im,
      im:a.re*b.im+a.im*b.re
    };
  },

  div(a:Complex,b:Complex):Complex{
    const d=b.re*b.re+b.im*b.im;

    if(d===0)
      throw new RangeError("Complex division by zero");

    return {
      re:(a.re*b.re+a.im*b.im)/d,
      im:(a.im*b.re-a.re*b.im)/d
    };
  },

  log(z:Complex):Complex{
    const r=this.abs(z);

    if(r===0)
      throw new RangeError("Complex logarithm undefined at zero");

    return {
      re:Math.log(r),
      im:Math.atan2(z.im,z.re)
    };
  },

  powReal(z:Complex,p:number):Complex{
    const r=this.abs(z);

    if(r===0){
      if(p>0)return {re:0,im:0};
      throw new RangeError("Invalid zero complex power");
    }

    const theta=Math.atan2(z.im,z.re);
    const rp=Math.pow(r,p);
    const angle=theta*p;

    return {
      re:rp*Math.cos(angle),
      im:rp*Math.sin(angle)
    };
  },

  sin(z:Complex):Complex{
    return {
      re:Math.sin(z.re)*Math.cosh(z.im),
      im:Math.cos(z.re)*Math.sinh(z.im)
    };
  },

  cos(z:Complex):Complex{
    return {
      re:Math.cos(z.re)*Math.cosh(z.im),
      im:-Math.sin(z.re)*Math.sinh(z.im)
    };
  },

  sinh(z:Complex):Complex{
    return {
      re:Math.sinh(z.re)*Math.cos(z.im),
      im:Math.cosh(z.re)*Math.sin(z.im)
    };
  },

  cosh(z:Complex):Complex{
    return {
      re:Math.cosh(z.re)*Math.cos(z.im),
      im:Math.sinh(z.re)*Math.sin(z.im)
    };
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
  def("COMPLEX",a=>{
  const suffix=a.length>2?String(a[2]).toLowerCase():"i";
  if(suffix!=="i"&&suffix!=="j")
    throw new RangeError("COMPLEX suffix must be i or j");
  return H.format({
    re:H.num(a[0]),
    im:H.num(a[1])
  },suffix);
},2,3),
  def("IMREAL",a=>H.parse(a[0]).re,1,1),
  def("IMAGINARY",a=>H.parse(a[0]).im,1,1),
  def("IMABS",a=>H.abs(H.parse(a[0])),1,1),
  def("IMARGUMENT",a=>{
  const z=H.parse(a[0]);
  if(z.re===0&&z.im===0)
    throw new RangeError("IMARGUMENT undefined at zero");
  return Math.atan2(z.im,z.re);
},1,1),
  def("IMCONJUGATE",a=>{
  const z=H.parse(a[0]);
  return H.format({re:z.re,im:-z.im},z.suffix);
},1,1),
  def("IMSUM",a=>{
  const values=H.flat(a);
  let z={re:0,im:0};
  let suffix:"i"|"j"="i";
  for(const value of values){
    const q=H.parse(value);
    suffix=q.suffix;
    z=H.add(z,q);
  }
  return H.format(z,suffix);
},1,255),
  def("IMSUB",a=>{
  const x=H.parse(a[0]),y=H.parse(a[1]);
  return H.format(H.sub(x,y),x.suffix);
},2,2),
  def("IMPRODUCT",a=>{
  const values=H.flat(a);
  let z={re:1,im:0};
  let suffix:"i"|"j"="i";
  for(const value of values){
    const q=H.parse(value);
    suffix=q.suffix;
    z=H.mul(z,q);
  }
  return H.format(z,suffix);
},1,255),
  def("IMDIV",a=>{
  const x=H.parse(a[0]),y=H.parse(a[1]);
  return H.format(H.div(x,y),x.suffix);
},2,2),
  def("IMPOWER",a=>{
  const z=H.parse(a[0]);
  const p=H.num(a[1]);
  return H.format(H.powReal(z,p),z.suffix);
},2,2),
  def("IMSQRT",a=>{
  const z=H.parse(a[0]);
  return H.format(H.powReal(z,0.5),z.suffix);
},1,1),
  def("IMEXP",a=>{
  const z=H.parse(a[0]);
  const e=Math.exp(z.re);
  return H.format({
    re:e*Math.cos(z.im),
    im:e*Math.sin(z.im)
  },z.suffix);
},1,1),
  def("IMLN",a=>{
  const z=H.parse(a[0]);
  const q=H.log(z);
  return H.format(q,z.suffix);
},1,1),
  def("IMLOG10",a=>{
  const z=H.parse(a[0]);
  const q=H.log(z);
  const d=Math.log(10);
  return H.format({re:q.re/d,im:q.im/d},z.suffix);
},1,1),
  def("IMLOG2",a=>{
  const z=H.parse(a[0]);
  const q=H.log(z);
  const d=Math.log(2);
  return H.format({re:q.re/d,im:q.im/d},z.suffix);
},1,1),
  def("IMSIN",a=>{
  const z=H.parse(a[0]);
  return H.format({
    re:Math.sin(z.re)*Math.cosh(z.im),
    im:Math.cos(z.re)*Math.sinh(z.im)
  },z.suffix);
},1,1),
  def("IMCOS",a=>{
  const z=H.parse(a[0]);
  return H.format({
    re:Math.cos(z.re)*Math.cosh(z.im),
    im:-Math.sin(z.re)*Math.sinh(z.im)
  },z.suffix);
},1,1),
  def("IMTAN",a=>{
  const z=H.parse(a[0]);
  return H.format(H.div(H.sin(z),H.cos(z)),z.suffix);
},1,1),
  def("IMSINH",a=>{
  const z=H.parse(a[0]);
  return H.format({
    re:Math.sinh(z.re)*Math.cos(z.im),
    im:Math.cosh(z.re)*Math.sin(z.im)
  },z.suffix);
},1,1),
  def("IMCOSH",a=>{
  const z=H.parse(a[0]);
  return H.format({
    re:Math.cosh(z.re)*Math.cos(z.im),
    im:Math.sinh(z.re)*Math.sin(z.im)
  },z.suffix);
},1,1),
  def("IMTANH",a=>{
  const z=H.parse(a[0]);
  return H.format(H.div(H.sinh(z),H.cosh(z)),z.suffix);
},1,1),
  def("IMSEC",a=>{
  const z=H.parse(a[0]);
  return H.format(H.div({re:1,im:0},H.cos(z)),z.suffix);
},1,1),
  def("IMSECH",a=>{
  const z=H.parse(a[0]);
  return H.format(H.div({re:1,im:0},H.cosh(z)),z.suffix);
},1,1)
];