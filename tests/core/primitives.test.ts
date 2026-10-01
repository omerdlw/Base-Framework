import "../support/dom.ts";
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { act, createElement as h } from "react";
import { render } from "../support/render.ts";
import { Themed } from "../support/themes.ts";
import { Button } from "../../src/core/primitives/button.tsx";
import { Badge } from "../../src/core/primitives/badge.tsx";
import { ThemeProvider, defineTheme } from "../../src/core/theme.tsx";
import { primitivesTheme } from "../../src/core/primitives/theme.ts";
import { primitivesThemeConfig } from "../../src/config/primitives.core.theme.ts";
import { Avatar } from "../../src/core/primitives/avatar.tsx";
import { Progress } from "../../src/core/primitives/progress.tsx";
import { Separator } from "../../src/core/primitives/separator.tsx";
import { Skeleton } from "../../src/core/primitives/skeleton.tsx";
import { getInitials } from "../../src/core/primitives/utils.ts";
import { Checkbox } from "../../src/core/primitives/checkbox.tsx";
import { Input } from "../../src/core/primitives/input.tsx";
import { Select } from "../../src/core/primitives/select.tsx";
import { Switch } from "../../src/core/primitives/switch.tsx";

import { Provider as TooltipProvider } from "@radix-ui/react-tooltip";
import { Textarea } from "../../src/core/primitives/textarea.tsx";
import { Tooltip } from "../../src/core/primitives/tooltip.tsx";
import { Loader } from "../../src/core/primitives/loader.tsx";
import { Spinner } from "../../src/core/primitives/spinner.tsx";

describe("button and theming", () => {
  const mount = (element) => render(h(Themed, null, element));

  describe("Button", () => {
    test("renders a typed button with the themed classes", async () => {
      const view = await mount(h(Button, null, "Save"));
      const button = view.container.querySelector("button");

      assert.equal(button!.type, "button");
      assert.equal(button!.textContent, "Save");
      assert.ok(button!.className.includes("focus-visible:ring-2"));
    });

    test("caller classes are appended after the theme", async () => {
      const view = await mount(h(Button, { className: "rounded-full" }, "x"));

      assert.ok(
        view.container
          .querySelector("button")!
          .className.endsWith("rounded-full"),
      );
    });

    test("forwards clicks, and disabled blocks them", async () => {
      let clicks = 0;
      const view = await mount(
        h(
          "div",
          null,
          h(Button, { id: "on", onClick: () => clicks++ }, "on"),
          h(
            Button,
            { id: "off", disabled: true, onClick: () => clicks++ },
            "off",
          ),
        ),
      );

      await act(async () =>
        (view.container.querySelector("#on")! as any).click(),
      );
      await act(async () =>
        (view.container.querySelector("#off")! as any).click(),
      );

      assert.equal(clicks, 1);
    });

    test("loading disables the button, marks it busy and keeps its width", async () => {
      const view = await mount(h(Button, { loading: true }, "Save"));
      const button = view.container.querySelector("button");

      assert.equal(button!.disabled, true);
      assert.equal(button!.getAttribute("aria-busy"), "true");
      assert.ok(button!.querySelector(".invisible"));
      assert.equal(button!.querySelector(".invisible")!.textContent, "Save");
    });

    test("a custom loader replaces the default one", async () => {
      const view = await mount(
        h(
          Button,
          { loading: true, loader: h("em", { id: "spin" }, "...") },
          "Save",
        ),
      );

      assert.ok(view.container.querySelector("#spin"));
    });
  });

  describe("primitives theme injection", () => {
    test("the slot classes come from whichever theme is provided", async () => {
      const custom = defineTheme(primitivesTheme, {
        slots: {
          ...primitivesThemeConfig.config.slots,
          badge: "custom-badge-class",
        } as any,
      });
      const view = await render(
        h(ThemeProvider, { themes: [custom] }, h(Badge, null, "new")),
      );

      assert.ok(
        view.container
          .querySelector("span")!
          .className.includes("custom-badge-class"),
      );
    });

    test("a primitive without its theme fails with a pointer to config/", async () => {
      const originalError = console.error;
      console.error = () => {};
      try {
        await assert.rejects(
          render(
            h(ThemeProvider, { themes: [] as any[] }, h(Badge, null, "x")),
          ),
          /Theme "primitives" is missing/,
        );
      } finally {
        console.error = originalError;
      }
    });
  });
});

