import path from "path";

const TAG = " | Config | ";
const fs = require("fs-extra");
const homedir = require("os").homedir();
const mkdirp = require("mkdirp");
const finder = require("find-package-json");
const log = require("loggerdog-client")();

import { v4 as uuidv4 } from 'uuid';

export const pioneerConfig = path.join(homedir, ".pioneer", "pioneer.json");
export const configPath = path.join(homedir, ".pioneer", "pioneer.json");
export const seedPath = path.join(
  homedir,
  ".pioneer",
  "wallet_data/wallet.seed"
);
export const seedDir = path.join(homedir, ".pioneer", "wallet_data");
export const pioneerPath = path.join(homedir, ".pioneer");
export const modelDir = path.join(homedir, ".pioneer", "models");
export const backtestDir = path.join(homedir, ".pioneer", "backtest");
export const appDir = path.join(homedir, '.pioneer', 'apps')
export const logDir = path.join(pioneerPath, "log");

export async function innitConfig(languageSelected: string) {
  let tag = TAG + " | importConfig | ";
  try {
    let output: any = {};
    // //console.log(tag, "CHECKPOINT innitConfig");
    // //console.log(tag, "pioneerPath: ", pioneerPath);
    // //console.log(tag, "seedDir: ", seedDir);

    let isCreated = await mkdirp(pioneerPath);
    // //console.log("isCreated: ", isCreated);

    let isCreated2 = await mkdirp(logDir);
    // //console.log("isCreated: ", isCreated2);

    let isCreated3 = await mkdirp(seedDir);
    // //console.log("isCreated: ", isCreated3);

    // //console.log(tag, " innit config checkpiont 2");
    //generate query key
    const queryKey = uuidv4();
    let config: any = {};
    config.locale = "english";
    config.localeSelected = true;
    config.queryKey = queryKey
    //config.version = finder.next().value.version;
    config.isCli = true;

    fs.writeFileSync(pioneerConfig, JSON.stringify(config));
  } catch (e) {
    console.error(tag, "e: ", e);
    return {};
  }
}


// innit Apps
export async function initApps () {
  const tag = TAG + ' | initApps | '
  try {
    mkdirp.sync(appDir)

    console.log('appDir: ', appDir)

    //list folders
    let apps = await fs.readdir(appDir)

    return apps
  } catch (e) {
    console.error(tag, 'e: ', e)
    return {}
  }
}

// getApps
export async function getApps () {
  const tag = TAG + ' | getApps | '
  try {

    //list folders
    let apps = await fs.readdir(appDir)

    return apps
  } catch (e) {
    console.error(tag, 'e: ', e)
    return {}
  }
}

//innit Wallet
export async function initWallet(encryptedSeed: any, passwordHash: any) {
  let tag = TAG + " | initWallet | ";
  try {
    log.debug(tag, "seedDir: ", seedDir);

    //make the dir
    let isCreated = await mkdirp(seedDir);
    //console.log("isCreated: ", isCreated);

    let output: any = {};
    //console.log(tag, "CHECKPOINT innitConfig");
    //console.log(tag, "encryptedSeed: ", encryptedSeed);


    let wallet: any = {};
    wallet.hash = passwordHash;
    wallet.version = 1;
    wallet.type = "seedwords";
    wallet.vault = encryptedSeed;

    let result = fs.writeFileSync(seedPath, JSON.stringify(wallet));
    //console.log("result: ", result);

    return true;
  } catch (e) {
    console.error(tag, "e: ", e);
    return {};
  }
}

//backup Wallet
export async function backupWallet(outDir: any, passwordHash: any,encryptedSeed: any, context:string) {
  let tag = TAG + " | backupWallet | ";
  try {
    log.debug(tag, "outDir: ", outDir);

    //make the dir
    let isCreated = await mkdirp(outDir);

    let wallet: any = {};
    wallet.hash = passwordHash;
    wallet.version = 1;
    wallet.type = "seedwords";
    wallet.vault = encryptedSeed;

    let result = fs.writeFileSync(outDir+"/"+context+".wallet.json", JSON.stringify(wallet));
    //console.log("result: ", result);

    return result;
  } catch (e) {
    console.error(tag, "e: ", e);
    return {};
  }
}

//check
export function checkConfigs() {
  let output: any = {};
  output.isConfigured = false;
  output.isWallet = false;
  output.isRegistered = false;

  let fileFound = fs.existsSync(pioneerConfig) ? true : false;
  if (fileFound) {
    output.config = JSON.parse(fs.readFileSync(configPath));
    if (output.config.version) output.isConfigured = true;
    if (output.config.username) output.isRegistered = true;
  }

  if (output.config && output.config.version) output.isConfigured = true;

  //wallet found?
  let walletFound = fs.existsSync(seedPath) ? true : false;
  if (walletFound) {
    output.isWallet = true;
  }

  return output;
}

export function getWallet(path?:string) {
  try {
    if(!path) path = seedPath
    let walletBuff = fs.readFileSync(path);
    let walletString = walletBuff.toString()
    let wallet = JSON.parse(walletString)

    return wallet
  } catch (e) {
    return {};
  }
}

export function getConfig() {
  try {
    let output = JSON.parse(fs.readFileSync(configPath));

    return output;
  } catch (e) {
    return {};
  }
}

export function setConfig(options: any) {
  return fs.writeFileSync(configPath, JSON.stringify(options));
}

export function updateConfig(options: any) {
  let options_ = getConfig();
  for (var key in options) {
    options_[key] = options[key];
  }
  setConfig(options_);
}

//export const logLevel = getConfig()['debug']?'debug':'info'
export const logLevel = "debug";
