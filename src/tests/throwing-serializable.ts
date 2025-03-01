import {Serializable} from '..';

/** Dummy class that throws an error when serialized / deserialized. */
export class ThrowingSerializable extends Serializable {
  constructor(public errorMessage = 'oops') {
    super();
  }

  deserialize(): number {
    throw new Error(this.errorMessage);
  }

  serialize(): Buffer {
    throw new Error(this.errorMessage);
  }

  getSerializedLength() {
    return 1;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toJSON(): any {
    throw new Error(this.errorMessage);
  }
}