describe("display primitives", () => {
  const mount = (element) => render(h(Themed, null, element));

  describe("Badge", () => {
    test("renders its content with themed pill classes", async () => {
      const view = await mount(h(Badge, null, "New"));
      const badge = view.container.querySelector("span");

      assert.equal(badge!.textContent, "New");
      assert.ok(badge!.className.includes("rounded-full"));
    });
  });

  describe("Separator", () => {
    test("is decorative by default and sized by orientation", async () => {
      const view = await mount(h(Separator));
      const el = view.container.firstChild;

      assert.equal((el! as any).getAttribute("role"), "none");
      assert.ok((el! as any).className.includes("h-px"));
    });

    test("a semantic vertical separator exposes role and orientation", async () => {
      const view = await mount(
        h(Separator, { decorative: false, orientation: "vertical" }),
      );
      const el = view.container.firstChild;

      assert.equal((el! as any).getAttribute("role"), "separator");
      assert.equal((el! as any).getAttribute("aria-orientation"), "vertical");
      assert.ok((el! as any).className.includes("w-px"));
    });
  });

  describe("Skeleton", () => {
    test("is hidden from assistive tech", async () => {
      const view = await mount(h(Skeleton, { className: "h-4" }));
      const el = view.container.firstChild;

      assert.equal((el! as any).getAttribute("aria-hidden"), "true");
      assert.ok((el! as any).className.includes("skeleton-block"));
      assert.ok((el! as any).className.includes("h-4"));
    });
  });

  describe("Progress", () => {
    const bar = (view) => view.container.querySelector("[role=progressbar]");

    test("exposes aria values and scales the indicator", async () => {
      const view = await mount(h(Progress, { value: 25 }));

      assert.equal(bar(view).getAttribute("aria-valuenow"), "25");
      assert.equal(bar(view).getAttribute("aria-valuemax"), "100");
      assert.equal(bar(view).firstChild.style.transform, "scaleX(0.25)");
    });

    test("values are clamped into range", async () => {
      const over = await mount(h(Progress, { value: 250 }));
      const under = await mount(h(Progress, { value: -5 }));

      assert.equal(bar(over).getAttribute("aria-valuenow"), "100");
      assert.equal(bar(under).getAttribute("aria-valuenow"), "0");
    });

    test("a missing value is indeterminate", async () => {
      const view = await mount(h(Progress, { value: null }));

      assert.equal(bar(view).getAttribute("data-state"), "indeterminate");
      assert.equal(bar(view).getAttribute("aria-valuenow"), null);
    });

    test("custom min and max normalise the ratio", async () => {
      const view = await mount(h(Progress, { max: 20, min: 10, value: 15 }));

      assert.equal(bar(view).firstChild.style.transform, "scaleX(0.5)");
    });
  });

  describe("Avatar", () => {
    test("shows the image when a source is given", async () => {
      const view = await mount(
        h(Avatar, { name: "Ada Lovelace", src: "/a.png" }),
      );

      assert.equal(
        view.container.querySelector("img")!.getAttribute("src"),
        "/a.png",
      );
    });

    test("falls back to initials without a source", async () => {
      const view = await mount(h(Avatar, { name: "Ada Lovelace" }));

      assert.equal(view.container.textContent, "AL");
    });

    test("a broken image falls back to initials", async () => {
      const view = await mount(
        h(Avatar, { name: "Ada Lovelace", src: "/missing.png" }),
      );

      await act(async () => {
        view.container
          .querySelector("img")!
          .dispatchEvent(new window.Event("error", { bubbles: false }));
      });

      assert.equal(view.container.querySelector("img"), null);
      assert.equal(view.container.textContent, "AL");
    });

    test("size applies to both dimensions", async () => {
      const view = await mount(h(Avatar, { name: "A", size: 48 }));
      const el = view.container.firstChild;

      assert.equal((el! as any).style.width, "48px");
      assert.equal((el! as any).style.height, "48px");
    });
  });

  describe("getInitials", () => {
    test("handles single names, many words and empty input", () => {
      assert.equal(getInitials("ada"), "AD");
      assert.equal(getInitials("Ada Byron Lovelace"), "AL");
      assert.equal(getInitials("  "), "?");
      assert.equal(getInitials(undefined), "?");
    });
  });
});

