// Accessibility helpers

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Last focused element outside modal dialogs. The search field in the player dialog grabs focus
// on mount, before modalDialog runs; by then document.activeElement already points into the
// dialog and is no longer usable as the target for restoring focus.
let lastFocusOutsideDialog: HTMLElement | null = null;
if (typeof document !== 'undefined') {
	document.addEventListener(
		'focusin',
		(e) => {
			const el = e.target as HTMLElement;
			if (!el.closest?.('[aria-modal="true"]')) lastFocusOutsideDialog = el;
		},
		true
	);
}

/**
 * Svelte action for modal dialogs: traps Tab focus inside the element, closes on Escape
 * and returns focus to the previously focused element on close.
 */
export function modalDialog(node: HTMLElement, onClose: () => void) {
	let close = onClose;
	const active = document.activeElement as HTMLElement | null;
	const previouslyFocused = active && node.contains(active) ? lastFocusOutsideDialog : active;

	// Only focus if no child element (e.g. the search field) already has focus
	queueMicrotask(() => {
		if (!node.contains(document.activeElement)) {
			(node.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus();
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			// An open suggestion list (combobox) closes itself first, not the whole dialog
			if ((e.target as HTMLElement | null)?.getAttribute?.('aria-expanded') === 'true') return;
			e.preventDefault();
			close();
			return;
		}
		if (e.key !== 'Tab') return;
		const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
			(el) => el.offsetParent !== null
		);
		if (items.length === 0) return;
		const first = items[0];
		const last = items[items.length - 1];
		if (
			e.shiftKey &&
			(document.activeElement === first || !node.contains(document.activeElement))
		) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	node.addEventListener('keydown', handleKeydown);
	return {
		update(newOnClose: () => void) {
			close = newOnClose;
		},
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
			previouslyFocused?.focus?.();
		}
	};
}

/** Country name for an ISO code in the selected language, e.g. "de" → "Deutschland". */
export function countryName(code: string, lang: string): string {
	try {
		return (
			new Intl.DisplayNames([lang], { type: 'region' }).of(code.toUpperCase()) ?? code.toUpperCase()
		);
	} catch {
		return code.toUpperCase();
	}
}
