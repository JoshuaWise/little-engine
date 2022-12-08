import { LittleEngine, isLittleEngine } from './little-engine.js';

/*
	This function traverses a DOM tree and finds all LittleEngines, including
	any that are inside a <slot> element. The callback is invoked once for each
	LittleEngine. To recursively find LittleEngines inside of LittleEngines,
	just recursively call "traverse()" within the callback.
 */

export default function traverse(
	element: Element,
	callback: (x: LittleEngine) => void
): void {
	if (isLittleEngine(element)) {
		callback(element);
	} else {
		if (element instanceof HTMLSlotElement) {
			for (const child of element.assignedElements()) {
				traverse(child, callback);
			}
		}
		for (const child of element.children) {
			traverse(child, callback);
		}
	}
}