describe("form controls", () => {
  const mount = (element) => render(h(Themed, null, element));
  const click = (el) => act(async () => el.click());

  describe("Switch", () => {
    test("reflects checked state through ARIA and the themed thumb", async () => {
      const off = await mount(h(Switch, { checked: false }));
      const on = await mount(h(Switch, { checked: true }));
      const thumb = (view) => view.container.querySelector("span");

      assert.equal(
        off.container.querySelector("button")!.getAttribute("aria-checked"),
        "false",
      );
      assert.equal(
        on.container.querySelector("button")!.getAttribute("aria-checked"),
        "true",
      );
      assert.ok(thumb(off).className.includes("translate-x-0"));
      assert.ok(thumb(on).className.includes("translate-x-5"));
    });

    test("clicking asks for the opposite value", async () => {
      const calls: any[] = [];
      const view = await mount(
        h(Switch, {
          checked: false,
          onCheckedChange: (v) => calls.push(v as any),
        }),
      );

      await click(view.container.querySelector("button"));

      assert.deepEqual(calls, [true]);
    });

    test("disabled never asks", async () => {
      const calls: any[] = [];
      const view = await mount(
        h(Switch, {
          disabled: true,
          onCheckedChange: (v) => calls.push(v as any),
        }),
      );

      await click(view.container.querySelector("button"));

      assert.deepEqual(calls, []);
    });

    test("preventDefault in onClick vetoes the change", async () => {
      const calls: any[] = [];
      const view = await mount(
        h(Switch, {
          onCheckedChange: (v) => calls.push(v as any),
          onClick: (event) => event.preventDefault(),
        }),
      );

      await click(view.container.querySelector("button"));

      assert.deepEqual(calls, []);
    });
  });

  describe("Checkbox", () => {
    const box = (view) => view.container.querySelector("button");

    test("maps its three states to ARIA", async () => {
      const unchecked = await mount(h(Checkbox));
      const checked = await mount(h(Checkbox, { checked: true }));
      const mixed = await mount(h(Checkbox, { checked: "indeterminate" }));

      assert.equal(box(unchecked).getAttribute("aria-checked"), "false");
      assert.equal(box(checked).getAttribute("aria-checked"), "true");
      assert.equal(box(mixed).getAttribute("aria-checked"), "mixed");
      assert.equal(box(mixed).getAttribute("data-state"), "indeterminate");
    });

    test("shows an indicator only when checked or mixed", async () => {
      const unchecked = await mount(h(Checkbox));
      const checked = await mount(h(Checkbox, { checked: true }));

      assert.equal(box(unchecked).children.length, 0);
      assert.equal(box(checked).children.length, 1);
    });

    test("toggling from indeterminate asks for checked", async () => {
      const calls: any[] = [];
      const view = await mount(
        h(Checkbox, {
          checked: "indeterminate",
          onCheckedChange: (v) => calls.push(v as any),
        }),
      );

      await click(box(view));

      assert.deepEqual(calls, [true]);
    });

    test("a custom icon replaces the default indicator", async () => {
      const view = await mount(
        h(Checkbox, { checked: true, icon: h("b", { id: "tick" }, "✓") }),
      );

      assert.ok(view.container.querySelector("#tick"));
    });
  });

  describe("Input", () => {
    test("renders a plain input without a wrapper", async () => {
      const view = await mount(h(Input, { placeholder: "Email" }));

      assert.equal((view.container.firstChild! as any).tagName, "INPUT");
      assert.equal((view.container.firstChild! as any).placeholder, "Email");
    });

    test("decoration is rendered with the current value", async () => {
      const view = await mount(
        h(Input, {
          decoration: ({ value }) =>
            h("i", { id: "count" }, String((value as any).length)),
          onChange: () => {},
          value: "abc",
        }),
      );

      assert.equal(view.container.querySelector("#count")!.textContent, "3");
    });

    test("top and bottom decorations sit on the correct side", async () => {
      const top = await mount(
        h(Input, {
          decoration: h("i", { id: "d" }),
          decorationPosition: "top",
        }),
      );
      const bottom = await mount(
        h(Input, {
          decoration: h("i", { id: "d" }),
          decorationPosition: "bottom",
        }),
      );
      const order = (view) =>
        [...view.container.firstChild.children].map((el) => el.tagName);

      assert.deepEqual(order(top), ["DIV", "INPUT"]);
      assert.deepEqual(order(bottom), ["INPUT", "DIV"]);
    });
  });

  describe("Select", () => {
    const options = [
      { label: "Apple", value: "apple" },
      { label: "Pear", value: "pear", description: "Juicy" },
      { label: "Plum", value: "plum", disabled: true },
    ];
    const trigger = (view) => view.container.querySelector("[role=combobox]");
    const listed = (view) => [
      ...view.container.querySelectorAll("[role=option]"),
    ];

    test("shows the placeholder, then the selected label", async () => {
      const empty = await mount(
        h(Select, { options, placeholder: "Pick one" }),
      );
      const chosen = await mount(h(Select, { options, value: "pear" }));

      assert.match(trigger(empty).textContent, /Pick one/);
      assert.match(trigger(chosen).textContent, /Pear/);
    });

    test("clicking the trigger opens the list with every option", async () => {
      const view = await mount(h(Select, { options }));
      assert.equal(listed(view).length, 0);

      await click(trigger(view));

      assert.equal(trigger(view).getAttribute("aria-expanded"), "true");
      assert.deepEqual(
        listed(view).map((o) => o.textContent),
        ["Apple", "PearJuicy", "Plum"],
      );
    });

    test("choosing an option reports value and option, then closes", async () => {
      const calls: any[] = [];
      const view = await mount(
        h(Select, {
          onChange: (v, o) => calls.push([v, o.label] as any),
          options,
        }),
      );

      await click(trigger(view));
      await click(listed(view)[1]);

      assert.deepEqual(calls, [["pear", "Pear"]]);
      assert.equal(listed(view).length, 0);
      assert.match(trigger(view).textContent, /Pear/);
    });

    test("a controlled value is not changed by the component", async () => {
      const view = await mount(
        h(Select, { onChange: () => {}, options, value: "apple" }),
      );

      await click(trigger(view));
      await click(listed(view)[1]);

      assert.match(trigger(view).textContent, /Apple/);
    });

    test("disabled options cannot be chosen", async () => {
      const calls: any[] = [];
      const view = await mount(
        h(Select, { onChange: (v) => calls.push(v as any), options }),
      );

      await click(trigger(view));
      await click(listed(view)[2]);

      assert.deepEqual(calls, []);
    });

    test("a disabled select never opens", async () => {
      const view = await mount(h(Select, { disabled: true, options }));

      await click(trigger(view));

      assert.equal(listed(view).length, 0);
    });

    test("name adds a hidden input carrying the value", async () => {
      const view = await mount(
        h(Select, { name: "fruit", options, value: "pear" }),
      );
      const hidden = view.container.querySelector('input[type="hidden"]');

      assert.equal((hidden! as any).name, "fruit");
      assert.equal((hidden! as any).value, "pear");
    });

    test("an empty list shows the empty message", async () => {
      const view = await mount(
        h(Select, {
          defaultOpen: true,
          emptyMessage: "Nothing here",
          options: [] as any[],
        }),
      );

      assert.match(view.container.textContent, /Nothing here/);
    });

    test("Escape closes an open list", async () => {
      const view = await mount(h(Select, { defaultOpen: true, options }));
      assert.equal(listed(view).length, 3);

      await act(async () => {
        window.dispatchEvent(
          new window.KeyboardEvent("keydown", { key: "Escape" }),
        );
      });

      assert.equal(listed(view).length, 0);
    });
  });
});

