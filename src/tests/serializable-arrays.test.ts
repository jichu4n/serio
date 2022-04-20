import {SArray, SInt16LE, SInt8, SStringNT} from '../';

describe('SArray', function () {
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
});
