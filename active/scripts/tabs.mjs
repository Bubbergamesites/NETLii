import { getFavicon, rAlert } from "./utils.mjs";
import { getUV, search } from "./prxy.mjs";

const { span, iframe, button, img } = van.tags;
const {
  tags: { "ion-icon": ionIcon },
} = van;

var tabs = [];
var selectedTab = null;

// UI Elements
const sideBar = document.querySelector("header");
const pageBack = document.getElementById("page-back");
const pageForward = document.getElementById("page-forward");
const pageRefresh = document.getElementById("page-refresh");
const urlForm = document.getElementById("url-form");
const urlInput = document.getElementById("url-input");
const newTabButton = document.getElementById("new-tab");
const tabList = document.getElementById("tab-list");
const tabView = document.getElementById("tab-view");

// Event Listeners
pageBack.onclick = () => selectedTab?.view.contentWindow.history.back();
pageForward.onclick = () => selectedTab?.view.contentWindow.history.forward();
pageRefresh.onclick = () => selectedTab?.view.contentWindow.location.reload();

newTabButton.onclick = () => {
  addTab("duckduckgo.com");
};

urlForm.onsubmit = (e) => {
  e.preventDefault();
  if (selectedTab) {
    navigate(selectedTab, urlInput.value);
  }
};

async function navigate(tab, link) {
  const url = await getUV(link);
  tab.url = search(link);
  tab.proxiedUrl = url;
  tab.view.src = url;
  urlInput.value = tab.url;
}

function focusTab(tab) {
  if (selectedTab) {
    selectedTab.view.style.display = "none";
    tabList.children[tabs.indexOf(selectedTab)].classList.remove("selectedTab");
  }
  
  selectedTab = tab;
  tab.view.style.display = "block";

  // FIX: Priority logic for the URL Bar
  const pendingSearch = localStorage.getItem('autoSearchQuery');
  if (pendingSearch && tabs.length === 1) {
    // If we just arrived from home, show the search term
    urlInput.value = pendingSearch;
  } else {
    // Otherwise show the actual tab URL
    urlInput.value = tab.url;
  }

  tabList.children[tabs.indexOf(tab)].classList.add("selectedTab");
}

async function addTab(link) {
  // FIX: Intercept the "duckduckgo" default if a homepage search exists
  const pendingSearch = localStorage.getItem('autoSearchQuery');
  if (pendingSearch && tabs.length === 0) {
    link = pendingSearch;
  }

  let url = await getUV(link);
  let tab = {
    title: "Loading...",
    url: search(link),
    proxiedUrl: url,
    icon: null,
    view: null,
    item: null
  };

  tab.view = tabFrame(tab);
  tab.item = tabItem(tab);

  tab.view.addEventListener("load", () => {
    // Logic for handling internal links
    try {
      let links = tab.view.contentWindow.document.querySelectorAll("a");
      links.forEach((element) => {
        element.addEventListener("click", (event) => {
          if (event.target.target === "_top") {
            event.preventDefault();
            addTab(event.target.href);
          }
        });
      });
    } catch (e) { console.log("Cross-origin frame restriction"); }
  });

  tabs.push(tab);
  tabList.appendChild(tab.item);
  tabView.appendChild(tab.view);

  focusTab(tab);

  // Clear the search from memory only after the tab is successfully initialized
  if (pendingSearch && tabs.length === 1) {
    localStorage.removeItem('autoSearchQuery');
  }
}

// Visual components (Tab Frame & Tab Item)
function tabFrame(tab) {
  return iframe({
    src: tab.proxiedUrl,
    class: "tab-frame",
    style: "display: none;",
  });
}

function tabItem(tab) {
  return button(
    {
      class: "tab-item hover-focus1",
      onclick: () => focusTab(tab),
    },
    span(tab.title),
    ionIcon({
      name: "close-outline",
      class: "close-icon",
      onclick: (e) => {
        e.stopPropagation();
        closeTab(tab);
      },
    })
  );
}

function closeTab(tab) {
  const index = tabs.indexOf(tab);
  if (index > -1) {
    tab.view.remove();
    tab.item.remove();
    tabs.splice(index, 1);
    if (selectedTab === tab && tabs.length > 0) {
      focusTab(tabs[Math.max(0, index - 1)]);
    } else if (tabs.length === 0) {
      addTab("duckduckgo.com");
    }
  }
}

// Initial Load
addTab("duckduckgo.com");
