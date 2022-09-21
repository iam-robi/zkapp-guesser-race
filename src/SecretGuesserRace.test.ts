import { SecretGuesserRace } from './SecretGuesserRace';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate
} from 'snarkyjs';

import {Answer} from "./SecretGuesserRace";

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

const initialSecretValue = "initialSecret"


function createLocalBlockchain() {
  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  return Local.testAccounts[0].privateKey;
}

async function localDeploy(
    zkAppInstance: SecretGuesserRace,
    zkAppPrivatekey: PrivateKey,
    deployerAccount: PrivateKey,
    initialSecret: Field
) {
  const txn = await Mina.transaction(deployerAccount, () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    zkAppInstance.deploy({ zkappKey: zkAppPrivatekey });
    zkAppInstance.init(initialSecret);
    zkAppInstance.sign(zkAppPrivatekey);
  });
  await txn.send().wait();
}

describe('SecretGuesser', () => {
  let deployerAccount: PrivateKey,
      zkAppAddress: PublicKey,
      zkAppPrivateKey: PrivateKey;

  beforeEach(async () => {
    await isReady;
    deployerAccount = createLocalBlockchain();
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
  });

  afterAll(async () => {
    // `shutdown()` internally calls `process.exit()` which will exit the running Jest process early.
    // Specifying a timeout of 0 is a workaround to defer `shutdown()` until Jest is done running all tests.
    // This should be fixed with https://github.com/MinaProtocol/mina/issues/10943
    setTimeout(shutdown, 0);
  });

  it('generates and deploys the `SecretGuesserRace` smart contract', async () => {
    const zkAppInstance = new SecretGuesserRace(zkAppAddress);
    const initialSecret = new Answer(initialSecretValue);
    let initialSecretHash: Field = initialSecret.toHash();
    await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount, initialSecretHash);
    const zkAppSecret = zkAppInstance.secret.get()
    expect(zkAppSecret).toEqual(initialSecretHash);
  })

  it('makes correct guess and add user as first solver', async () => {
    const zkAppInstance = new SecretGuesserRace(zkAppAddress);
    const initialSecret = new Answer(initialSecretValue);
    let initialSecretHash: Field = initialSecret.toHash();
    await localDeploy(zkAppInstance, zkAppPrivateKey, deployerAccount, initialSecretHash);
    const guesserAccount = PrivateKey.random()
    //
    //console.log("zkAppSecret",zkAppSecret.toString());
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.guess(initialSecret, guesserAccount);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send().wait();
  })

})