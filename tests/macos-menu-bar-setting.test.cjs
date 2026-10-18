const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const babel = require("@babel/core");

// Execute production callbacks with mocked storage/native boundaries.
function callback(file, name, bindings) {
  const ast = babel.parseSync(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    babelrc: false, configFile: false, parserOpts: { plugins: ["typescript", "jsx"] },
  });
  let handler;
  babel.traverse(ast, {
    ObjectProperty(p) {
      if (p.node.key.name === name) handler = p.node.value.arguments[0];
    },
    VariableDeclarator(p) {
      if (p.node.id.name === name) handler = p.node.init;
    },
  });
  assert(handler, name);
  const { code } = babel.transformFromAstSync(babel.types.file(babel.types.program([
    babel.types.expressionStatement(handler),
  ])), undefined, {
    babelrc: false, configFile: false, plugins: ["@babel/plugin-transform-typescript"],
  });
  return new Function(...Object.keys(bindings), `return (${code.trim().replace(/;$/, "")});`)(...Object.values(bindings));
}
const StorageItem = {
  persistentServicesEnabled: "persistent", legacyTrayEnabled: "tray", legacyMacosMenuBarEnabled: "old",
};
function migration(data, platform = "macos", overrides = {}) {
  return callback("src/storage/app.ts", "getPersistentServicesEnabled", {
    PLATFORM: platform, StorageItem,
    getItemObject: async key => data[key],
    setItemObject: async (key, value) => { data[key] = value; },
    removeItem: async key => { delete data[key]; },
    ...overrides,
  });
}

test("Persistent Mode persists before updating state, and preserves state on write failure", async () => {
  for (const enabled of [true, false]) {
    const events = [];
    await callback("src/state/Settings.ts", "changePersistentServicesEnabled", {
      StorageItem, setItemObject: async (key, value) => events.push(["write", key, value]),
    })({ setPersistentServicesEnabled: value => events.push(["state", value]) }, enabled);
    assert.deepEqual(events, [["write", "persistent", enabled], ["state", enabled]]);
  }
  await assert.rejects(callback("src/state/Settings.ts", "changePersistentServicesEnabled", {
    StorageItem, setItemObject: async () => { throw new Error("write failed"); },
  })({ setPersistentServicesEnabled: () => assert.fail("must not update state") }, true), /write failed/);
});

test("macOS migrates existing tray preferences once, including explicit false", async () => {
  for (const [tray, old, expected] of [[true, false, true], [false, true, false],
    [undefined, true, true], [undefined, false, false]]) {
    const data = { persistent: false, tray, old };
    const read = migration(data);
    assert.equal(await read(), expected);
    assert.deepEqual(data, { persistent: expected });
    data.persistent = !expected;
    assert.equal(await read(), !expected);
  }
});

test("without legacy preferences Persistent Mode is authoritative and defaults off", async () => {
  for (const value of [true, false, undefined]) {
    assert.equal(await migration({ persistent: value })(), value ?? false);
  }
});

test("mobile platforms leave legacy tray preferences untouched", async () => {
  for (const platform of ["android", "ios"]) {
    const data = { persistent: false, tray: true, old: true };
    assert.equal(await migration(data, platform)(), false);
    assert.deepEqual(data, { persistent: false, tray: true, old: true });
  }
});

test("migration retains legacy preferences when persistence fails", async () => {
  const data = { persistent: false, tray: true, old: false };
  await assert.rejects(migration(data, "macos", {
    setItemObject: async () => { throw new Error("write failed"); },
  })(), /write failed/);
  assert.deepEqual(data, { persistent: false, tray: true, old: false });
  assert.equal(await migration(data)(), true);
});

test("interrupted cleanup cannot resurrect an older true preference", async () => {
  const data = { persistent: true, tray: false, old: true };
  await assert.rejects(migration(data, "macos", {
    removeItem: async key => {
      if (key === "tray") throw new Error("cleanup failed");
      delete data[key];
    },
  })(), /cleanup failed/);
  assert.deepEqual(data, { persistent: false, tray: false });
  assert.equal(await migration(data)(), false);
  assert.deepEqual(data, { persistent: false });
});

test("toggle requests restart only on Android, and reports persistence errors", async () => {
  for (const platform of ["android", "macos"]) {
    for (const fails of [false, true]) {
      const events = [];
      await callback("src/windows/Settings/Settings.tsx", "changePersistentServicesEnabledPress", {
        PLATFORM: platform, persistentServicesEnabled: false,
        changePersistentServicesEnabled: async enabled => {
          events.push(["change", enabled]);
          if (fails) throw new Error("write failed");
        },
        restartNeeded: () => events.push(["restart"]),
        toast: message => events.push(["toast", message]),
      })();
      assert.deepEqual(events, [["change", true],
        ...(fails ? [["toast", "write failed"]] : platform === "android" ? [["restart"]] : [])]);
    }
  }
});
