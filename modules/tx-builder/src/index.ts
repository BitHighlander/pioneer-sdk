/*

     Pioneer Tx-Builder


 */

const TAG = " | tx-builder | "
const log = require("@pioneer-platform/loggerdog")()
import * as core from "@shapeshiftoss/hdwallet-core";
//requires
const coinSelect = require('coinselect')
let {
    xpubConvert,
    bip32ToAddressNList
} = require('@pioneer-platform/pioneer-coins')

export class TxBuilder {
    private pioneer: any
    private init: (tx: any) => Promise<any>;
    private transfer: (tx: any) => Promise<any>;
    private buildTx: (tx: any) => Promise<any>;



    constructor(pioneer:any,config:any) {
        this.pioneer = pioneer
        this.init = async function (wallet:any) {
            let tag = TAG + " | init | "
            try {
                

                
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.transfer = async function (tx:any) {
            let tag = TAG + " | transfer | "
            try {
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
                        if(!tx.pubkey.pubkey) throw Error("Failed to get pubkey!")

                        let unspentInputs = await this.pioneer.instance.ListUnspent({network:"BTC",xpub:tx.pubkey.pubkey})
                        unspentInputs = unspentInputs.data
                        log.info(tag,"unspentInputs: ",unspentInputs)

                        //prepaire coinselect
                        let utxos = []
                        for(let i = 0; i < unspentInputs.length; i++){
                            let input = unspentInputs[i]
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
                            let input = {
                                addressNList:bip32ToAddressNList(inputInfo.path),
                                scriptType:core.BTCInputScriptType.SpendWitness,
                                amount:String(inputInfo.value),
                                vout:inputInfo.vout,
                                txid:inputInfo.txId,
                                segwit:false,
                                hex:inputInfo.hex,
                                tx:inputInfo.tx
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
                        let changeAddress = tx.pubkey.address
                        log.info(tag,"changeAddress: ",changeAddress)

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
                                    scriptType:core.BTCInputScriptType.SpendWitness,
                                    amount:String(outputInfo.value),
                                    isChange: false,
                                }
                                if(output.address)outputsFinal.push(output)
                            } else {
                                //change
                                let output = {
                                    address:changeAddress,
                                    addressType:"spend",
                                    scriptType:core.BTCInputScriptType.SpendWitness,
                                    amount:String(outputInfo.value),
                                    isChange: true,
                                }
                                if(output.address)outputsFinal.push(output)
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
                        break;
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
                    case 'transfer':
                        txUnsigned = await this.transfer(tx)
                        log.info(tag,"txUnsigned: DOUBLE final ",txUnsigned)
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

