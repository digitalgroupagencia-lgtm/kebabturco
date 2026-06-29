import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?
    private var coldStartUntil = Date().addingTimeInterval(3)

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        window = UIWindow(windowScene: windowScene)
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        window?.rootViewController = storyboard.instantiateInitialViewController()
        window?.makeKeyAndVisible()
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        guard Date() >= coldStartUntil else { return }
        ApnsTokenStore.shared.redeliverToJavaScript()
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        guard Date() >= coldStartUntil else { return }
        ApnsTokenStore.shared.redeliverToJavaScript()
    }
}
