/*

     Pioneer SDK
        A typescript sdk for integrating cryptocurrency wallets info apps


    curl -d "param1=value1&param2=value2" -X POST http://localhost:1646/send

 */

const TAG = " | Pioneer-sdk | "
const log = require("@pioneer-platform/loggerdog")()
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
// import * as core from "@shapeshiftoss/hdwallet-core";


export class SDK {
    private wss: any;
    private queryKey: any;
    private spec: any;

    private transfer: (tx: any, options: any, asset: string) => Promise<void>;
    private init: (tx: any, options: any, asset: string) => Promise<void>;
    private wallet: any;
    private keyring: any;
    private device: any;
    private transport: any;
    private pioneer: any;

    constructor(spec:string,config:any) {
        this.wss = config.wss || 'wss://pioneers.dev'
        this.queryKey = config.queryKey // or generate?
        this.spec = config.spec || 'https://pioneers.dev/spec/swagger.json'
        this.init = async function (wallet:any) {
            let tag = TAG + " | init | "
            try {
                //TODO verify init?
                this.wallet = wallet

                //pioneer
                let Pioneer = new pioneerApi(config.spec,config)
                this.pioneer = await Pioneer.init()

                //get status from server
                let status = await this.pioneer.instance.Health()
                if(!status.data.online) throw Error("Pioneer Server offline!")
                log.info(tag,"pioneer status: ",status.data)
                
                //get user info
                let userInfo = await this.pioneer.instance.User()
                userInfo = userInfo.data
                
                //TODO verify ETH address match

                if(!userInfo.success) {
                    //no wallets paired
                    log.info(tag, "user not registered!")
                } else if(userInfo.success) {
                    log.info(tag,"userInfo: ",userInfo)
                    //this.isPaired = true
                    
                }
                
            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
        this.transfer = async function (tx:any, options:any, asset:string) {
            let tag = TAG + " | transfer | "
            try {

            } catch (e) {
                log.error(tag, "e: ", e)
            }
        }
    }
}

