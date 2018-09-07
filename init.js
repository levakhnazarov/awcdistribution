// const fs = require('fs')
const Web3 = require('web3')
const Big = require('big.js')
const csv = require('fast-csv')
const nodejsArgv = require('nodejs-argv')

const abi = require('./ABI.json')


const argv = nodejsArgv.new()

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
} catch (error) {
  throw new Error(error)
}

const NETWORK_GAS = 250000
const GAS_MULTIPLIER = 1.8
const ETH_NODE_URL = 'https://eth.guarda.co'
const ETH_CHAIN_ID = 1

const privateKey = argv.get('-p')
const addressFrom = argv.get('-f')
const contractAddress = argv.get('-c')

const provider = new Web3.providers.HttpProvider(ETH_NODE_URL)
const web3 = new Web3(provider)
// const account = web3.eth.accounts.privateKeyToAccount(privateKey)

function sendTransaction (
  address,
  amount,
  privateKey,
  gas,
  gasPrice,
  input,
  isTokenTransaction,
  nonce,
  addressFrom
) {
  return new Promise((resolve, reject) => {
    const transaction = {
      nonce,
      data: input,
      gasPrice,
      to: address,
      value: amount,
      gas,
      chainId: ETH_CHAIN_ID,
    }

    web3.eth.accounts.signTransaction(transaction, privateKey)
      .then((signedTransaction) => {
        web3.eth.sendSignedTransaction(signedTransaction.rawTransaction)
          .once('transactionHash', (hash) => {
            // console.log([`transferToReceiver ${coin.addr} Trx Hash:${hash}`])
            resolve(1)
          })
          .once('receipt', (receipt) => {
            console.log(['transferToReceiver Receipt:', receipt])
          })
          .on('confirmation', (confirmationNumber) => {
            console.log(`transferToReceiver confirmation: ${confirmationNumber}`)
          })
          .on('error', console.error)
          .then((receipt) => {
            console.log(receipt)
          })
          .catch(reject)
      })
  })
}

const recipientsArr = []

csv
  .fromPath('file.csv')
  .on('data', (data) => {
    console.log(`${(new Big(`${data[1]}`)).times((new Big(10)).pow(8))}`)
    recipientsArr.push({
      addr: data[0],
      amount: `${(new Big(`${data[1]}`)).times((new Big(10)).pow(8))}`,
    })
  })

async function main () {
  let nonce = await web3.eth.getTransactionCount(addressFrom)
  let gasPrice = await web3.eth.getGasPrice()

  // const batch = new web3.BatchRequest()
  // for (let t in recipientsArr) {
  //   let coin = recipientsArr[t]
  //   nonce++
  //   gasPrice = +((new Big(gasPrice)).times(1.3))
  //   const contract = new web3.eth.Contract(abi, contractAddress, {from: addressFrom})
  //   let contractMethod = contract.methods.transfer(coin.addr, coin.amount).encodeABI()
  //   const transaction = {
  //     gasPrice,
  //     nonce,
  //     data: contractMethod,
  //     to: coin.addr,
  //     value: web3.utils.toHex('0x0'),
  //     gas: NETWORK_GAS,
  //     chainId: ETH_CHAIN_ID
  //    }
  //   const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey)
  //
  //   batch.add(web3.eth.sendSignedTransaction.request(
  //     signedTx.rawTransaction,
  //     'receipt',
  //     console.log
  //   ))
  // }
  // batch.execute()

  for (const key in recipientsArr) {
    if (recipientsArr[key]) {
      const coin = recipientsArr[key]

      gasPrice = +((new Big(gasPrice)).times(GAS_MULTIPLIER))
      nonce++

      const contract = new web3.eth.Contract(abi, contractAddress, { from: addressFrom })
      const contractMethod = contract.methods.transfer(coin.addr, coin.amount).encodeABI()

      const send = await sendTransaction(
        contractAddress,
        web3.utils.toHex('0x0'),
        privateKey,
        NETWORK_GAS,
        gasPrice,
        contractMethod,
        true,
        nonce,
        coin.addr
      )

      console.log(send)
    }
  }
}

csv.on('end', () => {
  main()
})
