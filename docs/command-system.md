# The Art of Editor Architecture: A Deep Dive into Triplanner Core

> "The essence of a complex editor is not how it renders, but how it manages change."

This document is a comprehensive guide to the **Step / Transaction / Command** architecture used in `@triplanner/core`. It is designed to take you from a conceptual understanding to an expert level, capable of discussing these patterns in high-level system design interviews.

---

## 📚 Chapter 1: The Philosophy of State
### 1.1 Why do we need this? (The Problem with Mutation)

In simple applications (like a Form), **Two-Way Data Binding** or direct mutation is fine:
```js
// ❌ The "Simple" Way
rect.x = 100;
rect.fill = 'red';
```
But in a complex **Whiteboard/Editor**, this approach collapses quickly:
1.  **History is Hard**: To undo, you have to snapshot the *entire* state (expensive!) or manually track what changed.
2.  **Collaboration is Impossible**: If User A sets `x=100` and User B sets `x=200` concurrently, who wins? You have no "intent", just final values.
3.  **Consistency is Fragile**: What if moving a block requires also moving its connected lines? Direct mutation makes it easy to forget side effects.

### 1.2 The Solution: Changes as Data (Reified State Changes)

We follow the **Marijn Haverbeke Philosophy** (creator of ProseMirror/CodeMirror):
**State is Immutable. Changes are Data.**

Instead of *doing* the change, we *describe* the change:
```js
// ✅ The "Architecture" Way
const change = { kind: 'move', id: 'rect1', dx: 10, dy: 10 };
```
This object is a **Step**. It is:
- **Serializable**: Can be saved to disk or sent over a network.
- **Inspectable**: We can look at it and say "Ah, this is a move operation".
- **Reversible**: We can mathematically compute its opposite.

---

## 🔬 Chapter 2: The Atom of Change - `Step`

### 2.1 Concept: The Smallest Unit
A **Step** is the atomic unit of change. It is the "LEGO brick" of our system.
It does not know about "User Intent" (like "Drag Drop"). It only knows about "Data Fact" (like "Update x to 100").

### 2.2 Implementation in Triplanner
*(Reference: `packages/core/src/steps/types.ts`)*

```typescript
export interface Step {
  kind: string;
  apply(state: EditorState): StepApplyResult;
  invert(before: EditorState): Step;
}
```

#### Deep Dive: The `invert` Method
The magic of this architecture lies in `invert`. We don't store snapshots for Undo. We store **Inverse Steps**.
- If `Step` is "Add 5 to X", `Inverse` is "Subtract 5 from X".
- If `Step` is "Delete Object A", `Inverse` is "Create Object A (with all its original properties)".

**Why is this better than snapshots?**
- **Memory**: A snapshot might be 10MB. An inverse step is 100 bytes.
- **Granularity**: We can undo *just* the last action, not reset the whole world.

### 2.3 Engineering Practice: Strong Schema
In `apply()`, we enforce the **Schema**.
- If you try to move a shape to `NaN`, `apply()` returns `failed`.
- This ensures the `EditorState` is **Always Valid**. Illegal states are unrepresentable because the Step refuses to produce them.

---

## 📦 Chapter 3: The Unit of Work - `Transaction`

### 3.1 Concept: Atomicity & Context
Users don't think in "Steps". They think in "Actions".
- Action: "Delete this Group".
- Steps: "Remove Rect A", "Remove Rect B", "Remove Connector C".

A **Transaction** wraps multiple Steps into one atomic unit. It also adds **Metadata**:
- **Who?** (`clientId`)
- **When?** (`timestamp`)
- **Why?** (`label`: 'delete-selection')
- **Undoable?** (`addToHistory`: true/false)

### 3.2 Implementation
*(Reference: `packages/core/src/transaction/transaction.ts`)*

```typescript
export interface Transaction {
  steps: Step[];
  meta: TransactionMeta;
}
```

### 3.3 Deep Dive: The "Inverse Transaction"
When we apply a Transaction, the system automatically computes the **Inverse Transaction**:
1.  Take all Steps in the Transaction.
2.  Generate their `invert()` counterparts.
3.  Reverse their order.

> **Metaphor**: If you walk forward (Step A), turn left (Step B), and jump (Step C).
> To undo, you must: Land (Inverse C), turn right (Inverse B), walk back (Inverse A).
> Order matters!

---

