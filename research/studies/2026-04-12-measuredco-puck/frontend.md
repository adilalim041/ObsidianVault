# Frontend Analysis: Puck

**Analyzed by:** frontend-dev
**Files read:** 32
**Key files:**
- `packages/core/package.json`
- `packages/core/components/Puck/index.tsx`
- `packages/core/store/index.ts`
- `packages/core/components/DragDropContext/index.tsx`
- `packages/core/components/DraggableComponent/index.tsx`
- `packages/core/components/DropZone/index.tsx`
- `packages/core/components/DropZone/context.tsx`
- `packages/core/components/AutoField/index.tsx`
- `packages/core/components/AutoFrame/index.tsx`
- `packages/core/components/Render/index.tsx`
- `packages/core/components/MemoizeComponent/index.tsx`
- `packages/core/components/Puck/components/Canvas/index.tsx`
- `packages/core/components/Puck/components/Fields/index.tsx`
- `packages/core/components/Puck/components/Preview/index.tsx`
- `packages/core/store/slices/history.ts`
- `packages/core/store/slices/nodes.ts`
- `packages/core/store/slices/fields.ts`
- `packages/core/lib/use-puck.ts`
- `packages/core/lib/get-class-name-factory.ts`
- `packages/core/lib/use-context-store.tsx`
- `packages/core/lib/dnd/NestedDroppablePlugin.ts`
- `packages/core/lib/data/walk-app-state.ts`
- `packages/core/types/Config.tsx`

---

## Stack

- React 18/19 (peer dep)
- Zustand 5 с `subscribeWithSelector` middleware — весь глобальный стейт
- `@dnd-kit/react` 0.1.18 — drag and drop (новейший пакет от dnd-kit, не react-beautiful-dnd)
- `@tiptap/react` 3 — rich text в полях компонентов
- `@tanstack/react-virtual` 3 — виртуализация длинных DropZone-листов
- `@radix-ui/react-popover` — мелкие UI примитивы
- CSS Modules — стилизация всех компонентов (не Tailwind, не CSS-in-JS)
- `lucide-react` — иконки
- `object-hash` — дедупликация стилей при копировании в iframe
- `fast-equals` — эффективное глубокое сравнение объектов
- `uuid` / `generateId` — ID для каждого компонента на canvas

---

## Architecture

Puck — это headless visual page builder. Пользователь создаёт `config` с описанием компонентов, передаёт его в `<Puck>`, и получает drag-and-drop редактор прямо в браузере.

### Дерево компонентов (верхний уровень)

```
<Puck config data onPublish ...>
  <PropsProvider>          ← передаёт все пропы через Context без prop drilling
    <PuckProvider>         ← инициализирует Zustand store, history, permissions
      <appStoreContext>    ← Zustand store для всего editor-состояния
        <UsePuckStoreContext> ← отдельный store для публичного usePuck() API
          <Layout>         ← header + sidebar-left + canvas + sidebar-right
            <Canvas>       ← iframe/div с viewport controls и zoom
              <Preview>    ← либо AutoFrame (iframe) либо div
                <AutoFrame>       ← iframe с синхронизацией стилей из родителя
                  <DragDropContext>
                    <DropZoneProvider>
                      <DropZone zone="default-zone"> ← рекурсивно рендерит компоненты
                        <DraggableComponent>         ← обёртка каждого компонента
                          <UserComponent.render />   ← код пользователя
```

### Два режима DropZone

DropZone имеет два внутренних варианта:
- `DropZoneEdit` — в редакторе, умеет DnD, рисует оверлеи поверх компонентов
- `DropZoneRender` — для `<Render>`, просто рендерит компоненты статически

Переключение происходит через `dropZoneContext.mode === "edit"`.

---

## Component Patterns

### Pattern 1: PropsProvider + двойной Provider split

**File:** `packages/core/components/Puck/index.tsx` (lines 97-365)

