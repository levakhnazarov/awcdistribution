const Web3 = require('web3')
const fs = require('fs')
const csv = require('fast-csv')
const nodejsArgv = require('nodejs-argv')


const argv = nodejsArgv.new()
const Big = require('big.js')
const abi = require('./ABI.json')


argv.option([
  ['-c', '--contract', '0x41e5560054824eA6B0732E656E3Ad64E20e94E45', 'contract address'],
  ['-p', '--pk', '', 'private key'],
  ['-n', '--nonce', '', 'nonce'],
  ['-g', '--gas', '', 'gas coefficent'],
  ['-f', '--from', '0xd32a257656f197626d3dfa5069237ebf81e739e7', 'sender address'],
])

try {
  argv.parse()
  argv.get('-c')
  argv.get('-p')
  argv.get('-f')
} catch (error) {
  throw new Error(error)
}


const ETH_NODE_URL = 'https://eth.guarda.co'
const ETH_CHAIN_ID = 1
const contractAddress = argv.get('-c')
const privateKey = argv.get('-p')
const addressFrom = argv.get('-f')
const gas = argv.get('-g')
const existedNonce = argv.get('-n')
const provider = new Web3.providers.HttpProvider(ETH_NODE_URL)

const web3 = new Web3(provider)
const account = web3.eth.accounts.privateKeyToAccount(privateKey)

const recipientsArr = []


const sendTransaction = function (address, amount, privateKey, gas, gasPrice, input, isTokenTransaction, nonce, addressFrom) {
  return new Promise((resolve, reject) => {
    const transaction = {
      nonce,
      data: input,
      gasPrice: Math.floor(gasPrice),
      to: address,
      value: amount,
      gas: Math.floor(gas),
      chainId: ETH_CHAIN_ID,
    }

    web3.eth.accounts.signTransaction(transaction, privateKey)
      .then((signedTransaction) => {
        web3.eth.sendSignedTransaction(signedTransaction.rawTransaction)
          .once('transactionHash', (hash) => {
            console.log([`transferToReceiver Trx Hash:${hash}`])
            resolve(1)
          })
          .once('receipt', (receipt) => { console.log(['transferToReceiver Receipt:', receipt]) })
          .on('confirmation', (confirmationNumber) => { console.log(`transferToReceiver confirmation: ${confirmationNumber}`) })
          .on('error', console.error)
          .then((receipt) => {
            console.log(receipt)
          })
          .catch((error) => {
            reject(error.message)
          })
      })
  })
}

const main = async function () {
  let nonce = await web3.eth.getTransactionCount(addressFrom)
  if(existedNonce > 0) {
    nonce = existedNonce
  }
  let gasPrice = await web3.eth.getGasPrice()

  gasPrice = +((new Big(gasPrice)).times(gas))
  for (let x = 0, ln = recipientsArr.length; x < ln; x++) {
    setTimeout((coin) => {
      nonce++
      console.log(coin)
      const contract = new web3.eth.Contract(abi, contractAddress, { from: addressFrom })
      const contractMethod = contract.methods.transfer(coin.addr, coin.amount).encodeABI()

      sendTransaction(contractAddress, web3.utils.toHex('0x0'), privateKey, 250000, gasPrice, contractMethod, true, nonce, coin.addr)
        .then((send) => {
          console.log(send)
        })
    }, x * 30000, recipientsArr[x])
  }
}

csv
  .fromPath('file.csv')
  .on('data', (data) => {
    const rawAmount = parseFloat(data[1])

    if (typeof rawAmount !== 'number') {
      throw new Error("amount from csv is not a number!")
    }

    const amount = +((new Big(rawAmount)).times((new Big(10)).pow(8)))


    recipientsArr.push({ addr: data[0], amount: amount })
  })
  .on('end', () => {
    main()
  })


// const batch = new web3.BatchRequest()
// for (let t in recipientsArr) {
//   let coin = recipientsArr[t]
//   nonce++
//   gasPrice = +((new Big(gasPrice)).times(1.3))
//   const contract = new web3.eth.Contract(abi, contractAddress, {from: addressFrom})
//   let contractMethod = contract.methods.transfer(coin.addr, coin.amount).encodeABI()
//   const transaction = {gasPrice: gasPrice, nonce: nonce, data: contractMethod, to: coin.addr, value: web3.utils.toHex('0x0'), gas: NETWORK_GAS, chainId: ETH_CHAIN_ID}
//   const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey)
//   batch.add(web3.eth.sendSignedTransaction.request(signedTx.rawTransaction, 'receipt', console.log))
// }
// batch.execute()
