/*

     Pioneer Tx-Builder


 */

const TAG = " | tx-builder | "
const log = require("@pioneer-platform/loggerdog")()
import * as core from "@shapeshiftoss/hdwallet-core";
// @ts-ignore
import split from 'coinselect/split'
//requires
const coinSelect = require('coinselect')
let BigNumber = require('@ethersproject/bignumber')

import { numberToHex } from 'web3-utils'
let {
    xpubConvert,
    bip32ToAddressNList,
    map,
    COIN_MAP_LONG,
    COIN_MAP_KEEPKEY_LONG,
    baseAmountToNative,
    nativeToBaseAmount
} = require('@pioneer-platform/pioneer-coins')

//@TODO moveme to coins?
const HD_RUNE_KEYPATH="m/44'/931'/0'/0/0"
const RUNE_CHAIN="thorchain-mainnet-v1"
const RUNE_BASE=100000000
const HD_ATOM_KEYPATH="m/44'/118'/0'/0/0"
const ATOM_CHAIN="cosmoshub-4"
const ATOM_BASE=1000000
let GIG =  1000000000
const OSMO_CHAIN="osmosis-1"

export class TxBuilder {
    private pioneer: any
    private init: (tx: any) => Promise<any>;
    private transfer: (tx: any) => Promise<any>;
    private buildTx: (tx: any) => Promise<any>;
    private swap: (tx: any) => Promise<any>;
    private lp: (tx: any) => Promise<any>;
    private deposit: (tx: any) => Promise<any>;
    
