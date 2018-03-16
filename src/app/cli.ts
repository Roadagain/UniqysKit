import { Dapp, Core } from '../chain-core/dapi'
import { ValidatorNode } from '../chain-core/validator'
import { KeyPair, Hash } from '../cryptography'
import { Transaction, TransactionData } from '../chain-core/blockchain'
import repl, { REPLServer } from 'repl'
import { GenesisConfig } from '../config/genesis'
import { KeyConfig } from '../config/key'

class CliApp implements Dapp {
  private transactions: Transaction[]
  private keyPair: KeyPair
  private nonce: number
  constructor (
    private readonly core: Core
  ) {
    this.transactions = []
    this.keyPair = new KeyPair()
    console.log(`app address: ${this.keyPair.address}`)
    this.nonce = 0
  }

  executeTransaction (tx: Transaction): void {
    this.transactions.push(tx)
  }
  getAppStateHash (): Hash {
    return Hash.fromData(`${this.transactions.length}`)
  }
  makeTransaction (data: Buffer | string): void {
    this.nonce++
    const buffer = data instanceof Buffer ? data : new Buffer(data)
    const txd = new TransactionData(this.nonce, buffer)
    this.core.sendTransaction(txd.sign(this.keyPair))
  }
}

async function start () {
  // load config
  const genesis = await new GenesisConfig().loadAsBlock('./config/genesis.json')
  const keyPair = await new KeyConfig().loadAsKeyPair('./config/validatorKey.json')
  const validator = new ValidatorNode(CliApp, genesis, keyPair)

  // start
  const replServer = repl.start()
  validator.start()

  // commands
  replServer.defineCommand('makeMessageTx', {
    help: 'make transaction include message string',
    action (this: REPLServer, message: string) {
      validator.dapp.makeTransaction(message)
      this.displayPrompt()
    }
  })
  replServer.defineCommand('readMessageTx', {
    help: 'reed messages in transactions of height',
    action (this: REPLServer, heightString: string) {
      let height = parseInt(heightString, 10)
      if (Number.isNaN(height)) {
        console.log('unrecognized block height. show latest block transactions.')
        height = validator.blockchain.height()
      }
      console.log(validator.blockchain.blockOf(height).data.transactions.items.map(tx => tx.data.data.toString()))
      this.displayPrompt()
    }
  })

  // context objects
  replServer.context.makeTransaction = (data: Buffer) => { validator.dapp.makeTransaction(data) }
  replServer.context.blockchain = validator.blockchain

  // exit
  replServer.on('exit', () => {
    validator.stop()
  })
}

/* tslint:disable-next-line:no-empty */
start().then(() => {}, (err) => { throw err })
