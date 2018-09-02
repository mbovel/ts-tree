import { Tree } from "../Tree";
import { DeltaCalculator } from "./DeltaCalculator";
import { Operation, Transaction } from "./Transaction";
import { Indexer } from "./Indexer";

type StagedChange<Value, Delta> = Readonly<{
	type: 'insert',
	parent: Tree<Value>,
	previousSibling?: Tree<Value>,
	value: Value
} | {
	type: 'remove',
	tree: Tree<Value>
} | {
	type: 'move',
	tree: Tree<Value>,
	newParent: Tree<Value>,
	newPreviousSibling?: Tree<Value>
} | {
	type: 'change_value',
	tree: Tree<Value>,
	newValue: Value
}>;

export class TransactionBuilder<Id, Value, Delta> {
	private staged: StagedChange<Value, Delta>[] = [];

	constructor(
		private readonly deltaCalculator: DeltaCalculator<Value, Delta>,
		private readonly indexer: Indexer<Value, Id>
	) {}

	insert(parent: Tree<Value>, previousSibling: Tree<Value> | undefined, value: Value): void {
		if (parent === previousSibling) {
			throw Error('Parent and previousSibling must be distinct');
		}
		this.staged.push({ type: "insert", parent, previousSibling, value });
	}

	remove(tree: Tree<Value>): void {
		this.staged.push({ type: "remove", tree });
	}

	move(tree: Tree<Value>, newParent: Tree<Value>, newPreviousSibling: Tree<Value> | undefined): void {
		if (tree === newParent || newParent === newPreviousSibling || newPreviousSibling === tree) {
			throw Error('Tree, newParent and newPreviousSibling must be distinct');
		}
		this.staged.push({ type: "move", tree, newParent, newPreviousSibling });
	}

	changeValue(tree: Tree<Value>, newValue: Value): void {
		this.staged.push({ type: "change_value", tree, newValue });
	}

	commit(): Transaction<Id, Value, Delta> {
		const transaction = this.staged.map(change => this.convert(change));
		this.staged = [];
		return transaction;
	}

	private convert(op: StagedChange<Value, Delta>): Operation<Id, Value, Delta> {
		const optionalId = (tree: Tree<Value> | undefined): Id | undefined => tree ? this.indexer.index(tree) : undefined;
		switch (op.type) {
			case "insert":
				return {
					type: 'insert',
					tree: this.indexer.index(new Tree(op.value)),
					parent: this.indexer.index(op.parent),
					previousSibling: optionalId(op.previousSibling)
				};
			case "remove": {
				if (!op.tree.parent) throw Error("Cannot remove root");
				return {
					type: 'remove',
					tree: this.indexer.index(op.tree),
					parent: this.indexer.index(op.tree.parent),
					previousSibling: optionalId(op.tree.previousSibling)
				};
			}
			case "move": {
				if (!op.tree.parent) throw Error("Cannot move root");
				return {
					type: 'move',
					tree: this.indexer.index(op.tree),
					parent: this.indexer.index(op.tree.parent),
					previousSibling: optionalId(op.tree.previousSibling),
					newParent: this.indexer.index(op.newParent),
					newPreviousSibling: optionalId(op.newPreviousSibling)
				};
			}
			case "change_value":
				return {
					type: "change_value",
					tree: this.indexer.index(op.tree),
					delta: this.deltaCalculator.diff(op.tree.value, op.newValue)
				};
		}
	}
}
