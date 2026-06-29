import UIKit
import Capacitor
import os.log

private let bootLog = OSLog(subsystem: "net.kebabturco.app", category: "Boot")

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        os_log("diag-D didFinishLaunching", log: bootLog, type: .info)
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        os_log("diag-D didRegisterForRemoteNotifications", log: bootLog, type: .info)
        ApnsTokenStore.shared.handle(deviceToken: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        os_log("diag-D didFailToRegisterForRemoteNotifications: %{public}@", log: bootLog, type: .error, error.localizedDescription)
        ApnsTokenStore.shared.handleRegistrationError(error)
    }

    func applicationWillResignActive(_ application: UIApplication) {
        os_log("diag-D applicationWillResignActive", log: bootLog, type: .info)
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        os_log("diag-D applicationDidEnterBackground", log: bootLog, type: .info)
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        os_log("diag-D applicationWillEnterForeground", log: bootLog, type: .info)
        ApnsTokenStore.shared.redeliverToJavaScript()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        os_log("diag-D applicationDidBecomeActive", log: bootLog, type: .info)
        ApnsTokenStore.shared.redeliverToJavaScript()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        os_log("diag-D applicationWillTerminate", log: bootLog, type: .info)
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        os_log("diag-D openURL", log: bootLog, type: .info)
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        os_log("diag-D continueUserActivity", log: bootLog, type: .info)
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