**Why it matters:** Очень умный паттерн — разделение ответственности между "хранилищем пропов" и "хранилищем стейта". PropsProvider не перерендеривает дерево при изменении `data`, только PuckProvider подписан на изменения через Zustand. Публичный `<Puck>` — тонкий слой поверх двух провайдеров.

```typescript
// 1. PropsContext хранит исходные props без reactivity
const propsContext = createContext<Partial<PuckProps>>({});

function PropsProvider<UserConfig extends Config>(props: PuckProps<UserConfig>) {
  return (
    <propsContext.Provider value={props as PuckProps}>
      {props.children}
    </propsContext.Provider>
  );
}

// 2. PuckProvider читает props через context, создаёт store
function PuckProvider({ children }: PropsWithChildren) {
  const { config, data, plugins, overrides, ... } = usePropsContext();

  const [appStore] = useState(() =>
    createAppStore(generateAppStore(initialAppState))
  );

  return (
    <appStoreContext.Provider value={appStore}>
      <UsePuckStoreContext.Provider value={uPuckStore}>
        {children}
      </UsePuckStoreContext.Provider>
    </appStoreContext.Provider>
  );
}

// 3. Итоговый публичный компонент — просто композиция
export function Puck(props: PuckProps) {
  return (
    <PropsProvider {...props}>
      <PuckProvider {...props}>
        <Layout>{props.children}</Layout>
      </PuckProvider>
    </PropsProvider>
  );
}

// Compound component API
Puck.Components = Components;
Puck.Fields = Fields;
Puck.Preview = Preview;
Puck.Outline = Outline;
```

### Pattern 2: Zustand с slice-архитектурой

**File:** `packages/core/store/index.ts` (lines 111-364)

**Why it matters:** AppStore — это плоский Zustand store с вложенными слайсами (history, nodes, permissions, fields). Каждый слайс живёт в отдельном файле, но все вместе передаются в один `createAppStore`. Это позволяет использовать `subscribeWithSelector` и делать точечные подписки `useAppStore((s) => s.someField)`, избегая ненужных ре-рендеров.

```typescript
export const createAppStore = (initialAppStore?: Partial<AppStore>) =>
  create<AppStore>()(
    subscribeWithSelector((set, get) => ({
      // Core store fields
      instanceId: generateId(),
      state: defaultAppState,
      config: { components: {} },
      status: "LOADING",

      // Slices — каждый возвращает объект с методами
      fields: createFieldsSlice(set, get),
      history: createHistorySlice(set, get),
      nodes: createNodesSlice(set, get),
      permissions: createPermissionsSlice(set, get),

      // Dispatch — главная точка изменений, вызывает reducer
      dispatch: (action: PuckAction) =>
        set((s) => {
          const { record } = get().history;
          const dispatch = createReducer({ record, appStore: s });
          const state = dispatch(s.state, action);
          const selectedItem = state.ui.itemSelector
            ? getItem(state.ui.itemSelector, state)
            : null;
          get().onAction?.(action, state, get().state);
          return { ...s, state, selectedItem };
        }),

      // resolveAndCommitData — async walkAppState для resolveData hooks
      resolveAndCommitData: async () => {
        const { config, state, dispatch, resolveComponentData } = get();
        walkAppState(state, config, (content) => content, (childItem, path) => {
          if (path.length > 1) return childItem;
          resolveComponentData(childItem, "load").then((resolved) => {
            if (resolved.didChange) {
              dispatch({ type: "replace", data: resolved.node, ... });
            }
          });
          return childItem;
        });
      },
      ...initialAppStore,
    }))
  );
```

### Pattern 3: Overlay через createPortal с RAF-throttled позиционированием

**File:** `packages/core/components/DraggableComponent/index.tsx` (lines 241-645)

