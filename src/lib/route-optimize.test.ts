import { describe, expect, test } from "bun:test";
import { haversineKm, haversineMatrix, pathCost, solveOrder } from "./route-optimize";

// Pontos numa linha (longitude crescente): a melhor ordem é a da linha.
const line = [0, 1, 2, 3, 4, 5].map((i) => ({ lat: 0, lng: i * 0.1 }));

describe("haversineKm", () => {
  test("0,1° de longitude no equador ≈ 11,1 km", () => {
    expect(haversineKm(line[0], line[1])).toBeCloseTo(11.12, 1);
  });
});

describe("solveOrder", () => {
  test("sem ponto de saída, percorre a linha de uma ponta à outra", () => {
    const shuffled = [line[3], line[0], line[5], line[1], line[4], line[2]];
    const matrix = haversineMatrix(shuffled);
    const order = solveOrder(matrix, { fixedStart: false }).map((i) => shuffled[i].lng);
    const asc = [...order].sort((a, b) => a - b);
    expect(order[0] === asc[0] ? order : [...order].reverse()).toEqual(asc);
  });

  test("com ponto de saída, não devolve o índice 0 e começa pela parada mais próxima", () => {
    // origem em lng 0; paradas embaralhadas
    const points = [line[0], line[4], line[1], line[5], line[2], line[3]];
    const order = solveOrder(haversineMatrix(points), { fixedStart: true });
    expect(order).not.toContain(0);
    expect(order).toHaveLength(5);
    expect(points[order[0]].lng).toBeCloseTo(0.1);
  });

  test("ida e volta não é pior que a ordem original", () => {
    const points = [
      { lat: -23.55, lng: -46.63 },
      { lat: -23.6, lng: -46.7 },
      { lat: -23.5, lng: -46.6 },
      { lat: -23.58, lng: -46.65 },
      { lat: -23.52, lng: -46.68 },
    ];
    const matrix = haversineMatrix(points);
    const order = solveOrder(matrix, { fixedStart: true, roundTrip: true });
    expect(pathCost(matrix, [0, ...order], true)).toBeLessThanOrEqual(
      pathCost(matrix, [0, 1, 2, 3, 4], true) + 1e-9
    );
  });

  test("casos triviais", () => {
    expect(solveOrder([], { fixedStart: false })).toEqual([]);
    expect(solveOrder([[0]], { fixedStart: true })).toEqual([]);
    expect(solveOrder([[0, 1], [1, 0]], { fixedStart: true })).toEqual([1]);
  });
});
