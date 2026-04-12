# Reusable Patterns: Puck

> Extracted from deep analysis of measuredco/puck (8.5k stars).
> Ready to copy-adapt into Adil's projects.

---

## Pattern 1: Zustand Slice Architecture

**Source:** `packages/core/store/slices/`
**Applicable to:** Omoikiri dashboard, Research Dashboard
**Category:** state-management

### The Problem
Complex editor state with history, permissions, nodes, and field states — too much for a single Zustand store. Need modular state that can be composed.

### The Solution
```typescript
// Each slice is a factory function that receives set/get
type SliceFactory<T> = (
  set: StoreApi<AppStore>['setState'],
  get: StoreApi<AppStore>['getState']
) => T;

// History slice — undo/redo with configurable depth
const createHistorySlice: SliceFactory<HistorySlice> = (set, get) => ({
  histories: [{ id: 'root', state: initialAppState }],
  index: 0,
  hasPast: false,
  hasFuture: false,
  setHistories: (histories) => {
    set({
      history: {
        ...get().history,
        histories,
        index: histories.length - 1,
        hasPast: histories.length > 1,
        hasFuture: false,
      },
    });
  },
  back: () => {
    const { index, histories } = get().history;
    if (index > 0) {
      const newIndex = index - 1;
      set({
        ...histories[newIndex].state,
        history: {
          ...get().history,
          index: newIndex,
          hasPast: newIndex > 0,
          hasFuture: true,
        },
      });
    }
  },
  // ... forward, record, etc.
});

// Compose all slices into one store
const createAppStore = (initialState: AppState) =>
  createStore<AppStore>()(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      history: createHistorySlice(set, get),
      nodes: createNodesSlice(set, get),
      permissions: createPermissionsSlice(set, get),
      fields: createFieldsSlice(set, get),
    }))
  );
```

### How to Adapt
For Omoikiri dashboard: split WhatsApp connection state, channel profiles, and playbook editor into separate slices. Each slice manages its own undo/redo if needed. Use `subscribeWithSelector` for efficient re-renders.

---

## Pattern 2: Dynamic Field Registry

**Source:** `packages/core/components/AutoField/fields/index.tsx`
**Applicable to:** Omoikiri (channel profile forms), Research Dashboard (filters)
**Category:** ui-component

### The Problem
Many different form field types (text, select, radio, array, object, richtext, external). Don't want a giant switch/case. Need to be extensible — users should be able to add custom field types.

### The Solution
```typescript
// Field registry — object map instead of switch
const fieldTypeMap: Record<string, React.FC<FieldProps>> = {
  text: DefaultField,
  number: DefaultField,
  textarea: TextareaField,
  select: SelectField,
  radio: RadioField,
  array: ArrayField,
  object: ObjectField,
  richtext: RichtextField,
  external: ExternalField,
};

// Usage: just look up by type string
function AutoField({ field, value, onChange }: AutoFieldProps) {
  const Component = fieldTypeMap[field.type];
  if (!Component) return null;
  return <Component field={field} value={value} onChange={onChange} />;
}

// Override any field type via config
const config: Config = {
  overrides: {
    fieldTypes: {
      text: ({ children, ...props }) => (
        <MyCustomTextField {...props}>{children}</MyCustomTextField>
      ),
    },
  },
};
```

### How to Adapt
For Omoikiri channel profile editor: define field types for WhatsApp message templates (text, image, button, list). Users configure templates through a form that auto-renders based on field type map. Extensible for future message types without changing core code.

---

## Pattern 3: Overlay Positioning with rAF Coalescing

**Source:** `packages/core/components/DraggableComponent/index.tsx`
**Applicable to:** Research Dashboard (map tooltips), Omoikiri (inline editors)
**Category:** ui-component

### The Problem
Floating UI overlays (toolbars, selection indicators) need to track element position precisely, even during scroll, resize, and layout shifts. Must be performant with many elements.