describe("Select keyboard", () => {
  const options = [
    { label: "Apple", value: "apple" },
    { label: "Pear", value: "pear", disabled: true },
    { label: "Plum", value: "plum" },
    { label: "Fig", value: "fig" },
  ];
  const mountSelect = (props: any = {}) =>
    render(h(Themed, null, h(Select, { options, ...props })));
  const combobox = (view: any) =>
    view.container.querySelector("[role=combobox]");
  const press = (view: any, key: string) =>
    act(async () => {
      combobox(view).dispatchEvent(
        new window.KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key,
        }),
      );
    });
  const highlighted = (view: any) =>
    [...view.container.querySelectorAll("[role=option]")].findIndex((el: any) =>
      el.className.includes("bg-white/10"),
    );

  test("ArrowDown opens the list on the first enabled option", async () => {
    const view = await mountSelect();

    await press(view, "ArrowDown");

    assert.equal(combobox(view).getAttribute("aria-expanded"), "true");
    assert.equal(highlighted(view), 0);
  });

  test("arrows move through enabled options only and wrap around", async () => {
    const view = await mountSelect();
    await press(view, "ArrowDown");

    await press(view, "ArrowDown");
    assert.equal(highlighted(view), 2);
    await press(view, "ArrowDown");
    assert.equal(highlighted(view), 3);
    await press(view, "ArrowDown");
    assert.equal(highlighted(view), 0);
    await press(view, "ArrowUp");
    assert.equal(highlighted(view), 3);
  });

  test("opening starts on the current selection", async () => {
    const view = await mountSelect({ value: "plum" });

    await press(view, "ArrowDown");

    assert.equal(highlighted(view), 2);
  });

  test("Enter chooses the highlighted option and closes", async () => {
    const chosen: string[] = [];
    const view = await mountSelect({ onChange: (v: string) => chosen.push(v) });
    await press(view, "ArrowDown");
    await press(view, "ArrowDown");

    await press(view, "Enter");

    assert.deepEqual(chosen, ["plum"]);
    assert.equal(combobox(view).getAttribute("aria-expanded"), "false");
  });

  test("Enter and Space open a closed list", async () => {
    const view = await mountSelect();

    await press(view, " ");
    assert.equal(combobox(view).getAttribute("aria-expanded"), "true");
    await press(view, "Enter");
    assert.equal(combobox(view).getAttribute("aria-expanded"), "false");
  });

  test("a disabled select ignores the keyboard", async () => {
    const view = await mountSelect({ disabled: true });

    await press(view, "ArrowDown");

    assert.equal(combobox(view).getAttribute("aria-expanded"), "false");
  });

  test("an uncontrolled select keeps its default value", async () => {
    const view = await mountSelect({ defaultValue: "fig" });

    assert.match(combobox(view).textContent, /Fig/);
  });
});

