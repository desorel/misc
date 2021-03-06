"use strict";

const JSON_URL = "data/invocations.json";

const ID_INVOCATION_LIST = "invocationsList";
const ID_STATS_PREREQUISITES = "prerequisites";
const ID_TEXT = "text";

const JSON_ITEM_NAME = "name";
const JSON_ITEM_SOURCE = "source";
const JSON_ITEM_PATRON = "patron";
const JSON_ITEM_PACT = "pact";
const JSON_ITEM_LEVEL = "level";
const JSON_ITEM_SPELL = "spell";

const CLS_INVOCATION = "invocations";
const CLS_COL1 = "col-xs-3 col-xs-3-9";
const CLS_COL2 = "col-xs-1 col-xs-1-6";
const CLS_COL3 = "col-xs-1 col-xs-1-2";
const CLS_COL4 = "col-xs-2 col-xs-2-1";
const CLS_COL5 = "col-xs-2";
const CLS_COL6 = "col-xs-1 col-xs-1-2";
const CLS_LI_NONE = "list-entry-none";

const LIST_NAME = "name";
const LIST_SOURCE = "source";
const LIST_PATRON = "patron";
const LIST_PACT = "pact";
const LIST_LEVEL = "level";
const LIST_SPELL = "spell";

window.onload = function load () {
	DataUtil.loadJSON(JSON_URL, onJsonLoad);
};

function sortLevelAsc (a, b) {
	if (a === STR_ANY) a = 0;
	if (b === STR_ANY) b = 0;
	return Number(b) - Number(a);
}

function listSortInvocations (a, b, o) {
	if (o.valueName === "level") {
		const comp = sortLevelAsc(a.values()["level"], b.values()["level"]);
		if (comp !== 0) return comp;
	}
	return SortUtil.listSort(a, b, o);
}

let list;
const sourceFilter = getSourceFilter();
let filterBox;
function onJsonLoad (data) {
	const patronFilter = new Filter({
		header: "Patron",
		items: ["The Archfey", "The Fiend", "The Great Old One", "The Hexblade", "The Kraken", "The Raven Queen", "The Seeker", STR_ANY],
		displayFn: Parser.invoPatronToShort
	});
	const pactFilter = new Filter({
		header: "Pact",
		items: ["Blade", "Chain", "Tome", STR_ANY],
		displayFn: Parser.invoPactToFull
	});
	const spellFilter = new Filter({
		header: "Spell or Feature",
		items: ["Eldritch Blast", "Hex/Curse", STR_NONE]
	});
	const levelFilter = new Filter({header: "Warlock Level", items: ["5", "7", "9", "12", "15", "18", STR_ANY]});

	filterBox = initFilterBox(sourceFilter, pactFilter, patronFilter, spellFilter, levelFilter);

	list = ListUtil.search({
		valueNames: [LIST_NAME, LIST_SOURCE, LIST_PACT, LIST_PATRON, LIST_SPELL, LIST_LEVEL],
		listClass: CLS_INVOCATION,
		sortFunction: listSortInvocations
	});
	list.on("updated", () => {
		filterBox.setCount(list.visibleItems.length, list.items.length);
	});

	// filtering function
	$(filterBox).on(
		FilterBox.EVNT_VALCHANGE,
		handleFilterChange
	);

	RollerUtil.addListRollButton();

	const subList = ListUtil.initSublist({
		valueNames: ["name", "ability", "prerequisite", "id"],
		listClass: "subinvocations",
		getSublistRow: getSublistItem
	});
	ListUtil.initGenericPinnable();

	addInvocations(data);
	BrewUtil.addBrewData(addInvocations);
	BrewUtil.makeBrewButton("manage-brew");
	BrewUtil.bind({list, filterBox, sourceFilter});

	History.init();
	handleFilterChange();
	RollerUtil.addListRollButton();
}

