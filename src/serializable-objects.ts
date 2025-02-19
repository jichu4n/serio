import {
  DeserializeOptions,
  Serializable,
  SerializeOptions,
} from './serializable';
import {SArray, SArrayError} from './serializable-arrays';
import {
  getFieldOrWrapper,
  getFieldSpecMap,
  getFieldSpecs,
  getJsonFieldSettings,
  registerField,
  registerFieldJsonSetting,
} from './serializable-objects-internal';
import {SerializableWrapper} from './serializable-wrapper';
import {canAssignJSON, toJSON} from './utils';

/** Serializable record where fields are defined via `@field()`. */
export class SObject extends Serializable {
  deserialize(buffer: Buffer, opts?: DeserializeOptions): number {
    const array = toSArray(this);
    const readOffset = wrapSArrayErrorAsSObjectError(this, () =>
      array.deserialize(buffer, opts)
    );
    const fieldSpecs = getFieldSpecs(this);
    for (let i = 0; i < fieldSpecs.length; ++i) {
      const {propertyKey, wrapperType} = fieldSpecs[i];
      if (wrapperType) {
        (this as Record<string | symbol, unknown>)[propertyKey] = (
          array.value[i] as SerializableWrapper<unknown>
        ).value;
      }
    }
    return readOffset;
  }

  serialize(opts?: SerializeOptions): Buffer {
    return wrapSArrayErrorAsSObjectError(this, () =>
      toSArray(this).serialize(opts)
    );
  }

  getSerializedLength(opts?: SerializeOptions): number {
    return wrapSArrayErrorAsSObjectError(this, () =>
      toSArray(this).getSerializedLength(opts)
    );
  }

  toJSON(): object {
    const jsonFieldSettings = getJsonFieldSettings(this);
    const serializableFields = this.toSerializableMap();
    const result = Object.fromEntries(
      Object.entries(this)
        .filter(([propertyKey]) => !jsonFieldSettings.excluded.has(propertyKey))
        .map(([propertyKey, value]) => {
          try {
            return [
              propertyKey,
              toJSON(
                propertyKey in serializableFields
                  ? serializableFields[propertyKey]
                  : value
              ),
            ];
          } catch (e) {
            throw new SObjectError(propertyKey, e);
          }
        })
    );
    Object.assign(
      result,
      Object.fromEntries(
        Array.from(jsonFieldSettings.included)
          .filter((propertyKey) => !(propertyKey in result))
          .map((propertyKey) => [
            propertyKey,
            toJSON((this as Record<string | symbol, unknown>)[propertyKey]),
          ])
      )
    );
    return result;
  }

  /** Create a new instance with the provided initial properties. */
  static with<T extends SObject>(this: new () => T, props: Partial<T> = {}): T {
    const instance = new this();
    Object.assign(instance, props);
    return instance;
  }

  /** Similar to with(), but uses assignJSON() instead of Object.assign(). */
  static withJSON<T extends SObject>(
    this: new () => T,
    json: {[key: string | symbol]: unknown}
  ): T {
    const instance = new this();
    instance.assignJSON(json);
    return instance;
  }

  /** Map values of this object to Serializable.
   *
   * Fields defined with `@field()` are preserved as-is, and field defined with
   * `@field(wrapper)` are wrapped in their respective wrapper types.
   */
  toSerializableMap(): {[propertyKey: string]: Serializable} {
    return Object.fromEntries(
      getFieldSpecs(this).map((fieldSpec) => [
        fieldSpec.propertyKey,
        getFieldOrWrapper(this, fieldSpec),
      ])
    );
  }

  /** Assign properties to this object from a JSON object.
   *
   * Conceptually equivalent to Object.assign(), but recursively hydrates
   * SObjects / SArrays / SerializableWrappers etc and invokes their
   * assignJSON() to process JSON values. For example:
   * ```
   * class A extends SObject {
   *   @field(SUInt8) prop1: number;
   * }
   * class B extends SObject {
   *   @field() a = new A();
   * }
   * const b1 = new B();
   * b1.assignJSON({a: {prop1: 300}});
   * ```
   */
  assignJSON(jsonObject: {[key: string | symbol]: unknown}) {
    if (!jsonObject || jsonObject.constructor !== Object) {
      throw new Error(
        `Expected plain object in SObject.assignJSON(), got ${typeof jsonObject}`
      );
    }
    const fieldSpecs = getFieldSpecMap(this);
    for (const [propertyKey, jsonValue] of Object.entries(jsonObject)) {
      const wrapperType = fieldSpecs[propertyKey]?.wrapperType;
      if (wrapperType) {
        const wrapper = new wrapperType();
        wrapper.value = (this as Record<string | symbol, unknown>)[propertyKey];
        if (!canAssignJSON(wrapper)) {
          // SerializableWrapper classes should always implement assignJSON.
          throw new SObjectError(
            propertyKey,
            new Error(
              // @ts-expect-error `wrapper` has type `never` here.
              `Field wrapper class ${wrapper.constructor.name} does not support assignJSON`
            )
          );
        }
        wrapper.assignJSON(jsonValue);
        (this as Record<string | symbol, unknown>)[propertyKey] = wrapper.value;
      } else {
        const currentValue = (this as Record<string | symbol, unknown>)[
          propertyKey
        ];
        if (canAssignJSON(currentValue)) {
          currentValue.assignJSON(jsonValue);
        } else {
          (this as Record<string | symbol, unknown>)[propertyKey] = jsonValue;
        }
      }
    }
  }

