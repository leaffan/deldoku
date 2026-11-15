// Hilfsfunktionen für Barrierefreiheit

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Zuletzt fokussiertes Element außerhalb modaler Dialoge. Das Suchfeld im Spielerdialog holt sich
// den Fokus schon beim Einhängen, bevor modalDialog läuft; document.activeElement zeigt dann
// bereits in den Dialog und taugt nicht mehr als Ziel für die Fokus-Rückgabe.
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
 * Svelte-Action für modale Dialoge: hält den Tab-Fokus im Element, schließt mit Escape
 * und gibt den Fokus beim Schließen an das zuvor fokussierte Element zurück.
 */
export function modalDialog(node: HTMLElement, onClose: () => void) {
	let close = onClose;
	const active = document.activeElement as HTMLElement | null;
	const previouslyFocused = active && node.contains(active) ? lastFocusOutsideDialog : active;

	// Nur fokussieren, wenn nicht schon ein Kindelement (z. B. das Suchfeld) den Fokus hat
	queueMicrotask(() => {
		if (!node.contains(document.activeElement)) {
			(node.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus();
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			// Eine offene Vorschlagsliste (Combobox) schließt sich zuerst selbst, nicht der ganze Dialog
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

/** Name eines Landes zum ISO-Code in der gewählten Sprache, z. B. "de" → "Deutschland". */
export function countryName(code: string, lang: string): string {
	try {
		return (
			new Intl.DisplayNames([lang], { type: 'region' }).of(code.toUpperCase()) ?? code.toUpperCase()
		);
	} catch {
		return code.toUpperCase();
	}
}