let invoList = [];
let ivI = 0;
function addInvocations (data) {
	if (!data.invocation || !data.invocation.length) return;

	invoList = invoList.concat(data.invocation);

	let tempString = "";
	for (; ivI < invoList.length; ivI++) {
		const p = invoList[ivI];

		if (!p.prerequisites) p.prerequisites = {};
		if (!p.prerequisites.pact) p.prerequisites.pact = p.prerequisites.or && p.prerequisites.or.find(it => it.pact) ? STR_SPECIAL : STR_ANY;
		if (!p.prerequisites.patron) p.prerequisites.patron = STR_ANY;
		if (!p.prerequisites.spell) p.prerequisites.spell = STR_NONE;
		if (!p.prerequisites.level) p.prerequisites.level = STR_ANY;

		p._fPrerequisites = JSON.parse(JSON.stringify(p.prerequisites));
		if (p._fPrerequisites.or) {
			p._fPrerequisites.or.forEach(orPres => {
				Object.keys(orPres).forEach(k => {
					if (!p._fPrerequisites[k]) {
						p._fPrerequisites[k] = orPres[k];
					} else if (typeof p._fPrerequisites[k] === "string") {
						if (p._fPrerequisites[k] === STR_ANY || p._fPrerequisites[k] === STR_NONE) {
							p._fPrerequisites[k] = orPres[k];
						} else {
							p._fPrerequisites[k] = [p._fPrerequisites[k], orPres[k]];
						}
					} else {
						// it should always be an array
						p._fPrerequisites[k].push(orPres[k]);
					}
				})
			});
		}

		tempString += `
			<li class="row" ${FLTR_ID}="${ivI}" onclick="ListUtil.toggleSelected(event, this)" oncontextmenu="ListUtil.openContextMenu(event, this)">
				<a id="${ivI}" href="#${UrlUtil.autoEncodeHash(p)}" title="${p[JSON_ITEM_NAME]}">
					<span class="${LIST_NAME} ${CLS_COL1}">${p[JSON_ITEM_NAME]}</span>
					<span class="${LIST_SOURCE} ${CLS_COL2} source${Parser.sourceJsonToAbv(p[JSON_ITEM_SOURCE])} text-align-center" title="${Parser.sourceJsonToFull(p[JSON_ITEM_SOURCE])}">${Parser.sourceJsonToAbv(p[JSON_ITEM_SOURCE])}</span>
					<span class="${LIST_PACT} ${CLS_COL3} ${p.prerequisites[JSON_ITEM_PACT] === STR_ANY ? CLS_LI_NONE : STR_EMPTY}">${p.prerequisites[JSON_ITEM_PACT]}</span>
					<span class="${LIST_PATRON} ${CLS_COL4} ${p.prerequisites[JSON_ITEM_PATRON] === STR_ANY ? CLS_LI_NONE : STR_EMPTY}">${Parser.invoPatronToShort(p.prerequisites[JSON_ITEM_PATRON])}</span>
					<span class="${LIST_SPELL} ${CLS_COL5} ${p.prerequisites[JSON_ITEM_SPELL] === STR_NONE ? CLS_LI_NONE : STR_EMPTY}">${p.prerequisites[JSON_ITEM_SPELL]}</span>
					<span class="${LIST_LEVEL} ${CLS_COL6} ${p.prerequisites[JSON_ITEM_LEVEL] === STR_ANY ? CLS_LI_NONE : STR_EMPTY} text-align-center">${p.prerequisites[JSON_ITEM_LEVEL]}</span>
				</a>
			</li>
		`;

		// populate filters
		sourceFilter.addIfAbsent(p[JSON_ITEM_SOURCE]);
	}
	const lastSearch = ListUtil.getSearchTermAndReset(list);
	$(`#${ID_INVOCATION_LIST}`).append(tempString);

	// sort filters
	sourceFilter.items.sort(SortUtil.ascSort);

	list.reIndex();
	if (lastSearch) list.search(lastSearch);
	list.sort("name");
	filterBox.render();
	handleFilterChange();

	ListUtil.setOptions({
		itemList: invoList,
		getSublistRow: getSublistItem,
		primaryLists: [list]
	});
	ListUtil.bindPinButton();
	EntryRenderer.hover.bindPopoutButton(invoList);
	UrlUtil.bindLinkExportButton(filterBox);
	ListUtil.bindDownloadButton();
	ListUtil.bindUploadButton();
	ListUtil.loadState();
}

function handleFilterChange () {
	const f = filterBox.getValues();
	list.filter(function (item) {
		const p = invoList[$(item.elm).attr(FLTR_ID)];
		return filterBox.toDisplay(
			f,
			p.source,
			p._fPrerequisites.pact,
			p._fPrerequisites.patron,
			p._fPrerequisites.spell,
			p._fPrerequisites.level
		);
	});
	FilterBox.nextIfHidden(invoList);
}

function getSublistItem (inv, pinId) {
	return `
		<li class="row" ${FLTR_ID}="${pinId}" oncontextmenu="ListUtil.openSubContextMenu(event, this)">
			<a href="#${UrlUtil.autoEncodeHash(inv)}" title="${inv.name}">
				<span class="name col-xs-3">${inv.name}</span>
				<span class="patron col-xs-3 ${inv.prerequisites.pact === STR_ANY ? CLS_LI_NONE : ""}">${inv.prerequisites.pact}</span>
				<span class="pact col-xs-2 ${inv.prerequisites.patron === STR_ANY ? CLS_LI_NONE : ""}">${Parser.invoPatronToShort(inv.prerequisites.patron)}</span>
				<span class="spell col-xs-2 ${inv.prerequisites.spell === STR_NONE ? CLS_LI_NONE : ""}">${inv.prerequisites.spell}</span>
				<span class="level col-xs-2 ${inv.prerequisites.level === STR_ANY ? CLS_LI_NONE : ""} text-align-center">${inv.prerequisites.level}</span>
				<span class="id hidden">${pinId}</span>
			</a>
		</li>
	`;
}

function loadhash (jsonIndex) {
	const $content = $(`#pagecontent`);
	const $name = $content.find(`th.name`);
	const STATS_PREREQUISITES = document.getElementById(ID_STATS_PREREQUISITES);
	const STATS_TEXT = document.getElementById(ID_TEXT);

	const inv = invoList[jsonIndex];

	$name.html(inv[JSON_ITEM_NAME]);

	loadInvocation();

	function loadInvocation () {
		STATS_PREREQUISITES.innerHTML = EntryRenderer.invocation.getPrerequisiteText(inv.prerequisites);
		STATS_TEXT.innerHTML = EntryRenderer.getDefaultRenderer().renderEntry({entries: inv.entries}, 1);
		$content.find(`#source`).html(`<td colspan=6><b>Source: </b> <i>${Parser.sourceJsonToFull(inv.source)}</i>${inv.page ? `, page ${inv.page}` : ""}</td>`);
	}
}

function loadsub (sub) {
	filterBox.setFromSubHashes(sub);
	ListUtil.setFromSubHashes(sub);
}