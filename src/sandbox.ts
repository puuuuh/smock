import { VM } from '@nomicfoundation/ethereumjs-vm';
import { FactoryOptions } from '@nomicfoundation/hardhat-ethers/types';
import hre, { ethers } from 'hardhat';
import { ethersInterfaceFromSpec } from './factories/ethers-interface';
import { createFakeContract, createMockContractFactory } from './factories/smock-contract';
import { ObservableVM } from './observable-vm';
import { FakeContract, FakeContractOptions, FakeContractSpec, MockContractFactory } from './types';
import { getHardhatBaseProvider, makeRandomAddress } from './utils';
import { BaseContract, ContractFactory, Signer } from 'ethers';
import { ExecResult } from '@nomicfoundation/ethereumjs-evm';
import { MessageTrace } from 'hardhat/internal/hardhat-network/stack-traces/message-trace';

// Handle hardhat ^2.4.0
let decodeRevertReason: (value: Buffer) => string;
try {
  decodeRevertReason = require('hardhat/internal/hardhat-network/stack-traces/revert-reasons').decodeRevertReason;
} catch (err) {
  const { ReturnData } = require('hardhat/internal/hardhat-network/provider/return-data');
  decodeRevertReason = (value: Buffer) => {
    const returnData = new ReturnData(value);
    return returnData.isErrorReturnData() ? returnData.decodeError() : '';
  };
}

// Handle hardhat ^2.2.0
let TransactionExecutionError: any;
try {
  TransactionExecutionError = require('hardhat/internal/hardhat-network/provider/errors').TransactionExecutionError;
} catch (err) {
  TransactionExecutionError = require('hardhat/internal/core/providers/errors').TransactionExecutionError;
}

export class Sandbox {
  private vm: ObservableVM;
  private static nonce: number = 0;

  constructor(vm: VM) {
    this.vm = new ObservableVM(vm);
  }

  async fake<Type extends BaseContract>(spec: FakeContractSpec, opts: FakeContractOptions = {}): Promise<FakeContract<Type>> {
    return createFakeContract(
      this.vm,
      opts.address || makeRandomAddress(),
      await ethersInterfaceFromSpec(spec),
      opts.provider || ethers.provider
    );
  }

  async mock<T extends ContractFactory>(contractName: string, signerOrOptions?: Signer | FactoryOptions): Promise<MockContractFactory<T>> {
    return createMockContractFactory(this.vm, contractName, signerOrOptions);
  }

  static async create(): Promise<Sandbox> {
    // Only support native hardhat runtime, haven't bothered to figure it out for anything else.
    if (hre.network.name !== 'hardhat') {
      throw new Error(
        `Smock is only compatible with the "hardhat" network, got: ${hre.network.name}. Follow this issue for more info: https://github.com/defi-wonderland/smock/issues/29`
      );
    }

    const provider: any = await getHardhatBaseProvider(hre);
    const node = provider._node;

    // Initialize VM it case it hasn't been already
    if (node === undefined) {
      await provider._init();
    }

    // Here we're fixing with hardhat's internal error management. Smock is a bit weird and messes
    // with stack traces so we need to help hardhat out a bit when it comes to smock-specific errors.
    const originalManagerErrorsFn = node._manageErrors.bind(node);
    node._manageErrors = async (vmResult: ExecResult, vmTrace: MessageTrace | undefined, vmTracerError: Error | undefined): Promise<any> => {
      // @ts-ignore
      if (vmResult.exceptionError && vmResult.exceptionError.error === 'smock revert') {
        const returnDataExplanation = decodeRevertReason(vmResult.returnValue);

        const fallbackMessage = `VM Exception while processing transaction: revert ${returnDataExplanation}`;

        vmTrace!!.returnData = vmResult.returnValue;

        return new TransactionExecutionError(fallbackMessage);
      }
      return originalManagerErrorsFn(vmResult, vmTrace, vmTracerError);
    };

    return new Sandbox(provider._node._vm as VM);
  }

  static getNextNonce(): number {
    return Sandbox.nonce++;
  }
}