**Why it matters:** Это одно из самых продуманных решений в codebase. Оверлей (highlight рамка + action buttons) рендерится через `createPortal` в `document.body` и позиционируется абсолютно через `getBoundingClientRect()`. Это решает проблему `overflow: hidden` в контейнерах — оверлей всегда поверх всего. Позиция синхронизируется через `requestAnimationFrame` и `ResizeObserver`, а не через постоянный `setInterval`.

```typescript
// 1. Позиция вычисляется через getBoundingClientRect
const getStyle = useCallback(() => {
  if (!ref.current) return;
  const el = ref.current!;
  const rect = el.getBoundingClientRect();
  // ... логика для scroll offset и fixed-position элементов ...
  const style: CSSProperties = {
    left: `${rect.left + scroll.x}px`,
    top: `${rect.top + scroll.y}px`,
    height: `${rect.height}px`,
    width: `${rect.width}px`,
    position: targetIsFixed ? "fixed" : undefined,
  };
  return style;
}, [iframe.enabled]);

// 2. Синхронизация через RAF (coalesce multiple triggers)
const syncRafRef = useRef<number | null>(null);

const scheduleSync = useCallback(() => {
  if (syncRafRef.current != null) return; // уже запланировано
  syncRafRef.current = requestAnimationFrame(() => {
    syncRafRef.current = null;
    sync();
  });
}, [sync]);

// 3. ResizeObserver для реакции на изменения размеров
useEffect(() => {
  if (ref.current) {
    const observer = new ResizeObserver(() => scheduleSync());
    observer.observe(ref.current);
    return () => observer.disconnect();
  }
}, [scheduleSync]);

// 4. Polling для обнаружения layout shifts (когда selected)
useEffect(() => {
  if (!dragFinished || !(isSelected || thisIsDragging)) return;
  const tick = (t: number) => {
    if (t - lastMeasureRef.current >= MEASURE_EVERY_MS) { // 100ms = 10fps
      const rect = node.getBoundingClientRect();
      const changed = Math.abs(rect.x - prev.x) > 0.5 || ...;
      if (changed) scheduleSync();
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}, [dragFinished, isSelected]);

// 5. createPortal рендерит оверлей в parent document (вне iframe)
return (
  <DropZoneProvider value={nextContextValue}>
    {dragFinished && isVisible &&
      createPortal(
        <div className={getClassName({isSelected, isDragging, hover})}
          style={{ ...style }} data-puck-overlay>
          {/* ActionBar с Duplicate/Delete/SelectParent кнопками */}
          <CustomActionBar>
            {permissions.duplicate && <ActionBar.Action onClick={onDuplicate}>...</ActionBar.Action>}
            {permissions.delete && <ActionBar.Action onClick={onDelete}>...</ActionBar.Action>}
          </CustomActionBar>
        </div>,
        portalEl || document.body
      )}
    {children(refSetter)}
  </DropZoneProvider>
);
```

### Pattern 4: NestedDroppablePlugin — кастомный dnd-kit плагин для вложенности

**File:** `packages/core/lib/dnd/NestedDroppablePlugin.ts` (lines 237-293)

**Why it matters:** Стандартный dnd-kit не умеет хорошо работать с глубоко вложенными drop-зонами. Puck создаёт кастомный Plugin, который на каждый `pointermove` делает `elementsFromPoint()`, собирает все droppable-кандидаты под курсором, сортирует их по `depth` (глубине в дереве) и выбирает самый глубокий. Это ключевое решение для page builder с nested components.

