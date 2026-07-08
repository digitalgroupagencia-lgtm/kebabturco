import ActivityKit
import Foundation
import UIKit
#if canImport(LiveActivityPlugin)
import LiveActivityPlugin
#endif

/// Observa `Activity<GenericAttributes>.pushToStartTokenUpdates` no lado nativo
/// e envia o token push-to-start directamente para a Edge Function
/// `register-staff-live-activity-token`. Independente do bridge JS.
@objc public final class StaffLiveActivityPushToStartObserver: NSObject {
    @objc public static let shared = StaffLiveActivityPushToStartObserver()

    private static let defaultsKey = "staff_la_push_to_start_config_v1"
    private static let lastTokenKey = "staff_la_push_to_start_last_token_v1"

    private let queue = DispatchQueue(label: "net.kebabturco.staff-la-observer")
    private var observerTask: Task<Void, Never>?
    private var lastReportedToken: String?

    private struct Config: Codable {
        let supabaseUrl: String
        let anonKey: String
        let jwt: String
        let storeId: String
        let userId: String?
        let deviceId: String?
        let appVersion: String?
    }

    private override init() {
        super.init()
        self.lastReportedToken = UserDefaults.standard.string(forKey: Self.lastTokenKey)
    }

    // MARK: - API pública

    /// Guarda a configuração vinda do JS (sessão, loja, etc.) e arranca o observador.
    @objc public func configure(
        supabaseUrl: String,
        anonKey: String,
        jwt: String,
        storeId: String,
        userId: String?,
        deviceId: String?,
        appVersion: String?
    ) {
        let config = Config(
            supabaseUrl: supabaseUrl,
            anonKey: anonKey,
            jwt: jwt,
            storeId: storeId,
            userId: userId,
            deviceId: deviceId,
            appVersion: appVersion
        )
        do {
            let data = try JSONEncoder().encode(config)
            UserDefaults.standard.set(data, forKey: Self.defaultsKey)
        } catch {
            print("[StaffLA] falha a guardar config: \(error)")
        }
        startObserving(force: true)
    }

    /// Chamado pelo AppDelegate no arranque e ao voltar a foreground.
    @objc public func bootstrapIfConfigured() {
        guard loadConfig() != nil else {
            print("[StaffLA] bootstrap sem config guardada — aguarda configure() do JS")
            return
        }
        startObserving(force: false)
    }

    // MARK: - Observador

    private func startObserving(force: Bool) {
        #if canImport(LiveActivityPlugin)
        guard #available(iOS 17.2, *) else {
            print("[StaffLA] iOS < 17.2 — pushToStartTokenUpdates indisponível")
            return
        }

        queue.sync {
            if observerTask != nil && !force {
                return
            }
            observerTask?.cancel()
            observerTask = Task { [weak self] in
                await self?.runPushToStartLoop()
            }
        }
        print("[StaffLA] observador push-to-start arrancado (force=\(force))")
        #else
        print("[StaffLA] módulo LiveActivityPlugin não disponível — não é possível observar")
        #endif
    }

    #if canImport(LiveActivityPlugin)
    @available(iOS 17.2, *)
    private func runPushToStartLoop() async {
        for await data in Activity<GenericAttributes>.pushToStartTokenUpdates {
            let token = data.map { String(format: "%02x", $0) }.joined()
            guard !token.isEmpty else { continue }
            await handleReceivedToken(token)
        }
        print("[StaffLA] loop pushToStartTokenUpdates terminou")
    }
    #endif

    private func handleReceivedToken(_ token: String) async {
        guard let config = loadConfig() else {
            print("[StaffLA] token recebido mas sem config — a guardar para retry")
            UserDefaults.standard.set(token, forKey: Self.lastTokenKey)
            return
        }

        if token == lastReportedToken {
            // Reenvia mesmo assim de vez em quando? Só evita spam. Já registado, ignorar.
            print("[StaffLA] token já registado, ignorando duplicado")
            return
        }

        let ok = await sendToken(token, config: config)
        if ok {
            lastReportedToken = token
            UserDefaults.standard.set(token, forKey: Self.lastTokenKey)
            print("[StaffLA] Push-to-start token registrado com sucesso (…\(token.suffix(8)))")
        } else {
            print("[StaffLA] Falha ao registar push-to-start token")
        }
    }

    private func sendToken(_ token: String, config: Config) async -> Bool {
        guard var components = URLComponents(string: config.supabaseUrl.trimmingCharacters(in: .whitespacesAndNewlines)) else {
            print("[StaffLA] supabaseUrl inválido: \(config.supabaseUrl)")
            return false
        }
        var path = components.path
        if path.hasSuffix("/") { path.removeLast() }
        components.path = path + "/functions/v1/register-staff-live-activity-token"

        guard let url = components.url else { return false }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(config.jwt)", forHTTPHeaderField: "Authorization")
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")

        var body: [String: Any] = [
            "store_id": config.storeId,
            "token": token,
            "push_to_start_token": token,
            "token_kind": "push_to_start",
            "platform": "ios",
            "is_active": true,
        ]
        if let userId = config.userId, !userId.isEmpty { body["user_id"] = userId }
        if let deviceId = config.deviceId, !deviceId.isEmpty { body["device_id"] = deviceId }
        if let appVersion = config.appVersion, !appVersion.isEmpty { body["app_version"] = appVersion }

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            print("[StaffLA] erro a serializar body: \(error)")
            return false
        }

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            if status >= 200 && status < 300 {
                return true
            }
            let bodyStr = String(data: data, encoding: .utf8) ?? ""
            print("[StaffLA] HTTP \(status) ao registar token: \(bodyStr)")
            return false
        } catch {
            print("[StaffLA] erro de rede a registar token: \(error)")
            return false
        }
    }

    private func loadConfig() -> Config? {
        guard let data = UserDefaults.standard.data(forKey: Self.defaultsKey) else { return nil }
        return try? JSONDecoder().decode(Config.self, from: data)
    }
}
