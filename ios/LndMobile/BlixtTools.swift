import Foundation
import React

@objc(BlixtTools)
class BlixtTools: NSObject {
  private let workerQueue = DispatchQueue(label: "com.blixtwallet.gossipsync.turbo.ios")
  private let session = URLSession(configuration: .default)

  private var activeTask: URLSessionDataTask?
  private var gossipSyncInProgress = false
  private var gossipSyncCancelled = false

  private let isoDateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    return formatter
  }()

  @objc(gossipSync:resolve:reject:)
  func gossipSync(
    _ serviceUrl: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    workerQueue.async {
      if self.gossipSyncInProgress {
        self.rejectPromise(
          reject,
          code: "GOSSIP_SYNC_IN_PROGRESS",
          message: "Gossip sync is already in progress",
          error: nil
        )
        return
      }

      self.gossipSyncInProgress = true
      self.gossipSyncCancelled = false
      self.logLine("gossipSync started with serviceUrl=\(serviceUrl)")

      do {
        let lastRunURL = try self.lastRunURL()
        if try self.shouldSkipGossipSync(lastRunURL: lastRunURL) {
          self.logLine("gossipSync skipped due to 24h time constraint")
          self.finish {
            self.resolvePromise(resolve, value: nil)
          }
          return
        }

        let graphFiles = try self.graphFiles()
        try self.removeIfExists(at: graphFiles.temp)

        let graphDbURL = try self.resolveGraphDbURL(serviceUrl: serviceUrl)
        self.logLine("Downloading graph database from \(graphDbURL.absoluteString)")

        var request = URLRequest(url: graphDbURL)
        request.httpMethod = "GET"
        request.timeoutInterval = 120

        let task = self.session.dataTask(with: request) { data, response, error in
          self.workerQueue.async {
            self.handleDownloadCompletion(
              data: data,
              response: response,
              error: error,
              graphFiles: graphFiles,
              lastRunURL: lastRunURL,
              resolve: resolve,
              reject: reject
            )
          }
        }

        self.activeTask = task
        task.resume()
      } catch {
        self.logLine("gossipSync failed: \(error.localizedDescription)")
        self.finish {
          self.rejectPromise(
            reject,
            code: "GOSSIP_SYNC_FAILED",
            message: error.localizedDescription,
            error: error as NSError
          )
        }
      }
    }
  }

  @objc(cancelGossipSync)
  func cancelGossipSync() {
    workerQueue.async {
      self.gossipSyncCancelled = true
      self.activeTask?.cancel()
    }
  }

  private func handleDownloadCompletion(
    data: Data?,
    response: URLResponse?,
    error: Error?,
    graphFiles: GraphFiles,
    lastRunURL: URL,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    defer {
      activeTask = nil
    }

    if isCancellation(error: error) {
      logLine("gossipSync cancelled by user")
      finish {
        rejectPromise(
          reject,
          code: "GOSSIP_SYNC_CANCELLED",
          message: Self.cancellationMessage,
          error: error as NSError?
        )
      }
      return
    }

    do {
      try throwIfCancelled()

      guard let httpResponse = response as? HTTPURLResponse else {
        throw NSError(
          domain: Self.errorDomain,
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Missing HTTP response"]
        )
      }
      guard (200...299).contains(httpResponse.statusCode) else {
        throw NSError(
          domain: Self.errorDomain,
          code: 2,
          userInfo: [NSLocalizedDescriptionKey: "Failed to download graph.db, HTTP \(httpResponse.statusCode)"]
        )
      }
      guard let payload = data, !payload.isEmpty else {
        throw NSError(
          domain: Self.errorDomain,
          code: 3,
          userInfo: [NSLocalizedDescriptionKey: "Downloaded graph.db is empty"]
        )
      }

      try payload.write(to: graphFiles.temp, options: .atomic)
      try throwIfCancelled()
      logLine("Downloaded graph database (\(payload.count) bytes)")

      try removeIfExists(at: graphFiles.backup)
      if FileManager.default.fileExists(atPath: graphFiles.graph.path) {
        try FileManager.default.moveItem(at: graphFiles.graph, to: graphFiles.backup)
      }

      do {
        try FileManager.default.moveItem(at: graphFiles.temp, to: graphFiles.graph)
      } catch {
        if FileManager.default.fileExists(atPath: graphFiles.backup.path) {
          try? FileManager.default.moveItem(at: graphFiles.backup, to: graphFiles.graph)
        }
        throw NSError(
          domain: Self.errorDomain,
          code: 4,
          userInfo: [NSLocalizedDescriptionKey: "Failed to replace graph.db"]
        )
      }

      try removeIfExists(at: graphFiles.backup)
      try touchLastRun(lastRunURL: lastRunURL)
      logLine("gossipSync completed successfully")
      finish {
        resolvePromise(resolve, value: nil)
      }
    } catch {
      try? removeIfExists(at: graphFiles.temp)
      if isCancellation(error: error) {
        logLine("gossipSync cancelled by user")
        finish {
          rejectPromise(
            reject,
            code: "GOSSIP_SYNC_CANCELLED",
            message: Self.cancellationMessage,
            error: error as NSError
          )
        }
        return
      }

      logLine("gossipSync failed: \(error.localizedDescription)")
      finish {
        rejectPromise(
          reject,
          code: "GOSSIP_SYNC_FAILED",
          message: error.localizedDescription,
          error: error as NSError
        )
      }
    }
  }

  private func finish(_ completion: @escaping () -> Void) {
    gossipSyncInProgress = false
    gossipSyncCancelled = false
    completion()
  }

  private func resolvePromise(_ resolve: @escaping RCTPromiseResolveBlock, value: Any?) {
    DispatchQueue.main.async {
      resolve(value)
    }
  }

  private func rejectPromise(
    _ reject: @escaping RCTPromiseRejectBlock,
    code: String,
    message: String,
    error: NSError?
  ) {
    DispatchQueue.main.async {
      reject(code, message, error)
    }
  }

  private func isCancellation(error: Error?) -> Bool {
    if gossipSyncCancelled {
      return true
    }
    guard let nsError = error as NSError? else {
      return false
    }
    return nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled
  }

  private func throwIfCancelled() throws {
    if gossipSyncCancelled {
      throw NSError(
        domain: NSURLErrorDomain,
        code: NSURLErrorCancelled,
        userInfo: [NSLocalizedDescriptionKey: Self.cancellationMessage]
      )
    }
  }

  private func resolveGraphDbURL(serviceUrl: String) throws -> URL {
    let trimmedServiceUrl = trimTrailingSlash(serviceUrl.trimmingCharacters(in: .whitespacesAndNewlines))
    if trimmedServiceUrl.isEmpty {
      throw NSError(
        domain: Self.errorDomain,
        code: 5,
        userInfo: [NSLocalizedDescriptionKey: "Service URL is empty"]
      )
    }

    guard var urlComponents = URLComponents(string: trimmedServiceUrl) else {
      throw NSError(
        domain: Self.errorDomain,
        code: 6,
        userInfo: [NSLocalizedDescriptionKey: "Invalid service URL"]
      )
    }

    // Accept either a base service URL (append /<chain>/graph/graph-001d.db)
    // or a direct .db URL passed from settings/debug tooling.
    if urlComponents.path.lowercased().hasSuffix(".db"), let url = urlComponents.url {
      return url
    }

    let chain = currentChain()
    let basePath = trimTrailingSlash(urlComponents.path)
    urlComponents.path = "\(basePath)/\(chain)/graph/graph-001d.db"

    guard let url = urlComponents.url else {
      throw NSError(
        domain: Self.errorDomain,
        code: 7,
        userInfo: [NSLocalizedDescriptionKey: "Invalid graph.db URL"]
      )
    }

    return url
  }

  private func graphFiles() throws -> GraphFiles {
    let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    let lndDir = appSupport.appendingPathComponent("lnd", isDirectory: true)
    let graphDir = lndDir
      .appendingPathComponent("data", isDirectory: true)
      .appendingPathComponent("graph", isDirectory: true)
      .appendingPathComponent(currentChain(), isDirectory: true)

    try FileManager.default.createDirectory(
      at: graphDir,
      withIntermediateDirectories: true,
      attributes: nil
    )

    return GraphFiles(
      graph: graphDir.appendingPathComponent("graph.db", isDirectory: false),
      backup: graphDir.appendingPathComponent("graph.db.bak", isDirectory: false),
      temp: graphDir.appendingPathComponent("graph.db.download", isDirectory: false)
    )
  }

  private func shouldSkipGossipSync(lastRunURL: URL) throws -> Bool {
    let fileManager = FileManager.default
    if !fileManager.fileExists(atPath: lastRunURL.path) {
      fileManager.createFile(atPath: lastRunURL.path, contents: nil)
      return false
    }

    let attrs = try fileManager.attributesOfItem(atPath: lastRunURL.path)
    guard let modifiedDate = attrs[.modificationDate] as? Date else {
      return false
    }

    let age = Date().timeIntervalSince(modifiedDate)
    return age <= Self.lastRunIntervalSeconds
  }

  private func touchLastRun(lastRunURL: URL) throws {
    let fileManager = FileManager.default
    if !fileManager.fileExists(atPath: lastRunURL.path) {
      fileManager.createFile(atPath: lastRunURL.path, contents: nil)
    }
    try fileManager.setAttributes([.modificationDate: Date()], ofItemAtPath: lastRunURL.path)
  }

  private func lastRunURL() throws -> URL {
    let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    try FileManager.default.createDirectory(
      at: cacheDir,
      withIntermediateDirectories: true,
      attributes: nil
    )
    return cacheDir.appendingPathComponent("lastrun", isDirectory: false)
  }

  private func speedloaderLogURL() throws -> URL {
    let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    let logDir = cacheDir.appendingPathComponent("log", isDirectory: true)
    try FileManager.default.createDirectory(
      at: logDir,
      withIntermediateDirectories: true,
      attributes: nil
    )
    return logDir.appendingPathComponent("speedloader.log", isDirectory: false)
  }

  private func logLine(_ message: String) {
    do {
      let logURL = try speedloaderLogURL()
      if !FileManager.default.fileExists(atPath: logURL.path) {
        FileManager.default.createFile(atPath: logURL.path, contents: nil)
      }

      let timestamp = isoDateFormatter.string(from: Date())
      guard let lineData = "\(timestamp) \(message)\n".data(using: .utf8) else {
        return
      }

      let handle = try FileHandle(forWritingTo: logURL)
      defer { handle.closeFile() }
      handle.seekToEndOfFile()
      handle.write(lineData)
    } catch {
      // Ignore logging errors to avoid blocking sync flow.
    }
  }

  private func removeIfExists(at url: URL) throws {
    if FileManager.default.fileExists(atPath: url.path) {
      try FileManager.default.removeItem(at: url)
    }
  }

  private func trimTrailingSlash(_ value: String) -> String {
    var output = value
    while output.hasSuffix("/") {
      output.removeLast()
    }
    return output
  }

  private func currentChain() -> String {
    return (Bundle.main.object(forInfoDictionaryKey: "CHAIN") as? String ?? "mainnet").lowercased()
  }

  private struct GraphFiles {
    let graph: URL
    let backup: URL
    let temp: URL
  }

  private static let errorDomain = "BlixtTools"
  private static let cancellationMessage = "Gossip sync cancelled by user"
  private static let lastRunIntervalSeconds: TimeInterval = 24 * 60 * 60
}
