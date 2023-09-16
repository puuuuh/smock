import { Message } from '@nomicfoundation/ethereumjs-evm/dist/message';
import { FactoryOptions } from '@nomicfoundation/hardhat-ethers/types';
import { BaseContract, ContractFactory, Provider, Signer } from 'ethers';
import { Interface } from 'ethers';
import { ethers } from 'hardhat';
import { Observable } from 'rxjs';
import { distinct, filter, map, share, withLatestFrom } from 'rxjs/operators';
import { EditableStorageLogic as EditableStorage } from '../logic/editable-storage-logic';
import { ProgrammableFunctionLogic, SafeProgrammableContract } from '../logic/programmable-function-logic';
import { ReadableStorageLogic as ReadableStorage } from '../logic/readable-storage-logic';
import { ObservableVM } from '../observable-vm';
import { Sandbox } from '../sandbox';
import { ContractCall, FakeContract, MockContractFactory, ProgrammableContractFunction, ProgrammedReturnValue } from '../types';
import { convertPojoToStruct, fromFancyAddress, impersonate, isPojo, toFancyAddress, toHexString } from '../utils';
import { getStorageLayout } from '../utils/storage';

export async function createFakeContract<Contract extends BaseContract>(
  vm: ObservableVM,
  address: string,
  contractInterface: Interface,
  provider: Provider
): Promise<FakeContract<Contract>> {
  const fake = (await initContract(vm, address, contractInterface, provider)) as unknown as FakeContract<Contract>;
  const fakeAddr = await fake.getAddress();

  fake.interface.forEachFunction((f, i) => {
    const { encoder, calls$, results$ } = getFunctionEventData(vm, contractInterface, fakeAddr, f.selector);
    const functionLogic = new SafeProgrammableContract(f.name, calls$, results$, encoder);
    let inputs = f.inputs
      .map((f) => {
        return f.type;
      })
      .join(',');
    let fullName = f.name + '(' + inputs + ')';
    if (fake[f.name] != null) {
      fake[f.name] = fillProgrammableContractFunction(fake[f.name], functionLogic);
    }
    try {
      fake[fullName] = fillProgrammableContractFunction(fake[fullName], functionLogic);
    } catch (_) {}
  });

  return fake;
}

function mockifyContractFactory<T extends ContractFactory>(
  vm: ObservableVM,
  contractName: string,
  factory: MockContractFactory<T>
): MockContractFactory<T> {
  const realDeploy = factory.deploy;
  factory.deploy = async (...args: Parameters<T['deploy']>) => {
    const mock = await realDeploy.apply(factory, args);
    let mockAddr = await mock.getAddress();

    mock.interface.forEachFunction((f, i) => {
      const { encoder, calls$, results$ } = getFunctionEventData(vm, mock.interface, mockAddr, f.selector);
      const functionLogic = new ProgrammableFunctionLogic(f.name, calls$, results$, encoder);
      //if (mock[f.name].fragment.selector === f.selector) {
      mock[f.name] = fillProgrammableContractFunction(mock[f.name], functionLogic);
      //}
      //if (mock[fullName] != null) {
      //    mock[fullName] = fillProgrammableContractFunction(mock[fullName], functionLogic);
      //}
    });

    // attach to every internal variable, all the editable logic
    const editableStorage = new EditableStorage(await getStorageLayout(contractName), vm.getManager(), mockAddr);
    const readableStorage = new ReadableStorage(await getStorageLayout(contractName), vm.getManager(), mockAddr);
    mock.setVariable = editableStorage.setVariable.bind(editableStorage);
    mock.setVariables = editableStorage.setVariables.bind(editableStorage);
    mock.getVariable = readableStorage.getVariable.bind(readableStorage);

    // We attach a wallet to the contract so that users can send transactions *from* a watchablecontract.
    mock.wallet = await impersonate(mockAddr);

    return mock;
  };

  const realConnect = factory.connect;
  factory.connect = (...args: Parameters<T['connect']>): MockContractFactory<T> => {
    const newFactory = realConnect.apply(factory, args) as MockContractFactory<T>;
    return mockifyContractFactory(vm, contractName, newFactory);
  };

  return factory;
}

export async function createMockContractFactory<T extends ContractFactory>(
  vm: ObservableVM,
  contractName: string,
  signerOrOptions?: Signer | FactoryOptions
): Promise<MockContractFactory<T>> {
  const factory = (await ethers.getContractFactory(contractName, signerOrOptions)) as unknown as MockContractFactory<T>;
  return mockifyContractFactory(vm, contractName, factory);
}

