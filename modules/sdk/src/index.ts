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
let pioneerApi = require("@pioneer-platform/pioneer-client")
let TxBuilder = require('@pioneer-sdk/tx-builder')
const Events = require("@pioneer-platform/pioneer-events")
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
    public assetContext: string;
    public assetBalanceUsdValueContext: string;
    public assetBalanceNativeContext: string;
    private wss: any;
    private username: any;
    private queryKey: any;
    private spec: any;
    private wallet: any;
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
    private context: string;
    private init: (tx: any, options: any, asset: string) => Promise<void>;
    public pairWallet: (walletType:string, wallet: any) => Promise<any>;
    private removePin: () => Promise<any>;
    private startSocket: () => Promise<any>;
    private updateContext: () => Promise<any>;
    private getPubkey: (asset:string) => Promise<any>;
    private getPubkeys: () => Promise<any>;
    private getAddress: (asset:string) => Promise<any>;
    private sendToAddress: (tx:any) => Promise<any>;
    private swap: (tx:any) => Promise<any>;
    private defi: (tx:any) => Promise<any>;
    public getInvocation: (invocationId: string) => Promise<any>;
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
        this.rangoApiKey = config.rangoApiKey || '4a624ab5-16ff-4f96-90b7-ab00ddfc342c'
        this.pubkeys = []
        this.markets = {}
        this.events = {}
        this.isPaired = false
        this.context = ""
        this.contexts = []
        this.pubkeys = []
        this.balances = []
        this.markets = {}
        this.context = ""
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
        this.init = async function () {
            let tag = TAG + " | init | "
            try {
                if(!wallet) throw Error("wallet required!")
                if(!this.username) throw Error("username required!")
                if(!this.queryKey) throw Error("queryKey required!")
                if(!this.wss) throw Error("wss required!")
                await this.startSocket()
                
                //pioneer
                let Pioneer = new pioneerApi(config.spec,config)
                this.pioneer = await Pioneer.init()

                //rango
                this.rango = new RangoClient(this.rangoApiKey)

                //init tx builder
                log.info(tag,"TxBuilder.TxBuilder: ",TxBuilder)
                this.txBuilder = new TxBuilder.TxBuilder(this.pioneer, config)
                log.info(tag,"txBuilder: ",this.txBuilder)

                //get health from server
                let health = await this.pioneer.instance.Health()
                if(!health.data.online) throw Error("Pioneer Server offline!")
                log.info(tag,"pioneer health: ",health.data)

                //get status from server
                let status = await this.pioneer.instance.Status()
                log.info(tag,"pioneer status: ",status.data)
                this.markets = status.data.rango

                //get user info
                let userInfo = await this.pioneer.instance.User()
                userInfo = userInfo.data
                this.user = userInfo
                // log.info(tag,"user: ",userInfo)
                log.info(tag,"user pubkeys: ",userInfo.pubkeys.length)
                log.info(tag,"user balances: ",userInfo.balances.length)

                //TODO verify ETH address match

                if(userInfo.balances.length === 0) {
                    //no wallets paired
                    log.info(tag, "user not registered! info: ",userInfo)


                } else if(userInfo.balances.length > 0) {
                    log.info(tag,"CACHE FOUND! userInfo: ",userInfo.context)

                    //get available inputs (blockchains with balances)
                    this.availableInputs = userInfo.balances
                    this.availableOutputs = this.markets.popularTokens
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
        this.pairWallet = async function (walletType:string, wallet:string) {
            let tag = TAG + " | getInvocations | "
            try {
                log.info(tag,"walletType: ",walletType)
                this.wallet = wallet

                wallet.transport.keyring.on(["*", "*", "*"],(message:any) => {
                    this.events.events.emit('keepkey',message)
                })
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
                    let result = await this.pioneer.Register(null, register)
                    log.debug(tag,"register result: ",result)
                    result = result.data

                    //get user
                    await this.updateContext()
                    //TODO verify user?
                }
                
                //TODO this needed?
                this.events.pair(this.username)
                
                this.context = result.context
                this.pubkeys = result.pubkeys
                this.balances = result.balances

                return result
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.getInvocation = async function (invocationId:string) {
            let tag = TAG + " | getInvocations | "
            try {
                if(!invocationId) throw Error("invocationId required!")
                let result = await this.pioneer.Invocation(invocationId)
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

                    log.debug(tag,"EVENT type: ",event.type)

                });

                this.events.events.on('pairings', (event:any) => {
                    log.debug(tag,'message event! ',event);
                    this.isPaired = true
                    this.username = event.username
                    this.updateContext()
                    this.events.pair(this.username)

                    log.debug(tag,"EVENT type: ",event.type)

                });

                this.events.events.on('context', (event:any) => {
                    log.debug(tag,'context set to '+event.context);
                    this.context = event.context
                    this.updateContext()
                });

                this.events.events.on('pubkey', (event:any) => {
                    log.debug(tag,"pubkey event!", event)
                    //update pubkeys
                });

                this.events.events.on('balances', (event:any) => {
                    log.debug(tag,"balances event!", event)
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
                let userInfo = await this.pioneer.User()
                userInfo = userInfo.data
                log.info(tag,"userInfo: ",userInfo)

                if(userInfo.username)this.username = userInfo.username
                if(userInfo.context)this.context = userInfo.context
                // if(userInfo.wallets)this.wallets = userInfo.wallets
                // if(userInfo.balances)this.balances = userInfo.balances
                // if(userInfo.pubkeys && this.pubkeys.length < userInfo.pubkeys.length)this.pubkeys = userInfo.pubkeys
                // if(userInfo.totalValueUsd)this.totalValueUsd = parseFloat(userInfo.totalValueUsd)
                // if(userInfo.invocationContext)this.invocationContext = userInfo.invocationContext
                // if(userInfo.assetContext)this.assetContext = userInfo.assetContext
                // if(userInfo.assetBalanceNativeContext)this.assetBalanceNativeContext = userInfo.assetBalanceNativeContext
                // if(userInfo.assetBalanceUsdValueContext)this.assetBalanceUsdValueContext = userInfo.assetBalanceUsdValueContext

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
        this.swap = async function (swap:any) {
            let tag = TAG + " | swap | "
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
                try{
                    bestRoute = await this.rango.getBestRoute(body)
                    log.info("bestRoute: ",bestRoute)
                }catch(e){
                    log.info(tag,"e: ",e)
                }

                if(!bestRoute.requestId) throw Error("failed to make swap request!")
                //TODO save requestId in invocationId in Pioneer
                
                //if success
                const transactionResponse = await this.rango.createTransaction({
                    requestId: bestRoute.requestId,
                    step: 1, // In this example, we assumed that route has only one step
                    userSettings: { 'slippage': '1' },
                    validations: { balance: true, fee: true },
                })
                log.info("transactionResponse: ",transactionResponse)

                return bestRoute
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
                
                //@TODO get txid from signedTx
                
                //broadcast
                if(!tx.noBroadcast){
                    let broadcastBodyTransfer = {
                        network:tx.asset,
                        serialized:txSigned.serializedTx,
                        txid:"unknown",
                        invocationId:"unknown"
                    }
                    let resultBroadcastTransfer = await this.pioneer.instance.Broadcast(null,broadcastBodyTransfer)
                    console.log("resultBroadcast: ",resultBroadcastTransfer)                    
                }
                return txSigned
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
    }
}