describe("Textarea", () => {
  const mountArea = (props: any = {}) =>
    render(h(Themed, null, h(Textarea, props)));

  test("renders a themed textarea with the given value", async () => {
    const view = await mountArea({ defaultValue: "hello" });
    const area = view.container.querySelector(
      "textarea",
    ) as HTMLTextAreaElement;

    assert.equal(area.value, "hello");
    assert.ok(area.className.includes("disabled:opacity-50"));
  });

  test("resize prop maps to Tailwind classes", async () => {
    const none = await mountArea({ resize: "none" });
    const vertical = await mountArea({ resize: "vertical" });
    const both = await mountArea({ resize: true });
    const cls = (view: any) =>
      view.container.querySelector("textarea").className;

    assert.match(cls(none), /resize-none/);
    assert.match(cls(vertical), /resize-y/);
    assert.match(cls(both), /\bresize\b/);
  });

  test("min and max heights become inline styles", async () => {
    const view = await mountArea({ maxHeight: 200, minHeight: "4rem" });
    const style = (view.container.querySelector("textarea") as HTMLElement)
      .style;

    assert.equal(style.minHeight, "4rem");
    assert.equal(style.maxHeight, "200px");
  });

  test("onChange is forwarded", async () => {
    const seen: string[] = [];
    const view = await mountArea({
      onChange: (e: any) => seen.push(e.target.value),
    });
    const area = view.container.querySelector(
      "textarea",
    ) as HTMLTextAreaElement;

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        (window as any).HTMLTextAreaElement.prototype,
        "value",
      )!.set!;
      setValue.call(area, "typed");
      area.dispatchEvent(new window.Event("input", { bubbles: true }));
    });

    assert.deepEqual(seen, ["typed"]);
  });

  test("decorations render at the requested position", async () => {
    const order = async (position: string) => {
      const view = await mountArea({
        decoration: h("i", { id: "d" }),
        decorationPosition: position,
      });
      return [...(view.container.firstChild as HTMLElement).children].map(
        (el: any) => el.tagName,
      );
    };

    assert.deepEqual(await order("top"), ["DIV", "TEXTAREA"]);
    assert.deepEqual(await order("bottom"), ["TEXTAREA", "DIV"]);
    assert.deepEqual(await order("inside"), ["TEXTAREA", "DIV"]);
  });

  test("a function decoration receives the current value", async () => {
    const view = await mountArea({
      decoration: ({ value }: any) =>
        h("b", { id: "len" }, String(value.length)),
      onChange: () => {},
      value: "four",
    });

    assert.equal(view.container.querySelector("#len")?.textContent, "4");
  });

  test("ref callbacks receive the element", async () => {
    let element: HTMLElement | null = null;
    await mountArea({ ref: (el: HTMLElement | null) => (element = el) });

    assert.equal((element as any)?.tagName, "TEXTAREA");
  });
});

