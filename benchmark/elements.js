'use strict';

LittleEngine.define('bm-table', (root, refresh) => {
	root.innerHTML = `
		<style>
			:host {
				display: flex;
				flex-direction: column;
				background: #bbb;
				gap: 2px 0;
				border: 2px solid #bbb;
				border-radius: 16px;
				overflow: hidden;
				font-family: system-ui, ui-sans-serif, Helvetica, sans-serif;
				user-select: none;
				cursor: normal;
			}
		</style>
		<slot></slot>
	`;

	root.addEventListener('refresh', (ev) => {
		if (ev.target.tagName === 'BM-CELL-VALUE') {
			refresh();
		}
	});

	return {
		refresh(getState) {
			// Note that this could be optimized by caching these elements,
			// instead of re-selecting them every refresh. But we'll be
			// antagonistic in our benchmark.
			const rows = Array.from(root.host.getElementsByTagName('bm-row'));
			const rowValues = rows.slice(1).map(row => row.getElementsByTagName('bm-cell-value'));
			const rowHeaders = root.host.getElementsByTagName('bm-cell-header');
			const columnCount = rowHeaders.length;

			for (let column = 0; column < columnCount; ++column) {
				let sum = 0;
				for (const values of rowValues) {
					sum += getState(values[column]);
				}
				const average = Math.round(sum / rowValues.length);
				rowHeaders[column].mutate.setValue(average);
			}

			// This is only actually needed when new columns are added (which
			// only happens once), but we'll be antagonistic in our benchmark.
			for (const cell of root.host.getElementsByTagName('bm-cell')) {
				cell.style.width = `${1 / columnCount * 100}%`;
			}
		},
	};
});

LittleEngine.define('bm-row', (root, refresh) => {
	root.innerHTML = `
		<style>
			:host {
				display: flex;
				gap: 0 2px;
			}
		</style>
		<slot></slot>
	`;

	return { refresh: () => {} };
});

LittleEngine.define('bm-cell', (root, refresh) => {
	root.innerHTML = `
		<style>
			:host {
				display: flex;
				flex-direction: column;
				align-items: center;
				padding: 4px 2px;
				min-width: 32px;
				background: #f8f8f8;
				overflow: hidden;
			}
		</style>
		<slot></slot>
	`;

	return { refresh: () => {} };
});

LittleEngine.define('bm-cell-header', (root, refresh) => {
	root.innerHTML = `
		<style>
			:host {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 2px 0;
			}
			slot {
				font-weight: 900;
				color: #777;
			}
			.value {
				color: #bbb;
			}
			.value.hidden {
				display: none;
			}
		</style>
		<div><slot></slot></div>
		<div class="value"></div>
	`;

	const valueDiv = root.querySelector('.value');
	let currentValue = undefined;

	return {
		refresh() {
			if (currentValue === undefined) {
				valueDiv.classList.add('hidden');
				valueDiv.textContent = '';
			} else {
				valueDiv.textContent = String(currentValue);
				valueDiv.classList.remove('hidden');
			}
			return currentValue;
		},
		mutations: {
			setValue(value) {
				currentValue = Math.max(0, Math.min(999, value)) || 0;
				refresh();
			},
		},
	};
});

LittleEngine.define('bm-cell-value', (root, refresh) => {
	root.innerHTML = `
		<style>
			:host {
				display: block;
			}
			div {
				color: #555;
			}
		</style>
		<div></div>
	`;

	const div = root.querySelector('div');
	let currentValue = 0;

	return {
		refresh() {
			div.textContent = String(currentValue);
			return currentValue;
		},
		mutations: {
			setValue(value) {
				currentValue = Math.max(0, Math.min(999, value)) || 0;
				refresh();
			},
		},
	};
});
