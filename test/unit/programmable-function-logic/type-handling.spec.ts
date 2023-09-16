import { FakeContract, smock } from '@src';
import { convertStructToPojo } from '@src/utils';
import { Delegator__factory, Returner } from '@typechained';
import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { toPlainObject } from 'lodash';
import { BYTES32_EXAMPLE, BYTES_EXAMPLE, STRUCT_DYNAMIC_SIZE_EXAMPLE, STRUCT_FIXED_SIZE_EXAMPLE } from 'test/utils';

chai.should();
chai.use(smock.matchers);

describe('ProgrammableFunctionLogic: Type Handling', () => {
  let fake: FakeContract<Returner>;

  beforeEach(async () => {
    fake = await smock.fake<Returner>('Returner');
  });

  context('fixed data types', () => {
    describe('default behaviors', () => {
      it('should return false for a boolean', async () => {
        expect(await fake.getBoolean.staticCall()).to.equal(false);
      });

      it('should return zero for a uint256', async () => {
        expect(await fake.getUint256.staticCall()).to.equal(0n);
      });

      it('should return 32 zero bytes for a bytes32', async () => {
        const expected = '0x0000000000000000000000000000000000000000000000000000000000000000';
        expect(await fake.getBytes32.staticCall()).to.equal(expected);
      });
    });

    describe('from a specified value', () => {
      it('should be able to return a boolean', async () => {
        const expected = true;
        fake.getBoolean.returns(expected);

        expect(await fake.getBoolean.staticCall()).to.equal(expected);
      });

      it('should be able to return a uint256', async () => {
        const expected = 1n;
        fake.getUint256.returns(expected);

        expect(await fake.getUint256.staticCall()).to.equal(expected);
      });

      it('should be able to return a bytes32', async () => {
        const expected = BYTES32_EXAMPLE;
        fake.getBytes32.returns(expected);

        expect(await fake.getBytes32.staticCall()).to.equal(expected);
      });

      it('should be able to return a boolean through a delegatecall', async () => {
        const delegatorFactory = (await ethers.getContractFactory('Delegator')) as Delegator__factory;
        const delegator = await delegatorFactory.deploy();

        const expected = true;
        fake.getBoolean.returns(expected);

        const result = await delegator.delegateGetBoolean.staticCall(await fake.getAddress());

        expect(result).to.equal(expected);
        expect(fake.getBoolean).to.be.calledOnce;
        expect(fake.getBoolean).to.be.delegatedFrom(await delegator.getAddress());
      });
    });
  });

  context('dynamic data types', () => {
    describe('from a specified value', () => {
      it('should be able to return a bytes value', async () => {
        const expected = BYTES_EXAMPLE;
        fake.getBytes.returns(expected);

        expect(await fake.getBytes.staticCall()).to.equal(expected);
      });

      it('should be able to return a string value', async () => {
        const expected = 'this is an expected return string';
        fake.getString.returns(expected);

        expect(await fake.getString.staticCall()).to.equal(expected);
      });

      // TODO: make it work with fields too
      it('should be able to return a struct with fixed size values', async () => {
        const expected = STRUCT_FIXED_SIZE_EXAMPLE;
        fake.getStructFixedSize.returns(expected);

        const result = toPlainObject(await fake.getStructFixedSize.staticCall());
        expect(result[0]).to.equal(expected.valBoolean);
        expect(result[1]).to.deep.equal(expected.valUint256);
        expect(result[2]).to.equal(expected.valBytes32);
      });

      // TODO: Deserialization
      it.skip('should be able to return a struct inside a mapping', async () => {
        const expected = STRUCT_FIXED_SIZE_EXAMPLE;

        fake.structMap.returns(expected);

        const result = convertStructToPojo(await fake.structMap.staticCall(1n));
        expect(result).to.deep.equal(expected);
      });

      // TODO: Deserialization
      it.skip('should be able to return a nested struct inside a mapping', async () => {
        const expected = {
          valRootString: 'Random',
          valStructFixedSize: STRUCT_FIXED_SIZE_EXAMPLE,
          valStructDynamicSize: STRUCT_DYNAMIC_SIZE_EXAMPLE,
          valRootBoolean: true,
        };

        fake.nestedStructMap.returns(expected);

        const result = convertStructToPojo(await fake.nestedStructMap.staticCall(1n));
        expect(result).to.deep.equal(expected);
      });

      it('should be able to return a struct with dynamic size values', async () => {
        const expected = STRUCT_DYNAMIC_SIZE_EXAMPLE;
        fake.getStructDynamicSize.returns(expected);

        const result = toPlainObject(await fake.getStructDynamicSize.staticCall());
        expect(result[0]).to.equal(expected.valBytes);
        expect(result[1]).to.equal(expected.valString);
      });

      it('should be able to return a struct with both fixed and dynamic size values', async () => {
        const expected = {
          ...STRUCT_FIXED_SIZE_EXAMPLE,
          ...STRUCT_DYNAMIC_SIZE_EXAMPLE,
        };
        fake.getStructMixedSize.returns(expected);

        const result = toPlainObject(await fake.getStructMixedSize.staticCall());
        expect(result[0]).to.equal(expected.valBoolean);
        expect(result[1]).to.deep.equal(expected.valUint256);
        expect(result[2]).to.equal(expected.valBytes32);
        expect(result[3]).to.equal(expected.valBytes);
        expect(result[4]).to.equal(expected.valString);
      });

      // TODO: deserialization
      it('should be able to return a nested struct', async () => {
        const expected = {
          valStructFixedSize: STRUCT_FIXED_SIZE_EXAMPLE,
          valStructDynamicSize: STRUCT_DYNAMIC_SIZE_EXAMPLE,
        };
        fake.getStructNested.returns(expected);

        const result = toPlainObject(await fake.getStructNested.staticCall());
        expect(result[0][0]).to.deep.equal(expected.valStructFixedSize.valBoolean);
        expect(result[0][1]).to.deep.equal(expected.valStructFixedSize.valUint256);
        expect(result[0][2]).to.deep.equal(expected.valStructFixedSize.valBytes32);
        expect(result[1][0]).to.deep.equal(expected.valStructDynamicSize.valBytes);
        expect(result[1][1]).to.deep.equal(expected.valStructDynamicSize.valString);
      });

      it('should be able to return an array of uint256 values', async () => {
        const expected = [1234n, 2345n, 3456n, 4567n, 5678n, 6789n];
        fake.getArrayUint256.returns(expected);

        const result = await fake.getArrayUint256.staticCall();
        for (let i = 0; i < result.length; i++) {
          expect(result[i]).to.deep.equal(expected[i]);
        }
      });

      it('should be able to return multiple arrays of uint256 values', async () => {
        const expected = [
          [1234n, 2345n, 3456n, 4567n, 5678n, 6789n],
          [1234n, 2345n, 3456n, 4567n, 5678n, 6789n],
        ];
        fake.getMultipleUint256Arrays.returns(expected);

        const result = await fake.getMultipleUint256Arrays.staticCall();
        for (let i = 0; i < result.length; i++) {
          for (let j = 0; j < result[i].length; j++) {
            expect(result[i][j]).to.deep.equal(expected[i][j]);
          }
        }
      });
    });
  });

  context('fallback function', () => {
    const EMPTY_ANSWER = '0x';

    it('should return with no data by default', async () => {
      expect(await ethers.provider.call({ to: await fake.getAddress() })).to.equal(EMPTY_ANSWER);
    });

    it('should be able to return with empty data', async () => {
      fake.fallback.returns();

      expect(
        await ethers.provider.call({
          to: await fake.getAddress(),
        })
      ).to.equal(EMPTY_ANSWER);
    });

    it('should be able to return simple data', async () => {
      const expected = '0x1234';
      fake.fallback.returns(expected);

      expect(
        await ethers.provider.call({
          to: await fake.getAddress(),
        })
      ).to.equal(expected);
    });

    it('should be able to return complex data as hex', async () => {
      fake.fallback.returns([1, 2, 3]);

      expect(
        await ethers.provider.call({
          to: await fake.getAddress(),
        })
      ).to.equal('0x010203');
    });

    it('should be able to return string data as hex', async () => {
      fake.fallback.returns('hello');

      expect(
        await ethers.provider.call({
          to: await fake.getAddress(),
        })
      ).to.equal('0x68656c6c6f');
    });
  });

  context('function value', () => {
    it('should pass the argument to the function and return the result', async () => {
      fake.getInputtedUint256.returns((number: number) => number * 10);

      expect(await fake.getInputtedUint256.staticCall(10)).to.equal(100);
    });

    it('should wait for result as promise', async () => {
      fake.getInputtedUint256.returns(async (number: number) => number * 10);

      expect(await fake.getInputtedUint256.staticCall(10)).to.equal(100);
    });
  });
});
