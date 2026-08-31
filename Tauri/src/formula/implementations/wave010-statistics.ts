import type { FunctionDefinition } from "../functions";

const flat = (a: unknown[]): unknown[] =>
  a.flatMap(x => Array.isArray(x) ? flat(x) : [x]);

const nums = (a: unknown[]): number[] =>
  flat(a).map(x => {
    if (typeof x !== "number" || !Number.isFinite(x))
      throw new TypeError("Expected number");
    return x;
  });

const mean = (a: number[]): number => {
  if (!a.length) throw new RangeError("No values");
  return a.reduce((x, y) => x + y, 0) / a.length;
};

const vp = (a: number[]): number => {
  const m = mean(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length;
};

const vs = (a: number[]): number => {
  if (a.length < 2) throw new RangeError("Too few values");
  const m = mean(a);
  return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1);
};

const sort = (a: number[]): number[] =>
  [...a].sort((x, y) => x - y);

const pct = (a: number[], k: number): number => {
  if (k < 0 || k > 1) throw new RangeError("Invalid percentile");
  const v = sort(a);
  if (!v.length) throw new RangeError("No values");
  const p = (v.length - 1) * k;
  const lo = Math.floor(p);
  const hi = Math.ceil(p);
  return v[lo] + (v[hi] - v[lo]) * (p - lo);
};

const def = (
  name: string,
  fn: (a: unknown[]) => unknown,
  minArgs = 1,
  maxArgs = 255
): FunctionDefinition => ({
  name,
  minArgs,
  maxArgs,
  evaluate: fn
});

export const definitions: FunctionDefinition[] = [

  def("COUNT", a =>
    flat(a).filter(x => typeof x === "number" && Number.isFinite(x)).length
  ),

  def("COUNTA", a =>
    flat(a).filter(x => x !== null && x !== undefined && x !== "").length
  ),

  def("DEVSQ", a => {
    const v = nums(a);
    const m = mean(v);
    return v.reduce((s, x) => s + (x - m) ** 2, 0);
  }),

  def("GEOMEAN", a => {
    const v = nums(a);
    if (!v.length || v.some(x => x <= 0))
      throw new RangeError("Invalid values");
    return Math.exp(v.reduce((s, x) => s + Math.log(x), 0) / v.length);
  }),

  def("HARMEAN", a => {
    const v = nums(a);
    if (!v.length || v.some(x => x <= 0))
      throw new RangeError("Invalid values");
    return v.length / v.reduce((s, x) => s + 1 / x, 0);
  }),

  def("STDEV.P", a => Math.sqrt(vp(nums(a)))),

  def("STDEV.S", a => Math.sqrt(vs(nums(a)))),

  def("VAR.P", a => vp(nums(a))),

  def("VAR.S", a => vs(nums(a))),

  def("STANDARDIZE", a => {
    const x = nums([a[0]])[0];
    const m = nums([a[1]])[0];
    const sd = nums([a[2]])[0];
    if (sd <= 0) throw new RangeError("Invalid standard deviation");
    return (x - m) / sd;
  }, 3, 3),

  def("PEARSON", a => {
    const x = nums([a[0]]);
    const y = nums([a[1]]);
    if (x.length !== y.length || x.length < 2)
      throw new RangeError("Invalid arrays");

    const mx = mean(x);
    const my = mean(y);

    const top = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0);
    const bx = Math.sqrt(x.reduce((s, v) => s + (v - mx) ** 2, 0));
    const by = Math.sqrt(y.reduce((s, v) => s + (v - my) ** 2, 0));

    if (!bx || !by) throw new RangeError("Zero variance");
    return top / (bx * by);
  }, 2, 2),

  def("RSQ", a => {
    const x = nums([a[0]]);
    const y = nums([a[1]]);
    if (x.length !== y.length || x.length < 2)
      throw new RangeError("Invalid arrays");

    const mx = mean(x);
    const my = mean(y);

    const top = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0);
    const bx = Math.sqrt(x.reduce((s, v) => s + (v - mx) ** 2, 0));
    const by = Math.sqrt(y.reduce((s, v) => s + (v - my) ** 2, 0));

    if (!bx || !by) throw new RangeError("Zero variance");
    const r = top / (bx * by);
    return r * r;
  }, 2, 2),

  def("SLOPE", a => {
    const y = nums([a[0]]);
    const x = nums([a[1]]);
    if (x.length !== y.length || x.length < 2)
      throw new RangeError("Invalid arrays");

    const mx = mean(x);
    const my = mean(y);

    const den = x.reduce((s, v) => s + (v - mx) ** 2, 0);
    if (!den) throw new RangeError("Zero variance");

    return x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0) / den;
  }, 2, 2),

  def("INTERCEPT", a => {
    const y = nums([a[0]]);
    const x = nums([a[1]]);
    if (x.length !== y.length || x.length < 2)
      throw new RangeError("Invalid arrays");

    const mx = mean(x);
    const my = mean(y);

    const den = x.reduce((s, v) => s + (v - mx) ** 2, 0);
    if (!den) throw new RangeError("Zero variance");

    const slope =
      x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0) / den;

    return my - slope * mx;
  }, 2, 2),

  def("PERCENTILE.INC", a =>
    pct(nums([a[0]]), nums([a[1]])[0])
  , 2, 2),

  def("QUARTILE.INC", a => {
    const q = nums([a[1]])[0];
    if (![0,1,2,3,4].includes(q))
      throw new RangeError("Invalid quartile");
    return pct(nums([a[0]]), q / 4);
  }, 2, 2),

  def("SMALL", a => {
    const v = sort(nums([a[0]]));
    const k = Math.trunc(nums([a[1]])[0]);
    if (k < 1 || k > v.length)
      throw new RangeError("Invalid rank");
    return v[k - 1];
  }, 2, 2),

  def("TRIMMEAN", a => {
    const v = sort(nums([a[0]]));
    const p = nums([a[1]])[0];

    if (p < 0 || p >= 1)
      throw new RangeError("Invalid percentage");

    const totalRemove = Math.floor(v.length * p);
    const evenRemove = totalRemove - (totalRemove % 2);
    const cut = evenRemove / 2;
    const kept = v.slice(cut, v.length - cut);

    return mean(kept);
  }, 2, 2),

  def("COVARIANCE.P", a => {
    const x = nums([a[0]]);
    const y = nums([a[1]]);

    if (x.length !== y.length || !x.length)
      throw new RangeError("Invalid arrays");

    const mx = mean(x);
    const my = mean(y);

    return x.reduce(
      (s, v, i) => s + (v - mx) * (y[i] - my),
      0
    ) / x.length;
  }, 2, 2),

  def("COVARIANCE.S", a => {
    const x = nums([a[0]]);
    const y = nums([a[1]]);

    if (x.length !== y.length || x.length < 2)
      throw new RangeError("Invalid arrays");

    const mx = mean(x);
    const my = mean(y);

    return x.reduce(
      (s, v, i) => s + (v - mx) * (y[i] - my),
      0
    ) / (x.length - 1);
  }, 2, 2)

];