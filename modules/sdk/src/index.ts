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
    COIN_MAP,
    COIN_MAP_LONG,
    COIN_MAP_KEEPKEY_LONG,
    getRangoBlockchainName
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
const keccak256 = require('keccak256')
let pioneerApi = require("@pioneer-platform/pioneer-client")
let TxBuilder = require('@pioneer-sdk/tx-builder')
const Events = require("@pioneer-platform/pioneer-events")
let Invoke = require("@pioneer-platform/pioneer-invoke")
// import * as core from "@shapeshiftoss/hdwallet-core";


export class SDK {
    public events: any;
    public masters:any
    public balances:any[]
    public ibcChannels:any[]
    public paymentStreams:any[]
    public wallets: any[];
    public nfts:any[]
    public totalValueUsd: number;
    public markets: any;
    public availableInputs: any;
    public availableOutputs: any;
    public contexts: any;
    public status: string;
    public apiVersion: string;
    public initialized: boolean;
    public invocationContext: string;
    public invocations: any;
    public assetContext: string;
    public assetBalanceUsdValueContext: string;
    public assetBalanceNativeContext: string;
    public invoke: any;
    private wss: any;
    public username: any;
    public queryKey: any;
    public spec: any;
    private wallet: any;
    private walletType: string;
    public paths: any;
    private pubkeys: any;
    private keyring: any;
    private device: any;
    private transport: any;
    public pioneer: any;
    private blockchains: any;
    private txBuilder: any;
    private user: any;
    private rango: any;
    private rangoApiKey: string;
    private isPaired: boolean;
    private isConnected: boolean;
    private context: string;
    private init: (tx: any, options: any, asset: string) => Promise<void>;
    public pairWallet: (wallet: any) => Promise<any>;
    private removePin: () => Promise<any>;
    private startSocket: () => Promise<any>;
    private updateContext: () => Promise<any>;
    private getPubkey: (asset:string) => Promise<any>;
    private getPubkeys: () => Promise<any>;
    private getAddress: (asset:string) => Promise<any>;
    private sendToAddress: (tx:any) => Promise<any>;
    private swapQuote: (tx:any) => Promise<any>;
    private buildSwap: (invocationId:string, swap:any) => Promise<any>;
    private swapExecute: (tx:any) => Promise<any>;
    private lpQuote: (tx:any) => Promise<any>;
    private buildLp: (tx:any) => Promise<any>;
    // private execute: (tx:any) => Promise<any>;
    private defi: (tx:any) => Promise<any>;
    //TODO Standardize
    //build
    private build: (tx:any) => Promise<any>;
    //sign
    private sign: (tx:any) => Promise<any>;
    //broadcast
    private broadcast: (tx:any) => Promise<any>;
    private updateInvocation: (tx:any) => Promise<any>;
    public deleteInvocation: (invocationId: string) => Promise<any>;
    public getInvocation: (invocationId: string) => Promise<any>;
    public getInvocations: () => Promise<any>;
    public stopSocket: () => any;
    constructor(spec:string,config:any) {
        this.status = 'preInit'
        this.apiVersion = ""
        this.initialized = false
        this.blockchains = config.blockchains || blockchains
        this.wss = config.wss || 'wss://pioneers.dev'
        this.username = config.username // or generate?
        this.queryKey = config.queryKey // or generate?
        this.spec = config.spec || 'https://pioneers.dev/spec/swagger.json'
        // this.spec = config.spec || 'https://pioneers.dev/spec/swagger.json'
        this.rangoApiKey = config.rangoApiKey || '4a624ab5-16ff-4f96-90b7-ab00ddfc342c'
        //combine custom with default paths
        this.paths = [...config.paths, ...getPaths(this.blockchains)];
        this.pubkeys = []
        this.markets = {}
        this.events = {}
        this.isPaired = false
        this.isConnected = false
        this.context = ""
        this.contexts = []
        this.pubkeys = []
        this.invocations = []
        this.balances = []
        this.markets = {}
        this.context = ""
        this.walletType = ""
        this.invocationContext = ""
        this.assetContext = ""
        this.assetBalanceNativeContext = ""
        this.assetBalanceUsdValueContext = ""
        this.wallets = []
        this.events = {}
        this.totalValueUsd = 0
        this.ibcChannels = []
        this.paymentStreams = []
        this.nfts = []
        this.init = async function (wallet?:any) {
            let tag = TAG + " | init | "
            try {
                if(!this.username) throw Error("username required!")
                if(!this.queryKey) throw Error("queryKey required!")
                if(!this.wss) throw Error("wss required!")
                await this.startSocket()

                //wallet
                if(wallet) {
                    this.wallet =  wallet
                    let isNative = await wallet?._isNative
                    let isKeepKey = await wallet?._isKeepKey
                    if(isNative) this.walletType = 'native'
                    if(isKeepKey) this.walletType = 'keepkey'
                    if(!isNative && !isKeepKey) {
                        log.info(tag,"wallet: ",wallet)
                        throw Error("can not init: Unhandled Wallet type!")
                    }
                    this.isConnected = true
                }

                //pioneer
                let Pioneer = new pioneerApi(config.spec,config)
                this.pioneer = await Pioneer.init()
                if(!this.pioneer)throw Error("Fialed to init pioneer server!")

                //rango
                this.rango = new RangoClient(this.rangoApiKey)

                //init tx builder
                log.info(tag,"TxBuilder.TxBuilder: ",TxBuilder)
                log.info(tag,"TxBuilder.TxBuilder config: ",config)
                this.txBuilder = new TxBuilder.TxBuilder(this.pioneer, config)
                log.info(tag,"txBuilder: ",this.txBuilder)

                //init invoker
                let configInvoke = {
                    queryKey:this.queryKey,
                    username:this.username,
                    spec:this.spec
                }
                //get config
                this.invoke = new Invoke(this.spec,configInvoke)
                await  this.invoke.init()

                //get health from server
                let health = await this.pioneer.instance.Health()
                if(!health.data.online) throw Error("Pioneer Server offline!")
                log.info(tag,"pioneer health: ",health.data)

                //get status from server
                let status = await this.pioneer.instance.Status()
                log.debug(tag,"pioneer status: ",status.data)
                this.markets = status.data.rango

                //build cache
                this.getInvocations()

                //get user info
                let userInfo = await this.pioneer.instance.User()
                userInfo = userInfo.data
                this.user = userInfo
                log.info(tag,"user: ",userInfo)

                //TODO verify ETH address match

                if(!userInfo || userInfo.error || userInfo?.balances.length === 0) {
                    //register user empty
                    //register
                    // let register = {
                    //     username:this.username,
                    //     blockchains:this.blockchains,
                    //     queryKey:this.queryKey,
                    //     auth:'lol',
                    //     provider:'lol'
                    // }
                    // log.debug(tag,"register payload: ",register)
                    // let result = await this.pioneer.instance.RegisterUser(null, register)
                    // log.debug(tag,"register user result: ",result)
                    // result = result.data
                    
                    //no wallets paired
                    log.info(tag, "user not registered! info: ",userInfo)
                    if(wallet){
                        await this.pairWallet(wallet)
                    }
                } else if(userInfo.balances.length > 0) {
                    log.info(tag,"CACHE FOUND! userInfo: ",userInfo.context)
                    log.info(tag,"user pubkeys: ",userInfo.pubkeys.length)
                    log.info(tag,"user balances: ",userInfo.balances.length)

                    //get available inputs (blockchains with balances)
                    this.availableInputs = userInfo.balances
                    if(this.markets && this.markets.popularTokens){
                        this.availableOutputs = this.markets.popularTokens
                    }
                    log.info(tag,"this.availableInputs: ",this.availableInputs)
                    log.info(tag,"this.availableOutputs: ",this.availableOutputs)
                    // for(let i = 0; i < userInfo.balances.length; i++){
                    //     let balance = userInfo.balances[i]
                    //     // if value > 5$
                    //     log.info(tag,"balance: ",balance)
                    //
                    //     //get info from markets
                    //     let marketInfo = this.markets.tokens.filter((e:any) => e.symbol === balance.symbol)[0]
                    //     log.info(tag,"marketInfo: ",marketInfo)
                    // }

                    //this.isPaired = true
                    this.isPaired = true
                    this.balances = userInfo.balances
                    if(userInfo.pubkeys)this.pubkeys = userInfo.pubkeys
                    if(userInfo.wallets)this.wallets = userInfo.wallets
                    this.pubkeys = userInfo.pubkeys
                    this.ibcChannels = userInfo.ibcChannels
                    this.nfts = userInfo.nfts
                    this.paymentStreams = userInfo.paymentStreams
                    this.totalValueUsd = parseFloat(userInfo.totalValueUsd)
                    this.context = userInfo.context
                    this.invocationContext = userInfo.invocationContext
                    this.assetContext = userInfo.assetContext
                    this.assetBalanceNativeContext = userInfo.assetBalanceNativeContext
                    this.assetBalanceUsdValueContext = userInfo.assetBalanceUsdValueContext
                }
                
                return this.user
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.pairWallet = async function (wallet:any) {
            let tag = TAG + " | pairWallet | "
            try {
                if(!wallet) throw Error("Must have wallet to pair!")
                if(!this.blockchains) throw Error("Must have blockchains to pair!")
                //wallet
                if(wallet) {
                    this.wallet =  wallet
                    let isNative = await wallet?._isNative
                    let isKeepKey = await wallet?._isKeepKey
                    if(isNative) this.walletType = 'native'
                    if(isKeepKey) this.walletType = 'keepkey'
                    if(!isNative && !isKeepKey) {
                        log.info(tag,"wallet: ",wallet)
                        throw Error("can not pair! Unhandled Wallet type!")
                    }
                    this.isConnected = true
                }
                //TODO what happens if already inited with wallet?
                this.wallet = wallet
                if(!this.wallet) throw Error("failed to init wallet! can not pair")
                // wallet.transport.keyring.on(["*", "*", "*"],(message:any) => {
                //     this.events.events.emit('keepkey',message)
                // })
                // wallet.transport.keyring.on(["*", "*", core.Events.PASSPHRASE_REQUEST],(message) => {
                //     this.events.events.emit('keepkey',message)
                // })
                // wallet.transport.keyring.on(["*", "*", core.Events.PIN_REQUEST],(message) => {
                //     this.events.events.emit('keepkey',message)
                // })
                
                //TODO error if server is offline
                
                //if wallet not registerd
                if(this.balances.length === 0){
                    let pubkeys = await this.getPubkeys()
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
                    log.debug(tag,"register result: ",result)
                    result = result.data

                    //get user
                    await this.updateContext()
                    //TODO verify user?
                }
                
                //TODO this needed?
                this.events.pair(this.username)
                


                return true
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.getInvocation = async function (invocationId:string) {
            let tag = TAG + " | getInvocations | "
            try {
                if(!invocationId) throw Error("invocationId required!")
                let result = await this.pioneer.instance.Invocation(invocationId)
                return result.data
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.getInvocations = async function () {
            let tag = TAG + " | getInvocations | "
            try {
                let result = await this.pioneer.instance.Invocations()
                this.invocations = result.data
                return result.data
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.deleteInvocation = async function (invocationId:string) {
            let tag = TAG + " | deleteInvocation | "
            try {
                if(!invocationId) throw Error("invocationId required!")
                let result = await this.pioneer.instance.DeleteInvocation("",{invocationId})
                return result.data
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.startSocket = function () {
            let tag = TAG + " | startSocket | "
            try {
                let configEvents:any = {
                    queryKey:this.queryKey,
                    wss:this.wss
                }
                if(this.username) configEvents.username = this.username
                //sub to events
                log.debug(tag,"configEvents: ",configEvents)
                this.events = new Events.Events(config)
                this.events.init()

                if(this.username){
                    this.events.pair(this.username)
                }

                this.events.events.on('message', (event:any) => {
                    log.debug(tag,'message event! ',event);
                    this.isPaired = true
                    this.username = event.username
                    this.updateContext()
                    this.events.pair(this.username)

                    log.info(tag,"EVENT type: ",event.type)

                });

                this.events.events.on('pairings', (event:any) => {
                    log.debug(tag,'message event! ',event);
                    this.isPaired = true
                    this.username = event.username
                    this.updateContext()
                    this.events.pair(this.username)

                    log.info(tag,"EVENT type: ",event.type)

                });

                this.events.events.on('context', (event:any) => {
                    log.debug(tag,'context set to '+event.context);
                    this.context = event.context
                    this.updateContext()
                });

                this.events.events.on('pubkey', (event:any) => {
                    log.info(tag,"pubkey event!", event)
                    //update pubkeys
                });

                this.events.events.on('balances', (event:any) => {
                    log.info(tag,"balances event!", event)
                });

                //onSign
                this.events.events.on('invocations', async (event:any) => {
                    log.info("invocation: ",event)
                    switch(event.type) {
                        case 'update':
                            break;
                        case 'signRequest':
                            log.info("signRequest: ",event.invocation.unsignedTx)
                            break;
                        default:
                            log.info(tag,"unhandled: ",event.type)
                    }
                });

                return this.events.events
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.stopSocket = function () {
            let tag = TAG + " | stopSocket | "
            try {
                this.events.disconnect()
                return this.events.events
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.updateContext = async function () {
            let tag = TAG + " | updateContext | "
            try {
                //get info
                let userInfo = await this.pioneer.instance.User()
                userInfo = userInfo.data
                log.info(tag,"userInfo: ",userInfo)

                if(userInfo.username)this.username = userInfo.username
                if(userInfo.context)this.context = userInfo.context
                if(userInfo.wallets)this.wallets = userInfo.wallets
                if(userInfo.balances)this.balances = userInfo.balances
                if(userInfo.pubkeys && this.pubkeys.length < userInfo.pubkeys.length)this.pubkeys = userInfo.pubkeys
                if(userInfo.totalValueUsd)this.totalValueUsd = parseFloat(userInfo.totalValueUsd)
                if(userInfo.invocationContext)this.invocationContext = userInfo.invocationContext
                if(userInfo.assetContext)this.assetContext = userInfo.assetContext
                if(userInfo.assetBalanceNativeContext)this.assetBalanceNativeContext = userInfo.assetBalanceNativeContext
                if(userInfo.assetBalanceUsdValueContext)this.assetBalanceUsdValueContext = userInfo.assetBalanceUsdValueContext

                return userInfo
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.getPubkeys = async function () {
            let tag = TAG + " | getPubkeys | "
            try {
                let output:any = {}
                log.info(tag,"checkpoint")
                log.info(tag,"this.wallet: ",this.wallet)
                if(!this.wallet) throw Error("can not get pubkeys! Wallet not init!")
                if(!this.blockchains) throw Error("blockchains not set!")

                //get paths for blockchains
                // let paths = getPaths(this.blockchains)
                // //combine with local paths
                // this.paths = [...this.paths, ...getPaths(this.blockchains)];
                
                let paths = this.paths
                log.info(tag,"paths: ",paths)

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

                log.info(tag,"Is keepkey, format pubkeys")
                let pathsKeepkey:any = []
                for(let i = 0; i < paths.length; i++){
                    let path = paths[i]
                    let pathForKeepkey:any = {}
                    //send coin as bitcoin
                    pathForKeepkey.symbol = path.symbol
                    pathForKeepkey.addressNList = path.addressNList
                    //why
                    pathForKeepkey.coin = 'bitcoin'
                    pathForKeepkey.script_type = 'p2pkh'
                    //showDisplay
                    pathForKeepkey.showDisplay = false
                    pathsKeepkey.push(pathForKeepkey)
                }

                log.info("***** paths IN: ",pathsKeepkey.length)
                log.info("***** paths IN: ",pathsKeepkey)

                //verify paths for each enabled blockchain
                for(let i = 0; i < this.blockchains.length; i++){
                    let blockchain = this.blockchains[i]
                    log.debug(tag,"blockchain: ",blockchain)

                    //find blockchain in path
                    let isFound = paths.find((path: { blockchain: string; }) => {
                        return path.blockchain === blockchain
                    })
                    if(!isFound){
                        throw Error("Failed to find path for blockchain: "+blockchain)
                    }
                }

                //this.wallet
                log.info(tag,"this.wallet: ",this.wallet)
                let result = await this.wallet.getPublicKeys(pathsKeepkey)
                // if(this.walletType === 'keepkey'){
                //     result = await this.wallet.getPublicKeys(pathsKeepkey)
                // } else if(this.walletType === 'native'){
                //     log.info(tag,"pathsKeepkey: ",pathsKeepkey )
                //     result = await this.wallet.getPublicKeys(pathsKeepkey)
                // } else {
                //     throw Error("unhandled wallet")
                // }
                log.info(tag,"result: ",result)
                if(!result) throw Error("failed to get pubkeys!")


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
                    log.info(tag,"symbol: ",pubkey.symbol)
                    switch(pubkey.symbol) {
                        case 'BTC':
                        case 'BCH':
                        case 'DOGE':
                        case 'DASH':
                        case 'LTC':
                            address = await this.wallet.btcGetAddress({
                                addressNList:paths[i].addressNListMaster,
                                coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                scriptType: paths[i].script_type,
                                showDisplay: false
                            })

                            log.info(tag,"address: ",address)
                            break;
                        case 'ETH':
                            address = await this.wallet.ethGetAddress({
                                addressNList:paths[i].addressNListMaster,
                                coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                scriptType: paths[i].script_type,
                                showDisplay: false
                            })
                            break;
                        case 'RUNE':
                            address = await this.wallet.thorchainGetAddress({
                                addressNList:paths[i].addressNListMaster,
                                coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                scriptType: paths[i].script_type,
                                showDisplay: false
                            })
                            break;
                        case 'ATOM':
                            address = await this.wallet.cosmosGetAddress({
                                addressNList:paths[i].addressNListMaster,
                                coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                scriptType: paths[i].script_type,
                                showDisplay: false
                            })
                            break;
                        case 'OSMO':
                            if(this.wallet.supportsOsmosis){
                                address = await this.wallet.osmosisGetAddress({
                                    addressNList:paths[i].addressNListMaster,
                                    coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                    scriptType: paths[i].script_type,
                                    showDisplay: false
                                })
                            } else {
                                //TODO handle this better bro!
                                address = 'NOT:SUPPORTED'
                            }
                            break;
                        case 'BNB':
                            address = await this.wallet.binanceGetAddress({
                                addressNList:paths[i].addressNListMaster,
                                coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                scriptType: paths[i].script_type,
                                showDisplay: false
                            })

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
        this.removePin = async function () {
            let tag = TAG + " | removePin | "
            try {
                this.wallet.removePin()
                return true
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.getAddress = async function (asset:string) {
            let tag = TAG + " | getAddress | "
            try {
                let output = ""
                //filter by address
                let pubkey = this.pubkeys.filter((e:any) => e.symbol === asset)[0]
                return pubkey.address || pubkey.master
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
        this.updateInvocation = async function (updateBody:any) {
            let tag = TAG + " | updateInvocation | "
            try {
                let output = await this.pioneer.instance.UpdateInvocation(null,updateBody)
                return output.data;
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.build = async function (tx:any) {
            let tag = TAG + " | build | "
            try {
                if(!tx.type) throw Error("invalid buildTx payload!")
                
                
                let unsignedTx:any
                let invocation:any
                switch(tx.type) {
                    case 'sendToAddress':
                        //TODO validate payload
                        unsignedTx = await this.sendToAddress(tx.payload)

                        invocation = {
                            type:'sendToAddress',
                            network:tx.payload.asset, //TODO move network to blockahin
                            context:this.context,
                            username:this.username,
                            tx:tx.payload,
                            unsignedTx
                        }
                        break;
                    case 'swap':
                        //TODO validate payload
                        let quote = await this.swapQuote(tx.payload)
                        log.info(tag,"quote: ",quote)
                        let invocationId = quote.invocationId

                        //handle error
                        if(!quote.success){
                            //verbose error handling
                            log.error(tag,"verbose error: ",JSON.stringify(quote))
                            throw Error("Failed to Create quote! unable to find a swap route! try again later.")
                        }

                        //buildTx
                        unsignedTx = await this.buildSwap(invocationId,tx.payload)
                        log.info(tag,"unsignedTx: ",unsignedTx)
                        if(!unsignedTx) throw Error("Missing unsignedTx!")

                        let network = tx.payload.input.asset
                        if(!network) throw Error("missing input asset! invalid swap!")
                        invocation = {
                            type:'swap',
                            network:tx.payload.input.asset, //TODO move network to blockahin
                            context:this.context,
                            username:this.username,
                            swap:tx.payload,
                            tx:quote,
                            invocationId,
                            unsignedTx
                        }
                        break;
                    default:
                        throw Error("Unhandled tx type! "+tx.type)
                    // code block
                }
                if(!unsignedTx) throw Error("failed to create unsigned tx!")
                if(!invocation) throw Error("failed to create invocation!")
                
                log.debug(tag,"invocation: ",invocation)
                let result = await this.invoke.invoke(invocation)
                log.info(tag,"result: ",result)
                if(!result.invocationId) throw Error("Failed to build invocation!")
                return result.invocationId
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.sign = async function (invocationId:any) {
            let tag = TAG + " | sign | "
            try {

                let invocation = await this.getInvocation(invocationId)
                log.info(tag,"invocation: ",invocation)

                let blockchain = COIN_MAP_LONG[invocation.network]
                log.info(tag,"invocation: ",invocation)

                if(!invocation.unsignedTx) throw Error("Unable to sign tx! missing unsignedTx")
                let unsignedTx = invocation.unsignedTx
                let txSigned:any
                switch (blockchain) {
                    case 'bitcoin':
                    case 'bitcoincash':
                    case 'litecoin':
                    case 'dogecoin':
                        txSigned = await this.wallet.btcSignTx(unsignedTx)
                        break;
                    case 'ethereum':
                        txSigned = await this.wallet.ethSignTx(unsignedTx)
                        const txid = keccak256(txSigned.serialized).toString('hex')
                        log.info(tag,"txid: ",txid)
                        txSigned.txid = "0x"+txid
                        break;
                    case 'thorchain':
                        txSigned = await this.wallet.thorchainSignTx(unsignedTx)

                        let broadcastString = {
                            tx:txSigned,
                            type:"cosmos-sdk/StdTx",
                            mode:"sync"
                        }
                        let buffer = Buffer.from(JSON.stringify(broadcastString), 'base64');
                        //TODO FIXME
                        //txid = cryptoTools.createHash('sha256').update(buffer).digest('hex').toUpperCase()

                        txSigned.serialized = JSON.stringify(broadcastString)
                        txSigned.serializedTx = JSON.stringify(broadcastString)
                        //txSigned.txid = "TODO"

                        break;
                    default:
                        throw Error("blockchain not supported! blockchain: "+blockchain)
                }
                log.info(tag,"txSigned: ",txSigned)

                //update invocation
                // invocation.signedTxs[txSigned]
                //TODO migrate to multi-tx format
                invocation.signedTx = txSigned

                //update invocation
                let resultUpdate = await this.updateInvocation(invocation)
                log.info(tag,"resultUpdate: ",resultUpdate)

                return invocation
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.broadcast = async function (broadcast:any) {
            let tag = TAG + " | broadcast | "
            try {
                if(!broadcast.invocationId) throw Error("invocationId missing!")

                let invocation = await this.getInvocation(broadcast.invocationId)
    
                if(!invocation.signedTx) throw Error("Can not broadcast before being signed!")
                if(!invocation.network) throw Error("invalid invocation missing network!")

                let broadcastPayload = invocation.signedTx.serialized || invocation.signedTx.serializedTx
                if(!broadcastPayload) throw Error("can not find broadcastPayload!")

                //broadcast
                let broadcastBodyTransfer = {
                    //TODO align network with blockchain strings!
                    network:invocation.network,
                    serialized:broadcastPayload,
                    txid:invocation.signedTx.txid || "unknown", //TODO get txid before broadcast on all chains!
                    invocationId: broadcast.invocationId,
                    noBroadcast:broadcast.noBroadcast
                }
                let resultBroadcastTransfer = await this.pioneer.instance.Broadcast(null,broadcastBodyTransfer)
                resultBroadcastTransfer = resultBroadcastTransfer.data
                invocation.broadcast = resultBroadcastTransfer

                //updated verify state
                invocation = await this.getInvocation(broadcast.invocationId)

                //update invocation again with broadcast
                // let resultUpdate = await this.updateInvocation(invocation)
                
                return invocation
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.defi = async function (defi:any) {
            let tag = TAG + " | defi | "
            try {
                /*
                    type:"lp-add",
                    blockchain:BLOCKCHAIN,
                    asset:ASSET,
                    address:FAUCET_BTC_ADDRESS,
                    amount:TEST_AMOUNT,
                    noBroadcast:true
                 */



                return true
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.lpQuote = async function (lp:any) {
            let tag = TAG + " | lpQuote | "
            try {
                if(!lp.leg1) throw Error("Invalid swap! missing input!")
                if(!lp.leg1.asset) throw Error("Invalid swap! missing input asset!")
                if(!lp.leg1.blockchain) throw Error("Invalid swap! missing input blockchain!")
                if(!lp.leg2) throw Error("Invalid swap! missing output!")
                if(!lp.leg2.asset) throw Error("Invalid swap! missing output asset!")
                if(!lp.leg2.blockchain) throw Error("Invalid swap! missing output blockchain!")
                if(!lp.amountLeg1 && !lp.amountLeg2) throw Error("Invalid swap! missing amountOut and amountIn!")
                if(!lp.pair) throw Error("Invalid swap! missing pair!")

                //TODO handle amount Max

                log.info(tag,"lp: ",lp)
                log.info(tag,"lp: ",{pair:lp.pair,amountIn:lp.amountIn})
                // osmosis
                if(lp.leg1.blockchain === 'osmosis'){
                    lp.protocol = 'osmosis'
                    //get quote for out
                    let swapQuote = await this.pioneer.instance.QuoteSwap({pair:lp.pair,amountIn:lp.amountLeg1})
                    swapQuote = swapQuote.data
                    log.info(tag,"swapQuote: ",swapQuote)
                    lp.amountLeg2 = swapQuote.buyAmount
                } else {
                    throw Error("not supported input!")
                }

                // oX

                // thorchain


                let invocation:any = {
                    type:'lp',
                    protocol:lp.protocol,
                    network:COIN_MAP[lp.leg1.blockchain],
                    context:this.context,
                    username:this.username,
                    lp
                }

                log.debug(tag,"invocation: ",invocation)
                let result = await this.invoke.invoke(invocation)
                if(!result) throw Error("Failed to create invocation!")
                log.info("result: ",result)

                let output = {
                    success:true,
                    invocationId:result.invocationId,
                    lp
                }

                return output
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.buildLp = async function (invocationId:string) {
            let tag = TAG + " | buildLp | "
            try {
                if(!invocationId) throw Error("Invalid swap! missing invocationId!")

                //get invocation
                let invocation = await this.getInvocation(invocationId)
                log.info(tag,"invocation: ",invocation)

                let lp = invocation.invocation.lp
                if(!lp) throw Error("invalid invocation! missing lp object")
                if(!lp.leg1.asset) throw Error("invalid invocation! missing lp.leg1.symbol")

                let unsignedTx
                if(lp.leg1.blockchain === 'osmosis'){
                    lp.from = await this.getAddress(lp.leg1.asset)
                    unsignedTx = await this.txBuilder.lp(lp)
                    log.info(tag,"unsignedTx: ",unsignedTx)
                    if(!unsignedTx) throw Error("failed to buildTx")
                } else {
                    throw Error("not supported input!")
                }

                invocation.unsignedTx = unsignedTx
                invocation.unsignedTxs = []
                invocation.unsignedTxs.push(unsignedTx)

                //update invocation
                await this.updateInvocation(invocation)

                return invocation
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.swapQuote = async function (swap:any) {
            let tag = TAG + " | swapQuote | "
            try {
                if(!swap.input) throw Error("Invalid swap! missing input!")
                if(!swap.input.asset) throw Error("Invalid swap! missing input asset!")
                if(!swap.input.blockchain) throw Error("Invalid swap! missing input blockchain!")
                if(!swap.output) throw Error("Invalid swap! missing output!")
                if(!swap.output.asset) throw Error("Invalid swap! missing output asset!")
                if(!swap.output.blockchain) throw Error("Invalid swap! missing output blockchain!")
                if(!swap.amount) throw Error("Invalid swap! missing amount!")

                //get addys
                let inputAddress = await this.getAddress(swap.input.asset)
                let outputAddress = await this.getAddress(swap.output.asset)
                if(!inputAddress) throw Error("failed to get address for input!")
                if(!outputAddress) throw Error("failed to get address for output!")

                //@TODO validate blockchains convert to rango blockchain! better
                let inputBlockchainRango = getRangoBlockchainName(swap.input.blockchain)
                let outputBlockchainRango = getRangoBlockchainName(swap.output.blockchain)

                //build rango payloads
                const connectedWallets = [
                    {blockchain: swap.input.asset, addresses: [inputAddress]},
                    {blockchain: swap.output.asset, addresses: [outputAddress]}
                ]
                const selectedWallets = {
                    [inputBlockchainRango]:inputAddress,
                    [outputBlockchainRango]:outputAddress
                }
                log.info(tag,"connectedWallets: ",connectedWallets)
                log.info(tag,"selectedWallets: ",selectedWallets)

                //TODO handle token addresses
                const from = {blockchain: inputBlockchainRango, symbol: swap.input.asset, address: null}
                const to = {blockchain: outputBlockchainRango, symbol: swap.output.asset, address: null}

                //get rango Id
                let body = {
                    amount: swap.amount,
                    affiliateRef: null,
                    checkPrerequisites: true,
                    connectedWallets,
                    selectedWallets,
                    from,
                    to,
                }
                log.info("rango body: ",body)
                let bestRoute
                let error
                try{
                    bestRoute = await this.rango.getBestRoute(body)
                    log.info("bestRoute: ",bestRoute)
                }catch(e){
                    log.info(tag,"e: ",e)
                    error = e
                }

                let output
                if(bestRoute && bestRoute.result && bestRoute.result.outputAmount){
                    if(!bestRoute.requestId) throw Error("failed to make swap request!")
                    if(!bestRoute.result.outputAmount) throw Error("failed to make quote!")
                    //expiration (time needed until accepted)
                    let duration
                    //create invocation
                    let invocation:any = {
                        type:'swap',
                        network:COIN_MAP[swap.input.blockchain],
                        context:this.context,
                        username:this.username,
                        invocationId:bestRoute.requestId,
                        swap,
                        route:bestRoute
                    }

                    output = {
                        success:true,
                        invocationId:bestRoute.requestId,
                        amountIn:swap.amount,
                        amountOut:bestRoute.result.outputAmount,
                        input:swap.input,
                        output:swap.output,
                        swaps:bestRoute.result.swaps
                    }
                } else {
                    log.error(tag,"Failed to create quote!")
                    output = {
                        success:false,
                        error,
                        response:bestRoute,
                        rangoBody:body
                    }
                }

                return output
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.buildSwap = async function (invocationId:string, swap:any) {
            let tag = TAG + " | buildSwap | "
            try {
                if(!invocationId) throw Error("Invalid swap! missing invocationId!")
                if(!swap) throw Error("Invalid swap! missing swap!")

                //if success
                const transactionResponse = await this.rango.createTransaction({
                    requestId: invocationId,
                    step: 1, // In this example, we assumed that route has only one step
                    userSettings: { 'slippage': '1' },
                    validations: { balance: true, fee: true },
                })
                log.info("transactionResponse: ",transactionResponse)
                if(!transactionResponse.ok){
                    throw Error(transactionResponse.error)
                }
                let tx = transactionResponse.transaction

                let inputAsset = swap.input.asset
                if(!inputAsset) throw Error("invalid invocation, missing swap input asset!")
                
                //if UTXO
                if(tx.type === 'TRANSFER'){
                    tx.pubkey = await this.getPubkey(inputAsset)
                    if(!tx.pubkey) throw Error("failed to get pubkey!")
                    tx.from = await this.getAddress(inputAsset)
                    if(!tx.from) throw Error("failed to get from address!")
                }else{
                    //@TODO this might be jank mapping blockChain/rango to symbol!
                    tx.from = await this.getAddress(inputAsset)
                    if(!tx.from) throw Error("failed to get from address!")
                }

                let unsignedTx = await this.txBuilder.swap(tx)
                log.info(tag,"unsignedTx: ",unsignedTx)

                return unsignedTx
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.swapExecute = async function (invocationId:any) {
            let tag = TAG + " | swapExecute | "
            try {
                //TODO connect status by wallet context
                if(!this.isConnected) throw Error("Wallet not connected!")

                //get invocation
                let invocation = await this.getInvocation(invocationId)
                log.info(tag,"invocation: ",invocation)


                //TODO add all tx's to queue

                //check status of swap

                //if not signed/sign
                //TODO handle multiple txs
                let unsignedTx = invocation.unsignedTx

                let txSigned:any
                //TODO get this from the tx itself?
                const blockchain = invocation.invocation.swap.input.blockchain;
                log.info(tag,"blockchain: ",blockchain)

                switch (blockchain) {
                    case 'ethereum':
                        txSigned = await this.wallet.ethSignTx(unsignedTx)
                        const txid = keccak256(txSigned.serialized).toString('hex')
                        log.info(tag,"txid: ",txid)
                        txSigned.txid = txid

                        break;
                    case 'bitcoin':
                        txSigned = await this.wallet.btcSignTx(unsignedTx)
                        break;
                    default:
                        throw Error("network not supported! type"+blockchain)
                }
                log.info(tag,"txSigned: ",txSigned)
                if(!txSigned) throw Error("Failed to sign tx!")

                //update invocation for signed



                //get invocation
                invocation = await this.getInvocation(invocationId)
                invocation.txSigned = txSigned
                invocation.signedTxs = [txSigned]

                //update invocation
                await this.updateInvocation(invocation)

                //broadcast
                let broadcastBodyTransfer = {
                    //TODO align network with blockchain strings!
                    network:COIN_MAP[blockchain],
                    serialized:txSigned.serializedTx || txSigned.serialized,
                    txid:"unknown", //TODO get txid before broadcast on all chains!
                    invocationId,
                    noBroadcast:invocation.noBroadcast
                }
                let resultBroadcastTransfer = await this.pioneer.instance.Broadcast(null,broadcastBodyTransfer)
                log.info("resultBroadcast: ",resultBroadcastTransfer)
                invocation.broadcast = resultBroadcastTransfer

                //update invocation again with broadcast
                await this.updateInvocation(invocation)

                return invocation
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
                
                //TODO balance check
                
                //for all pubkeys
                
                //get balance
                let balances = this.balances.filter((e:any) => e.symbol === tx.asset)[0]
                log.info(tag,"*** balances: ",balances)
                
                //balances
                if(balances.length === 0){
                    throw Error("No balance found for asset! asset"+tx.asset)
                } else if(balances.length === 1){
                    log.info(tag,"assume from is only balance")
                    
                }else if(balances.length > 1){
                    log.info(tag,"select larges balance")
                    //select largest balance
                    //let largest = 
                }
                
                
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

                return unsignedTx
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
    }
}

