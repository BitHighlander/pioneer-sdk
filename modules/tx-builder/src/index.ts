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
    baseAmountToNative,
    nativeToBaseAmount
} = require('@pioneer-platform/pioneer-coins')

export class TxBuilder {
    private pioneer: any
    private init: (tx: any) => Promise<any>;
    private transfer: (tx: any) => Promise<any>;
    private buildTx: (tx: any) => Promise<any>;
    private swap: (tx: any) => Promise<any>;
    private lp: (tx: any) => Promise<any>;
    
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
        this.transfer = async function (tx:any) {
            let tag = TAG + " | transfer | "
            try {
                log.debug(tag,"tx: ",tx)

                let unsignedTx:any
                const expr = tx.blockchain;
                switch (expr) {
                    case 'bitcoin':
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
                        log.debug(tag,"tx.pubkey.pubkey: ",tx.pubkey.pubkey)
                        
                        // log.debug(tag,"pioneer: ",this.pioneer.instance)
                        // log.debug(tag,"tx.pubkey.pubkey: ",tx)
                        let unspentInputs = await this.pioneer.instance.ListUnspent({network:"BTC",xpub:tx.pubkey.pubkey})
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
                        log.info(tag,"utxos: ",utxos)
                        //if no utxo's
                        if (utxos.length === 0){
                            throw Error("101 YOUR BROKE! no UTXO's found! ")
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
                        let memo = null
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
                            let input = {
                                addressNList:bip32ToAddressNList(inputInfo.path) || '',
                                //@TODO switch based on pubkey type
                                scriptType:"p2wpkh",
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
                                    address:toAddress,
                                    addressType:"spend",
                                    // scriptType:core.BTCInputScriptType.SpendWitness,
                                    amount:String(outputInfo.value)
                                }
                                outputsFinal.push(output)
                            } else {
                                // if(!tx.pubkey.pathMaster) throw Error("Invalid pubkey! missing pathMaster!")
                                let output = {
                                    // address:changeAddress,
                                    //@TODO move this to last not used
                                    //@TODO FOR THE LOVE GOD CHANGE THIS PER PUBKEY USED!
                                    // addressNList: bip32ToAddressNList(tx.pubkey.pathMaster),
                                    addressNList: bip32ToAddressNList("m/84'/0'/0'/0/0"),
                                    addressType:"change",
                                    scriptType:core.BTCInputScriptType.SpendWitness,
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
                                coin: 'Bitcoin',
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
                        let from = tx.pubkey.address
                        if(!from) throw Error("Invalid pubkey! missing address!")
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
                        const HD_RUNE_KEYPATH="m/44'/931'/0'/0/0"
                        const RUNE_CHAIN="thorchain"
                        const RUNE_BASE=100000000

                        let amountNative = baseAmountToNative(tx.asset,tx.amount)
                        log.debug(tag,"amountNative: ",amountNative)

                        //get account number
                        let addressFrom = tx.pubkey.address
                        log.debug(tag,"addressFrom: ",addressFrom)
                        if(!addressFrom) throw Error("Missing, addressFrom!")
                        if(!tx.toAddress) throw Error("Missing, toAddress!")

                        let masterInfo = await this.pioneer.instance.GetAccountInfo({network:'RUNE',address:addressFrom})
                        masterInfo = masterInfo.data
                        log.debug(tag,"masterInfo: ",masterInfo.data)

                        let sequence = masterInfo.result.value.sequence || 0
                        let account_number = masterInfo.result.value.account_number
                        sequence = parseInt(sequence)
                        sequence = sequence.toString()

                        let txType = "thorchain/MsgSend"
                        let gas = "650000"
                        let fee = "0"
                        let memoThorchain = tx.memo || ""

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
                            "signatures": null
                        }

                        let	chain_id = RUNE_CHAIN

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
                    default:
                        throw Error("unhandled!: "+expr)
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

