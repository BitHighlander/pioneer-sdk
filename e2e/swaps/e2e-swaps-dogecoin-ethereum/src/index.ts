/*
    E2E testing

 */

require("dotenv").config()
require('dotenv').config({path:"../../.env"});
require('dotenv').config({path:"./../../.env"});
require("dotenv").config({path:'../../../.env'})
require("dotenv").config({path:'../../../../.env'})

const TAG  = " | intergration-test | "
import { KeepKeySdk } from '@keepkey/keepkey-sdk'
import * as core from "@shapeshiftoss/hdwallet-core";
import { KkRestAdapter } from '@keepkey/hdwallet-keepkey-rest'
import { NativeAdapter } from '@shapeshiftoss/hdwallet-native'

const log = require("@pioneer-platform/loggerdog")()
let assert = require('assert')
let SDK = require('@pioneer-sdk/sdk')
let wait = require('wait-promise');

let sleep = wait.sleep;

let BLOCKCHAIN = 'dogecoin'
let BLOCKCHAIN_OUTPUT = 'ethereum'
let ASSET = 'DOGE'
let MIN_BALANCE = process.env['MIN_BALANCE_DOGE'] || "1.0004"
// let TEST_AMOUNT = process.env['TEST_AMOUNT'] || "MAX"
let TEST_AMOUNT = process.env['TEST_AMOUNT'] || "1"
let spec = process.env['URL_PIONEER_SPEC'] || 'https://pioneers.dev/spec/swagger.json'
let wss = process.env['URL_PIONEER_SOCKET'] || 'wss://pioneers.dev'

let TRADE_PAIR  = "DOGE_ETH"
let INPUT_ASSET = ASSET
let OUTPUT_ASSET = "ETH"

let noBroadcast = false

console.log("spec: ",spec)
console.log("wss: ",wss)

let invocationId:string
//let invocationId = "a49f0e76-08b2-45d0-8812-883a5c17c079"

// let blockchains = [
//     'avalanche'
// ]

let blockchains = [
    'bitcoin','ethereum','thorchain','bitcoincash','litecoin','binance','cosmos','dogecoin'
]

let txid:string

let IS_SIGNED: boolean

const start_metamask_wallet = async () => {
    const TAG = " | start_metamask_wallet | "
    let wallet = {
        _isMetaMask: true,
        ethAddress:"0x33b35c665496ba8e71b22373843376740401f106"
    }
    return wallet
}

const start_software_wallet = async function(){
    try{
        let mnemonic = process.env['WALLET_MAIN']
        if(!mnemonic) throw Error("Unable to load wallet! missing env WALLET_MAIN")
        const keyring = new core.Keyring();
        const nativeAdapter = NativeAdapter.useKeyring(keyring);
        let wallet = await nativeAdapter.pairDevice("testid");
        //@ts-ignore
        await nativeAdapter.initialize();
        // @ts-ignore
        wallet.loadDevice({ mnemonic });
        if(!wallet) throw Error("failed to init wallet!")
        return wallet
    }catch(e){
        console.error(e)
    }
}

const start_keepkey_controller = async function(){
    try{
        let serviceKey = "135085f0-5c73-4bb1-abf0-04ddfc710b07"
        let config: any = {
            apiKey: serviceKey,
            pairingInfo: {
                name: 'ShapeShift',
                imageUrl: 'https://assets.coincap.io/assets/icons/fox@2x.png',
                basePath: 'http://localhost:1646/spec/swagger.json',
                url: 'https://app.shapeshift.com',
            },
        }
        let sdk = await KeepKeySdk.create(config)
        console.log(config.apiKey)
        const keyring = new core.Keyring();
        // let adapter = KkRestAdapter.create()
        // console.log("adapter: ",KkRestAdapter)
        // let wallet = await KkRestAdapter.pairDevice(sdk)
        // @ts-ignore
        let wallet = await KkRestAdapter.useKeyring(keyring).pairDevice(sdk)
        //console.log("wallet: ",wallet)
        return wallet
    }catch(e){
        console.error(e)
    }
}


