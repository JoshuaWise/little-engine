import { LittleEngine, RENDER_ID, REFRESH } from './little-engine.js';
import { createTree } from './create-tree.js';

export function start(): void {
	if (IS_STARTED) return;
	IS_STARTED = true;

	requestAnimationFrame(function renderLoop() {
		IS_RENDERING = true;
		try {
			render();
		} finally {
			IS_RENDERING = false;
			requestAnimationFrame(renderLoop);
		}
	});
}

function render() {
	let count = 0;
	while (UPDATE_QUEUE.size) {
		if (++count > RECURSION_LIMIT) {
			console.warn(`LittleEngine recursive render limit (${RECURSION_LIMIT}) was reached.`);
			break;
		}
		renderSweep();
	}
}

function renderSweep(): void {
	// The "renderElement()" function is potentially reentrant, due to edge-case
	// requirements in "connectedCallback()". Therefore, we use RENDER_ID to
	// avoid invalid or repeat renders.
	const renderId = Symbol();
	for (const element of UPDATE_QUEUE) {
		element[RENDER_ID] = renderId;
	}

	// Fast path for single-element renders.
	if (UPDATE_QUEUE.size === 1) {
		const element = UPDATE_QUEUE.values().next().value!;
		renderElement(element, renderId);
		return;
	}

	// When rendering multiple LittleEngines at once, we need to make sure to
	// render them in bottom-up order, because ancestors may depend on the state
	// of their descendants.
	const roots = createTree(UPDATE_QUEUE);
	UPDATE_QUEUE.clear();

	roots.forEach(function renderTree({ element, children }) {
		children.forEach(renderTree);
		renderElement(element, renderId);
	});
}

export function renderElement(element: LittleEngine, renderId: Symbol): void {
	if (element[RENDER_ID] === renderId) {
		UPDATE_QUEUE.delete(element);
		const refresh = element[REFRESH];
		if (refresh !== undefined) {
			refresh();
			element.dispatchEvent(new Event('refresh', { bubbles: true, composed: false }));
		}
	}
}

let IS_STARTED: boolean = false;
let IS_RENDERING: boolean = false;
const RECURSION_LIMIT = 1000;
export const UPDATE_QUEUE: Set<LittleEngine> = new Set();
export const isRendering = () => IS_RENDERING;
