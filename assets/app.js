(function () {
  const tools = window.EDULINK_TOOLS || [];
  const categories = window.EDULINK_CATEGORIES || [];

  const state = {
    activeCategory: "all",
    query: "",
  };

  const elements = {
    search: document.querySelector("#tool-search"),
    filters: document.querySelector("#filter-list"),
    grid: document.querySelector("#tool-grid"),
    resultCount: document.querySelector("#result-count"),
    toolCount: document.querySelector("#tool-count"),
    categoryCount: document.querySelector("#category-count"),
    emptyState: document.querySelector("#empty-state"),
    resetFilters: document.querySelector("#reset-filters"),
  };

  function normalize(value) {
    return String(value || "").trim().toLocaleLowerCase("ko-KR");
  }

  function getSearchText(tool) {
    return normalize(
      [
        tool.name,
        tool.description,
        tool.status,
        ...(tool.tags || []),
        ...(tool.categories || []),
      ].join(" ")
    );
  }

  function getVisibleTools() {
    const query = normalize(state.query);

    return tools.filter((tool) => {
      const matchesCategory =
        state.activeCategory === "all" ||
        (tool.categories || []).includes(state.activeCategory);
      const matchesQuery = !query || getSearchText(tool).includes(query);

      return matchesCategory && matchesQuery;
    });
  }

  function createLink(className, href, label) {
    const link = document.createElement("a");
    link.className = className;
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = label;
    return link;
  }

  function renderFilters() {
    const fragment = document.createDocumentFragment();

    categories.forEach((category) => {
      const button = document.createElement("button");
      button.className = "filter-chip";
      button.type = "button";
      button.textContent = category.label;
      button.setAttribute("aria-pressed", String(category.id === state.activeCategory));
      button.addEventListener("click", () => {
        state.activeCategory = category.id;
        render();
      });
      fragment.append(button);
    });

    elements.filters.replaceChildren(fragment);
  }

  function renderCard(tool) {
    const article = document.createElement("article");
    article.className = "tool-card";
    article.dataset.tone = tool.tone || "teal";

    const top = document.createElement("div");
    top.className = "card-top";

    const mark = document.createElement("span");
    mark.className = "tool-mark";
    mark.textContent = tool.marker || tool.name.slice(0, 2);
    mark.setAttribute("aria-hidden", "true");

    const status = document.createElement("span");
    status.className = "tool-status";
    status.textContent = tool.status || "도구";

    top.append(mark, status);

    const title = document.createElement("h3");
    title.textContent = tool.name;

    const description = document.createElement("p");
    description.textContent = tool.description;

    const tags = document.createElement("ul");
    tags.className = "tag-list";
    (tool.tags || []).forEach((tag) => {
      const item = document.createElement("li");
      item.textContent = tag;
      tags.append(item);
    });

    const actions = document.createElement("div");
    actions.className = "card-actions";
    actions.append(createLink("primary-action", tool.primaryUrl, tool.primaryLabel || "열기"));

    if (tool.resourceUrl && tool.resourceLabel) {
      actions.append(createLink("secondary-action", tool.resourceUrl, tool.resourceLabel));
    }

    actions.append(createLink("secondary-action", tool.sourceUrl, "GitHub"));

    article.append(top, title, description, tags, actions);
    return article;
  }

  function renderTools() {
    const visibleTools = getVisibleTools();
    const fragment = document.createDocumentFragment();

    visibleTools.forEach((tool) => {
      fragment.append(renderCard(tool));
    });

    elements.grid.replaceChildren(fragment);
    elements.resultCount.textContent = `${visibleTools.length}개 표시`;
    elements.emptyState.hidden = visibleTools.length > 0;
  }

  function renderSummary() {
    const activeCategoryCount = categories.filter((category) => category.id !== "all").length;
    elements.toolCount.textContent = String(tools.length);
    elements.categoryCount.textContent = String(activeCategoryCount);
  }

  function render() {
    renderFilters();
    renderTools();
  }

  function bindEvents() {
    elements.search.addEventListener("input", (event) => {
      state.query = event.target.value;
      renderTools();
    });

    elements.resetFilters.addEventListener("click", () => {
      state.activeCategory = "all";
      state.query = "";
      elements.search.value = "";
      render();
      elements.search.focus();
    });
  }

  renderSummary();
  render();
  bindEvents();
})();
