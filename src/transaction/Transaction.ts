export type Operation<Id, Value, Delta> = Readonly<
	| {
			type: "insert" | "remove";
			tree: Id;
			value: Value;
			parent: Id;
			previousSibling?: Id;
	  }
	| {
			type: "move";
			tree: Id;
			parent: Id;
			previousSibling?: Id;
			newParent: Id;
			newPreviousSibling?: Id;
	  }
	| {
			type: "change_value";
			tree: Id;
			delta: Delta;
	  }
>;

export type Transaction<Id, Value, Delta> = ReadonlyArray<Operation<Id, Value, Delta>>;
