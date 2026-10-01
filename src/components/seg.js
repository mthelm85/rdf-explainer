/** A segmented (pill) control that works with Framework's view(). */
export function seg(options, {value = options[0]?.value ?? options[0], label} = {}) {
  const opts = options.map((o) => (typeof o === "object" ? o : {value: o, label: String(o)}));
  const root = document.createElement("div");
  root.className = "seg";
  root.setAttribute("role", "group");
  if (label) root.setAttribute("aria-label", label);
  root.value = value;
  const buttons = opts.map((o) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = o.label;
    b.setAttribute("aria-pressed", String(o.value === value));
    b.onclick = () => {
      root.value = o.value;
      for (const [i, bb] of buttons.entries()) bb.setAttribute("aria-pressed", String(opts[i].value === o.value));
      root.dispatchEvent(new Event("input", {bubbles: true}));
    };
    root.appendChild(b);
    return b;
  });
  return root;
}