    constructor(pioneer:any,config:any) {
        this.pioneer = pioneer
        this.init = async function (wallet:any) {
            let tag = TAG + " | init | "
            try {
                

                
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.lp = async function (lp:any) {
            let tag = TAG + " | swap | "
            try {
                log.debug(tag,"lp: ",lp)
                let unsignedTx:any
                const expr = lp.protocol;
                switch (expr) {
                    case 'ethereum':
                        throw Error("ethereum Not supported!")
                        break
                    case 'osmosis':

                        const fee = '100'
                        const gas = '1350000'
                        const osmoAddress = lp.from

                        const ibcVoucherAtomOsmo =
                            'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2'

                        let sellAmount = lp.amountleg1
                        let buyAmount = lp.amountleg2
                        log.debug(tag,"{network:'OSMO',address:osmoAddress}: ",{network:'OSMO',address:osmoAddress})
                        let masterInfo = await this.pioneer.instance.GetAccountInfo({network:'OSMO',address:osmoAddress})
                        log.debug(tag,"masterInfo: ",masterInfo)
                        masterInfo = masterInfo.data

                        log.debug(tag,"masterInfo: ",masterInfo)
                        let sequence = masterInfo.result.value.sequence || 0
                        let account_number = masterInfo.result.value.account_number
                        sequence = parseInt(String(sequence))

                        const tx1 = {
                            memo: '',
                            fee: {
                                amount: [
                                    {
                                        amount: fee.toString(),
                                        denom: 'uosmo'
                                    }
                                ],
                                gas: gas.toString()
                            },
                            signatures: null,
                            msg: [
                                {
                                    "type": "osmosis/gamm/join-pool",
                                    "value": {
                                        "sender": osmoAddress,
                                        "poolId": "1",
                                        "shareOutAmount": "402238349184328773",
                                        "tokenInMaxs": [
                                            {
                                                "denom": ibcVoucherAtomOsmo,
                                                "amount": sellAmount
                                            },
                                            {
                                                "denom": "uosmo",
                                                "amount": buyAmount
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                        const osmoAddressNList = bip32ToAddressNList("m/44'/118'/0'/0/0")
                        unsignedTx = {
                            tx: tx1,
                            addressNList: osmoAddressNList,
                            chain_id: 'osmosis-1',
                            account_number,
                            sequence
                        }
                        break
                    default:
                        throw Error("unhandled!: "+expr)
                }
                log.debug(tag,"unsignedTx FINAL: ",unsignedTx)
                return unsignedTx
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.swap = async function (tx:any) {
            let tag = TAG + " | swap | "
            try {
                log.debug(tag,"tx: ",tx)
                let unsignedTx:any
                const expr = tx.type;
                switch (expr) {
                    case 'EVM':
                        log.debug('EVM Tx type');
                        //get account info
                        let from = tx.from
                        let gas_limit = 80000

                        //get nonce
                        let nonceRemote = await this.pioneer.instance.GetNonce(from)
                        nonceRemote = nonceRemote.data

                        //get gas price
                        let gas_price = await this.pioneer.instance.GetGasPrice()
                        gas_price = gas_price.data

                        let nonce = nonceRemote // || override (for Replace manual Tx)

                        // @ts-ignore Generic Transaction type incorrect
                        if(!tx?.value) throw Error("Invalid EVM Tx missing value")
                        // @ts-ignore
                        let value = tx.value

                        // @ts-ignore Generic Transaction type incorrect
                        if(!tx?.to) throw Error("Invalid EVM Tx missing to")
                        // @ts-ignore
                        let to = tx.to

                        // @ts-ignore Generic Transaction type incorrect
                        if(!tx?.data) throw Error("Invalid EVM Tx missing data")
                        // @ts-ignore
                        let data = tx.data

                        //sign
                        let ethTx = {
                            // addressNList: support.bip32ToAddressNList(masterPathEth),
                            "addressNList":[
                                2147483692,
                                2147483708,
                                2147483648,
                                0,
                                0
                            ],
                            nonce: numberToHex(nonce),
                            gasPrice: numberToHex(gas_price),
                            gasLimit: numberToHex(gas_limit),
                            value,
                            to,
                            data,
                            // chainId: 1,//TODO more networks
                        }

                        unsignedTx = ethTx
                        break
                    case 'TRANSFER':
                        if(!tx.from) throw Error("invalid TX missing from!")
                        //asset to blockchain
                        let blockchain = COIN_MAP_LONG[tx.asset.symbol]
                        let transfer:any = {
                            type:"transfer",
                            blockchain:blockchain,
                            asset:tx.asset.symbol,
                            toAddress:tx.recipientAddress,
                            amount:nativeToBaseAmount(tx.asset.symbol, tx.amount),
                            from: {
                                pubkey:tx.from
                            },
                            pubkey: tx.pubkey
                        }
                        if(tx.memo) transfer.memo = tx.memo
                        log.debug(tag,"input transfer: ",transfer)
                        let transferTx = await this.transfer(transfer)
                        log.debug(tag,"transferTx: ",transferTx)
                        unsignedTx = transferTx
                        break
                    case 'DEPOSIT':

                        //verify deposit
                        let deposit:any = {
                            type:"deposit",
                            blockchain:COIN_MAP_LONG[tx.asset.symbol],
                            asset:tx.asset.symbol,
                            toAddress:tx.recipientAddress,
                            amount:nativeToBaseAmount(tx.asset.symbol, tx.amount),
                            memo:tx.memo,
                            from: {
                                pubkey:tx.from
                            },
                            pubkey: tx.pubkey
                        }
                        
                        let depositTx = await this.deposit(deposit)
                        log.debug(tag,"depositTx: ",depositTx)
                        unsignedTx = depositTx
                        break
                    case 'COSMOS':
                        throw Error("TODO")
                    default:
                        throw Error("unhandled!: "+expr)
                }
                log.debug(tag,"unsignedTx FINAL: ",unsignedTx)
                return unsignedTx
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.deposit = async function (deposit:any) {
            let tag = TAG + " | deposit | "
            try {
                let rawTx
                log.info(tag,"deposit: ",deposit)
                const RUNE_BASE=100000000
                
                if(deposit.blockchain !== 'thorchain') throw Error("Network not supported!"+deposit.blockchain)
                
                
                //use msgDeposit
                //get amount native
                let amountNative = RUNE_BASE * parseFloat(deposit.amount)
                amountNative = parseInt(amountNative.toString())

                let addressFrom = deposit.addressFrom || deposit.from.pubkey
                if(!addressFrom) throw Error("Invalid deposit! missing addressFrom!")

                //get account number
                log.debug(tag,"addressFrom: ",addressFrom)
                let masterInfo = await this.pioneer.instance.GetAccountInfo({network:'RUNE',address:addressFrom})
                masterInfo = masterInfo.data
                log.debug(tag,"masterInfo: ",masterInfo)

                let sequence = masterInfo.result.value.sequence || 0
                let account_number = masterInfo.result.value.account_number
                sequence = parseInt(sequence)
                sequence = sequence.toString()

                let txType = "thorchain/MsgDeposit"
                let gas = "3500000"
                let fee = "2000000"
                if(!deposit.memo) throw Error("103: invalid swap! missing memo")
                let memo = deposit.memo

                //sign tx
                let unsigned = {
                    "fee": {
                        "amount": [
                            {
                                "amount": fee,
                                "denom": "rune"
                            }
                        ],
                        "gas": gas
                    },
                    "msg": [
                        {
                            "type": txType,
                            "value": {
                                "coins": [
                                    {
                                        "amount": amountNative.toString(),
                                        "asset": "THOR.RUNE"
                                    }
                                ],
                                "memo": memo,
                                "signer": addressFrom
                            }
                        }
                    ]
                }

                let	chain_id = RUNE_CHAIN

                if(!sequence) throw Error("112: Failed to get sequence")
                if(!account_number) account_number = 0

                log.info(tag,"res: ",{
                    addressNList: bip32ToAddressNList(HD_RUNE_KEYPATH),
                    chain_id,
                    account_number: account_number,
                    sequence:sequence,
                    tx: unsigned,
                })

                log.info(tag,"******* signTx: ",JSON.stringify({
                    addressNList: bip32ToAddressNList(HD_RUNE_KEYPATH),
                    chain_id,
                    account_number: account_number,
                    sequence:sequence,
                    tx: unsigned,
                }))

                let runeTx = {
                    addressNList: bip32ToAddressNList(HD_RUNE_KEYPATH),
                    chain_id,
                    account_number: account_number,
                    sequence:sequence,
                    tx: unsigned,
                }

                //
                // let unsignedTx:any = {
                //     invocationId:deposit.invocationId,
                //     network:deposit.network,
                //     deposit,
                //     HDwalletPayload:runeTx,
                //     verbal:"Thorchain transaction"
                // }

                rawTx = runeTx
            

                return rawTx
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.transfer = async function (tx:any) {
            let tag = TAG + " | transfer | "
            try {
                log.debug(tag,"tx: ",tx)

                let unsignedTx:any
                let unsigned:any
                let addressFrom:string
                let addressTo:string
                let masterInfo:any
                let amountNative:any
                let sequence:any
                let account_number:any
                let txType:any
                let gas:any
                let fee:any
                let memo:any
                let chain_id:any

                const expr = tx.blockchain;
                switch (expr) {
                    case 'bitcoin':
                    case 'bitcoincash':
                    case 'litecoin':
                    case 'dogecoin':
                        //
                        log.debug(tag,"selectedWallets: ",tx.pubkey)
                        //get btc fee rate
                        let feeRateInfo = await this.pioneer.instance.GetFeeInfo({coin:"BTC"})
                        feeRateInfo = feeRateInfo.data
                        log.debug(tag,"feeRateInfo: ",feeRateInfo)

                        //get unspent from xpub
                        log.debug(tag,"tx.pubkey: ",tx.pubkey)
                        if(!tx.pubkey.pubkey) throw Error("Failed to get pubkey!")
                        if(tx.pubkey.pubkey.length < 10) throw Error("invalid pubkey!")
                        //TODO validate pubkey per network
                        log.info(tag,"tx.pubkey: ",tx.pubkey)
                        
                        // log.debug(tag,"pioneer: ",this.pioneer.instance)
                        // log.debug(tag,"tx.pubkey.pubkey: ",tx)
                        let pubkey = tx.pubkey.pubkey
                        log.info(tag,"tx.pubkey.pubkey: ",tx.pubkey.pubkey)
                        //@TODO use blockchain not symbol you doof
                        let unspentInputs = await this.pioneer.instance.ListUnspent({network:tx.pubkey.symbol,xpub:pubkey})
                        unspentInputs = unspentInputs.data
                        // log.debug(tag,"***** WTF unspentInputs: ",unspentInputs)

                        //prepaire coinselect
                        let utxos = []
                        for(let i = 0; i < unspentInputs.length; i++){
                            let input = unspentInputs[i]
                            if(!input.path) throw Error("Invalid ListUnspent reponse! missing path!")
                            //@TODO use 84/44 based on pubkey (note:blockbook can not know what path a pubkey was on is assumed)
                            //input.path = input.path.replace("84","44")
                            let utxo = {
                                txId:input.txid,
                                vout:input.vout,
                                value:parseInt(input.value),
                                nonWitnessUtxo: Buffer.from(input.hex, 'hex'),
                                hex: input.hex,
                                tx: input.tx,
                                path:input.path
                            }
                            utxos.push(utxo)
                        }
                        log.debug(tag,"utxos: ",utxos)
                        //if no utxo's
                        if (utxos.length === 0){
                            throw Error("101 YOUR BROKE! no UTXO's found! pubkey: network:"+tx.pubkey.symbol+" pubkey"+pubkey)
                        }

                        //validate amount
                        // @ts-ignore Generic Transaction type incorrect
                        if(!tx.amount) throw Error("Invalid transfer Tx missing amount")
                        // @ts-ignore Generic Type wrong
                        let amountSat = parseInt(tx.amount * 100000000)
                        log.debug(tag,"amountSat: ",amountSat)

                        //coinselect
                        // @ts-ignore Generic Transaction type incorrect
                        if(!tx.amount) throw Error("Invalid transfer Tx missing amount")
                        // @ts-ignore
                        let toAddress = tx.toAddress
                        if(!toAddress) throw Error("invalid tx missing toAddress")

                        // @ts-ignore Generic Transaction type incorrect
                        memo = null
                        if(tx.memo) {
                            memo = tx.memo
                        }
                        log.info(tag,"memo: ",memo)

                        //
                        let selectedResults
                        let targets
                        log.info(tag,"tx.amount: ",tx.amount)
                        if(tx.amount && typeof(tx.amount) === 'string' && tx.amount === 'MAX'){
                            targets = [
                                {
                                    address:toAddress
                                }
                            ]
                            //coinselect
                            log.debug(tag,"input coinSelect: ",{utxos, targets, feeRateInfo})
                            selectedResults = split(utxos, targets, feeRateInfo)
                            log.debug(tag,"result split algo: ",selectedResults)
                            //if fee > available
                            if(!selectedResults.inputs){
                                throw Error("Fee exceeded total available inputs!")
                            }
                        }else{
                            targets = [
                                {
                                    address:toAddress,
                                    value: amountSat
                                }
                            ]
                            //coinselect
                            log.debug(tag,"input coinSelect: ",{utxos, targets, feeRateInfo})
                            selectedResults = coinSelect(utxos, targets, feeRateInfo)
                            log.info(tag,"result coinselect algo: ",selectedResults)
                            //if fee > available
                            if(!selectedResults.inputs){
                                throw Error("Fee exceeded total available inputs!")
                            }
                        }
                        //test
                        if(selectedResults.outputs.length == targets.length){
                            log.debug(tag,"No change address found!? checking")
                        }

                        //sanity
                        let sumInputs = 0
                        for(let i = 0; i < selectedResults.inputs.length; i++){
                            let amount = selectedResults.inputs[i].value
                            sumInputs = sumInputs + amount
                        }

                        let sumOut = 0
                        for(let i = 0; i < selectedResults.outputs.length; i++){
                            let amount = selectedResults.outputs[i].value
                            sumOut = sumOut + amount
                        }
                        log.info(tag,"sumOut: ",sumOut)
                        log.info(tag,"sumInputs: ",sumInputs)

                        let feeVerify = sumInputs - sumOut
                        log.info(tag,"feeVerify: ",feeVerify)
                        log.info(tag,"selectedResults.fee: ",selectedResults.fee)


                        //buildTx
                        let inputs = []
                        for(let i = 0; i < selectedResults.inputs.length; i++){
                            //get input info
                            let inputInfo = selectedResults.inputs[i]
                            log.debug(tag,"inputInfo: ",inputInfo)
                            if(!inputInfo.path) throw Error("failed to get path for input!")
                            let scriptType
                            if(tx.pubkey.symbol === 'BTC'){
                                scriptType = "p2wpkh"
                            }else if(tx.pubkey.symbol === 'DOGE'){
                                log.info(tag,"DEBUG DOGE!")
                                scriptType = core.BTCInputScriptType.SpendAddress
                            }else{
                                scriptType = tx.pubkey.script_type
                            }
                            log.info(tag,"inputInfo scriptType: ",scriptType)
                            let input = {
                                addressNList:bip32ToAddressNList(inputInfo.path) || '',
                                scriptType,
                                //@TODO switch based on pubkey type
                                // scriptType:"p2wpkh",
                                // scriptType:"p2pkh",
                                // scriptType:core.BTCInputScriptType.SpendAddress,
                                // scriptType:core.BTCInputScriptType.SpendP2SHWitness,
                                // scriptType:core.BTCInputScriptType.SpendAddress,
                                // scriptType:core.BTCInputScriptType.SpendWitness,
                                amount:String(inputInfo.value),
                                vout:inputInfo.vout,
                                txid:inputInfo.txId,
                                // segwit:true,
                                // segwit:false,
                                hex:inputInfo.hex,
                                // tx:inputInfo.tx
                            }
                            inputs.push(input)
                        }

                        //TODO dont re-use addresses bro
                        //get change address
                        // let changeAddressIndex = await this.pioneer.instance.GetChangeAddress(null,{network:"BTC",xpub:selectedWallets["BTC-XPUB"]})
                        // changeAddressIndex = changeAddressIndex.data.changeIndex
                        // log.debug(tag,"changeAddressIndex: ",changeAddressIndex)
                        //
                        // //let changePath
                        // let changePath =

                        //use master (hack)
                        log.debug(tag,"tx.pubkey: ",tx.pubkey)
                        let changeAddress = tx.pubkey.address || tx.pubkey.master
                        if(!changeAddress) throw Error("Missing change address!!!")
                        log.debug(tag,"*** changeAddress: ",changeAddress)

                        const outputsFinal:any = []
                        log.debug(tag,"selectedResults.outputs: ",selectedResults.outputs)
                        log.debug(tag,"outputsFinal: ",outputsFinal)
                        for(let i = 0; i < selectedResults.outputs.length; i++){
                            let outputInfo = selectedResults.outputs[i]
                            log.debug(tag,"outputInfo: ",outputInfo)
                            if(outputInfo.address){
                                //not change
                                let output = {
                                    address:"bitcoincash:"+toAddress,
                                    addressType:"spend",
                                    // scriptType:core.BTCInputScriptType.SpendWitness,
                                    amount:String(outputInfo.value)
                                }
                                outputsFinal.push(output)
                            } else {
                                if(!tx.pubkey.pathMaster) throw Error("Invalid pubkey! missing pathMaster!")
                                log.info(tag,"pathMaster: ",tx.pubkey.pathMaster)

                                let scriptType
                                if(tx.pubkey.symbol === 'BTC'){
                                    scriptType = core.BTCInputScriptType.SpendWitness
                                }else if(tx.pubkey.symbol === 'BCH'){
                                    scriptType = 'cashaddr'
                                } else {
                                    scriptType = core.BTCInputScriptType.SpendAddress
                                }
                                log.info(tag,"scriptType: ",scriptType)
                                let output = {
                                    // address:changeAddress,
                                    //@TODO move this to last not used
                                    //@TODO FOR THE LOVE GOD CHANGE THIS PER PUBKEY USED!
                                    addressNList: bip32ToAddressNList(tx.pubkey.pathMaster),
                                    // addressNList: bip32ToAddressNList("m/44'/0'/0'/0/0"),
                                    // addressNList: bip32ToAddressNList("m/84'/0'/0'/0/0"),
                                    addressType:"change",
                                    // scriptType:'cashaddr',
                                    scriptType,
                                    // scriptType:core.BTCInputScriptType.SpendWitness,
                                    amount:String(outputInfo.value),
                                    isChange: true,
                                }
                                outputsFinal.push(output)
                            }
                            // log.debug(tag,i,"outputsFinal: ",outputsFinal)
                        }
                        log.debug(tag,"outputsFinal: ",outputsFinal)
                        log.debug(tag,"outputsFinal: ",outputsFinal.length)
                        log.debug(tag,"selectedResults.outputs.length: ",selectedResults.outputs.length)
                        if(outputsFinal.length === selectedResults.outputs.length){
                            //buildTx
                            let hdwalletTxDescription:any = {
                                coin: COIN_MAP_KEEPKEY_LONG[tx.pubkey.symbol],
                                inputs,
                                outputs:outputsFinal,
                                // version: 1,
                                // locktime: 0,
                            }
                            log.debug(tag,"hdwalletTxDescription: ",hdwalletTxDescription)
                            if(memo) hdwalletTxDescription.opReturnData = memo
                            log.info(tag,"memo: ",memo)
                            unsignedTx = hdwalletTxDescription
                            log.debug(tag,"unsignedTx pre: ",unsignedTx)
                            log.debug(tag,"*** unsignedTx pre: ",JSON.stringify(unsignedTx))
                        } else {
                            throw Error("World makes no sense WTF")
                        }
                        break;
                    case 'ethereum':
                        //#TODO handle erc20
                        log.debug('EVM Tx type');
                        //get account info
                        log.info('tx.pubkey: ',tx.pubkey);
                        let from = tx.pubkey.address || tx.pubkey.master
                        if(!from) throw Error("Invalid pubkey! missing address(from)!")
                        let gas_limit = 80000 //TODO dynamic? lowerme?

                        //get nonce
                        let nonceRemote = await this.pioneer.instance.GetNonce(from)
                        nonceRemote = nonceRemote.data

                        //get gas price
                        let gas_price = await this.pioneer.instance.GetGasPrice()
                        gas_price = gas_price.data

                        let nonce = nonceRemote // || override (for Replace manual Tx)
                        if(!nonce) throw Error("unable to get nonce!")

                        let value
                        //if amount = max
                        if(tx.amount === 'MAX'){
                            let ethBalance = await this.pioneer.instance.GetPubkeyBalance({asset:'ETH',pubkey:from})
                            log.debug(tag,"ethBalance: ",ethBalance)

                            let ethBalanceBase = nativeToBaseAmount(ethBalance)
                            log.info(tag,"ethBalanceBase: ",ethBalanceBase)

                            let transfer_cost = 21001
                            gas_limit = 21000
                            
                            let txFee = new BigNumber(gas_price).times(transfer_cost)
                            log.info(tag,"txFee: ",txFee)
                            log.info(tag,"txFee: ",txFee.toString())

                            let amount = ethBalance.minus(txFee)
                            log.info(tag,"amount ALL: ",amount)
                            value = amount

                        }else{
                            value = baseAmountToNative('ETH',tx.amount)
                            if(!value) throw Error("unable to get value!")
                            log.debug(tag,"value: ",value)
                        }

                        let to = tx.toAddress
                        if(!to) throw Error("unable to to address!")

                        //sign
                        let ethTx = {
                            // addressNList: support.bip32ToAddressNList(masterPathEth),
                            "addressNList":[
                                2147483692,
                                2147483708,
                                2147483648,
                                0,
                                0
                            ],
                            nonce: numberToHex(nonce),
                            gasPrice: numberToHex(gas_price),
                            gasLimit: numberToHex(gas_limit),
                            value:numberToHex(value),
                            to
                            // chainId: 1,//TODO more networks
                        }

                        unsignedTx = ethTx
                        break
                    case 'thorchain':

                        amountNative = baseAmountToNative(tx.asset,tx.amount)
                        log.debug(tag,"amountNative: ",amountNative)

                        log.info(tag,"tx: ",tx)
                        //get account number
                        addressFrom = tx.pubkey.address || tx.pubkey.master
                        log.info(tag,"addressFrom: ",addressFrom)
                        if(!addressFrom) throw Error("Missing, addressFrom!")
                        if(!tx.toAddress) throw Error("Missing, toAddress!")

                        masterInfo = await this.pioneer.instance.GetAccountInfo({network:'RUNE',address:addressFrom})
                        masterInfo = masterInfo.data
                        log.info(tag,"masterInfo: ",masterInfo.data)

                        sequence = masterInfo.result.value.sequence || 0
                        account_number = masterInfo.result.value.account_number
                        sequence = parseInt(sequence)
                        sequence = sequence.toString()
                        log.info(tag,"sequence: ",sequence)

                        txType = "thorchain/MsgSend"
                        gas = "650000" //@TODO allow custom
                        fee = "0" //@TODO allow custom
                        let memoThorchain = tx.memo || ""

                        //sign tx
                        unsigned = {
                            "fee": {
                                "amount": [
                                    {
                                        "amount": fee,
                                        "denom": "rune"
                                    }
                                ],
                                "gas": gas
                            },
                            "memo": memoThorchain,
                            "msg": [
                                {
                                    "type": txType,
                                    "value": {
                                        "amount": [
                                            {
                                                "amount": amountNative.toString(),
                                                "denom": "rune"
                                            }
                                        ],
                                        "from_address": addressFrom,
                                        "to_address": tx.toAddress
                                    }
                                }
                            ],
                            sequence,
                            account_number,
                            "signatures": null
                        }

                        chain_id = RUNE_CHAIN

                        if(!sequence) throw Error("112: Failed to get sequence")
                        if(!account_number) account_number = 0

                        let runeTx = {
                            addressNList: bip32ToAddressNList(HD_RUNE_KEYPATH),
                            chain_id,
                            account_number: account_number,
                            sequence,
                            tx: unsigned,
                        }
                        unsignedTx = runeTx
                        break
                    case 'cosmos':
                        addressFrom = tx.pubkey.address || tx.pubkey.master
                        log.info(tag,"addressFrom: ",addressFrom)
                        if(!addressFrom) throw Error("Missing, addressFrom!")
                        if(!tx.toAddress) throw Error("Missing, toAddress!")
                        //get amount native
                        amountNative = baseAmountToNative(tx.asset,tx.amount)
                        log.debug(tag,"amountNative: ",amountNative)

                        //get account number
                        log.debug(tag,"addressFrom: ",addressFrom)
                        masterInfo = await this.pioneer.instance.GetAccountInfo({network:'ATOM',address:addressFrom})
                        masterInfo = masterInfo.data
                        log.debug(tag,"masterInfo: ",masterInfo.data)

                        sequence = masterInfo.result.value.sequence
                        account_number = masterInfo.result.value.account_number
                        sequence = parseInt(sequence)
                        sequence = sequence.toString()

                        txType = "cosmos-sdk/MsgSend"
                        gas = "100000"
                        fee = "1000"
                        memo = tx.memo || ""

                        //sign tx
                        unsigned = {
                            "fee": {
                                "amount": [
                                    {
                                        "amount": fee,
                                        "denom": "uatom"
                                    }
                                ],
                                "gas": gas
                            },
                            "memo": memo,
                            "msg": [
                                {
                                    "type": txType,
                                    "value": {
                                        "amount": [
                                            {
                                                "amount": amountNative.toString(),
                                                "denom": "uatom"
                                            }
                                        ],
                                        "from_address": addressFrom,
                                        "to_address": tx.toAddress
                                    }
                                }
                            ],
                            "signatures": null
                        }

                        chain_id = ATOM_CHAIN

                        if(!sequence) throw Error("112: Failed to get sequence")
                        if(!account_number) throw Error("113: Failed to get account_number")

                        //if(fromAddress !== addressFrom) throw Error("Can not sign, address mismatch")
                        let atomTx = {
                            addressNList: bip32ToAddressNList(HD_ATOM_KEYPATH),
                            chain_id,
                            account_number: account_number,
                            sequence:sequence,
                            tx: unsigned,
                        }

                        unsignedTx = atomTx
                        break
                    case 'binance':
                        addressFrom = tx.pubkey.address || tx.pubkey.master
                        log.info(tag,"addressFrom: ",addressFrom)
                        if(!addressFrom) throw Error("Missing, addressFrom!")
                        if(!tx.toAddress) throw Error("Missing, toAddress!")
                        //get amount native
                        amountNative = baseAmountToNative(tx.asset,tx.amount)
                        log.debug(tag,"amountNative: ",amountNative)

                        //get account number
                        log.debug(tag,"addressFrom: ",addressFrom)
                        masterInfo = await this.pioneer.instance.GetAccountInfo({network:'BNB',address:addressFrom})
                        masterInfo = masterInfo.data
                        log.info(tag,"masterInfo: ",masterInfo)

                        sequence = masterInfo.result.value.sequence
                        account_number = masterInfo.result.value.account_number
                        sequence = parseInt(sequence)
                        sequence = sequence.toString()

                        memo = tx.memo || ""

                        let bnbTx = {
                            "account_number": account_number,
                            "chain_id": "Binance-Chain-Nile",
                            "data": null,
                            "memo": memo,
                            "msgs": [
                                {
                                    "inputs": [
                                        {
                                            "address": addressFrom,
                                            "coins": [
                                                {
                                                    "amount": "0",
                                                    "denom": "BNB"
                                                }
                                            ]
                                        }
                                    ],
                                    "outputs": [
                                        {
                                            "address": tx.toAddress,
                                            "coins": [
                                                {
                                                    "amount": amountNative,
                                                    "denom": "BNB"
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ],
                            "sequence": sequence,
                            "source": "1"
                        }

                        unsignedTx = bnbTx
                        break
                    default:
                        throw Error("unhandled! transfer: "+expr)
                }
                log.debug(tag,"unsignedTx FINAL: ",unsignedTx)
                return unsignedTx
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.buildTx = async function (tx:any) {
            let tag = TAG + " | buildTx | "
            try {
                let txUnsigned = await this.transfer(tx)
                log.debug(tag,"txUnsigned: final ",txUnsigned)

                //TODO moar?
                // let txUnsigned:any
                // const expr = tx.type;
                // switch (expr) {
                //     case 'swap':
                //         txUnsigned = await this.transfer(tx)
                //         log.debug(tag,"txUnsigned: final ",txUnsigned)
                //         break;
                //     case 'transfer':
                //         txUnsigned = await this.transfer(tx)
                //         log.debug(tag,"txUnsigned: final ",txUnsigned)
                //         break;
                //     default:
                //         throw Error("type not supported! type"+expr)
                // }
                
                return txUnsigned
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
    }
}

