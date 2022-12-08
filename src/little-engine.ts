import * as setup from './setup.js';
import traverse from './traverse.js';
import { start, renderElement, isRendering, UPDATE_QUEUE } from './renderer.js';

let DID_WARN: boolean = false;
export const SHADOW_ROOT = Symbol('shadow root');
export const ATTACHED = Symbol('attached');
export const RENDER_ID = Symbol('render id');
export const REFRESH = Symbol('refresh');
export const MUTATE = Symbol('mutate');
export const STATE = Symbol('state');
export const EMPTY_STATE = Symbol('empty state');

export type ScheduleRefresh = () => void;
export type RefreshFunction<T> = (getState: GetState) => T;
export type MutationFunction = (...args: unknown[]) => unknown;
export type OptionHandler = (value: string | null) => void;
export type SlotHandler = (nodes: ReadonlyArray<Node>) => void;
export type GetState = <T>(element: LittleEngine<T>) => T;

// A function used to define a LittleEngine subclass (i.e., new custom element).
// The types of the subclass are inferred from the initializer's return type.
export type LittleEngineInitializer<
	TState,
	TMutations extends Record<string, MutationFunction> | unknown
> = (
	root: ShadowRoot,
	refresh: ScheduleRefresh
) => LittleEngineDefinition<TState, TMutations>;

// The definition of a LittleEngine subclass, as returned from an initializer.
export interface LittleEngineDefinition<
	TState,
	TMutations extends Record<string, MutationFunction> | unknown
> {
	refresh: RefreshFunction<TState>;
	mutations?: TMutations;
	options?: Record<string, OptionHandler>;
	slots?: Record<string, SlotHandler>;
	slot?: SlotHandler;
}

// All LittleEngines derive from this abstract class.
export abstract class LittleEngine<
	TState = unknown,
	TMutations extends Record<string, MutationFunction> | unknown = unknown
> extends HTMLElement {

	// Each subclass of LittleEngine is a custom element.
	// Subclasses are created by calling "define()".
	static define<
		TState = unknown,
		TMutations extends Record<string, MutationFunction> | undefined = undefined
	>(
		name: string,
		initializer: LittleEngineInitializer<TState, TMutations>
	): typeof LittleEngine<TState, TMutations> {
		if (typeof name !== 'string') {
			throw new TypeError('LittleEngine name must be a string');
		}
		if (typeof initializer !== 'function') {
			throw new TypeError('LittleEngine initializer must be a function');
		}
		if (!isSupported()) {
			if (!DID_WARN) {
				DID_WARN = true;
				console.warn('LittleEngine disabled due to lack of browser support.');
			}
			return class BrokenLittleEngine extends LittleEngine<TState, TMutations> {};
		}

		class CustomLittleEngine extends LittleEngine<TState, TMutations> {
			constructor() {
				super();

				// First, run the initializer to get the element's definition.
				this[SHADOW_ROOT] = this.attachShadow({ mode: 'closed' });
				const scheduleRefresh = createRefreshScheduler(this);
				const definition = initializer(this[SHADOW_ROOT], scheduleRefresh);

				if (typeof definition !== 'object' || definition === null) {
					throw new TypeError(`LittleEngine "${name.toLowerCase()}" initializer did not return an object`);
				}

				// Then, setup the element's subsystems based on the definition.
				setup.refreshFunction(this, definition.refresh);
				setup.mutationInterface(this, definition.mutations);
				const cb = setup.optionHandlers(this, definition.options);
				setup.slotHandlers(this[SHADOW_ROOT], definition.slots, definition.slot);

				// Finally, notify option handlers of any initial attributes.
				cb && cb();
			}
		}

		start();
		customElements.define(name, CustomLittleEngine);
		return CustomLittleEngine;
	}

	declare private [SHADOW_ROOT]: ShadowRoot | undefined;
	declare private [ATTACHED]: boolean;
	declare private [RENDER_ID]: Symbol | null;
	declare private [REFRESH]: (() => void) | undefined;
	declare private [MUTATE]: Readonly<TMutations> | undefined;
	declare private [STATE]: TState | typeof EMPTY_STATE;

	constructor() {
		super();
		Object.defineProperties(this, {
			[SHADOW_ROOT]: { value: undefined, writable: true },
			[ATTACHED]: { value: false, writable: true },
			[RENDER_ID]: { value: null, writable: true },
			[REFRESH]: { value: undefined, writable: true },
			[MUTATE]: { value: undefined, writable: true },
			[STATE]: { value: EMPTY_STATE, writable: true },
		});
	}

	protected connectedCallback() {
		if (!isLittleEngine(this)) return;
		if (this[ATTACHED]) return;
		if (!this.isConnected) return;
		if (!isRendering()) {
			this[ATTACHED] = true;
			UPDATE_QUEUE.add(this);
			return;
		}

		// If the LittleEngine is being attached to the document during a render
		// phase, we need to find all descendant LittleEngines and synchronously
		// render them in bottom-up order.

		const renderId = Symbol();
		const queue: LittleEngine[] = [];

		traverse(this, function callback(element: LittleEngine) {
			if (!element[ATTACHED]) {
				element[ATTACHED] = true;
				element[RENDER_ID] = renderId;
				for (const child of element[SHADOW_ROOT]!.children) {
					traverse(child, callback);
				}
				queue.push(element);
			}
		});

		for (const element of queue) {
			renderElement(element, renderId);
		}
	}

	protected disconnectedCallback() {
		if (!isLittleEngine(this)) return;
		if (!this[ATTACHED]) return;
		if (this.isConnected) {
			// TODO: handle "atomic move" case
			// TODO: also test "element.replaceWith()" and "element.replaceChildren()"
		}

		// Whenever a LittleEngine is detached from the document, we have to
		// find all descendant LittleEngines and synchronously disable their
		// ability to render.

		traverse(this, function callback(element: LittleEngine) {
			if (element[ATTACHED]) {
				element[ATTACHED] = false;
				element[RENDER_ID] = null;
				UPDATE_QUEUE.delete(element);
				for (const child of element[SHADOW_ROOT]!.children) {
					traverse(child, callback);
				}
			}
		});
	}

	get mutate(): Readonly<TMutations> {
		const mutationInterface = this[MUTATE];
		if (mutationInterface === undefined) {
			throw new TypeError(`LittleEngine "${this.tagName.toLowerCase()}" mutations are not available during initialization`);
		}
		return mutationInterface;
	}

	set mutate(_: Readonly<TMutations>) {
		throw new TypeError('LittleEngine mutations are not writable');
	}
}

function createRefreshScheduler(element: LittleEngine) {
	return () => {
		if (element.isConnected) {
			UPDATE_QUEUE.add(element);
		}
	};
}

export function isLittleEngine(node: Node): node is LittleEngine {
	return (node as LittleEngine)[SHADOW_ROOT] !== undefined;
}

export function isSupported(): boolean {
	return typeof ShadowRoot === 'function'
		&& typeof HTMLSlotElement === 'function'
		&& typeof MutationObserver === 'function'
		&& typeof requestAnimationFrame === 'function'
		&& typeof customElements === 'object';
}
