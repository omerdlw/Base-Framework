import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Compose,
  composeProviders,
  createProviderEntry,
} from "../src/core/composer.ts";

function OuterProvider({ children }) {
  return children;
}

function MiddleProvider({ mode, children }) {
  return children;
}

function InnerProvider({ children }) {
  return children;
}

test("Compose flattens providers from outermost to innermost", () => {
  const tree = Compose({
    providers: [
      OuterProvider,
      createProviderEntry(MiddleProvider, { mode: "strict" }),
      InnerProvider,
    ],
    children: "LeafContent",
  });

  // Outermost is OuterProvider
  assert.equal(tree.type, OuterProvider);

  // Second is MiddleProvider with props
  const middle = tree.props.children;
  assert.equal(middle.type, MiddleProvider);
  assert.equal(middle.props.mode, "strict");

  // Third is InnerProvider
  const inner = middle.props.children;
  assert.equal(inner.type, InnerProvider);

  // Leaf is Fragment wrapping "LeafContent"
  const leafFragment = inner.props.children;
  assert.equal(leafFragment.props.children, "LeafContent");
});

test("composeProviders returns a reusable component with ComposedProviders displayName", () => {
  const AppProviders = composeProviders([
    OuterProvider,
    [MiddleProvider, { mode: "custom" }],
  ]);

  assert.equal(AppProviders.displayName, "ComposedProviders");

  const tree = AppProviders({ children: "AppBody" });
  assert.equal(tree.type, OuterProvider);
  assert.equal(tree.props.children.type, MiddleProvider);
  assert.equal(tree.props.children.props.mode, "custom");
  assert.equal(tree.props.children.props.children.props.children, "AppBody");
});

test("Compose handles empty providers array gracefully", () => {
  const tree = Compose({
    providers: [],
    children: "DirectChild",
  });

  assert.equal(tree.props.children, "DirectChild");
});
