import { MockContract, MockContractFactory, smock } from '@src';
import { Counter, Counter__factory } from '@typechained';
import chai, { expect } from 'chai';

chai.should();
chai.use(smock.matchers);

describe('Mock: Call through', () => {
  let counterFactory: MockContractFactory<Counter__factory>;
  let mock: MockContract<Counter>;

  before(async () => {
    counterFactory = await smock.mock('Counter');
  });

  beforeEach(async () => {
    mock = await counterFactory.deploy(1);
  });

  it('should call getters', async () => {
    expect(await mock.count()).to.equal(BigInt(1));
  });

  it('should call methods', async () => {
    await mock.add(10);
    expect(await mock.count()).to.equal(BigInt(11));
  });

  it('should be able to override returns', async () => {
    mock.count.returns(123);
    expect(await mock.count()).to.equal(BigInt(123));
  });

  it('should be able to override a function that reverts', async () => {
    mock.doRevert.returns(true);
    expect(await mock.doRevert()).to.equal(true);
  });

  it('should be able to check function calls', async () => {
    await mock.add(10n);
    expect(mock.add).to.be.calledOnceWith(10n);
  });
});
