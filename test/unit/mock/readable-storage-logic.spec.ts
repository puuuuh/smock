import { MockContract, MockContractFactory, smock } from '@src';
import { ADDRESS_EXAMPLE, BYTES32_EXAMPLE, BYTES_EXAMPLE } from '@test-utils';
import { StorageGetter, StorageGetter__factory } from '@typechained';
import { expect } from 'chai';
import { parseUnits } from 'ethers';

describe('Mock: Readable storage logic', () => {
  let storageGetterFactory: MockContractFactory<StorageGetter__factory>;
  let mock: MockContract<StorageGetter>;

  before(async () => {
    storageGetterFactory = await smock.mock('StorageGetter');
  });

  beforeEach(async () => {
    mock = await storageGetterFactory.deploy(1);
  });

  describe('getVariable', () => {
    it('should be able to get a uint256', async () => {
      const value = parseUnits('123');
      await mock.setVariable('_uint256', value);

      const getValue = await mock.getVariable('_uint256');
      expect(getValue).to.equal(await mock.getUint256());
    });

    it('should be able to get a uint16 in a packed slot', async () => {
      const value = BigInt('1');
      const value2 = BigInt('2');
      await mock.setPackedUintA(value);
      await mock.setPackedUintB(value2);

      const getValue = await mock.getVariable('_packedUintB');
      expect(getValue).to.equal(await mock.getPackedUintB());
    });

    it('should be able to get an int56', async () => {
      const value = 1;
      await mock.setVariable('_int56', value);

      const getValue = await mock.getVariable('_int56');
      expect(getValue).to.equal(await mock.getInt56());
    });

    it('should be able to get an int256', async () => {
      const value = BigInt(-1);
      await mock.setVariable('_int256', value);

      const getValue = await mock.getVariable('_int256');
      expect(getValue).to.equal(await mock.getInt256());
    });

    it('should be able to get an address', async () => {
      await mock.setVariable('_address', ADDRESS_EXAMPLE);

      const getValue = await mock.getVariable('_address');
      expect(getValue).to.equal(await mock.getFunction('getAddress()').staticCall());
    });

    it('should be able to get a boolean', async () => {
      await mock.setVariable('_bool', true);

      const getValue = await mock.getVariable('_bool');
      expect(getValue).to.equal(await mock.getBool());
    });

    it('should be able to get a small value < 31 bytes', async () => {
      const value = BYTES_EXAMPLE.slice(0, 10);
      await mock.setVariable('_bytes', value);

      const getValue = await mock.getVariable('_bytes');
      expect(getValue).to.equal(await mock.getBytes());
    });

    it('should be able to get a large value > 31 bytes', async () => {
      await mock.setVariable('_bytes', BYTES_EXAMPLE);

      const getValue = await mock.getVariable('_bytes');
      expect(getValue).to.equal(await mock.getBytes());
    });

    it('should be able to get bytes32', async () => {
      await mock.setVariable('_bytes32', BYTES32_EXAMPLE);

      const getValue = await mock.getVariable('_bytes32');
      expect(getValue).to.equal(await mock.getBytes32());
    });

    it('should be able to get a simple struct', async () => {
      const struct = {
        valueA: BigInt(1234),
        valueB: true,
      };
      await mock.setVariable('_simpleStruct', struct);

      const getValue = await mock.getVariable('_simpleStruct');
      expect(getValue).to.deep.equal(struct);
    });

    it('should be able to get an address in a packed struct', async () => {
      const struct = {
        packedA: BigInt(2),
        packedB: BigInt(1),
        packedC: BigInt(2),
        packedD: BigInt(1),
        packedE: ADDRESS_EXAMPLE,
      };
      await mock.setVariable('_packedStruct', struct);

      const getValue = await mock.getVariable('_packedStruct');
      expect(getValue).to.deep.equal(struct);
    });

    it('should be able to get a uint256 mapping value', async () => {
      const mapKey = 1234;
      const mapValue = 5678;
      await mock.setVariable('_uint256Map', { [mapKey]: mapValue });

      const getValue = await mock.getVariable('_uint256Map', [mapKey]);
      expect(getValue).to.equal(await mock.getUint256MapValue(mapKey));
    });

    it('should be able to get values in a bytes32 => bool mapping', async () => {
      const mapKey = BYTES32_EXAMPLE;
      const mapValue = true;
      await mock.setVariable('_bytes32ToBoolMap', { [mapKey]: mapValue });

      const getValue = await mock.getVariable('_bytes32ToBoolMap', [mapKey]);
      expect(getValue).to.equal(await mock.getBytes32ToBoolMapValue(mapKey));
    });

    it('should be able to get a nested uint256 mapping value', async () => {
      const mapKeyA = 1234;
      const mapKeyB = 4321;
      const mapVal = 5678;

      await mock.setVariable('_uint256NestedMap', {
        [mapKeyA]: {
          [mapKeyB]: mapVal,
        },
      });

      const getValue = await mock.getVariable('_uint256NestedMap', [mapKeyA, mapKeyB]);
      expect(getValue).to.equal(await mock.getNestedUint256MapValue(mapKeyA, mapKeyB));
    });

    it('should be able to get a uint256[] variable', async () => {
      await mock.setVariable('_uint256Array', [1, 2, 3]);
      const getValue = await mock.getVariable('_uint256Array');
      expect(getValue).to.deep.equal(await mock.getUint256Array());
    });
  });
});
