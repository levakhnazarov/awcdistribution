const Web3 = require('web3')
const fs = require('fs')
const csv = require('fast-csv')
const nodejs_argv = require('nodejs-argv')


const argv = nodejs_argv.new()
const Big = require('big.js')
const abi = require('./ABI.json')


const NETWORK_GAS = 250000

argv.option([
  ['-c', '--contract', '0x41e5560054824eA6B0732E656E3Ad64E20e94E45', 'contract address'],
  ['-p', '--pk', '', 'private key'],
  ['-f', '--from', '0xd32a257656f197626d3dfa5069237ebf81e739e7', 'sender address'],
])

try {
  argv.parse()
  argv.get('-c')
  argv.get('-p')
  argv.get('-f')
} catch (e) {
  throw new Error(e)
}


const ETH_NODE_URL = 'https://eth.guarda.co'
const ETH_CHAIN_ID = 1
const contractAddress = argv.get('-c')
const privateKey = argv.get('-p')
const addressFrom = argv.get('-f')
const provider = new Web3.providers.HttpProvider(ETH_NODE_URL)

const web3 = new Web3(provider)
const account = web3.eth.accounts.privateKeyToAccount(privateKey)

const recipientsArr = []

csv
  .fromPath('file.csv')
  .on('data', (data) => {
 	console.log(`${(new Big(`${data[1]}`)).times((new Big(10)).pow(8))}`)
 	recipientsArr.push({ addr: data[0], amount: `${(new Big(`${data[1]}`)).times((new Big(10)).pow(8))}` })
  })
  .on('end', () => {
    main()
  })


const main = async function () {
  let nonce = await web3.eth.getTransactionCount(addressFrom)
  let gasPrice = await web3.eth.getGasPrice()

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
  for (const t in recipientsArr) {
    const coin = recipientsArr[t]

    gasPrice = +((new Big(gasPrice)).times(1.8))
    nonce++

    const contract = new web3.eth.Contract(abi, contractAddress, { from: addressFrom })
    const contractMethod = contract.methods.transfer(coin.addr, coin.amount).encodeABI()


    const send = await sendTransaction(contractAddress, web3.utils.toHex('0x0'), privateKey, 250000, gasPrice, contractMethod, true, nonce, coin.addr)

    console.log(send)
  }
}

const sendTransaction = function (address, amount, privateKey, gas, gasPrice, input, isTokenTransaction, nonce, addressFrom) {
  return new Promise((resolve, reject) => {
    const transaction = { nonce, data: input, gasPrice, to: address, value: amount, gas, chainId: ETH_CHAIN_ID }

    web3.eth.accounts.signTransaction(transaction, privateKey)
      .then((signedTransaction) => {
        web3.eth.sendSignedTransaction(signedTransaction.rawTransaction)
 		.once('transactionHash', (hash) => {
 			console.log([`transferToReceiver ${coin.addr} Trx Hash:${hash}`])
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
