import { describe, expect, it } from "vitest";
import { matchDeliveryZone, type DeliveryZoneLike } from "./matchDeliveryZone";

const kebabZones: DeliveryZoneLike[] = [
  {
    name: "Gandia",
    min_order: 12,
    delivery_fee: 0,
    is_default: false,
    postal_codes: ["46700", "46701", "46702", "46728"],
    city_names: ["Gandia", "Gandía", "Grau de Gandia", "Grao de Gandia"],
    min_distance_km: null,
    max_distance_km: null,
    sort_order: 0,
  },
  {
    name: "Fora de Gandia",
    min_order: 18,
    delivery_fee: 3,
    is_default: true,
    postal_codes: [],
    city_names: [],
    min_distance_km: 0,
    max_distance_km: null,
    sort_order: 1,
  },
];

describe("matchDeliveryZone", () => {
  it("matches Gandia by postal code", () => {
    const zone = matchDeliveryZone(kebabZones, "46701", "");
    expect(zone?.name).toBe("Gandia");
    expect(zone?.min_order).toBe(12);
    expect(zone?.delivery_fee).toBe(0);
  });

  it("matches Gandia by city without accents", () => {
    const zone = matchDeliveryZone(kebabZones, "", "Gandía");
    expect(zone?.name).toBe("Gandia");
  });

  it("uses fallback for unknown postal/city", () => {
    const zone = matchDeliveryZone(kebabZones, "46800", "Xativa");
    expect(zone?.name).toBe("Fora de Gandia");
    expect(zone?.min_order).toBe(18);
    expect(zone?.delivery_fee).toBe(3);
  });

  it("does not use distance when max_distance_km is empty", () => {
    const zone = matchDeliveryZone(kebabZones, "46701", "Gandia", 25);
    expect(zone?.name).toBe("Gandia");
  });

  it("prefers postal over default even with distance", () => {
    const zone = matchDeliveryZone(kebabZones, "46701", "Gandia", 99);
    expect(zone?.name).toBe("Gandia");
  });
});
