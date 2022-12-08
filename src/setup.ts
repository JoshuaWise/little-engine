import {
	LittleEngine,
	isLittleEngine,
	RefreshFunction,
	MutationFunction,
	OptionHandler,
	REFRESH,
	MUTATE,
	STATE,
	EMPTY_STATE,
} from './little-engine.js';

/*
	These exported functions each set up a subsystem of a LittleEngine.
	Subsystem setup is performed within the element's constructor, after
	used-defined initialization is done. It's okay for us to perform
	used-defined initialization before the element is done with subsytem setup
	because each subsystem just defines deferred functions which can't be called
	during initialization anyways.

	We carefully perform plenty of runtime type checks here, even though we're
	using TypeScript, because the person importing this package might not be
	using TypeScript (which also explains the use of "!=" and "==").
 */

export function refreshFunction<TState>(
	self: LittleEngine<TState>,
	refresh: RefreshFunction<TState>
): void {
	if (typeof refresh !== 'function') {
		throw new TypeError(`LittleEngine "${self.tagName.toLowerCase()}" was initialized without a "refresh" function`);
	}

	const getState = createStateGetter(self);

	self[REFRESH] = () => {
		REFRESH_STACK.push(self);
		try {
			self[STATE] = refresh(getState);
		} finally {
			REFRESH_STACK.pop();
		}
	};
}

export function mutationInterface<
	TMutations extends Record<string, MutationFunction> | undefined
>(
	self: LittleEngine<unknown, TMutations>,
	mutations: Readonly<TMutations> | undefined
): void {
	const mutationInterface: Partial<TMutations> = {};

	if (mutations != undefined) {
		for (const mutationName of Object.keys(mutations)) {
			const mutationFunction = mutations[mutationName as keyof TMutations];

			if (typeof mutationFunction !== 'function') {
				throw new TypeError(`LittleEngine "${self.tagName.toLowerCase()}" mutation "${mutationName}" must be a function`);
			}

			mutationInterface[mutationName as keyof TMutations] = mutationFunction;
		}
	}

	self[MUTATE] = Object.freeze(mutationInterface as TMutations);
}

export function optionHandlers(
	self: LittleEngine,
	options: Readonly<Record<string, OptionHandler>> | undefined
): (() => void) | null {
	if (options == undefined) {
		return null;
	}

	const optionHandlers: Map<string, OptionHandler> = new Map();

	for (const optionName of Object.keys(options)) {
		const optionHandler = options[optionName];

		if (typeof optionHandler !== 'function') {
			throw new TypeError(`LittleEngine "${self.tagName.toLowerCase()}" option handler "${optionName}" must be a function`);
		}
		if (optionName.startsWith('opt-')) {
			console.warn(`LittleEngine "${self.tagName.toLowerCase()}" option "opt-${optionName}" is probably misnamed.`);
		}

		optionHandlers.set(`opt-${optionName}`, optionHandler);
	}

	if (optionHandlers.size) {
		new MutationObserver(createOptionCallback(self, optionHandlers))
			.observe(self, { attributeFilter: [...optionHandlers.keys()] });

		// The MutationObserver won't pick up the element's initial attributes,
		// so we return this callback, which will be called after setup is done.
		return createInitialOptionCallback(self, optionHandlers);
	}

	return null;
}

const REFRESH_STACK: LittleEngine[] = [];
function createStateGetter(self: LittleEngine) {
	return function getState<T>(element: LittleEngine<T>) {
		if (REFRESH_STACK[REFRESH_STACK.length - 1] !== self) {
			throw new TypeError('LittleEngine "getState()" was illegally used outside its proper "refresh" function');
		}
		if (!isLittleEngine(element)) {
			throw new TypeError('LittleEngine "getState()" was illegally used on a non-LittleEngine');
		}
		const state = element[STATE];
		if (state === EMPTY_STATE) {
			throw new TypeError('LittleEngine "getState()" was illegally used on a non-descendant LittleEngine');
		}
		return state;
	};
}

function createInitialOptionCallback(
	self: LittleEngine,
	handlers: ReadonlyMap<string, OptionHandler>
) {
	return () => {
		for (const attributeName of handlers.keys()) {
			const attributeValue = self.getAttribute(attributeName);
			if (attributeValue != null) {
				const handler = handlers.get(attributeName)!;
				handler(attributeValue);
			}
		}
	};
}

function createOptionCallback(
	self: LittleEngine,
	handlers: ReadonlyMap<string, OptionHandler>
) {
	return (records: ReadonlyArray<MutationRecord>) => {
		for (const { attributeName } of records) {
			const handler = handlers.get(attributeName!)!;
			handler(self.getAttribute(attributeName!));
		}
	};
}
