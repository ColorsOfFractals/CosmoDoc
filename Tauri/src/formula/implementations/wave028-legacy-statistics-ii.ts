import type { FunctionDefinition } from "../functions";

const H={
  num(x:unknown):number{
    if(typeof x==="number"&&Number.isFinite(x))return x;
    if(typeof x==="string"&&x.trim()!==""){
      const n=Number(x);
      if(Number.isFinite(n))return n;
    }
    throw new TypeError("Expected number");
  },

  flat(x:unknown):number[]{
    const out:number[]=[];
    const walk=(v:unknown):void=>{
      if(Array.isArray(v)){
        for(const q of v)walk(q);
        return;
      }
      if(typeof v==="number"&&Number.isFinite(v)){
        out.push(v);
        return;
      }
      if(typeof v==="string"&&v.trim()!==""){
        const n=Number(v);
        if(Number.isFinite(n))out.push(n);
      }
    };
    walk(x);
    return out;
  },

  mean(v:number[]):number{
    if(!v.length)throw new RangeError("No numeric values");
    return v.reduce((s,x)=>s+x,0)/v.length;
  },

  variance(v:number[],sample:boolean):number{
    if(!v.length||sample&&v.length<2)
      throw new RangeError("Insufficient values");
    const m=this.mean(v);
    let s=0;
    for(const x of v)s+=(x-m)*(x-m);
    return s/(v.length-(sample?1:0));
  },

  mode(v:number[]):number{
    if(!v.length)throw new RangeError("No numeric values");
    const counts=new Map<number,number>();
    let best=v[0],bestCount=1;
    for(const x of v){
      const c=(counts.get(x)??0)+1;
      counts.set(x,c);
      if(c>bestCount){
        best=x;
        bestCount=c;
      }
    }
    if(bestCount<2)throw new RangeError("No mode");
    return best;
  },

  erf(x:number):number{
    const sign=x<0?-1:1;
    const a=Math.abs(x);
    const t=1/(1+0.3275911*a);
    const y=1-
      (((((1.061405429*t-1.453152027)*t+1.421413741)*t-
      0.284496736)*t+0.254829592)*t)*Math.exp(-a*a);
    return sign*y;
  },

  normalInv(p:number):number{
    if(p<=0||p>=1)throw new RangeError("Probability out of range");

    const a=[
      -39.69683028665376,220.9460984245205,-275.9285104469687,
      138.357751867269,-30.66479806614716,2.506628277459239
    ];
    const b=[
      -54.47609879822406,161.5858368580409,-155.6989798598866,
      66.80131188771972,-13.28068155288572
    ];
    const c=[
      -0.007784894002430293,-0.3223964580411365,
      -2.400758277161838,-2.549732539343734,
      4.374664141464968,2.938163982698783
    ];
    const d=[
      0.007784695709041462,0.3224671290700398,
      2.445134137142996,3.754408661907416
    ];

    const horner=(q:number[],x:number):number=>{
      let r=0;
      for(const n of q)r=r*x+n;
      return r;
    };

    const lo=0.02425;

    if(p<lo){
      const q=Math.sqrt(-2*Math.log(p));
      return horner(c,q)/(horner(d,q)*q+1);
    }

    if(p>1-lo){
      const q=Math.sqrt(-2*Math.log(1-p));
      return -horner(c,q)/(horner(d,q)*q+1);
    }

    const q=p-0.5,r=q*q;
    return horner(a,r)*q/(horner(b,r)*r+1);
  },

  logGamma(z:number):number{
    const p=[
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];

    if(z<0.5)
      return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-this.logGamma(1-z);

    z-=1;
    let x=p[0];

    for(let i=1;i<p.length;i++)x+=p[i]/(z+i);

    const t=z+7.5;

    return 0.5*Math.log(2*Math.PI)+(z+0.5)*Math.log(t)-t+Math.log(x);
  },

  gammaP(a:number,x:number):number{
    if(a<=0||x<0)throw new RangeError("Invalid gamma arguments");
    if(x===0)return 0;

    const eps=1e-14;
    const gln=this.logGamma(a);

    if(x<a+1){
      let ap=a,sum=1/a,del=sum;

      for(let n=1;n<=200;n++){
        ap++;
        del*=x/ap;
        sum+=del;
        if(Math.abs(del)<Math.abs(sum)*eps)break;
      }

      return Math.max(0,Math.min(1,
        sum*Math.exp(-x+a*Math.log(x)-gln)
      ));
    }

    let b=x+1-a,c=1e300,d=1/b,h=d;

    for(let i=1;i<=200;i++){
      const an=-i*(i-a);
      b+=2;
      d=an*d+b;
      if(Math.abs(d)<1e-300)d=1e-300;
      c=b+an/c;
      if(Math.abs(c)<1e-300)c=1e-300;
      d=1/d;
      const del=d*c;
      h*=del;
      if(Math.abs(del-1)<eps)break;
    }

    return Math.max(0,Math.min(1,
      1-Math.exp(-x+a*Math.log(x)-gln)*h
    ));
  },

  betaFraction(a:number,b:number,x:number):number{
    const eps=3e-14,tiny=1e-300;
    const qab=a+b,qap=a+1,qam=a-1;
    let c=1,d=1-qab*x/qap;

    if(Math.abs(d)<tiny)d=tiny;
    d=1/d;

    let h=d;

    for(let m=1;m<=200;m++){
      const m2=2*m;

      let aa=m*(b-m)*x/((qam+m2)*(a+m2));

      d=1+aa*d;
      if(Math.abs(d)<tiny)d=tiny;

      c=1+aa/c;
      if(Math.abs(c)<tiny)c=tiny;

      d=1/d;
      h*=d*c;

      aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));

      d=1+aa*d;
      if(Math.abs(d)<tiny)d=tiny;

      c=1+aa/c;
      if(Math.abs(c)<tiny)c=tiny;

      d=1/d;

      const del=d*c;
      h*=del;

      if(Math.abs(del-1)<eps)break;
    }

    return h;
  },

  betaI(x:number,a:number,b:number):number{
    if(x<=0)return 0;
    if(x>=1)return 1;

    const bt=Math.exp(
      this.logGamma(a+b)-this.logGamma(a)-this.logGamma(b)+
      a*Math.log(x)+b*Math.log(1-x)
    );

    if(x<(a+1)/(a+b+2))
      return bt*this.betaFraction(a,b,x)/a;

    return 1-bt*this.betaFraction(b,a,1-x)/b;
  },

  betaDist(x:number,a:number,b:number,lo:number,hi:number):number{
    if(a<=0||b<=0||hi<=lo||x<lo||x>hi)
      throw new RangeError("Invalid beta arguments");
    return this.betaI((x-lo)/(hi-lo),a,b);
  },

  betaInv(p:number,a:number,b:number,lo:number,hi:number):number{
    if(p<=0||p>=1||a<=0||b<=0||hi<=lo)
      throw new RangeError("Invalid beta inverse arguments");

    let l=0,h=1;

    for(let i=0;i<160;i++){
      const m=(l+h)/2;
      if(this.betaI(m,a,b)<p)l=m;
      else h=m;
    }

    return lo+(hi-lo)*(l+h)/2;
  },

  fCdf(x:number,d1:number,d2:number):number{
    if(x<=0)return 0;
    if(d1<=0||d2<=0)throw new RangeError("Invalid degrees of freedom");

    return this.betaI(
      d1*x/(d1*x+d2),
      d1/2,
      d2/2
    );
  },

  tCdf(x:number,df:number):number{
    if(df<=0)throw new RangeError("Invalid degrees of freedom");
    if(x===0)return 0.5;

    const z=df/(df+x*x);
    const ib=this.betaI(z,df/2,0.5);

    return x>0?1-0.5*ib:0.5*ib;
  },

  invert(fn:(x:number)=>number,target:number,initial=1):number{
    let lo=0,hi=Math.max(initial,1e-12);

    while(fn(hi)<target){
      hi*=2;
      if(hi>1e14)throw new RangeError("Unable to bracket inverse");
    }

    for(let i=0;i<160;i++){
      const mid=(lo+hi)/2;
      if(fn(mid)<target)lo=mid;
      else hi=mid;
    }

    return (lo+hi)/2;
  },

  tInv(p:number,df:number):number{
    if(p<=0||p>=1||df<=0)
      throw new RangeError("Invalid T inverse arguments");

    if(p===0.5)return 0;
    if(p<0.5)return -this.tInv(1-p,df);

    return this.invert(x=>this.tCdf(x,df),p,1);
  },

  forecast(x:number,ys:number[],xs:number[]):number{
    if(!ys.length||ys.length!==xs.length)
      throw new RangeError("FORECAST arrays must have equal length");

    const mx=this.mean(xs);
    const my=this.mean(ys);

    let num=0,den=0;

    for(let i=0;i<xs.length;i++){
      num+=(xs[i]-mx)*(ys[i]-my);
      den+=(xs[i]-mx)*(xs[i]-mx);
    }

    if(den===0)throw new RangeError("Zero X variance");

    const slope=num/den;
    return my+slope*(x-mx);
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
  def("BETADIST",a=>H.betaDist(H.num(a[0]),H.num(a[1]),H.num(a[2]),a.length>3?H.num(a[3]):0,a.length>4?H.num(a[4]):1),3,5),
  def("BETAINV",a=>H.betaInv(H.num(a[0]),H.num(a[1]),H.num(a[2]),a.length>3?H.num(a[3]):0,a.length>4?H.num(a[4]):1),3,5),
  def("CHIDIST",a=>1-H.gammaP(H.num(a[1])/2,H.num(a[0])/2),2,2),
  def("CHIINV",a=>2*H.invert(x=>H.gammaP(H.num(a[1])/2,x),1-H.num(a[0]),Math.max(1,H.num(a[1])/2)),2,2),
  def("FDIST",a=>1-H.fCdf(H.num(a[0]),H.num(a[1]),H.num(a[2])),3,3),
  def("FINV",a=>H.invert(x=>H.fCdf(x,H.num(a[1]),H.num(a[2])),1-H.num(a[0]),1),3,3),
  def("TDIST",a=>{const x=Math.abs(H.num(a[0])),df=H.num(a[1]),tails=Math.trunc(H.num(a[2]));const rt=1-H.tCdf(x,df);return tails===1?rt:2*rt;},3,3),
  def("TINV",a=>H.tInv(1-H.num(a[0])/2,H.num(a[1])),2,2),
  def("FORECAST",a=>H.forecast(H.num(a[0]),H.flat(a[1]),H.flat(a[2])),3,3),
  def("GAMMALN.PRECISE",a=>H.logGamma(H.num(a[0])),1,1),
  def("ERF.PRECISE",a=>H.erf(H.num(a[0])),1,1),
  def("ERFC.PRECISE",a=>1-H.erf(H.num(a[0])),1,1),
  def("MODE.SNGL",a=>H.mode(H.flat(a)),1,255)
];