```typescript
export const createNestedDroppablePlugin = (
  { onChange }: NestedDroppablePluginOptions,
  id: string // instanceId Puck-инстанса
): any =>
  class NestedDroppablePlugin extends Plugin<DragDropManager, {}> {
    constructor(manager: DragDropManager) {
      super(manager);

      this.registerEffect(() => {
        const handleMove = (event: BubbledPointerEventType | PointerEvent) => {
          const position = new GlobalPosition(target, { x: event.clientX, y: event.clientY });

          // Проверяем что курсор над нашим Puck instance (по id)
          const elements = document.elementsFromPoint(position.global.x, position.global.y);
          const overEl = elements.some((el) => el.id === id);

          if (overEl) {
            onChange(findDeepestCandidate(position, manager), manager);
          }
        };

        const handleMoveThrottled = throttle(handleMove, 50); // 20fps
        document.body.addEventListener("pointermove", handleMoveThrottled, { capture: true });
        return cleanup;
      });
    }
  };

// Ключевая функция — находит самый глубокий droppable под курсором
export const findDeepestCandidate = (position, manager) => {
  const candidates = getPointerCollisions(position, manager); // elementsFromPoint

  const sortedCandidates = depthSort(candidates); // по data.depth

  // Фильтруем: убираем dragged-item, его descendants, non-droppable zones
  let filteredCandidates = sortedCandidates.filter((candidate) => {
    if (candidateData.path.indexOf(draggedCandidateId) > -1) return false; // descendant
    if (!candidateData.isDroppableTarget) return false; // не принимает тип компонента
    return true;
  });

  return { zone: getZoneId(primaryCandidate), area: primaryCandidateData.areaId };
};
```

### Pattern 5: AutoField — registry-based field renderer с overrides

**File:** `packages/core/components/AutoField/index.tsx` (lines 52-286)

**Why it matters:** AutoField — это система рендеринга полей форм. Вместо switch/case по типам, используется объект `defaultFields` как registry. Каждый тип (text, select, array, richtext...) может быть переопределён через `overrides.fieldTypes`. Это позволяет полностью кастомизировать UI полей без форка библиотеки.

```typescript
const defaultFields = {
  array: ArrayField,
  external: ExternalField,
  object: ObjectField,
  select: SelectField,
  textarea: TextareaField,
  radio: RadioField,
  text: DefaultField,
  number: DefaultField,
  richtext: RichtextField,
};

function AutoFieldInternal(props) {
  const overrides = useAppStore((s) => s.overrides);

  // Merge overrides поверх defaults — пользователь может заменить любой тип
  const render = useMemo(() => ({
    ...overrides.fieldTypes,
    array: overrides.fieldTypes?.array || defaultFields.array,
    text: overrides.fieldTypes?.text || defaultFields.text,
    // ...
  }), [overrides]);

  // Выбор компонента для рендеринга
  let FieldComponent = useMemo(() => {
    if (field.type === "custom" && !render[field.type]) {
      return field.render as any; // inline render function из config
    } else if (field.type !== "slot") {
      return render[field.type]; // из registry
    }
  }, [field.type, render]);

  return (
    <NestedFieldContext.Provider value={{ readOnlyFields: ..., localName: ... }}>
      <div className={getClassNameWrapper()} onFocus={onFocus} onBlur={onBlur}>
        <FieldComponent {...mergedProps}>
          <Children {...mergedProps} />
        </FieldComponent>
      </div>
    </NestedFieldContext.Provider>
  );
}
```

### Pattern 6: AutoFrame — iframe с автоматической синхронизацией стилей

**File:** `packages/core/components/AutoFrame/index.tsx` (lines 69-404)

**Why it matters:** Preview рендерится внутри `<iframe>` чтобы изолировать стили страницы от стилей редактора. Но Tailwind/CSS Modules нужны и внутри. AutoFrame решает это: `CopyHostStyles` читает все `<style>` и `<link rel="stylesheet">` из родительского документа, клонирует их в `<head>` iframe, и слушает MutationObserver на добавление/удаление стилей.

