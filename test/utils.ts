// see https://stackoverflow.com/a/2117523
export function uid() {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
		var r = (Math.random() * 16) | 0,
			v = c == "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

export function uniformly<T>(...elements: Array<(() => T) | T>): T {
	if (elements.length === 0) throw Error("Must have at least 1 element!");
	const prob = 1 / elements.length;
	const index = Math.floor(Math.random() / prob);
	const f = elements[index];
	return typeof f === "function" ? f() : f;
}

export function randomInt(min: number = 0, max: number = 100): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
