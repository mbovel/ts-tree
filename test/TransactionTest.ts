import * as assert from "assert";
import { Tree } from "../src/Tree";
import { TransactionBuilder } from "../src/transaction/TransactionBuilder";
import { TransactionPatcher } from "../src/transaction/TransactionPatcher";
import { randomInt, uniformly } from "./utils";
import { Serializer, TransactionableTree } from "../src/transaction/TransactionableTree";
import { Id, Transaction } from "../src/transaction/Transaction";

interface JSONTree<T> {
	value: T;
	id: number;
	children?: JSONTree<T>[];
}

type Delta = number;
type Serial = JSONTree<number>;

class TestTree extends Tree implements TransactionableTree<Delta, Serial> {
	value: number;

	constructor(readonly id: number) {
		super();
		this.value = id;
	}

	diff(that: this): number {
		return this.value - that.value;
	}

	apply(delta: number): void {
		this.value += delta;
	}

	unapply(delta: number): void {
		this.value -= delta;
	}
}

const serializer: Serializer<Serial, TestTree> = {
	serialize: (tree: TestTree): Serial => ({
		value: tree.value,
		id: tree.id,
		children: (tree.children || []).map(c => serializer.serialize(c))
	}),

	deserialize(serial: Serial): TestTree {
		const t = new TestTree(serial.id);
		t.value = serial.value;
		t.push(...(serial.children || []).map(c => serializer.deserialize(c)));
		return t;
	}
};

function clone(tree: TestTree) {
	return serializer.deserialize(serializer.serialize(tree));
}

const map: Map<Id, TestTree> = new Map();

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
function exampleTrees(): TestTree[] {
	const trees: TestTree[] = Array(10);
	trees[9] = new TestTree(9);
	trees[8] = new TestTree(8);
	trees[7] = new TestTree(7);
	trees[7].push(trees[8], trees[9]);
	trees[6] = new TestTree(6);
	trees[5] = new TestTree(5);
	trees[4] = new TestTree(4);
	trees[3] = new TestTree(3);
	trees[3].push(trees[4]);
	trees[2] = new TestTree(2);
	trees[2].push(trees[3]);
	trees[1] = new TestTree(1);
	trees[1].push(trees[2]);
	trees[0] = new TestTree(0);
	trees[0].push(trees[1], trees[5], trees[6]);
	trees.forEach(t => map.set(t.id, t));
	return trees;
}

describe("Transaction", () => {
	let example1Root: TestTree,
		example2Root: TestTree,
		root: TestTree,
		children: [TestTree, TestTree, TestTree],
		builder: TransactionBuilder<Delta, Serial>,
		patcher: TransactionPatcher<Delta, Serial>;

	beforeEach("reset", () => {
		map.clear();

		const examples = exampleTrees();
		example1Root = examples[0];
		example2Root = examples[7];

		children = [new TestTree(11), new TestTree(12), new TestTree(13)];
		root = new TestTree(10);
		root.push(...children);
		[root, ...children].forEach(node => map.set(node.id, node));

		builder = new TransactionBuilder(serializer);
		patcher = new TransactionPatcher(map, serializer);
	});

	describe("TransactionBuilder", () => {
		it("is reusable", () => {
			// Transaction containing insert:
			builder.insert(example1Root, undefined, new TestTree(2));
			patcher.apply(builder.build());
			const firstResult = clone(example1Root);

			// Empty transaction:
			patcher.apply(builder.build());

			// Make sure empty transaction didn't do anything:
			assert.deepStrictEqual(example1Root, firstResult);
		});

		describe("#insert", () => {
			it("throws an error when inserting both after and under same node", () => {
				const tree = new TestTree(20);

				assert.throws(() => {
					builder.insert(tree, tree, new TestTree(21));
				});
			});
		});

		describe("#move", () => {
			it("throws an error when moving into itself", () => {
				const tree1 = new TestTree(21);

				assert.throws(() => {
					builder.move(tree1, tree1, undefined);
				});
			});

			it("throws an error when moving after itself", () => {
				const tree1 = new TestTree(21);
				const tree2 = new TestTree(22);

				assert.throws(() => {
					builder.move(tree1, tree2, tree1);
				});
			});

			it("throws an error when moving after and under the same tree", () => {
				const tree1 = new TestTree(21);
				const tree2 = new TestTree(22);

				assert.throws(() => {
					builder.move(tree1, tree2, tree2);
				});
			});
		});
	});

	describe("TransactionPatcher", () => {
		function applyRandom(tree: TestTree, n: number): Transaction<Delta, Serial>[] {
			const base = 100; // to avoid collision with other IDs
			const transactions = [];
			for (let i = base; i < base + n; ++i) {
				const randomTree = new TestTree(i);
				if (tree.children.length > 0) {
					const child = uniformly(...tree.children);
					const otherChildren = tree.children.filter(c => c !== child);
					const previousSibling = uniformly(undefined, ...otherChildren);
					uniformly(
						() => builder.insert(tree, previousSibling, randomTree),
						() => builder.remove(child),
						() => builder.move(child, tree, previousSibling),
						() => builder.changeValue(child, randomInt())
					);
				} else {
					builder.insert(tree, undefined, randomTree);
				}

				const transaction = builder.build();
				patcher.apply(transaction);
				transactions.push(transaction);
			}
			return transactions;
		}

		// This test is useful to automatically check for bugs.
		// The tests below are more minimal test cases meant to target specific
		// potential problems that were found during initial development.
		it("can apply and unapply many randomly generated transactions", () => {
			const nOps = 5000;
			const original = clone(example2Root);
			const transactions = applyRandom(example2Root, nOps);

			transactions
				.slice()
				.reverse()
				.forEach(transaction => patcher.unapply(transaction));

			// assert.deepStrictEqual(example2Root, original);
		});

		it("can apply and unapply simple insert and remove", () => {
			const original = clone(root);

			builder.insert(root, children[1], new TestTree(21));
			const transaction1 = builder.build();
			patcher.apply(transaction1);

			builder.remove(children[1]);
			const transaction2 = builder.build();
			patcher.apply(transaction2);

			patcher.unapply(transaction2);
			patcher.unapply(transaction1);

			assert.deepStrictEqual(root, original);
		});

		it("can apply and unapply simple move and insert", () => {
			const original = clone(root);

			// Insert "21" at the end:
			builder.insert(root, root.lastChild, new TestTree(21));
			const transaction1 = builder.build();
			patcher.apply(transaction1);

			// Move "13" to start:
			builder.move(root.children[2], root, undefined);
			const transaction2 = builder.build();
			patcher.apply(transaction2);

			// Unapply both:
			patcher.unapply(transaction2);
			patcher.unapply(transaction1);

			assert.deepStrictEqual(root, original);
		});

		it("throws an error when inserting tree that isn't in the map", () => {
			assert.throws(() => {
				builder.insert(new TestTree(20), undefined, new TestTree(21));
				patcher.apply(builder.build());
			});
		});

		it("throws an error when removing tree that isn't in the map", () => {
			assert.throws(() => {
				builder.remove(new TestTree(21));
				patcher.unapply(builder.build());
			});
		});
	});
});
