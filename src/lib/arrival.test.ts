import { describe, expect, test } from "bun:test";
import { ARRIVAL, metersBetween, nearestStopWithin, shouldRecord, stepArrival, type Fix } from "@/lib/arrival";

// ~0,0009° de latitude ≈ 100 m.
const stop = { id: "s1", lat: -22.9, lng: -43.2 };
const far = { id: "s2", lat: -22.95, lng: -43.2 };
const fix = (lat: number, lng: number, at: number, accuracy = 10): Fix => ({ lat, lng, at, accuracy });

describe("metersBetween", () => {
  test("0,0009° de latitude dá ~100 m", () => {
    expect(metersBetween({ lat: 0, lng: 0 }, { lat: 0.0009, lng: 0 })).toBeCloseTo(100, -1);
  });
});

describe("nearestStopWithin", () => {
  test("pega a mais próxima dentro do raio", () => {
    expect(nearestStopWithin({ lat: -22.9003, lng: -43.2 }, [far, stop], 80)?.id).toBe("s1");
  });
  test("fora do raio não pega nada", () => {
    expect(nearestStopWithin({ lat: -22.902, lng: -43.2 }, [stop], 80)).toBeNull();
  });
});

describe("stepArrival", () => {
  test("marca a chegada só depois de ficar o tempo mínimo no local", () => {
    let r = stepArrival(null, fix(-22.9002, -43.2, 0), [stop]);
    expect(r).toEqual({ state: { stopId: "s1", since: 0 }, arrived: null });

    r = stepArrival(r.state, fix(-22.9001, -43.2, ARRIVAL.dwellMs - 1), [stop]);
    expect(r.arrived).toBeNull();

    r = stepArrival(r.state, fix(-22.9001, -43.2, ARRIVAL.dwellMs), [stop]);
    expect(r.arrived).toBe("s1");
  });

  test("sair do raio zera a contagem", () => {
    let r = stepArrival(null, fix(-22.9002, -43.2, 0), [stop]);
    r = stepArrival(r.state, fix(-22.905, -43.2, 30_000), [stop]);
    expect(r.state).toBeNull();
    r = stepArrival(r.state, fix(-22.9002, -43.2, 40_000), [stop]);
    expect(r.state).toEqual({ stopId: "s1", since: 40_000 });
  });

  test("leitura imprecisa não muda o estado", () => {
    const state = { stopId: "s1", since: 0 };
    expect(stepArrival(state, fix(-22.95, -43.2, 90_000, 500), [stop])).toEqual({ state, arrived: null });
  });
});

describe("shouldRecord", () => {
  test("primeira leitura boa entra", () => {
    expect(shouldRecord(null, fix(0, 0, 0))).toBe(true);
  });
  test("parado e pouco tempo depois não entra; depois do intervalo entra", () => {
    const last = fix(0, 0, 0);
    expect(shouldRecord(last, fix(0.00001, 0, 10_000))).toBe(false);
    expect(shouldRecord(last, fix(0.00001, 0, 120_000))).toBe(true);
  });
  test("andou o bastante entra; leitura imprecisa nunca entra", () => {
    const last = fix(0, 0, 0);
    expect(shouldRecord(last, fix(0.0005, 0, 5_000))).toBe(true);
    expect(shouldRecord(last, fix(0.0005, 0, 5_000, 300))).toBe(false);
  });
});