```typescript
const CopyHostStyles = ({ children, onStylesLoaded }) => {
  const { document: doc, window: win } = useFrame();

  useEffect(() => {
    const parentDocument = win.parent.document;
    const collectedStyles = collectStyles(parentDocument); // querySelectorAll('style, link[rel="stylesheet"]')

    // Синхронизация HTML/Body атрибутов (для dark mode класса и т.д.)
    syncAttributes(parentDocument.querySelector("html"), doc.documentElement);
    syncAttributes(parentDocument.querySelector("body"), doc.body);

    // Для LINK элементов — читаем CSSStyleSheet и inline-им правила
    // (нужно для cross-origin stylesheets где cloneNode не даст содержимое)
    const mirrorEl = async (el) => {
      if (el.nodeName === "LINK" && inlineStyles) {
        const styleSheet = getStyleSheet(el);
        const styles = getStyles(styleSheet); // Array.from(cssRules).map(r => r.cssText)
        mirror.innerHTML = styles;
      } else {
        mirror = el.cloneNode(true);
      }
      return mirror;
    };

    // MutationObserver следит за изменениями стилей в родителе
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (el.matches('style, link[rel="stylesheet"]')) defer(() => addEl(el));
        });
        mutation.removedNodes.forEach((node) => {
          if (el.matches(...)) defer(() => removeEl(el));
        });
      });
    });

    observer.observe(parentDocument.head, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
};

// AutoFrame сам по себе — простой iframe с srcDoc
function AutoFrame({ children, frameRef, onReady, ...props }) {
  const [loaded, setLoaded] = useState(false);
  const [mountTarget, setMountTarget] = useState(null);

  return (
    <iframe
      srcDoc='<!DOCTYPE html><html><head></head><body><div id="frame-root" data-puck-entry></div></body></html>'
      ref={frameRef}
      onLoad={() => setLoaded(true)}
    >
      <autoFrameContext.Provider value={ctx}>
        {loaded && mountTarget && (
          <CopyHostStyles onStylesLoaded={() => setStylesLoaded(true)}>
            {createPortal(children, mountTarget)} // React рендерится в iframe через portal
          </CopyHostStyles>
        )}
      </autoFrameContext.Provider>
    </iframe>
  );
}
```

### Pattern 7: MemoizeComponent — кастомный memo с mixed comparison

**File:** `packages/core/components/MemoizeComponent/index.tsx`

**Why it matters:** Стандартный `React.memo` с shallowEqual не подходит, потому что `puck` prop (объект с `renderDropZone`, `metadata` и т.д.) всегда создаётся заново. Кастомный компаратор делает shallowEqual для всех пропов кроме `puck`, а для `puck` — deepEqual через `fast-equals`. Это предотвращает ре-рендеры пользовательских компонентов при изменении несвязанного стейта.

```typescript
export const MemoizeComponent = memo(RenderComponent, (prev, next) => {
  let puckEquals = true;
  if ("puck" in prev.componentProps && "puck" in next.componentProps) {
    puckEquals = deepEqual(prev.componentProps.puck, next.componentProps.puck);
  }

  return (
    prev.Component === next.Component &&
    shallowEqual(prev.componentProps, next.componentProps, ["puck"]) && // skip "puck" key
    puckEquals
  );
});
```

### Pattern 8: walkAppState — функциональный обход дерева с индексацией

**File:** `packages/core/lib/data/walk-app-state.ts`

**Why it matters:** Центральный алгоритм Puck. Обходит всё дерево компонентов (включая вложенные DropZones и слоты), применяет трансформации `mapContent`/`mapNodeOrSkip`, и пересчитывает два индекса: `NodeIndex` (по id компонента) и `ZoneIndex` (по zoneCompound). Эти индексы используются везде — в DraggableComponent, DropZone, Fields — для O(1) lookup без обхода дерева каждый раз.

