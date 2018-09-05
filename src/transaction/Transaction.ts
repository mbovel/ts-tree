export type Id = string | number;
export type Operation<Delta, Serial> =
	| {
			readonly type: "insert" | "remove";
			readonly serialized: Serial;
			readonly parent: Id;
			readonly previousSibling?: Id;
	  }
	| {
			readonly type: "move";
			readonly tree: Id;
			readonly parent: Id;
			readonly previousSibling?: Id;
			readonly newParent: Id;
			readonly newPreviousSibling?: Id;
	  }
	| {
			readonly type: "patch" | "unpatch";
			readonly tree: Id;
			readonly delta: Delta;
	  };

export type Transaction<Delta, Serial> = ReadonlyArray<Operation<Delta, Serial>>;
