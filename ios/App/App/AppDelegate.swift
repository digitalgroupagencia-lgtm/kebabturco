import UIKit
import Capacitor
import WebKit

private func kebabStartupLog(_ message: String) {
    NSLog("[KebabTurcoStartup] \(message)")
}

private func kebabStartupDiagnosticEnabled() -> Bool {
    let value = Bundle.main.object(forInfoDictionaryKey: "KebabTurcoStartupDiagnostic") as? String
    return value == "true"
}

private func kebabInstallCrashLogger() {
    NSSetUncaughtExceptionHandler { exception in
        NSLog("[KebabTurcoStartup][fatal-exception] name=\(exception.name.rawValue) reason=\(exception.reason ?? "nil") stack=\(exception.callStackSymbols.joined(separator: " | "))")
    }
}

private func kebabClearWebViewDataOncePerBuild() {
    let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown"
    let key = "KebabTurcoWebViewDataClearedBuild"
    if UserDefaults.standard.string(forKey: key) == build {
        kebabStartupLog("WKWebView data already cleared for build=\(build)")
        return
    }

    let types = WKWebsiteDataStore.allWebsiteDataTypes()
    kebabStartupLog("clearing WKWebView website data for build=\(build) types=\(types.count)")
    WKWebsiteDataStore.default().removeData(ofTypes: types, modifiedSince: Date(timeIntervalSince1970: 0)) {
        UserDefaults.standard.set(build, forKey: key)
        UserDefaults.standard.synchronize()
        kebabStartupLog("WKWebView website data cleared for build=\(build)")
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        kebabInstallCrashLogger()
        let commit = Bundle.main.object(forInfoDictionaryKey: "KebabTurcoGitCommit") as? String ?? "unknown"
        let branch = Bundle.main.object(forInfoDictionaryKey: "KebabTurcoGitBranch") as? String ?? "unknown"
        kebabStartupLog("didFinishLaunching begin commit=\(commit) branch=\(branch) diagnostic=\(kebabStartupDiagnosticEnabled())")
        kebabClearWebViewDataOncePerBuild()
        if let configUrl = Bundle.main.url(forResource: "capacitor.config", withExtension: "json"),
           let data = try? Data(contentsOf: configUrl),
           let raw = String(data: data, encoding: .utf8) {
            kebabStartupLog("capacitor.config.json=\(raw)")
        } else {
            kebabStartupLog("capacitor.config.json not found in bundle")
        }
        kebabStartupLog("didFinishLaunching end")
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        kebabStartupLog("APNs didRegister tokenBytes=\(deviceToken.count)")
        if kebabStartupDiagnosticEnabled() {
            kebabStartupLog("diagnostic mode: APNs token bridge skipped")
            return
        }
        ApnsTokenStore.shared.handle(deviceToken: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        kebabStartupLog("APNs didFail error=\(error.localizedDescription)")
        if kebabStartupDiagnosticEnabled() {
            kebabStartupLog("diagnostic mode: APNs error bridge skipped")
            return
        }
        ApnsTokenStore.shared.handleRegistrationError(error)
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        kebabStartupLog("applicationWillEnterForeground")
        if kebabStartupDiagnosticEnabled() {
            kebabStartupLog("diagnostic mode: foreground APNs redelivery skipped")
            return
        }
        ApnsTokenStore.shared.redeliverToJavaScript()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        kebabStartupLog("applicationDidBecomeActive")
        if kebabStartupDiagnosticEnabled() {
            kebabStartupLog("diagnostic mode: active APNs redelivery skipped")
            return
        }
        ApnsTokenStore.shared.redeliverToJavaScript()
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
