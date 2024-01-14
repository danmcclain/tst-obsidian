import browser, { Tabs } from "webextension-polyfill";

const TST_ID = "treestyletab@piro.sakura.ne.jp";

async function registerToTST() {
  await browser.runtime
    .sendMessage(TST_ID, {
      type: "register-self",
      name: browser.i18n.getMessage("extensionName"),
    })
    .then(() => {})
    .catch(() => {})
    .finally(() => {});
}
registerToTST();

browser.runtime.onMessageExternal.addListener((message, sender) => {
  switch (sender.id) {
    case TST_ID:
      switch (message.type) {
        case "ready":
          registerToTST();
          break;
      }
      break;
  }
});

browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "tstObsidian-TopMenu",
    title: "TST Obsidian",
    contexts: ["tab"],
  });

  browser.contextMenus.create({
    id: "tstObsidian-Copy",
    title: "Copy",
    contexts: ["tab"],
    parentId: "tstObsidian-TopMenu",
  });

  browser.contextMenus.create({
    id: "tstObsidian-Copy-Tasks",
    title: "As Tasks",
    contexts: ["tab"],
    parentId: "tstObsidian-Copy",
  });

  browser.contextMenus.create({
    id: "tst-obsidian-Copy-List",
    title: "As List",
    contexts: ["tab"],
    parentId: "tstObsidian-Copy",
  });

  browser.contextMenus.create({
    id: "tstObsidian-Send",
    title: "Send to Obsidian",
    contexts: ["tab"],
    parentId: "tstObsidian-TopMenu",
  });

  browser.contextMenus.create({
    id: "tstObsidian-Send-Tasks",
    title: "As Tasks",
    contexts: ["tab"],
    parentId: "tstObsidian-Send",
  });

  browser.contextMenus.create({
    id: "tstObsidian-Send-List",
    title: "As List",
    contexts: ["tab"],
    parentId: "tstObsidian-Send",
  });
});

browser.contextMenus.onClicked.addListener(async (click, tab) => {
  const [prefix, action, format] = click.menuItemId.toString().split("-");
  if (prefix !== "tstObsidian" || action === "topMenu" || !format) {
    console.log("not a tstObsidian action", prefix, action, format);
    return;
  }

  const asTasks = format === "Tasks";

  const tree = await browser.runtime.sendMessage(TST_ID, {
    type: "get-tree",
    tab: tab!.id,
  });
  let linkTree = await buildLinkTree(tree, 0, asTasks);

  const content = "\n" + linkTree.join("\n");

  switch (action) {
    case "Copy":
      navigator.clipboard.writeText(content);
      return;

    case "Send":
      sendToObsidian(content);
      break;
  }
});

async function sendToObsidian(content: string) {
  const settings = await browser.storage.local.get([
    "vaultName",
    "autoClose",
    "note",
  ]);
  if (!settings.vaultName) {
    browser.runtime.openOptionsPage();
    return;
  }

  const notePath = settings.note || "FirefoxExport";

  const targetURI = `obsidian://new?file=${encodeURIComponent(
    notePath
  )}&vault=${encodeURIComponent(
    settings.vaultName
  )}&append=true&content=${encodeURIComponent(content)}`;

  browser.tabs
    .create({ url: targetURI, active: true })
    .then(async (tab) => {
      setTimeout(() => {
        if (settings.autoClose) {
          browser.tabs.remove(tab.id!);
          return;
        }

        browser.storage.local.set({ autoClose: true });
      }, 200);
    })
    .catch((reason) => {
      console.log("error opening Obsidian: ", reason);
    });
}

async function buildLinkTree(branch: any, level: number = 0, asTasks: boolean) {
  const tab = await browser.tabs.get(branch.id);
  let link: string;
  link = `${"    ".repeat(level)} ${linkifyTab(tab, asTasks)}`;
  if (branch.children.length == 0) {
    return [link];
  }

  const tabs = await Promise.all(
    branch.children.map(async (child) => {
      const children = await buildLinkTree(child, level + 1, asTasks);

      return children.flatMap((a) => a);
    })
  );

  return [link, ...tabs].flatMap((a) => a);
}

function linkifyTab(tab: Tabs.Tab, asTask: boolean = false) {
  let link = `[${tab?.title}](${tab?.url})`;
  if (tab.url?.startsWith("moz-extension")) {
    link = tab.title!;
  }
  if (asTask) {
    return `- [ ] ${link}`;
  }
  return `- ${link}`;
}
