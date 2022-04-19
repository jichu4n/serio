/** A class with a create() factory method for initializing properties. */
export abstract class Creatable {
  /** Create a new instance with the provided initial properties. */
  static create<T extends Creatable>(
    this: new () => T,
    props: Partial<T> = {}
  ): T {
    const instance = new this();
    Object.assign(instance, props);
    return instance;
  }
}
