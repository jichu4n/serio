import {SArray, SArrayError, SInt16LE, SInt8, SStringNT, SUInt16BE} from '../';
import {ThrowingSerializable} from './throwing-serializable';

describe('SArray', function () {
  test('create', function () {
    const arr1 = SArray.ofLength(3, () => SUInt16BE.of(42));
    expect(arr1.value.map(({value}) => value)).toStrictEqual([42, 42, 42]);

    const arr2 = SArray.ofLength(3, function () {
      return SUInt16BE.of(42);
    });
    expect(arr2.value.map(({value}) => value)).toStrictEqual([42, 42, 42]);

    const arr3 = SArray.ofLength(3, () => SUInt16BE.of(42));
    expect(arr3.value.map(({value}) => value)).toStrictEqual([42, 42, 42]);
  });

  test('serialize and deserialize', function () {
    const arr1 = new SArray();
    expect(arr1.getSerializedLength()).toStrictEqual(0);
    expect(arr1.serialize()).toStrictEqual(Buffer.alloc(0));

    arr1.value = [SStringNT.of('hello'), SInt8.of(10), SInt8.of(20)];
    expect(arr1.getSerializedLength()).toStrictEqual(8);

    const arr2 = SArray.of([new SStringNT(), new SInt8(), new SInt8()]);
    arr2.deserialize(arr1.serialize());
    expect((arr2.value[0] as SStringNT).value).toStrictEqual('hello');
    expect((arr2.value[1] as SInt8).value).toStrictEqual(10);
    expect((arr2.value[2] as SInt8).value).toStrictEqual(20);
  });

  test('toJSON', function () {
    const arr1 = SArray.of([
      SStringNT.of('hello'),
      SInt16LE.of(42),
      SArray.of([SInt16LE.of(100), SInt16LE.of(200)]),
    ]);
    expect(arr1.toJSON()).toStrictEqual(['hello', 42, [100, 200]]);
  });

  test('error handling', function () {
    const arr1 = SArray.of([
      SUInt16BE.of(3),
      new ThrowingSerializable('test error'),
      SUInt16BE.of(100),
    ]);

    expect(() => arr1.serialize()).toThrow(SArrayError);
    try {
      arr1.serialize();
    } catch (e) {
      const e2 = e as SArrayError;
      expect(e2.isSArrayError).toStrictEqual(true);
      expect(e2.element).toStrictEqual(arr1.value[1]);
      expect(e2.index).toStrictEqual(1);
      // @ts-ignore
      expect(e2.cause.message).toBe('test error');
    }

    expect(() => arr1.deserialize(Buffer.alloc(100))).toThrow(SArrayError);
    try {
      arr1.deserialize(Buffer.alloc(100));
    } catch (e) {
      const e2 = e as SArrayError;
      expect(e2.isSArrayError).toStrictEqual(true);
      expect(e2.element).toStrictEqual(arr1.value[1]);
      expect(e2.index).toStrictEqual(1);
      // @ts-ignore
      expect(e2.cause.message).toBe('test error');
    }

    expect(() => arr1.toJSON()).toThrow(SArrayError);
    try {
      arr1.toJSON();
    } catch (e) {
      const e2 = e as SArrayError;
      expect(e2.isSArrayError).toStrictEqual(true);
      expect(e2.element).toStrictEqual(arr1.value[1]);
      expect(e2.index).toStrictEqual(1);
      // @ts-ignore
      expect(e2.cause.message).toBe('test error');
    }
  });
});

describe('SArrayWithWrapper', function () {
  test('create', function () {
    const arr1 = SArray.withWrapper(SUInt16BE).ofLength(3, 42);
    expect(arr1.value).toStrictEqual([42, 42, 42]);

    const arr2 = SArray.withWrapper(SUInt16BE).ofLength(3, function () {
      return 42;
    });
    expect(arr2.value).toStrictEqual([42, 42, 42]);

    const arr3 = SArray.withWrapper(SUInt16BE).ofLength(3, () => 42);
    expect(arr3.value).toStrictEqual([42, 42, 42]);
  });

  test('serialize and deserialize', function () {
    const arr1 = SArray.withWrapper(SUInt16BE).of([100, 200, 300]);
    expect(arr1.getSerializedLength()).toStrictEqual(6);

    const arr2 = SArray.ofLength(3, () => SUInt16BE.of(0));
    arr2.deserialize(arr1.serialize());
    expect(arr2.value.map(({value}) => value)).toStrictEqual([100, 200, 300]);

    const arr3 = SArray.withWrapper(SUInt16BE).ofLength(3, 0);
    arr3.deserialize(arr1.serialize());
    expect(arr3.value).toStrictEqual([100, 200, 300]);

    const arr4 = SArray.withWrapper(SArray.withWrapper(SUInt16BE)).of([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
    expect(arr4.getSerializedLength()).toStrictEqual(18);
    const arr5 = SArray.withWrapper(SUInt16BE).ofLength(9, 0);
    arr5.deserialize(arr4.serialize());
    expect(arr5.value).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  test('toJSON', function () {
    const arr1 = SArray.withWrapper(SUInt16BE).of([100, 200, 300]);
    expect(arr1.toJSON()).toStrictEqual([100, 200, 300]);

    const arr2 = SArray.withWrapper(SStringNT).of(['hello', 'world']);
    expect(arr2.toJSON()).toStrictEqual(['hello', 'world']);
  });
});
