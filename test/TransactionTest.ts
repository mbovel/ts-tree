import * as assert from "assert";
import { Tree } from "../src/Tree";
import { DeltaCalculator } from "../src/transaction/DeltaCalculator";
import { TransactionBuilder } from "../src/transaction/TransactionBuilder";
import { TransactionPatcher } from "../src/transaction/TransactionPatcher";
import { exampleTrees, randomInt, uid, uniformly } from "./utils";
import { Transaction } from "../src/transaction/Transaction";
import { Bijection } from "../src/transaction/Bijection";

type TestTransaction = Transaction<string, number, number>;

const delta: DeltaCalculator<number, number> = {
	diff(a: number, b: number): number {
		return a - b;
	},
	patch(a: number, d: number): number {
		return a + d;
	},
	reverse(delta: number): number {
		return -delta;
	}
};

describe("Transaction", () => {
	const bijection = new Bijection<Tree<number>, string>();

	function register(tree: Tree<number>) {
		for (const node of [tree, ...tree.descendants()]) {
			bijection.set(node, uid());
		}
	}

	let exampleRoot: Tree<number>,
		root: Tree<number>,
		children: [Tree<number>, Tree<number>, Tree<number>],
		builder: TransactionBuilder<string, number, number>,
		patcher: TransactionPatcher<string, number, number>;

	beforeEach("reset", () => {
		bijection.clear();

		exampleRoot = exampleTrees()[0];
		register(exampleRoot);

		children = [new Tree(11), new Tree(12), new Tree(13)];
		root = new Tree(10, children);
		register(root);

		builder = new TransactionBuilder(delta, bijection, uid);
		patcher = new TransactionPatcher(delta, bijection);
	});

	// These tests are just to verify that the constraints are indeed being respected.
	describe("DeltaCalculator", () => {
		const n = 100;
		it("holds for identity patch(b, diff(a, b)) === a", () => {
			for (let i = 0; i < n; ++i) {
				const a = randomInt();
				const b = randomInt();
				assert.strictEqual(delta.patch(b, delta.diff(a, b)), a);
			}
		});

		it("holds for identity patch(a, reverse(diff(a, b)) === b", () => {
			for (let i = 0; i < n; ++i) {
				const a = randomInt();
				const b = randomInt();
				assert.strictEqual(delta.patch(a, delta.reverse(delta.diff(a, b))), b);
			}
		});

		it("holds for identity reverse(reverse(d)) === d", () => {
			for (let i = 0; i < n; ++i) {
				const d = randomInt();
				assert.strictEqual(delta.reverse(delta.reverse(d)), d);
			}
		});
	});

	describe("TransactionBuilder", () => {
		it("is reusable", () => {
			// Transaction containing insert:
			builder.insert(exampleRoot, undefined, 2);
			patcher.apply(builder.commit());
			const firstResult = exampleRoot.clone();

			// Empty transaction:
			patcher.apply(builder.commit());

			// Make sure empty transaction didn't do anything:
			assert.deepStrictEqual(exampleRoot, firstResult);
		});

		describe("#insert", () => {
			it("throws an error when inserting both after and under same node", () => {
				const tree = new Tree(1);
				assert.throws(() => {
					builder.insert(tree, tree, 1);
				});
			});
		});

		describe("#remove", () => {
			it("throws an error when removing", () => {
				// TODO
			});
		});
	});

	describe("TransactionPatcher", () => {
		function applyRandom(tree: Tree<number>, nOps: number): TestTransaction[] {
			const transactions = [];
			for (let i = 0; i < nOps; ++i) {
				if (tree.children.length > 0) {
					const child = uniformly<Tree<number>>(...tree.children);
					const otherChildren = tree.children.filter(c => c !== child);
					const previousSibling = uniformly(undefined, ...otherChildren);
					uniformly(
						() => builder.insert(tree, previousSibling, randomInt()),
						() => builder.remove(child),
						() => builder.move(child, tree, previousSibling),
						() => builder.changeValue(child, randomInt())
					);
				} else {
					builder.insert(tree, undefined, randomInt());
				}

				const transaction = builder.commit();
				transactions.push(transaction);
				patcher.apply(transaction);
			}
			return transactions;
		}

		// This test is useful to automatically check for bugs.
		// The tests below are more minimal test cases meant to target specific
		// potential problems that were found during initial development.
		it("can apply and unapply many randomly generated transactions", () => {
			const original = exampleRoot.clone();
			const transactions = applyRandom(exampleRoot, 1000);
			transactions
				.slice()
				.reverse()
				.forEach(transaction => patcher.unapply(transaction));
			assert.deepStrictEqual(exampleRoot, original);
		});

		it("can apply and unapply simple insert and remove", () => {
			const original = root.clone();

			builder.insert(root, children[1], 3);
			const transaction1 = builder.commit();
			patcher.apply(transaction1);

			builder.remove(children[1]);
			const transaction2 = builder.commit();
			patcher.apply(transaction2);

			patcher.unapply(transaction2);
			patcher.unapply(transaction1);

			assert.deepStrictEqual(root, original);
		});

		it("can apply and unapply simple move and insert", () => {
			const original = root.clone();

			// Insert "4" at the end:
			builder.insert(root, root.lastChild, 14);
			const transaction1 = builder.commit();
			patcher.apply(transaction1);

			// Move "3" to start:
			builder.move(root.children[2], root, undefined);
			const transaction2 = builder.commit();
			patcher.apply(transaction2);

			// Unapply both:
			patcher.unapply(transaction2);
			patcher.unapply(transaction1);

			assert.deepStrictEqual(root, original);
		});
	});
});