## ⏳ Chapter 4: The Time Machine - `History`

### 4.1 Concept: The Stack of Deltas
The History system is dumb. It doesn't know about the document. It only knows about **Transactions**.

- **Undo Stack**: A list of `[Transaction, InverseTransaction]` pairs.
- **Redo Stack**: A list of `[Transaction, InverseTransaction]` pairs.

### 4.2 Advanced Topic: Transaction Merging
*(Reference: `packages/core/src/history/history.ts`)*

**Problem**: When dragging an object, you generate 60 Transactions per second. You don't want the user to have to press Cmd+Z 60 times to undo one drag.
**Solution**: **Transaction Merging**.
We tag transactions with a `groupId` (e.g., "drag-123"). The History system looks at the top of the stack:
- "Is the new transaction part of the same `groupId` as the last one?"
- **Yes**: Merge them! (Combine steps, keep only the oldest inverse).
- **No**: Push as a new entry.

This is why in `Whiteboard.tsx`, we pass `groupId: 'drag'` during `pointerMove`.

---

## 🛠 Chapter 5: The API Layer - `Command`

### 5.1 Concept: Functional Composition
We don't want UI components creating raw Steps. That's too low-level.
**Commands** are helper functions that:
1.  Accept `State` + `Params`.
2.  Logic: "What steps do I need?"
3.  Construct `Transaction`.
4.  Apply and return new `State`.

### 5.2 Pattern: Functional Core, Imperative Shell
Our commands are **Pure Functions** (mostly).
`addShape(state, shape) -> newState`
They don't modify global state. They return the new world. The UI (React) then decides to `setState` with that new world.

---

## 🧠 Chapter 6: Generalized Learning & Patterns

### 6.1 Design Patterns
1.  **Command Pattern**: Encapsulating a request as an object (`Step`).
2.  **Memento Pattern**: Capturing internal state (`invert`) to restore it later.
3.  **Composite Pattern**: `Transaction` is a composite of `Steps`.

### 6.2 Software Engineering Principles
1.  **Event Sourcing**: We treat the current state as a left-fold of all previous Steps. (Though we store the current state for performance, the *truth* is the history of steps).
2.  **Functional Core**: The logic is isolated from the side effects (rendering).
3.  **Reified State**: Making implicit concepts (changes) explicit (objects).

---

## 🎓 Chapter 7: Interview Guide (Senior/Expert)

### Q1: "Why separate Step from Transaction? Why not just have Transactions?"
**Answer**: Granularity and Composition.
- **Steps** are the *mechanics* (data integrity). They are simple and easy to validate.
- **Transactions** are the *semantics* (user intent). They handle meta-concerns like history and collaboration.
- Separating them allows us to compose complex Transactions from simple, reusable Steps without duplicating logic.

### Q2: "How would you implement Collaborative Editing (Real-time) on this?"
**Answer**: This architecture is pre-optimized for **CRDTs (Conflict-free Replicated Data Types)** or **OT (Operational Transformation)**.
- Since changes are data (`Steps`), we can send them over the wire.
- **Y.js Integration**: We would map our `Step` types to Y.js operations (`yMap.set`, `yArray.insert`).
- When a remote Step arrives, we apply it as a `Transaction` with `source: 'remote'`.
- **Conflict Resolution**: Because Steps are granular ("Update x"), conflicts are minimized compared to snapshot replacement.

### Q3: "How do you handle 'Dependent' Steps in a Transaction?"
*Scenario: Step 1 creates Block A. Step 2 creates a Connector attached to Block A. But Block A doesn't exist yet in the `before` state.*
**Answer**: This is why `applyTransaction` applies steps **sequentially**.
- Step 1 runs -> produces `tempState` (Block A exists).
- Step 2 runs on `tempState` -> Validates Block A exists -> Success.
- If Step 2 fails, the *entire* Transaction rolls back (Atomicity).

---

## 📝 Appendix: Cheat Sheet

| Concept | Role | Key Property | Metaphor |
| :--- | :--- | :--- | :--- |
| **State** | The Truth | Immutable | The Snapshot |
| **Step** | The Change | Invertible | The LEGO Brick |
| **Transaction** | The Action | Atomic | The Receipt |
| **History** | The Memory | Stack-based | The Time Machine |
| **Command** | The Tool | Functional | The Builder |

### The Golden Rule
> **"Never mutate state. Always dispatch a Transaction."**
