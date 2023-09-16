import { defaultAbiCoder } from '@ethersproject/abi';
import { MockContract, MockContractFactory, smock } from '@src';
import { convertStructToPojo } from '@src/utils';
import { ADDRESS_EXAMPLE, BYTES32_EXAMPLE, BYTES_EXAMPLE } from '@test-utils';
import { StorageGetter, StorageGetter__factory } from '@typechained';
import { expect } from 'chai';
import { keccak256, parseUnits } from 'ethers';

describe('Mock: Editable storage logic', () => {
  let storageGetterFactory: MockContractFactory<StorageGetter__factory>;
  let mock: MockContract<StorageGetter>;

  before(async () => {
    storageGetterFactory = await smock.mock('StorageGetter');
  });

  beforeEach(async () => {
    mock = await storageGetterFactory.deploy(1);
  });

  describe('setVariable', () => {
    it('should be able to set a uint256', async () => {
      const value = parseUnits('123');
      await mock.setVariable('_uint256', value);
      expect(await mock.getUint256()).to.equal(value);
    });

    it('should be able to set a int56', async () => {
      const value = BigInt(-1);
      await mock.setVariable('_int56', value);
      expect(await mock.getInt56()).to.equal(value);
    });

    it('should be able to set a int256', async () => {
      const value = parseUnits('-1');
      await mock.setVariable('_int256', value);
      expect(await mock.getInt256()).to.equal(value);
    });

    it('should be able to set a boolean', async () => {
      await mock.setVariable('_bool', true);
      expect(await mock.getBool()).to.equal(true);
    });

    it('should be able to set a small value < 31 bytes', async () => {
      const value = BYTES_EXAMPLE.slice(0, 10);
      await mock.setVariable('_bytes', value);
      expect(await mock.getBytes()).to.equal(value);
    });

    it('should be able to set a large value > 31 bytes', async () => {
      await mock.setVariable('_bytes', BYTES_EXAMPLE);
      expect(await mock.getBytes()).to.equal(BYTES_EXAMPLE);
    });

    it('should be able to set bytes32', async () => {
      await mock.setVariable('_bytes32', BYTES32_EXAMPLE);
      expect(await mock.getBytes32()).to.equal(BYTES32_EXAMPLE);
    });

    it('should be able to set an address', async () => {
      await mock.setVariable('_address', ADDRESS_EXAMPLE);
      expect(await mock.getFunction('getAddress').staticCall()).to.equal(ADDRESS_EXAMPLE);
    });

    it('should be able to set an address in a packed storage slot', async () => {
      await mock.setVariable('_packedB', ADDRESS_EXAMPLE);

      expect(await mock.getPackedAddress()).to.equal(ADDRESS_EXAMPLE);
    });

    it('should be able to set an address in a packed struct', async () => {
      const struct = {
        packedA: 2,
        packedB: 1,
        packedC: 2,
        packedD: 1,
        packedE: ADDRESS_EXAMPLE,
      };
      await mock.setVariable('_packedStruct', struct);

      expect(convertStructToPojo(await mock.getPackedStruct())).to.deep.equal(struct);
    });

    it('should be able to set a simple struct', async () => {
      const struct = {
        valueA: BigInt(1234),
        valueB: true,
      };
      await mock.setVariable('_simpleStruct', struct);

      expect(convertStructToPojo(await mock.getSimpleStruct())).to.deep.equal(struct);
    });

    it('should be able to set a uint256 mapping value', async () => {
      const mapKey = 1234;
      const mapValue = BigInt(5678);
      await mock.setVariable('_uint256Map', { [mapKey]: mapValue });

      expect(await mock.getUint256MapValue(mapKey)).to.equal(mapValue);
    });

    it('should be able to set a nested uint256 mapping value', async () => {
      const mapKeyA = 1234;
      const mapKeyB = 4321;
      const mapVal = BigInt(5678);

      await mock.setVariable('_uint256NestedMap', {
        [mapKeyA]: {
          [mapKeyB]: mapVal,
        },
      });

      expect(await mock.getNestedUint256MapValue(mapKeyA, mapKeyB)).to.equal(mapVal);
    });

    it('should let calls to the contract override the set variable', async () => {
      await mock.setVariable('_uint256', 1);
      await mock.setUint256(2);

      expect(await mock.getUint256()).to.equal(2);
    });

    it('should be able to set a value that was set in the constructor', async () => {
      await mock.setVariable('_constructorUint256', 1234);
      expect(await mock.getConstructorUint256()).to.equal(1234);
    });

    it('should be able to set values in a bytes32 => bool mapping', async () => {
      const mapKey = keccak256(defaultAbiCoder.encode(['bytes32'], [BYTES32_EXAMPLE]));
      const mapValue = true;
      await mock.setVariable('_bytes32ToBoolMap', { [mapKey]: mapValue });

      expect(await mock.getBytes32ToBoolMapValue(mapKey)).to.equal(mapValue);
    });

    it('should be able to set values in a address => bool mapping', async () => {
      const mapKey = ADDRESS_EXAMPLE;
      const mapValue = true;
      await mock.setVariable('_addressToBoolMap', { [mapKey]: mapValue });

      expect(await mock.getAddressToBoolMapValue(mapKey)).to.equal(mapValue);
    });

    it('should be able to set values in a address => address mapping', async () => {
      const mapKey = ADDRESS_EXAMPLE;
      const mapValue = '0x063bE0Af9711a170BE4b07028b320C90705fec7C';
      await mock.setVariable('_addressToAddressMap', { [mapKey]: mapValue });

      expect(await mock.getAddressToAddressMapValue(mapKey)).to.equal(mapValue);
    });

    it('should be able to set a uint256[] variable', async () => {
      await mock.setVariable('_uint256Array', [1, 2]);
      expect(await mock.getUint256Array()).to.eql([BigInt(1), BigInt(2)]);
    });

    it('should be able to set a 2D packed int16[][] variable', async () => {
      const arr = [
        [-1n, -2n],
        [-3n, -4n],
        [5n, -6n],
      ];
      await mock.setVariable('_int2DArray', arr);
      expect(await mock.getInt2D16Array()).to.eql(arr);
    });
  });

  describe('setVariables', () => {
    it('should be able to set a uint256 and a int56', async () => {
      const value = parseUnits('555');
      const value1 = BigInt(-2);
      await mock.setVariables({
        _uint256: value,
        _int56: value1,
      });
      expect(await mock.getUint256()).to.equal(value);
      expect(await mock.getInt56()).to.equal(value1);
    });

    it('should be able to set a int256 and a boolean', async () => {
      const value = parseUnits('-5');
      await mock.setVariables({
        _int256: value,
        _bool: true,
      });
      expect(await mock.getInt256()).to.equal(value);
      expect(await mock.getBool()).to.equal(true);
    });

    it('should be able to set bytes32 and an address', async () => {
      await mock.setVariables({
        _bytes32: BYTES32_EXAMPLE,
        _address: ADDRESS_EXAMPLE,
      });
      expect(await mock.getBytes32()).to.equal(BYTES32_EXAMPLE);
      expect(await mock.getFunction('getAddress()').staticCall()).to.equal(ADDRESS_EXAMPLE);
    });

    it('should be able to set an address in a packed storage slot and a simple struct', async () => {
      const struct = {
        valueA: BigInt(5555),
        valueB: false,
      };
      await mock.setVariables({
        _packedB: ADDRESS_EXAMPLE,
        _simpleStruct: struct,
      });

      expect(await mock.getPackedAddress()).to.equal(ADDRESS_EXAMPLE);
      expect(convertStructToPojo(await mock.getSimpleStruct())).to.deep.equal(struct);
    });

    it('should be able to set a uint256 mapping value and a nested uint256 mapping value', async () => {
      const mapKey = 1234;
      const mapKeyB = 4321;
      const nestedMapKey = 1122;
      const nestedMapKeyB = 3344;
      const mapValue = BigInt(5678);
      const mapValue2 = BigInt(8765);
      await mock.setVariables({
        _uint256Map: {
          [mapKey]: mapValue,
          [mapKeyB]: mapValue2,
        },
        _uint256NestedMap: {
          [mapKey]: {
            [nestedMapKey]: mapValue,
            [nestedMapKeyB]: mapValue2,
          },
        },
      });

      expect(await mock.getUint256MapValue(mapKey)).to.equal(mapValue);
      expect(await mock.getUint256MapValue(mapKeyB)).to.equal(mapValue2);
      expect(await mock.getNestedUint256MapValue(mapKey, nestedMapKey)).to.equal(mapValue);
      expect(await mock.getNestedUint256MapValue(mapKey, nestedMapKeyB)).to.equal(mapValue2);
    });

    it('should be able to set values in a address => address mapping and a value that was set in the constructor', async () => {
      const mapKey = ADDRESS_EXAMPLE;
      const mapValue = '0x063bE0Af9711a170BE4b07028b320C90705fec7C';
      await mock.setVariables({
        _addressToAddressMap: {
          [mapKey]: mapValue,
        },
        _constructorUint256: BigInt(1234),
      });

      expect(await mock.getAddressToAddressMapValue(mapKey)).to.equal(mapValue);
      expect(await mock.getConstructorUint256()).to.equal(1234);
    });

    it('should be able to set a lot of different variables of a contract at the same time', async () => {
      const uint256value = parseUnits('66');
      const struct = {
        valueA: BigInt(5555),
        valueB: false,
      };
      const mapKey = 1234;
      const mapKeyB = 5678;
      const mapValue = BigInt(4321);
      const mapValueB = BigInt(8765);
      const mapKeybytes32ToBool = BYTES32_EXAMPLE;
      const mapValueAddress = '0x063bE0Af9711a170BE4b07028b320C90705fec7C';
      await mock.setVariables({
        _address: ADDRESS_EXAMPLE,
        _constructorUint256: 1234,
        _int56: -2,
        _uint256: uint256value,
        _bytes32: BYTES32_EXAMPLE,
        _bool: true,
        _simpleStruct: struct,
        _uint256Map: { [mapKey]: mapValue },
        _uint256NestedMap: {
          [mapKey]: {
            [mapKeyB]: mapValueB,
          },
        },
        _bytes32ToBoolMap: { [mapKeybytes32ToBool]: true },
        _addressToBoolMap: { [ADDRESS_EXAMPLE]: false },
        _addressToAddressMap: { [ADDRESS_EXAMPLE]: mapValueAddress },
      });

      expect(await mock.getFunction('getAddress').call(mock)).is.equal(ADDRESS_EXAMPLE);
      expect(await mock.getConstructorUint256()).to.equal(BigInt(1234));
      expect(await mock.getInt56()).to.equal(BigInt(-2));
      expect(await mock.getUint256()).to.equal(uint256value);
      expect(await mock.getBytes32()).to.equal(BYTES32_EXAMPLE);
      expect(await mock.getBool()).to.equal(true);
      expect(convertStructToPojo(await mock.getSimpleStruct())).to.deep.equal(struct);
      expect(await mock.getUint256MapValue(mapKey)).to.equal(mapValue);
      expect(await mock.getNestedUint256MapValue(mapKey, mapKeyB)).to.equal(mapValueB);
      expect(await mock.getBytes32ToBoolMapValue(mapKeybytes32ToBool)).to.equal(true);
      expect(await mock.getAddressToBoolMapValue(ADDRESS_EXAMPLE)).to.equal(false);
      expect(await mock.getAddressToAddressMapValue(ADDRESS_EXAMPLE)).to.equal(mapValueAddress);
    });
  });
});
