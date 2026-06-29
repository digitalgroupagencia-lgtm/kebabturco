import Capacitor
import Foundation
import UIKit
import WebKit
import UserNotifications

final class ApnsTokenStore {
    static let shared = ApnsTokenStore()

    static let tokenDefaultsKey = "kebabturco_apns_device_token"
    static let receivedAtKey = "kebabturco_apns_received_at"
    static let jsDeliveredKey = "kebabturco_apns_js_delivered"
    static let lastErrorKey = "kebabturco_apns_last_error"

    private var retryWorkItem: DispatchWorkItem?
    private var retryCount = 0
    private let maxRetries = 15

    private init() {}

    func handle(deviceToken: Data) {
        let token = Self.hexString(from: deviceToken)
        UserDefaults.standard.set(token, forKey: Self.tokenDefaultsKey)
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: Self.receivedAtKey)
        UserDefaults.standard.set(false, forKey: Self.jsDeliveredKey)
        UserDefaults.standard.removeObject(forKey: Self.lastErrorKey)

        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)

        retryCount = 0
        deliverToJavaScript(token: token)
    }

    func handleRegistrationError(_ error: Error) {
        let message = error.localizedDescription
        UserDefaults.standard.set(message, forKey: Self.lastErrorKey)
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func getSavedToken() -> String? {
        UserDefaults.standard.string(forKey: Self.tokenDefaultsKey)
    }

    func markJsDelivered() {
        UserDefaults.standard.set(true, forKey: Self.jsDeliveredKey)
    }

    func redeliverToJavaScript() {
        injectNativeRuntimeMarker()
        guard let token = getSavedToken() else { return }
        retryCount = 0
        deliverToJavaScript(token: token)
    }

    func injectNativeRuntimeMarker() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let webView = self.findWebView() else { return }
            let js = """
            (function(){
              try {
                window.__KEBABTURCO_CAPACITOR_NATIVE__ = true;
                window.dispatchEvent(new CustomEvent('kebabturco-native-runtime',{detail:{source:'ios'}}));
              } catch(e) {}
            })();
            """
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    func getDiagnostics() -> [String: Any] {
        let token = getSavedToken()
        return [
            "appDelegateReceived": token != nil,
            "jsDelivered": UserDefaults.standard.bool(forKey: Self.jsDeliveredKey),
            "receivedAt": UserDefaults.standard.double(forKey: Self.receivedAtKey),
            "lastError": UserDefaults.standard.string(forKey: Self.lastErrorKey) as Any,
            "tokenPreview": (token.map { Self.preview($0) }) as Any,
            "hasToken": token != nil,
            "authorizationStatus": Self.authorizationStatusString(),
        ]
    }

    func authorizationStatusString() -> String {
        Self.authorizationStatusString()
    }

    func requestPushAuthorization(completion: @escaping (String) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral:
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                completion("granted")
            case .denied:
                completion("denied")
            case .notDetermined:
                UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
                    if granted {
                        DispatchQueue.main.async {
                            UIApplication.shared.registerForRemoteNotifications()
                        }
                        completion("granted")
                    } else {
                        completion("denied")
                    }
                }
            @unknown default:
                completion("unknown")
            }
        }
    }

    private static func authorizationStatusString() -> String {
        var status = "unknown"
        let semaphore = DispatchSemaphore(value: 0)
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral:
                status = "granted"
            case .denied:
                status = "denied"
            case .notDetermined:
                status = "prompt"
            @unknown default:
                status = "unknown"
            }
            semaphore.signal()
        }
        _ = semaphore.wait(timeout: .now() + 1.0)
        return status
    }

    private func deliverToJavaScript(token: String) {
        retryWorkItem?.cancel()
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let webView = self.findWebView() else {
                self.scheduleRetry(token: token)
                return
            }

            let js = """
            (function(t){
              try {
                window.__KEBABTURCO_CAPACITOR_NATIVE__ = true;
                window.__kebabturcoNativeApnsToken = t;
                window.dispatchEvent(new CustomEvent('kebabturco-native-runtime',{detail:{source:'apns'}}));
                window.dispatchEvent(new CustomEvent('kebabturco-apns-token',{detail:{token:t,source:'appdelegate'}}));
              } catch(e) {}
            })('\(token)');
            """

            webView.evaluateJavaScript(js) { [weak self] _, error in
                guard let self = self else { return }
                if error == nil {
                    self.markJsDelivered()
                    self.retryCount = 0
                } else {
                    self.scheduleRetry(token: token)
                }
            }
        }
    }

    private func scheduleRetry(token: String) {
        guard retryCount < maxRetries else { return }
        retryCount += 1
        let work = DispatchWorkItem { [weak self] in
            self?.deliverToJavaScript(token: token)
        }
        retryWorkItem = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4 * Double(retryCount), execute: work)
    }

    private func findWebView() -> WKWebView? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        for scene in scenes {
            for window in scene.windows where window.isKeyWindow {
                if let webView = findWebView(in: window.rootViewController) {
                    return webView
                }
            }
        }
        for scene in scenes {
            for window in scene.windows {
                if let webView = findWebView(in: window.rootViewController) {
                    return webView
                }
            }
        }
        return nil
    }

    private func findWebView(in viewController: UIViewController?) -> WKWebView? {
        guard let viewController = viewController else { return nil }
        if let bridge = viewController as? CAPBridgeViewController {
            return bridge.webView
        }
        for child in viewController.children {
            if let found = findWebView(in: child) {
                return found
            }
        }
        if let presented = viewController.presentedViewController {
            return findWebView(in: presented)
        }
        return nil
    }

    private static func hexString(from data: Data) -> String {
        data.map { String(format: "%02x", $0) }.joined()
    }

    private static func preview(_ token: String) -> String {
        guard token.count > 12 else { return token }
        return "\(token.prefix(8))…\(token.suffix(4))"
    }
}
