import UIKit
import Capacitor
import UserNotifications

private let liveActivityAppGroupId = "group.net.kebabturco.app"
private let pendingLiveActivityDeepLinkKey = "pendingLiveActivityDeepLink"

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        configureStaffOrderNotificationActions()
        flushPendingLiveActivityDeepLink(application)
        StaffLiveActivityPushToStartObserver.shared.bootstrapIfConfigured()
        return true
    }

    private func configureStaffOrderNotificationActions() {
        let accept = UNNotificationAction(
            identifier: "ACCEPT_ORDER",
            title: "Aceitar pedido",
            options: [.authenticationRequired, .foreground]
        )
        let open = UNNotificationAction(
            identifier: "OPEN_ORDER",
            title: "Abrir pedido",
            options: [.foreground]
        )
        let category = UNNotificationCategory(
            identifier: "STAFF_ORDER",
            actions: [accept, open],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )
        UNUserNotificationCenter.current().setNotificationCategories([category])
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        flushPendingLiveActivityDeepLink(application)
        StaffLiveActivityPushToStartObserver.shared.bootstrapIfConfigured()
    }

    private func flushPendingLiveActivityDeepLink(_ application: UIApplication) {
        guard let defaults = UserDefaults(suiteName: liveActivityAppGroupId),
              let urlString = defaults.string(forKey: pendingLiveActivityDeepLinkKey),
              let url = URL(string: urlString) else { return }
        defaults.removeObject(forKey: pendingLiveActivityDeepLinkKey)
        _ = ApplicationDelegateProxy.shared.application(application, open: url, options: [:])
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        ApnsTokenStore.shared.handle(deviceToken: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        ApnsTokenStore.shared.handleRegistrationError(error)
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
