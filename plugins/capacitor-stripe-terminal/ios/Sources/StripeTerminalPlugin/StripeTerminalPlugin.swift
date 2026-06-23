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
public class StripeTerminalPlugin: CAPPlugin, CAPBridgedPlugin, DiscoveryDelegate, TapToPayReaderDelegate {
    public let identifier = "StripeTerminalPlugin"
    public let jsName = "StripeTerminal"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "processTapToPayPayment", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "warmUpTapToPay", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showMerchantEducation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelPayment", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnectReader", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isTapToPaySupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getReaderStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkAppleTermsStatus", returnType: CAPPluginReturnPromise),
    ]

    private let tokenProvider = PluginTokenProvider()
    private var discoverCancelable: Cancelable?
    private var paymentCancelable: Cancelable?
    private var activePromise: CAPPluginCall?
    private var warmUpOnly = false
    private var readerReady = false
    private var operationTimeoutWorkItem: DispatchWorkItem?
    private let warmUpTimeoutSeconds: TimeInterval = 45
    private let paymentTimeoutSeconds: TimeInterval = 120

    private enum ReaderPhase: String {
        case idle
        case discovering
        case connecting
        case updating
        case ready
        case error
    }

    private var readerPhase: ReaderPhase = .idle {
        didSet {
            notifyListeners("readerStatusChanged", data: [
                "status": readerPhase.rawValue,
                "ready": readerReady,
            ])
        }
    }

    @objc func isTapToPaySupported(_ call: CAPPluginCall) {
        if #available(iOS 15.4, *) {
            call.resolve(["supported": true])
        } else {
            call.resolve(["supported": false])
        }
    }

    @objc func getReaderStatus(_ call: CAPPluginCall) {
        call.resolve([
            "status": readerPhase.rawValue,
            "ready": readerReady,
            "connected": Terminal.shared.connectedReader != nil,
        ])
    }

    @objc func checkAppleTermsStatus(_ call: CAPPluginCall) {
        guard let connectionToken = call.getString("connectionToken"),
              let connectAccountId = call.getString("connectAccountId"), !connectAccountId.isEmpty else {
            call.reject("Parâmetros inválidos para verificar termos Apple")
            return
        }

        tokenProvider.token = connectionToken
        if Terminal.hasTokenProvider() == false {
            Terminal.setTokenProvider(tokenProvider)
        }

        let connected = Terminal.shared.connectedReader != nil
        let linked = readerReady && connected

        if linked {
            call.resolve([
                "linked": true,
                "message": "Leitor pronto — termos da Apple provavelmente aceites.",
                "explicitCheckAvailable": false,
            ])
            return
        }

        call.resolve([
            "linked": false,
            "message": "Leitor ainda não está pronto. Vá a Definições → Preparar leitor. Quando a Apple pedir, leia até ao fim e toque Concordo uma vez. Aguarde 5 segundos.",
            "explicitCheckAvailable": false,
        ])
    }

    @objc func warmUpTapToPay(_ call: CAPPluginCall) {
        guard let connectionToken = call.getString("connectionToken"),
              let locationId = call.getString("locationId"),
              let onBehalfOf = call.getString("onBehalfOf") else {
            call.reject("Parâmetros inválidos para preparar Tap to Pay")
            return
        }

        let simulated = call.getBool("simulated") ?? false
        warmUpOnly = true
        activePromise = call
        scheduleOperationTimeout(
            seconds: warmUpTimeoutSeconds,
            message: "O leitor Tap to Pay não respondeu. Isto normalmente acontece quando os termos/capability da Apple ainda não estão disponíveis neste iPhone."
        )
        tokenProvider.token = connectionToken

        if Terminal.hasTokenProvider() == false {
            Terminal.setTokenProvider(tokenProvider)
        }

        if Terminal.shared.connectedReader != nil, readerReady {
            cancelOperationTimeout()
            call.resolve(["status": "ready", "ready": true])
            activePromise = nil
            warmUpOnly = false
            return
        }

        if Terminal.shared.connectedReader != nil {
            Terminal.shared.disconnectReader { _ in }
            readerReady = false
        }

        do {
            readerPhase = .discovering
            print("🔵 [Tap to Pay] warm-up discover locationId=\(locationId) onBehalfOf=\(onBehalfOf)")
            let config = try TapToPayDiscoveryConfigurationBuilder().setSimulated(simulated).build()
            discoverCancelable = Terminal.shared.discoverReaders(config, delegate: self) { [weak self] error in
                if let error {
                    self?.finishWithError("Erro ao descobrir leitor Tap to Pay", underlying: error)
                }
            }
        } catch {
            finishWithError("Configuração Tap to Pay inválida", underlying: error)
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

        _ = publishableKey
        let simulated = call.getBool("simulated") ?? false
        warmUpOnly = false
        activePromise = call
        scheduleOperationTimeout(
            seconds: paymentTimeoutSeconds,
            message: "O pagamento Tap to Pay demorou demasiado. Cancele e tente novamente."
        )
        tokenProvider.token = connectionToken

        if Terminal.hasTokenProvider() == false {
            Terminal.setTokenProvider(tokenProvider)
        }

        if Terminal.shared.connectedReader != nil, readerReady {
            collectAndProcess(clientSecret: clientSecret)
            return
        }

        if Terminal.shared.connectedReader != nil {
            Terminal.shared.disconnectReader { _ in }
            readerReady = false
        }

        do {
            readerPhase = .discovering
            let config = try TapToPayDiscoveryConfigurationBuilder().setSimulated(simulated).build()
            discoverCancelable = Terminal.shared.discoverReaders(config, delegate: self) { [weak self] error in
                if let error {
                    self?.finishWithError(error.localizedDescription)
                }
            }
        } catch {
            finishWithError(error.localizedDescription)
        }
    }

    @objc func showMerchantEducation(_ call: CAPPluginCall) {
        // iOS 16–17: ecrã de educação na app. iOS 18+: Apple ProximityReader (opcional).
        call.resolve(["shown": false, "mode": "in-app-fallback", "reason": "use-app-modal"])
    }

    @objc func cancelPayment(_ call: CAPPluginCall) {
        cancelOperationTimeout()
        paymentCancelable?.cancel { _ in }
        discoverCancelable?.cancel { _ in }
        activePromise?.reject("Operação Tap to Pay cancelada.")
        activePromise = nil
        warmUpOnly = false
        readerPhase = .idle
        call.resolve()
    }

    @objc func disconnectReader(_ call: CAPPluginCall) {
        cancelOperationTimeout()
        readerReady = false
        readerPhase = .idle
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
              let onBehalfOf = call.getString("onBehalfOf") else {
            finishWithError("Sessão de pagamento inválida")
            return
        }

        discoverCancelable?.cancel { _ in }
        discoverCancelable = nil

        readerPhase = .connecting

        do {
            var builder = TapToPayConnectionConfigurationBuilder(
                delegate: self,
                locationId: locationId
            )
            .setOnBehalfOf(onBehalfOf)
            if let merchantName = call.getString("merchantDisplayName"), !merchantName.isEmpty {
                builder = builder.setMerchantDisplayName(merchantName)
            }
            let connectionConfig = try builder.build()

            Terminal.shared.connectReader(reader, connectionConfig: connectionConfig) { [weak self] _, error in
                guard let self else { return }
                if let error {
                    self.finishWithError("Erro ao ligar leitor Tap to Pay", underlying: error)
                    return
                }
                self.readerReady = true
                self.readerPhase = .ready
                if self.warmUpOnly {
                    self.cancelOperationTimeout()
                    self.activePromise?.resolve(["status": "ready", "ready": true])
                    self.activePromise = nil
                    self.warmUpOnly = false
                    return
                }
                if let clientSecret = call.getString("clientSecret") {
                    self.collectAndProcess(clientSecret: clientSecret)
                } else {
                    self.finishWithError("PaymentIntent em falta")
                }
            }
        } catch {
            finishWithError(error.localizedDescription)
        }
    }

    public func terminal(_ terminal: Terminal, didFinishDiscoveringReaders error: Error?) {
        if let error {
            finishWithError(error.localizedDescription)
        }
    }

    // MARK: - TapToPayReaderDelegate

    public func tapToPayReader(
        _ reader: Reader,
        didStartInstallingUpdate update: ReaderSoftwareUpdate,
        cancelable: Cancelable?
    ) {
        readerPhase = .updating
        notifyListeners("readerProgress", data: [
            "progress": 0.1,
            "message": "A preparar Tap to Pay no iPhone…",
        ])
    }

    public func tapToPayReader(_ reader: Reader, didReportReaderSoftwareUpdateProgress progress: Float) {
        notifyListeners("readerProgress", data: [
            "progress": Double(progress),
            "message": "A configurar leitor…",
        ])
    }

    public func tapToPayReader(_ reader: Reader, didFinishInstallingUpdate update: ReaderSoftwareUpdate?, error: Error?) {
        if let error {
            finishWithError(error.localizedDescription)
        }
    }

    public func tapToPayReaderDidAcceptTermsOfService(_ reader: Reader) {
        notifyListeners("readerProgress", data: [
            "message": "Termos aceites — pronto para cobrar",
        ])
    }

    public func tapToPayReader(_ reader: Reader, didRequestReaderInput inputOptions: ReaderInputOptions = []) {
        /* UI handled by Stripe */
    }

    public func tapToPayReader(_ reader: Reader, didRequestReaderDisplayMessage displayMessage: ReaderDisplayMessage) {
        /* UI handled by Stripe */
    }

    // MARK: - Payment

    private func collectAndProcess(clientSecret: String) {
        readerPhase = .ready
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
                    self.cancelOperationTimeout()
                    self.activePromise = nil
                }
            }
        }
    }

    private func scheduleOperationTimeout(seconds: TimeInterval, message: String) {
        cancelOperationTimeout()
        let item = DispatchWorkItem { [weak self] in
            guard let self, self.activePromise != nil else { return }
            self.finishWithError(message)
        }
        operationTimeoutWorkItem = item
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: item)
    }

    private func cancelOperationTimeout() {
        operationTimeoutWorkItem?.cancel()
        operationTimeoutWorkItem = nil
    }

    private func finishWithError(_ message: String, underlying: Error? = nil) {
        cancelOperationTimeout()
        readerPhase = .error
        readerReady = false
        warmUpOnly = false

        var userMessage = message
        if let underlying {
            let ns = underlying as NSError
            print("🔴 [Tap to Pay] \(ns.domain) code=\(ns.code) — \(underlying.localizedDescription)")
            userMessage = "[\(ns.code)] \(underlying.localizedDescription)"
            if ns.localizedDescription.lowercased().contains("terms")
                || ns.localizedDescription.lowercased().contains("tos")
                || ns.code == 2600 {
                userMessage += " — Aceite os termos da Apple em Definições → Preparar leitor (Concordo, uma vez)."
            }
        }

        activePromise?.reject(userMessage)
        activePromise = nil
        paymentCancelable?.cancel { _ in }
        discoverCancelable?.cancel { _ in }
    }
}
