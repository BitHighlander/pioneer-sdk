/*

     Pioneer SDK
        A typescript sdk for integrating cryptocurrency wallets info apps


    curl -d "param1=value1&param2=value2" -X POST http://localhost:1646/send

 */

const TAG = " | Pioneer-sdk | "
const log = require("@pioneer-platform/loggerdog")()
let {
    blockchains,
    getPaths,
    getPrecision,
    getExplorerUrl,
    getExplorerAddressUrl,
    getExplorerTxUrl,
    baseAmountToNative,
    nativeToBaseAmount,
    getNativeAssetForBlockchain,
    assetToBase,
    assetAmount,
    getSwapProtocals,
    xpubConvert,
    addressNListToBIP32,
    COIN_MAP_LONG,
    COIN_MAP_KEEPKEY_LONG
} = require('@pioneer-platform/pioneer-coins')
import {
    BestRouteResponse,
    EvmTransaction,
    MetaResponse,
    RangoClient,
    TransactionStatus,
    TransactionStatusResponse,
    WalletRequiredAssets
} from "rango-sdk"
import { numberToHex } from 'web3-utils'
let pioneerApi = require("@pioneer-platform/pioneer-client")
let TxBuilder = require('@pioneer-sdk/tx-builder')
// import * as core from "@shapeshiftoss/hdwallet-core";


export class SDK {
    private wss: any;
    private username: any;
    private queryKey: any;
    private spec: any;
    private wallet: any;
    private pubkeys: any;
    private keyring: any;
    private device: any;
    private transport: any;
    private pioneer: any;
    private blockchains: any;
    private txBuilder: any;
    private user: any;
    private init: (tx: any, options: any, asset: string) => Promise<void>;
    private getPubkey: (asset:string) => Promise<any>;
    private getPubkeys: () => Promise<any>;
    private getAddress: (asset:string) => Promise<any>;
    private sendToAddress: (tx:any) => Promise<any>;

