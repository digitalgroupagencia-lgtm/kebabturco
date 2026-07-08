import Foundation

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
        prepMinutes: Int = 15
    ) async -> (ok: Bool, message: String) {
        guard let url = URL(string: acceptUrl) else {
            return (false, "URL inválida")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !apiKey.isEmpty {
            request.setValue(apiKey, forHTTPHeaderField: "apikey")
        }

        let body: [String: Any] = [
            "order_id": orderId,
            "store_id": storeId,
            "accept_token": acceptToken,
            "prep_minutes": prepMinutes,
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            let http = response as? HTTPURLResponse
            let decoded = try? JSONDecoder().decode(AcceptResponse.self, from: data)
            let status = http?.statusCode ?? 0

            if status == 200, decoded?.success == true {
                return (true, "Pedido aceite")
            }
            if decoded?.already_handled == true || status == 409 {
                return (true, "Pedido já tratado")
            }
            let err = decoded?.error ?? String(data: data, encoding: .utf8) ?? "Erro desconhecido"
            return (false, err)
        } catch {
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
}
