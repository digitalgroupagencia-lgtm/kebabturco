import { describe, expect, it } from "vitest";
import { buildGeocodeQuery } from "@/lib/geocodeAddress";

describe("buildGeocodeQuery", () => {
  it("monta morada completa com país por defeito", () => {
    expect(
      buildGeocodeQuery({
        street: "Avinguda de la Vital",
        number: "12",
        postal: "46700",
        city: "Gandia",
        storeName: "Kebab Turco",
      }),
    ).toBe("Avinguda de la Vital 12, 46700 Gandia, Kebab Turco, España");
  });

  it("rejeita texto demasiado curto", () => {
    expect(buildGeocodeQuery({})).toBeNull();
  });
});
