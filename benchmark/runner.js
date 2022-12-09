'use strict';

document.addEventListener('DOMContentLoaded', () => {
	const template = document.getElementById('template');
	const table = document.getElementById('table');
	const resultRowCount = document.getElementById('result-row-count');
	const resultFPS = document.getElementById('result-fps');
	const resultMS = document.getElementById('result-ms');

	const SAMPLE_WINDOW = 1500;
	const ROW_DELAY = 3000;
	const PRINT_DELAY = 200;

	let times = [];
	let values = [];
	let rowCount = 0;
	let lastPrintTime = 0;
	let prevTime = Date.now();
	const startTime = prevTime;

	function calculateResults() {
		const currTime = Date.now();
		times.push({ duration: currTime - prevTime, at: currTime });

		if (currTime > startTime + rowCount * ROW_DELAY) {
			table.appendChild(template.content.cloneNode(true));
			values = Array.from(document.getElementsByTagName('bm-cell-value'));
			rowCount += 1;
		}

		if (currTime > lastPrintTime + PRINT_DELAY) {
			times = times.filter(x => x.at >= currTime - SAMPLE_WINDOW);
			const totalTime = times.map(x => x.duration).reduce((a, b) => a + b);
			const fps = times.length / totalTime * 1000;
			resultRowCount.textContent = String(rowCount);
			resultFPS.textContent = String(Math.round(fps));
			resultMS.textContent = String(Math.round(1000 / fps));
			lastPrintTime = currTime;
		}

		prevTime = currTime;
	}

	function updateTable() {
		for (const value of values) {
			value.mutate.setValue(Math.floor(Math.random() * 1000));
		}
	}

	requestAnimationFrame(function loop() {
		calculateResults();
		updateTable();
		requestAnimationFrame(loop);
	});
});