async function initContract(vm: ObservableVM, address: string, contractInterface: Interface, provider: Provider): Promise<BaseContract> {
  // Generate the contract object that we're going to attach our fancy functions to. Doing it this
  // way is nice because it "feels" more like a contract (as long as you're using ethers).
  const contract = new ethers.Contract(address, contractInterface, provider);
  const contractAddr = await contract.getAddress();

  // Set some code into the contract address so hardhat recognize it as a contract
  await vm.getManager().putContractCode(toFancyAddress(contractAddr), Buffer.from('00', 'hex'));

  // We attach a wallet to the contract so that users can send transactions *from* a watchablecontract.
  (contract as any).wallet = await impersonate(contractAddr);

  return contract;
}

function getFunctionEventData(vm: ObservableVM, contractInterface: Interface, contractAddress: string, sighash: string | null) {
  const encoder = getFunctionEncoder(contractInterface, sighash);
  // Filter only the calls that correspond to this function, from vm beforeMessages
  const calls$ = parseAndFilterBeforeMessages(vm.getBeforeMessages(), contractInterface, contractAddress, sighash);
  // Get every result that comes right after a call to this function
  const results$ = vm.getAfterMessages().pipe(
    withLatestFrom(calls$),
    distinct(([, call]) => call),
    map(([answer]) => answer)
  );

  return { encoder, calls$, results$ };
}

function getFunctionEncoder(contractInterface: Interface, sighash: string | null): (values?: ProgrammedReturnValue) => string {
  if (sighash === null) {
    // if it is a fallback function, return simplest encoder
    return (values) => values;
  } else {
    return (values) => {
      const fnFragment = contractInterface.getFunction(sighash)!!;
      try {
        return contractInterface.encodeFunctionResult(fnFragment, [values]);
      } catch {
        try {
          return contractInterface.encodeFunctionResult(fnFragment, values);
        } catch (err) {
          if (isPojo(values)) {
            return contractInterface.encodeFunctionResult(fnFragment, convertPojoToStruct(values, fnFragment));
          }

          throw err;
        }
      }
    };
  }
}

function parseAndFilterBeforeMessages(
  messages$: Observable<Message>,
  contractInterface: Interface,
  contractAddress: string,
  sighash: string | null
) {
  // Get from the vm an observable from the messages that belong to this contract function
  return messages$.pipe(
    // Ensure the message has the same sighash than the function
    filter((message) => {
      if (sighash === null) {
        // sighash of callback
        return message.data.length === 0; // data is empty when it is from a callback function
      } else {
        return toHexString(message.data.slice(0, 4)) === sighash;
      }
    }),
    // Ensure the message is directed to this contract
    filter((message) => {
      const target = message.delegatecall ? message.codeAddress : message.to;
      return target?.toString().toLowerCase() === contractAddress.toLowerCase();
    }),
    map((message) => parseMessage(message, contractInterface, sighash)),
    share()
  );
}

function fillProgrammableContractFunction(fn: ProgrammableContractFunction, logic: ProgrammableFunctionLogic): any {
  return Object.assign(fn, {
    _watchable: logic,
    atCall: logic.atCall.bind(logic),
    getCall: logic.getCall.bind(logic),
    returns: logic.returns.bind(logic),
    returnsAtCall: logic.returnsAtCall.bind(logic),
    reverts: logic.reverts.bind(logic),
    revertsAtCall: logic.revertsAtCall.bind(logic),
    whenCalledWith: logic.whenCalledWith.bind(logic),
    reset: logic.reset.bind(logic),
  });
}

function parseMessage(message: Message, contractInterface: Interface, sighash: string | null): ContractCall {
  return {
    args: sighash === null ? toHexString(message.data) : getMessageArgs(message.data, contractInterface, sighash),
    nonce: Sandbox.getNextNonce(),
    value: BigInt(message.value.toString()),
    target: fromFancyAddress(message.delegatecall ? message.codeAddress : message.to!),
    delegatedFrom: message.delegatecall ? fromFancyAddress(message.to!) : undefined,
  };
}

function getMessageArgs(messageData: Buffer, contractInterface: Interface, sighash: string): unknown[] {
  try {
    return contractInterface.decodeFunctionData(contractInterface.getFunction(sighash)!!.format(), toHexString(messageData)) as unknown[];
  } catch (err) {
    throw new Error(`Failed to decode message data: ${err}`);
  }
}
