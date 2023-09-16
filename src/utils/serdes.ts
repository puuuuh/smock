import { ethers } from 'ethers';

const proto = Object.prototype;
const gpo = Object.getPrototypeOf;

/**
 * Convert structs into Plain Old Javascript Objects in a recursive manner
 *
 * @param struct Struct to convert
 * @returns Struct as POJO
 */
export function convertStructToPojo(struct: any): any {
  try {
    let t = struct.toObject();

    let keys = Object.keys(t);
    for (const i in keys) {
      let key = keys[i];
      let value = t[key];
      if (isSolidityStruct(value)) {
        t[key] = convertStructToPojo(value);
      }
    }
    return t;
  } catch (e) {}
  try {
    return struct.toArray().map((v: any) => {
      if (isSolidityStruct(v)) {
        return convertStructToPojo(v);
      }
      return v;
    });
  } catch (e) {}

  return struct;
}

export function convertPojoToStruct(value: Record<string, unknown>, fnFragment: ethers.FunctionFragment): unknown[] {
  const parsedValue = {
    [fnFragment.name]: value,
  };
  const parsedFnFragment: Partial<ethers.ParamType> = {
    name: fnFragment.name,
    components: fnFragment.outputs!,
  };

  return convertPojoToStructRecursive(parsedValue, [parsedFnFragment])[0];
}

export function convertPojoToStructRecursive(value: any, fnFragments: readonly Partial<ethers.ParamType>[]): unknown[][] {
  let res: unknown[][] = [];

  fnFragments.forEach((item) => {
    if (item.components) {
      res.push(convertPojoToStructRecursive(value[item.name!], item.components));
    } else {
      res.push(value[item.name!]);
    }
  });

  return res;
}

/**
 * Detect if an object is an struct or not
 * Solidity converts objects into structs by turning them into "object array"
 * For example: { hello: true }
 * Will look like: [true, hello: true], you might say: an array with properties in it?! yes, exactly that
 *
 * If you look at the length of the array, it will give you 1, but looking at the keys will return:
 * [true, 'hello']
 * So if the length of the keys is larger than the length of the object, we might asume it is a Struct
 *
 * @param obj Object to evaluate
 * @returns Whether or not the object is a struct
 */
export function isSolidityStruct(obj: unknown): boolean {
  let result = gpo(obj);
  return result.hasOwnProperty('toObject') && result.hasOwnProperty('toArray');
}
