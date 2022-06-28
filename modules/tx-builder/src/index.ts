/*

     Pioneer Tx-Builder


 */

const TAG = " | tx-builder | "
const log = require("@pioneer-platform/loggerdog")()
import * as core from "@shapeshiftoss/hdwallet-core";
//requires
const coinSelect = require('coinselect')
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
                log.info(tag,"lp: ",lp)
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
                        log.info(tag,"{network:'OSMO',address:osmoAddress}: ",{network:'OSMO',address:osmoAddress})
                        let masterInfo = await this.pioneer.instance.GetAccountInfo({network:'OSMO',address:osmoAddress})
                        log.info(tag,"masterInfo: ",masterInfo)
                        masterInfo = masterInfo.data

                        log.info(tag,"masterInfo: ",masterInfo)
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
                log.info(tag,"unsignedTx FINAL: ",unsignedTx)
                return unsignedTx
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.swap = async function (tx:any) {
            let tag = TAG + " | swap | "
            try {
                log.info(tag,"tx: ",tx)
                let unsignedTx:any
                const expr = tx.type;
                switch (expr) {
                    case 'EVM':
                        log.info('EVM Tx type');
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
                        let transfer = {
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
                        log.info(tag,"input transfer: ",transfer)
                        let transferTx = await this.transfer(transfer)
                        log.info(tag,"transferTx: ",transferTx)
                        unsignedTx = transferTx
                        break
                    case 'COSMOS':
                        throw Error("TODO")
                    default:
                        throw Error("unhandled!: "+expr)
                }
                log.info(tag,"unsignedTx FINAL: ",unsignedTx)
                return unsignedTx
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.transfer = async function (tx:any) {
            let tag = TAG + " | transfer | "
            try {
                log.info(tag,"tx: ",tx)

                let unsignedTx:any
                const expr = tx.blockchain;
                switch (expr) {
                    case 'bitcoin':
                    case 'litecoin':
                    case 'dogecoin':
                        //
                        log.info(tag,"selectedWallets: ",tx.pubkey)
                        //get btc fee rate
                        let feeRateInfo = await this.pioneer.instance.GetFeeInfo({coin:"BTC"})
                        feeRateInfo = feeRateInfo.data
                        log.info(tag,"feeRateInfo: ",feeRateInfo)

                        //get unspent from xpub
                        log.info(tag,"tx.pubkey: ",tx.pubkey)
                        if(!tx.pubkey.pubkey) throw Error("Failed to get pubkey!")
                        if(tx.pubkey.pubkey.length < 10) throw Error("invalid pubkey!")
                        //TODO validate pubkey per network
                        log.info(tag,"tx.pubkey.pubkey: ",tx.pubkey.pubkey)
                        
                        log.info(tag,"pioneer: ",this.pioneer.instance)
                        log.info(tag,"tx.pubkey.pubkey: ",tx)
                        let unspentInputs = await this.pioneer.instance.ListUnspent({network:"BTC",xpub:tx.pubkey.pubkey})
                        unspentInputs = unspentInputs.data
                        log.info(tag,"***** WTF unspentInputs: ",unspentInputs)

                        //prepaire coinselect
                        let utxos = []
                        for(let i = 0; i < unspentInputs.length; i++){
                            let input = unspentInputs[i]
                            if(!input.path) throw Error("Invalid ListUnspent reponse! missing path!")
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

                        //if no utxo's
                        if (utxos.length === 0){
                            throw Error("101 YOUR BROKE! no UTXO's found! ")
                        }

                        //validate amount
                        // @ts-ignore Generic Transaction type incorrect
                        if(!tx.amount) throw Error("Invalid transfer Tx missing amount")
                        // @ts-ignore Generic Type wrong
                        let amountSat = parseInt(tx.amount * 100000000)
                        log.info(tag,"amountSat: ",amountSat)

                        //coinselect
                        // @ts-ignore Generic Transaction type incorrect
                        if(!tx.amount) throw Error("Invalid transfer Tx missing amount")
                        // @ts-ignore
                        let toAddress = tx.toAddress
                        if(!toAddress) throw Error("invalid tx missing toAddress")

                        let targets = [
                            {
                                address:toAddress,
                                value: amountSat
                            }
                        ]

                        // @ts-ignore Generic Transaction type incorrect
                        let memo = null
                        if(tx.memo) {
                            memo = tx.memo
                        }

                        //coinselect
                        log.info(tag,"input coinSelect: ",{utxos, targets, feeRateInfo})
                        let selectedResults = coinSelect(utxos, targets, feeRateInfo)
                        log.info(tag,"result coinselect algo: ",selectedResults)

                        //if fee > available
                        if(!selectedResults.inputs){
                            throw Error("Fee exceeded total available inputs!")
                        }

                        //buildTx
                        let inputs = []
                        for(let i = 0; i < selectedResults.inputs.length; i++){
                            //get input info
                            let inputInfo = selectedResults.inputs[i]
                            log.info(tag,"inputInfo: ",inputInfo)
                            if(!inputInfo.path) throw Error("failed to get path for input!")
                            let input = {
                                addressNList:bip32ToAddressNList(inputInfo.path) || '',
                                scriptType:"p2wpkh",
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
                        // log.info(tag,"changeAddressIndex: ",changeAddressIndex)
                        //
                        // //let changePath
                        // let changePath =

                        //use master (hack)
                        log.info(tag,"tx.pubkey: ",tx.pubkey)
                        let changeAddress = tx.pubkey.address || tx.pubkey.master
                        if(!changeAddress) throw Error("Missing change address!!!")
                        log.info(tag,"*** changeAddress: ",changeAddress)

                        const outputsFinal:any = []
                        log.info(tag,"selectedResults.outputs: ",selectedResults.outputs)
                        log.info(tag,"outputsFinal: ",outputsFinal)
                        for(let i = 0; i < selectedResults.outputs.length; i++){
                            let outputInfo = selectedResults.outputs[i]
                            log.info(tag,"outputInfo: ",outputInfo)
                            if(outputInfo.address){
                                //not change
                                let output = {
                                    address:toAddress,
                                    addressType:"spend",
                                    // scriptType:core.BTCInputScriptType.SpendWitness,
                                    amount:String(outputInfo.value)
                                }
                                if(output.address)outputsFinal.push(output)
                            } else {
                                //change
                                let output = {
                                    // address:changeAddress,
                                    //TODO move this to last not used
                                    addressNList: bip32ToAddressNList("m/44'/0'/0'/0/0"),
                                    addressType:"change",
                                    scriptType:core.BTCInputScriptType.SpendWitness,
                                    amount:String(outputInfo.value),
                                    isChange: true,
                                }
                                if(output.addressNList)outputsFinal.push(output)
                            }
                            log.info(tag,i,"outputsFinal: ",outputsFinal)
                        }
                        log.info(tag,"outputsFinal: ",outputsFinal)
                        //buildTx
                        let hdwalletTxDescription:any = {
                            coin: 'Bitcoin',
                            inputs,
                            outputs:outputsFinal,
                            version: 1,
                            locktime: 0,
                        }
                        log.info(tag,"hdwalletTxDescription: ",hdwalletTxDescription)
                        if(memo) hdwalletTxDescription.opReturnData = memo,
                        log.info(tag,"hdwalletTxDescription: ",hdwalletTxDescription)
                        unsignedTx = hdwalletTxDescription
                        log.info(tag,"unsignedTx pre: ",unsignedTx)
                        log.info(tag,"*** unsignedTx pre: ",JSON.stringify(unsignedTx))
                        break;
                    case 'ethereum':
                        //#TODO handle erc20
                        log.info('EVM Tx type');
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

                        let value = baseAmountToNative('ETH',tx.amount)
                        if(!value) throw Error("unable to get value!")
                        log.info(tag,"value: ",value)

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
                        log.info(tag,"amountNative: ",amountNative)

                        //get account number
                        let addressFrom = tx.pubkey.address
                        log.info(tag,"addressFrom: ",addressFrom)
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
                log.info(tag,"unsignedTx FINAL: ",unsignedTx)
                return unsignedTx
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.buildTx = async function (tx:any) {
            let tag = TAG + " | buildTx | "
            try {
                let txUnsigned:any
                const expr = tx.type;
                switch (expr) {
                    case 'swap':
                        txUnsigned = await this.transfer(tx)
                        log.info(tag,"txUnsigned: final ",txUnsigned)
                        break;
                    case 'transfer':
                        txUnsigned = await this.transfer(tx)
                        log.info(tag,"txUnsigned: final ",txUnsigned)
                        break;
                    default:
                        throw Error("type not supported! type"+expr)
                }
                
                return txUnsigned
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
    }
}

