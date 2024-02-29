import {Serializable} from './serializable';
import {SerializableWrapper} from './serializable-wrapper';

/** Key for metadata stored on an SObject's prototype. */
export const SOBJECT_METADATA_KEY = Symbol('__sobjectMetadata');

/** Metadata stored for each serializable property on an SObject's prototype. */
export interface SObjectFieldSpec<ValueT = any> {
  /** The name of the property. */
  propertyKey: string | symbol;
  /** The wrapper type for the property, if defined with @field(wrapper). */
  wrapperType?: new () => SerializableWrapper<ValueT>;
}

/** Metadata stored on an SObject's prototype. */
export interface SObjectMetadata {
  /** List of serializable fields, in declaration order. */
  fieldSpecs: Array<SObjectFieldSpec>;
  /** Field specs indexed by property name. */
  fieldSpecMap: {[key: string | symbol]: SObjectFieldSpec};
  /** Name of all serializable fields as a set. */
  propertyKeys: Set<string | symbol>;
  /** Properties explicitly included in JSON. */
  jsonIncludedPropertyKeys: Set<string | symbol>;
  /** Perperties explicitly excluded from JSON. */
  jsonExcludedPropertyKeys: Set<string | symbol>;
}

/** Registers a serializable property in the metadata of an SObject. */
export function registerField<ValueT>(
  targetInstance: any,
  propertyKey: string | symbol,
  wrapperType?: new () => SerializableWrapper<ValueT>
) {
  const targetPrototype = Object.getPrototypeOf(targetInstance);
  const metadata = targetPrototype[SOBJECT_METADATA_KEY] as
    | SObjectMetadata
    | undefined;
  const fieldSpec: SObjectFieldSpec<ValueT> = {
    propertyKey,
    wrapperType,
  };
  if (metadata) {
    if (metadata.propertyKeys.has(propertyKey)) {
      return;
    }
    metadata.propertyKeys.add(propertyKey);
    metadata.fieldSpecs.push(fieldSpec);
    metadata.fieldSpecMap[propertyKey] = fieldSpec;
  } else {
    const newMetadata: SObjectMetadata = {
      fieldSpecs: [fieldSpec],
      fieldSpecMap: {[propertyKey]: fieldSpec},
      propertyKeys: new Set<string | symbol>([propertyKey]),
      jsonIncludedPropertyKeys: new Set<string | symbol>(),
      jsonExcludedPropertyKeys: new Set<string | symbol>(),
    };
    targetPrototype[SOBJECT_METADATA_KEY] = newMetadata;
  }
}

/** Register JSON setting for an SObject field. */
export function registerFieldJsonSetting<ValueT>(
  targetInstance: any,
  propertyKey: string | symbol,
  shouldIncludeInJson: boolean
) {
  const targetPrototype = Object.getPrototypeOf(targetInstance);
  let metadata = targetPrototype[SOBJECT_METADATA_KEY] as
    | SObjectMetadata
    | undefined;
  if (!metadata) {
    metadata = {
      fieldSpecs: [],
      fieldSpecMap: {},
      propertyKeys: new Set<string | symbol>(),
      jsonIncludedPropertyKeys: new Set<string | symbol>(
        shouldIncludeInJson ? [propertyKey] : []
      ),
      jsonExcludedPropertyKeys: new Set<string | symbol>(
        shouldIncludeInJson ? [] : [propertyKey]
      ),
    };
    targetPrototype[SOBJECT_METADATA_KEY] = metadata;
  }
  if (shouldIncludeInJson) {
    if (metadata.jsonExcludedPropertyKeys.has(propertyKey)) {
      throw new Error(
        `Field ${propertyKey.toString()} has conflicting JSON settings`
      );
    }
    metadata.jsonIncludedPropertyKeys.add(propertyKey);
  } else {
    if (metadata.jsonIncludedPropertyKeys.has(propertyKey)) {
      throw new Error(
        `Field ${propertyKey.toString()} has conflicting JSON settings`
      );
    }
    metadata.jsonExcludedPropertyKeys.add(propertyKey);
  }
}

/** Extract SObjectMetadata defined on an SObject. */
export function getSObjectMetadata(
  targetInstance: any
): SObjectMetadata | null {
  return (
    (Object.getPrototypeOf(targetInstance)[SOBJECT_METADATA_KEY] as
      | SObjectMetadata
      | undefined) ?? null
  );
}

/** Extract SObjectFieldSpec's defined on a SObject. */
export function getFieldSpecs(targetInstance: any) {
  return getSObjectMetadata(targetInstance)?.fieldSpecs ?? [];
}

/** Extract SObjectFieldMap defined on a SObject. */
export function getFieldSpecMap(targetInstance: any) {
  return getSObjectMetadata(targetInstance)?.fieldSpecMap ?? {};
}

/** Extract JSON field settings defined on a SObject. */
export function getJsonFieldSettings(targetInstance: any) {
  const metadata = getSObjectMetadata(targetInstance);
  return {
    included: metadata?.jsonIncludedPropertyKeys ?? new Set<string | symbol>(),
    excluded: metadata?.jsonExcludedPropertyKeys ?? new Set<string | symbol>(),
  };
}

/** Get the Serializable value corresponding to an SObject field. */
export function getFieldOrWrapper(
  targetInstance: any,
  {propertyKey, wrapperType}: SObjectFieldSpec
) {
  const value = targetInstance[propertyKey];
  if (wrapperType) {
    const wrapper = new wrapperType();
    wrapper.value = value;
    return wrapper;
  } else {
    return value as Serializable;
  }
}
