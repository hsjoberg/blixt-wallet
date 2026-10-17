const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const babel = require("@babel/core");

// Execute the actual setting thunk without loading the wallet/store.
function changeSetting(write) {
  const ast = babel.parseSync(fs.readFileSync(path.join(__dirname, "../src/state/Settings.ts"), "utf8"), {
    babelrc: false, configFile: false, parserOpts: { plugins: ["typescript"] },
  });
  let handler;
  babel.traverse(ast, { ObjectProperty(p) {
    if (p.node.key.name === "changeTrayEnabled") handler = p.node.value.arguments[0];
  } });
  assert(handler);
  const { code } = babel.transformFromAstSync(babel.types.file(babel.types.program([
    babel.types.expressionStatement(handler),
  ])), undefined, { babelrc: false, configFile: false });
  return new Function("setItemObject", "StorageItem", `return (${code.trim().replace(/;$/, "")});`)(
    write, { trayEnabled: "trayEnabled" });
}

test("menu-bar changes persist through app storage before updating state", async () => {
  for (const enabled of [true, false]) {
    const events = [];
    await changeSetting(async (key, value) => events.push(["write", key, value]))({
      setTrayEnabled: value => events.push(["state", value]),
    }, enabled);
    assert.deepEqual(events, [["write", "trayEnabled", enabled], ["state", enabled]]);
  }
});
test("a persistence failure does not change the menu-bar setting", async () => {
  await assert.rejects(changeSetting(async () => { throw new Error("write failed"); })({
    setTrayEnabled: () => assert.fail("must not update state"),
  }, true), /write failed/);
});

test("tray settings retain the old macOS preference without overriding a new false value", async () => {
  const ast = babel.parseSync(fs.readFileSync(path.join(__dirname, "../src/state/Settings.ts"), "utf8"), {
    babelrc: false, configFile: false, parserOpts: { plugins: ["typescript"] },
  });
  let load;
  babel.traverse(ast, { CallExpression(p) {
    if (p.node.callee.property?.name === "setTrayEnabled" &&
        p.node.arguments[0]?.type === "LogicalExpression") load = p.node.arguments[0];
  } });
  assert(load);
  const { code } = babel.transformFromAstSync(babel.types.file(babel.types.program([
    babel.types.expressionStatement(load),
  ])), undefined, { babelrc: false, configFile: false });
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const read = new AsyncFunction("getItemObject", "StorageItem", `return (${code.trim().replace(/;$/, "")});`);
  for (const [current, legacy, expected] of [[undefined, true, true], [false, true, false],
    [true, false, true], [undefined, undefined, false]]) {
    assert.equal(await read(async key => key === "new" ? current : legacy,
      { trayEnabled: "new", legacyMacosMenuBarEnabled: "old" }), expected);
  }
});
