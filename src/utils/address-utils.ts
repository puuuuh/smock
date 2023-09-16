import { getAddress } from 'ethers';
import { randomHex } from 'web3-utils';

export const makeRandomAddress = (): string => {
  return getAddress(randomHex(20));
};
