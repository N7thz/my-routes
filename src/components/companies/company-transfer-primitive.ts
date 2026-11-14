import {
  bindDrag,
  bindDragPreview,
  createAutoScroll,
  createChange,
  createTransfer,
  definePrimitive,
  dragThreshold,
  keepFocus,
  transferMessage,
  type ChangeDetails,
  type TransferDraft,
  type TransferLists,
  type TransferReason,
} from "@ui-sdk/core";
import { NO_GROUP } from "@/components/companies/company-model";

type CompanyTransferOptions = {
  /** Ids das empresas por seção (id do grupo ou `NO_GROUP`), na ordem exibida. */
  lists?: TransferLists;
  /** Nomes para os leitores de tela. */
  companyLabel?: (id: string) => string | undefined;
  groupLabel?: (id: string) => string | undefined;
  /** Chamado ao soltar a empresa em outra seção. `groupId` é `null` para "Sem grupo". */
  onMove?: (companyId: string, groupId: string | null) => void;
  /**
   * Se soltar `companyId` em cima do cartão `targetId` junta os dois num grupo
   * novo. Só vale para cartões da mesma seção. Sem ela, não há junção.
   */
  canCombine?: (companyId: string, targetId: string) => boolean;
  /** Chamado ao soltar uma empresa em cima de outra que `canCombine` aceita. */
  onCombine?: (companyId: string, targetId: string) => void;
  onListsChange?: (
    lists: TransferLists,
    details: ChangeDetails<TransferReason> & { key: string; from: string; to: string; index: number },
  ) => void;
};

type CompanyTransferState = {
  lists: TransferLists;
  moving: TransferDraft | null;
  /** Cartão sob o ponteiro que vira grupo com o arrastado, se soltar agora. */
  combining: string | null;
};

const contains = (el: HTMLElement | undefined, x: number, y: number) => {
  if (!el?.isConnected) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
};

const ptMessage = ({ type, label, list, position, total }: Parameters<typeof transferMessage>[0]) => {
  switch (type) {
    case "grab":
      return `${label} pega. Use as setas para mover entre grupos, espaço para soltar, escape para cancelar.`;
    case "move":
      return `${label} no grupo ${list}, posição ${position} de ${total}.`;
    case "drop":
      return `${label} solta em ${list}.`;
    case "cancel":
      return "Movimento cancelado.";
  }
};