### The Solution
```typescript
function useOverlayPosition(
  ref: RefObject<HTMLElement>,
  isSelected: boolean
) {
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!isSelected || !ref.current) return;

    let rafId: number;

    const sync = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setStyle({
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: 'none',
      });
    };

    // Initial sync
    sync();

    // ResizeObserver for element size changes
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(sync);
    });
    ro.observe(ref.current);

    // Polling fallback for layout shifts (10fps — cheap)
    const interval = setInterval(sync, 100);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
      clearInterval(interval);
    };
  }, [isSelected]);

  return style;
}

// Render overlay in portal
function Overlay({ targetRef, isSelected, children }) {
  const style = useOverlayPosition(targetRef, isSelected);
  if (!isSelected) return null;

  return createPortal(
    <div style={style} className="overlay">
      {children}
    </div>,
    document.body
  );
}
```

### How to Adapt
For Research Dashboard Voronoi map: replace CSS-based tooltips with portal overlays that follow territory nodes during zoom/pan. The rAF coalescing prevents jank when many overlays update simultaneously.

---

## Pattern 4: Compound Component API

**Source:** `packages/core/components/Puck/index.tsx`
**Applicable to:** All projects
**Category:** api-design

### The Problem
Complex component with many sub-sections (editor, preview, fields, actions). Monolithic props API becomes unwieldy. Users need to customize layout without forking.

### The Solution
```typescript
// Main component with static sub-components
function Puck({ config, data, onPublish }: PuckProps) {
  return (
    <PuckProvider config={config} data={data}>
      <AppStoreProvider>
        <Puck.Preview />
        <Puck.Fields />
        <Puck.Outline />
        <Puck.Actions onPublish={onPublish} />
      </AppStoreProvider>
    </PuckProvider>
  );
}

// Each sub-component reads from shared context
Puck.Preview = function PuckPreview() {
  const appState = useAppStore(s => s.state);
  const config = usePuckConfig();
  return <Render config={config} data={appState.data} />;
};

Puck.Fields = function PuckFields() {
  const selectedItem = useAppStore(s => s.ui.selectedItem);
  const config = usePuckConfig();
  if (!selectedItem) return <p>Select a component</p>;
  return <AutoField fields={config.components[selectedItem.type].fields} />;
};

// Users can rearrange or replace sub-components
function CustomEditor(props) {
  return (
    <Puck {...props}>
      <div className="my-layout">
        <Sidebar><Puck.Outline /></Sidebar>
        <Main><Puck.Preview /></Main>
        <Panel><Puck.Fields /></Panel>
      </div>
    </Puck>
  );
}
```

### How to Adapt
For Omoikiri dashboard: instead of one monolithic `<Dashboard>` component with 20 props, split into `<Dashboard.Channels />`, `<Dashboard.Playbooks />`, `<Dashboard.Analytics />`. Users of the component can rearrange sections. Each reads from shared Zustand store via context.

---

## Pattern 5: Canary + Stable Release Pipeline

**Source:** `.github/workflows/publish.yml` + `publish-canary.yml`
**Applicable to:** vault-research-agent, research-dashboard
**Category:** ci-cd

### The Problem
Need to publish stable releases from release branches AND canary builds from every main commit. Two separate workflows but consistent publishing logic.

### The Solution
```yaml
# publish.yml — stable releases
on:
  push:
    branches: ['releases/**']
jobs:
  publish:
    if: startsWith(github.event.head_commit.message, 'release: ')
    steps:
      - uses: actions/checkout@v4
      - run: yarn install --frozen-lockfile
      - run: yarn build
      - run: |
          echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc
          ./scripts/publish.sh latest
      # Tag the release
      - run: |
          VERSION=$(node -p "require('./lerna.json').version")
          git tag "v$VERSION"
          git push origin "v$VERSION"

# publish-canary.yml — every push to main
on:
  push:
    branches: [main]
jobs:
  canary:
    if: "!startsWith(github.event.head_commit.message, 'release: ')"
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # needed for git SHA in version
      - run: yarn install --frozen-lockfile
      - run: yarn build
      - run: |
          VERSION=$(node -p "require('./lerna.json').version")
          CANARY="${VERSION}-canary.$(git rev-parse --short HEAD)"
          npx lerna version "$CANARY" --no-git-tag-version --yes
          ./scripts/publish.sh canary
```

### How to Adapt
For research-dashboard: add canary deploys to Vercel preview on every PR, stable deploys only from `releases/*` branches. For vault-research-agent: tag parser runs with version for reproducibility.
