// Same tables and rules as the converter at https://simplyutils.com/tool/unit-converter

function finiteDecimal(input: string, label: string): number {
  const text = input.trim();
  if (!text || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
    throw new Error(`Enter a valid number for ${label}.`);
  }
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
  return value;
}

/** Up to 10 significant digits, like the website. */
function formatCalculatorNumber(value: number): string {
  return Number(value.toPrecision(10)).toString();
}
export type Category = "length" | "weight" | "temperature" | "volume" | "speed" | "area" | "data" | "time";

interface Unit {
  label: string;
  symbol: string;
  toBase: (v: number) => number;
  fromBase: (v: number) => number;
}

export const UNITS: Record<Category, { label: string; units: Unit[] }> = {
  length: {
    label: "Length",
    units: [
      { label: "Meter", symbol: "m", toBase: v => v, fromBase: v => v },
      { label: "Kilometer", symbol: "km", toBase: v => v * 1000, fromBase: v => v / 1000 },
      { label: "Mile", symbol: "mi", toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
      { label: "Foot", symbol: "ft", toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
      { label: "Inch", symbol: "in", toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
      { label: "Centimeter", symbol: "cm", toBase: v => v / 100, fromBase: v => v * 100 },
      { label: "Millimeter", symbol: "mm", toBase: v => v / 1000, fromBase: v => v * 1000 },
      { label: "Yard", symbol: "yd", toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
      { label: "Nautical Mile", symbol: "nmi", toBase: v => v * 1852, fromBase: v => v / 1852 },
    ],
  },
  weight: {
    label: "Weight",
    units: [
      { label: "Kilogram", symbol: "kg", toBase: v => v, fromBase: v => v },
      { label: "Gram", symbol: "g", toBase: v => v / 1000, fromBase: v => v * 1000 },
      { label: "Pound", symbol: "lb", toBase: v => v * 0.45359237, fromBase: v => v / 0.45359237 },
      { label: "Ounce", symbol: "oz", toBase: v => v * 0.028349523125, fromBase: v => v / 0.028349523125 },
      { label: "Metric Ton", symbol: "t", toBase: v => v * 1000, fromBase: v => v / 1000 },
      { label: "Milligram", symbol: "mg", toBase: v => v / 1e6, fromBase: v => v * 1e6 },
      { label: "Stone", symbol: "st", toBase: v => v * 6.35029318, fromBase: v => v / 6.35029318 },
    ],
  },
  temperature: {
    label: "Temperature",
    units: [
      { label: "Celsius", symbol: "°C", toBase: v => v, fromBase: v => v },
      { label: "Fahrenheit", symbol: "°F", toBase: v => (v - 32) * 5 / 9, fromBase: v => v * 9 / 5 + 32 },
      { label: "Kelvin", symbol: "K", toBase: v => v - 273.15, fromBase: v => v + 273.15 },
    ],
  },
  volume: {
    label: "Volume",
    units: [
      { label: "Liter", symbol: "L", toBase: v => v, fromBase: v => v },
      { label: "Milliliter", symbol: "mL", toBase: v => v / 1000, fromBase: v => v * 1000 },
      { label: "Gallon (US)", symbol: "gal", toBase: v => v * 3.785411784, fromBase: v => v / 3.785411784 },
      { label: "Fluid Ounce (US)", symbol: "fl oz", toBase: v => v * 0.0295735295625, fromBase: v => v / 0.0295735295625 },
      { label: "Cup (US customary)", symbol: "cup", toBase: v => v * 0.2365882365, fromBase: v => v / 0.2365882365 },
      { label: "Tablespoon (US)", symbol: "tbsp", toBase: v => v * 0.01478676478125, fromBase: v => v / 0.01478676478125 },
      { label: "Cubic Meter", symbol: "m³", toBase: v => v * 1000, fromBase: v => v / 1000 },
    ],
  },
  speed: {
    label: "Speed",
    units: [
      { label: "km/h", symbol: "km/h", toBase: v => v, fromBase: v => v },
      { label: "mph", symbol: "mph", toBase: v => v * 1.609344, fromBase: v => v / 1.609344 },
      { label: "m/s", symbol: "m/s", toBase: v => v * 3.6, fromBase: v => v / 3.6 },
      { label: "Knot", symbol: "kn", toBase: v => v * 1.852, fromBase: v => v / 1.852 },
      { label: "ft/s", symbol: "ft/s", toBase: v => v * 1.09728, fromBase: v => v / 1.09728 },
    ],
  },
  area: {
    label: "Area",
    units: [
      { label: "Square Meter", symbol: "m²", toBase: v => v, fromBase: v => v },
      { label: "Square Kilometer", symbol: "km²", toBase: v => v * 1e6, fromBase: v => v / 1e6 },
      { label: "Square Mile", symbol: "mi²", toBase: v => v * 2589988.110336, fromBase: v => v / 2589988.110336 },
      { label: "Square Foot", symbol: "ft²", toBase: v => v * 0.09290304, fromBase: v => v / 0.09290304 },
      { label: "Acre", symbol: "ac", toBase: v => v * 4046.8564224, fromBase: v => v / 4046.8564224 },
      { label: "Hectare", symbol: "ha", toBase: v => v * 10000, fromBase: v => v / 10000 },
    ],
  },
  data: {
    label: "Data",
    units: [
      { label: "Byte", symbol: "B", toBase: v => v, fromBase: v => v },
      { label: "Kilobyte", symbol: "KB", toBase: v => v * 1000, fromBase: v => v / 1000 },
      { label: "Megabyte", symbol: "MB", toBase: v => v * 1e6, fromBase: v => v / 1e6 },
      { label: "Gigabyte", symbol: "GB", toBase: v => v * 1e9, fromBase: v => v / 1e9 },
      { label: "Terabyte", symbol: "TB", toBase: v => v * 1e12, fromBase: v => v / 1e12 },
      { label: "Bit", symbol: "bit", toBase: v => v / 8, fromBase: v => v * 8 },
      { label: "Kibibyte", symbol: "KiB", toBase: v => v * 1024, fromBase: v => v / 1024 },
      { label: "Mebibyte", symbol: "MiB", toBase: v => v * 2 ** 20, fromBase: v => v / 2 ** 20 },
      { label: "Gibibyte", symbol: "GiB", toBase: v => v * 2 ** 30, fromBase: v => v / 2 ** 30 },
      { label: "Tebibyte", symbol: "TiB", toBase: v => v * 2 ** 40, fromBase: v => v / 2 ** 40 },
    ],
  },
  time: {
    label: "Time",
    units: [
      { label: "Second", symbol: "s", toBase: v => v, fromBase: v => v },
      { label: "Minute", symbol: "min", toBase: v => v * 60, fromBase: v => v / 60 },
      { label: "Hour", symbol: "h", toBase: v => v * 3600, fromBase: v => v / 3600 },
      { label: "Day", symbol: "d", toBase: v => v * 86400, fromBase: v => v / 86400 },
      { label: "Week", symbol: "wk", toBase: v => v * 604800, fromBase: v => v / 604800 },
      { label: "Month (1/12 of 365 days)", symbol: "mo", toBase: v => v * 2628000, fromBase: v => v / 2628000 },
      { label: "Year (365 days)", symbol: "yr", toBase: v => v * 31536000, fromBase: v => v / 31536000 },
      { label: "Millisecond", symbol: "ms", toBase: v => v / 1000, fromBase: v => v * 1000 },
    ],
  },
};

export function convertUnit(input: string, category: Category, from: string, to: string): string {
  const value = finiteDecimal(input, "the value");
  const units = UNITS[category]?.units;
  const source = units?.find(unit => unit.symbol === from), target = units?.find(unit => unit.symbol === to);
  if (!source || !target) throw new Error("Choose valid units from the same category.");
  let base = source.toBase(value);
  if (category === "temperature") {
    const minimum = from === "K" ? 0 : from === "\u00b0F" ? -459.67 : -273.15;
    if (value < minimum) throw new Error("Temperature must be at or above absolute zero (-273.15 Celsius / 0 Kelvin).");
    base = Math.max(-273.15,base);
  }
  const result = from === to ? value : target.fromBase(base);
  if (!Number.isFinite(result) || !Number.isFinite(base)) throw new Error("The conversion exceeds the numeric range. Use a smaller value.");
  return formatCalculatorNumber(result);
}
