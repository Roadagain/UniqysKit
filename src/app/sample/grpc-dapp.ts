import { Sample } from './dapp'
import { GrpcCore } from '../../interface/rpc/grpc'
import { REPLServer } from 'repl'
import * as cli from '../cli'
import debug from 'debug'

// set logger enable
debug.enable('sample,grpc')

async function startSampleOverRpc (address: string, listen: string) {
  const dapp = new Sample()
  const grpc = new GrpcCore(address)
  // serve dapp
  const server = grpc.serve(dapp, listen)
  // start cli
  const replServer = cli.start(grpc, dapp)

  // commands
  replServer.defineCommand('makeMessageTx', {
    help: 'make transaction include message string',
    action (this: REPLServer, message: string) {
      grpc.sendTransaction(dapp.makeTransaction(message))
        .then(() => this.displayPrompt())
        .catch(err => { setImmediate(() => { throw err }) })
    }
  })

  // exit
  replServer.on('exit', () => {
    server.forceShutdown()
  })
}

async function start () {
  const core = 'localhost:56001'
  const dapp = 'localhost:56002'
  await startSampleOverRpc(core, dapp)
}

start().catch(err => { setImmediate(() => { throw err }) })
