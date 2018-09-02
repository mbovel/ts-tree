/**
 *  0
 *  +--1
 *  |  +--2
 *  |     +--3
 *  |        +--4
 *  +--5
 *  +--6
 *
 *  7
 *  +--8
 *  +--9
 */
import { Tree } from "../src/Tree";

export function exampleTrees(): Tree<number>[] {
	const trees: Tree<number>[] = Array(10);
	trees[9] = new Tree(9);
	trees[8] = new Tree(8);
	trees[7] = new Tree(7, [trees[8], trees[9]]);
	trees[6] = new Tree(6);
	trees[5] = new Tree(5);
	trees[4] = new Tree(4);
	trees[3] = new Tree(3, [trees[4]]);
	trees[2] = new Tree(2, [trees[3]]);
	trees[1] = new Tree(1, [trees[2]]);
	trees[0] = new Tree(0, [trees[1], trees[5], trees[6]]);
	return trees;
}

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

export function randomInt(min: number = 5, max: number = 1000): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
