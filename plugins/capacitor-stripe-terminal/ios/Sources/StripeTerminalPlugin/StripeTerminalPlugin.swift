import Capacitor
import Foundation
import StripeTerminal

private final class PluginTokenProvider: NSObject, ConnectionTokenProvider {
    var token: String = ""

    func fetchConnectionToken(_ completion: @escaping ConnectionTokenCompletionBlock) {
        guard !token.isEmpty else {
            completion(nil, NSError(
                domain: "StripeTerminal",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Token de ligação em falta"]
            ))
            return
        }
        completion(token, nil)
    }
}

@objc(StripeTerminalPlugin)
public class StripeTerminalPlugin: CAPPlugin, CAPBridgedPlugin, DiscoveryDelegate, LocalMobileReaderDelegate {
    public let identifier = "StripeTerminalPlugin"
    public let jsName = "StripeTerminal"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "processTapToPayPayment", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelPayment", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnectReader", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isTapToPaySupported", returnType: CAPPluginReturnPromise),
    ]

    private let tokenProvider = PluginTokenProvider()
    private var discoverCancelable: Cancelable?
    private var paymentCancelable: Cancelable?
    private var activePromise: CAPPluginCall?

    @objc func isTapToPaySupported(_ call: CAPPluginCall) {
        if #available(iOS 15.4, *) {
            call.resolve(["supported": true])
        } else {
            call.resolve(["supported": false])
        }
    }

    @objc func processTapToPayPayment(_ call: CAPPluginCall) {
        guard let publishableKey = call.getString("publishableKey"),
              let connectionToken = call.getString("connectionToken"),
              let locationId = call.getString("locationId"),
              let onBehalfOf = call.getString("onBehalfOf"),
              let clientSecret = call.getString("clientSecret") else {
            call.reject("Parâmetros inválidos para Tap to Pay")
            return
        }

        let simulated = call.getBool("simulated") ?? false
        activePromise = call
        tokenProvider.token = connectionToken

        if Terminal.hasTokenProvider() == false {
            Terminal.setTokenProvider(tokenProvider)
        }

        if Terminal.shared.connectedReader != nil {
            Terminal.shared.disconnectReader { _ in }
        }

        let config = LocalMobileDiscoveryConfiguration(simulated: simulated)
        discoverCancelable = Terminal.shared.discoverReaders(config, delegate: self) { [weak self] error in
            if let error {
                self?.finishWithError(error.localizedDescription)
            }
        }
    }

    @objc func cancelPayment(_ call: CAPPluginCall) {
        paymentCancelable?.cancel { _ in }
        discoverCancelable?.cancel { _ in }
        call.resolve()
    }

    @objc func disconnectReader(_ call: CAPPluginCall) {
        Terminal.shared.disconnectReader { error in
            if let error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve()
            }
        }
    }

    // MARK: - DiscoveryDelegate

    public func terminal(_ terminal: Terminal, didUpdateDiscoveredReaders readers: [Reader]) {
        guard let reader = readers.first else {
            finishWithError("Nenhum leitor Tap to Pay encontrado")
            return
        }

        guard let call = activePromise,
              let locationId = call.getString("locationId"),
              let onBehalfOf = call.getString("onBehalfOf"),
              let clientSecret = call.getString("clientSecret") else {
            finishWithError("Sessão de pagamento inválida")
            return
        }

        discoverCancelable?.cancel { _ in }
        discoverCancelable = nil

        let connectionConfig = LocalMobileConnectionConfiguration(
            locationId: locationId,
            onBehalfOf: onBehalfOf
        )

        Terminal.shared.connectLocalMobileReader(reader, delegate: self, connectionConfig: connectionConfig) { [weak self] _, error in
            if let error {
                self?.finishWithError(error.localizedDescription)
                return
            }
            self?.collectAndProcess(clientSecret: clientSecret)
        }
    }

    public func terminal(_ terminal: Terminal, didFinishDiscoveringReaders error: Error?) {
        if let error {
            finishWithError(error.localizedDescription)
        }
    }

    // MARK: - LocalMobileReaderDelegate

    public func localMobileReader(_ reader: Reader, didStartInstallingUpdate update: ReaderSoftwareUpdate, cancelable: Cancelable?) {
        /* optional progress */
    }

    public func localMobileReader(_ reader: Reader, didReportReaderSoftwareUpdateProgress progress: Float) {
        /* optional progress */
    }

    public func localMobileReader(_ reader: Reader, didFinishInstallingUpdate update: ReaderSoftwareUpdate?, error: Error?) {
        if let error {
            finishWithError(error.localizedDescription)
        }
    }

    public func localMobileReader(_ reader: Reader, didRequestReaderInput inputOptions: ReaderInputOptions = []) {
        /* UI handled by Stripe */
    }

    public func localMobileReader(_ reader: Reader, didRequestReaderDisplayMessage displayMessage: ReaderDisplayMessage) {
        /* UI handled by Stripe */
    }

    // MARK: - Payment

    private func collectAndProcess(clientSecret: String) {
        Terminal.shared.retrievePaymentIntent(clientSecret: clientSecret) { [weak self] retrieveResult, retrieveError in
            guard let self else { return }
            if let retrieveError {
                self.finishWithError(retrieveError.localizedDescription)
                return
            }
            guard let paymentIntent = retrieveResult else {
                self.finishWithError("PaymentIntent não encontrado")
                return
            }

            self.paymentCancelable = Terminal.shared.collectPaymentMethod(paymentIntent) { collectResult, collectError in
                if let collectError {
                    self.finishWithError(collectError.localizedDescription)
                    return
                }
                guard let collectedIntent = collectResult else {
                    self.finishWithError("Falha ao recolher pagamento")
                    return
                }

                Terminal.shared.confirmPaymentIntent(collectedIntent) { confirmedIntent, confirmError in
                    if let confirmError {
                        self.finishWithError(confirmError.localizedDescription)
                        return
                    }
                    guard let confirmedIntent else {
                        self.finishWithError("Pagamento não confirmado")
                        return
                    }
                    self.activePromise?.resolve([
                        "paymentIntentId": confirmedIntent.stripeId ?? "",
                        "status": confirmedIntent.status.rawValue,
                    ])
                    self.activePromise = nil
                }
            }
        }
    }

    private func finishWithError(_ message: String) {
        activePromise?.reject(message)
        activePromise = nil
        paymentCancelable?.cancel { _ in }
        discoverCancelable?.cancel { _ in }
    }
}
