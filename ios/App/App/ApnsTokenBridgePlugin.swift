import Capacitor
import Foundation

@objc(ApnsTokenBridgePlugin)
public class ApnsTokenBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ApnsTokenBridgePlugin"
    public let jsName = "ApnsTokenBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getSavedApnsToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getBridgeDiagnostics", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "markJsReceived", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "redeliverToJavaScript", returnType: CAPPluginReturnPromise),
    ]

    @objc func getSavedApnsToken(_ call: CAPPluginCall) {
        let token = ApnsTokenStore.shared.getSavedToken()
        call.resolve([
            "token": token ?? NSNull(),
            "hasToken": token != nil,
        ])
    }

    @objc func getBridgeDiagnostics(_ call: CAPPluginCall) {
        call.resolve(ApnsTokenStore.shared.getDiagnostics())
    }

    @objc func markJsReceived(_ call: CAPPluginCall) {
        ApnsTokenStore.shared.markJsDelivered()
        call.resolve([:])
    }

    @objc func redeliverToJavaScript(_ call: CAPPluginCall) {
        ApnsTokenStore.shared.redeliverToJavaScript()
        call.resolve([:])
    }

    @objc func requestPushAuthorization(_ call: CAPPluginCall) {
        ApnsTokenStore.shared.requestPushAuthorization { status in
            call.resolve(["status": status])
        }
    }

    @objc func getNotificationAuthorizationStatus(_ call: CAPPluginCall) {
        ApnsTokenStore.shared.authorizationStatusString { status in
            call.resolve(["status": status])
        }
    }
}
