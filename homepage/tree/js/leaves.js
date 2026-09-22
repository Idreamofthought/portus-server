const search = document.querySelector("#leaf-search");
const sort = document.querySelector("#leaf-sort");
const list = document.querySelector("#leaf-list");
const count = document.querySelector("#leaf-count");
const empty = document.querySelector("#leaf-empty");

if (search && sort && list && count && empty) {
  const cards = [...list.querySelectorAll(".leaf-card")];

  function updateLeaves() {
    const query = search.value.trim().toLocaleLowerCase();
    const direction = sort.value === "za" ? -1 : 1;
    const visible = cards
      .filter((card) => card.dataset.title.includes(query))
      .sort((a, b) => direction * a.dataset.title.localeCompare(b.dataset.title));

    for (const card of cards) card.hidden = true;
    for (const card of visible) {
      card.hidden = false;
      list.append(card);
    }

    count.value = `${visible.length} ${visible.length === 1 ? "leaf" : "leaves"}`;
    empty.hidden = visible.length !== 0;
  }

  search.addEventListener("input", updateLeaves);
  sort.addEventListener("change", updateLeaves);
}
