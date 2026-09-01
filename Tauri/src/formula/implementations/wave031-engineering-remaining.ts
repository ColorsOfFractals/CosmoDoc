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

  int(x:unknown):number{
    return Math.trunc(this.num(x));
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
    return Math.abs(x)<1e-14?0:x;
  },

  format(z:Complex,suffix:"i"|"j"="i"):string{
    const re=this.clean(z.re);
    const im=this.clean(z.im);

    if(im===0)return String(re);

    if(re===0){
      if(im===1)return suffix;
      if(im===-1)return "-"+suffix;
      return String(im)+suffix;
    }

    const sign=im<0?"-":"+";
    const mag=Math.abs(im);

    return String(re)+sign+
      (mag===1?"":String(mag))+suffix;
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
  },

  erf(x:number):number{
    const sign=x<0?-1:1;
    const a=Math.abs(x);
    const t=1/(1+0.3275911*a);

    const y=1-
      (((((1.061405429*t-1.453152027)*t)
      +1.421413741)*t-0.284496736)*t
      +0.254829592)*t*Math.exp(-a*a);

    return sign*y;
  },

  besselJ(x:number,n:number):number{
    if(n<0)
      throw new RangeError("Bessel order must be nonnegative");

    if(x===0)return n===0?1:0;

    const terms=80;
    let sum=0;

    for(let k=0;k<terms;k++){
      let factK=1;
      let factNK=1;

      for(let i=2;i<=k;i++)factK*=i;
      for(let i=2;i<=n+k;i++)factNK*=i;

      const term=
        (k%2===0?1:-1)*
        Math.pow(x/2,2*k+n)/
        (factK*factNK);

      sum+=term;

      if(Math.abs(term)<1e-15*Math.max(1,Math.abs(sum)))
        break;
    }

    return sum;
  },

  besselI(x:number,n:number):number{
    if(n<0)
      throw new RangeError("Bessel order must be nonnegative");

    const terms=80;
    let sum=0;

    for(let k=0;k<terms;k++){
      let factK=1;
      let factNK=1;

      for(let i=2;i<=k;i++)factK*=i;
      for(let i=2;i<=n+k;i++)factNK*=i;

      const term=
        Math.pow(x/2,2*k+n)/
        (factK*factNK);

      sum+=term;

      if(Math.abs(term)<1e-15*Math.max(1,Math.abs(sum)))
        break;
    }

    return sum;
  },

  besselY(x:number,n:number):number{
    if(x<=0||n<0)
      throw new RangeError("Invalid BESSELY arguments");

    const eps=1e-7;
    const v=n+eps;

    const jv=(order:number):number=>{
      let sum=0;

      for(let k=0;k<80;k++){
        let fact=1;
        for(let i=2;i<=k;i++)fact*=i;

        const gamma=this.gamma(k+order+1);

        const term=
          (k%2===0?1:-1)*
          Math.pow(x/2,2*k+order)/
          (fact*gamma);

        sum+=term;

        if(Math.abs(term)<1e-15*Math.max(1,Math.abs(sum)))
          break;
      }

      return sum;
    };

    return (
      Math.cos(Math.PI*v)*jv(v)-jv(-v)
    )/Math.sin(Math.PI*v);
  },

  besselK(x:number,n:number):number{
    if(x<=0||n<0)
      throw new RangeError("Invalid BESSELK arguments");

    const steps=600;
    const maxT=16;
    const h=maxT/steps;

    let sum=0;

    for(let i=0;i<=steps;i++){
      const t=i*h;
      const value=
        Math.exp(-x*Math.cosh(t))*
        Math.cosh(n*t);

      const weight=
        i===0||i===steps?1:
        i%2===0?2:4;

      sum+=weight*value;
    }

    return sum*h/3;
  },

  gamma(z:number):number{
    const p=[
      676.5203681218851,
      -1259.1392167224028,
      771.3234287776531,
      -176.6150291621406,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];

    if(z<0.5){
      return Math.PI/
        (Math.sin(Math.PI*z)*this.gamma(1-z));
    }

    z-=1;

    let x=0.99999999999980993;

    for(let i=0;i<p.length;i++)
      x+=p[i]/(z+i+1);

    const t=z+p.length-0.5;

    return Math.sqrt(2*Math.PI)*
      Math.pow(t,z+0.5)*
      Math.exp(-t)*x;
  },

  fromBase(
    input:string,
    base:number,
    signed:boolean
  ):number{
    let s=input.trim().toUpperCase();

    if(!s)
      throw new RangeError("Empty base number");

    const widths:Record<number,number>={
      2:10,
      8:10,
      16:10
    };

    const value=parseInt(s,base);

    if(!Number.isFinite(value))
      throw new RangeError("Invalid base number");

    if(signed&&s.length===widths[base]){
      const first=parseInt(s[0],base);
      const signThreshold=base/2;

      if(first>=signThreshold)
        return value-Math.pow(base,widths[base]);
    }

    return value;
  },

  toBase(
    value:number,
    base:number,
    places:number|undefined,
    bits:number
  ):string{
    const min=-Math.pow(2,bits-1);
    const max=Math.pow(2,bits-1)-1;

    if(value<min||value>max)
      throw new RangeError("Number outside conversion range");

    let s:string;

    if(value<0){
      const width=base===2?10:base===8?10:10;
      const encoded=Math.pow(base,width)+value;
      s=Math.trunc(encoded).toString(base).toUpperCase();
      s=s.padStart(width,"0");
    }else{
      s=Math.trunc(value).toString(base).toUpperCase();

      if(places!==undefined){
        if(places<1||s.length>places)
          throw new RangeError("Invalid places");

        s=s.padStart(places,"0");
      }
    }

    return s;
  },

  baseConvert(
    input:string,
    from:number,
    to:number,
    places:number|undefined,
    signed:boolean
  ):string{
    const value=this.fromBase(input,from,signed);

    const bits=
      to===2?10:
      to===8?30:
      40;

    return this.toBase(value,to,places,bits);
  },

  convert(
    value:number,
    fromRaw:string,
    toRaw:string
  ):number{
    const units:Record<
      string,
      {family:string;factor:number;offset?:number}
    >={
      m:{family:"length",factor:1},
      km:{family:"length",factor:1000},
      cm:{family:"length",factor:0.01},
      mm:{family:"length",factor:0.001},
      in:{family:"length",factor:0.0254},
      ft:{family:"length",factor:0.3048},
      yd:{family:"length",factor:0.9144},
      mi:{family:"length",factor:1609.344},

      g:{family:"mass",factor:1},
      kg:{family:"mass",factor:1000},
      lbm:{family:"mass",factor:453.59237},
      ozm:{family:"mass",factor:28.349523125},

      sec:{family:"time",factor:1},
      min:{family:"time",factor:60},
      hr:{family:"time",factor:3600},
      day:{family:"time",factor:86400},

      Pa:{family:"pressure",factor:1},
      atm:{family:"pressure",factor:101325},
      mmHg:{family:"pressure",factor:133.322387415},

      J:{family:"energy",factor:1},
      cal:{family:"energy",factor:4.184},
      Wh:{family:"energy",factor:3600},

      W:{family:"power",factor:1},
      HP:{family:"power",factor:745.6998715822702}
    };

    const from=units[fromRaw.trim()];
    const to=units[toRaw.trim()];

    if(!from||!to||from.family!==to.family)
      throw new RangeError("Incompatible CONVERT units");

    return value*from.factor/to.factor;
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
  def("IMCOT",a=>{
  const z=H.parse(a[0]);
  return H.format(H.div(H.cos(z),H.sin(z)),z.suffix);
},1,1),
  def("IMCSC",a=>{
  const z=H.parse(a[0]);
  return H.format(H.div({re:1,im:0},H.sin(z)),z.suffix);
},1,1),
  def("IMCSCH",a=>{
  const z=H.parse(a[0]);
  return H.format(H.div({re:1,im:0},H.sinh(z)),z.suffix);
},1,1),
  def("BESSELI",a=>H.besselI(H.num(a[0]),H.int(a[1])),2,2),
  def("BESSELJ",a=>H.besselJ(H.num(a[0]),H.int(a[1])),2,2),
  def("BESSELK",a=>H.besselK(H.num(a[0]),H.int(a[1])),2,2),
  def("BESSELY",a=>H.besselY(H.num(a[0]),H.int(a[1])),2,2),
  def("CONVERT",a=>
  H.convert(
    H.num(a[0]),
    String(a[1]),
    String(a[2])
  ),
3,3)
];