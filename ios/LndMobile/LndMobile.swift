import Foundation
import Lndmobile

@objc(LndMobile)
class LndMobile: RCTEventEmitter {
  @objc
  override static func moduleName() -> String! {
    "LndMobile"
  }

  var walletUnlockedResolver: RCTPromiseResolveBlock? = nil

  override func supportedEvents() -> [String]! {
    var events = Lnd.streamMethods.map{ $0.key }
    events.append("WalletUnlocked")
    return events
  }

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc(initialize:rejecter:)
  func initialize(resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    // If regtest, we need to ask for LAN access permission
    // before lnd requests it, otherwise it won't have time and crash
    // https://developer.apple.com/forums/thread/663768
    let chain = Bundle.main.object(forInfoDictionaryKey: "CHAIN") as? String
    if (chain == "regtest") {
      NSLog("Triggering LAN access permission dialog")
      triggerLocalNetworkPrivacyAlert()
    }
    resolve([
      "data": ""
    ])
  }

  func triggerLocalNetworkPrivacyAlert() {
    let sock4 = socket(AF_INET, SOCK_DGRAM, 0)
    guard sock4 >= 0 else { return }
    defer { close(sock4) }
    let sock6 = socket(AF_INET6, SOCK_DGRAM, 0)
    guard sock6 >= 0 else { return }
    defer { close(sock6) }

    let addresses = addressesOfDiscardServiceOnBroadcastCapableInterfaces()
    var message = [UInt8]("!".utf8)
    for address in addresses {
      address.withUnsafeBytes { buf in
        let sa = buf.baseAddress!.assumingMemoryBound(to: sockaddr.self)
        let saLen = socklen_t(buf.count)
        let sock = sa.pointee.sa_family == AF_INET ? sock4 : sock6
        _ = sendto(sock, &message, message.count, MSG_DONTWAIT, sa, saLen)
      }
    }
  }

  /// Returns the addresses of the discard service (port 9) on every
  /// broadcast-capable interface.
  ///
  /// Each array entry is contains either a `sockaddr_in` or `sockaddr_in6`.
  private func addressesOfDiscardServiceOnBroadcastCapableInterfaces() -> [Data] {
    var addrList: UnsafeMutablePointer<ifaddrs>? = nil
    let err = getifaddrs(&addrList)
    guard err == 0, let start = addrList else { return [] }
    defer { freeifaddrs(start) }
    return sequence(first: start, next: { $0.pointee.ifa_next })
      .compactMap { i -> Data? in
        guard
            (i.pointee.ifa_flags & UInt32(bitPattern: IFF_BROADCAST)) != 0,
            let sa = i.pointee.ifa_addr
        else { return nil }
        var result = Data(UnsafeRawBufferPointer(start: sa, count: Int(sa.pointee.sa_len)))
        switch CInt(sa.pointee.sa_family) {
        case AF_INET:
            result.withUnsafeMutableBytes { buf in
                let sin = buf.baseAddress!.assumingMemoryBound(to: sockaddr_in.self)
                sin.pointee.sin_port = UInt16(9).bigEndian
            }
        case AF_INET6:
            result.withUnsafeMutableBytes { buf in
                let sin6 = buf.baseAddress!.assumingMemoryBound(to: sockaddr_in6.self)
                sin6.pointee.sin6_port = UInt16(9).bigEndian
            }
        default:
            return nil
        }
        return result
      }
  }

  @objc(checkStatus:rejecter:)
  func checkStatus(resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve(Lnd.shared.checkStatus())
  }

  @objc(startLnd:resolver:rejecter:)
  func startLnd(_ torEnabled: Bool, resolve: @escaping RCTPromiseResolveBlock, rejecter reject:@escaping RCTPromiseRejectBlock) {
    Lnd.shared.startLnd(torEnabled) { (data, error) in
      if let e = error {
        reject("error", e.localizedDescription, e)
        return
      }
      resolve([
        "data": data?.base64EncodedString()
      ])
    } walletUnlockedCallback: { (data, error) in
      if let e = error {
        NSLog("unlock error" + e.localizedDescription)
        return
      }
      self.sendEvent(withName: "WalletUnlocked", body: [
        "data": data?.base64EncodedString()
      ])
      if (self.walletUnlockedResolver != nil) {
        NSLog("Resolving walletUnlockedResolver")
        self.walletUnlockedResolver!("done")
      }
    }
  }

  @objc(startLnd:rejecter:)
  func stopLnd(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject:@escaping RCTPromiseRejectBlock) {
    Lnd.shared.stopLnd() { (data, error) in
      if let e = error {
        reject("error", e.localizedDescription, e)
        return
      }
      resolve([
        "data": data?.base64EncodedString()
      ])
    }
  }

  @objc(initWallet:password:recoveryWindow:channelsBackupBase64:resolver:rejecter:)
  func initWallet(_ seed: [AnyHashable], password: String, recoveryWindow: Int, channelsBackupBase64: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    self.walletUnlockedResolver = resolve
    Lnd.shared.initWallet(
      seed as! [String],
      password: password,
      recoveryWindow: Int32(recoveryWindow),
      channelsBackupsBase64: channelsBackupBase64
    ) { (data, error) in
      if let e = error {
        reject("error", e.localizedDescription, e)
        return
      }
      // IMPORTANT:
      // Promise resolve is happening in startLnd
      // by self.walletUnlockerResolver
    }
  }

  @objc(unlockWallet:resolver:rejecter:)
  func unlockWallet(_ password: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Lnd.shared.unlockWallet(password) { (data, error) in
      if let e = error {
        reject("error", e.localizedDescription, e)
        return
      }
      resolve([
        "data": data?.base64EncodedString()
      ])
    }
  }

  @objc(sendCommand:payload:resolver:rejecter:)
  func sendCommand(_ method: String, payload: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Lnd.shared.sendCommand(
      method,
      payload: payload
    ) { (data, error) in
      if let e = error {
        reject("error", e.localizedDescription, e)
        return
      }
      resolve([
        "data": data?.base64EncodedString()
      ])
    }
  }

  @objc(sendStreamCommand:payload:streamOnlyOnce:resolver:rejecter:)
  func sendStreamCommand(_ method: String, payload: String, streamOnlyOnce: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Lnd.shared.sendStreamCommand(
      method,
      payload: payload,
      streamOnlyOnce: streamOnlyOnce
    ) { (data, error) in
      if let e = error {
        // TODO(hsjoberg): handle error...
        NSLog("stream error")
        NSLog(e.localizedDescription)
      }
      self.sendEvent(
        withName: method,
        body: ["data": data?.base64EncodedString()]
      )
    }
    resolve("done")
  }
}