const companyTransfer = definePrimitive({
  name: "company-transfer",
  options: {
    lists: "value",
    companyLabel: "callback",
    groupLabel: "callback",
    onMove: "callback",
    canCombine: "callback",
    onCombine: "callback",
    onListsChange: "callback",
  },
  controlled: ["lists"],
  state: (options: CompanyTransferOptions): CompanyTransferState => ({
    lists: options.lists ?? {},
    moving: null,
    combining: null,
  }),
  sync: (options) => (options.lists === undefined ? {} : { lists: options.lists }),
  api: (context) => {
    const change = createChange(context);
    const handles = new Map<string, HTMLElement>();
    const transfer = createTransfer(context, {
      key: "lists",
      draft: "moving",
      set: (value, details) => {
        const ok = change("lists", value, details);
        if (ok && details.from !== details.to) {
          context.options().onMove?.(details.key, details.to === NO_GROUP ? null : details.to);
        }
        return ok;
      },
      order: () => Object.keys(context.store.get().lists),
      label: (key) => context.options().companyLabel?.(key),
      listLabel: (list) => context.options().groupLabel?.(list),
      message: ptMessage,
    });

    // Arraste pelo ponteiro próprio (em vez de `transfer.pointerdown`): na seção
    // de origem o cartão fica parado, para dar para soltar em cima de outro
    // cartão e juntar os dois; nas outras seções ele entra como no createTransfer.
    const items = new Map<string, HTMLElement>();
    const lists = new Map<string, HTMLElement>();
    let stop: (() => void) | undefined;
    context.onDestroy(() => stop?.());

    function listAt(x: number, y: number) {
      let best: { list: string; distance: number } | undefined;
      for (const [list, el] of lists) {
        if (!el.isConnected) continue;
        const r = el.getBoundingClientRect();
        const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
        const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
        const distance = Math.hypot(dx, dy);
        if (!best || distance < best.distance) best = { list, distance };
      }
      return best?.list;
    }

    function pointerdown(event: PointerEvent, key: string) {
      const { store } = context;
      const start = items.get(key);
      if (!start || event.button !== 0 || store.get().moving) return;
      stop?.();

      let pointer = { x: event.clientX, y: event.clientY };
      let dragging = false;
      let preview: ReturnType<typeof bindDragPreview> | undefined;
      let origin: { list: string; index: number } | undefined;

      const setCombining = (target: string | null) => {
        if (store.get().combining !== target) store.set({ combining: target });
      };

      const track = () => {
        const current = store.get().moving;
        const list = listAt(pointer.x, pointer.y);
        if (!current || !origin || list === undefined) return;

        if (list === origin.list) {
          const { canCombine } = context.options();
          const target = canCombine
            ? (current.lists[list] ?? []).find(
                (k) => k !== key && contains(items.get(k), pointer.x, pointer.y) && canCombine(key, k),
              )
            : undefined;
          setCombining(target ?? null);
          transfer.moveTo(origin.list, origin.index);
          return;
        }

        setCombining(null);
        const middles = (current.lists[list] ?? [])
          .filter((k) => k !== key)
          .map((k) => {
            const r = items.get(k)?.getBoundingClientRect();
            return r ? r.top + r.height / 2 : 0;
          });
        transfer.moveTo(list, middles.filter((m) => m < pointer.y).length);
      };

      const scroller = createAutoScroll({ ignore: () => items.get(key), onScroll: track });

      stop = bindDrag(start, event, {
        threshold: dragThreshold,
        cancelOnEscape: true,
        onStart: () => {
          const now = store.get().lists;
          const from = Object.keys(now).find((list) => now[list].includes(key));
          if (from === undefined) return false;
          origin = { list: from, index: now[from].indexOf(key) };
          // Rascunho com `pointer: true`, como o `transfer.pointerdown`: marca
          // `data-dragging` e não puxa o foco a cada movimento.
          store.set({ moving: { key, from, lists: now, pointer: true }, combining: null });
          preview = bindDragPreview(start, { x: event.clientX, y: event.clientY });
          preview.el.removeAttribute("data-dragging");
          preview.el.removeAttribute("data-grabbed");
          dragging = true;
        },
        onMove: ({ x, y, event: moveEvent }) => {
          moveEvent.preventDefault();
          pointer = { x, y };
          preview?.move(x, y);
          scroller.update(x, y);
          track();
        },
        onEnd: (endEvent, canceled) => {
          scroller.stop();
          preview?.remove();
          preview = undefined;
          if (!dragging) return;
          dragging = false;
          const target = store.get().combining;
          setCombining(null);
          if (canceled) {
            transfer.cancel();
          } else if (target) {
            transfer.cancel();
            context.options().onCombine?.(key, target);
          } else {
            transfer.drop(endEvent);
          }
        },
      });
    }

    return {
      transfer,
      handles,
      pointerdown,
      bindList: (el: HTMLElement, list: string) => {
        lists.set(list, el);
        const off = transfer.bindList(el, list);
        return () => {
          if (lists.get(list) === el) lists.delete(list);
          off();
        };
      },
      bindItem: (el: HTMLElement, key: string) => {
        items.set(key, el);
        const off = transfer.bindItem(el, key);
        return () => {
          if (items.get(key) === el) items.delete(key);
          off();
        };
      },
    };
  },
  slots: (slot) => ({
    root: slot<object, { lists: TransferLists; dragging: boolean }>({
      state: (state, { api }) => ({ lists: api.transfer.lists(state), dragging: state.moving !== null }),
      attrs: (state) => ({ "data-moving": state.moving ? "" : undefined }),
    }),
    list: slot<{ value: string }, { over: boolean }>({
      props: { value: "string" },
      state: (state, { key }) => ({
        over: state.moving?.lists[key]?.includes(state.moving.key) === true && state.moving.from !== key,
      }),
      attrs: (state, { key }) => ({
        "data-over":
          state.moving && state.moving.from !== key && state.moving.lists[key]?.includes(state.moving.key)
            ? ""
            : undefined,
      }),
      bind: (el, { api, props }) => api.bindList(el, props.value),
    }),
    item: slot<{ value: string }, { grabbed: boolean; dragging: boolean; combining: boolean }>({
      props: { value: "string" },
      state: (state, { key, api }) => ({
        grabbed: api.transfer.moving(state, key),
        dragging: api.transfer.dragging(state, key),
        combining: state.combining === key,
      }),
      attrs: (state, { key, api }) => ({
        "data-grabbed": api.transfer.moving(state, key) ? "" : undefined,
        "data-dragging": api.transfer.dragging(state, key) ? "" : undefined,
        "data-combining": state.combining === key ? "" : undefined,
      }),
      bind: (el, { api, props }) => api.bindItem(el, props.value),
    }),
    handle: slot<{ value: string }>({
      props: { value: "string" },
      attrs: (state, { key, api }) => ({
        type: "button",
        "aria-pressed": api.transfer.moving(state, key) ? "true" : "false",
      }),
      press: { none: "Espaço e Enter são tratados em keydown pelo createTransfer" },
      on: {
        keydown: (event, { key, api }) => {
          if (api.transfer.keydown(event, key)) {
            event.preventDefault();
            keepFocus(() => api.handles.get(key));
          }
        },
        pointerdown: (event, { key, api }) => api.pointerdown(event, key),
      },
      bind: (el, { api, props }) => {
        api.handles.set(props.value, el);
        return () => {
          if (api.handles.get(props.value) === el) api.handles.delete(props.value);
        };
      },
    }),
  }),
  agent: { actions: [] },
});

export { companyTransfer, type CompanyTransferOptions };