```typescript
export function walkAppState(state, config, mapContent, mapNodeOrSkip) {
  const newZoneIndex: ZoneIndex = {};
  const newNodeIndex: NodeIndex = {};

  const processItem = (item, path, index) => {
    const mappedItem = mapNodeOrSkip(item, path, index); // может вернуть null чтобы пропустить

    const newProps = {
      ...mapFields(mappedItem, {
        slot: ({ value, parentId, propPath }) => {
          // Рекурсивно обрабатываем slot поля
          const [_, newContent] = processContent(path, `${parentId}:${propPath}`, value, "slot");
          return newContent;
        },
      }, config).props,
      id,
    };

    // Записываем в node index
    newNodeIndex[id] = {
      data: newItem,
      flatData: flattenNode(newItem, config), // развернуть slot ссылки в реальные данные
      path,
      parentId,
      zone,
    };

    return finalData;
  };

  // Результат: обновлённый state + свежие indexes
  return {
    ...state,
    data: { root, content: processedContent, zones: newZones },
    indexes: {
      nodes: { ...state.indexes.nodes, ...newNodeIndex },
      zones: { ...state.indexes.zones, ...newZoneIndex },
    },
  };
}
```

---

## State Management

### Архитектура

Используется **два Zustand store** параллельно:

1. **`appStore` (AppStore)** — внутренний, содержит весь editor state. Подписываются компоненты редактора через `useAppStore((s) => s.someField)`.

2. **`usePuckStore` (UsePuckStore)** — публичный, синхронизируется с appStore через `appStore.subscribe()`. Содержит только то, что нужно пользовательскому коду через `usePuck()`.

### AppStore — структура

```
AppStore {
  // Editor state
  state: AppState                    // data + ui (itemSelector, viewports, sidebars...)
  selectedItem: ComponentData | null
  status: "LOADING" | "MOUNTED" | "READY"
  config: Config
  componentState: Record<id, { loadingCount }>

  // Config
  plugins, overrides, viewports, iframe, fieldTransforms, metadata

  // Actions
  dispatch(action)                   // главная точка мутаций через reducer
  setUi(ui, recordHistory?)          // shortcut для UI-only изменений
  resolveComponentData(data, trigger) // вызывает config.resolveData
  resolveAndCommitData()             // при загрузке: обновляет все компоненты

  // Slices
  history: HistorySlice              // undo/redo с debounce 250ms
  nodes: NodesSlice                  // registry ref-ов для sync overlay позиций
  permissions: PermissionsSlice      // динамические permissions per component
  fields: FieldsSlice                // текущие поля для выбранного компонента

  // Zoom/viewport
  zoomConfig: { autoZoom, rootHeight, zoom }
}
```

### History Slice

Undo/redo реализован через массив снимков AppState. `record()` дебаунсится на 250ms чтобы несколько быстрых изменений объединялись в одну запись. При `back()`/`forward()` вызывается `dispatch({ type: "set", state })`. Горячие клавиши (Ctrl+Z, Cmd+Z, Ctrl+Y...) регистрируются прямо в `useRegisterHistorySlice`.

```typescript
const record = debounce((state: AppState) => {
  const { histories, index } = get().history;
  const history = { state, id: generateId("history") };
  // Truncate future history при новой записи
  const newHistories = [...histories.slice(0, index + 1), history];
  set({ history: { ...get().history, histories: newHistories, index: newHistories.length - 1 } });
}, 250);
```

### ZoneStore — отдельный store для DnD

DragDropContext создаёт отдельный Zustand store (`ZoneStore`) специально для drag state:

```
ZoneStore {
  zoneDepthIndex: Record<zone, boolean>     // какая зона сейчас "активна" (самая глубокая)
  previewIndex: Record<zone, Preview>       // призрак компонента во время drag
  enabledIndex: Record<zone, boolean>       // какие зоны принимают drop
  draggedItem: Draggable | null
  hoveringComponent: string | null          // id компонента под курсором
}
```

Этот store намеренно живёт отдельно от appStore, чтобы drag-события (50fps) не вызывали ре-рендеры не-DnD компонентов.

---

## Drag & Drop System

### Ключевые компоненты

```
DragDropContext
  └── DragDropProvider (@dnd-kit/react)    # корневой провайдер dnd-kit
       └── ZoneStoreProvider               # контекст ZoneStore
            └── DropZoneProvider           # контекст зоны (mode, areaId, depth)
                 └── DropZone             # droppable зона
                      └── DraggableComponent  # каждый компонент - draggable
```

