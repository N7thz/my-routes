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

/** Seção "Sem grupo" com dois cartões lado a lado; o happy-dom não tem layout, então as caixas são fixas. */
function setupCombine(canCombine: (id: string, target: string) => boolean) {
  const onMove = mock((_id: string, _groupId: string | null) => {});
  const onCombine = mock((_id: string, _target: string) => {});
  const view = mount(
    companyTransfer,
    { lists: { g1: [], [NO_GROUP]: ["x", "y"] }, onMove, canCombine, onCombine },
    `<root>
      <list value="g1"></list>
      <list value="${NO_GROUP}"><item value="x"><handle value="x">x</handle></item><item value="y"><handle value="y">y</handle></item></list>
    </root>`,
  );
  const box = (el: Element, left: number, top: number, width: number, height: number) => {
    el.getBoundingClientRect = () =>
      ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }) as DOMRect;
  };
  box(view.part("list", "g1"), 0, 0, 400, 100);
  box(view.part("list", NO_GROUP), 0, 200, 400, 100);
  box(view.part("item", "x"), 0, 200, 190, 100);
  box(view.part("handle", "x"), 160, 270, 20, 20);
  box(view.part("item", "y"), 210, 200, 190, 100);
  box(view.part("handle", "y"), 370, 270, 20, 20);
  return { view, onMove, onCombine };
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

  test("soltar uma empresa sem grupo em cima de outra chama onCombine", async () => {
    const { view, onMove, onCombine } = setupCombine(() => true);
    try {
      await view.drag(view.part("handle", "x"), { to: view.part("item", "y") });
      expect(onCombine).toHaveBeenCalledWith("x", "y");
      expect(onMove).not.toHaveBeenCalled();
      expect(view.state.combining).toBeNull();
      expect(view.state.moving).toBeNull();
    } finally {
      view.unmount();
    }
  });

  test("arrastar com o mouse para outro grupo continua chamando onMove", async () => {
    const { view, onMove, onCombine } = setupCombine(() => true);
    try {
      await view.drag(view.part("handle", "x"), { to: view.part("list", "g1") });
      expect(onMove).toHaveBeenCalledWith("x", "g1");
      expect(onCombine).not.toHaveBeenCalled();
    } finally {
      view.unmount();
    }
  });

  test("sem canCombine, soltar em cima de outro cartão não junta", async () => {
    const { view, onCombine } = setupCombine(() => false);
    try {
      await view.drag(view.part("handle", "x"), { to: view.part("item", "y") });
      expect(onCombine).not.toHaveBeenCalled();
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
