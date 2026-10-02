// One shared, modern tooltip: a small dark card that follows the pointer.
let el;

function ensure() {
	if (el || typeof document === 'undefined') return el;
	el = document.createElement('div');
	el.className = 'tooltip';
	el.setAttribute('role', 'tooltip');
	document.body.append(el);
	return el;
}

/** @param {string} html @param {PointerEvent | MouseEvent} event */
export function showTooltip(html, event) {
	const t = ensure();
	if (!t) return;
	t.innerHTML = html;
	t.classList.add('visible');
	moveTooltip(event);
}

/** @param {PointerEvent | MouseEvent} event */
export function moveTooltip(event) {
	const t = ensure();
	if (!t) return;
	const pad = 14;
	const { width, height } = t.getBoundingClientRect();
	let x = event.clientX + pad;
	let y = event.clientY - height - pad;
	if (x + width > window.innerWidth - 8) x = event.clientX - width - pad;
	if (y < 8) y = event.clientY + pad;
	t.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}

export function hideTooltip() {
	el?.classList.remove('visible');
}

/** Escape text for use inside tooltip HTML. @param {string} s */
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
