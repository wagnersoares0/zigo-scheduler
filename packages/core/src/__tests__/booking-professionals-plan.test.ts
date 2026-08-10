import { describe, expect, it } from "vitest";

import { selectBookingProfessionalsForPlan } from "../booking-professionals";

describe("booking professionals by plan", () => {
  const professionals = [
    { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", nome: "Bruna", user_id: null },
    { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", nome: "Ana", user_id: null },
    {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      nome: "Owner",
      user_id: "11111111-1111-4111-8111-111111111111",
    },
  ];

  it("preserves all eligible professionals without a plan limit", () => {
    expect(
      selectBookingProfessionalsForPlan(professionals, {
        ownerUserId: "11111111-1111-4111-8111-111111111111",
        maxProfessionals: null,
      })
    ).toHaveLength(3);
  });

  it("keeps the owner profile as the Free primary professional", () => {
    expect(
      selectBookingProfessionalsForPlan(professionals, {
        ownerUserId: "11111111-1111-4111-8111-111111111111",
        maxProfessionals: 1,
      }).map((professional) => professional.id)
    ).toEqual(["cccccccc-cccc-4ccc-8ccc-cccccccccccc"]);
  });

  it("uses the stable lowest id when there is no owner profile", () => {
    expect(
      selectBookingProfessionalsForPlan(professionals.slice(0, 2), {
        maxProfessionals: 1,
      }).map((professional) => professional.id)
    ).toEqual(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
  });

  it("uses the stable lowest id when multiple profiles belong to the owner", () => {
    const duplicatedOwnerProfiles = [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        nome: "Ana",
        user_id: "11111111-1111-4111-8111-111111111111",
      },
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        nome: "Zelia",
        user_id: "11111111-1111-4111-8111-111111111111",
      },
    ];

    expect(
      selectBookingProfessionalsForPlan(duplicatedOwnerProfiles, {
        ownerUserId: "11111111-1111-4111-8111-111111111111",
        maxProfessionals: 1,
      }).map((professional) => professional.id)
    ).toEqual(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
  });
});
