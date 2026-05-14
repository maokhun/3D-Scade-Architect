const POSITIVE_KEYS = [
  'size',
  'radius',
  'height',
  'width',
  'length',
  'radiusStart',
  'radiusEnd',
  'innerRadius',
  'outerRadius',
  'roundRadius',
  'thickness',
  'depth',
  'diameter'
];

function sanitizeOptions(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeOptions(item));

  const newObj = { ...obj };
  for (const key in newObj) {
    const val = newObj[key];
    if (typeof val === 'number') {
      if (POSITIVE_KEYS.includes(key)) {
        newObj[key] = Math.max(0.001, val);
      } else if (key === 'segments' || key === 'facets' || key === 'resolution') {
        newObj[key] = Math.max(3, val);
      }
    } else if (Array.isArray(val) && POSITIVE_KEYS.includes(key)) {
      newObj[key] = val.map(v => typeof v === 'number' ? Math.max(0.001, v) : v);
    } else if (typeof val === 'object') {
      newObj[key] = sanitizeOptions(val);
    }
  }

  if ('roundRadius' in newObj && typeof newObj.roundRadius === 'number') {
    let maxAllowed = Infinity;
    if ('size' in newObj) {
      if (typeof newObj.size === 'number') {
        maxAllowed = Math.min(maxAllowed, newObj.size / 2);
      } else if (Array.isArray(newObj.size)) {
        maxAllowed = Math.min(maxAllowed, ...newObj.size.map(s => typeof s === 'number' ? s / 2 : Infinity));
      }
    }
    if ('radius' in newObj) {
      if (typeof newObj.radius === 'number') {
        maxAllowed = Math.min(maxAllowed, newObj.radius);
      } else if (Array.isArray(newObj.radius)) {
        maxAllowed = Math.min(maxAllowed, ...newObj.radius.map(r => typeof r === 'number' ? r : Infinity));
      }
    }

    if (newObj.roundRadius >= maxAllowed && maxAllowed !== Infinity) {
      newObj.roundRadius = Math.max(0.001, maxAllowed * 0.95);
    }
  }

  return newObj;
}

function wrapSubObject(subObj: any): any {
  if (!subObj || typeof subObj !== 'object') return subObj;

  const wrapped: any = {};
  Object.keys(subObj).forEach(key => {
    const original = subObj[key];
    if (typeof original === 'function') {
      wrapped[key] = (...args: any[]) => {
        try {
          const sanitizedArgs = args.map(arg => sanitizeOptions(arg));
          return original(...sanitizedArgs);
        } catch (e) {
          console.warn(`JSCAD Error in ${key}:`, e);
          if ((key === 'union' || key === 'subtract' || key === 'intersect') && args[0]) return args[0];
          throw e;
        }
      };
    } else if (typeof original === 'object' && original !== null) {
      wrapped[key] = wrapSubObject(original);
    } else {
      wrapped[key] = original;
    }
  });
  return wrapped;
}

export function executeJscad(
  jscadCode: string,
  modelParams: Record<string, any>,
  modeling: any
) {
  const wrappedModeling = wrapSubObject(modeling);
  const normalizedCode = jscadCode
    .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '')
    .replace(/\bmodule\.exports\s*=\s*\{\s*main\s*\};?/g, 'exports.main = main;')
    .replace(/\bexport\s+default\s+/g, 'var defaultExport = ')
    .replace(/\bexport\s+(const|let|var)\s+/g, 'var ')
    .replace(/\bexport\s+function\s+/g, 'function ')
    .replace(/\bexport\s+class\s+/g, 'class ')
    .replace(/\bexport\s+\{[\s\S]*?\};?/g, '')
    .replace(/\bconst\b/g, 'var')
    .replace(/\blet\b/g, 'var');

  const script = `
    var require = (pkg) => pkg === '@jscad/modeling' ? modeling : {};
    var module = { exports: {} };
    var exports = module.exports;
    var { primitives, extrusions, transforms, booleans, colors, expansions, geometries, hulls, measurements, mathematics, utils } = modeling;

    ${normalizedCode}

    var finalMain = typeof main !== 'undefined' ? main : (typeof defaultExport !== 'undefined' ? defaultExport : (typeof exports.main !== 'undefined' ? exports.main : (typeof module.exports === 'function' ? module.exports : (typeof module.exports.main !== 'undefined' ? module.exports.main : (typeof exports.default !== 'undefined' ? exports.default : null)))));
    if (typeof finalMain !== 'function') throw new Error('JSCAD main function not found');
    return finalMain.length >= 2 ? finalMain(modeling, modelParams) : finalMain(modelParams);
  `;

  const mainFunc = new Function('modeling', 'modelParams', script);
  return mainFunc(wrappedModeling, modelParams);
}
