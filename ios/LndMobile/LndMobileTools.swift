import Foundation

public struct LndMobileToolsError: Error {
  let msg: String
}

extension LndMobileToolsError: LocalizedError {
  public var errorDescription: String? {
    return NSLocalizedString(msg, comment: "")
  }
}

@objc(LndMobileTools)
class LndMobileTools: NSObject, RCTBridgeModule {
  @objc
  static func moduleName() -> String! {
    "LndMobileTools"
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc(writeConfig:resolver:rejecter:)
  func writeConfig(config: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    do {
      let paths = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
      let url = paths[0].appendingPathComponent("lnd", isDirectory: true).appendingPathComponent("lnd.conf", isDirectory: false)

      try config.write(to: url, atomically: true, encoding: .utf8)
      let input = try String(contentsOf: url)
      NSLog("Read config: " + input)
      resolve("Config written")
    } catch let error {
      NSLog(error.localizedDescription)
      reject("error", error.localizedDescription, error)
    }
  }

  @objc(writeConfigFile:rejecter:)
  func writeConfigFile(resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) -> Void {
    let chain = Bundle.main.object(forInfoDictionaryKey: "CHAIN") as? String
    var str = ""

    if (chain == "mainnet") {
      str =
"""
[Application Options]
debuglevel=info
maxbackoff=2s
norest=1
sync-freelist=1
accept-keysend=1

[Routing]
routing.assumechanvalid=1

[Bitcoin]
bitcoin.active=1
bitcoin.mainnet=1
bitcoin.node=neutrino

[Neutrino]
neutrino.connect=btcd-mainnet.lightning.computer
neutrino.feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json

[autopilot]
autopilot.active=0
autopilot.private=1
autopilot.minconfs=1
autopilot.conftarget=3
autopilot.allocation=1.0
autopilot.heuristic=externalscore:0.95
autopilot.heuristic=preferential:0.05

"""
    } else if (chain == "testnet") {
      str =
"""
[Application Options]
debuglevel=info
maxbackoff=2s
norest=1
sync-freelist=1
accept-keysend=1

[Routing]
routing.assumechanvalid=1

[Bitcoin]
bitcoin.active=1
bitcoin.testnet=1
bitcoin.node=neutrino

[Neutrino]
neutrino.connect=btcd-testnet.lightning.computer
neutrino.feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json

[autopilot]
autopilot.active=0
autopilot.private=1
autopilot.minconfs=1
autopilot.conftarget=3
autopilot.allocation=1.0
autopilot.heuristic=externalscore:0.95
autopilot.heuristic=preferential:0.05

"""
    } else if (chain == "regtest") {
      str =
"""
[Application Options]
debuglevel=info
maxbackoff=2s
norest=1
sync-freelist=1
accept-keysend=1

[Routing]
routing.assumechanvalid=1

[Bitcoin]
bitcoin.active=1
bitcoin.regtest=1
bitcoin.node=bitcoind

[Bitcoind]
bitcoind.rpchost=192.168.1.113:18443
bitcoind.rpcuser=polaruser
bitcoind.rpcpass=polarpass
bitcoind.zmqpubrawblock=192.168.1.113:28334
bitcoind.zmqpubrawtx=192.168.1.113:29335

[autopilot]
autopilot.active=0
autopilot.private=1
autopilot.minconfs=1
autopilot.conftarget=3
autopilot.allocation=1.0
autopilot.heuristic=externalscore:0.95
autopilot.heuristic=preferential:0.05

"""
    }

    do {
      let paths = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
      let url = paths[0].appendingPathComponent("lnd", isDirectory: true).appendingPathComponent("lnd.conf", isDirectory: false)

      try str.write(to: url, atomically: true, encoding: .utf8)
      let input = try String(contentsOf: url)
      NSLog("Read config: " + input)
      resolve("Config written")
    } catch let error {
      NSLog(error.localizedDescription)
      reject("error", error.localizedDescription, error)
    }
  }

  @objc(log:tag:msg:)
  func log(level: String, tag: String, msg: String) {
    NSLog("[" + tag + "] " + msg)
  }

  @objc(DEBUG_getWalletPasswordFromKeychain:rejecter:)
  func DEBUG_getWalletPasswordFromKeychain(resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let server = "password"

    let query = [
      kSecClass as String: kSecClassInternetPassword,
      kSecAttrServer as String: server,
      kSecReturnAttributes as String: kCFBooleanTrue!,
      kSecReturnData as String: kCFBooleanTrue!,
      kSecMatchLimit as String: kSecMatchLimitOne as String
    ] as CFDictionary

    var result: AnyObject?
    let osStatus = SecItemCopyMatching(query, &result)
    if osStatus != noErr && osStatus != errSecItemNotFound {
      let error = NSError(domain: NSOSStatusErrorDomain, code: Int(osStatus), userInfo: nil)
      return reject("error", error.localizedDescription, error)
    } else if (result == nil) {
      return resolve(NSNumber(value: false))
    }

    if let passwordData = result![kSecValueData] as? Data {
      let password = String(data: passwordData, encoding: .utf8)
      return resolve(password)
    }
  }

  @objc(getTorEnabled:rejecter:)
  func getTorEnabled(resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // let asyncStorage = self.bridge.module(forClass: RNCAsyncStorage.self)
    let asyncStorage = RNCAsyncStorage.init()

    asyncStorage.methodQueue.async {
      asyncStorage.multiGet(["torEnabled"], callback: { (result) in
        if let result = result {
          let count = result[0]
          if count is Error {
            let error = count as! Error
            reject("error", error.localizedDescription, error)
            return
          }

          if let values = result[1] as? [[String]] {
            if let first = values[0] as [String]? {
              resolve(first[1])
            }
          }
        }
      })
    }
  }

  @objc(saveChannelsBackup:resolver:rejecter:)
  func saveChannelsBackup(base64Backups: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      // let data = Data(base64Encoded: base64Backups, options: [])
      let activityController = UIActivityViewController(activityItems: [base64Backups], applicationActivities: nil)
      RCTSharedApplication()?.delegate?.window??.rootViewController?.present(activityController, animated: true, completion: {
        resolve(true)
      })
    }
  }

