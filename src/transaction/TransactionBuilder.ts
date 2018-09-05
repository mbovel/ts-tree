import { Operation, Transaction } from "./Transaction";
import { Serializer, TransactionableTree } from "./TransactionableTree";

type StagedChange<
	Delta,
	Serial,
	// This is just a shorthand, not meant to be set manually:
	Tree extends TransactionableTree<Delta, Serial> = TransactionableTree<Delta, Serial>
> = Readonly<
	| {
			type: "insert";
			parent: Tree;
			previousSibling?: Tree;
			tree: Tree;
	  }
	| {
			type: "remove";
			tree: Tree;
	  }
	| {
			type: "move"; // TODO optimize 2 moves into one
			tree: Tree;
			newParent: Tree;
			newPreviousSibling?: Tree;
	  }
	| {
			type: "patch";
			tree: Tree;
			delta: Delta;
	  }
>;

export class TransactionBuilder<Delta, Serial> {
	private staged: StagedChange<Delta, Serial>[] = [];

	constructor(
		private readonly serializer: Serializer<Serial, TransactionableTree<Delta, Serial>>
	) {}

	insert(
		parent: TransactionableTree<Delta, Serial>,
		previousSibling: TransactionableTree<Delta, Serial> | undefined,
		tree: TransactionableTree<Delta, Serial>
	): void {
		if (parent === previousSibling) {
			throw Error("Parent and previousSibling must be distinct");
		}

		this.staged.push({ type: "insert", parent, previousSibling, tree });
	}

	remove(tree: TransactionableTree<Delta, Serial>): void {
		this.staged.push({ type: "remove", tree });
	}

	move(
		tree: TransactionableTree<Delta, Serial>,
		newParent: TransactionableTree<Delta, Serial>,
		newPreviousSibling: TransactionableTree<Delta, Serial> | undefined
	): void {
		if (tree === newParent || newParent === newPreviousSibling || newPreviousSibling === tree) {
			throw Error("Tree, newParent and newPreviousSibling must be distinct");
		}

		this.staged.push({ type: "move", tree, newParent, newPreviousSibling });
	}

	changeValue(tree: TransactionableTree<Delta, Serial>, delta: Delta): void {
		this.staged.push({ type: "patch", tree, delta });
	}

	build(): Transaction<Delta, Serial> {
		const transaction = this.staged.map(change => this.convert(change));
		this.staged = [];
		return transaction;
	}

	private convert(op: StagedChange<Delta, Serial>): Operation<Delta, Serial> {
		switch (op.type) {
			case "insert": {
				const previous = op.tree.previousSibling;
				return {
					type: "insert",
					serialized: this.serializer.serialize(op.tree),
					parent: op.parent.id,
					previousSibling: previous ? previous.id : undefined
				};
			}
			case "remove": {
				if (!op.tree.parent) throw Error("Cannot move root");
				const previous = op.tree.previousSibling;
				return {
					type: "remove",
					serialized: this.serializer.serialize(op.tree),
					parent: op.tree.parent.id,
					previousSibling: previous ? previous.id : undefined
				};
			}
			case "move": {
				if (!op.tree.parent) throw Error("Cannot move root");
				const previous = op.tree.previousSibling;
				const newPrevious = op.newPreviousSibling;
				return {
					type: "move",
					tree: op.tree.id,
					parent: op.tree.parent.id,
					previousSibling: previous ? previous.id : undefined,
					newParent: op.newParent.id,
					newPreviousSibling: newPrevious ? newPrevious.id : undefined
				};
			}
			case "patch":
				return {
					type: "patch",
					tree: op.tree.id,
					delta: op.delta
				};
		}
	}
}