  /** Assign properties to this object from a map of Serializables.
   *
   * Conceptually equivalent to Object.assign(), but automatically unwraps
   * wrapped properties. Fields defined with `@field()` are directly assigned,
   * and fields defined with `@field(wrapper)` are assigned by unwrapping the
   * corresponding SerializableWrapper. Unknown fields are considered an error.
   */
  assignSerializableMap(serializableMap: {
    [propertyKey: string | symbol]: Serializable;
  }) {
    const fieldSpecMap = getFieldSpecMap(this);
    for (const [propertyKey, serializableValue] of Object.entries(
      serializableMap
    )) {
      const fieldSpec = fieldSpecMap[propertyKey];
      if (!fieldSpec) {
        throw new SObjectError(
          propertyKey,
          new Error(`Unknown property ${propertyKey}`)
        );
      }
      if (fieldSpec.wrapperType) {
        if (!(serializableValue instanceof SerializableWrapper)) {
          throw new SObjectError(
            propertyKey.toString(),
            new Error(
              `Expected SerializableWrapper in assignment, ` +
                `got ${typeof serializableValue}`
            )
          );
        }
        (this as Record<string | symbol, unknown>)[propertyKey] =
          serializableValue.value;
      } else {
        (this as Record<string | symbol, unknown>)[propertyKey] =
          serializableValue;
      }
    }
  }
}

/** Converts this object to an SArray of serializable field values. */
function toSArray(targetInstance: SObject): SArray<Serializable> {
  return SArray.of(
    getFieldSpecs(targetInstance).map((fieldSpec) =>
      getFieldOrWrapper(targetInstance, fieldSpec)
    )
  );
}

function wrapSArrayErrorAsSObjectError<ResultT>(
  targetInstance: SObject,
  fn: () => ResultT
): ResultT {
  try {
    return fn();
  } catch (e) {
    if (e instanceof SArrayError) {
      const propertyKey =
        getFieldSpecs(targetInstance)[e.index].propertyKey.toString();
      const cause = e.cause;
      const e2 = new SObjectError(propertyKey, cause);
      throw e2;
    } else {
      throw e;
    }
  }
}

/** Error augmented by SObject with property information. */
export class SObjectError extends Error {
  constructor(propertyKey: string, rawCause: unknown) {
    const cause =
      rawCause instanceof Error ? rawCause : new Error(String(rawCause));
    super(`Error in field ${propertyKey}: ${cause.message}`);
    Object.setPrototypeOf(this, SObjectError.prototype);
    this.cause = cause;
    this.propertyKey = propertyKey;
    this.stack = cause.stack;
  }
  /** The original error. */
  cause: Error;
  /** The property that raised the error. */
  propertyKey: string;
}

type SerializableFieldDecorator<ValueT> = {
  (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    value: Function,
    context: ClassGetterDecoratorContext | ClassSetterDecoratorContext
  ): void;
  (
    value: undefined,
    context: ClassFieldDecoratorContext
  ): (initialValue: ValueT) => ValueT;
};

/** Decorator for Serializable fields of an SObject. */
export function field<WrappedValueT, ValueT extends WrappedValueT>(
  wrapperType?: new () => SerializableWrapper<WrappedValueT>
) {
  return function (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    value: undefined | Function,
    context:
      | ClassFieldDecoratorContext
      | ClassGetterDecoratorContext
      | ClassSetterDecoratorContext
  ) {
    context.addInitializer(function () {
      registerField(this, context.name, wrapperType);
    });
    switch (context.kind) {
      case 'field':
        return (initialValue: ValueT) => initialValue;
      case 'getter':
      case 'setter':
        return;
      default:
        throw new Error('@field() should only be used on class properties');
    }
  } as SerializableFieldDecorator<ValueT>;
}

/** Decorator for SObject fields indicating whether they should be included in JSON. */
export function json<WrappedValueT, ValueT extends WrappedValueT>(
  shouldIncludeInJson: boolean
) {
  return function (
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    value: undefined | Function,
    context:
      | ClassFieldDecoratorContext
      | ClassGetterDecoratorContext
      | ClassSetterDecoratorContext
  ) {
    context.addInitializer(function () {
      registerFieldJsonSetting(this, context.name, shouldIncludeInJson);
    });
    switch (context.kind) {
      case 'field':
        return (initialValue: ValueT) => initialValue;
      case 'getter':
      case 'setter':
        return;
      default:
        throw new Error('@field() should only be used on class properties');
    }
  } as SerializableFieldDecorator<ValueT>;
}