  @objc(checkICloudEnabled:rejecter:)
  func checkICloudEnabled(resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let token = FileManager.default.ubiquityIdentityToken
    resolve(token != nil)
  }

  @objc(DEBUG_listFilesInDocuments:rejecter:)
  func DEBUG_listFilesInDocuments(resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let fileManager = FileManager.default
    let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
    do {
      let fileURLs = try fileManager.contentsOfDirectory(at: documentsURL, includingPropertiesForKeys: nil)
      print(fileURLs)
      resolve(fileURLs.description)
    } catch {
      print("Error while enumerating files \(documentsURL.path): \(error.localizedDescription)")
      reject("error", error.localizedDescription, error)
    }
  }

  @objc(DEBUG_listFilesInApplicationSupport:rejecter:)
  func DEBUG_listFilesInApplicationSupport(resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let fileManager = FileManager.default
    let applicationSupportUrl = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    let lndUrl = applicationSupportUrl.appendingPathComponent("lnd")
    do {
      let fileURLs = try fileManager.contentsOfDirectory(at: lndUrl, includingPropertiesForKeys: nil)
      // process files
      print(fileURLs)
      resolve(fileURLs.description)
    } catch {
      print("Error while enumerating files \(lndUrl.path): \(error.localizedDescription)")
      reject("error", error.localizedDescription, error)
    }
  }

  @objc(checkApplicationSupportExists:rejecter:)
  func checkApplicationSupportExists(resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let applicationSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
    resolve(FileManager.default.fileExists(atPath: applicationSupport.path))
  }

  @objc(checkLndFolderExists:rejecter:)
  func checkLndFolderExists(resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let applicationSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
    let lndFolder = applicationSupport.appendingPathComponent("lnd", isDirectory: true)
    resolve(FileManager.default.fileExists(atPath: lndFolder.path))
  }

  @objc(createIOSApplicationSupportAndLndDirectories:rejecter:)
  func createIOSApplicationSupportAndLndDirectories(resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    do {
//      try FileManager.default.url(
//        for: .applicationSupportDirectory,
//        in: .userDomainMask,
//        appropriateFor: nil,
//        create: true
//      )
      let applicationSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
      let lndFolder = applicationSupport.appendingPathComponent("lnd", isDirectory: true)
      // This will create the lnd folder as well as "Application Support"
      try FileManager.default.createDirectory(at: lndFolder, withIntermediateDirectories: true)

      resolve(true)
    } catch let error {
      reject("error", error.localizedDescription, error)
    }
  }

  @objc(excludeLndICloudBackup:rejecter:)
  func excludeLndICloudBackup(resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let applicationSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
    var lndFolder = applicationSupport.appendingPathComponent("lnd", isDirectory: true)

    do {
      if FileManager.default.fileExists(atPath: lndFolder.path) {
        var resourceValues = URLResourceValues()
        resourceValues.isExcludedFromBackup = true
        try lndFolder.setResourceValues(resourceValues)
        resolve(true)
      } else {
        let error = LndMobileToolsError(msg: "lnd path " + lndFolder.path + " doesn't exist")
        reject("error", error.localizedDescription, error)
      }
    } catch let error {
      print("failed setting isExcludedFromBackup: \(error)")
      reject("error", error.localizedDescription, error)
    }
  }

  @objc(TEMP_moveLndToApplicationSupport:rejecter:)
  func TEMP_moveLndToApplicationSupport(resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
    let applicationSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!

    let newLndFolder = applicationSupport.appendingPathComponent("lnd", isDirectory: true)

    let lndData = documents.appendingPathComponent("data", isDirectory: true)
    let lndConfig = documents.appendingPathComponent("lnd.conf")

    let newlndDataPath = newLndFolder.appendingPathComponent("data")
    let newLndConfigPath = newLndFolder.appendingPathComponent("lnd.conf")

    NSLog("FROM: \(lndData.path)")
    NSLog("TO: \(newlndDataPath.path)")

    do {
      if FileManager.default.fileExists(atPath: newLndFolder.path) {
        try FileManager.default.moveItem(at: lndData, to: newlndDataPath)
        try FileManager.default.moveItem(at: lndConfig, to: newLndConfigPath)
        resolve(true)
      } else {
        let error = LndMobileToolsError(msg: "lnd path \(newLndFolder.path) doesn't exist")
        reject("error", error.localizedDescription, error)
      }
    } catch let error {
      NSLog("Failed moving lnd files: \(error)")
      reject("error", error.localizedDescription, error)
    }
  }
}