### Два типа drag

1. **"new"** — тащим из `<Drawer>` (панель компонентов). `dragMode = "new"`, source.type = "drawer".
2. **"existing"** — перемещаем существующий компонент. `dragMode = "existing"`, source.type = "component".

### Preview-based drag (не оптимистичный)

Во время drag компонент НЕ перемещается в реальном дереве данных. Вместо этого в `ZoneStore.previewIndex` записывается `Preview` объект, а DropZone при рендеринге подставляет ghost-компонент в нужное место. Это позволяет отменить drag без rollback.

```typescript
// В onDragOver — только обновляем previewIndex
zoneStore.setState({
  previewIndex: {
    [targetZone]: {
      componentType: sourceData.componentType,
      type: "move",
      index: targetIndex,
      zone: targetZone,
      props: item.props,
    },
  },
});

// В onDragEnd — только тогда реальный dispatch
if (thisPreview.type === "insert") {
  insertComponent(thisPreview.componentType, thisPreview.zone, thisPreview.index, appStore);
} else {
  moveComponent(thisPreview.props.id, initialSelector, thisPreview, appStore);
}
```

### Nested drop resolution

Главная проблема page builder — когда курсор над несколькими вложенными зонами одновременно. Решение: `NestedDroppablePlugin` через `elementsFromPoint()` + depth sort. Зоны получают `depth` при регистрации (контекст передаёт `depth + 1` вниз по дереву), и самый глубокий кандидат побеждает.

Дополнительно — дебаунс 100ms при смене `areaId` (но не `zone`), чтобы случайные микро-выходы из зоны не вызывали нежелательные collision updates.

---

## Type System

### Config generics

```typescript
// Пользователь описывает свои компоненты
type MyConfig = Config<{
  HeroBlock: { title: string; subtitle: string };
  CardGrid: { cards: { image: string; text: string }[] };
}>;

// ComponentConfig — описание одного компонента
type ComponentConfig<RenderProps, FieldProps, DataShape> = {
  render: PuckComponent<RenderProps>;        // React компонент
  label?: string;
  defaultProps?: FieldProps;
  fields?: Fields<FieldProps>;               // конфигурация полей форм
  inline?: boolean;                          // рендерить без оборачивающего div

  // Динамический resolver — возвращает данные из внешнего источника
  resolveData?: (data, params) => Promise<WithPartialProps<DataShape, FieldProps>>;

  // Динамические поля — зависят от текущих данных компонента
  resolveFields?: (data, params) => Promise<Fields<FieldProps>>;

  // Динамические permissions — может ли пользователь drag/delete/edit
  resolvePermissions?: (data, params) => Promise<Partial<Permissions>>;
};
```

### PuckComponent — тип рендер-функции

```typescript
export type PuckComponent<Props> = (
  props: WithId<
    WithPuckProps<{
      [K in keyof Props]: WithDeepSlots<Props[K], SlotComponent>;
    }>
  >
) => JSX.Element;

// WithPuckProps добавляет { puck: { renderDropZone, isEditing, dragRef, metadata } }
// WithDeepSlots рекурсивно заменяет slot типы на SlotComponent
// SlotComponent = (props?: Omit<DropZoneProps, "zone">) => ReactNode
```

### UserGenerics — связующее звено

```typescript
type UserGenerics<UserConfig extends Config> = {
  UserConfig: UserConfig;
  UserData: Data<ExtractProps<UserConfig>>;
  UserAppState: AppState<UserData>;
  UserComponentData: ComponentData<ExtractProps<UserConfig>>;
  UserPublicAppState: PublicAppState<UserData>;
};
```

Этот тип позволяет `Puck<MyConfig>` автоматически типизировать `onChange`, `onPublish`, `usePuck()` и все внутренние хуки под конкретный набор компонентов пользователя.

