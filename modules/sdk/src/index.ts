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
// @ts-ignore
import Pioneer from "@pioneer-platform/pioneer-client"
let TxBuilder = require('@pioneer-sdk/tx-builder')
const Events = require("@pioneer-platform/pioneer-events")
// let Invoke = require("@pioneer-platform/pioneer-invoke")
let wait = require('wait-promise');
let sleep = wait.sleep;

let WALLET_ICONS:any = {
    'keepkey':"https://pioneers.dev/coins/keepkey.png",
    'native':"https://pioneers.dev/coins/pioneer.png",
    'metamask':"https://pioneers.dev/coins/metamask.png",
}

export class SDK {
    public events: any;
    public masters:any
    public balances:any[]
    public ibcChannels:any[]
    public paymentStreams:any[]
    public wallets: any[];
    public wallet: any;
    public nfts:any[]
    public totalValueUsd: number;
    public markets: any;
    public availableInputs: any;
    public availableOutputs: any;
    public contexts: any;
    public status: string;
    public apiVersion: string;
    public initialized: boolean;
    public invocations: any;
    public assetContext: any;
    public blockchainContext: any;
    public invoke: any;
    public wss: any;
    public username: any;
    public queryKey: any;
    public spec: any;
    public paths: any;
    public pubkeys: any;
    public pioneer: any;
    public blockchains: any;
    public txBuilder: any;
    public user: any;
    public rango: any;
    public rangoApiKey: string;
    public isPaired: boolean;
    public isConnected: boolean;
    public context: string;
    public init: () => Promise<any>;
    public refresh: () => Promise<any>;
    public pairWallet: (wallet: any) => Promise<any>;
    // public setWalletContext: (context: string) => Promise<any>;
    public setBlockchainContext: (blockchain: string) => Promise<any>;
    public setAssetContext: (blockchain: string) => Promise<any>;
    private setPubkeyContext: (pubkey: any) => Promise<any>;
    public startSocket: () => Promise<any>;
    public stopSocket: () => any;
    public updateContext: () => Promise<any>;
    public getPubkey: (asset:string, sync?:boolean) => Promise<any>;
    public getPubkeys: (wallet:any) => Promise<any>;
    public getAddress: (asset:string) => Promise<any>;
    public getBalance: (asset: string, sync: boolean) => Promise<any[]>;
    public sendToAddress: (tx:any) => Promise<any>;
    public swapQuote: (tx:any) => Promise<any>;
    public buildSwap: (invocationId:string, swap:any) => Promise<any>;
    public lpQuote: (tx:any) => Promise<any>;
    public buildLp: (tx:any) => Promise<any>;
    // private execute: (tx:any) => Promise<any>;
    public defi: (tx:any) => Promise<any>;
    //TODO Standardize
    //build
    public build: (tx:any) => Promise<any>;
    //sign
    public sign: (tx:any, wallet:any) => Promise<any>;
    public ethSignMessage: ((msg: any, path: any, wallet: any) => Promise<any>) | undefined;
    //broadcast
    public broadcast: (tx:any) => Promise<any>;
    public updateInvocation: (tx:any) => Promise<any>;
    public deleteInvocation: (invocationId: string) => Promise<any>;
    public getInvocation: (invocationId: string) => Promise<any>;
    public getInvocations: () => Promise<any>;
    public isSynced: boolean;
    publicAddress: string;
    public setContext: (wallet: any) => Promise<{ success: boolean } | { success: boolean; error: string }>;
    private disconnectWallet: (context: string) => Promise<any>;
    private pubkeyContext: any;
    private getContextStringForWallet: (wallet: any) => Promise<string>;
    constructor(spec:string,config:any) {
        this.status = 'preInit'
        this.apiVersion = ""
        this.initialized = false
        this.blockchains = config.blockchains || blockchains
        this.wss = config.wss || 'wss://pioneers.dev'
        this.username = config.username // or generate?
        this.queryKey = config.queryKey // or generate?
        this.spec = config.spec || 'https://pioneers.dev/spec/swagger'
        //this.spec = config.spec || 'https://pioneers.dev/spec/swagger'
        //02b14225-f62e-4e4f-863e-a8145e5befe5
        this.rangoApiKey = config.rangoApiKey || '02b14225-f62e-4e4f-863e-a8145e5befe5'
        //combine custom with default paths
        this.paths = [...config.paths, ...getPaths(this.blockchains)];
        this.pubkeys = []
        this.markets = {}
        this.events = {}
        this.isSynced = false
        this.isPaired = false
        this.isConnected = false
        this.context = ""
        this.publicAddress = ""
        this.contexts = []
        this.invocations = []
        this.balances = []
        this.markets = {}
        this.assetContext = {
            name: 'ethereum',
            type: 'coin',
            caip: 'eip155:1/slip44:60',
            tags: [
                'ethereum',
                'isAsset',
                'isNative',
                'KeepKeySupport',
                'DappSupport',
                'WalletConnectSupport'
            ],
            blockchain: 'ethereum',
            symbol: 'ETH',
            decimals: 18,
            image: 'https://pioneers.dev/coins/ethereum.png',
            description: 'Open source platform to write and distribute decentralized applications.',
            website: 'https://ethereum.org/',
            explorer: 'https://etherscan.io/',
            rank: 2
        }
        this.blockchainContext = {
            blockchain: 'ethereum',
            caip: 'eip155:1/slip44:60',
            chainId: 1,
            description: 'more info here: https://ethereum.org This is a EVM network with chainId: 1 Follows EIP:155',
            explorer: 'https://ethereum.org',
            faucets: [],
            feeAssetCaip: 'eip155:1/slip44:60',
            feeAssetName: 'ethereum',
            feeAssetRank: 2,
            feeAssetSymbol: 'ETH',
            image: 'https://pioneers.dev/coins/ethereum-mainnet.png',
            isCharted: false,
            name: 'ethereum',
            network: 'ETH',
            service: null,
            symbol: 'ETH',
            tags: [
                'KeepKeySupport',
                'DappSupport',
                'WalletConnectSupport',
                'EVM',
                'EIP:155',
                'ethereum',
                'Ether',
                'ETH',
                1,
                null
            ],
            type: 'EVM'
        }
        this.wallets = []
        this.events = {}
        this.totalValueUsd = 0
        this.ibcChannels = []
        this.paymentStreams = []
        this.nfts = []
        // @ts-ignore
        this.init = async function () {
            let tag = TAG + " | init | "
            try {
                if(!this.username) throw Error("username required!")
                if(!this.queryKey) throw Error("queryKey required!")
                if(!this.wss) throw Error("wss required!")

                let PioneerClient = new Pioneer(config.spec,config)
                this.pioneer = await PioneerClient.init()
                if(!this.pioneer)throw Error("Fialed to init pioneer server!")
                //rango
                this.rango = new RangoClient(this.rangoApiKey)

                //init tx builder
                log.debug(tag,"TxBuilder.TxBuilder: ",TxBuilder)
                log.debug(tag,"TxBuilder.TxBuilder config: ",config)
                this.txBuilder = new TxBuilder.TxBuilder(this.pioneer, config)
                log.debug(tag,"txBuilder: ",this.txBuilder)

                //get health from server
                let health = await this.pioneer.Health()
                if(!health.data.online) throw Error("Pioneer Server offline!")
                log.debug(tag,"pioneer health: ",health.data)

                //get status from server
                let status = await this.pioneer.Status()
                log.debug(tag,"pioneer status: ",status.data)
                this.markets = status.data.rango

                //build cache
                this.getInvocations()

                //get user info
                let userInfo = await this.pioneer.User()
                userInfo = userInfo.data
                log.info(tag,"1 userInfo: ",userInfo)
                
                if(userInfo){
                    if(userInfo.isSynced)this.isSynced = userInfo.isSynced
                    if(userInfo.wallets) this.pubkeys = userInfo.wallets
                    if(userInfo.pubkeys) this.pubkeys = userInfo.pubkeys
                    if(userInfo.context) this.context = userInfo.context
                    if(userInfo.balances) this.balances = userInfo.balances
                    if(userInfo.nfts) this.nfts = userInfo.nfts
                }

                if(!userInfo || userInfo.error) {
                    //no wallets paired
                    log.info(tag, "user not registered! info: ",userInfo)
                    log.info("no wallet found, and no user found, registering empty user!")
                    let register = {
                        username:this.username,
                        blockchains:this.blockchains,
                        publicAddress:'none',
                        context:'none',
                        walletDescription:{
                            context:'none',
                            type:'none'
                        },
                        data:{
                            pubkeys:[]
                        },
                        queryKey:this.queryKey,
                        auth:'lol',
                        provider:'lol'
                    }
                    log.debug(tag,"register payload: ",register)
                    let result = await this.pioneer.Register(register)
                    log.info(tag,"register result: ",result.data)
                    //context
                    if(result.data.context)this.balances = result.data.context
                    if(result.data.balances)this.balances = result.data.balances
                    if(result.data.isSynced)this.isSynced = result.data.isSynced
                    if(result.data.pubkeys)this.pubkeys = result.data.pubkeys

                }
                //done registering, now get the user
                //this.refresh()
                if(!this.pioneer) throw Error("Failed to init pioneer server!")
                return this.pioneer
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.getContextStringForWallet = async function (wallet:any) {
            let tag = TAG + " | getContextStringForWallet | "
            try{
                if(!wallet) throw Error("wallet required to get context string!")
                //walletType
                let isNative = await wallet?._isNative
                let isKeepKey = await wallet?._isKeepKey
                let isMetaMask = await wallet?._isMetaMask
                if(isNative) wallet.type = 'native'
                if(isKeepKey) wallet.type = 'keepkey'
                if(isMetaMask) wallet.type = 'metamask'
                if(!isNative && !isKeepKey && !isMetaMask) {
                    log.debug(tag,"wallet: ",wallet)
                    throw Error("can not init: Unhandled Wallet type!")
                }
                //get wallet context
                log.info(tag,"wallet type: ",wallet.type)
                //log.info(tag,"wallet: ",wallet)
                let ethAddress
                if(wallet.type === 'metamask') {
                    ethAddress = 'metamask'
                }else{
                    //get eth address
                    const addressInfo = {
                        addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
                        coin: "Ethereum",
                        scriptType: "ethereum",
                        showDisplay: false,
                    };
                    ethAddress = await wallet.ethGetAddress(addressInfo)
                    log.debug(tag,"ethAddress: ",ethAddress)
                }
                if(!ethAddress) throw Error("Failed to get eth address!")
                //get context
                let context = ethAddress+".wallet"
                return context
            }catch(e){
                // @ts-ignore
                throw Error(e)
            }
        }
        this.setContext = async function (wallet:any) {
            let tag = TAG + " | setContext | "
            try{
                let context = await this.getContextStringForWallet(wallet)
                log.info(tag,"context: ",context)
                const isContextExist = this.wallets.some((wallet: any) => wallet.context === context);
                log.info(tag,"isContextExist: ",isContextExist)
                if(isContextExist){
                    //if success
                    this.context = context
                    this.wallet = wallet
                    // let result = await this.pioneer.SetContext({context})
                    // log.debug(tag,"result: ",result)

                    //pubkey pubkey context
                    let blockchain = this.blockchainContext
                    //get pubkey for blockchain
                    log.info(tag,"this.pubkeys: ",this.pubkeys)
                    log.info(tag,"blockchainContext: ",blockchain)
                    log.info(tag,"blockchain: ",blockchain.name)
                    log.info(tag,"context: ",context)
                    let pubkeysForContext = this.pubkeys.filter((item: { context: string }) => item.context === context);
                    log.info(tag, "pubkeysForContext: ", pubkeysForContext);

                    let pubkey = pubkeysForContext.find(
                        (item: { blockchain: any; context: string }) => item.blockchain === blockchain.name && item.context === context
                    );
                    log.info(tag, "pubkey: ", pubkey);

                    if(pubkey) {
                        this.pubkeyContext = pubkey
                        log.info(tag,"pubkeyContext: ",this.pubkeyContext)
                    } else {
                        log.info(tag,"pubkeys: ",this.pubkeys)
                        log.info(tag,"pubkeysForContext: ",pubkeysForContext)

                        throw Error("unable to find ("+blockchain.name+") pubkey for context! "+context)
                    }
                    return {success:true}
                }else{
                    throw Error("Wallet context not found paired! con not set context to unpaired wallet!"+context)
                }
            }catch(e){
                log.error(tag,e)
                throw e
            }
        },
        this.pairWallet = async function (wallet:any) {
            let tag = TAG + " | pairWallet | "
            try {
                log.debug(tag,"Pairing Wallet")
                if(!wallet) throw Error("Must have wallet to pair!")
                if(!this.blockchains) throw Error("Must have blockchains to pair!")
                if(!this.username) throw Error("Must have username to pair!")

                //walletType
                let isNative = await wallet?._isNative
                let isKeepKey = await wallet?._isKeepKey
                let isMetaMask = await wallet?._isMetaMask
                if(isNative) wallet.type = 'native'
                if(isKeepKey) wallet.type = 'keepkey'
                if(isMetaMask) wallet.type = 'metamask'
                if(!isNative && !isKeepKey && !isMetaMask) {
                    log.debug(tag,"wallet: ",wallet)
                    throw Error("can not init: Unhandled Wallet type!")
                }
                //add wallet to wallets
                log.info(tag,"this.wallets: ",this.wallets)
                let context = await this.getContextStringForWallet(wallet);
                log.info(tag,"context: ",context)
                if (!this.wallets.some(w => w.context === context)) {
                    let walletInfo: any = {
                        context: context,
                        type: wallet.type,
                        icon: WALLET_ICONS[wallet.type],
                        status: 'connected',
                        wallet
                    };
                    this.wallets.push(walletInfo);
                }
                log.info(tag,"this.wallets: ",this.wallets)
                
                let pubkeys = await this.getPubkeys(wallet)
                if(!pubkeys) throw Error("Failed to get Pubkeys!")
                if(!pubkeys.pubkeys) throw Error("Failed to get Pubkeys!")
                log.info("Pubkeys BEFORE pairing: ",this.pubkeys)
                for(let i = 0; i < pubkeys.pubkeys.length; i++){
                    let pubkey = pubkeys.pubkeys[i]
                    this.pubkeys.push(pubkey)
                }
                log.info("Pubkeys AFTER pairing: ",this.pubkeys)

                await this.setContext(wallet)
                this.isConnected = true

                //register
                if(!this.username) throw Error("username not set!")
                let register = {
                    username:this.username,
                    blockchains:this.blockchains,
                    context:pubkeys.context,
                    publicAddress:pubkeys.publicAddress,
                    walletDescription:{
                        context:pubkeys.context,
                        type:wallet.type
                    },
                    data:{
                        pubkeys:pubkeys.pubkeys
                    },
                    queryKey:this.queryKey,
                    auth:'lol',
                    provider:'lol'
                }
                log.debug(tag,"register payload: ",register)
                let result = await this.pioneer.Register(register)
                log.info(tag,"register result: ",result)
                if(result.data.balances)this.balances = result.data.balances
                if(result.data.nfts)this.nfts = result.data.nfts

                return result
            } catch (e) {
                log.error(tag, "e: ", e)
                //response:
                log.error(tag, "e: ", JSON.stringify(e))
                // log.error(tag, "e2: ", e.response)
                // log.error(tag, "e3: ", e.response.data)

            }
        }
        this.disconnectWallet = async function (context: string) {
            let tag = TAG + " | disconnectWallet | ";
            try {
                // Find the wallet in the this.wallets array based on the context
                const walletIndex = this.wallets.findIndex((wallet: any) => wallet.context === context);

                // If the wallet with the given context is found, set its status to 'disconnected'
                if (walletIndex !== -1) {
                    this.wallets[walletIndex].status = 'disconnected';
                } else {
                    log.error(tag,'Wallet with the given context not found.');
                }

                // Return the updated wallets array (optional)
                return this.wallets;
            } catch (e) {
                log.error(tag, "e: ", e);
            }
        }
        this.refresh = async function () {
            let tag = TAG + " | refresh | "
            try {
                let result = await this.pioneer.Refresh()

                await this.updateContext()

                return result.data
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.setPubkeyContext = async function (pubkeyObj) {
            const tag = TAG + " | setPubkeyContext | ";
            try {
                const pubkeyToFind = pubkeyObj.pubkey;

                // Find pubkey in pubkeys array
                const pubkeyFound = this.pubkeys.find((item: { pubkey: any }) => item.pubkey === pubkeyToFind);
                if (pubkeyFound) {
                    // If pubkey is found, set the pubkeyContext and return true
                    this.pubkeyContext = pubkeyFound;
                    return true;
                } else {
                    // If pubkey is not found, return false
                    return false;
                }
            } catch (e) {
                // Handle any errors that might occur
                log.error(tag, "Error: ", e);
                throw e
            }
        };
        this.setBlockchainContext = async function (blockchain:any) {
            let tag = TAG + " | setBlockchainContext | "
            try {
                if(blockchain && this.blockchainContext && this.blockchainContext !== blockchain){
                    let result = await this.pioneer.SetBlockchainContext({blockchain})
                    log.debug(tag,"result: ",result)
                    //if success
                    this.blockchainContext = blockchain
                    return result.data
                }else{
                    return {success:false,error:"already blockchain context="+blockchain}
                }
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.setAssetContext = async function (asset:any) {
            let tag = TAG + " | setAssetContext | "
            try {
                if(asset && this.assetContext && this.assetContext !== asset){
                    let result = await this.pioneer.SetAssetContext({asset})
                    log.debug(tag,"result: ",result.data)
                    if(result && result.data && result.data.success){
                        log.info(tag,"settingAssetContext: ",asset)
                        //set blockchainContext to assets blockchain!
                        if(asset?.blockchainCaip){
                            let blockchain = await this.pioneer.BlockchainByCaip({caip:asset?.blockchainCaip})
                            if(blockchain)await this.setBlockchainContext(blockchain)
                        }
                        //if success
                        this.assetContext = asset
                        return result.data
                    } else {
                        log.error(tag,"result: ",result)
                        log.error(tag,"result.error: ",result.error)
                        return {success:false,error:result}
                    }
                }else{
                    return {success:false, error:"already asset context="+asset}
                }
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
        this.getInvocations = async function () {
            let tag = TAG + " | getInvocations | "
            try {
                let result = await this.pioneer.Invocations()
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
                let result = await this.pioneer.DeleteInvocation("",{invocationId})
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
                    // this.username = event.username
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

                this.events.events.on('blocks', (event:any) => {
                    log.debug(tag,"blocks event!", event)
                });

                this.events.events.on('balances', (event:any) => {
                    log.debug(tag,"balances event!", event)
                });

                //onSign
                this.events.events.on('invocations', async (event:any) => {
                    // log.debug("invocation: ",event)
                    switch(event.type) {
                        case 'update':
                            break;
                        case 'signRequest':
                            log.debug("signRequest: ",event.invocation.unsignedTx)
                            break;
                        default:
                            log.debug(tag,"unhandled: ",event.type)
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
                log.debug(tag,"userInfo: ",userInfo)
                if(!userInfo.pubkeys) userInfo.pubkeys = []
                //validate user
                let pubkeyChains:any = []
                for(let i = 0; i < userInfo.pubkeys.length; i++){
                    let pubkey = userInfo.pubkeys[i]
                    pubkeyChains.push(pubkey.blockchain)
                }
                //unique
                pubkeyChains = [ ...new Set(pubkeyChains)]
                log.debug(tag,"pubkeyChains: ",pubkeyChains)
                log.debug(tag,"pubkeyChains: ",pubkeyChains.length)
                log.debug(tag,"blockchains: ",this.blockchains.length)
                log.debug(tag,"blockchains: ",this.blockchains)
                //get missing
                let missingBlockchains = pubkeyChains
                    .filter((x: any) => !this.blockchains.includes(x))
                    .concat(this.blockchains.filter((x: any) => !pubkeyChains.includes(x)));
                log.debug(tag,"missingBlockchains: ",missingBlockchains)
                //@TODO is missing chains, repair?

                if(userInfo.username)this.username = userInfo.username
                if(userInfo.context)this.context = userInfo.context
                //if(userInfo.wallets)this.wallets = userInfo.wallets
                if(userInfo.balances)this.balances = userInfo.balances
                // if(userInfo.pubkeys && this.pubkeys.length < userInfo.pubkeys.length)this.pubkeys = userInfo.pubkeys
                if(userInfo.totalValueUsd)this.totalValueUsd = parseFloat(userInfo.totalValueUsd)
                //if(userInfo.invocationContext)this.invocationContext = userInfo.invocationContext
                if(userInfo.assetContext)this.assetContext = userInfo.assetContext
                //if(userInfo.assetBalanceNativeContext)this.assetBalanceNativeContext = userInfo.assetBalanceNativeContext
                //if(userInfo.assetBalanceUsdValueContext)this.assetBalanceUsdValueContext = userInfo.assetBalanceUsdValueContext

                return userInfo
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.getPubkeys = async function (wallet:any) {
            let tag = TAG + " | getPubkeys | "
            try {
                let output:any = {}
                log.debug(tag,"checkpoint")
                let context = await this.getContextStringForWallet(wallet);
                //log.debug(tag,"wallet: ",wallet)
                if(!wallet) throw Error("can not get pubkeys! Wallet not sent!")
                if(!this.blockchains) throw Error("blockchains not set!")

                //get paths for blockchains
                // let paths = getPaths(this.blockchains)
                // //combine with local paths
                // this.paths = [...this.paths, ...getPaths(this.blockchains)];
                
                let paths = this.paths
                log.debug(tag,"paths: ",paths)

                if(!paths || paths.length === 0) throw Error("Failed to get paths!")
                //verify paths
                for(let i = 0; i < this.blockchains.length; i++){
                    let blockchain = this.blockchains[i]
                    let symbol = getNativeAssetForBlockchain(blockchain)
                    log.debug(tag,"symbol: ",symbol)
                    //find in pubkeys
                    let isFound = paths.find((path: { blockchain: string; }) => {
                        return path.blockchain === blockchain
                    })
                    if(!isFound){
                        throw Error("Failed to find path for blockchain: "+blockchain)
                    }
                }
                let pubkeys:any = []
                //add feature info to pubkey
                let keyedWallet:any = {}
                let ethMaster = null
                //if native
                if(wallet?._isNative){
                    log.debug(tag,"Is Native, format pubkeys")
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
                        pathForKeepkey.scriptType = 'p2pkh'
                        //showDisplay
                        pathForKeepkey.showDisplay = false
                        pathsKeepkey.push(pathForKeepkey)
                    }

                    log.debug("***** paths IN: ",pathsKeepkey.length)
                    log.debug("***** paths IN: ",pathsKeepkey)

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
                    log.debug("***** paths IN: ",pathsKeepkey)
                    let result = await wallet.getPublicKeys(pathsKeepkey)
                    // if(walletType === 'keepkey'){
                    //     result = await wallet.getPublicKeys(pathsKeepkey)
                    // } else if(walletType === 'native'){
                    //     log.debug(tag,"pathsKeepkey: ",pathsKeepkey )
                    //     result = await wallet.getPublicKeys(pathsKeepkey)
                    // } else {
                    //     throw Error("unhandled wallet")
                    // }
                    log.debug(tag,"result wallet.getPublicKeys: ",result)
                    if(!result) throw Error("failed to get pubkeys!")



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
                            log.debug(tag,"xpub: ",result[i].xpub)
                            if(!result[i].xpub) throw Error("Missing xpub")
                            //convert to zpub
                            // let zpub = await xpubConvert(result[i].xpub,'zpub')
                            log.debug(tag,"zpub: ",result[i].xpub)
                            normalized.pubkey = result[i].xpub
                            pubkey.pubkey = result[i].xpub
                        }
                        //TODO get this from supported coins? DRY
                        if(pubkey.symbol === 'ETH' || pubkey.symbol === 'AVAX' || pubkey.symbol === 'RUNE' || pubkey.symbol === 'BNB' || pubkey.symbol === 'ATOM' || pubkey.symbol === 'OSMO'){
                            pubkey.type = 'address'
                            pubkey.pubkey = result[i].xpub
                        }
                        if(!pubkey.type) {
                            log.error(tag,"invalid pubkey: ",pubkey)
                            throw Error("invalid pubkey! missing type!")
                        }
                        normalized.type = pubkey.type
                        normalized.note = pubkey.note
                        normalized.symbol = pubkey.symbol
                        normalized.blockchain = COIN_MAP_LONG[pubkey.symbol]
                        normalized.network = COIN_MAP_LONG[pubkey.symbol]
                        normalized.path = addressNListToBIP32(pubkey.addressNList)
                        normalized.pathMaster = addressNListToBIP32(pubkey.addressNListMaster)

                        //get master address
                        let address
                        log.debug(tag,"symbol: ",pubkey.symbol)
                        switch(pubkey.symbol) {
                            case 'BTC':
                            case 'BCH':
                            case 'DOGE':
                            case 'DASH':
                            case 'LTC':
                                address = await wallet.btcGetAddress({
                                    addressNList:paths[i].addressNListMaster,
                                    coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                    scriptType: paths[i].script_type,
                                    showDisplay: false
                                })

                                log.debug(tag,"address: ",address)
                                break;
                            case 'ETH':
                            case 'AVAX':
                            case 'MATIC':
                                address = await wallet.ethGetAddress({
                                    addressNList:paths[i].addressNListMaster,
                                    coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                    scriptType: paths[i].script_type,
                                    showDisplay: false
                                })
                                ethMaster = address
                                break;
                            case 'RUNE':
                                address = await wallet.thorchainGetAddress({
                                    addressNList:paths[i].addressNListMaster,
                                    coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                    scriptType: paths[i].script_type,
                                    showDisplay: false
                                })
                                break;
                            case 'ATOM':
                                address = await wallet.cosmosGetAddress({
                                    addressNList:paths[i].addressNListMaster,
                                    coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                    scriptType: paths[i].script_type,
                                    showDisplay: false
                                })
                                break;
                            case 'OSMO':
                                address = await wallet.osmosisGetAddress({
                                    addressNList:paths[i].addressNListMaster,
                                    coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                    scriptType: paths[i].script_type,
                                    showDisplay: false
                                })
                                break;
                            case 'BNB':
                                address = await wallet.binanceGetAddress({
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
                        log.debug(tag,"address: ",address)
                        if(!address){
                            log.error("Failed to get address for pubkey: ",pubkey)
                            throw Error("address master required for valid pubkey")
                        }
                        normalized.script_type = pubkey.script_type //TODO select script type?
                        //@TODO move this to pioneer-coins funtion! is_address is_xpub
                        if(pubkey.symbol === 'ETH' || pubkey.symbol === 'RUNE' || pubkey.symbol === 'BNB' || pubkey.symbol === 'ATOM' || pubkey.symbol === 'OSMO' || pubkey.symbol === 'AVAX'){
                            normalized.type = "address"
                            normalized.pubkey = address
                        }
                        normalized.master = address
                        normalized.address = address
                        normalized.context = context
                        pubkeys.push(normalized)
                        this.pubkeys.push(normalized)
                    }
                    log.debug(tag,"pubkeys:",pubkeys)
                    
                    output.pubkeys = pubkeys
                    // this.pubkeys = pubkeys
                    if(pubkeys.length !== result.length) {
                        log.error(tag, {pathsKeepkey})
                        log.error(tag, {result})
                        throw Error("Failed to Normalize pubkeys!")
                    }
                    log.debug(tag,"pubkeys: (normalized) ",pubkeys.length)
                    log.debug(tag,"pubkeys: (normalized) ",pubkeys)


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
                }

                //if keepkey
                if(wallet?._isKeepKey){
                    log.debug(tag,"Is keepkey, format pubkeys")
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
                        pathForKeepkey.scriptType = 'p2pkh'
                        //showDisplay
                        pathForKeepkey.showDisplay = false
                        pathsKeepkey.push(pathForKeepkey)
                    }

                    log.debug("***** paths IN: ",pathsKeepkey.length)
                    log.debug("***** paths IN: ",pathsKeepkey)

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

                    let result = await wallet.getPublicKeys(pathsKeepkey)
                    log.debug(tag,"result wallet.getPublicKeys: ",result)
                    // if(walletType === 'keepkey'){
                    //     result = await wallet.getPublicKeys(pathsKeepkey)
                    // } else if(walletType === 'native'){
                    //     log.debug(tag,"pathsKeepkey: ",pathsKeepkey )
                    //     result = await wallet.getPublicKeys(pathsKeepkey)
                    // } else {
                    //     throw Error("unhandled wallet")
                    // }
                    log.debug(tag,"result wallet.getPublicKeys: ",result)
                    if(!result) throw Error("failed to get pubkeys!")


                    
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
                            log.debug(tag,"xpub: ",result[i].xpub)
                            if(!result[i].xpub) throw Error("Missing xpub")

                            //convert to zpub
                            // let zpub = await xpubConvert(result[i].xpub,'zpub')
                            // log.debug(tag,"zpub: ",result[i].xpub)
                            normalized.pubkey = result[i].xpub
                            pubkey.pubkey = result[i].xpub
                        }
                        //TODO get this from supported coins? DRY
                        if(pubkey.symbol === 'ETH' || pubkey.symbol === 'AVAX' || pubkey.symbol === 'RUNE' || pubkey.symbol === 'BNB' || pubkey.symbol === 'ATOM' || pubkey.symbol === 'OSMO'){
                            pubkey.pubkey = result[i].xpub
                        }
                        normalized.note = pubkey.note
                        normalized.symbol = pubkey.symbol
                        normalized.blockchain = COIN_MAP_LONG[pubkey.symbol]
                        normalized.network = COIN_MAP_LONG[pubkey.symbol]
                        normalized.path = addressNListToBIP32(pubkey.addressNList)
                        normalized.pathMaster = addressNListToBIP32(pubkey.addressNListMaster)

                        //get master address
                        let address
                        log.debug(tag,"symbol: ",pubkey.symbol)
                        switch(pubkey.symbol) {
                            case 'BTC':
                            case 'BCH':
                            case 'DOGE':
                            case 'DASH':
                            case 'LTC':
                                address = await wallet.btcGetAddress({
                                    addressNList:paths[i].addressNListMaster,
                                    coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                    scriptType: paths[i].script_type,
                                    showDisplay: false
                                })
                                log.debug(tag,"address: ",address)
                                break;
                            case 'ETH':
                            case 'AVAX':
                            case 'MATIC':
                                address = await wallet.ethGetAddress({
                                    addressNList:paths[i].addressNListMaster,
                                    coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                    scriptType: paths[i].script_type,
                                    showDisplay: false
                                })
                                ethMaster = address
                                break;
                            case 'RUNE':
                                address = await wallet.thorchainGetAddress({
                                    addressNList:paths[i].addressNListMaster,
                                    coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                    scriptType: paths[i].script_type,
                                    showDisplay: false
                                })
                                break;
                            case 'ATOM':
                                address = await wallet.cosmosGetAddress({
                                    addressNList:paths[i].addressNListMaster,
                                    coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                    scriptType: paths[i].script_type,
                                    showDisplay: false
                                })
                                break;
                            case 'OSMO':
                                address = await wallet.osmosisGetAddress({
                                    addressNList:paths[i].addressNListMaster,
                                    coin: COIN_MAP_KEEPKEY_LONG[pubkey.symbol],
                                    scriptType: paths[i].script_type,
                                    showDisplay: false
                                })
                                break;
                            case 'BNB':
                                address = await wallet.binanceGetAddress({
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
                        log.debug(tag,"address: ",address)
                        if(!address){
                            log.error("Failed to get address for pubkey: ",pubkey)
                            throw Error("address master required for valid pubkey")
                        }
                        normalized.script_type = pubkey.script_type //TODO select script type?
                        //@TODO move this to pioneer-coins funtion! is_address is_xpub
                        if(pubkey.symbol === 'ETH' || pubkey.symbol === 'RUNE' || pubkey.symbol === 'BNB' || pubkey.symbol === 'ATOM' || pubkey.symbol === 'OSMO' || pubkey.symbol === 'AVAX'){
                            normalized.type = "address"
                            normalized.pubkey = address
                        }
                        normalized.master = address
                        normalized.address = address
                        normalized.context = context
                        pubkeys.push(normalized)
                        this.pubkeys.push(normalized)
                    }
                    log.debug(tag,"pubkeys:",pubkeys)
                    output.pubkeys = pubkeys
                    // this.pubkeys = pubkeys
                    if(pubkeys.length !== result.length) {
                        log.error(tag, {pathsKeepkey})
                        log.error(tag, {result})
                        throw Error("Failed to Normalize pubkeys!")
                    }
                    log.debug(tag,"pubkeys: (normalized) ",pubkeys.length)
                    log.debug(tag,"pubkeys: (normalized) ",pubkeys)


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
                }

                //if metamask
                if(wallet?._isMetaMask) {
                    log.debug(tag," metamask wallet detected!")
                    ethMaster = 'metamask' //metamask won't tell us whats really on path 60'/0'/0'/0/0
                    let pubkeyEth = {
                        pubkey: wallet.ethAddress,
                        blockchain: 'ethereum',
                        symbol: 'ETH',
                        asset: 'ethereum',
                        path: "m/44'/60'/0'",
                        pathMaster: "m/44'/60'/0'/0/0",
                        script_type: 'ethereum',
                        network: 'ethereum',
                        master: wallet.ethAddress,
                        type: 'address',
                        address: wallet.ethAddress,
                        context: 'metamask.wallet'
                    }
                    pubkeys.push(pubkeyEth)
                    this.pubkeys.push(pubkeyEth)
                    output.pubkeys = pubkeys
                    keyedWallet['ETH'] = pubkeyEth

                    //if extra keys
                    if(wallet?.accounts){
                        for(let i = 0; i < wallet.accounts.length; i++){
                            let account = wallet.accounts[i]
                            let pubkeyEth = {
                                pubkey: account,
                                blockchain: 'ethereum',
                                symbol: 'ETH',
                                asset: 'ethereum',
                                path: "m/44'/60'/0'",
                                pathMaster: "m/44'/60'/0'/0/0",
                                script_type: 'ethereum',
                                network: 'ethereum',
                                master: account,
                                type: 'address',
                                address: account,
                                context: 'metamask.wallet'
                            }
                            pubkeys.push(pubkeyEth)
                        }
                    }
                }
                // let features = wallet.features;
                // log.debug(tag,"vender: ",features)
                // log.debug(tag,"vender: ",features.deviceId)

                //keep it short but unique. label + last 4 of id
                let masterEth = ethMaster || wallet.ethAddress || await this.getAddress('ETH')
                
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
                output.publicAddress = masterEth
                output.context = context
                output.wallet = watchWallet
                return output
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.getBalance = async function (asset:string, sync:boolean){
            let tag = TAG + " | getBalance | "
            try {
                let balances = this.balances.filter((e:any) => e.symbol === asset)
                log.debug(tag,"balances: ",balances)
                if(sync){
                    //sync pubkey for asset
                }
                //TODO sync balances
                return balances
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.getAddress = async function (asset:string) {
            let tag = TAG + " | getAddress | "
            try {
                let pubkeys = this.pubkeys.filter((e:any) => e.symbol === asset)
                log.debug(tag,"pubkeys: ",pubkeys)
                let selected
                let selectedBalance = 0
                if(pubkeys.length === 1){
                    selected = pubkeys[0]
                } else if(pubkeys.length > 1) {
                    //check balances
                    for(let i = 0; i < pubkeys.length; i++){
                        let pubkey = pubkeys[i]
                        let balance = this.balances.filter((e:any) => e.pubkey === pubkey.pubkey)[0]

                        //get balance on pubkey
                        log.debug(tag,"balance: ",balance)
                        log.debug(tag,"balance: ",balance.balance)

                        if(balance.balance > selectedBalance){
                            selectedBalance = balance.balance
                            selected = pubkey
                        }
                    }
                }

                return selected.address || selected.master
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.getPubkey = async function (asset:string, sync?:boolean) {
            let tag = TAG + " | getPubkey | "
            try {
                let output
                //filter by address
                let pubkeys = this.pubkeys.filter((e:any) => e.symbol === asset)
                return pubkeys
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.updateInvocation = async function (updateBody:any) {
            let tag = TAG + " | updateInvocation | "
            try {
                let output = await this.pioneer.UpdateInvocation(updateBody)
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
                let result:any
                switch(tx.type) {
                    case 'sendToAddress':
                        //TODO validate payload
                        log.debug("SendToAddress: ",tx)
                        unsignedTx = await this.sendToAddress(tx.payload)
                        log.debug(tag,"unsignedTx: ",unsignedTx)
                        if(!unsignedTx) throw Error("Failed to build sendToAddress!")
                        if(!tx.payload.blockchain) throw Error("Missing blockchain in sendToAddress payload!")
                        invocation = {
                            type:'sendToAddress',
                            caip:tx.caip,
                            context:tx.payload.context,
                            network:tx.payload.blockchain, //TODO move network to caip
                            blockchain:tx.payload.blockchain,
                            username:this.username,
                            tx:tx.payload,
                            unsignedTx
                        }
                        log.debug(tag,"Save sendToAddress invocation: ",invocation)
                        log.debug(tag,"Save sendToAddress invocation: ",JSON.stringify(invocation))
                        // result = await this.invoke.invoke(invocation)
                        log.debug(tag,"result: ",result)
                        break;
                    case 'swap':
                        //TODO validate payload
                        let quote = await this.swapQuote(tx.payload)
                        log.debug(tag,"quote: ",quote)
                        let invocationId = quote.invocationId

                        //handle error
                        if(!quote.success){
                            //verbose error handling
                            log.error(tag,"verbose error: ",JSON.stringify(quote))
                            log.error(tag,"verbose error: ",quote)
                            throw Error("Failed to Create quote! unable to find a swap route! try again later.")
                        }
                        log.debug(tag,"result: ",result)
                        invocation = {
                            type:'swap',
                            network:tx.payload.network, //TODO move network to blockahin
                            context:tx.payload.context,
                            username:this.username,
                            swap:tx.payload,
                            tx:quote,
                            invocationId
                        }
                        log.debug(tag,"invocation: ",invocation)
                        // result = await this.invoke.invoke(invocation)
                        log.debug(tag,"result: ",result)
                        
                        await sleep(3000)
                        //buildTx
                        unsignedTx = await this.buildSwap(invocationId,tx.payload)
                        log.debug(tag,"pre lookup unsignedTx: ",unsignedTx)
                        if(!unsignedTx) throw Error("Missing unsignedTx!")

                        //update unsignedTx
                        invocation = await this.getInvocation(invocationId)
                        invocation.unsignedTx = unsignedTx
                        log.debug(tag,"***** unsignedTx: ",unsignedTx)

                        //update invocation again with unsignedTx
                        await this.updateInvocation(invocation)

                        let network = tx.payload.input.asset
                        if(!network) throw Error("missing input asset! invalid swap!")

                        break;
                    default:
                        throw Error("Unhandled tx type! "+tx.type)
                    // code block
                }
                if(!unsignedTx) throw Error("failed to create unsigned tx!")
                if(!invocation) throw Error("failed to create invocation!")
                return invocation
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.sign = async function (invocation:any, wallet:any) {
            let tag = TAG + " | sign | "
            try {
                if(!wallet) throw Error("Must pass wallet to sign!")
                log.debug(tag,"invocation: ",invocation)
                // log.debug(tag,"wallet: ",wallet)

                log.debug(tag,"*** invocation: ",JSON.stringify(invocation))

                let blockchain = invocation.blockchain

                if(!invocation.unsignedTx) throw Error("Unable to sign tx! missing unsignedTx")
                let unsignedTx = invocation.unsignedTx
                let txSigned:any
                let broadcastString:any
                let txid:any
                let txFinal:any
                let buffer:any
                
                //validate that context of invoation matchs wallet
                //Unsigned TX
                let addressInfo = {
                    addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
                    coin: 'Ethereum',
                    scriptType: 'ethereum',
                    showDisplay: false
                }
                let ethAddress = await wallet.ethGetAddress(addressInfo)
                let walletContextGiven = ethAddress+".wallet"
                log.debug(tag,"walletContextGiven: ",walletContextGiven)
                log.debug(tag,"invocation.context: ",invocation.context)
                if(walletContextGiven !== invocation.context) throw Error("Invalid context! wallet context does not match invocation context!")

                log.debug(tag,"*** unsignedTx HDwalletpayload: ",JSON.stringify(unsignedTx))
                switch (blockchain) {
                    case 'bitcoin':
                    case 'bitcoincash':
                    case 'dash':
                    case 'digibytes':
                    case 'litecoin':
                    case 'dogecoin':
                        txSigned = await wallet.btcSignTx(unsignedTx)
                        break;
                    case 'avalanche':
                    case 'ethereum':
                        log.debug("unsignedTx: ",unsignedTx)
                        txSigned = await wallet.ethSignTx(unsignedTx)
                        // txid = keccak256(txSigned.serialized).toString('hex')
                        // log.debug(tag,"txid: ",txid)
                        // txSigned.txid = "0x"+txid
                        break;
                    case 'thorchain':
                        txSigned = await wallet.thorchainSignTx(unsignedTx)
                        log.debug(tag,"txSigned: ",txSigned)

                        //sequence inject for thorchain
                        txSigned.signatures[0].sequence = unsignedTx.sequence.toString()

                        broadcastString = {
                            tx:txSigned,
                            // sequence:txSigned.sequence,
                            // account_number:txSigned.account_number,
                            type:"cosmos-sdk/StdTx",
                            mode:"sync"
                        }
                        //let buffer = Buffer.from(JSON.stringify(broadcastString), 'base64');
                        //TODO FIXME
                        //txid = cryptoTools.createHash('sha256').update(buffer).digest('hex').toUpperCase()

                        txSigned.serialized = JSON.stringify(broadcastString)
                        txSigned.serializedTx = JSON.stringify(broadcastString)
                        //txSigned.txid = "TODO"

                        break;
                    case 'binance':
                        txSigned = await wallet.binanceSignTx(unsignedTx)
                        log.debug(tag,"txSigned: ",txSigned)
                        
                        // buffer = Buffer.from(JSON.stringify(txSigned.serialized), 'base64');
                        // txid = cryptoTools.createHash('sha256').update(buffer).digest('hex').toUpperCase()

                        // txSigned.txid = txid
                        txSigned.serialized = txSigned.serialized
                        break;
                    case 'osmosis':
                        txSigned = await wallet.osmosisSignTx(unsignedTx)
                        log.debug(tag,"txSigned: ",txSigned)

                        break;
                    case 'cosmos':
                        txSigned = await wallet.cosmosSignTx(unsignedTx)
                        log.debug(tag,"txSigned: ",txSigned)

                        // txFinal = txSigned
                        // txFinal.signatures = txSigned.signatures
                        //
                        // log.debug("FINAL: ****** ",txFinal)
                        //
                        // broadcastString = {
                        //     tx:txFinal,
                        //     type:"cosmos-sdk/StdTx",
                        //     mode:"sync"
                        // }
                        // buffer = Buffer.from(JSON.stringify(broadcastString), 'base64');
                        // txid = cryptoTools.createHash('sha256').update(buffer).digest('hex').toUpperCase()
                        //
                        // txSigned.txid = txid
                        // txSigned.serialized = JSON.stringify(broadcastString)
                        break;
                    default:
                        throw Error("blockchain not supported! blockchain: "+blockchain)
                }
                log.debug(tag,"txSigned: ",txSigned)

                //update invocation
                // invocation.signedTxs[txSigned]
                //TODO migrate to multi-tx format
                invocation.signedTx = txSigned

                //update invocation
                // let resultUpdate = await this.updateInvocation(invocation)
                // log.debug(tag,"resultUpdate: ",resultUpdate)

                return invocation
            } catch (e) {
                log.error(tag, "e: ", e)
                // @ts-ignore
                throw Error(e)
            }
        }
        this.broadcast = async function (invocation:any) {
            let tag = TAG + " | broadcast | "
            try {

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
                    invocationId: "notSet",
                    noBroadcast:invocation.noBroadcast
                }

                log.debug(tag,"broadcastBodyTransfer: ",broadcastBodyTransfer)
                log.debug(tag,"broadcastBodyTransfer: ",JSON.stringify(broadcastBodyTransfer))
                let resultBroadcastTransfer = await this.pioneer.Broadcast(broadcastBodyTransfer)
                resultBroadcastTransfer = resultBroadcastTransfer.data
                invocation.broadcast = resultBroadcastTransfer
                
                //if 
                
                //updated verify state
                //invocation = await this.getInvocation(invocation.broadcast.invocationId)

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

                log.debug(tag,"lp: ",lp)
                log.debug(tag,"lp: ",{pair:lp.pair,amountIn:lp.amountIn})
                // osmosis
                if(lp.leg1.blockchain === 'osmosis'){
                    lp.protocol = 'osmosis'
                    //get quote for out
                    let swapQuote = await this.pioneer.QuoteSwap({pair:lp.pair,amountIn:lp.amountLeg1})
                    swapQuote = swapQuote.data
                    log.debug(tag,"swapQuote: ",swapQuote)
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
                // let result = await this.invoke.invoke(invocation)
                // if(!result) throw Error("Failed to create invocation!")
                // log.debug("result: ",result)
                //
                // let output = {
                //     success:true,
                //     invocationId:result.invocationId,
                //     lp
                // }
                //
                // return output
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
                log.debug(tag,"invocation: ",invocation)

                let lp = invocation.invocation.lp
                if(!lp) throw Error("invalid invocation! missing lp object")
                if(!lp.leg1.asset) throw Error("invalid invocation! missing lp.leg1.symbol")

                let unsignedTx
                if(lp.leg1.blockchain === 'osmosis'){
                    lp.from = await this.getAddress(lp.leg1.asset)
                    unsignedTx = await this.txBuilder.lp(lp)
                    log.debug(tag,"unsignedTx: ",unsignedTx)
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
                if(!inputAddress) throw Error("failed to get address for input!")
                log.debug(tag,"inputAddress: ",inputAddress)

                //check balance
                // let inputAddress = await this.getBalance(swap.input.asset)
                // log.debug(tag,"inputAddress: ",inputAddress)

                log.debug(tag,"*** inputAddress: ",inputAddress)

                let outputAddress = await this.getAddress(swap.output.asset)
                if(!outputAddress) throw Error("failed to get address for output!")

                //remove bitcoincash: prefix
                outputAddress = outputAddress.replace("bitcoincash:","")
                inputAddress = inputAddress.replace("bitcoincash:","")

                //@TODO validate blockchains convert to rango blockchain! better
                let inputBlockchainRango = getRangoBlockchainName(swap.input.blockchain)
                let outputBlockchainRango = getRangoBlockchainName(swap.output.blockchain)
                if(!inputBlockchainRango) throw Error("Failed to get rango name for blockchain! input: "+swap.input.blockchain)
                if(!outputBlockchainRango) throw Error("Failed to get rango name for blockchain! output: "+swap.output.blockchain)
                
                //build rango payloads
                const connectedWallets = [
                    {blockchain: inputBlockchainRango, addresses: [inputAddress]},
                    {blockchain: outputBlockchainRango, addresses: [outputAddress]}
                ]
                const selectedWallets = {
                    [inputBlockchainRango]:inputAddress,
                    [outputBlockchainRango]:outputAddress
                }
                log.debug(tag,"connectedWallets: ",connectedWallets)
                log.debug(tag,"selectedWallets: ",selectedWallets)

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
                log.debug("rango body: ",body)
                log.debug("rango body: ",JSON.stringify(body))
                let bestRoute
                let error
                try{
                    //body = {"from":{"blockchain":"BTC","symbol":"BTC","address":null},"to":{"blockchain":"ETH","symbol":"ETH","address":null},"amount":"0.0012","connectedWallets":[{"blockchain":"BTC","addresses":["bc1qmk55wxuruezgv0yxqrgnvlwdts3g02nmt58vjf"]},{"blockchain":"LTC","addresses":["ltc1qpmu3c2c9693q66qc7genedxfz9h77gnhfww920"]},{"blockchain":"THOR","addresses":["thor1atev7k3xzsqsenrwjht3k3r70t9mtz0p58qn6d"]},{"blockchain":"BCH","addresses":["qqh080jjpqn4qtew4lt2rk5ul6zwd9lx7y9w2htqqw"]},{"blockchain":"BNB","addresses":["bnb1qyljuasqcmmjznyuqd64mwjlamn22g5shr3twk"]},{"blockchain":"ETH","addresses":["0x5b7FFe740E19F442Eb333d68d999cb509a42d6D0"]},{"blockchain":"POLYGON","addresses":["0x5b7FFe740E19F442Eb333d68d999cb509a42d6D0"]},{"blockchain":"BSC","addresses":["0x5b7FFe740E19F442Eb333d68d999cb509a42d6D0"]}],"selectedWallets":{},"checkPrerequisites":false,"affiliateRef":null}
                    bestRoute = await this.rango.getBestRoute(body)
                    log.debug("bestRoute: ",bestRoute)
                }catch(e){
                    log.debug(tag,"e: ",e)
                    error = e
                }

                let output
                if(bestRoute && bestRoute.result && bestRoute.result.outputAmount){
                    if(!bestRoute.requestId) throw Error("failed to make swap request!")
                    if(!bestRoute.result.outputAmount) throw Error("failed to make quote!")
                    //expiration (time needed until accepted)
                    let duration
                    //create invocation
                    // let invocation:any = {
                    //     type:'swap',
                    //     network:COIN_MAP[swap.input.blockchain],
                    //     context:this.context,
                    //     username:this.username,
                    //     invocationId:bestRoute.requestId,
                    //     swap,
                    //     route:bestRoute
                    // }

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
                log.debug("transactionResponse: ",transactionResponse)
                if(!transactionResponse.ok){
                    throw Error(transactionResponse.error)
                }
                let tx = transactionResponse.transaction
                if(tx.blockChain){
                    tx.network = tx.blockChain
                }
                let inputAsset = swap.input.asset
                if(!inputAsset) throw Error("invalid invocation, missing swap input asset!")

                //rbf
                if(swap.replace) tx.replace = true

                //if UTXO
                if(tx.type === 'TRANSFER' && tx.method === 'transfer'){
                    log.debug("TRANSFER DETECTED! UTXO based")
                    tx.pubkey = await this.getPubkey(inputAsset)
                    if(!tx.pubkey) throw Error("failed to get pubkey!")
                    tx.from = await this.getAddress(inputAsset)
                    if(!tx.from) throw Error("failed to get from address!")
                    tx.memo = transactionResponse.transaction.memo
                } else if(tx.type === 'TRANSFER' && tx.method === 'deposit'){
                    log.debug("DEPOSIT DETECTED! RUNE/contract based")
                    //contract call
                    tx.type = 'DEPOSIT'
                    tx.pubkey = await this.getPubkey(inputAsset)
                    if(!tx.pubkey) throw Error("failed to get pubkey!")
                    tx.from = await this.getAddress(inputAsset)
                    if(!tx.from) throw Error("failed to get from address!")
                    tx.memo = transactionResponse.transaction.memo
                }else {
                    log.debug("EVM DETECTED! evm based")
                    //@TODO this might be jank mapping blockChain/rango to symbol!
                    tx.from = await this.getAddress(inputAsset)
                    if(!tx.from) throw Error("failed to get from address!")
                }

                log.debug(tag,"buildSwap tx: ",tx)
                let unsignedTx = await this.txBuilder.swap(tx)
                log.debug(tag,"unsignedTx: ",unsignedTx)

                return unsignedTx
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
                log.debug(tag,"*** this.balances: ",this.balances)
                log.debug(tag,"*** this.balances: ",this.balances.filter((e:any) => e.asset === "BCH")[0])
                log.debug(tag,"*** tx.asset: ",tx.asset)
                let balances = this.balances.filter((e:any) => e.asset === tx.asset)[0]
                log.debug(tag,"*** balances: ",balances)
                if(!balances) throw Error("No balance found for asset: "+tx.asset)

                //balances
                if(balances.length === 0){
                    throw Error("No balance found for asset! asset"+tx.asset)
                } else if(balances.length === 1){
                    log.debug(tag,"assume from is only balance")
                }else if(balances.length > 1){
                    log.debug(tag,"select larges balance")
                    //select largest balance
                    //let largest =
                }
                //if needed change context?
                
                //transferTx
                let transferTx = {
                    type:"transfer",
                    context:tx.context,
                    blockchain:tx.blockchain,
                    balance:tx.balance,
                    contract:tx.contract,
                    network:tx.network || tx.asset,
                    asset:tx.asset,
                    toAddress:tx.address,
                    amount:tx.amount,
                    memo:tx.memo || '',
                    pubkey: await this.getPubkey(tx.network || tx.asset)
                }
                if(!transferTx.pubkey) throw Error("Failed to find pubkey!")
                if(!tx.address) tx.address = tx.pubkey.address
                //unsignedTx
                log.debug(tag,"transferTx: ",transferTx)
                let unsignedTx = await this.txBuilder.buildTx(transferTx)
                log.debug(tag,"unsignedTx: ",unsignedTx)
                log.debug(tag,"pre lookup unsignedTx: ",JSON.stringify(unsignedTx))

                //smart insight?

                return unsignedTx
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
    }
}

export default SDK
