export function safeNormalizedDifference(a: number, b: number): number | null {
  const denominator = a + b;
  if (!Number.isFinite(a) || !Number.isFinite(b) || denominator === 0) return null;
  return (a - b) / denominator;
}

export const ndvi = (nir: number, red: number) => safeNormalizedDifference(nir, red);
export const ndmi = (nir: number, swir: number) => safeNormalizedDifference(nir, swir);
export const kelvinToCelsius = (kelvin: number) => Number((kelvin - 273.15).toFixed(2));
