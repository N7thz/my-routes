import { mount } from "@ui-sdk/core/testing";
import { describe, expect, mock, test } from "bun:test";
import { NO_GROUP } from "@/components/companies/company-model";
import { companyTransfer } from "@/components/companies/company-transfer-primitive";

const markup = `<root>
  <list value="g1"><item value="a"><handle value="a">a</handle></item><item value="b"><handle value="b">b</handle></item></list>
  <list value="g2"></list>
  <list value="${NO_GROUP}"></list>
</root>`;

function setup() {
  const onMove = mock((_id: string, _groupId: string | null) => {});
  const view = mount(
    companyTransfer,
    {
      lists: { g1: ["a", "b"], g2: [], [NO_GROUP]: [] },
      companyLabel: (id: string) => `Empresa ${id}`,
      groupLabel: (id: string) => `Grupo ${id}`,
      onMove,
    },
    markup,
  );
  return { view, onMove };
}

describe("company transfer", () => {
  test("mover por teclado para o próximo grupo chama onMove com o grupo certo", async () => {
    const { view, onMove } = setup();
    try {
      view.part("handle", "a").focus();
      await view.keys("Space", "ArrowRight", "Space");
      expect(onMove).toHaveBeenCalledTimes(1);
      expect(onMove).toHaveBeenCalledWith("a", "g2");
    } finally {
      view.unmount();
    }
  });

  test("NO_GROUP vira null", async () => {
    const { view, onMove } = setup();
    try {
      view.part("handle", "a").focus();
      await view.keys("Space", "ArrowRight", "ArrowRight", "Space");
      expect(onMove).toHaveBeenCalledWith("a", null);
    } finally {
      view.unmount();
    }
  });

  test("soltar no mesmo grupo não chama onMove", async () => {
    const { view, onMove } = setup();
    try {
      view.part("handle", "a").focus();
      await view.keys("Space", "ArrowDown", "Space");
      expect(onMove).not.toHaveBeenCalled();
    } finally {
      view.unmount();
    }
  });

  test("Escape cancela o movimento", async () => {
    const { view, onMove } = setup();
    try {
      view.part("handle", "a").focus();
      await view.keys("Space", "ArrowRight", "Escape");
      expect(onMove).not.toHaveBeenCalled();
      expect(view.state.moving).toBeNull();
    } finally {
      view.unmount();
    }
  });

  test("anuncia em pt-BR", async () => {
    const { view } = setup();
    try {
      view.part("handle", "a").focus();
      await view.keys("Space");
      expect(view.announced.join(" ")).toContain("Empresa a pega");
    } finally {
      view.unmount();
    }
  });
});
