import { Tree } from "../Tree";
import { DeltaCalculator } from "./DeltaCalculator";
import { Operation, Transaction } from "./Transaction";
import { Bijection } from "./Bijection";

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
		private readonly bijection: Bijection<Tree<Value>, Id> = new Bijection(),
		private readonly generateId: () => Id
	) {
		if (this.bijection.size === 0) {
			throw Error('Bijection should not be empty; it must at least contain root');
		}
	}

	insert(parent: Tree<Value>, previousSibling: Tree<Value> | undefined, value: Value): void {
		if (parent === previousSibling) {
			throw Error('Parent and previousSibling must be distinct');
		}
		// TODO recursively push children
		this.staged.push({ type: "insert", parent, previousSibling, value });
	}

	remove(tree: Tree<Value>): void {
		// TODO recursively push children
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
		const getId = (tree: Tree<Value>): Id => {
			const id = this.bijection.aToB.get(tree);
			if (!id) throw Error('Could not find tree');
			return id;
		};

		const positionalIds = (parent: Tree<Value>, previousSibling: Tree<Value> | undefined): [Id, Id?] => {
			return [getId(parent), previousSibling ? getId(previousSibling) : undefined];
		};

		switch (op.type) {
			case "insert": {
				const tree = new Tree(op.value);
				const id = this.generateId();
				this.bijection.set(tree, id);
				const [parent, previousSibling] = positionalIds(op.parent, op.previousSibling);
				return {
					type: 'insert',
					tree: id,
					value: op.value,
					parent,
					previousSibling
				};
			}
			case "remove": {
				if (!op.tree.parent) throw Error("Cannot remove root");
				const [parent, previousSibling] = positionalIds(op.tree.parent, op.tree.previousSibling);
				return {
					type: 'remove',
					tree: getId(op.tree),
					value: op.tree.value,
					parent,
					previousSibling
				};
			}
			case "move": {
				if (!op.tree.parent) throw Error("Cannot move root");
				const [parent, previousSibling] = positionalIds(op.tree.parent, op.tree.previousSibling);
				const [newParent, newPreviousSibling] = positionalIds(op.newParent, op.newPreviousSibling);
				return {
					type: 'move',
					tree: getId(op.tree),
					parent,
					previousSibling,
					newParent,
					newPreviousSibling,
				};
			}
			case "change_value":
				return {
					type: "change_value",
					tree: getId(op.tree),
					delta: this.deltaCalculator.diff(op.tree.value, op.newValue)
				};
		}
	}
}