const test_service = async function () {
    let tag = TAG + " | test_service | "
    try {
        console.log(tag,' CHECKPOINT 1');
        console.time('start2paired');
        console.time('start2build');
        console.time('start2broadcast');
        console.time('start2end');

        //if force new user
        //const queryKey = "sdk:pair-keepkey:"+uuidv4();
        const queryKey = process.env['PIONEER_QUERYKEY'];
        assert(queryKey)

        const username = process.env['PIONEER_USERNAME'];
        assert(username)
        
        //add custom path
        let paths:any = [
        ]
        
        let config:any = {
            blockchains,
            username,
            queryKey,
            spec,
            wss,
            paths
        }
        console.log(tag,' CHECKPOINT 2');
        let app = new SDK.SDK(spec,config)
        log.debug(tag,"app: ",app)
        console.log(tag,' CHECKPOINT 3');
        //forget
        // log.info(tag,"app.pioneer: ",app.pioneer.instance)
        // let resultForget = await app.pioneer.instance.Forget()
        // log.info(tag,"resultForget: ",resultForget.data)


        //verify paths
        //NOTE bitcoin has 2 paths, and this is NOT equal to the number of blockchains
        // log.info(tag,"blockchains: ",blockchains)
        // log.info(tag,"paths: ",app.paths)
        // log.info(tag,"paths: ",app.paths.length)
        // log.info(tag,"blockchains: ",blockchains.length)
        // if(app.paths.length !== blockchains.length){
        //     let blockchainsInPaths:any = []
        //     for(let i = 0; i < app.paths.length; i++){
        //         blockchainsInPaths.push(app.paths[i].blockchain)
        //     }
        //     log.error(tag,"blockchains: ",blockchains)
        //     log.error(tag,"blockchainsInPaths: ",blockchainsInPaths)
        //     let missing = blockchainsInPaths.filter((item: string) => blockchains.indexOf(item) < 0);
        //     log.info(tag,"missing: ",missing)
        // }
        // assert(app.paths.length === blockchains.length)
        
        //get HDwallet
        let walletKeepKey = await start_keepkey_controller()
        let walletSoftware = await start_software_wallet()
        let walletMetaMask = await start_metamask_wallet()

        // let wallet = await start_software_wallet()
        log.debug(tag,"walletKeepKey: ",walletKeepKey)
        assert(walletKeepKey)

        log.debug(tag,"walletSoftware: ",walletSoftware)
        assert(walletSoftware)

        log.debug(tag,"wallet: ",walletMetaMask)
        assert(walletMetaMask)

        //init with metamask
        let result = await app.init(walletMetaMask)
        log.debug(tag,"result: ",result)

        //verify metamask is in description
        let user0 = await result.User()
        user0 = user0.data
        log.debug(tag,"user0 user: ",user0)
        log.debug(tag,"user0 wallets: ",user0.wallets)
        log.debug(tag,"user0 walletDescriptions: ",user0.walletDescriptions)
        assert(user0)
        assert(user0.wallets)
        assert(user0.walletDescriptions)
        
        //get descripton
        let descriptionMetamask = user0.walletDescriptions.filter((e:any) => e.type === "metamask")[0]
        assert(descriptionMetamask)
        
        //pair keepkey
        let successKeepKey = await app.pairWallet(walletKeepKey)
        log.info(tag,"successKeepKey: ",successKeepKey)
        assert(successKeepKey)
        await app.refresh()
        log.info(tag,"checkpoint post refresh: ")
        let user1 = await result.User()
        user1 = user1.data
        log.debug(tag,"user: ",user1)
        assert(user1)

        log.debug(tag,"user: ",user1.walletDescriptions)
        let keepkeyWalletDescription = user1.walletDescriptions.filter((e:any) => e.type === "keepkey")
        assert(keepkeyWalletDescription)
        log.debug(tag,"keepkeyWalletDescription: ",keepkeyWalletDescription)

        //pair software
        let successSoftware = await app.pairWallet(walletSoftware)
        log.debug(tag,"successSoftware: ",successSoftware)
        assert(successSoftware)
        
        //verify all are paired
        fetch("https://raw.githack.com/keepkey/keepkey-updater/master/firmware/releases.json", {
            "referrerPolicy": "no-referrer",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "omit"
        }); ;
        fetch("https://raw.githack.com/keepkey/keepkey-updater/master/firmware/releases.json", {
            "referrerPolicy": "no-referrer",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "omit"
        }); ;
        fetch("https://dev-api.avalanche.shapeshift.com/api/v1/account/0x141D9959cAe3853b035000490C03991eB70Fc4aC", {
            "headers": {
                "accept": "*/*",
                "accept-language": "en-US,en;q=0.9",
                "if-none-match": "W/\"85-vVyX9WTmYlu6qd5JzZ0iLe83Lng\"",
                "sec-ch-ua": "\"Google Chrome\";v=\"111\", \"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"111\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "cross-site"
            },
            "referrerPolicy": "no-referrer",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "omit"
        }); ;
        fetch("https://dev-api.avalanche.shapeshift.com/api/v1/send", {
            "headers": {
                "accept": "*/*",
                "accept-language": "en-US,en;q=0.9",
                "content-type": "application/json",
                "sec-ch-ua": "\"Google Chrome\";v=\"111\", \"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"111\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "cross-site"
            },
            "referrerPolicy": "no-referrer",
            "body": "{\"hex\":\"0x02f87482a86a808459682f00850bfda3a30082520894c3affff54122658b89c31183cec4f15514f34624872386f26fc1000080c080a0dfa0b07cfddb2422b05d51f680839c5820c267974bcb761d5399c79d3f1c8025a010a6c76bb04d6dc671e01bb26a135748e0d8b26cd30d27e317dae57ccafd5a64\"}",
            "method": "POST",
            "mode": "cors",
            "credentials": "omit"
        }); ;
        fetch("https://dev-api.avalanche.shapeshift.com/api/v1/send", {
            "headers": {
                "accept": "*/*",
                "accept-language": "en-US,en;q=0.9",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "cross-site"
            },
            "referrerPolicy": "no-referrer",
            "body": null,
            "method": "OPTIONS",
            "mode": "cors",
            "credentials": "omit"
        });
        //User
        let user2 = await result.User()
        user2 = user2.data
        log.debug(tag,"user: ",user2)
        log.debug(tag,"user: ",user2.wallets)
        log.debug(tag,"user: ",user2.walletDescriptions)
        //walletDescriptions

        let nativeWalletDescription = user2.walletDescriptions.filter((e:any) => e.type === "native")
        assert(nativeWalletDescription)
        log.info(tag,"nativeWalletDescription: ",nativeWalletDescription)
        
        await app.refresh()
        //pair wallet metamask
        
        //pair wallet xdefi
        
        //pair wallet tallyho
        
        //pair wallet keplr

        //path
        log.debug(tag,"ASSET: ",ASSET)
        let path = app.paths.filter((e:any) => e.symbol === ASSET)
        log.debug("path: ",path)
        log.debug("app.paths: ",app.paths.length)
        assert(path[0])

        let pubkey = app.pubkeys.filter((e:any) => e.symbol === ASSET)
        log.debug("pubkey: ",pubkey)
        log.debug("app.pubkeys: ",app.pubkeys.length)
        assert(pubkey[0])

        //verify you have a balance of selected asset
        let balance = app.balances.filter((e:any) => e.symbol === ASSET)
        log.debug("balance: ",balance)
        log.debug("balance: ",balance[0].balance)
        assert(balance)
        assert(balance[0])
        assert(balance[0].balance)

        //should have a default context always
        let walletContext = await app.context
        assert(walletContext)
        log.info("walletContext: ",walletContext)

        //set to current wallet
        // let changeContext = await app.setWalletContext(walletContext)

        let blockchainContext = await app.blockchainContext
        assert(blockchainContext)
        log.info("blockchainContext: ",blockchainContext)

        //set blockchain context
        let changeBlockchainContext = await app.setBlockchainContext(BLOCKCHAIN)
        assert(changeBlockchainContext)
        log.info("changeBlockchainContext: ",changeBlockchainContext)

        let blockchainContextPost = await app.blockchainContext
        assert(blockchainContextPost, BLOCKCHAIN)
        log.info("blockchainContextPost: ",blockchainContextPost)

        //set asset context
        let assetContext = await app.assetContext
        assert(assetContext)
        log.info("assetContext: ",assetContext)

        let changeAssetContext = await app.setAssetContext(ASSET)
        assert(changeAssetContext)
        log.info("changeAssetContext: ",changeAssetContext)

        //set asset context
        let assetContextPost = await app.assetContext
        assert(assetContextPost, ASSET)
        log.info("assetContextPost: ",assetContextPost)

        //attempt to change wallet context to unpaired wallet

        //attempt to change blockchain context to unsupported by current wallet

        //attempt to change asset context to a unsupported asset of current blockchain

        //validate amount

        //build swap
        if(!invocationId) {
            let swap: any = {
                input: {
                    blockchain: BLOCKCHAIN,
                    asset: ASSET,
                },
                output: {
                    blockchain: BLOCKCHAIN_OUTPUT,
                    asset: OUTPUT_ASSET,
                },
                amount: TEST_AMOUNT,
                noBroadcast: true
            }
            log.info(tag, "swap: ", swap)

            let tx = {
                type: 'swap',
                payload: swap
            }

            log.notice(tag, "CHECKPOINT0: pre-buildTx")

            invocationId = await app.build(tx)
            log.info(tag, "invocationId: ", invocationId)
            assert(invocationId)

            //get invocation
            let invocationInfo = await app.getInvocation(invocationId)
            log.info(tag, "invocationInfo: ", invocationInfo)

            //@TODO if no signedTx then sign again
            let resultSign = await app.sign(invocationId)
            log.info(tag,"resultSign: ",resultSign)

            //@TODO if no broadcastInfo then broadcast again
            //get txid
            let payload = {
                noBroadcast:true,
                sync:true,
                invocationId
            }
            let resultBroadcast = await app.broadcast(payload)
            log.info(tag,"resultBroadcast: ",resultBroadcast)
        }


        log.notice("****** TEST PASS ******")
        //process
        //process.exit(0)
    } catch (e) {
        log.error(e)
        //process
        process.exit(666)
    }
}
test_service()
