import { describe, expect, it } from "vitest";
import { isNetworkOrEdgeUnavailable } from "./networkErrors";

describe("isNetworkOrEdgeUnavailable", () => {
  it("detecta Failed to fetch do browser", () => {
    expect(isNetworkOrEdgeUnavailable("Failed to fetch")).toBe(true);
  });

  it("detecta outros erros de rede comuns", () => {
    expect(isNetworkOrEdgeUnavailable("TypeError: fetch failed")).toBe(true);
    expect(isNetworkOrEdgeUnavailable("Failed to send a request to the Edge Function")).toBe(true);
    expect(isNetworkOrEdgeUnavailable("NetworkError when attempting to fetch resource.")).toBe(true);
  });

  it("ignora erros de negócio", () => {
    expect(isNetworkOrEdgeUnavailable("Este e-mail já está registado")).toBe(false);
    expect(isNetworkOrEdgeUnavailable("Forbidden: sem acesso a esta loja")).toBe(false);
  });
});