    constructor(spec:string,config:any) {
        this.blockchains = config.blockchains || blockchains
        this.wss = config.wss || 'wss://pioneers.dev'
        this.queryKey = config.queryKey // or generate?
        this.spec = config.spec || 'https://pioneers.dev/spec/swagger.json'
        this.pubkeys = []
        this.init = async function (wallet:any) {
            let tag = TAG + " | init | "
            try {
                //TODO verify init? verify blockchain support
                this.wallet = wallet

                //pioneer
                let Pioneer = new pioneerApi(config.spec,config)
                this.pioneer = await Pioneer.init()

                //init tx builder
                log.info(tag,"TxBuilder.TxBuilder: ",TxBuilder)
                this.txBuilder = new TxBuilder.TxBuilder(this.pioneer, config)
                log.info(tag,"txBuilder: ",this.txBuilder)

                //get status from server
                let status = await this.pioneer.instance.Health()
                if(!status.data.online) throw Error("Pioneer Server offline!")
                log.info(tag,"pioneer status: ",status.data)
                
                //get user info
                let userInfo = await this.pioneer.instance.User()
                userInfo = userInfo.data
                this.user = userInfo

                //TODO verify ETH address match

                if(!userInfo.success) {
                    //no wallets paired
                    log.info(tag, "user not registered! info: ",userInfo)

                    //get pubkeys
                    let pubkeys = await this.getPubkeys()
                    log.info(tag, "pubkeys: ",pubkeys)

                    //register
                    let register = {
                        username:this.username,
                        blockchains:this.blockchains,
                        context:pubkeys.context,
                        walletDescription:{
                            context:pubkeys.context,
                            type:'keepkey'
                        },
                        data:{
                            pubkeys:pubkeys.pubkeys
                        },
                        queryKey:this.queryKey,
                        auth:'lol',
                        provider:'lol'
                    }

                    log.debug(tag,"register payload: ",register)
                    let result = await this.pioneer.instance.Register(null, register)
                    result = result.data
                    log.info(tag,"register result: ",result)
                    this.user = result
                    
                    //TODO events
                    // //sub to pairings
                    // this.events.subscribeToKey()

                } else if(userInfo.success) {
                    log.info(tag,"userInfo: ",userInfo)
                    //this.isPaired = true
                    
                }
                
                return this.user
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.getPubkeys = async function () {
            let tag = TAG + " | getPubkeys | "
            try {
                let output:any = {}
                log.info(tag,"checkpoint")
                if(!this.wallet) throw Error("Wallet not init!")
                if(!this.blockchains) throw Error("blockchains not set!")

                //get paths for blockchains
                let paths = getPaths(this.blockchains)
                if(!paths || paths.length === 0) throw Error("Failed to get paths!")
                //verify paths
                for(let i = 0; i < this.blockchains.length; i++){
                    let blockchain = this.blockchains[i]
                    let symbol = getNativeAssetForBlockchain(blockchain)
                    log.info(tag,"symbol: ",symbol)
                    //find in pubkeys
                    let isFound = paths.find((path: { blockchain: string; }) => {
                        return path.blockchain === blockchain
                    })
                    if(!isFound){
                        throw Error("Failed to find path for blockchain: "+blockchain)
                    }
                }
                //if keepkey
                log.info(tag,"checkpoint: ",this.wallet.getVendor())
                log.info(tag,"checkpoint: ",await this.wallet.getVendor())
                // if(this.wallet.getVendor() === 'KeepKey' || true){
                //     log.info(tag,"Is keepkey, format pubkeys")
                //     let pathsKeepkey:any = []
                //     for(let i = 0; i < paths.length; i++){
                //         let path = paths[i]
                //         let pathForKeepkey:any = {}
                //         //send coin as bitcoin
                //         pathForKeepkey.symbol = path.symbol
                //         pathForKeepkey.addressNList = path.addressNList
                //         //why
                //         pathForKeepkey.coin = 'Bitcoin'
                //         pathForKeepkey.script_type = 'p2pkh'
                //         //showDisplay
                //         pathForKeepkey.showDisplay = false
                //         pathsKeepkey.push(pathForKeepkey)
                //     }
                //
                //     log.notice("***** paths IN: ",pathsKeepkey.length)
                //     log.notice("***** paths IN: ",pathsKeepkey)
                //     //
                //     log.info(tag,"this.wallet: ",this.wallet)
                //     let result = await this.wallet.getPublicKeys(pathsKeepkey)
                //     log.info(tag,"pubkeys: ",pubkeys)
                // }

                log.info(tag,"Is keepkey, format pubkeys")
                let pathsKeepkey:any = []
                for(let i = 0; i < paths.length; i++){
                    let path = paths[i]
                    let pathForKeepkey:any = {}
                    //send coin as bitcoin
                    pathForKeepkey.symbol = path.symbol
                    pathForKeepkey.addressNList = path.addressNList
                    //why
                    pathForKeepkey.coin = 'Bitcoin'
                    pathForKeepkey.script_type = 'p2pkh'
                    //showDisplay
                    pathForKeepkey.showDisplay = false
                    pathsKeepkey.push(pathForKeepkey)
                }

                log.notice("***** paths IN: ",pathsKeepkey.length)
                log.notice("***** paths IN: ",pathsKeepkey)
                //
                log.info(tag,"this.wallet: ",this.wallet)
                let result = await this.wallet.getPublicKeys(pathsKeepkey)
                log.info(tag,"result: ",result)

                let pubkeys:any = []
                for(let i = 0; i < result.length; i++){
                    let pubkey:any = paths[i]
                    log.debug(tag,"pubkey: ",pubkey)
                    let normalized:any = {}
                    normalized.path = addressNListToBIP32(paths[i].addressNList)
                    normalized.pathMaster = addressNListToBIP32(paths[i].addressNListMaster)

                    log.debug(tag,"pubkey: ",pubkey)
                    normalized.source = 'keepkey'
                    if(pubkey.type === 'xpub'){
                        normalized.type = 'xpub'
                        normalized.xpub = true
                        normalized.pubkey = result[i].xpub
                        pubkey.pubkey = result[i].xpub
                    }
                    if(pubkey.type === 'zpub'){
                        normalized.type = 'zpub'
                        normalized.zpub = true
                        log.info(tag,"xpub: ",result[i].xpub)
                        if(!result[i].xpub) throw Error("Missing xpub")

                        //convert to zpub
                        let zpub = await xpubConvert(result[i].xpub,'zpub')
                        log.info(tag,"zpub: ",result[i].xpub)
                        normalized.pubkey = zpub
                        pubkey.pubkey = zpub
                    }
                    //TODO get this from supported coins? DRY
                    if(pubkey.symbol === 'ETH' || pubkey.symbol === 'RUNE' || pubkey.symbol === 'BNB' || pubkey.symbol === 'ATOM' || pubkey.symbol === 'OSMO'){
                        pubkey.pubkey = result[i].xpub
                    }
                    normalized.note = pubkey.note
                    normalized.symbol = pubkey.symbol
                    normalized.blockchain = COIN_MAP_LONG[pubkey.symbol]
                    normalized.network = COIN_MAP_LONG[pubkey.symbol]
                    //normalized.path = addressNListToBIP32(pubkey.addressNList)

                    //get master address
                    let address
                    log.info(tag,"getAddress: ",pubkey.symbol)
                    switch(pubkey.symbol) {
                        case 'BTC':
                        case 'BCH':
                        case 'DOGE':
                        case 'DASH':
                        case 'LTC':
                            log.info(tag,"address: ",{
                                addressNList:paths[i].addressNListMaster,
                                coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                scriptType: paths[i].script_type,
                                showDisplay: false
                            })
                            address = await this.wallet.btcGetAddress({
                                addressNList:paths[i].addressNListMaster,
                                coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                scriptType: paths[i].script_type,
                                showDisplay: false
                            })
                            address = address
                            log.info(tag,"address: ",address)
                            break;
                        case 'ETH':
                            log.info(tag,"address: ",{
                                addressNList:paths[i].addressNListMaster,
                                coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                scriptType: paths[i].script_type,
                                showDisplay: false
                            })
                            address = await this.wallet.ethGetAddress({
                                addressNList:paths[i].addressNListMaster,
                                coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                scriptType: paths[i].script_type,
                                showDisplay: false
                            })
                            address = address
                            break;
                        case 'RUNE':
                            address = await this.wallet.thorchainGetAddress({
                                addressNList:paths[i].addressNListMaster,
                                coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                scriptType: paths[i].script_type,
                                showDisplay: false
                            })
                            address = address
                            break;
                        case 'ATOM':
                            address = await this.wallet.cosmosGetAddress({
                                addressNList:paths[i].addressNListMaster,
                                coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                scriptType: paths[i].script_type,
                                showDisplay: false
                            })
                            address = address
                            break;
                        case 'OSMO':
                            // address = await this.wallet.osmosisGetAddress({
                            //     addressNList:paths[i].addressNListMaster,
                            //     coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                            //     scriptType: paths[i].script_type,
                            //     showDisplay: false
                            // })
                            address = "comingsoon"
                            break;
                        case 'BNB':
                            address = await this.wallet.binanceGetAddress({
                                addressNList:paths[i].addressNListMaster,
                                coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                scriptType: paths[i].script_type,
                                showDisplay: false
                            })
                            address = address
                            break;
                        default:
                            throw Error("coin not yet implemented ! coin: "+pubkey.symbol)
                        // code block
                    }
                    log.info(tag,"address: ",address)
                    if(!address){
                        log.error("Failed to get address for pubkey: ",pubkey)
                        throw Error("address master required for valid pubkey")
                    }
                    normalized.script_type = pubkey.script_type //TODO select script type?
                    if(pubkey.symbol === 'ETH' || pubkey.symbol === 'RUNE' || pubkey.symbol === 'BNB' || pubkey.symbol === 'ATOM' || pubkey.symbol === 'OSMO'){
                        normalized.type = "address"
                        normalized.pubkey = address
                    }
                    normalized.master = address
                    normalized.address = address

                    pubkeys.push(normalized)
                    this.pubkeys.push(normalized)
                }
                log.info(tag,"pubkeys:",pubkeys)
                output.pubkeys = pubkeys
                this.pubkeys = pubkeys
                if(pubkeys.length !== result.length) {
                    log.error(tag, {pathsKeepkey})
                    log.error(tag, {result})
                    throw Error("Failed to Normalize pubkeys!")
                }
                log.debug(tag,"pubkeys: (normalized) ",pubkeys.length)
                log.debug(tag,"pubkeys: (normalized) ",pubkeys)

                //add feature info to pubkey
                let keyedWallet:any = {}
                for(let i = 0; i < pubkeys.length; i++){
                    let pubkey = pubkeys[i]
                    if(!keyedWallet[pubkey.symbol]){
                        keyedWallet[pubkey.symbol] = pubkey
                    }else{
                        if(!keyedWallet['available']) keyedWallet['available'] = []
                        //add to secondary pubkeys
                        keyedWallet['available'].push(pubkey)
                    }
                }

                //verify pubkeys
                for(let i = 0; i < this.blockchains.length; i++){
                    let blockchain = this.blockchains[i]
                    let symbol = getNativeAssetForBlockchain(blockchain)
                    log.debug(tag,"symbol: ",symbol)
                    //find in pubkeys
                    let isFound = pubkeys.find((path: { blockchain: string; }) => {
                        return path.blockchain === blockchain
                    })
                    if(!isFound){
                        throw Error("Failed to find pubkey for blockchain: "+blockchain)
                    }
                    //verify master
                }

                // let features = this.wallet.features;
                // log.debug(tag,"vender: ",features)
                // log.debug(tag,"vender: ",features.deviceId)

                //keep it short but unique. label + last 4 of id
                let masterEth = await this.getAddress('ETH')
                let context = masterEth+".wallet"
                let watchWallet = {
                    "WALLET_ID": context,
                    "TYPE": "watch",
                    "CREATED": new Date().getTime(),
                    "VERSION": "0.1.3",
                    "BLOCKCHAINS: ":this.blockchains,
                    "PUBKEYS":pubkeys,
                    "WALLET_PUBLIC":keyedWallet,
                    "PATHS":paths
                }
                log.debug(tag,"writePathPub: ",watchWallet)
                output.context = context
                output.wallet = watchWallet
                return output
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.getAddress = async function (asset:string) {
            let tag = TAG + " | getAddress | "
            try {
                let output = ""
                //filter by address
                let pubkey = this.pubkeys.filter((e:any) => e.symbol === asset)[0]
                return pubkey.address
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.getPubkey = async function (asset:string) {
            let tag = TAG + " | getPubkey | "
            try {
                let output = ""
                //filter by address
                let pubkey = this.pubkeys.filter((e:any) => e.symbol === asset)[0]
                return pubkey
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.swap = async function (swap:any) {
            let tag = TAG + " | swap | "
            try {

                return pubkey
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.sendToAddress = async function (tx:any) {
            let tag = TAG + " | sendToAddress | "
            try {
                //TODO select wallet
                //TODO validate address
                //TODO check balance
                if(!tx.asset) throw Error("Invalid tx! missing asset")

                //transferTx
                let transferTx = {
                    type:"transfer",
                    blockchain:tx.blockchain,
                    asset:tx.asset,
                    toAddress:tx.address,
                    amount:tx.amount,
                    pubkey: await this.getPubkey(tx.asset)
                }
                
                //unsignedTx
                let unsignedTx = await this.txBuilder.buildTx(transferTx)
                log.info(tag,"unsignedTx: ",unsignedTx)
                log.info(tag,"unsignedTx: ",JSON.stringify(unsignedTx))

                let txSigned:any
                const expr = tx.blockchain;
                switch (expr) {
                    case 'bitcoin':

                        txSigned = await this.wallet.btcSignTx(unsignedTx)
                        break;
                    default:
                        throw Error("type not supported! type"+expr)
                }
                log.info(tag,"txSigned: ",txSigned)
                
                //broadcast
                // let broadcastBodyTransfer = {
                //     network:tx.asset,
                //     serialized:txSigned.serializedTx,
                //     txid:"unknown",
                //     invocationId:"unknown"
                // }
                // let resultBroadcastTransfer = await this.pioneer.instance.Broadcast(null,broadcastBodyTransfer)
                // console.log("resultBroadcast: ",resultBroadcastTransfer)
                return txSigned
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
    }
}

