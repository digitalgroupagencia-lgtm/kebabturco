import Foundation
import os.log

private let apiLog = OSLog(subsystem: "net.kebabturco.app.liveactivity", category: "AcceptAPI")

enum LiveActivityAcceptAPI {
    struct AcceptResponse: Decodable {
        let success: Bool?
        let error: String?
        let already_handled: Bool?
        let code: String?
    }

    static func accept(
        acceptUrl: String,
        orderId: String,
        storeId: String,
        acceptToken: String,
        apiKey: String = "",
        prepMinutes: Int = 15,
        source: String = "live_activity"
    ) async -> (ok: Bool, message: String) {
        guard let url = URL(string: acceptUrl) else {
            os_log("Invalid accept URL: %{public}@", log: apiLog, type: .error, acceptUrl)
            return (false, "URL inválida")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 12
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !apiKey.isEmpty {
            request.setValue(apiKey, forHTTPHeaderField: "apikey")
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }

        let body: [String: Any] = [
            "order_id": orderId,
            "store_id": storeId,
            "accept_token": acceptToken,
            "prep_minutes": prepMinutes,
            "source": source,
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        os_log("POST accept order=%{public}@ store=%{public}@ source=%{public}@",
               log: apiLog, type: .info, orderId, storeId, source)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            let http = response as? HTTPURLResponse
            let status = http?.statusCode ?? 0
            let decoded = try? JSONDecoder().decode(AcceptResponse.self, from: data)
            let rawBody = String(data: data, encoding: .utf8) ?? ""

            os_log("Accept response status=%d success=%{public}@ already=%{public}@ body=%{public}@",
                   log: apiLog, type: .info,
                   status,
                   String(decoded?.success == true),
                   String(decoded?.already_handled == true),
                   rawBody.prefix(200) as CVarArg)

            if status == 200, decoded?.success == true {
                return (true, "Pedido aceite")
            }
            if decoded?.already_handled == true || status == 409 {
                return (true, "Pedido já tratado")
            }
            let err = decoded?.error ?? rawBody
            return (false, err.isEmpty ? "Erro (\(status))" : err)
        } catch {
            os_log("Accept request failed: %{public}@", log: apiLog, type: .error, error.localizedDescription)
            return (false, error.localizedDescription)
        }
    }

    static func deepLink(orderId: String, storeId: String, prepMinutes: Int = 15) -> URL? {
        var components = URLComponents()
        components.scheme = "kebabturco"
        components.host = "staff"
        components.path = "/order/\(orderId)"
        components.queryItems = [
            URLQueryItem(name: "action", value: "accept"),
            URLQueryItem(name: "store_id", value: storeId),
            URLQueryItem(name: "eta", value: String(prepMinutes)),
        ]
        return components.url
    }

    /// Abre a app directamente no pedido (fallback quando aceitar falha).
    static func openOrderDeepLink(orderId: String, storeId: String, customer: Bool = false) -> URL? {
        var components = URLComponents()
        components.scheme = "kebabturco"
        if customer {
            components.host = "order"
            components.path = "/track"
            components.queryItems = [URLQueryItem(name: "order", value: orderId)]
        } else {
            components.host = "staff"
            components.path = "/order/\(orderId)"
            components.queryItems = [
                URLQueryItem(name: "action", value: "accept"),
                URLQueryItem(name: "open", value: "1"),
                URLQueryItem(name: "store_id", value: storeId),
            ]
        }
        return components.url
    }
}
