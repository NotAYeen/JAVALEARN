(function() {
	var e = class extends Error {
		constructor(e, t = 0, s = 0) {
			super(e), this.name = "JavaCompileError", this.line = t, this.col = s;
		}
		format() {
			return this.line > 0 ? `${this.message} (línea ${this.line}, columna ${this.col})` : this.message;
		}
	}, t = class extends Error {
		constructor(e) {
			super("[java] excepción en vuelo"), this.name = "JavaThrow", this.javaObject = e;
		}
	}, s = class extends Error {
		constructor(e) {
			super(`Límite de pasos superado (${e.toLocaleString("es-ES")}). Posible bucle infinito.`), this.name = "StepLimitError", this.limit = e;
		}
	}, n = class extends Error {
		constructor(e) {
			super(e), this.name = "EngineError";
		}
	};
	const i = /* @__PURE__ */ new Set([
		"abstract",
		"assert",
		"boolean",
		"break",
		"byte",
		"case",
		"catch",
		"char",
		"class",
		"const",
		"continue",
		"default",
		"do",
		"double",
		"else",
		"enum",
		"extends",
		"final",
		"finally",
		"float",
		"for",
		"goto",
		"if",
		"implements",
		"import",
		"instanceof",
		"int",
		"interface",
		"long",
		"native",
		"new",
		"package",
		"private",
		"protected",
		"public",
		"return",
		"short",
		"static",
		"strictfp",
		"super",
		"switch",
		"synchronized",
		"this",
		"throw",
		"throws",
		"transient",
		"try",
		"void",
		"volatile",
		"while",
		"var",
		"record",
		"sealed",
		"permits",
		"yield",
		"true",
		"false",
		"null"
	]), r = /* @__PURE__ */ new Set([
		"boolean",
		"byte",
		"short",
		"int",
		"long",
		"char",
		"float",
		"double",
		"void"
	]);
	function a(e) {
		return r.has(e);
	}
	const o = (e) => /[0-9A-Za-z_$¡-￿]/.test(e), l = (e) => e >= "0" && e <= "9", c = [
		">>>=",
		"<<=",
		">>=",
		">>>",
		"...",
		"->",
		"::",
		"++",
		"--",
		"&&",
		"||",
		"==",
		"!=",
		"<=",
		">=",
		"+=",
		"-=",
		"*=",
		"/=",
		"%=",
		"&=",
		"|=",
		"^=",
		"<<",
		">>",
		"(",
		")",
		"{",
		"}",
		"[",
		"]",
		";",
		",",
		".",
		"=",
		">",
		"<",
		"!",
		"~",
		"?",
		":",
		"+",
		"-",
		"*",
		"/",
		"&",
		"|",
		"^",
		"%",
		"@"
	];
	var h = class {
		constructor(e) {
			this.src = String(null == e ? "" : e), this.i = 0, this.line = 1, this.col = 1;
		}
		error(t) {
			throw new e(t, this.line, this.col);
		}
		peek(e = 0) {
			return this.src[this.i + e];
		}
		advance() {
			const e = this.src[this.i++];
			return "\n" === e ? (this.line++, this.col = 1) : this.col++, e;
		}
		skipTrivia() {
			for (;;) {
				const t = this.peek();
				if (void 0 === t) return;
				if (" " !== t && "	" !== t && "\r" !== t && "\n" !== t && "\f" !== t) {
					if ("/" !== t || "/" !== this.peek(1)) {
						if ("/" === t && "*" === this.peek(1)) {
							const t = this.line;
							for (this.advance(), this.advance();;) {
								if (void 0 === this.peek()) throw new e("unclosed comment", t, 1);
								if ("*" === this.peek() && "/" === this.peek(1)) {
									this.advance(), this.advance();
									break;
								}
								this.advance();
							}
							continue;
						}
						return;
					}
					for (; void 0 !== this.peek() && "\n" !== this.peek();) this.advance();
				} else this.advance();
			}
		}
		readEscape(t) {
			const s = this.advance();
			switch (s) {
				case "n": return "\n";
				case "t": return "	";
				case "r": return "\r";
				case "b": return "\b";
				case "f": return "\f";
				case "s": return " ";
				case "0": return "\0";
				case "\\": return "\\";
				case "'": return "'";
				case "\"": return "\"";
				case "u": {
					let t = "";
					for (let s = 0; s < 4; s++) {
						const s = this.advance();
						if (!/[0-9a-fA-F]/.test(s)) throw new e("illegal unicode escape", this.line, this.col);
						t += s;
					}
					return String.fromCharCode(parseInt(t, 16));
				}
				case "\n": return "";
				default: return s;
			}
		}
		readString() {
			const t = this.line;
			this.advance();
			let s = "";
			for (;;) {
				const n = this.peek();
				if (void 0 === n || "\n" === n) throw new e("unclosed string literal", t, 1);
				if (this.advance(), "\"" === n) return s;
				s += "\\" === n ? this.readEscape(t) : n;
			}
		}
		readTextBlock() {
			const t = this.line;
			this.advance(), this.advance(), this.advance(), "\r" === this.peek() && this.advance(), "\n" === this.peek() && this.advance();
			const s = [];
			let n = "";
			for (;;) {
				if (void 0 === this.peek()) throw new e("unclosed text block", t, 1);
				if ("\"" === this.peek() && "\"" === this.peek(1) && "\"" === this.peek(2)) {
					let e = this.i - 1;
					for (; e >= 0 && "\n" !== this.src[e];) e--;
					n = this.src.slice(e + 1, this.i).replace(/[^\s]/g, ""), this.advance(), this.advance(), this.advance();
					break;
				}
				"\\" !== this.peek() ? s.push(this.advance()) : (this.advance(), s.push(this.readEscape(t)));
			}
			for (; s.length && "" === s[s.length - 1];) s.pop();
			return s.join("\n").split("\n").map((e) => e.replace(/[ \t]+$/, "")).map((e) => n && e.startsWith(n) ? e.slice(n.length) : e).join("\n");
		}
		readChar() {
			const t = this.line;
			this.advance();
			const s = this.peek();
			if (void 0 === s || "\n" === s) throw new e("unclosed character literal", t, 1);
			let n;
			if ("\\" === s ? (this.advance(), n = this.readEscape(t)) : n = this.advance(), "'" !== this.peek()) throw new e("unclosed character literal", t, this.col);
			return this.advance(), n.charCodeAt(0);
		}
		readNumber() {
			const t = this.line, s = this.col, n = this.i;
			let i = !1, r = 10;
			if ("0" !== this.peek() || "x" !== this.peek(1) && "X" !== this.peek(1)) if ("0" !== this.peek() || "b" !== this.peek(1) && "B" !== this.peek(1)) {
				for (; void 0 !== this.peek() && /[0-9_]/.test(this.peek());) this.advance();
				if ("." === this.peek() && l(this.peek(1) || "")) for (i = !0, this.advance(); void 0 !== this.peek() && /[0-9_]/.test(this.peek());) this.advance();
				if ("e" === this.peek() || "E" === this.peek()) {
					const e = this.i, t = this.col;
					if (this.advance(), "+" !== this.peek() && "-" !== this.peek() || this.advance(), l(this.peek() || "")) for (i = !0; void 0 !== this.peek() && l(this.peek());) this.advance();
					else this.i = e, this.col = t;
				}
			} else for (this.advance(), this.advance(), r = 2; void 0 !== this.peek() && /[01_]/.test(this.peek());) this.advance();
			else for (this.advance(), this.advance(), r = 16; void 0 !== this.peek() && /[0-9a-fA-F_]/.test(this.peek());) this.advance();
			const a = this.i, o = this.peek();
			let c = i ? "double" : "int";
			"l" === o || "L" === o ? (this.advance(), c = "long") : "f" === o || "F" === o ? (this.advance(), i = !0, c = "float") : "d" !== o && "D" !== o || (this.advance(), i = !0, c = "double");
			const h = this.src.slice(n, a).replace(/_/g, "");
			let p;
			if (p = i ? Number(h) : 16 === r ? parseInt(h.slice(2), 16) : 2 === r ? parseInt(h.slice(2), 2) : /^0[0-7]+$/.test(h) ? parseInt(h, 8) : Number(h), Number.isNaN(p) && !i) throw new e("malformed floating point literal", t, s);
			return {
				type: "number",
				value: p,
				subtype: c,
				line: t,
				col: s
			};
		}
		next() {
			this.skipTrivia();
			const e = this.line, t = this.col, s = this.peek();
			if (void 0 === s) return {
				type: "eof",
				value: null,
				line: e,
				col: t
			};
			if (((e) => /[A-Za-z_$¡-￿]/.test(e))(s)) {
				const s = this.i;
				for (; void 0 !== this.peek() && o(this.peek());) this.advance();
				const n = this.src.slice(s, this.i);
				return i.has(n) ? {
					type: "keyword",
					value: n,
					line: e,
					col: t
				} : {
					type: "ident",
					value: n,
					line: e,
					col: t
				};
			}
			if (l(s) || "." === s && l(this.peek(1) || "")) return this.readNumber();
			if ("\"" === s) return "\"" === this.peek(1) && "\"" === this.peek(2) ? {
				type: "textblock",
				value: this.readTextBlock(),
				line: e,
				col: t
			} : {
				type: "string",
				value: this.readString(),
				line: e,
				col: t
			};
			if ("'" === s) return {
				type: "char",
				value: this.readChar(),
				line: e,
				col: t
			};
			for (const n of c) if (this.src.startsWith(n, this.i)) {
				for (let e = 0; e < n.length; e++) this.advance();
				return {
					type: "op",
					value: n,
					line: e,
					col: t
				};
			}
			return this.error(`illegal character: '${s}'`), null;
		}
		tokenize() {
			const e = [];
			for (;;) {
				const t = this.next();
				if (e.push(t), "eof" === t.type) break;
			}
			return e;
		}
	};
	const p = /* @__PURE__ */ new Set([
		"public",
		"private",
		"protected",
		"static",
		"final",
		"abstract",
		"synchronized",
		"native",
		"transient",
		"volatile",
		"strictfp",
		"default"
	]), u = /* @__PURE__ */ new Set([
		"=",
		"+=",
		"-=",
		"*=",
		"/=",
		"%=",
		"&=",
		"|=",
		"^=",
		"<<=",
		">>=",
		">>>="
	]), f = /* @__PURE__ */ new Set([
		"String",
		"Object",
		"Integer",
		"Long",
		"Double",
		"Float",
		"Short",
		"Byte",
		"Character",
		"Boolean",
		"Number",
		"Math",
		"System",
		"StringBuilder",
		"CharSequence",
		"Class",
		"Exception",
		"RuntimeException",
		"IllegalArgumentException",
		"IllegalStateException",
		"NullPointerException",
		"ArithmeticException",
		"NumberFormatException",
		"IndexOutOfBoundsException",
		"ArrayIndexOutOfBoundsException",
		"StringIndexOutOfBoundsException",
		"ClassCastException",
		"UnsupportedOperationException",
		"List",
		"ArrayList",
		"LinkedList",
		"Map",
		"HashMap",
		"LinkedHashMap",
		"TreeMap",
		"Set",
		"HashSet",
		"LinkedHashSet",
		"TreeSet",
		"Collection",
		"Collections",
		"Arrays",
		"Objects",
		"Comparator",
		"Optional",
		"Stream",
		"IntStream",
		"LongStream",
		"DoubleStream",
		"Iterable",
		"Iterator",
		"Function",
		"Predicate",
		"Consumer",
		"Supplier",
		"BiFunction",
		"UnaryOperator",
		"BinaryOperator",
		"Runnable",
		"Entry",
		"Thread",
		"Runnable",
		"StringJoiner",
		"Scanner"
	]), d = /* @__PURE__ */ new Set([
		"java",
		"javax",
		"sun",
		"jdk",
		"com",
		"org",
		"net",
		"io",
		"edu"
	]);
	var m = class {
		constructor(e) {
			this.tokens = function(e) {
				return new h(e).tokenize();
			}(e), this.pos = 0;
		}
		peek(e = 0) {
			return this.tokens[Math.min(this.pos + e, this.tokens.length - 1)];
		}
		next() {
			const e = this.tokens[this.pos];
			return this.pos < this.tokens.length - 1 && this.pos++, e;
		}
		at(e, t) {
			const s = this.peek();
			return s.type === e && (void 0 === t || s.value === t);
		}
		atKw(...e) {
			const t = this.peek();
			return "keyword" === t.type && e.includes(t.value);
		}
		atOp(...e) {
			const t = this.peek();
			return "op" === t.type && e.includes(t.value);
		}
		eat(e, t) {
			return this.at(e, t) ? this.next() : null;
		}
		eatKw(...e) {
			return this.atKw(...e) ? this.next() : null;
		}
		eatOp(...e) {
			return this.atOp(...e) ? this.next() : null;
		}
		expect(t, s, n) {
			if (this.at(t, s)) return this.next();
			const i = this.peek(), r = "eof" === i.type ? "end of file" : `"${i.value}"`;
			throw new e(`${n || `expected '${s}'`}, found ${r}`, i.line, i.col);
		}
		expectKw(t) {
			if (this.atKw(t)) return this.next();
			const s = this.peek();
			throw new e(`expected '${t}', found ${"eof" === s.type ? "end of file" : `"${s.value}"`}`, s.line, s.col);
		}
		expectOp(t) {
			if (this.atOp(t)) return this.next();
			const s = this.peek();
			throw "eof" === s.type || s.value, new e(`'${t}' expected`, s.line, s.col);
		}
		state() {
			return {
				pos: this.pos,
				tokens: this.tokens.slice(this.pos)
			};
		}
		restore(e) {
			this.pos = e.pos, this.tokens.splice(this.pos, this.tokens.length, ...e.tokens);
		}
		splitGt() {
			const e = this.peek();
			"op" === e.type && e.value.length > 1 && /^>+=?$/.test(e.value) && (e.value = e.value.slice(1), this.tokens.splice(this.pos, 0, {
				type: "op",
				value: ">",
				line: e.line,
				col: e.col + 1
			}));
		}
		isTypeNameToken(e) {
			return !!e && (!("keyword" !== e.type || !a(e.value)) || "ident" === e.type && (f.has(e.value) || /^[A-Z]/.test(e.value) || d.has(e.value)));
		}
		parseTypeName() {
			let e = this.expect("ident", void 0, "expected type name").value;
			for (; this.atOp(".") && "ident" === this.peek(1).type && this.continuesTypeName(e, this.peek(1).value);) this.next(), e += "." + this.next().value;
			return e;
		}
		continuesTypeName(e, t) {
			if (/^[A-Z]/.test(t)) return !0;
			const s = e.split(".")[0];
			return d.has(s);
		}
		parseTypeArgs() {
			if (!this.atOp("<")) return [];
			this.next();
			const t = [];
			if (this.atOp(">")) return this.splitGt(), this.next(), t;
			for (;;) {
				if (t.push(this.parseTypeRef(!1)), this.eatOp(",")) continue;
				if (this.atOp(">")) {
					this.splitGt(), this.next();
					break;
				}
				if (this.atOp(">>") || this.atOp(">>>") || this.atOp(">=")) {
					this.splitGt(), this.next();
					break;
				}
				const s = this.peek();
				throw new e("expected '>' to close type arguments", s.line, s.col);
			}
			return t;
		}
		parseTypeRef(t = !0) {
			const s = this.peek();
			if (t && this.atKw("var") && "ident" === this.peek(1).type) return this.next(), {
				name: "var",
				args: [],
				dims: 0,
				isVar: !0,
				line: s.line,
				col: s.col
			};
			if (this.atKw("var") && t && "ident" === this.peek(1).type) return this.parseTypeRef(!1);
			if (!this.isTypeNameToken(this.peek())) {
				const t = this.peek();
				throw new e("expected type, found " + ("eof" === t.type ? "end of file" : `"${t.value}"`), t.line, t.col);
			}
			this.peek().type, this.next();
			let n = this.tokens[this.pos - 1].value;
			for (; this.atOp(".") && "ident" === this.peek(1).type && this.continuesTypeName(n, this.peek(1).value);) this.next(), n += "." + this.next().value;
			const i = this.parseTypeArgs();
			let r = 0;
			for (; this.atOp("[") && "op" === this.peek(1).type && "]" === this.peek(1).value;) this.next(), this.next(), r++;
			return {
				name: n,
				args: i,
				dims: r,
				isVar: !1,
				line: s.line,
				col: s.col
			};
		}
		typeLabel(e) {
			let t = e.name + (e.args && e.args.length ? "<" + e.args.map((e) => this.typeLabel(e)).join(", ") + ">" : "");
			for (let s = 0; s < e.dims; s++) t += "[]";
			return t;
		}
		parseAnnotations() {
			const e = [];
			for (; this.atOp("@");) {
				this.next();
				const t = this.expect("ident", void 0, "expected annotation name").value;
				this.atOp("(") && this.skipBalanced("(", ")"), e.push(t);
			}
			return e;
		}
		skipBalanced(t, s) {
			this.expectOp(t);
			let n = 1;
			for (; n > 0;) {
				if (this.at("eof")) {
					const t = this.peek();
					throw new e(`'${s}' expected`, t.line, t.col);
				}
				this.atOp(t) ? n++ : this.atOp(s) && n--, this.next();
			}
		}
		parseModifiers() {
			this.parseAnnotations();
			const e = [];
			for (;;) {
				const t = this.peek();
				if ("keyword" === t.type && p.has(t.value)) e.push(t.value), this.next();
				else if ("keyword" !== t.type || "sealed" !== t.value) {
					if ("ident" !== t.type || "non" !== t.value || "-" !== this.peek(1).value || "ident" !== this.peek(2).type || "sealed" !== this.peek(2).value) break;
					this.next(), this.next(), this.next(), e.push("non-sealed");
				} else e.push("sealed"), this.next();
			}
			return e;
		}
		parseCompilationUnit() {
			const t = {
				packageName: null,
				imports: [],
				types: []
			};
			for (; this.atKw("package");) this.next(), t.packageName = this.parseTypeName(), this.expectOp(";");
			for (; this.atKw("import");) {
				this.next();
				let e = "";
				this.atOp("*") ? (this.next(), e = "*") : (e = this.parseTypeName(), this.eatOp(".") && (this.next(), e += ".*")), t.imports.push(e), this.expectOp(";");
			}
			for (; !this.at("eof");) {
				const e = this.parseTypeDecl();
				e && t.types.push(e);
			}
			if (0 === t.types.length) {
				const s = this.peek();
				if (this.at("eof") && !t.packageName && 0 === t.imports.length) return t;
				throw new e("class, interface, enum, or record expected", s.line, s.col);
			}
			return t;
		}
		parseTypeDecl() {
			const t = this.peek(), s = this.parseModifiers();
			if (this.atKw("class")) return this.parseClassDecl(s, t, "class");
			if (this.atKw("interface")) return this.parseClassDecl(s, t, "interface");
			if (this.atKw("enum")) return this.parseEnumDecl(s, t);
			if (this.atKw("record") && "ident" === this.peek(1).type) return this.parseRecordDecl(s, t);
			if (this.at("eof")) return null;
			const n = this.peek();
			throw new e(`class, interface, enum, or record expected, found ${"eof" === n.type ? "end of file" : `"${n.value}"`}`, n.line, n.col);
		}
		parseClassDecl(e, t, s) {
			this.next();
			const n = this.expect("ident", void 0, "expected class name").value, i = this.parseTypeParams();
			let r = null;
			const a = [];
			if (this.atKw("extends")) {
				this.next();
				const e = [this.parseTypeRef(!1)];
				for (; this.eatOp(",");) e.push(this.parseTypeRef(!1));
				"interface" === s ? a.push(...e) : r = e[0];
			}
			if (this.atKw("implements")) for (this.next(), a.push(this.parseTypeRef(!1)); this.eatOp(",");) a.push(this.parseTypeRef(!1));
			if (this.atKw("permits")) for (this.next(), this.parseTypeRef(!1); this.eatOp(",");) this.parseTypeRef(!1);
			const o = this.parseBodyWithName(n, s, null);
			return {
				kind: s,
				name: n,
				modifiers: e,
				typeParams: i,
				superName: r,
				interfaces: a,
				fields: o.fields,
				methods: o.methods,
				staticInit: o.staticInit,
				line: t.line,
				col: t.col
			};
		}
		parseBodyWithName(e, t, s) {
			const n = this.currentTypeName;
			this.currentTypeName = e;
			try {
				return this.parseClassBody(t, s);
			} finally {
				this.currentTypeName = n;
			}
		}
		parseMembersWithName(e, t, s) {
			const n = this.currentTypeName;
			this.currentTypeName = e;
			try {
				return this.parseClassBodyMembers(t, s);
			} finally {
				this.currentTypeName = n;
			}
		}
		parseTypeParams() {
			if (!this.atOp("<")) return [];
			this.next();
			const e = [];
			for (;;) {
				this.parseModifiers();
				const t = this.expect("ident", void 0, "expected type parameter").value;
				if (this.atKw("extends")) for (this.next(), this.parseTypeRef(!1); this.eatOp("&");) this.parseTypeRef(!1);
				if (e.push(t), !this.eatOp(",")) {
					if (this.atOp(">")) {
						this.splitGt(), this.next();
						break;
					}
					if (this.atOp(">>") || this.atOp(">>>")) {
						this.splitGt(), this.next();
						break;
					}
					break;
				}
			}
			return e;
		}
		parseRecordDecl(e, t) {
			this.next();
			const s = this.expect("ident", void 0, "expected record name").value, n = this.parseTypeParams();
			this.expectOp("(");
			const i = [];
			if (!this.atOp(")")) for (;;) {
				const e = this.parseTypeRef(!1), t = this.expect("ident", void 0, "expected component name").value;
				if (i.push({
					type: e,
					name: t
				}), !this.eatOp(",")) break;
			}
			this.expectOp(")");
			const r = [];
			if (this.atKw("implements")) for (this.next(), r.push(this.parseTypeRef(!1)); this.eatOp(",");) r.push(this.parseTypeRef(!1));
			const a = this.parseBodyWithName(s, "record", i);
			return {
				kind: "record",
				name: s,
				modifiers: e,
				typeParams: n,
				superName: null,
				interfaces: r,
				components: i,
				fields: a.fields,
				methods: a.methods,
				staticInit: a.staticInit,
				line: t.line,
				col: t.col
			};
		}
		parseEnumDecl(e, t) {
			this.next();
			const s = this.expect("ident", void 0, "expected enum name").value;
			this.expectOp("{");
			const n = [];
			for (; !this.atOp(";") && !this.atOp("}");) {
				const e = this.expect("ident", void 0, "expected enum constant").value;
				let t = [];
				this.atOp("(") && (t = this.parseArguments());
				let s = null;
				if (this.atOp("{") && (s = this.parseBodyWithName(e, "enum", null)), n.push({
					name: e,
					args: t,
					body: s
				}), !this.eatOp(",")) break;
			}
			let i = {
				fields: [],
				methods: [],
				staticInit: []
			};
			return this.eatOp(";") && (i = this.parseMembersWithName(s, "enum", null)), this.expectOp("}"), {
				kind: "enum",
				name: s,
				modifiers: e,
				typeParams: [],
				superName: null,
				interfaces: [],
				enumConstants: n,
				fields: i.fields,
				methods: i.methods,
				staticInit: i.staticInit,
				line: t.line,
				col: t.col
			};
		}
		parseClassBody(e, t) {
			this.expectOp("{");
			const s = this.parseClassBodyMembers(e, t);
			return this.expectOp("}"), s;
		}
		parseClassBodyMembers(e, t) {
			const s = {
				fields: [],
				methods: [],
				staticInit: []
			};
			for (; !this.atOp("}") && !this.at("eof");) this.parseMember(s, e, t);
			return s;
		}
		parseMember(t, s, n) {
			if (this.atOp(";")) return void this.next();
			const i = this.peek(), r = this.parseModifiers();
			if (this.atKw("class") || this.atKw("interface") || this.atKw("enum") || this.atKw("record") && "ident" === this.peek(1).type) {
				const e = this.parseTypeDeclFromMods(r, i);
				t.methods.push({
					isNestedType: !0,
					decl: e,
					modifiers: r,
					name: e.name
				});
				return;
			}
			if (this.atOp("{")) {
				const e = this.parseBlock();
				r.includes("static") ? t.staticInit.push(...e.body) : t.methods.push({
					isInitializer: !0,
					modifiers: r,
					name: "<init-block>",
					body: e.body
				});
				return;
			}
			const a = this.parseTypeParams();
			if ("ident" === this.peek().type && this.peek().value === this.currentTypeName && "(" === this.peek(1).value) {
				this.next();
				const e = this.parseParams(), s = this.parseThrows(), n = this.parseBlock();
				t.methods.push({
					isConstructor: !0,
					modifiers: r,
					name: this.currentTypeName,
					params: e,
					body: n.body,
					throws: s,
					line: i.line,
					col: i.col
				});
				return;
			}
			if ("record" === s && n && "ident" === this.peek().type && this.peek().value === this.currentTypeName && "{" === this.peek(1).value) {
				this.next();
				const e = this.parseBlock();
				t.methods.push({
					isCompactConstructor: !0,
					modifiers: r,
					name: this.currentTypeName,
					params: [],
					body: e.body,
					line: i.line,
					col: i.col
				});
				return;
			}
			let o = null;
			if (this.atKw("void") ? (this.next(), o = {
				name: "void",
				args: [],
				dims: 0,
				isVar: !1,
				line: i.line,
				col: i.col
			}) : o = this.parseTypeRef(!0), "ident" !== this.peek().type) {
				const t = this.peek();
				throw new e(`expected identifier, found ${"eof" === t.type ? "end of file" : `"${t.value}"`}`, t.line, t.col);
			}
			const l = this.next().value;
			if (this.atOp("(")) {
				const e = this.parseParams();
				let n = 0;
				for (; this.atOp("[") && "]" === this.peek(1).value;) this.next(), this.next(), n++;
				const c = this.parseThrows();
				let h = null;
				this.atOp("{") ? h = this.parseBlock().body : "class" !== s && "record" !== s && "enum" !== s || this.expectOp(";"), t.methods.push({
					modifiers: r,
					typeParams: a,
					returnType: this.withDims(o, n),
					name: l,
					params: e,
					throws: c,
					body: h,
					line: i.line,
					col: i.col
				});
				return;
			}
			if (!r.includes("static") && !r.includes("final") && "class" === s && o.isVar) {
				const t = this.peek();
				throw new e("not a statement", t.line, t.col);
			}
			let c = l;
			for (;;) {
				let e = 0;
				for (; this.atOp("[") && "]" === this.peek(1).value;) this.next(), this.next(), e++;
				let s = null;
				if (this.atOp("=") && (this.next(), s = this.parseVariableInitializer()), t.fields.push({
					modifiers: r,
					type: o,
					name: c,
					dims: e,
					init: s,
					line: i.line,
					col: i.col
				}), !this.eatOp(",")) break;
				c = this.expect("ident", void 0, "expected field name").value;
			}
			this.expectOp(";");
		}
		parseTypeDeclFromMods(e, t) {
			return this.atKw("class") ? this.parseClassDecl(e, t, "class") : this.atKw("interface") ? this.parseClassDecl(e, t, "interface") : this.atKw("enum") ? this.parseEnumDecl(e, t) : this.parseRecordDecl(e, t);
		}
		withDims(e, t) {
			return t ? {
				...e,
				dims: e.dims + t
			} : e;
		}
		parseParams() {
			this.expectOp("(");
			const e = [];
			if (!this.atOp(")")) for (;;) {
				const t = this.parseModifiers(), s = this.parseTypeRef(!1);
				if (this.atOp("...")) {
					this.next();
					const n = {
						...s,
						dims: s.dims + 1
					}, i = this.expect("ident", void 0, "expected parameter name").value;
					if (e.push({
						modifiers: t,
						type: n,
						name: i,
						varargs: !0
					}), this.eatOp(",")) continue;
					break;
				}
				const n = this.expect("ident", void 0, "expected parameter name").value;
				let i = 0;
				for (; this.atOp("[") && "]" === this.peek(1).value;) this.next(), this.next(), i++;
				if (e.push({
					modifiers: t,
					type: i ? {
						...s,
						dims: s.dims + i
					} : s,
					name: n,
					varargs: !1
				}), !this.eatOp(",")) break;
			}
			return this.expectOp(")"), e;
		}
		parseThrows() {
			if (!this.atKw("throws")) return [];
			this.next();
			const e = [this.parseTypeRef(!1)];
			for (; this.eatOp(",");) e.push(this.parseTypeRef(!1));
			return e;
		}
		parseBlock() {
			this.expectOp("{");
			const e = [];
			for (; !this.atOp("}") && !this.at("eof");) e.push(this.parseStatement());
			return this.expectOp("}"), {
				type: "Block",
				body: e
			};
		}
		parseStatement() {
			const t = this.peek();
			if (this.atOp("{")) return this.parseBlock();
			if (this.atOp(";")) return this.next(), { type: "Empty" };
			if (this.atKw("if")) return this.parseIf();
			if (this.atKw("while")) return this.parseWhile();
			if (this.atKw("do")) return this.parseDoWhile();
			if (this.atKw("for")) return this.parseFor();
			if (this.atKw("switch")) return this.parseSwitchStatement();
			if (this.atKw("return")) return this.parseReturn();
			if (this.atKw("break") || this.atKw("continue")) return this.parseBreakContinue();
			if (this.atKw("throw")) {
				this.next();
				const e = this.parseExpression();
				return this.expectOp(";"), {
					type: "Throw",
					expr: e,
					line: t.line,
					col: t.col
				};
			}
			if (this.atKw("try")) return this.parseTry();
			if (this.atKw("synchronized") && "(" === this.peek(1).value) {
				this.next(), this.expectOp("(");
				const e = this.parseExpression();
				return this.expectOp(")"), {
					type: "Sync",
					expr: e,
					body: this.parseBlock(),
					line: t.line,
					col: t.col
				};
			}
			if (this.atKw("assert")) {
				this.next();
				const e = this.parseExpression();
				let s = null;
				return this.eatOp(":") && (s = this.parseExpression()), this.expectOp(";"), {
					type: "Assert",
					cond: e,
					msg: s,
					line: t.line,
					col: t.col
				};
			}
			if (this.isLocalTypeDecl()) {
				const e = this.peek(), s = this.parseModifiers();
				return {
					type: "LocalType",
					decl: this.parseTypeDeclFromMods(s, e),
					line: t.line,
					col: t.col
				};
			}
			if ("ident" === t.type && ":" === this.peek(1).value) {
				const e = this.next().value;
				return this.next(), {
					type: "Labeled",
					label: e,
					body: this.parseStatement(),
					line: t.line,
					col: t.col
				};
			}
			if ("keyword" === t.type && a(t.value) && "void" !== t.value && ("." !== this.peek(1).value || "class" !== this.peek(2).value) && !this.looksLikeLocalVarDecl()) throw new e("illegal start of expression", t.line, t.col);
			if (this.looksLikeLocalVarDecl()) {
				const e = this.parseLocalVarDecl();
				return this.expectOp(";"), e;
			}
			if ((this.atKw("super") || this.atKw("this")) && "(" === this.peek(1).value) {
				const e = this.next(), s = this.parseArguments();
				return this.expectOp(";"), {
					type: "ExprStmt",
					expr: {
						type: "MethodCall",
						target: {
							type: "super" === e.value ? "Super" : "This",
							line: e.line,
							col: e.col
						},
						name: "<init>",
						args: s,
						line: e.line,
						col: e.col
					},
					line: t.line,
					col: t.col
				};
			}
			const s = this.parseExpression();
			return this.expectOp(";"), {
				type: "ExprStmt",
				expr: s,
				line: t.line,
				col: t.col
			};
		}
		isLocalTypeDecl() {
			const e = this.state();
			try {
				return this.parseModifiers(), !!(this.atKw("class") || this.atKw("interface") || this.atKw("enum")) || !(!this.atKw("record") || "ident" !== this.peek(1).type);
			} catch (t) {
				return !1;
			} finally {
				this.restore(e);
			}
		}
		looksLikeLocalVarDecl() {
			const e = this.state();
			try {
				return (this.atKw("final") || this.atKw("var")) && (this.parseModifiers(), this.atKw("var")) ? (this.next(), "ident" === this.peek().type) : !!this.isTypeNameToken(this.peek()) && (this.parseTypeRef(!1), "ident" === this.peek().type);
			} catch (t) {
				return !1;
			} finally {
				this.restore(e);
			}
		}
		parseLocalVarDecl() {
			const e = this.peek(), t = this.parseModifiers();
			let s;
			this.atKw("var") ? (this.next(), s = {
				name: "var",
				args: [],
				dims: 0,
				isVar: !0,
				line: e.line,
				col: e.col
			}) : s = this.parseTypeRef(!1);
			const n = [];
			for (;;) {
				const e = this.expect("ident", void 0, "expected variable name").value;
				let i = 0;
				for (; this.atOp("[") && "]" === this.peek(1).value;) this.next(), this.next(), i++;
				let r = null;
				if (this.atOp("=") && (this.next(), r = this.parseVariableInitializer()), n.push({
					name: e,
					type: this.withDims(s, i),
					init: r,
					modifiers: t
				}), !this.eatOp(",")) break;
			}
			return {
				type: "LocalVarDecl",
				modifiers: t,
				decls: n,
				line: e.line,
				col: e.col
			};
		}
		parseVariableInitializer() {
			return this.atOp("{") ? this.parseArrayInitializer() : this.parseExpression();
		}
		parseArrayInitializer() {
			this.expectOp("{");
			const e = [];
			for (; !this.atOp("}") && (e.push(this.parseVariableInitializer()), this.eatOp(",")););
			return this.expectOp("}"), {
				type: "ArrayInit",
				items: e
			};
		}
		parseIf() {
			const e = this.next();
			this.expectOp("(");
			const t = this.parseExpression();
			this.expectOp(")");
			const s = this.parseStatement();
			let n = null;
			return this.atKw("else") && (this.next(), n = this.parseStatement()), {
				type: "If",
				cond: t,
				then: s,
				otherwise: n,
				line: e.line,
				col: e.col
			};
		}
		parseWhile() {
			const e = this.next();
			this.expectOp("(");
			const t = this.parseExpression();
			return this.expectOp(")"), {
				type: "While",
				cond: t,
				body: this.parseStatement(),
				line: e.line,
				col: e.col
			};
		}
		parseDoWhile() {
			const e = this.next(), t = this.parseStatement();
			this.expectKw("while"), this.expectOp("(");
			const s = this.parseExpression();
			return this.expectOp(")"), this.expectOp(";"), {
				type: "DoWhile",
				body: t,
				cond: s,
				line: e.line,
				col: e.col
			};
		}
		parseFor() {
			const e = this.next();
			this.expectOp("(");
			const t = this.state();
			let s = null, n = !1;
			try {
				const e = this.parseModifiers();
				if ("ident" === this.peek().type || this.isTypeNameToken(this.peek())) {
					const t = this.parseTypeRef(!1);
					if ("ident" === this.peek().type && ":" === this.peek(1).value) {
						const i = this.next().value;
						this.next(), s = {
							mods: e,
							varType: t,
							name: i,
							iterable: this.parseExpression()
						}, n = !0;
					}
				}
			} catch (o) {
				n = !1;
			}
			if (n || this.restore(t), n) {
				this.expectOp(")");
				const t = this.parseStatement();
				return {
					type: "ForEach",
					...s,
					body: t,
					line: e.line,
					col: e.col
				};
			}
			let i = null;
			if (!this.atOp(";")) if (this.looksLikeLocalVarDecl()) i = this.parseLocalVarDecl();
			else {
				const e = [this.parseExpression()];
				for (; this.eatOp(",");) e.push(this.parseExpression());
				i = {
					type: "ExprList",
					exprs: e
				};
			}
			this.expectOp(";");
			const r = this.atOp(";") ? null : this.parseExpression();
			this.expectOp(";");
			const a = [];
			if (!this.atOp(")")) for (a.push(this.parseExpression()); this.eatOp(",");) a.push(this.parseExpression());
			this.expectOp(")");
			return {
				type: "For",
				init: i,
				cond: r,
				updates: a,
				body: this.parseStatement(),
				line: e.line,
				col: e.col
			};
		}
		parseReturn() {
			const e = this.next(), t = this.atOp(";") ? null : this.parseExpression();
			return this.expectOp(";"), {
				type: "Return",
				expr: t,
				line: e.line,
				col: e.col
			};
		}
		parseBreakContinue() {
			const e = this.next(), t = e.value;
			let s = null;
			return "ident" === this.peek().type && (s = this.next().value), this.expectOp(";"), {
				type: "break" === t ? "Break" : "Continue",
				label: s,
				line: e.line,
				col: e.col
			};
		}
		parseTry() {
			const t = this.next(), s = [];
			if (this.atOp("(")) {
				for (this.next();;) {
					const e = this.parseModifiers(), t = this.parseTypeRef(!1), n = this.expect("ident", void 0, "expected resource name").value;
					let i = null;
					if (this.eatOp("=") && (i = this.parseExpression()), s.push({
						modifiers: e,
						type: t,
						name: n,
						init: i
					}), !this.eatOp(";")) break;
					if (this.atOp(")")) break;
				}
				this.expectOp(")");
			}
			const n = this.parseBlock(), i = [];
			for (; this.atKw("catch");) {
				const e = this.next();
				this.expectOp("("), this.parseModifiers();
				const t = [this.parseTypeRef(!1)];
				for (; this.eatOp("|");) t.push(this.parseTypeRef(!1));
				let s = "_";
				"ident" === this.peek().type && (s = this.next().value), this.expectOp(")"), i.push({
					types: t,
					name: s,
					body: this.parseBlock(),
					line: e.line,
					col: e.col
				});
			}
			let r = null;
			if (this.atKw("finally") && (this.next(), r = this.parseBlock()), 0 === i.length && !r) throw new e("'catch' or 'finally' expected", t.line, t.col);
			return {
				type: "Try",
				resources: s,
				block: n,
				catches: i,
				finallyBlock: r,
				line: t.line,
				col: t.col
			};
		}
		parseSwitchStatement() {
			const t = this.next();
			this.expectOp("(");
			const s = this.parseExpression();
			this.expectOp(")"), this.expectOp("{");
			const n = [];
			for (; !this.atOp("}") && !this.at("eof");) {
				if (!this.atKw("case") && !this.atKw("default")) {
					const t = this.peek();
					throw new e(`"case", "default", or "}" expected, found ${"eof" === t.type ? "end of file" : `"${t.value}"`}`, t.line, t.col);
				}
				{
					const e = this.atKw("default");
					this.next();
					const t = [];
					if (!e) for (t.push(this.parseCaseLabel()); this.eatOp(",");) t.push(this.parseCaseLabel());
					let s = !1, i = null;
					if (this.atOp("->")) {
						if (this.next(), s = !0, this.atOp("{")) {
							n.push({
								labels: t,
								isDefault: e,
								arrow: s,
								body: this.parseBlock().body,
								value: null
							});
							continue;
						}
						if (this.atKw("throw")) {
							const i = this.next(), r = this.parseExpression();
							this.expectOp(";"), n.push({
								labels: t,
								isDefault: e,
								arrow: s,
								body: [{
									type: "Throw",
									expr: r,
									line: i.line,
									col: i.col
								}],
								value: null
							});
							continue;
						}
						const i = this.parseStatement();
						n.push({
							labels: t,
							isDefault: e,
							arrow: s,
							body: [i],
							value: null
						});
						continue;
					}
					this.expectOp(":");
					const r = [];
					for (; !(this.atOp("}") || this.atKw("case") || this.atKw("default") || this.at("eof"));) r.push(this.parseStatement());
					n.push({
						labels: t,
						isDefault: e,
						arrow: !1,
						body: r,
						value: i
					});
				}
			}
			return this.expectOp("}"), {
				type: "Switch",
				selector: s,
				clauses: n,
				isExpression: !1,
				line: t.line,
				col: t.col
			};
		}
		parseCaseLabel() {
			return this.atKw("null") ? (this.next(), {
				type: "Literal",
				kind: "null",
				value: null
			}) : this.parseTernary();
		}
		parseSwitchExpression() {
			const e = this.peek();
			this.expectKw("switch"), this.expectOp("(");
			const t = this.parseExpression();
			this.expectOp(")"), this.expectOp("{");
			const s = [];
			for (; !this.atOp("}") && !this.at("eof");) {
				if (this.atKw("default")) {
					this.next(), this.expectOp("->");
					const e = this.parseExpression();
					this.expectOp(";"), s.push({
						labels: [],
						isDefault: !0,
						arrow: !0,
						body: [],
						value: e
					});
					continue;
				}
				this.expectKw("case");
				const e = [this.parseCaseLabel()];
				for (; this.eatOp(",");) e.push(this.parseCaseLabel());
				if (this.expectOp("->"), this.atKw("yield")) {
					this.next();
					const t = this.parseExpression();
					this.expectOp(";"), s.push({
						labels: e,
						isDefault: !1,
						arrow: !0,
						body: [],
						value: t
					});
				} else {
					const t = this.parseExpression();
					this.expectOp(";"), s.push({
						labels: e,
						isDefault: !1,
						arrow: !0,
						body: [],
						value: t
					});
				}
			}
			return this.expectOp("}"), {
				type: "SwitchExpr",
				selector: t,
				clauses: s,
				isExpression: !0,
				line: e.line,
				col: e.col
			};
		}
		parseExpression() {
			return this.atKw("switch") ? this.parseSwitchExpression() : this.parseAssignment();
		}
		parseAssignment() {
			const e = this.tryParseLambda();
			if (e) return e;
			const t = this.peek(), s = this.parseTernary();
			return "op" === this.peek().type && u.has(this.peek().value) ? {
				type: "Assign",
				op: this.next().value,
				target: s,
				value: this.parseAssignment(),
				line: t.line,
				col: t.col
			} : s;
		}
		tryParseLambda() {
			const e = this.peek();
			if ("ident" === e.type && "op" === this.peek(1).type && "->" === this.peek(1).value) {
				this.next(), this.next();
				const t = {
					name: e.value,
					implicitType: !0,
					type: {
						name: "var",
						args: [],
						dims: 0,
						isVar: !0
					}
				};
				return this.parseLambdaBody([t], e);
			}
			if ("op" === e.type && "(" === e.value) {
				const t = this.state(), s = this.matchParen(this.pos);
				if (s > 0) {
					const t = this.tokens[s + 1];
					if (t && "op" === t.type && "->" === t.value) {
						this.next();
						const t = [];
						if (!this.atOp(")")) for (;;) {
							const e = this.parseModifiers();
							if (this.atOp("...") && this.next(), "ident" !== this.peek().type || "," !== this.peek(1).value && ")" !== this.peek(1).value) {
								const s = this.parseTypeRef(!1), n = this.expect("ident", void 0, "expected parameter name").value;
								t.push({
									modifiers: e,
									type: s,
									name: n,
									implicitType: !1
								});
							} else t.push({
								modifiers: e,
								type: {
									name: "var",
									args: [],
									dims: 0,
									isVar: !0
								},
								name: this.next().value,
								implicitType: !0
							});
							if (!this.eatOp(",")) break;
						}
						return this.expectOp(")"), this.expectOp("->"), this.parseLambdaBody(t, e);
					}
				}
				this.restore(t);
			}
			return null;
		}
		parseLambdaBody(e, t) {
			return this.atOp("{") ? {
				type: "Lambda",
				params: e,
				body: this.parseBlock().body,
				isExpression: !1,
				line: t.line,
				col: t.col
			} : {
				type: "Lambda",
				params: e,
				body: this.parseExpression(),
				isExpression: !0,
				line: t.line,
				col: t.col
			};
		}
		matchParen(e) {
			let t = 0;
			for (let s = e; s < this.tokens.length; s++) {
				const e = this.tokens[s];
				if ("op" === e.type && "(" === e.value) t++;
				else if ("op" === e.type && ")" === e.value && (t--, 0 === t)) return s;
			}
			return -1;
		}
		parseTernary() {
			const e = this.peek(), t = this.parseBinary(0);
			if (this.atOp("?")) {
				this.next();
				const s = this.parseAssignment();
				return this.expectOp(":"), {
					type: "Ternary",
					cond: t,
					then: s,
					otherwise: this.parseAssignment(),
					line: e.line,
					col: e.col
				};
			}
			return t;
		}
		parseArguments() {
			this.expectOp("(");
			const e = [];
			if (!this.atOp(")")) for (; e.push(this.parseExpression()), this.eatOp(","););
			return this.expectOp(")"), e;
		}
		parseBinary(e) {
			const t = [
				["||"],
				["&&"],
				["|"],
				["^"],
				["&"],
				["==", "!="],
				[
					"<",
					">",
					"<=",
					">="
				],
				["instanceof"],
				[
					"<<",
					">>",
					">>>"
				],
				["+", "-"],
				[
					"*",
					"/",
					"%"
				]
			];
			if (e >= t.length) return this.parseUnary();
			const s = t[e];
			let n = this.parseBinary(e + 1);
			for (;;) {
				if ("instanceof" === s[0]) {
					if (!this.atKw("instanceof")) break;
					this.next();
					const e = this.parseTypeRef(!1);
					let t = null;
					"ident" === this.peek().type && (t = this.next().value), n = {
						type: "InstanceOf",
						expr: n,
						targetType: e,
						binding: t
					};
					continue;
				}
				const t = this.peek();
				if ("op" !== t.type || !s.includes(t.value)) break;
				this.next();
				const i = this.parseBinary(e + 1);
				n = {
					type: "Binary",
					op: t.value,
					left: n,
					right: i,
					line: t.line,
					col: t.col
				};
			}
			return n;
		}
		parseUnary() {
			const e = this.peek();
			if ("op" === e.type && ("+" === e.value || "-" === e.value || "!" === e.value || "~" === e.value)) return this.next(), {
				type: "Unary",
				op: e.value,
				expr: this.parseUnary(),
				prefix: !0,
				line: e.line,
				col: e.col
			};
			if ("op" === e.type && ("++" === e.value || "--" === e.value)) return this.next(), {
				type: "Unary",
				op: e.value,
				expr: this.parseUnary(),
				prefix: !0,
				line: e.line,
				col: e.col
			};
			return this.tryParseCast() || this.parsePostfix();
		}
		tryParseCast() {
			const e = this.peek();
			if ("op" !== e.type || "(" !== e.value) return null;
			const t = this.state(), s = this.matchParen(this.pos);
			if (s < 0) return null;
			const n = this.tokens[s + 1];
			if (!n) return null;
			this.next();
			let i = !1;
			try {
				this.parseModifiers(), this.parseTypeRef(!1);
				const e = this.peek();
				"op" !== e.type || ")" !== e.value && "[" !== e.value || (i = !0);
			} catch (l) {
				i = !1;
			}
			if (this.restore(t), !i) return null;
			const r = (n.type, n.value);
			if (!("ident" === n.type || "number" === n.type || "string" === n.type || "char" === n.type || "textblock" === n.type || "keyword" === n.type && [
				"this",
				"super",
				"new",
				"true",
				"false",
				"null",
				"switch",
				"int",
				"long",
				"double",
				"float",
				"char",
				"boolean",
				"byte",
				"short",
				"var"
			].includes(n.value) || "op" === n.type && [
				"(",
				"!",
				"~",
				"[",
				"+",
				"-"
			].includes(n.value))) return null;
			if ("op" === n.type && ("+" === r || "-" === r)) {
				const e = this.tokens[this.pos + 1];
				if (!e || !("keyword" === e.type && a(e.value) || "ident" === e.type && (f.has(e.value) || /^[A-Z]/.test(e.value)))) return null;
			}
			if ("op" === n.type && (">" === r || "&" === r || "*" === r || "/" === r)) return null;
			this.next();
			const o = this.parseTypeRef(!1);
			return this.expectOp(")"), {
				type: "Cast",
				targetType: o,
				expr: this.parseUnary(),
				line: e.line,
				col: e.col
			};
		}
		parsePostfix() {
			let e = this.parsePrimary();
			for (;;) {
				const t = this.peek();
				if ("op" !== t.type) break;
				if ("." === t.value) {
					if (this.next(), this.atKw("new")) {
						this.next(), e = {
							type: "New",
							type: this.parseTypeRef(!1),
							args: this.parseArguments(),
							qualified: e
						};
						continue;
					}
					if (this.atKw("this")) {
						this.next(), e = {
							type: "ThisQualified",
							target: e
						};
						continue;
					}
					if (this.atKw("class")) {
						this.next(), e = {
							type: "ClassLiteral",
							targetType: null,
							name: "Name" === e.type ? e.name : null
						};
						continue;
					}
					if (this.atKw("super")) {
						this.next(), e = {
							type: "SuperRef",
							target: e
						};
						continue;
					}
					const s = this.expect("ident", void 0, "expected member name after '.'").value;
					if (this.atOp("(")) e = {
						type: "MethodCall",
						target: e,
						name: s,
						args: this.parseArguments(),
						line: t.line,
						col: t.col
					};
					else e = {
						type: "FieldAccess",
						target: e,
						name: s,
						line: t.line,
						col: t.col
					};
					continue;
				}
				if ("[" === t.value) {
					this.next();
					const s = this.parseExpression();
					this.expectOp("]"), e = {
						type: "ArrayAccess",
						array: e,
						index: s,
						line: t.line,
						col: t.col
					};
					continue;
				}
				if ("::" === t.value) {
					if (this.next(), this.atKw("new")) {
						this.next(), e = {
							type: "MethodRef",
							target: e,
							name: "new"
						};
						continue;
					}
					e = {
						type: "MethodRef",
						target: e,
						name: this.expect("ident", void 0, "expected method name").value,
						line: t.line,
						col: t.col
					};
					continue;
				}
				if ("++" !== t.value && "--" !== t.value) break;
				this.next(), e = {
					type: "Unary",
					op: t.value,
					expr: e,
					prefix: !1,
					line: t.line,
					col: t.col
				};
			}
			return e;
		}
		parsePrimary() {
			const t = this.peek();
			if ("number" === t.type) {
				this.next();
				let e = "long" === t.subtype ? "long" : "float" === t.subtype || "double" === t.subtype ? "double" : "int", s = t.value;
				return "int" !== e || Number.isInteger(s) || (e = "double"), {
					type: "Literal",
					kind: e,
					value: s,
					line: t.line,
					col: t.col
				};
			}
			if ("string" === t.type || "textblock" === t.type) return this.next(), {
				type: "Literal",
				kind: "string",
				value: t.value,
				line: t.line,
				col: t.col
			};
			if ("char" === t.type) return this.next(), {
				type: "Literal",
				kind: "char",
				value: t.value,
				line: t.line,
				col: t.col
			};
			if (this.atKw("true") || this.atKw("false")) return this.next(), {
				type: "Literal",
				kind: "boolean",
				value: "true" === t.value,
				line: t.line,
				col: t.col
			};
			if (this.atKw("null")) return this.next(), {
				type: "Literal",
				kind: "null",
				value: null,
				line: t.line,
				col: t.col
			};
			if (this.atKw("this")) return this.next(), {
				type: "This",
				line: t.line,
				col: t.col
			};
			if (this.atKw("super")) return this.next(), {
				type: "Super",
				line: t.line,
				col: t.col
			};
			if (this.atKw("switch")) return this.parseSwitchExpression();
			if (this.atKw("new")) return this.parseNew();
			if (this.atOp("(")) {
				const e = this.tryParseLambda();
				if (e) return e;
				this.next();
				const s = this.parseExpression();
				return this.expectOp(")"), {
					type: "Paren",
					expr: s,
					line: t.line,
					col: t.col
				};
			}
			if ("ident" === t.type) {
				const e = this.tryParseLambda();
				if (e) return e;
				if (this.next(), this.atOp("(")) {
					const e = this.parseArguments();
					return {
						type: "MethodCall",
						target: null,
						name: t.value,
						args: e,
						line: t.line,
						col: t.col
					};
				}
				return {
					type: "Name",
					name: t.value,
					line: t.line,
					col: t.col
				};
			}
			if ("keyword" === t.type && a(t.value)) return {
				type: "ClassLiteral",
				targetType: this.parseTypeRef(!1),
				name: null,
				line: t.line,
				col: t.col
			};
			throw new e(`illegal start of expression, found ${"eof" === t.type ? "end of file" : `"${t.value}"`}`, t.line, t.col);
		}
		parseNew() {
			const e = this.next(), t = this.parseTypeRef(!1);
			if (this.atOp("<") && this.parseTypeArgs(), t.dims > 0 || this.atOp("[")) {
				const s = t.dims > 0 ? [null] : [];
				let n = null;
				for (; this.atOp("[");) if (this.next(), this.atOp("]")) this.next(), s.push(null);
				else {
					if (this.atOp("{")) break;
					s.push(this.parseExpression()), this.expectOp("]");
				}
				return this.atOp("{") && (n = this.parseArrayInitializer()), {
					type: "NewArray",
					arrayType: {
						...t,
						dims: 0
					},
					dims: s,
					arrayInit: n,
					line: e.line,
					col: e.col
				};
			}
			return {
				type: "New",
				targetType: t,
				args: this.parseArguments(),
				line: e.line,
				col: e.col
			};
		}
	};
	function y(e) {
		for (let n = 1; n <= 17; n++) if (Number(e.toPrecision(n)) === e) {
			const [t, s] = e.toExponential(n - 1).split("e");
			return {
				digits: t.replace(".", "").replace("-", ""),
				exp: parseInt(s, 10)
			};
		}
		const [t, s] = e.toExponential(16).split("e");
		return {
			digits: t.replace(".", "").replace("-", ""),
			exp: parseInt(s, 10)
		};
	}
	function g(e) {
		if (Number.isNaN(e)) return "NaN";
		if (e === 1 / 0) return "Infinity";
		if (e === -1 / 0) return "-Infinity";
		if (0 === e) return Object.is(e, -0) ? "-0.0" : "0.0";
		const t = e < 0, s = Math.abs(e), { digits: n, exp: i } = y(s);
		let r;
		if (s >= .001 && s < 1e7) if (i >= 0) {
			const e = n.slice(0, i + 1).padEnd(i + 1, "0"), t = n.slice(i + 1);
			r = t.length ? `${e}.${t}` : `${e}.0`;
		} else r = `0.${"0".repeat(-i - 1)}${n}`;
		else r = `${n.length > 1 ? `${n[0]}.${n.slice(1)}` : `${n[0]}.0`}E${i}`;
		return t ? `-${r}` : r;
	}
	function v(e) {
		return Number.isFinite(e) ? 0x8000000000000000 === e ? "9223372036854775807" : -0x8000000000000000 === e ? "-9223372036854775808" : Number.isInteger(e) ? String(e) : g(e) : e > 0 ? "Infinity" : "-Infinity";
	}
	function b(e, t = 10) {
		if (10 === t) return v(e);
		if (e < 0) return "-" + b(-e, t);
		if (0 === e) return "0";
		let s = "", n = Math.floor(e);
		for (; n > 0;) s = "0123456789abcdefghijklmnopqrstuvwxyz"[n % t] + s, n = Math.floor(n / t);
		return s;
	}
	function x(e) {
		return String.fromCharCode(e);
	}
	function w(e, t) {
		if (e.length <= t) return {
			str: e.padEnd(t, "0"),
			carry: !1
		};
		const s = e.slice(0, t);
		if (!(e.charCodeAt(t) - 48 >= 5)) return {
			str: s,
			carry: !1
		};
		const n = s.split("");
		let i = n.length - 1, r = !0;
		for (; r && i >= 0;) "9" === n[i] ? (n[i] = "0", i--) : (n[i] = String(Number(n[i]) + 1), r = !1);
		return {
			str: (r ? "1" : "") + n.join(""),
			carry: r
		};
	}
	function k(e, t) {
		if (Number.isNaN(e)) return "NaN";
		if (!Number.isFinite(e)) return e > 0 ? "Infinity" : "-Infinity";
		const s = null == t ? 6 : t, n = e < 0 || Object.is(e, -0), i = Math.abs(e);
		if (0 === i) return (n ? "-" : "") + (s > 0 ? `0.${"0".repeat(s)}` : "0");
		const { digits: r, exp: a } = y(i), o = a + 1, l = Math.max(1, o), { str: c } = w(o > 0 ? r.slice(0, o).padEnd(o, "0") + r.slice(o) : `0${"0".repeat(-o)}${r}`, l + s), h = c.slice(0, Math.max(0, c.length - s)).replace(/^$/, "0") || "0", p = s > 0 ? c.slice(Math.max(0, c.length - s)).padStart(s, "0") : "";
		return (n ? "-" : "") + h + (s > 0 ? "." + p : "");
	}
	function S(e, t) {
		if (Number.isNaN(e)) return "NaN";
		if (!Number.isFinite(e)) return e > 0 ? "Infinity" : "-Infinity";
		const s = null == t ? 6 : t, n = e < 0 || Object.is(e, -0), i = Math.abs(e);
		if (0 === i) return (n ? "-" : "") + `0.${"0".repeat(s)}e+00`;
		const { digits: r, exp: a } = y(i), { str: o, carry: l } = w(r, s + 1), c = a + (l ? 1 : 0);
		return (n ? "-" : "") + (s > 0 ? `${o[0]}.${o.slice(1).padEnd(s, "0")}` : l ? o[0] : o) + "e" + (c < 0 ? "-" : "+") + String(Math.abs(c)).padStart(2, "0");
	}
	function O(e, t, s, n, i, r, a) {
		const o = t.includes("-"), l = t.includes("+"), c = t.includes(" "), h = t.includes("0"), p = t.includes(",");
		let u = "", f = "";
		switch (e) {
			case "d": {
				const e = Math.trunc(Number(i));
				e < 0 ? f = "-" : l ? f = "+" : c && (f = " "), u = b(Math.abs(e)), p && (u = u.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
				break;
			}
			case "f": {
				const e = Number(i);
				if (e < 0 || Object.is(e, -0) ? f = "-" : l ? f = "+" : c && (f = " "), u = k(Math.abs(e), n), p) {
					const [e, t] = u.split(".");
					u = e.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (t ? "." + t : "");
				}
				break;
			}
			case "e": {
				const e = Number(i);
				e < 0 || Object.is(e, -0) ? f = "-" : l ? f = "+" : c && (f = " "), u = S(Math.abs(e), n);
				break;
			}
			case "g": {
				const e = Number(i);
				if (u = function(e, t) {
					if (Number.isNaN(e)) return "NaN";
					if (!Number.isFinite(e)) return e > 0 ? "Infinity" : "-Infinity";
					const s = null == t ? 6 : 0 === t ? 1 : t, n = e < 0 || Object.is(e, -0), i = Math.abs(e);
					if (0 === i) {
						const e = "0".repeat(Math.max(0, s - 1));
						return (n ? "-" : "") + (e ? `0.${e}` : "0");
					}
					const { exp: r } = y(i);
					return (n ? "-" : "") + (r < -4 || r >= s ? S(i, s - 1) : k(i, Math.max(0, s - 1 - r)));
				}(e, n), e >= 0 && (l ? f = "+" : c && (f = " ")), p) {
					const [e, t] = u.split(".");
					u = e.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (void 0 !== t ? "." + t : "");
				}
				break;
			}
			case "x":
				u = b(Math.trunc(Number(i)), 16), t.includes("#") && "0" !== u && (u = `0x${u}`);
				break;
			case "X":
				u = b(Math.trunc(Number(i)), 16).toUpperCase(), t.includes("#") && "0" !== u && (u = `0X${u}`);
				break;
			case "o":
				u = b(Math.trunc(Number(i)), 8), t.includes("#") && "0" !== u && (u = `0${u}`);
				break;
			case "b":
				u = "boolean" == typeof i ? i ? "true" : "false" : (0 !== Math.trunc(Number(i))).toString();
				break;
			case "c":
				u = "number" == typeof i ? x(i) : r(i, a);
				break;
			case "n": return "\n";
			case "s":
			case "S":
				u = null == i ? "null" : r(i, a), null !== n && n < u.length && (u = u.slice(0, n)), "S" === e && (u = u.toUpperCase());
				break;
			case "%": return "%".repeat(s || 1);
			default: u = r(i, a);
		}
		return ((e) => {
			if (!s || e.length >= s) return e;
			const t = s - e.length;
			if (o) return e + " ".repeat(t);
			if (h) {
				const s = /^([-+ ]?)(0[xX])?(.*)$/.exec(e);
				return s[1] + (s[2] || "") + s[3].padStart(s[3].length + t, "0");
			}
			return " ".repeat(t) + e;
		})(f + u);
	}
	const C = /%(?<arg>\d+\$)?(?<flags>[-#+ 0,(]*)(?<width>\d+)?(?:\.(?<prec>\d+))?(?<conv>[a-zA-Z%n%])/g;
	function T(e, t, s) {
		const n = s || ((e) => null == e ? "null" : String(e));
		let i, r = "", a = 0, o = 0;
		for (C.lastIndex = 0; null !== (i = C.exec(e));) {
			r += e.slice(o, i.index), o = C.lastIndex;
			const s = i.groups;
			if ("%" === s.conv) {
				r += "%";
				continue;
			}
			if ("n" === s.conv) {
				r += "\n";
				continue;
			}
			s.arg && (a = parseInt(s.arg, 10) - 1);
			const l = a, c = t[a++];
			r += O(s.conv, s.flags || "", s.width ? parseInt(s.width, 10) : null, void 0 !== s.prec ? parseInt(s.prec, 10) : null, c, n, l);
		}
		return r += e.slice(o), r;
	}
	var M = class {
		constructor(e, t = {}) {
			this.name = e, this.kind = t.kind || "class", this.modifiers = t.modifiers || [], this.superClass = null, this.interfaces = [], this.methods = /* @__PURE__ */ new Map(), this.fields = /* @__PURE__ */ new Map(), this.staticFields = /* @__PURE__ */ new Map(), this.natives = /* @__PURE__ */ new Map(), this.nativeReturns = /* @__PURE__ */ new Map(), this.accessors = /* @__PURE__ */ new Map(), this.enumConstants = [], this.abstract = t.abstract || !1, this.line = t.line || 0, this.isFunctional = !!t.isFunctional, this.functionalMethod = t.functionalMethod || null;
		}
		addMethod(e) {
			const t = this.methods.get(e.name) || [];
			t.push(e), this.methods.set(e.name, t);
		}
		methodsNamed(e) {
			return this.methods.get(e) || [];
		}
		findMethod(e, t) {
			let s = this;
			for (; s;) {
				const n = s.methodsNamed(e), i = void 0 === t ? n : n.filter((e) => e.params.length === t);
				if (i && i.length) return i;
				for (const r of s.interfaces || []) {
					const s = r && r.findMethod ? r.findMethod(e, t) : null;
					if (s) return s;
				}
				s = s.superClass;
			}
			return null;
		}
		nativeReturnType(e, t) {
			let s = this;
			for (; s;) {
				if (s.nativeReturns) {
					const n = s.nativeReturns.get(`${e}/${t}`);
					if (n) return n;
					const i = s.nativeReturns.get(`${e}/#`);
					if (i) return i;
				}
				for (const n of s.interfaces || []) {
					const s = n && n.nativeReturnType ? n.nativeReturnType(e, t) : null;
					if (s) return s;
				}
				s = s.superClass;
			}
			return null;
		}
		isSubclassOf(e) {
			let t = this;
			for (; t;) {
				if (t === e) return !0;
				for (const s of t.interfaces || []) if (s === e || s && s.isSubclassOf && s.isSubclassOf(e)) return !0;
				t = t.superClass;
			}
			return !1;
		}
		lineage() {
			const e = [];
			let t = this;
			for (; t;) e.push(t.name), t = t.superClass;
			return e.join(" -> ");
		}
	}, E = class {
		constructor(e, t) {
			this.cls = e, this.fields = t instanceof Map ? t : /* @__PURE__ */ new Map(), this.native = null;
		}
		get(e) {
			const t = this.fields.get(e);
			return t ? t.v : void 0;
		}
		getCell(e) {
			return this.fields.get(e);
		}
		set(e, t, s) {
			const n = this.fields.get(e);
			n ? n.v = s : this.fields.set(e, {
				t,
				v: s
			});
		}
	};
	function A(e) {
		return e instanceof E;
	}
	var N = class e {
		constructor(e = null) {
			this.vars = /* @__PURE__ */ new Map(), this.parent = e;
		}
		lookup(e) {
			let t = this;
			for (; t;) {
				const s = t.vars.get(e);
				if (s) return s;
				t = t.parent;
			}
			return null;
		}
		declare(e, t, s, n = !1) {
			this.vars.set(e, {
				t,
				v: s,
				final: !!n
			});
		}
		assign(e, t) {
			const s = this.lookup(e);
			return !!s && (s.v = t, !0);
		}
		child() {
			const t = new e(this);
			return t.thisObj = this.thisObj, t.staticClass = this.staticClass, t;
		}
	}, $ = class {
		constructor(e = null) {
			this.label = e;
		}
	}, I = class {
		constructor(e = null) {
			this.label = e;
		}
	}, L = class {
		constructor(e) {
			this.value = e;
		}
	}, j = class {
		constructor(e) {
			this.value = e;
		}
	};
	const B = /* @__PURE__ */ new Set([
		"byte",
		"short",
		"int",
		"long",
		"float",
		"double",
		"char"
	]), F = /* @__PURE__ */ new Set([
		"byte",
		"short",
		"int",
		"long",
		"char"
	]);
	function K(e) {
		return B.has(e);
	}
	function R(e) {
		return F.has(e);
	}
	function D(e, t) {
		return null == e ? "null" : "boolean" == typeof e ? e ? "true" : "false" : "string" == typeof e ? e : "number" == typeof e ? "char" === t ? x(e) : "float" === t ? function(e) {
			if (Number.isNaN(e)) return "NaN";
			if (e === 1 / 0) return "Infinity";
			if (e === -1 / 0) return "-Infinity";
			if (0 === e) return Object.is(e, -0) ? "-0.0" : "0.0";
			let t = null;
			for (let s = 1; s <= 9; s++) {
				const n = Number(e.toPrecision(s));
				if (Math.fround(n) === e) {
					t = n;
					break;
				}
			}
			return g(null === t ? e : t);
		}(e) : "double" === t ? g(e) : "long" === t ? v(e) : String(e) : null;
	}
	function U(e, t) {
		return "double" === e || "double" === t ? "double" : "float" === e || "float" === t ? "float" : "long" === e || "long" === t ? "long" : "int";
	}
	function V(e, t) {
		if ("char" === t) return 65535 & Math.trunc(e);
		const s = function(e) {
			switch (e) {
				case "byte": return 8;
				case "short":
				case "char": return 16;
				case "int":
				case "float":
				default: return 32;
				case "long":
				case "double": return 64;
			}
		}(t);
		if (32 === s) {
			const t = (Math.trunc(e) % 4294967296 + 4294967296) % 4294967296;
			return t >= 2147483648 ? t - 4294967296 : t;
		}
		if (64 === s) return Math.trunc(e);
		if (16 === s) {
			const t = (Math.trunc(e) % 65536 + 65536) % 65536;
			return t > 32767 ? t - 65536 : t;
		}
		if (8 === s) {
			const t = (Math.trunc(e) % 256 + 256) % 256;
			return t > 127 ? t - 256 : t;
		}
		return e;
	}
	const P = "\n";
	function _(e, t, s, n) {
		e.natives.set(`${t}/${s}`, n);
	}
	function z(e, t, s, n) {
		e.nativeReturns.set(`${t}/${s}`, n);
	}
	function J(e, t, s, n) {
		e.staticFields.set(t, {
			t: s,
			v: n
		});
	}
	function q(e, t) {
		return e && e.types ? e.types[t] : void 0;
	}
	function W(e) {
		return new RegExp(String(e), "g");
	}
	function H(e) {
		const t = /* @__PURE__ */ new Map(), s = (e, s) => {
			const n = new M(e, {
				kind: "class",
				...s
			});
			return t.set(e, n), n;
		}, n = (t, s) => null == t ? "null" : D(t, s) ?? e.toString(t), i = (t, s) => (t, n) => ((t, s, n) => null == t ? "null" : "object" == typeof t ? e.toString(t) : D(t, n && n[s] || ("number" == typeof t ? "int" : null)) ?? String(t))(t, n, s), r = s("Object", {});
		_(r, "toString", "#", (t, s) => null === t[0] ? "null" : "string" == typeof t[0] ? t[0] : "boolean" == typeof t[0] || "number" == typeof t[0] ? D(t[0], s.types[0]) : e.toString(t[0])), _(r, "equals", 1, (t) => e.equals(t[0], t[1])), _(r, "hashCode", 0, (t) => e.identityHash(t[0]) % 2147483647);
		const a = s("String", {});
		a.natives.set("__construct/#", (t) => {
			const s = t[0];
			return null == s && e.throwJava("NullPointerException", "null"), F(s) && s.native && Array.isArray(s.native.elements) ? s.native.elements.map((e) => "number" == typeof e ? String.fromCharCode(e) : String(e)).join("") : String(s);
		}), t.set("CharSequence", a);
		const o = (e) => null === e[0] ? null : String(e[0]), l = (t, s = 0) => (null !== t[s] && void 0 !== t[s] || e.throwJava("NullPointerException", "null"), String(t[s])), c = (e, t) => "number" == typeof e[t] ? String.fromCharCode(e[t]) : l(e, t);
		_(a, "length", 0, (e) => l(e).length), _(a, "isEmpty", 0, (e) => 0 === l(e).length), _(a, "isBlank", 0, (e) => 0 === l(e).trim().length), _(a, "charAt", 1, (t) => {
			const s = l(t), n = t[1];
			return (n < 0 || n >= s.length) && e.throwJava("StringIndexOutOfBoundsException", `index ${n}, length ${s.length}`), s.charCodeAt(n);
		}), _(a, "substring", 1, (t) => {
			const s = l(t);
			return (t[1] < 0 || t[1] > s.length) && e.throwJava("StringIndexOutOfBoundsException", `begin ${t[1]}, length ${s.length}`), s.slice(t[1]);
		}), _(a, "substring", 2, (t) => {
			const s = l(t);
			return (t[1] < 0 || t[1] > t[2] || t[2] > s.length) && e.throwJava("StringIndexOutOfBoundsException", `begin ${t[1]}, end ${t[2]}, length ${s.length}`), s.slice(t[1], t[2]);
		}), _(a, "indexOf", 1, (e) => l(e).indexOf(c(e, 1))), _(a, "indexOf", 2, (e) => l(e).indexOf(c(e, 1), e[2])), _(a, "lastIndexOf", 1, (e) => l(e).lastIndexOf(c(e, 1))), _(a, "lastIndexOf", 2, (e) => l(e).lastIndexOf(c(e, 1), e[2])), _(a, "contains", 1, (e) => l(e).includes(c(e, 1))), _(a, "startsWith", 1, (e) => l(e).startsWith(c(e, 1))), _(a, "endsWith", 1, (e) => l(e).endsWith(c(e, 1))), _(a, "toUpperCase", 0, (e) => l(e).toUpperCase()), _(a, "toLowerCase", 0, (e) => l(e).toLowerCase()), _(a, "trim", 0, (e) => l(e).replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "")), _(a, "strip", 0, (e) => l(e).trim()), _(a, "stripLeading", 0, (e) => l(e).replace(/^[\s\uFEFF\xA0]+/, "")), _(a, "stripTrailing", 0, (e) => l(e).replace(/[\s\uFEFF\xA0]+$/, "")), _(a, "concat", 1, (e) => l(e) + l(e, 1)), _(a, "repeat", 1, (e) => l(e).repeat(Math.max(0, e[1]))), _(a, "equals", 1, (e) => null !== e[0] && null !== e[1] && String(e[0]) === String(e[1])), _(a, "equalsIgnoreCase", 1, (e) => null !== e[0] && null !== e[1] && String(e[0]).toLowerCase() === String(e[1]).toLowerCase()), _(a, "compareTo", 1, (e) => {
			const t = l(e), s = l(e, 1);
			return t < s ? -1 : t > s ? 1 : 0;
		}), _(a, "replace", 2, (e) => {
			const t = c(e, 1), s = c(e, 2);
			return "" === t ? l(e) : l(e).split(t).join(s);
		}), _(a, "replaceAll", 2, (e) => {
			const t = W(l(e, 1)), s = l(e, 2).replace(/\$(\d)/g, "$$$1").replace(/\$\{(\d+)\}/g, "$$$1");
			return l(e).replace(t, s);
		}), _(a, "matches", 1, (e) => new RegExp(`^(?:${l(e, 1)})$`).test(l(e))), _(a, "split", 1, (e) => Z(l(e), l(e, 1), 0)), _(a, "split", 2, (e) => Z(l(e), l(e, 1), e[2])), _(a, "toString", 0, (e) => o(e) || "null"), _(a, "formatted", "#", (e, t) => T(o(e), e.slice(1), i(e.slice(1), t.types.slice(1)))), _(a, "valueOf", 1, (e, t) => n(e[0], t.types[0])), _(a, "format", "#", (e, t) => T(o(e), e.slice(1), i(e.slice(1), t.types.slice(1)))), _(a, "join", "#", (e, t) => {
			const s = o(e), i = [];
			for (let r = 1; r < e.length; r++) {
				const a = e[r];
				if (a && a.native && (Array.isArray(a.native.items) || Array.isArray(a.native.elements))) {
					const e = a.native.items || a.native.elements;
					i.push(e.map((e) => n(e, null)).join(s));
				} else i.push(n(a, t.types[r]));
			}
			return i.join(s);
		});
		const h = s("StringBuilder", {});
		t.set("StringBuffer", h), h.natives.set("__construct/#", (t) => {
			const s = new E(h), n = t.length ? t[0] : null;
			return s.native = { value: null == n ? "" : D(n, null) ?? e.toString(n) }, s;
		});
		const p = (e) => {
			let t = e[0];
			return t instanceof E && t.native || (t = new E(h), t.native = { value: "" }, e[0] = t), t.native;
		};
		_(h, "append", "#", (e, t) => (p(e).value += n(e[1], q(t, 1)), e[0])), _(h, "toString", 0, (e) => p(e).value), _(h, "length", 0, (e) => p(e).value.length), _(h, "reverse", 0, (e) => (p(e).value = p(e).value.split("").reverse().join(""), e[0])), _(h, "insert", 2, (e, t) => {
			const s = p(e);
			return s.value = s.value.slice(0, e[1]) + n(e[2], q(t, 2)) + s.value.slice(e[1]), e[0];
		}), _(h, "deleteCharAt", 1, (e) => {
			const t = p(e);
			return t.value = t.value.slice(0, e[1]) + t.value.slice(e[1] + 1), e[0];
		}), _(h, "setLength", 1, (e) => {
			p(e).value = p(e).value.slice(0, e[1]);
		}), _(h, "charAt", 1, (e) => p(e).value.charCodeAt(e[1]));
		const u = s("Math", {});
		J(u, "PI", "double", Math.PI), J(u, "E", "double", Math.E), J(u, "TAU", "double", 2 * Math.PI), _(u, "abs", 1, (e, t) => Math.abs(e[0])), _(u, "max", 2, (e, t) => e[0] > e[1] ? e[0] : e[1]), _(u, "min", 2, (e, t) => e[0] < e[1] ? e[0] : e[1]), _(u, "sqrt", 1, (e) => Math.sqrt(e[0])), _(u, "cbrt", 1, (e) => Math.cbrt(e[0])), _(u, "pow", 2, (e) => Math.pow(e[0], e[1])), _(u, "floor", 1, (e) => Math.floor(e[0])), _(u, "ceil", 1, (e) => Math.ceil(e[0])), _(u, "round", 1, (e) => Math.floor(e[0] + .5)), _(u, "signum", 1, (e) => e[0] > 0 ? 1 : e[0] < 0 ? -1 : 0), _(u, "log", 1, (e) => Math.log(e[0])), _(u, "log10", 1, (e) => Math.log10(e[0])), _(u, "exp", 1, (e) => Math.exp(e[0])), _(u, "sin", 1, (e) => Math.sin(e[0])), _(u, "cos", 1, (e) => Math.cos(e[0])), _(u, "tan", 1, (e) => Math.tan(e[0])), _(u, "atan", 1, (e) => Math.atan(e[0])), _(u, "atan2", 2, (e) => Math.atan2(e[0], e[1])), _(u, "hypot", 2, (e) => Math.hypot(e[0], e[1])), _(u, "random", 0, () => e.random()), _(u, "toIntExact", 1, (t) => (Number.isInteger(t[0]) || e.throwJava("ArithmeticException", "overflow"), t[0]));
		const f = s("Integer", {});
		t.set("Number", s("Number", {})), J(f, "MAX_VALUE", "int", 2147483647), J(f, "MIN_VALUE", "int", -2147483648), J(f, "BYTES", "int", 4), _(f, "parseInt", 1, (t) => X(e, t[0], "int")), _(f, "parseInt", 2, (t) => X(e, t[0], "int", t[1])), _(f, "valueOf", 1, (t) => X(e, t[0], "int")), _(f, "toString", 1, (e) => String(e[0])), _(f, "toString", 2, (e) => b(e[0], e[1])), _(f, "toBinaryString", 1, (e) => b(e[0], 2)), _(f, "toHexString", 1, (e) => b(e[0], 16)), _(f, "toOctalString", 1, (e) => b(e[0], 8)), _(f, "compare", 2, (e) => e[0] < e[1] ? -1 : e[0] > e[1] ? 1 : 0), _(f, "sum", 2, (e) => V(e[0] + e[1], "int")), _(f, "max", 2, (e) => Math.max(e[0], e[1])), _(f, "min", 2, (e) => Math.min(e[0], e[1])), _(f, "intValue", 0, (e) => V(e[0], "int")), _(f, "toString", 0, (e, t) => D(e[0], t.types[0]));
		const d = s("Long", {});
		J(d, "MAX_VALUE", "long", 0x8000000000000000), J(d, "MIN_VALUE", "long", -0x8000000000000000), _(d, "parseLong", 1, (t) => X(e, t[0], "long")), _(d, "valueOf", 1, (t) => X(e, t[0], "long")), _(d, "toString", 1, (e) => String(e[0])), _(d, "toBinaryString", 1, (e) => b(e[0], 2)), _(d, "toHexString", 1, (e) => b(e[0], 16)), _(d, "compare", 2, (e) => e[0] < e[1] ? -1 : e[0] > e[1] ? 1 : 0), _(d, "longValue", 0, (e) => e[0]);
		const m = s("Double", {});
		t.set("Float", s("Float", {})), J(m, "MAX_VALUE", "double", Number.MAX_VALUE), J(m, "MIN_VALUE", "double", Number.MIN_VALUE), J(m, "POSITIVE_INFINITY", "double", 1 / 0), J(m, "NEGATIVE_INFINITY", "double", -1 / 0), J(m, "NaN", "double", NaN), _(m, "parseDouble", 1, (t) => G(e, t[0])), _(m, "valueOf", 1, (t) => G(e, t[0])), _(m, "isNaN", 1, (e) => Number.isNaN(e[0])), _(m, "compare", 2, (e) => e[0] < e[1] ? -1 : e[0] > e[1] ? 1 : 0), _(m, "doubleValue", 0, (e) => e[0]), _(m, "toString", 1, (e) => g(e[0]));
		const y = t.get("Float");
		_(y, "parseFloat", 1, (t) => Math.fround(G(e, t[0]))), _(y, "toString", 1, (e) => g(e[0]));
		const v = s("Boolean", {});
		J(v, "TRUE", "boolean", !0), J(v, "FALSE", "boolean", !1), _(v, "parseBoolean", 1, (e) => "true" === String(e[0]).toLowerCase()), _(v, "valueOf", 1, (e) => "true" === String(e[0]).toLowerCase()), _(v, "toString", 1, (e) => String(e[0])), _(v, "booleanValue", 0, (e) => Boolean(e[0])), _(v, "compare", 2, (e) => e[0] === e[1] ? 0 : e[0] ? 1 : -1);
		const w = s("Character", {});
		J(w, "MAX_VALUE", "char", 65535), J(w, "MIN_VALUE", "char", 0), _(w, "isDigit", 1, (e) => /[0-9]/.test(x(e[0]))), _(w, "isLetter", 1, (e) => /[A-Za-z]/.test(x(e[0]))), _(w, "isLetterOrDigit", 1, (e) => /[A-Za-z0-9]/.test(x(e[0]))), _(w, "isUpperCase", 1, (e) => /[A-Z]/.test(x(e[0]))), _(w, "isLowerCase", 1, (e) => /[a-z]/.test(x(e[0]))), _(w, "isWhitespace", 1, (e) => /\s/.test(x(e[0]))), _(w, "isAlphabetic", 1, (e) => /\p{L}/u.test(x(e[0]))), _(w, "toUpperCase", 1, (e) => x(e[0]).toUpperCase().charCodeAt(0)), _(w, "toLowerCase", 1, (e) => x(e[0]).toLowerCase().charCodeAt(0)), _(w, "charValue", 0, (e) => e[0]), _(w, "getNumericValue", 1, (e) => {
			const t = x(e[0]);
			return /[0-9]/.test(t) ? t.charCodeAt(0) - 48 : -1;
		}), _(w, "toString", 1, (e) => x(e[0]));
		const k = s("Throwable", {}), S = s("Error", {});
		S.superClass = k;
		const O = s("Exception", {});
		O.superClass = k;
		const C = s("RuntimeException", {});
		C.superClass = O;
		const A = (e, t) => {
			const n = s(e, {});
			return n.superClass = t, n;
		}, N = (e) => {
			e.natives.set("__construct/#", (t) => {
				const s = new E(e, {});
				return void 0 !== t[0] && null !== t[0] && s.set("message", "String", String(t[0])), s;
			});
		};
		for (const g of [
			k,
			S,
			O,
			C
		]) N(g);
		A("IllegalArgumentException", C), A("IllegalStateException", C), A("NullPointerException", C), A("ArithmeticException", C), A("NumberFormatException", t.get("IllegalArgumentException")), A("IndexOutOfBoundsException", C), A("ArrayIndexOutOfBoundsException", t.get("IndexOutOfBoundsException")), A("StringIndexOutOfBoundsException", t.get("IndexOutOfBoundsException")), A("ClassCastException", C), A("UnsupportedOperationException", C), A("NegativeArraySizeException", C), A("NoSuchElementException", C), A("ClassNotFoundException", O), A("StackOverflowError", S), A("OutOfMemoryError", S);
		for (const g of t.values()) g.isSubclassOf(k) && N(g);
		_(k, "getMessage", 0, (e) => {
			const t = e[0] && e[0].fields ? e[0].fields.get("message") : null;
			return t ? t.v : null;
		}), _(k, "getLocalizedMessage", 0, (e, t) => {
			const s = e[0] && e[0].fields ? e[0].fields.get("message") : null;
			return s ? s.v : null;
		}), _(k, "toString", 0, (e) => {
			const t = e[0] && e[0].cls ? e[0].cls.name : "Throwable", s = e[0] && e[0].fields ? e[0].fields.get("message") : null;
			return s && s.v ? `${t}: ${s.v}` : t;
		}), _(k, "printStackTrace", 0, (t, s) => {
			const n = t[0] && t[0].cls ? t[0].cls.name : "Throwable", i = t[0] && t[0].fields ? t[0].fields.get("message") : null;
			e.err.write((i && i.v ? `${n}: ${i.v}` : n) + P);
		}), _(k, "getCause", 0, (e) => {
			const t = e[0] && e[0].fields ? e[0].fields.get("cause") : null;
			return t ? t.v : null;
		}), _(k, "initCause", 1, (e) => (e[0].set("cause", "Throwable", e[1]), e[0]));
		const $ = (e, t, s) => {
			const n = new E(e, {});
			return n.native = "map" === t ? {
				kind: t,
				entries: /* @__PURE__ */ new Map()
			} : {
				kind: t,
				items: [],
				immutable: !!s
			}, n;
		}, I = (t) => {
			t && t.native && t.native.immutable && e.throwJava("UnsupportedOperationException");
		}, L = (e, t, s) => {
			const n = $(e, t, !0);
			if ("set" === t) for (const i of s) n.native.items.some((e) => K(e, i)) || n.native.items.push(i);
			else n.native.items = s.slice();
			return n;
		}, j = (t) => (t && t.native || e.throwJava("NullPointerException", "no se puede usar una colecciÃ³n nula"), Array.isArray(t.native.items) || e.throwJava("NullPointerException", "no es una colecciÃ³n iterable"), t.native.items), B = (t) => (t && t.native && t.native.entries || e.throwJava("NullPointerException", "no es un mapa"), t.native.entries), F = (e) => e instanceof E, K = (e, t) => F(e) && F(t) ? e === t : e === t || String(e) === String(t), R = s("ArrayList", { kind: "class" }), U = s("List", { kind: "interface" });
		R.interfaces = [U], U.superClass = r, t.set("List", U), t.set("ArrayList", R), t.set("LinkedList", R), R.natives.set("__construct/#", (e) => {
			const t = $(R, "list"), s = e && e[0];
			return s && s.native && Array.isArray(s.native.items) ? t.native.items = s.native.items.slice() : s && s.native && Array.isArray(s.native.elements) && (t.native.items = s.native.elements.slice()), t;
		}), U.natives.set("of/#", (e) => L(R, "list", e || [])), U.nativeReturns.set("of/#", "List");
		for (let g = 1; g <= 2; g++) _(R, "add", g, (e) => (I(e[0]), 2 === g ? j(e[0]).splice(e[1], 0, e[2]) : j(e[0]).push(e[1]), 2 !== g || null));
		R.natives.set("add/#", (e) => (I(e[0]), j(e[0]).push(e[1]), !0)), _(R, "get", 1, (t) => {
			const s = j(t[0]), n = t[1];
			return (n < 0 || n >= s.length) && e.throwJava("IndexOutOfBoundsException", `Index ${n} out of bounds for length ${s.length}`), s[n];
		}), _(R, "set", 2, (t) => {
			I(t[0]);
			const s = j(t[0]), n = t[1];
			(n < 0 || n >= s.length) && e.throwJava("IndexOutOfBoundsException", `Index ${n} out of bounds for length ${s.length}`);
			const i = s[n];
			return s[n] = t[2], i;
		}), _(R, "remove", 1, (t, s) => {
			I(t[0]);
			const n = j(t[0]);
			if (s && s.types && "int" === s.types[1]) return (t[1] < 0 || t[1] >= n.length) && e.throwJava("IndexOutOfBoundsException", `Index ${t[1]} out of bounds for length ${n.length}`), n.splice(t[1], 1)[0];
			const i = n.findIndex((e) => K(e, t[1]));
			return !(i < 0) && (n.splice(i, 1), !0);
		}), _(R, "size", 0, (e) => j(e[0]).length), _(R, "isEmpty", 0, (e) => 0 === j(e[0]).length), _(R, "contains", 1, (e) => j(e[0]).some((t) => K(t, e[1]))), _(R, "indexOf", 1, (e) => j(e[0]).findIndex((t) => K(t, e[1]))), _(R, "lastIndexOf", 1, (e) => {
			const t = j(e[0]);
			for (let s = t.length - 1; s >= 0; s--) if (K(t[s], e[1])) return s;
			return -1;
		}), _(R, "clear", 0, (e) => (I(e[0]), j(e[0]).length = 0, null)), _(R, "addAll", 1, (e) => {
			I(e[0]);
			const t = j(e[0]);
			for (const s of j(e[1])) t.push(s);
			return !0;
		}), _(R, "toString", 0, (e) => {
			return t = e[0], "[" + j(t).map((e) => null === e ? "null" : D(e, null)).join(", ") + "]";
			var t;
		}), _(R, "equals", 1, (e) => {
			if (!e[1] || !Array.isArray(e[1].native && e[1].native.items)) return !1;
			const t = j(e[0]), s = e[1].native.items;
			return t.length === s.length && t.every((e, t) => K(e, s[t]));
		}), _(R, "hashCode", 0, (e) => j(e[0]).length), z(R, "add", 1, "boolean"), z(R, "size", 0, "int"), z(R, "isEmpty", 0, "boolean"), z(R, "contains", 1, "boolean"), z(R, "indexOf", 1, "int"), z(R, "remove", 1, "boolean"), z(R, "toString", 0, "String"), z(R, "hashCode", 0, "int"), z(R, "equals", 1, "boolean");
		const H = s("HashSet", { kind: "class" }), Y = s("Set", { kind: "interface" });
		H.interfaces = [Y], Y.superClass = r, t.set("Set", Y), t.set("HashSet", H), t.set("LinkedHashSet", H), H.natives.set("__construct/#", (e) => {
			const t = $(H, "set"), s = e && e[0];
			if (s && s.native && Array.isArray(s.native.items)) for (const n of s.native.items) t.native.items.some((e) => K(e, n)) || t.native.items.push(n);
			return t;
		}), Y.natives.set("of/#", (e) => L(H, "set", e || [])), Y.nativeReturns.set("of/#", "Set"), _(H, "add", 1, (e) => {
			I(e[0]);
			const t = j(e[0]);
			return !t.some((t) => K(t, e[1])) && (t.push(e[1]), !0);
		}), _(H, "remove", 1, (e) => {
			I(e[0]);
			const t = j(e[0]), s = t.findIndex((t) => K(t, e[1]));
			return !(s < 0) && (t.splice(s, 1), !0);
		}), _(H, "contains", 1, (e) => j(e[0]).some((t) => K(t, e[1]))), _(H, "size", 0, (e) => j(e[0]).length), _(H, "isEmpty", 0, (e) => 0 === j(e[0]).length), _(H, "clear", 0, (e) => (I(e[0]), j(e[0]).length = 0, null)), _(H, "addAll", 1, (e) => {
			I(e[0]);
			const t = j(e[0]);
			for (const s of j(e[1])) t.some((e) => K(e, s)) || t.push(s);
			return !0;
		}), _(H, "toString", 0, (e) => {
			return t = e[0], "[" + j(t).map((e) => null === e ? "null" : D(e, null)).join(", ") + "]";
			var t;
		}), _(H, "hashCode", 0, (e) => j(e[0]).length), z(H, "add", 1, "boolean"), z(H, "remove", 1, "boolean"), z(H, "contains", 1, "boolean"), z(H, "size", 0, "int"), z(H, "isEmpty", 0, "boolean"), z(H, "toString", 0, "String"), z(H, "hashCode", 0, "int");
		const Q = s("HashMap", { kind: "class" }), ee = s("Map", { kind: "interface" });
		Q.interfaces = [ee], ee.superClass = r, t.set("Map", ee), t.set("HashMap", Q), t.set("LinkedHashMap", Q), t.set("TreeMap", Q);
		const te = s("Entry", { kind: "interface" });
		te.interfaces = [ee], t.set("Entry", te), _(te, "getKey", 0, (e) => e[0].native.key), _(te, "getValue", 0, (e) => e[0].native.value), _(te, "setValue", 1, (e) => (e[0].native.value = e[1], null)), _(te, "toString", 0, (e) => `${D(e[0].native.key, null)}=${D(e[0].native.value, null)}`), z(te, "getKey", 0, "Object"), z(te, "getValue", 0, "Object");
		Q.natives.set("__construct/#", (e) => $(Q, "map")), _(Q, "put", 2, (e) => {
			const t = B(e[0]);
			for (const [s, n] of t) if (K(s, e[1])) return t.set(s, e[2]), void 0 === n ? null : n;
			return t.set(e[1], e[2]), null;
		}), _(Q, "get", 1, (e) => {
			const t = B(e[0]);
			for (const [s, n] of t) if (K(s, e[1])) return n;
			return null;
		}), _(Q, "getOrDefault", 2, (e) => {
			const t = B(e[0]);
			for (const [s, n] of t) if (K(s, e[1])) return n;
			return e[2];
		}), _(Q, "containsKey", 1, (e) => {
			for (const t of B(e[0]).keys()) if (K(t, e[1])) return !0;
			return !1;
		}), _(Q, "containsValue", 1, (e) => {
			for (const t of B(e[0]).values()) if (K(t, e[1])) return !0;
			return !1;
		}), _(Q, "remove", 1, (e) => {
			const t = B(e[0]);
			for (const [s, n] of t) if (K(s, e[1])) return t.delete(s), n;
			return null;
		}), _(Q, "size", 0, (e) => B(e[0]).size), _(Q, "isEmpty", 0, (e) => 0 === B(e[0]).size), _(Q, "clear", 0, (e) => (B(e[0]).clear(), null)), _(Q, "keySet", 0, (e) => {
			const t = $(H, "set");
			return t.native.items = [...B(e[0]).keys()], t;
		}), _(Q, "values", 0, (e) => {
			const t = $(R, "list");
			return t.native.items = [...B(e[0]).values()], t;
		}), _(Q, "entrySet", 0, (e) => {
			const t = $(H, "set");
			return t.native.items = [...B(e[0])].map(([e, t]) => ((e, t) => {
				const s = new E(te, {});
				return s.native = {
					kind: "entry",
					key: e,
					value: t
				}, s;
			})(e, t)), t;
		}), _(Q, "toString", 0, (e) => ((e) => {
			const t = [];
			for (const [s, n] of B(e)) t.push(`${D(s, null)}=${null === n ? "null" : D(n, null)}`);
			return "{" + t.join(", ") + "}";
		})(e[0])), z(Q, "get", 1, "Object"), z(Q, "containsKey", 1, "boolean"), z(Q, "containsValue", 1, "boolean"), z(Q, "size", 0, "int"), z(Q, "isEmpty", 0, "boolean"), z(Q, "toString", 0, "String");
		const se = s("Arrays", {}), ne = (e, t) => e < t ? -1 : e > t ? 1 : 0, ie = (t, s) => {
			const n = t && t.native && Array.isArray(t.native.elements) ? t.native.elements : t;
			return Array.isArray(n) || e.throwJava("NullPointerException", "null"), n.sort(s || ne), null;
		};
		_(se, "sort", 1, (e) => ie(e[0], null)), _(se, "sort", 2, (t) => {
			return ie(t[0], (s = t[1]) && s.native ? (t, n) => Number(e.callMethod(s, "compare", [t, n])) : null);
			var s;
		}), _(se, "toString", 1, (e) => {
			const t = e[0] && e[0].native && Array.isArray(e[0].native.elements) ? e[0].native.elements : e[0];
			return Array.isArray(t) ? "[" + t.map((e) => "string" == typeof e ? e : D(e, null)).join(", ") + "]" : "null";
		}), _(se, "fill", 2, (t) => {
			const s = t[0], n = s && s.native && Array.isArray(s.native.elements) ? s.native.elements : s;
			Array.isArray(n) || e.throwJava("NullPointerException", "null");
			for (let e = 0; e < n.length; e++) n[e] = t[1];
			return null;
		}), _(se, "copyOf", 2, (t) => {
			const s = t[0], n = s && s.native && Array.isArray(s.native.elements) ? s.native.elements : s;
			Array.isArray(n) || e.throwJava("NullPointerException", "null");
			const i = n.slice(0, t[1]), r = n.length ? n[n.length - 1] : 0;
			for (; i.length < t[1];) i.push(r);
			return e.newArray("Object", i);
		}), _(se, "binarySearch", 2, (t) => {
			const s = t[0], n = s && s.native && Array.isArray(s.native.elements) ? s.native.elements : s;
			Array.isArray(n) || e.throwJava("NullPointerException", "null");
			let i = 0, r = n.length - 1;
			for (; i <= r;) {
				const e = i + r >> 1;
				if (ne(n[e], t[1]) < 0) i = e + 1;
				else {
					if (!(ne(n[e], t[1]) > 0)) return e;
					r = e - 1;
				}
			}
			return -(i + 1);
		}), z(se, "sort", 1, "void"), z(se, "toString", 1, "String"), z(se, "fill", 2, "void"), z(se, "copyOf", 2, "Object[]"), z(se, "binarySearch", 2, "int");
		const re = s("Collections", {});
		_(re, "sort", 1, (e) => (j(e[0]).sort(ne), null)), _(re, "reverse", 1, (e) => (j(e[0]).reverse(), null)), _(re, "max", 1, (e) => j(e[0]).reduce((e, t) => ne(t, e) > 0 ? t : e, null)), _(re, "min", 1, (e) => j(e[0]).reduce((e, t) => null === e || ne(t, e) < 0 ? t : e, null)), _(re, "unmodifiableList", 1, (e) => e[0]), _(re, "emptyList", 0, () => $(R, "list")), z(re, "sort", 1, "void"), z(re, "reverse", 1, "void"), z(re, "max", 1, "Object"), z(re, "min", 1, "Object");
		const ae = s("PrintStream", {}), oe = (t, s) => {
			if (0 === t.length) return void e.write(P);
			const i = [];
			for (let e = 0; e < t.length; e++) i.push(n(t[e], s.types[e]));
			e.write(i.join(" ") + P);
		};
		_(ae, "println", 0, (e, t) => oe(e, t));
		for (let g = 1; g <= 4; g++) _(ae, "println", g, (e, t) => oe(e, t));
		ae.natives.set("println/#", (e, t) => oe(e, t));
		const le = (t, s) => {
			const i = [];
			for (let e = 0; e < t.length; e++) i.push(n(t[e], s.types[e]));
			e.write(i.join(" "));
		};
		for (let g = 1; g <= 4; g++) _(ae, "print", g, (e, t) => le(e, t));
		ae.natives.set("print/#", (e, t) => le(e, t)), ae.natives.set("printf/#", (t, s) => e.write(T(String(t[0]), t.slice(1), i(t.slice(1), (s.types || []).slice(1))))), _(ae, "write", 1, (t) => e.write(n(t[0], null))), _(ae, "flush", 0, () => {}), _(ae, "close", 0, () => {});
		const ce = s("System", {}), he = new E(ae, {}), pe = new E(ae, {});
		J(ce, "out", "PrintStream", he), J(ce, "err", "PrintStream", pe), J(ce, "in", "Object", null), _(ce, "currentTimeMillis", 0, () => 0), _(ce, "nanoTime", 0, () => 0), _(ce, "lineSeparator", 0, () => P), _(ce, "getProperty", 1, (e) => "line.separator" === e[0] ? P : null), _(ce, "exit", 0, () => {});
		for (const [g, b] of [
			["Integer", "int"],
			["Long", "long"],
			["Double", "double"],
			["Float", "float"],
			["Short", "short"],
			["Byte", "byte"]
		]) {
			const e = t.get(g);
			e && (_(e, "equals", 1, (e) => e[0] === e[1]), _(e, "compareTo", 1, (e) => e[0] < e[1] ? -1 : e[0] > e[1] ? 1 : 0), _(e, "toString", 0, (e, t) => D(e[0], t.types[0] || b)), _(e, "hashCode", 0, (e) => 0 | Math.trunc(e[0])));
		}
		t.get("Boolean").natives.set("equals/1", (e) => e[0] === e[1]), t.get("Boolean").natives.set("toString/0", (e) => String(e[0])), z(a, "length", 0, "int"), z(a, "charAt", 1, "char"), z(a, "indexOf", 1, "int"), z(a, "indexOf", 2, "int"), z(a, "lastIndexOf", 1, "int"), z(a, "compareTo", 1, "int"), z(a, "compareToIgnoreCase", 1, "int"), z(a, "hashCode", 0, "int"), z(a, "isEmpty", 0, "boolean"), z(a, "isBlank", 0, "boolean"), z(a, "contains", 1, "boolean"), z(a, "startsWith", 1, "boolean"), z(a, "endsWith", 1, "boolean"), z(a, "equals", 1, "boolean"), z(a, "equalsIgnoreCase", 1, "boolean"), z(a, "matches", 1, "boolean"), z(a, "split", 1, "String[]"), z(a, "split", 2, "String[]"), z(a, "substring", 1, "String"), z(a, "substring", 2, "String"), z(a, "toUpperCase", 0, "String"), z(a, "toLowerCase", 0, "String"), z(a, "trim", 0, "String"), z(a, "strip", 0, "String"), z(a, "stripLeading", 0, "String"), z(a, "stripTrailing", 0, "String"), z(a, "concat", 1, "String"), z(a, "repeat", 1, "String"), z(a, "replace", 2, "String"), z(a, "replaceAll", 2, "String"), z(a, "toString", 0, "String"), z(a, "valueOf", 1, "String"), z(a, "formatted", "#", "String"), z(a, "intern", 0, "String"), z(h, "toString", 0, "String"), z(h, "length", 0, "int"), z(h, "charAt", 1, "char"), z(h, "indexOf", 1, "int"), z(h, "append", "#", "StringBuilder"), z(h, "insert", 2, "StringBuilder"), z(h, "reverse", 0, "StringBuilder"), z(h, "deleteCharAt", 1, "StringBuilder"), z(h, "setLength", 1, "void");
		for (const g of [
			"sqrt",
			"cbrt",
			"pow",
			"floor",
			"ceil",
			"log",
			"log10",
			"exp",
			"sin",
			"cos",
			"tan",
			"atan",
			"atan2",
			"hypot",
			"random"
		]) z(u, g, "#", "double");
		return z(u, "round", 1, "long"), z(u, "rint", 1, "double"), z(u, "abs", 1, "int"), z(u, "max", 2, "int"), z(u, "min", 2, "int"), z(u, "signum", 1, "int"), z(u, "toIntExact", 1, "int"), z(u, "floorDiv", 2, "int"), z(u, "floorMod", 2, "int"), z(u, "addExact", 2, "int"), z(u, "subtractExact", 2, "int"), z(u, "multiplyExact", 2, "int"), z(f, "parseInt", 1, "int"), z(f, "parseInt", 2, "int"), z(f, "valueOf", 1, "Integer"), z(f, "toString", 1, "String"), z(f, "toBinaryString", 1, "String"), z(f, "toHexString", 1, "String"), z(f, "toOctalString", 1, "String"), z(f, "compare", 2, "int"), z(f, "sum", 2, "int"), z(f, "max", 2, "int"), z(f, "min", 2, "int"), z(f, "bitCount", 1, "int"), z(d, "parseLong", 1, "long"), z(d, "valueOf", 1, "Long"), z(d, "toString", 1, "String"), z(d, "toBinaryString", 1, "String"), z(d, "toHexString", 1, "String"), z(d, "compare", 2, "int"), z(d, "sum", 2, "long"), z(d, "max", 2, "long"), z(d, "min", 2, "long"), z(m, "parseDouble", 1, "double"), z(m, "valueOf", 1, "Double"), z(m, "isNaN", 1, "boolean"), z(m, "compare", 2, "int"), z(m, "toString", 1, "String"), z(m, "doubleToLongBits", 1, "long"), z(y, "parseFloat", 1, "float"), z(y, "toString", 1, "String"), z(v, "parseBoolean", 1, "boolean"), z(v, "valueOf", 1, "Boolean"), z(v, "toString", 1, "String"), z(v, "compare", 2, "int"), z(w, "isDigit", 1, "boolean"), z(w, "isLetter", 1, "boolean"), z(w, "isLetterOrDigit", 1, "boolean"), z(w, "isUpperCase", 1, "boolean"), z(w, "isLowerCase", 1, "boolean"), z(w, "isWhitespace", 1, "boolean"), z(w, "isAlphabetic", 1, "boolean"), z(w, "toUpperCase", 1, "char"), z(w, "toLowerCase", 1, "char"), z(w, "charValue", 0, "char"), z(w, "getNumericValue", 1, "int"), z(w, "toString", 1, "String"), z(w, "compare", 2, "int"), z(w, "digit", 2, "int"), z(w, "forDigit", 2, "char"), z(k, "getMessage", 0, "String"), z(k, "getLocalizedMessage", 0, "String"), z(k, "toString", 0, "String"), z(k, "getCause", 0, "Throwable"), z(r, "toString", 0, "String"), z(r, "equals", 1, "boolean"), z(r, "hashCode", 0, "int"), {
			classes: t,
			exceptionClass: O,
			objectClass: r,
			stringClass: a,
			lineSeparator: P
		};
	}
	function Z(e, t, s) {
		const n = e.split(W(t));
		if (s > 0) return n.slice(0, s);
		const i = n.slice();
		for (; i.length && "" === i[i.length - 1];) i.pop();
		return i;
	}
	function X(e, t, s, n) {
		const i = (t) => e.throwJava("NumberFormatException", `For input string: "${t}"`), r = String(t).trim(), a = void 0 === n ? 10 : n;
		"" !== r && /^[+-]?[0-9a-zA-Z]+$/.test(r) || i(r);
		const o = "-" === r[0], l = /^[+-]/.test(r) ? r.slice(1) : r;
		if (10 !== n || /^\d+$/.test(l) || i(r), a < 2 || a > 36) throw new Error(`radix fuera de rango: ${a}`);
		const c = parseInt(l, a);
		return Number.isNaN(c) && i(r), 10 === a && "int" === s && (c > 2147483647 || c < -2147483648) && i(r), o ? -c : c;
	}
	function G(e, t) {
		const s = (t) => e.throwJava("NumberFormatException", `For input string: "${t}"`), n = String(t).trim();
		"" !== n && /^[+-]?((\d+\.?\d*)|(\.\d+))([eE][+-]?\d+)?[fFdD]?$/.test(n) || s(n);
		const i = Number(n.replace(/[fFdD]$/, ""));
		return Number.isNaN(i) && s(n), i;
	}
	const Y = /* @__PURE__ */ new Set([
		"+",
		"-",
		"*",
		"/",
		"%"
	]), Q = /* @__PURE__ */ new Set([
		"<",
		">",
		"<=",
		">="
	]), ee = /* @__PURE__ */ new Set(["==", "!="]), te = /* @__PURE__ */ new Set([
		"&",
		"|",
		"^"
	]), se = /* @__PURE__ */ new Set([
		"<<",
		">>",
		">>>"
	]), ne = {
		string: "String",
		int: "int",
		long: "long",
		short: "short",
		byte: "byte",
		double: "double",
		float: "float",
		char: "char",
		boolean: "boolean",
		null: "null"
	};
	var ie = class {
		constructor(e = {}) {
			this.stepLimit = e.stepLimit || 8e6, this.stdout = "", this.stderr = "", this.steps = 0, this.depth = 0, this.currentLine = 0, this.currentSource = "", this.seed = void 0 === e.seed ? 123456789 : e.seed, this.classes = /* @__PURE__ */ new Map(), this.staticEnv = new N(null), this.identityIds = /* @__PURE__ */ new Map(), this.nextIdentity = 1089970;
			const t = this;
			this.host = {
				write: (e) => {
					t.stdout += e;
				},
				error: (e) => {
					t.stderr += e;
				},
				toString: (e) => t.valueToString(e),
				equals: (e, s) => t.valuesEqual(e, s),
				identityHash: (e) => t.identity(e),
				random: () => t.nextRandom(),
				throwJava: (e, s) => t.throwJava(e, s),
				callMethod: (e, s, n) => t.callFromHost(e, s, n),
				newArray: (e, s) => t.arrayFrom(e, s)
			}, this.stdlib = H(this.host);
			for (const [s, n] of this.stdlib.classes) this.classes.set(s, n);
			this.classes.set("void", new M("void", { kind: "class" }));
		}
		run(e) {
			this.currentSource = String(null == e ? "" : e), this.stdout = "", this.stderr = "", this.steps = 0, this.depth = 0;
			try {
				const e = function(e) {
					return new m(e).parseCompilationUnit();
				}(this.currentSource);
				return 0 === e.types.length || (this.link(e), this.invokeMain()), {
					ok: !0,
					stdout: this.stdout,
					stderr: this.stderr
				};
			} catch (t) {
				return this.toFailure(t);
			}
		}
		toFailure(i) {
			if (i instanceof e) return {
				ok: !1,
				stdout: this.stdout,
				stderr: this.stderr,
				error: {
					kind: "compilacion",
					message: i.format(),
					line: i.line,
					col: i.col
				}
			};
			if (i instanceof t) {
				const e = i.javaObject, t = e.cls ? e.cls.name : "Throwable", s = e.get("message"), n = this.currentLine > 0 ? ` (línea ${this.currentLine})` : "", r = s ? `${t}: ${s}` : t;
				return {
					ok: !1,
					stdout: this.stdout,
					stderr: this.stderr,
					error: {
						kind: "excepcion",
						message: `Exception in thread "main" java.lang.${r}${n}`,
						line: this.currentLine,
						col: 0
					}
				};
			}
			return i instanceof s ? {
				ok: !1,
				stdout: this.stdout,
				stderr: this.stderr,
				error: {
					kind: "motor",
					message: i.message,
					line: this.currentLine,
					col: 0
				}
			} : i instanceof n ? {
				ok: !1,
				stdout: this.stdout,
				stderr: this.stderr,
				error: {
					kind: "motor",
					message: `Error del motor: ${i.message}`,
					line: this.currentLine,
					col: 0
				}
			} : {
				ok: !1,
				stdout: this.stdout,
				stderr: this.stderr,
				error: {
					kind: "motor",
					message: `Error del motor: ${i && i.message ? i.message : String(i)}`,
					line: this.currentLine,
					col: 0,
					detail: i && i.constructor ? `(${i.constructor.name})` : ""
				}
			};
		}
		link(e) {
			this.unit = e;
			const t = [], s = (e) => {
				t.push(e);
				for (const t of e.methods || []) t.isNestedType && t.decl && s(t.decl);
			};
			for (const n of e.types) s(n);
			this.simplifyTypeNames(t), this.defineTypes(t);
		}
		simplifyTypeNames(e) {
			const t = /* @__PURE__ */ new Set(), s = (e) => {
				if (e && "object" == typeof e && !t.has(e)) if (t.add(e), Array.isArray(e)) e.forEach(s);
				else {
					for (const t of ["name", "superName"]) {
						const s = e[t];
						if ("string" != typeof s || !s.includes(".")) continue;
						const n = s.slice(s.lastIndexOf(".") + 1);
						this.classes.has(n) && (e[t] = n);
					}
					for (const t of Object.values(e)) s(t);
				}
			};
			for (const n of e) s(n);
		}
		defineTypes(t, s = {}) {
			for (const e of t) {
				const t = new M(e.name, {
					kind: e.kind,
					modifiers: e.modifiers,
					abstract: e.modifiers.includes("abstract") || "interface" === e.kind,
					line: e.line
				});
				t.decl = e, t.isLocal = !!s.local, this.classes.set(e.name, t);
			}
			for (const n of t) {
				const t = this.classes.get(n.name);
				if (n.superName) {
					const s = this.classes.get(n.superName.name);
					if (!s) throw new e(`cannot find symbol\n  symbol: class ${n.superName.name}`, n.line, n.col);
					t.superClass = s;
				} else "class" === n.kind && "Object" !== n.name && (t.superClass = this.stdlib.objectClass);
				t.interfaces = (n.interfaces || []).map((e) => this.classes.get(e.name)).filter(Boolean);
			}
			for (const e of t) this.declareMembers(e, this.classes.get(e.name));
			for (const e of t) {
				if ("record" !== e.kind) continue;
				const t = this.classes.get(e.name);
				for (const s of e.components) t.fields.set(s.name, {
					name: s.name,
					type: s.type,
					dims: 0,
					isStatic: !1,
					isFinal: !0,
					init: null
				}), t.accessors.set(s.name, s.type), t.methodsNamed(s.name).length || t.addMethod({
					name: s.name,
					params: [],
					returnType: s.type,
					body: null,
					modifiers: ["public"],
					isAccessor: !0,
					component: s.name
				});
				t.methodsNamed("<init>").length || t.addMethod({
					name: "<init>",
					params: e.components.map((e) => ({
						name: e.name,
						type: e.type,
						varargs: !1,
						isFinal: !0
					})),
					returnType: { name: "void" },
					body: null,
					modifiers: ["public"],
					isConstructor: !0,
					implicit: !0,
					recordComponents: e.components
				});
			}
			for (const e of t) "enum" === e.kind && this.buildEnum(e);
			for (const e of t) {
				const t = this.classes.get(e.name);
				this.staticEnv.staticClass = t, this.staticEnv.thisObj = null, this.initStaticFields(t, e.fields);
				for (const s of e.staticInit || []) this.execStatement(s, this.staticEnv);
			}
		}
		declareMembers(e, t) {
			for (const s of e.fields) {
				const e = {
					name: s.name,
					type: s.type,
					dims: s.dims || 0,
					isStatic: (s.modifiers || []).includes("static"),
					isFinal: (s.modifiers || []).includes("final"),
					init: s.init,
					line: s.line,
					col: s.col
				};
				e.isStatic ? t.staticFields.set(s.name, {
					t: this.typeLabel(e.type, e.dims),
					v: this.defaultValue(e)
				}) : t.fields.has(s.name) || t.fields.set(s.name, e);
			}
			for (const s of e.methods) {
				if (s.isNestedType) continue;
				if (s.isInitializer) {
					t.instanceInit || (t.instanceInit = []), t.instanceInit.push(...s.body || []);
					continue;
				}
				const n = {
					name: s.isConstructor || s.isCompactConstructor ? "<init>" : s.name,
					params: (s.params || []).map((e) => ({
						name: e.name,
						type: e.type,
						varargs: !!e.varargs,
						isFinal: (e.modifiers || []).includes("final")
					})),
					returnType: s.returnType,
					body: s.body,
					modifiers: s.modifiers || [],
					isStatic: (s.modifiers || []).includes("static"),
					isAbstract: null === s.body,
					isConstructor: !!s.isConstructor || !!s.isCompactConstructor,
					isCompactConstructor: !!s.isCompactConstructor,
					isInitializer: !1,
					recordName: e.name,
					line: s.line || e.line,
					col: s.col || e.col
				};
				s.isCompactConstructor && (n.params = (e.components || []).map((e) => ({
					name: e.name,
					type: e.type,
					varargs: !1,
					isFinal: !0
				}))), t.addMethod(n);
			}
			if (!t.methodsNamed("<init>").length && "class" === e.kind && "Object" !== e.name && !e.methods.some((e) => e.isConstructor || e.isCompactConstructor)) {
				const e = this.findInheritedConstructor(t, []);
				t.addMethod({
					name: "<init>",
					params: [],
					returnType: { name: "void" },
					body: null,
					modifiers: ["public"],
					isConstructor: !0,
					implicit: !0,
					superArgs: e
				});
			}
		}
		findInheritedConstructor(e, t) {
			let s = e.superClass;
			for (; s;) {
				const e = s.methodsNamed("<init>");
				if (e.length) {
					const s = e.find((e) => e.params.length === t.length);
					if (s) return s;
				}
				s = s.superClass;
			}
			return null;
		}
		buildEnum(e) {
			const t = this.classes.get(e.name), s = [];
			e.enumConstants.forEach((n, i) => {
				const r = new E(t, {});
				r.native = {
					ordinal: i,
					enumName: n.name
				}, r.set("name", "String", n.name), r.set("ordinal", "int", i), t.staticFields.set(n.name, {
					t: e.name,
					v: r
				}), t.enumConstants.push(r), s.push(r);
			}), t.enumValues = s;
			const n = (e) => e && e.native && e.native.ordinal || 0, i = (e) => e && e.native && e.native.enumName || String(e);
			t.natives.set("ordinal/0", (e) => n(e[0])), t.natives.set("name/0", (e) => i(e[0])), t.natives.set("compareTo/1", (e) => n(e[0]) - n(e[1])), t.natives.set("equals/1", (e) => e[0] === e[1]), t.natives.set("hashCode/0", (e) => n(e[0])), t.natives.set("toString/0", (e) => i(e[0])), t.natives.set("getDeclaringClass/0", () => t), t.nativeReturns.set("ordinal/0", "int"), t.nativeReturns.set("name/0", "String"), t.nativeReturns.set("compareTo/1", "int"), t.nativeReturns.set("equals/1", "boolean"), t.nativeReturns.set("hashCode/0", "int"), t.nativeReturns.set("toString/0", "String"), t.nativeReturns.set("getDeclaringClass/0", "Class");
			const r = this.pickMethod(t, "<init>", 0, [], !1);
			if (r) for (const a of s) new N(this.staticEnv).staticClass = t, this.invokeUserMethod(r, a, [], [], t);
		}
		initStaticFields(e, t) {
			for (const s of t) if ((s.modifiers || []).includes("static") && s.init) {
				const t = e.staticFields.get(s.name);
				if (!t) continue;
				t.v = this.evalVarInit(s.init, t.t, this.staticEnv);
			}
		}
		invokeMain() {
			let t = null;
			if (this.classes.has("Mision") && (t = this.classes.get("Mision")), !t) {
				for (const e of this.classes.values()) if (e.decl && this.findMainMethod(e)) {
					t = e;
					break;
				}
			}
			if (!t) throw new e("no se encontró el método main. Crea una clase Mision con public static void main(String[] args)");
			const s = this.findMainMethod(t);
			if (!s) throw new e(`no se encontró el método main en ${t.name}. Añade: public static void main(String[] args)`);
			const n = this.newArray("String", 0);
			this.invokeUserMethod(s, null, [n], ["String[]"], t);
		}
		findMainMethod(e) {
			const t = e.methodsNamed("main");
			return t.length && (t.find((e) => e.isStatic && 1 === e.params.length) || t[0]) || null;
		}
		typeLabel(e, t) {
			let s = e.isVar ? "var" : e.name;
			const n = (e.dims || 0) + (t || 0);
			for (let i = 0; i < n; i++) s += "[]";
			return s;
		}
		defaultValue(e) {
			const t = this.typeLabel(e.type, e.dims);
			if (e.dims > 0 || (e.type.dims || 0) > 0) return null;
			switch (t) {
				case "int":
				case "long":
				case "short":
				case "byte":
				case "char":
				case "double":
				case "float": return 0;
				case "boolean": return !1;
				default: return null;
			}
		}
		valueToString(e, t) {
			const s = D(e, t);
			if (null !== s) return s;
			if (!A(e)) return String(e);
			const n = e.cls;
			if (n && "array" === n.kind) {
				const t = e.native && e.native.elemType ? e.native.elemType : "Object";
				return `[${{
					int: "I",
					long: "J",
					double: "D",
					float: "F",
					char: "C",
					boolean: "Z",
					byte: "B",
					short: "S"
				}[t] || "L" + (t || "java.lang.Object").replace(/^java\.lang\./, "").split(".").join(".")}@${this.identity(e).toString(16)}`;
			}
			const i = this.findUserMethod(n, "toString", 0);
			if (i) {
				const t = this.depth, s = this.invokeUserMethod(i, e, [], [], n);
				return this.depth = t, D(s, "String") ?? String(s);
			}
			if (n && "record" === n.kind && n.accessors.size) {
				const t = [];
				for (const [s, i] of n.accessors) t.push(`${s}=${this.valueToString(e.get(s), i)}`);
				return `${n.name}[${t.join(", ")}]`;
			}
			if (A(e) && e.native && "string" == typeof e.native.enumName) return e.native.enumName;
			const r = this.nativeMethod(n, "toString", 0);
			if (r) {
				const t = r([e], { types: [n ? n.name : "Object"] });
				return D(t, "String") ?? String(t);
			}
			return `${n ? n.name : "Object"}@${this.identity(e).toString(16)}`;
		}
		valuesEqual(e, t) {
			if (e === t) return !0;
			if (null === e || null === t) return !1;
			const s = typeof e;
			if (s !== typeof t) return !1;
			if ("string" === s || "number" === s || "boolean" === s) return e === t;
			if (!A(e) || !A(t)) return !1;
			if (e.cls === t.cls) {
				const s = this.findUserMethod(e.cls, "equals", 1);
				if (s) return Boolean(this.invokeUserMethod(s, e, [t], [t.cls.name], e.cls));
			}
			if (e.cls && e.cls.accessors && e.cls.accessors.size) {
				for (const [s] of e.cls.accessors) if (!this.valuesEqual(e.get(s), t.get ? t.get(s) : null)) return !1;
				return e.cls === t.cls;
			}
			return !1;
		}
		identity(e) {
			if (!A(e)) return 0;
			let t = this.identityIds.get(e);
			return void 0 === t && (t = this.nextIdentity, this.nextIdentity = this.nextIdentity + 127959 & 2147483647, this.identityIds.set(e, t)), t;
		}
		nextRandom() {
			let e = 0 | this.seed;
			return e ^= e << 13, e ^= e >>> 17, e ^= e << 5, this.seed = 0 | e, (e >>> 0) % 1e6 / 1e6;
		}
		throwJava(e, s) {
			const i = new E(this.classes.get(e) || this.stdlib.classes.get("RuntimeException"), {});
			throw null != s && i.set("message", "String", String(s)), new t(i);
		}
		callFromHost(e, t, s) {
			const i = this.classes.get(e && e.cls ? e.cls.name : "Object"), r = this.findUserMethod(i, t, s.length);
			if (!r) throw new n(`el método nativo no encuentra ${t}(${s.length})`);
			return this.invokeUserMethod(r, e, s, s.map(() => "Object"), i);
		}
		tick(e) {
			if (this.steps++, !(1023 & this.steps) && this.steps > this.stepLimit) throw new s(this.stepLimit);
			e && (this.currentLine = e);
		}
		execBlock(e, t) {
			const s = t.child();
			for (const n of e.body) this.execStatement(n, s);
		}
		execStatement(e, t) {
			switch (this.tick(e.line), e.type) {
				case "Block": return this.execBlock(e, t);
				case "Empty": return;
				case "ExprStmt":
					this.eval(e.expr, t);
					return;
				case "LocalVarDecl":
					for (const s of e.decls) {
						let e = this.typeLabel(s.type);
						const n = s.init ? this.evalVarInit(s.init, e, t) : this.zeroFor(e);
						s.type.isVar && s.init && (e = this.inferType(s.init, t)), t.declare(s.name, e, n, (s.modifiers || []).includes("final"));
					}
					return;
				case "LocalType": {
					const t = e.decl;
					this.classes.has(t.name) || this.defineTypes([t], { local: !0 });
					return;
				}
				case "If":
					this.evalCondition(e.cond, t) ? this.execStatement(e.then, t) : e.otherwise && this.execStatement(e.otherwise, t);
					return;
				case "While": {
					const n = e.labels || [];
					try {
						for (; this.evalCondition(e.cond, t);) try {
							this.execStatement(e.body, t);
						} catch (s) {
							if (s instanceof $) {
								if (s.label && !n.includes(s.label)) throw s;
								break;
							}
							if (s instanceof I) {
								if (s.label && !n.includes(s.label)) throw s;
								continue;
							}
							throw s;
						}
					} catch (s) {
						if (s instanceof $) {
							if (s.label && !n.includes(s.label)) throw s;
							return;
						}
						throw s;
					}
					return;
				}
				case "DoWhile": {
					const n = e.labels || [];
					try {
						do
							try {
								this.execStatement(e.body, t);
							} catch (s) {
								if (s instanceof $) {
									if (s.label && !n.includes(s.label)) throw s;
									break;
								}
								if (s instanceof I) {
									if (s.label && !n.includes(s.label)) throw s;
									continue;
								}
								throw s;
							}
						while (this.evalCondition(e.cond, t));
					} catch (s) {
						if (s instanceof $) {
							if (s.label && !n.includes(s.label)) throw s;
							return;
						}
						throw s;
					}
					return;
				}
				case "For": {
					const n = t.child();
					if (e.init) if ("LocalVarDecl" === e.init.type) this.execStatement(e.init, n);
					else for (const t of e.init.exprs) this.eval(t, n);
					const i = e.labels || [];
					try {
						for (; this.tick(e.line), !e.cond || this.evalCondition(e.cond, n);) {
							let t = !1;
							try {
								this.execStatement(e.body, n);
							} catch (s) {
								if (s instanceof $) {
									if (s.label && !i.includes(s.label)) throw s;
									t = !0;
								} else {
									if (!(s instanceof I)) throw s;
									if (s.label && !i.includes(s.label)) throw s;
								}
							}
							for (const s of e.updates) this.eval(s, n);
							if (t) break;
						}
					} catch (s) {
						if (s instanceof $) {
							if (s.label && !i.includes(s.label)) throw s;
							return;
						}
						throw s;
					}
					return;
				}
				case "ForEach": {
					const n = this.eval(e.iterable, t), i = this.iterate(n, e.line);
					let r = e.varType && e.varType.isVar ? this.inferType(e.iterable, t) : this.typeLabel(e.varType || {
						name: "Object",
						dims: 0,
						isVar: !1
					});
					r.endsWith("[]") && (r = r.slice(0, -2));
					const a = e.labels || [];
					for (const o of i) {
						this.tick(e.line);
						const n = t.child();
						n.declare(e.name, r, o);
						try {
							this.execStatement(e.body, n);
						} catch (s) {
							if (s instanceof $) {
								if (s.label && !a.includes(s.label)) throw s;
								return;
							}
							if (s instanceof I) {
								if (s.label && !a.includes(s.label)) throw s;
								continue;
							}
							throw s;
						}
					}
					return;
				}
				case "Return": throw new L(e.expr ? this.eval(e.expr, t) : null);
				case "Break": throw new $(e.label);
				case "Continue": throw new I(e.label);
				case "Throw": throw this.makeThrow(this.eval(e.expr, t));
				case "Try": return this.execTry(e, t);
				case "Sync": return this.eval(e.expr, t), this.execStatement(e.body, t);
				case "Labeled":
					(e.body.labels = e.body.labels || []).push(e.label);
					try {
						this.execStatement(e.body, t);
					} catch (s) {
						if ((s instanceof $ || s instanceof I) && s.label === e.label) return void 0;
						throw s;
					}
					return;
				case "Assert":
					if (!this.evalCondition(e.cond, t)) {
						const s = e.msg ? D(this.eval(e.msg, t), "String") : "assertion failed";
						this.throwJava("IllegalStateException", s);
					}
					return;
				case "Switch": return this.execSwitch(e, t);
				default: throw new n(`sentencia no soportada: ${e.type}`);
			}
		}
		execTry(e, s) {
			const n = s.child();
			for (const t of e.resources) {
				const e = t.init ? this.eval(t.init, n) : null;
				n.declare(t.name, this.typeLabel(t.type), e);
			}
			const i = () => {
				e.finallyBlock && this.execBlock(e.finallyBlock, n);
			};
			let r = null, a = !1;
			try {
				this.execBlock(e.block, n);
			} catch (o) {
				if (o instanceof L || o instanceof $ || o instanceof I || o instanceof j) throw i(), o;
				for (const n of e.catches) {
					const e = n.types.map((e) => this.classes.get(e.name)).filter(Boolean);
					if (o instanceof t && e.some((e) => o.javaObject.cls && o.javaObject.cls.isSubclassOf(e))) {
						const e = s.child();
						e.declare(n.name, n.types[0].name, o.javaObject);
						try {
							this.execBlock(n.body, e);
						} catch (l) {
							r = l;
						}
						a = !0;
						break;
					}
				}
				a || (r = o);
			}
			if (i(), r) throw r;
		}
		makeThrow(e) {
			return e instanceof t ? e : A(e) && e.cls ? new t(e) : (this.throwJava("IllegalStateException", `no se puede lanzar el valor: ${String(e)}`), null);
		}
		execSwitch(e, t) {
			const s = this.eval(e.selector, t), n = A(s) ? s.cls : null, i = this.findClause(e, s, n, t);
			if (!(i < 0)) try {
				for (let s = i; s < e.clauses.length; s++) {
					const n = e.clauses[s];
					for (const e of n.body) this.execStatement(e, t);
					if (n.arrow) return;
				}
			} catch (r) {
				if (r instanceof $) {
					if (r.label) throw r;
					return;
				}
				throw r;
			}
		}
		findClause(e, t, s, n) {
			let i = -1;
			for (let r = 0; r < e.clauses.length; r++) {
				const a = e.clauses[r];
				if (a.isDefault) i < 0 && (i = r);
				else for (const e of a.labels) {
					const i = this.evalCaseLabel(e, n, s);
					if (this.caseMatches(t, i)) return r;
				}
			}
			return i;
		}
		evalCaseLabel(e, t, s) {
			if ("Name" === e.type && s) {
				const t = s.staticFields.get(e.name);
				if (t) return t.v;
			}
			return this.eval(e, t);
		}
		caseMatches(e, t) {
			return null === t || null === e ? t === e : "string" == typeof e || "string" == typeof t ? e === t : A(e) && e.native && "number" == typeof e.native.ordinal ? A(t) && t.native && t.native.ordinal === e.native.ordinal : e === t;
		}
		eval(t, s) {
			switch (this.tick(t.line), t.type) {
				case "Literal": return t.value;
				case "Name": {
					const n = s.lookup(t.name);
					if (n) return n.v;
					const i = this.lookupField(t.name, s);
					if (i) return i.value;
					if (this.classes.has(t.name)) return this.classes.get(t.name);
					throw new e(`cannot find symbol\n  symbol: variable ${t.name}`, t.line, t.col);
				}
				case "Paren": return this.eval(t.expr, s);
				case "FieldAccess": return this.readField(t, s);
				case "MethodCall": return this.evalCall(t, s);
				case "ArrayAccess": {
					const e = this.eval(t.array, s), n = this.eval(t.index, s), i = this.arrayElements(e, t.line), r = Math.trunc(n);
					return (r < 0 || r >= i.length) && this.throwJava("ArrayIndexOutOfBoundsException", `Index ${r} out of bounds for length ${i.length}`), i[r];
				}
				case "Unary": return this.evalUnary(t, s);
				case "Binary": return this.evalBinary(t, s);
				case "Assign": return this.evalAssign(t, s);
				case "Ternary": return this.evalCondition(t.cond, s) ? this.eval(t.then, s) : this.eval(t.otherwise, s);
				case "Cast": return this.evalCast(t, s);
				case "InstanceOf": return this.evalInstanceOf(t, s);
				case "This":
				case "Super": return s.thisObj;
				case "ThisQualified": return this.eval(t.target, s);
				case "New": return this.evalNew(t, s);
				case "NewArray": return this.evalNewArray(t, s);
				case "ArrayInit": return t.items.map((e) => this.eval(e, s));
				case "SwitchExpr": return this.evalSwitchExpr(t, s);
				case "ClassLiteral": return t.targetType ? `${t.targetType.name}.class` : t.name ? `${t.name}.class` : "Object.class";
				case "Lambda": return this.makeLambda(t, s);
				case "MethodRef": return this.makeMethodRef(t, s);
				default: throw new n(`expresión no soportada: ${t.type}`);
			}
		}
		evalCondition(e, t) {
			const s = this.eval(e, t);
			return Boolean(s);
		}
		evalSwitchExpr(e, t) {
			const s = this.eval(e.selector, t), n = A(s) ? s.cls : null, i = this.findClause(e, s, n, t);
			i < 0 && this.throwJava("IllegalStateException", "switch expression does not cover all possible input values");
			const r = e.clauses[i];
			if (r.value) return this.eval(r.value, t);
			for (const o of r.body || []) try {
				this.execStatement(o, t);
			} catch (a) {
				if (a instanceof j) return a.value;
				throw a;
			}
			return null;
		}
		evalVarInit(e, t, s) {
			if ("ArrayInit" === e.type) return this.arrayInitValue(e, t, s);
			const n = this.eval(e, s);
			return this.coerce(n, this.inferType(e, s), t);
		}
		arrayInitValue(e, t, s) {
			const n = t.endsWith("[]") ? t.slice(0, -2) : "Object", i = e.items.map((e) => {
				if ("ArrayInit" === e.type) return this.arrayInitValue(e, n, s);
				const t = this.eval(e, s);
				return n.endsWith("[]") && Array.isArray(t) && !A(t) ? this.arrayFrom(n.slice(0, -2), t) : t;
			});
			return this.arrayFrom(n, i);
		}
		zeroFor(e) {
			switch (e) {
				case "int":
				case "long":
				case "short":
				case "byte":
				case "char":
				case "double":
				case "float": return 0;
				case "boolean": return !1;
				default: return null;
			}
		}
		coerce(e, t, s) {
			if (A(e) && e.native && "lambda" === e.native.kind && s) {
				const t = this.classes.get(s);
				t && t !== e.cls && t.isFunctional && this.adoptLambda(e, t);
			}
			return s && s.endsWith("[]") && Array.isArray(e) && !A(e) ? this.arrayFrom(s.slice(0, -2), e) : s && "var" !== s && t !== s ? null == e ? null : s.endsWith("[]") ? Array.isArray(e) && !A(e) ? this.arrayFrom(s.slice(0, -2), e) : e : R(s) && "number" == typeof e ? V(e, s) : "double" !== s && "float" !== s || "number" != typeof e ? "boolean" === s && "boolean" == typeof e ? e : "String" === s && "char" === t && "number" == typeof e ? String.fromCharCode(e) : e : "float" === s ? Math.fround(e) : e : "number" == typeof e && R(s) ? V(e, s) : "number" == typeof e && "float" === s ? Math.fround(e) : e;
		}
		lookupField(e, t) {
			let s = t.thisObj;
			for (; s;) {
				let t = s.cls;
				for (; t;) {
					const n = t.fields.get(e);
					if (n) {
						const t = s.fields.get(e);
						return {
							value: t ? t.v : null,
							def: n,
							obj: s
						};
					}
					t = t.superClass;
				}
				s = s.native && s.native.super ? s.native.super : null;
			}
			if (t.staticClass) {
				const s = t.staticClass.staticFields.get(e);
				if (s) return {
					value: s.v,
					def: {
						isStatic: !0,
						type: { name: s.t }
					},
					obj: null
				};
			}
			return null;
		}
		readField(t, s) {
			const n = t.target, i = this.resolveStaticTarget(n, s);
			if (i) {
				const s = i.cls.staticFields.get(t.name);
				if (!s) {
					if (i.cls.natives.has(`${t.name}/0`)) return i.cls.natives.get(`${t.name}/0`)([], { types: [] });
					throw new e(`cannot find symbol\n  symbol: variable ${t.name}`, t.line, t.col);
				}
				return s.v;
			}
			const r = this.eval(n, s);
			if (null === r && this.throwJava("NullPointerException", `No se puede leer el campo "${t.name}" porque el objeto es null`), A(r)) {
				if ("array" === r.cls.kind && "length" === t.name) return r.native.elements.length;
				const s = r.fields.get(t.name);
				if (s) return s.v;
				const n = r.cls.staticFields.get(t.name);
				if (n) return n.v;
				const i = this.nativeMethod(r.cls, t.name, 0);
				if (i) return i([r], { types: [r.cls.name] });
				throw new e(`cannot find symbol\n  symbol: variable ${t.name}\n  location: class ${r.cls.name}`, t.line, t.col);
			}
			const a = this.wrapperFor(this.inferType(n, s));
			if (a) {
				const e = a.staticFields.get(t.name);
				if (e) return e.v;
				const i = a.natives.get(`${t.name}/0`);
				if (i) return i([r], { types: [this.inferType(n, s)] });
			}
			throw new e(`cannot find symbol\n  symbol: variable ${t.name}`, t.line, t.col);
		}
		wrapperFor(e) {
			switch (e) {
				case "int":
				case "short":
				case "byte": return this.classes.get("Integer");
				case "long": return this.classes.get("Long");
				case "double": return this.classes.get("Double");
				case "float": return this.classes.get("Float");
				case "boolean": return this.classes.get("Boolean");
				case "char": return this.classes.get("Character");
				case "String": return this.classes.get("String");
				default: return this.classes.get(e);
			}
		}
		resolveStaticTarget(e, t) {
			if ("Name" === e.type) {
				if (t.lookup(e.name)) return null;
				const s = this.classes.get(e.name);
				return s ? {
					cls: s,
					isStatic: !0
				} : null;
			}
			if ("FieldAccess" === e.type || "Paren" === e.type) {
				const s = this.resolveStaticTarget("Paren" === e.type ? e.expr : e.target, t);
				if (!s) return null;
				const n = s.cls.staticFields.get(e.name);
				if (n && A(n.v)) return {
					cls: n.v.cls,
					isStatic: !0
				};
			}
			return null;
		}
		qualifiedName(e) {
			if (!e) return null;
			if ("Name" === e.type) return e.name;
			if ("FieldAccess" === e.type) {
				const t = this.qualifiedName(e.target);
				return t ? `${t}.${e.name}` : e.name;
			}
			return "Paren" === e.type ? this.qualifiedName(e.expr) : null;
		}
		classFor(e) {
			if (!e) return null;
			const t = this.classes.get(e);
			if (t) return t;
			if (e.includes(".")) {
				const t = e.slice(e.lastIndexOf(".") + 1);
				return this.classes.get(t) || null;
			}
			return null;
		}
		evalCall(e, t) {
			const s = e.args.map((e) => this.inferType(e, t));
			if (e.target) {
				const n = this.resolveStaticTarget(e.target, t) || (this.qualifiedName(e.target) ? {
					cls: this.classFor(this.qualifiedName(e.target)),
					isStatic: !0
				} : null);
				if (n && n.cls) {
					const i = this.evalArgs(e.args, t, s);
					return this.invokeStatic(n.cls, e.name, i, s, e);
				}
			}
			if (e.target && "Super" === e.target.type) {
				const n = this.evalArgs(e.args, t, s);
				return this.invokeOnThis(t, e.name, n, s, e);
			}
			let n = null, i = null;
			if (e.target && (this.resolveStaticTarget(e.target, t) || (n = this.eval(e.target, t), i = this.inferType(e.target, t))), e.target && null === n && this.throwJava("NullPointerException", `No se puede invocar "${e.name}" porque la referencia es null`), null !== n) {
				if (A(n)) {
					if ("array" === n.cls.kind && "length" === e.name) return n.native.elements.length;
					const i = this.evalArgs(e.args, t, s);
					return this.invokeInstance(n, e.name, i, s, e);
				}
				const r = this.wrapperFor(i);
				if (r) {
					const a = this.evalArgs(e.args, t, s);
					return this.invokeInstanceOnClass(r, n, e.name, a, s, e, i);
				}
			}
			if (e.target) {
				const n = this.targetMemberName(e.target);
				if (n) {
					const i = this.evalArgs(e.args, t, s);
					return this.invokeOnThis(t, n, i, s, e);
				}
			}
			if (t.thisObj) {
				const n = this.evalArgs(e.args, t, s);
				return this.invokeOnThis(t, e.name, n, s, e);
			}
			if (t.staticClass) {
				const n = this.evalArgs(e.args, t, s);
				return this.invokeStatic(t.staticClass, e.name, n, s, e);
			}
			const r = this.evalArgs(e.args, t, s);
			return this.invokeStatic(this.classes.get("Object"), e.name, r, s, e);
		}
		targetMemberName(e) {
			return "Super" === e.type ? e.isSuperClassOnly ? "super" : null : "Name" === e.type || "FieldAccess" === e.type ? e.name : null;
		}
		evalArgs(e, t, s) {
			return e.map((e, n) => {
				const i = this.eval(e, t);
				return this.coerce(i, s[n], "Object"), i;
			});
		}
		invokeStatic(t, s, n, i, r) {
			if (!t) throw new e(`cannot find symbol\n  symbol: method ${s}()`, r ? r.line : 0, r ? r.col : 0);
			if ("enum" === t.kind) {
				if ("values" === s && 0 === n.length) return this.arrayFrom(t.name, t.enumConstants.slice());
				if ("valueOf" === s && 1 === n.length) {
					const e = t.enumConstants.find((e) => e.get("name") === n[0]);
					return e || this.throwJava("IllegalArgumentException", `No enum constant ${t.name}.${String(n[0])}`), e;
				}
			}
			const a = this.pickMethod(t, s, n.length, i, !0);
			if (a) return this.invokeUserMethod(a, null, n, i, t);
			const o = this.nativeMethod(t, s, n.length);
			if (o) return this.wrapNative(o(n, {
				types: i,
				interp: this
			}), t, s, n.length);
			let l = t.superClass;
			for (; l;) {
				const e = this.pickMethod(l, s, n.length, i, !0);
				if (e) return this.invokeUserMethod(e, null, n, i, l);
				const t = this.nativeMethod(l, s, n.length);
				if (t) return this.wrapNative(t(n, {
					types: i,
					interp: this
				}), l, s, n.length);
				l = l.superClass;
			}
			throw new e(`cannot find symbol\n  symbol: method ${s}(${this.prettyTypes(i)})\n  location: class ${t.name}`, r ? r.line : 0, r ? r.col : 0);
		}
		wrapNative(e, t, s, n) {
			if (Array.isArray(e) && !A(e)) {
				const i = t ? t.nativeReturnType(s, n) : null;
				return this.arrayFrom(i && i.endsWith("[]") ? i.slice(0, -2) : "Object", e);
			}
			return e;
		}
		invokeInstance(t, s, n, i, r) {
			if (t.native && "lambda" === t.native.kind && (!t.native.method || t.native.method === s)) return this.wrapNative(t.native.invoke(n), t.cls, s, n.length);
			const a = t.cls, o = this.pickMethod(a, s, n.length, i, !1);
			if (o) return this.invokeUserMethod(o, t, n, i, a);
			const l = this.nativeMethod(a, s, n.length);
			if (l) return this.wrapNative(l([t, ...n], {
				types: [a.name, ...i],
				interp: this
			}), a, s, n.length);
			let c = a;
			for (; c;) {
				for (const a of c.interfaces || []) {
					const e = this.pickMethod(a, s, n.length, i, !1);
					if (e) return this.invokeUserMethod(e, t, n, i, a);
				}
				const e = c.superClass ? this.pickMethod(c.superClass, s, n.length, i, !1) : null;
				if (e) return this.invokeUserMethod(e, t, n, i, c.superClass);
				const r = c.superClass ? this.nativeMethod(c.superClass, s, n.length) : null;
				if (r) return this.wrapNative(r([t, ...n], {
					types: [c.superClass.name, ...i],
					interp: this
				}), c.superClass, s, n.length);
				c = c.superClass;
			}
			const h = this.nativeMethod(this.classes.get("Object"), s, n.length);
			if (h) return h([t, ...n], {
				types: [a.name, ...i],
				interp: this
			});
			throw new e(`cannot find symbol\n  symbol: method ${s}(${this.prettyTypes(i)})\n  location: class ${a.name}`, r ? r.line : 0, r ? r.col : 0);
		}
		invokeInstanceOnClass(t, s, n, i, r, a, o) {
			const l = this.nativeMethod(t, n, i.length);
			if (l) return this.wrapNative(l([s, ...i], {
				types: [o, ...r],
				interp: this
			}), t, n, i.length);
			if ("toString" === n) return D(s, o);
			if ("equals" === n) return i[0] === s;
			throw new e(`cannot find symbol\n  symbol: method ${n}(${this.prettyTypes(r)})\n  location: class ${t.name}`, a ? a.line : 0, a ? a.col : 0);
		}
		invokeOnThis(t, s, i, r, a) {
			const o = t.thisObj;
			if (!o) throw new e(`cannot find symbol\n  symbol: method ${s}()`, a ? a.line : 0, a ? a.col : 0);
			if ("super" === s || a.target && "Super" === a.target.type) {
				const t = o.cls.superClass;
				if (!t) throw new n("no hay superclase");
				let l = t;
				for (; l;) {
					const e = this.pickMethod(l, s, i.length, r, !1);
					if (e) return this.invokeUserMethod(e, o, i, r, l);
					const t = this.nativeMethod(l, s, i.length);
					if (t) return this.wrapNative(t([o, ...i], {
						types: [l.name, ...r],
						interp: this
					}), l, s, i.length);
					for (const n of l.interfaces || []) {
						const e = this.pickMethod(n, s, i.length, r, !1);
						if (e) return this.invokeUserMethod(e, o, i, r, n);
					}
					l = l.superClass;
				}
				const c = this.nativeMethod(this.classes.get("Object"), s, i.length);
				if (c) return c([o, ...i], { types: [o.cls.name, ...r] });
				throw new e(`cannot find symbol\n  symbol: method ${s}(${this.prettyTypes(r)})\n  location: class ${t.name}`, a ? a.line : 0, a ? a.col : 0);
			}
			return this.invokeInstance(o, s, i, r, a);
		}
		nativeMethod(e, t, s) {
			let n = e;
			for (; n;) {
				const e = n.natives.get(`${t}/${s}`);
				if (e) return e;
				n = n.superClass;
			}
			let i = e;
			for (; i;) {
				const e = i.natives.get(`${t}/#`);
				if (e) return e;
				i = i.superClass;
			}
			return null;
		}
		findUserMethod(e, t, s) {
			let n = e;
			for (; n;) {
				const e = n.methodsNamed(t).filter((e) => void 0 === s || e.params.length === s);
				if (e.length) return e[0];
				n = n.superClass;
			}
			return null;
		}
		pickMethod(e, t, s, n, i) {
			const r = e.methodsNamed(t);
			if ("<init>" === t) {
				const e = r.filter((e) => e.params.length === s);
				if (e.length) return this.bestOverload(e, n, i);
				const t = r.filter((e) => re(e) && s >= e.params.length - 1);
				return t.length ? this.bestOverload(t, n, i) || t.reduce((e, t) => t.params.length > e.params.length ? t : e) : null;
			}
			const a = r.filter((e) => e.params.length === s);
			if (a.length) return this.bestOverload(a, n, i);
			const o = r.filter((e) => re(e) && s >= e.params.length - 1);
			return o.length ? this.bestOverload(o, n, i) || o.reduce((e, t) => t.params.length > e.params.length ? t : e) : null;
		}
		bestOverload(e, t, s) {
			const n = e.filter((e) => e.isStatic === s), i = n.length ? n : e;
			if (!i.length) return null;
			let r = null, a = 1 / 0;
			for (const o of i) {
				let e = 0, s = !0;
				for (let n = 0; n < o.params.length; n++) {
					const i = this.typeLabel(o.params[n].type), r = t[n] || "Object", a = this.matchScore(i, r);
					if (null === a) {
						s = !1;
						break;
					}
					e += a;
				}
				s && e < a && (a = e, r = o);
			}
			return r || (1 === i.length ? i[0] : null);
		}
		matchScore(e, t) {
			if (!t || "unknown" === t || "var" === t || "null" === t) return 1;
			if (e === t) return 0;
			if ("Object" === e || "Serializable" === e || "Comparable" === e) return 3;
			if (e.endsWith("[]") && t.endsWith("[]")) return 1;
			if (K(e) && K(t)) return "double" === e || "float" === e || "long" === e || "int" === e ? 1 : 4;
			if (K(t) && "String" === e) return 5;
			const s = this.classes.get(e), n = this.classes.get(t);
			return s && n && n.isSubclassOf(s) ? 2 : null;
		}
		prettyTypes(e) {
			return (e || []).map((e) => e || "Object").join(", ");
		}
		invokeUserMethod(e, t, s, n, i) {
			this.depth++, this.depth > 2e3 && (this.depth--, this.throwJava("StackOverflowError", null));
			const r = new N(this.staticEnv);
			r.thisObj = e.isStatic ? null : t, r.staticClass = i, e.params && e.params.forEach((e, t) => {
				let i = s[t];
				const a = this.typeLabel(e.type);
				if (e.varargs) {
					const n = a.slice(0, -2), o = A(i) && i.native && Array.isArray(i.native.elements);
					r.declare(e.name, a, o ? i : this.arrayFrom(n, s.slice(t)));
				} else i = this.coerce(i, n[t], a), r.declare(e.name, a, i);
			});
			try {
				return e.isConstructor ? (this.initInstance(t, s, n, e, i, r), null) : e.isAccessor && t ? t.get(e.component) : e.body ? (this.execBlock({
					type: "Block",
					body: e.body
				}, r), null) : this.zeroFor(this.typeLabel(e.returnType || { name: "void" }));
			} catch (a) {
				if (a instanceof L) return a.value;
				throw a;
			} finally {
				this.depth--;
			}
		}
		initInstance(e, t, s, n, i, r) {
			const a = e.cls, o = `__init_${(i || a).name}`;
			if (e[o]) return;
			e[o] = !0, e.__initialized = !0;
			const l = n.body || [], c = l[0];
			if (c && "ExprStmt" === c.type && "MethodCall" === c.expr.type && c.expr.target && "This" === c.expr.target.type) {
				const t = this.evalArgs(c.expr.args, r, c.expr.args.map(() => "Object")), s = c.expr.args.map(() => "Object"), i = this.pickMethod(a, "<init>", t.length, s, !1);
				if (i && i !== n) return delete e[o], e.__initialized = !1, void this.invokeUserMethod(i, e, t, s, a);
			}
			const h = a.superClass;
			if (h && void 0 === n.recordComponents) {
				const t = c && "ExprStmt" === c.type && "MethodCall" === c.expr.type && c.expr.target && "Super" === c.expr.target.type ? c.expr : null, s = t ? this.evalArgs(t.args, r, t.args.map(() => "Object")) : [], n = t ? t.args.map(() => "Object") : [], i = this.pickMethod(h, "<init>", s.length, n, !1);
				if (i) this.invokeUserMethod(i, e, s, n, h);
				else {
					const t = h.natives && h.natives.get("__construct/#");
					if (t) {
						const i = t(s, {
							types: n,
							interp: this
						});
						if (i && i !== e) for (const [t, s] of i.fields) e.set(t, s.t, s.v);
					}
				}
			}
			const p = [];
			let u = a;
			for (; u && (p.unshift(u), u !== (i || a));) u = u.superClass;
			for (const f of p) for (const [t, s] of f.fields) e.fields.get(t) || e.fields.set(t, {
				t: this.typeLabel(s.type, s.dims),
				v: this.defaultValue(s)
			});
			for (const f of p) {
				const t = `__fields_${f.name}`;
				if (e[t]) continue;
				e[t] = !0;
				const s = new N(this.staticEnv);
				if (s.thisObj = e, s.staticClass = f, f.instanceInit) for (const e of f.instanceInit) this.execStatement(e, s);
				for (const [n, i] of f.fields) if (i.init) e.fields.get(n).v = this.evalVarInit(i.init, this.typeLabel(i.type, i.dims), s);
			}
			if (n.recordComponents) n.recordComponents.forEach((n, i) => {
				const r = t[i], a = this.typeLabel(n.type);
				e.fields.set(n.name, {
					t: a,
					v: this.coerce(r, s[i], a)
				});
			});
			else if ("record" === a.kind && a.accessors.size) {
				let i = 0;
				for (const [r] of a.accessors) {
					const a = e.fields.get(r);
					if (a && i < (n.params || []).length) {
						const e = n.params[i];
						a.v = this.coerce(t[i], s[i], this.typeLabel(e.type));
					}
					i++;
				}
			}
			for (let f = c && "ExprStmt" === c.type && "MethodCall" === c.expr.type && c.expr.target && ("Super" === c.expr.target.type || "This" === c.expr.target.type) ? 1 : 0; f < l.length; f++) {
				const e = l[f];
				if ("Return" === e.type) break;
				this.execStatement(e, r);
			}
		}
		evalNew(t, s) {
			const n = t.targetType.name, i = t.args.map((e) => this.inferType(e, s)), r = this.evalArgs(t.args, s, i), a = this.classes.get(n);
			if (!a) throw new e(`cannot find symbol\n  symbol: class ${n}\n  location: class ${this.currentClassName(s)}`, t.line, t.col);
			if ("interface" === a.kind || a.abstract) throw new e(`${a.name} is abstract; cannot be instantiated`, t.line, t.col);
			if ("enum" === a.kind && a.enumConstants && a.enumConstants.length) return a.enumConstants[0];
			const o = new E(a);
			if (o.__initialized = !1, a.natives.has("__construct/#")) return a.natives.get("__construct/#")(r, {
				types: i,
				interp: this
			}) || o;
			const l = this.pickMethod(a, "<init>", r.length, i, !1);
			if (l) this.invokeUserMethod(l, o, r, i, a);
			else {
				const e = new N(this.staticEnv);
				e.thisObj = o, this.initInstance(o, r, i, { body: [] }, a, e);
			}
			return o;
		}
		currentClassName(e) {
			return e && e.thisObj && e.thisObj.cls ? e.thisObj.cls.name : "Mision";
		}
		newArray(e, t) {
			const n = new E(this.classes.get("array") || this.ensureArrayClass(), {});
			return n.native = {
				elements: new Array(t).fill(this.zeroFor(e)),
				elemType: e
			}, n;
		}
		ensureArrayClass() {
			let e = this.classes.get("array");
			return e || (e = new M("array", { kind: "array" }), this.classes.set("array", e)), e;
		}
		arrayFrom(e, t) {
			const s = this.newArray(e, t.length);
			return s.native.elements = t.map((t, s) => t && t.__boxed ? t.__boxed : e.endsWith("[]") && Array.isArray(t) && !A(t) ? this.arrayFrom(e.slice(0, -2), t) : t), s;
		}
		arrayElements(e, t) {
			if (null == e && this.throwJava("NullPointerException", "no se puede usar un arreglo nulo"), !A(e) || !e.native || !Array.isArray(e.native.elements)) throw new n(`se esperaba un arreglo en la línea ${t || 0}`);
			return e.native.elements;
		}
		evalNewArray(e, t) {
			const s = e.arrayType.name;
			if (e.arrayInit) {
				if (e.dims && e.dims.length) return this.arrayInitValue(e.arrayInit, `${s}${"[]".repeat(e.dims.length)}`, t);
				const n = e.arrayInit.items.map((e) => "ArrayInit" === e.type ? this.arrayInitValue(e, `${s}[]`, t) : this.eval(e, t));
				return this.arrayFrom(s, n);
			}
			const i = e.dims.map((e) => e ? this.eval(e, t) : 0);
			if (1 === i.length) return this.newArray(s, i[0]);
			if (2 === i.length) {
				const e = this.newArray(s + "[]", i[0]);
				for (let t = 0; t < i[0]; t++) e.native.elements[t] = this.newArray(s, i[1]);
				return e;
			}
			throw new n("sólo se admiten arreglos de 1 o 2 dimensiones");
		}
		evalUnary(e, t) {
			if ("++" === e.op || "--" === e.op) {
				const s = this.eval(e.expr, t), n = this.coerce(s + ("++" === e.op ? 1 : -1), this.inferType(e.expr, t), this.inferType(e.expr, t));
				return this.assignTo(e.expr, n, t), e.prefix ? n : s;
			}
			const s = this.eval(e.expr, t), i = this.inferType(e.expr, t);
			switch (e.op) {
				case "+": return this.coerce(s, i, U(i, "int"));
				case "-": return this.coerce(-s, i, U(i, "int"));
				case "!": return !s;
				case "~": return V(~Math.trunc(s), "long" === i ? "long" : "int");
				default: throw new n(`operador unario no soportado: ${e.op}`);
			}
		}
		evalBinary(e, t) {
			const { op: s } = e;
			if ("&&" === s) return !!Boolean(this.eval(e.left, t)) && Boolean(this.eval(e.right, t));
			if ("||" === s) return !!Boolean(this.eval(e.left, t)) || Boolean(this.eval(e.right, t));
			const i = this.inferType(e.left, t), r = this.inferType(e.right, t), a = this.eval(e.left, t), o = this.eval(e.right, t);
			if ("+" === s && ("String" === i || "String" === r)) return (D(a, i) ?? this.valueToString(a, i)) + (D(o, r) ?? this.valueToString(o, r));
			if (Y.has(s)) {
				const e = U(i, r), t = this.coerce(a, i, e), n = this.coerce(o, r, e);
				switch (s) {
					case "+": return this.coerce(t + n, e, e);
					case "-": return this.coerce(t - n, e, e);
					case "*": return this.coerce(t * n, e, e);
					case "/": return R(e) || "char" === e ? (0 === n && this.throwJava("ArithmeticException", "/ by zero"), this.coerce(Math.trunc(t / n), e, e)) : this.coerce(t / n, e, e);
					case "%": return R(e) || "char" === e ? (0 === n && this.throwJava("ArithmeticException", "/ by zero"), this.coerce(t % n, e, e)) : this.coerce(t % n, e, e);
				}
			}
			if (Q.has(s)) {
				const e = U(i, r), t = this.coerce(a, i, e), n = this.coerce(o, r, e);
				switch (s) {
					case "<": return t < n;
					case ">": return t > n;
					case "<=": return t <= n;
					case ">=": return t >= n;
				}
			}
			if (ee.has(s)) {
				this.checkEqualityTypes(i, r, s, e);
				let t;
				if (K(i) && K(r)) {
					const e = U(i, r);
					t = this.coerce(a, i, e) === this.coerce(o, r, e);
				} else t = a === o;
				return "==" === s ? t : !t;
			}
			if (te.has(s)) {
				const e = U(i, r), t = this.coerce(a, i, e), n = this.coerce(o, r, e);
				return "&" === s ? this.coerce(t & n, e, e) : "|" === s ? this.coerce(t | n, e, e) : this.coerce(t ^ n, e, e);
			}
			if (se.has(s)) {
				const e = Math.trunc(a), t = Math.trunc(o), n = U(i, "int");
				return "<<" === s ? this.coerce(e << t, n, n) : ">>" === s ? this.coerce(e >> t, n, n) : this.coerce(e >>> t, n, n);
			}
			throw new n(`operador binario no soportado: ${s}`);
		}
		checkEqualityTypes(t, s, n, i) {
			const r = (e) => "boolean" === e || "Boolean" === e, a = (e) => "string" == typeof e && "unknown" !== e && "null" !== e && "void" !== e && "var" !== e && !K(e) && !r(e);
			if (r(t) && a(s) || r(s) && a(t)) throw new e(`bad operand types for binary operator '${n}'\n  ${t} and ${s}`, i.line, i.col);
		}
		evalAssign(e, t) {
			const s = this.eval(e.value, t);
			if ("=" === e.op) {
				const n = this.inferType(e.target, t), i = this.coerce(s, this.inferType(e.value, t), n);
				return this.assignTo(e.target, i, t), i;
			}
			const n = e.op.slice(0, -1);
			this.eval(e.target, t);
			const i = {
				type: "Binary",
				op: n,
				left: e.target,
				right: e.value,
				line: e.line,
				col: e.col
			}, r = this.evalBinary(i, t);
			return this.assignTo(e.target, r, t), r;
		}
		assignTo(t, s, i) {
			switch (t.type) {
				case "Name": {
					const n = i.lookup(t.name);
					if (n) {
						if (n.final) throw new e(`cannot assign a value to final variable ${t.name}`, t.line, t.col);
						n.v = s;
						return;
					}
					let r = i.thisObj, a = r ? r.cls : null;
					for (; r;) {
						const n = a && a.fields.get(t.name);
						if (n) {
							if (n.isFinal) throw new e(`cannot assign a value to final ${n.isStatic ? "" : "variable "}${t.name}`, t.line, t.col);
							const i = r.fields.get(t.name);
							i ? i.v = s : r.set(t.name, this.typeLabel(n.type, n.dims), s);
							return;
						}
						a && a.superClass ? a = a.superClass : (r = r.native && r.native.super ? r.native.super : null, a = r ? r.cls : null);
					}
					if (i.staticClass) {
						const e = i.staticClass.staticFields.get(t.name);
						if (e) return void (e.v = s);
					}
					const o = this.lookupField(t.name, i);
					if (o && o.obj) return void (o.obj.fields.get(t.name).v = s);
					throw new e(`cannot find symbol\n  symbol: variable ${t.name}`, t.line, t.col);
				}
				case "Paren": return this.assignTo(t.expr, s, i);
				case "FieldAccess": {
					const n = this.resolveStaticTarget(t.target, i);
					if (n) {
						const i = n.cls.staticFields.get(t.name);
						if (!i) throw new e(`cannot find symbol\n  symbol: variable ${t.name}`, t.line, t.col);
						if ("length" === t.name) throw new e("no se puede asignar a length", t.line, t.col);
						i.v = s;
						return;
					}
					const r = this.eval(t.target, i);
					if (null === r && this.throwJava("NullPointerException", `No se puede asignar a "${t.name}" porque el objeto es null`), A(r)) {
						const e = r.fields.get(t.name);
						e ? e.v = s : r.set(t.name, this.inferType(t, i), s);
						return;
					}
					throw new e(`cannot find symbol\n  symbol: variable ${t.name}`, t.line, t.col);
				}
				case "ArrayAccess": {
					const e = this.eval(t.array, i), n = Math.trunc(this.eval(t.index, i)), r = this.arrayElements(e, t.line);
					(n < 0 || n >= r.length) && this.throwJava("ArrayIndexOutOfBoundsException", `Index ${n} out of bounds for length ${r.length}`), r[n] = s;
					return;
				}
				default: throw new n(`no se puede asignar a ${t.type}`);
			}
		}
		evalCast(e, t) {
			const s = this.eval(e.expr, t), n = this.typeLabel(e.targetType), i = this.inferType(e.expr, t);
			if (n.endsWith("[]")) return Array.isArray(s) && !A(s) ? this.arrayFrom(n.slice(0, -2), s) : s;
			if (A(s)) {
				const e = this.classes.get(n);
				return "Object" === n || !e || !s.cls || s.cls.isSubclassOf(e) || s.cls.isSubclassOf && e.isSubclassOf(s.cls) || e.isInterface || s.cls.isInterface || this.throwJava("ClassCastException", `class ${s.cls.name} cannot be cast to class ${n}`), s;
			}
			switch (n) {
				case "int": return V(Math.trunc(s), "int");
				case "long": return Math.trunc(s);
				case "short": return V(s, "short");
				case "byte": return V(s, "byte");
				case "char": return V(s, "char");
				case "double":
				case "float":
				default: return s;
				case "boolean": return Boolean(s);
				case "String": return "char" === i ? String.fromCharCode(s) : D(s, i);
			}
		}
		wrapperClassOf(e, t) {
			return "string" == typeof e ? this.classes.get("String") : "boolean" == typeof e ? this.classes.get("Boolean") : "number" != typeof e ? null : "double" === t || "float" === t || "Double" === t ? this.classes.get("Double") : "long" === t || "Long" === t ? this.classes.get("Long") : "char" === t || "Character" === t ? this.classes.get("Character") : this.classes.get(Number.isInteger(e) ? "Integer" : "Double");
		}
		evalInstanceOf(e, t) {
			const s = this.eval(e.expr, t), n = this.typeLabel(e.targetType);
			if (null === s) return !1;
			const i = this.classes.get(n);
			if (!i) return !1;
			const r = this.classes.get("Object");
			let a;
			if (a = A(s) ? s.cls : this.wrapperClassOf(s, this.inferType(e.expr, t)), !a) return !1;
			const o = i === this.classes.get("Number") && a !== this.classes.get("String") && a !== this.classes.get("Boolean") && a !== this.classes.get("Character"), l = a.isSubclassOf(i) || i === r || o;
			return l && e.binding && t.declare(e.binding, n, s), l;
		}
		iterate(e, t) {
			if (null === e && this.throwJava("NullPointerException", "no se puede iterar un valor null"), A(e) && e.native && Array.isArray(e.native.elements)) return e.native.elements.slice();
			if (A(e) && e.native && Array.isArray(e.native.items)) return e.native.items.slice();
			if (A(e) && e.native && e.native.entries) return [...e.native.entries].map(([e, t]) => {
				const s = new E(this.classes.get("Entry") || this.classes.get("Object"), {});
				return s.native = {
					kind: "entry",
					key: e,
					value: t
				}, s;
			});
			const s = this.nativeMethod(e.cls || this.classes.get("Object"), "iterator", 0);
			if (s) {
				const t = s([e], {
					types: [e.cls.name],
					interp: this
				}), i = [];
				for (; this.host.callMethod(t, "hasNext", []);) if (i.push(this.host.callMethod(t, "next", [])), i.length > 1e6) throw new n("iteración demasiado larga");
				return i;
			}
			throw new n(`el valor de la línea ${t || 0} no se puede iterar`);
		}
		makeLambda(e, t) {
			const s = this, n = t, i = new E(this.classes.get("Lambda") || this.ensureLambdaClass(), {});
			return i.native = {
				kind: "lambda",
				invoke(t) {
					const i = n.child();
					if (e.params.forEach((e, n) => {
						const r = e.implicitType || !e.type ? "var" : s.typeLabel(e.type);
						i.declare(e.name, r, t[n]);
					}), e.isExpression) return s.eval(e.body, i);
					try {
						s.execBlock({
							type: "Block",
							body: e.body
						}, i);
					} catch (r) {
						if (r instanceof L) return r.value;
						throw r;
					}
					return null;
				}
			}, i;
		}
		ensureLambdaClass() {
			let e = this.classes.get("Lambda");
			return e || (e = new M("Lambda", {
				kind: "interface",
				isFunctional: !0
			}), this.classes.set("Lambda", e)), e;
		}
		adoptLambda(e, t) {
			e.cls = t, e.native.iface = t;
			let s = null;
			for (const n of t.methods.values()) {
				for (const e of n) if ("<init>" !== e.name && !e.body) {
					s = e.name;
					break;
				}
				if (s) break;
			}
			return s && (e.native.method = s), e;
		}
		makeMethodRef(e, t) {
			const s = this, i = e.target;
			if ("ClassLiteral" === i.type && i.name) {
				const r = this.classes.get(i.name), a = new E(this.ensureLambdaClass(), {});
				return a.native = {
					kind: "lambda",
					invoke(a) {
						if ("new" === e.name) return s.evalNew({
							targetType: {
								name: i.name,
								args: [],
								dims: 0,
								isVar: !1
							},
							args: a.map((e) => ({
								type: "Literal",
								kind: "object",
								value: e,
								line: 0,
								col: 0
							}))
						}, t);
						const o = r ? s.findUserMethod(r, e.name, a.length) : null;
						if (o) return s.invokeUserMethod(o, null, a, a.map(() => "Object"), r);
						throw new n(`referencia a método no soportada: ${i.name}::${e.name}`);
					}
				}, a;
			}
			const r = this.eval(i, t), a = this.inferType(i, t), o = new E(this.ensureLambdaClass(), {});
			return o.native = {
				kind: "lambda",
				invoke(t) {
					if (A(r)) {
						const i = r.cls, a = s.findUserMethod(i, e.name, t.length);
						if (a) return s.invokeUserMethod(a, r, t, t.map(() => "Object"), i);
						const o = s.nativeMethod(i, e.name, t.length);
						if (o) return o([r, ...t], {
							types: [i.name, ...t.map(() => "Object")],
							interp: s
						});
						throw new n(`referencia a método no soportada: ${e.name}`);
					}
					const i = s.wrapperFor(a), o = i ? s.nativeMethod(i, e.name, t.length) : null;
					if (o) return o([r, ...t], {
						types: [a, ...t.map(() => "Object")],
						interp: s
					});
					throw new n(`referencia a método no soportada: ${e.name}`);
				}
			}, o;
		}
		inferType(e, t) {
			try {
				return this.inferTypeInner(e, t);
			} catch (s) {
				return "unknown";
			}
		}
		inferTypeInner(e, t) {
			switch (e.type) {
				case "Literal": return "null" === e.kind ? "null" : ne[e.kind] || e.kind;
				case "Paren": return this.inferType(e.expr, t);
				case "Name": {
					const s = t.lookup(e.name);
					if (s) return s.t;
					const n = this.lookupField(e.name, t);
					return n ? n.def.type ? this.typeLabel(n.def.type, n.def.dims) : "Object" : this.classes.has(e.name) ? "class" : "unknown";
				}
				case "This":
				case "Super": return t.thisObj && t.thisObj.cls ? t.thisObj.cls.name : "unknown";
				case "FieldAccess": {
					const s = this.resolveStaticTarget(e.target, t);
					if (s) {
						const t = s.cls.staticFields.get(e.name);
						return t ? t.t : "Object";
					}
					const n = this.eval(e.target, t);
					if (A(n)) {
						if ("array" === n.cls.kind && "length" === e.name) return "int";
						const t = n.fields.get(e.name);
						if (t) return t.t;
						const s = n.cls.staticFields.get(e.name);
						return s ? s.t : "Object";
					}
					return "unknown";
				}
				case "MethodCall": {
					const s = e.args.map((e) => this.inferType(e, t)), n = (t) => t && t.nativeReturnType(e.name, e.args.length) || null;
					if (e.target) {
						const i = this.resolveStaticTarget(e.target, t);
						if (i) {
							const t = this.pickMethod(i.cls, e.name, e.args.length, s, !0) || this.pickMethod(i.cls, e.name, e.args.length, s, !1);
							if (t && t.returnType) return this.typeLabel(t.returnType);
							return n(i.cls) || "unknown";
						}
						const r = this.inferType(e.target, t), a = this.classes.get(r);
						if (a) {
							const t = this.pickMethod(a, e.name, e.args.length, s, !1);
							if (t && t.returnType) return this.typeLabel(t.returnType);
							const i = n(a);
							if (i) return i;
						}
					}
					if (t.thisObj) {
						const i = this.pickMethod(t.thisObj.cls, e.name, e.args.length, s, !1);
						if (i && i.returnType) return this.typeLabel(i.returnType);
						const r = n(t.thisObj.cls);
						if (r) return r;
					}
					if (t.staticClass) {
						const i = this.pickMethod(t.staticClass, e.name, e.args.length, s, !0);
						if (i && i.returnType) return this.typeLabel(i.returnType);
						const r = n(t.staticClass);
						if (r) return r;
					}
					return "unknown";
				}
				case "ArrayAccess": {
					const s = this.inferType(e.array, t);
					return s.endsWith("[]") ? s.slice(0, -2) : "Object";
				}
				case "New":
				case "Cast": return this.typeLabel(e.targetType);
				case "NewArray": {
					const t = e.dims.length;
					let s = e.arrayType.name;
					for (let e = 0; e < t; e++) s += "[]";
					return s;
				}
				case "ArrayInit":
				case "SwitchExpr":
				default: return "unknown";
				case "Unary": return "!" === e.op ? "boolean" : "++" === e.op || "--" === e.op ? this.inferType(e.expr, t) : U(this.inferType(e.expr, t), "int");
				case "Binary": {
					if ([
						"&&",
						"||",
						"<",
						">",
						"<=",
						">=",
						"==",
						"!="
					].includes(e.op)) return "boolean";
					const s = this.inferType(e.left, t), n = this.inferType(e.right, t);
					return "+" !== e.op || "String" !== s && "String" !== n ? U(s, n) : "String";
				}
				case "Assign": return e.op, this.inferType(e.target, t);
				case "Ternary": return "unknown" !== this.inferType(e.then, t) ? this.inferType(e.then, t) : this.inferType(e.otherwise, t);
				case "InstanceOf": return "boolean";
				case "Lambda":
				case "MethodRef": return "Lambda";
				case "ClassLiteral": return "Class";
			}
		}
	};
	function re(e) {
		const t = e.params && e.params[e.params.length - 1];
		return !(!t || !t.varargs);
	}
	function ae(e, t = {}) {
		return new ie(t).run(e);
	}
	self.onmessage = function(e) {
		const t = e.data || {};
		if ("init" === t.type) {
			const e = ae("public class Mision { public static void main(String[] args) { } }", { stepLimit: 1e5 });
			self.postMessage({
				type: "ready",
				ok: !0 === e.ok
			});
			return;
		}
		if ("run" === t.type) {
			const e = t.stepLimit || 2e7, s = ae(t.code || "", { stepLimit: e });
			self.postMessage({
				type: "result",
				ok: !0 === s.ok,
				stdout: s.stdout || "",
				stderr: s.stderr || "",
				error: s.error || null
			});
		}
	};
})();
