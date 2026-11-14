import {
  createChange,
  createTransfer,
  definePrimitive,
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
  onListsChange?: (
    lists: TransferLists,
    details: ChangeDetails<TransferReason> & { key: string; from: string; to: string; index: number },
  ) => void;
};

type CompanyTransferState = { lists: TransferLists; moving: TransferDraft | null };

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
    onListsChange: "callback",
  },
  controlled: ["lists"],
  state: (options: CompanyTransferOptions): CompanyTransferState => ({ lists: options.lists ?? {}, moving: null }),
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
    return { transfer, handles };
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
      bind: (el, { api, props }) => api.transfer.bindList(el, props.value),
    }),
    item: slot<{ value: string }, { grabbed: boolean; dragging: boolean }>({
      props: { value: "string" },
      state: (state, { key, api }) => ({
        grabbed: api.transfer.moving(state, key),
        dragging: api.transfer.dragging(state, key),
      }),
      attrs: (state, { key, api }) => ({
        "data-grabbed": api.transfer.moving(state, key) ? "" : undefined,
        "data-dragging": api.transfer.dragging(state, key) ? "" : undefined,
      }),
      bind: (el, { api, props }) => api.transfer.bindItem(el, props.value),
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
        pointerdown: (event, { key, api }) => api.transfer.pointerdown(event, key),
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