describe("Tooltip", () => {
  const mountTip = (props: any = {}) =>
    render(
      h(
        Themed,
        null,
        h(
          TooltipProvider,
          null,
          h(
            Tooltip,
            { text: "Helpful", ...props },
            h("button", { id: "t" }, "target"),
          ),
        ),
      ),
    );

  test("shows its text in a portal when open", async () => {
    await mountTip({ open: true });

    assert.match(document.body.textContent ?? "", /Helpful/);
  });

  test("stays hidden while closed", async () => {
    const view = await mountTip({ open: false });

    assert.doesNotMatch(document.body.textContent ?? "", /Helpful/);
    assert.ok(view.container.querySelector("#t"));
  });

  test("content carries the tooltip class and stacking order", async () => {
    await mountTip({ open: true });
    const content = document.body.querySelector(
      ".tooltip-content",
    ) as HTMLElement;

    assert.ok(content);
    assert.ok(content.style.getPropertyValue("--z-tooltip"));
  });
});

describe("loaders", () => {
  test("Loader is an accessible status and honours size and colour", async () => {
    const view = await render(h(Loader, { color: "red", size: 12 }));
    const status = view.container.querySelector("[role=status]") as HTMLElement;
    const dot = view.container.querySelector(".bbl-loader") as HTMLElement;

    assert.equal(status.getAttribute("aria-label"), "Loading");
    assert.equal(dot.style.getPropertyValue("--size"), "12px");
    assert.equal(dot.style.getPropertyValue("--color-1"), "red");
  });

  test("Loader with children reserves the children's space", async () => {
    const view = await render(h(Loader, null, "Save"));

    assert.equal(
      view.container.querySelector(".invisible")?.textContent,
      "Save",
    );
  });

  test("Spinner is a labelled status", async () => {
    const view = await render(h(Spinner, { className: "text-red-500" }));
    const status = view.container.querySelector("[role=status]") as HTMLElement;

    assert.equal(status.getAttribute("aria-label"), "Loading");
    assert.ok(status.className.includes("animate-spin"));
  });
});