---

## Anti-patterns

### 1. `eslint-disable react-hooks/rules-of-hooks` в render

В `Preview/index.tsx` строка 1: `/* eslint-disable react-hooks/rules-of-hooks */`. Это обходится только потому что `Page` создаётся через `useCallback`, но это хрупкое решение — если функция будет вызываться не как компонент, hooks сломаются.

### 2. `useCallback` с тяжёлой dependency array

В `DraggableComponent` `onClick` и `onSelectParent` имеют dependency arrays которые включают `ctx`, `path` и другие объекты. Это означает что при каждом ре-рендере родителя функции пересоздаются. Должно использоваться `useAppStoreApi().getState()` внутри callback вместо захвата через closure.

### 3. Магические числа в оверлее

```typescript
const space = 8;
const actionsOverlayTop = space * 6.5; // 52px - никакого объяснения 6.5
const actionsTop = -(actionsOverlayTop - 8); // -44px
```

### 4. CSS Modules вместо Tailwind

В 2025 году CSS Modules — это дополнительная сложность без особой выгоды. Все стили должны были быть написаны через Tailwind + shadcn/ui, что дало бы лучшую переиспользуемость и интеграцию с внешними дизайн-системами.

### 5. Deprecated DropZone API не удалён

В `DropZoneEdit` есть активное предупреждение:
```
"DropZones have been deprecated in favor of slot fields and will be removed in a future version of Puck."
```
Но код поддерживает оба пути, что создаёт confusion и лишнюю сложность в алгоритмах.

### 6. Два отдельных store (`appStore` + `usePuckStore`) слишком сложны

`useRegisterUsePuckStore` подписывается на весь `appStore` и зеркалит изменения в отдельный store. Это дублирование можно было заменить просто `usePuck = createUsePuck()` с selector прямо над `appStore`.

---

## Применимо к нашим проектам

### Omoikiri Dashboard

1. **Compound component API** (`Puck.Fields`, `Puck.Preview`) — наш Dashboard может использовать такой же паттерн для `Dashboard.Sidebar`, `Dashboard.Canvas`. Позволяет пользователю переставлять части UI без переписывания всей страницы.

2. **HistorySlice с debounce** — если в Omoikiri есть multi-step формы или live editing, паттерн history с 250ms дебаунсом + undo/redo через Ctrl+Z стоит перенять.

3. **`MemoizeComponent` с mixed comparison** — когда передаёшь `puck`-подобный служебный объект в компонент (например `context` или `callbacks`), стоит делать именно это: shallowEqual для большинства props + deepEqual для служебного объекта.

### Research Dashboard

1. **createPortal для overlay** — паттерн из `DraggableComponent` (portal в document.body + getBoundingClientRect) применим для tooltips и popovers которые должны выходить за пределы `overflow: hidden` контейнеров (таблицы кандидатов, карточки).

2. **ZoneStore/DragDropContext** — если Research Dashboard будет поддерживать drag-and-drop (перестановка колонок, сортировка кандидатов), архитектура Puck показывает как правильно изолировать DnD state (быстрые обновления 50fps) от основного app state.

3. **useContextStore** — паттерн `createContextStore<ValueType>()` + `useContextStore(context, selector)` (файл `lib/use-context-store.tsx`) очень чистый способ передавать Zustand store через Context без лишних ре-рендеров. Мы можем использовать это для передачи store фильтров/настроек без prop drilling.

4. **AutoFrame (style sync в iframe)** — если Research Dashboard будет показывать preview-фреймы (например превью новостей или страниц кандидатов в изолированном контексте), этот паттерн с MutationObserver + CopyHostStyles готов к использованию.

5. **walkAppState** — общий паттерн обхода дерева с одновременной индексацией можно применить если нужно строить derived data structures из вложенных структур данных (например группировка кандидатов по статусам + индекс по id для O(1) lookup).
